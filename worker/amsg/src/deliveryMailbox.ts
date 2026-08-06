const MAILBOX_RETENTION_MS = 7 * 24 * 60 * 60_000;
const MAILBOX_MAX_BATCH = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Client-Token',
  'Access-Control-Max-Age': '86400',
};

interface D1Result<T = unknown> {
  results?: T[];
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface DeliveryMailboxDb {
  prepare(sql: string): D1Statement;
}

export interface DeliveryMailboxEnv {
  DB: DeliveryMailboxDb;
  AMSG_MASTER_KEY: string;
  AMSG_SERVER_TOKEN?: string;
}

interface MailboxRow {
  message_id: string;
  encrypted_payload: string;
}

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
});

const bytesToB64u = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const b64uToBytes = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const keyBytes = (hex: string): Uint8Array => {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('AMSG_MASTER_KEY 必须是 64 位 hex');
  return Uint8Array.from(hex.match(/.{2}/g) || [], (pair) => Number.parseInt(pair, 16));
};

const importMailboxKey = (masterKey: string) => crypto.subtle.importKey(
  'raw', keyBytes(masterKey), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
);

const mailboxAad = (userId: string, messageId: string) =>
  new TextEncoder().encode(`${userId}\0${messageId}`);

export const encryptMailboxPayload = async (
  masterKey: string,
  userId: string,
  messageId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({
    name: 'AES-GCM', iv, additionalData: mailboxAad(userId, messageId),
  }, await importMailboxKey(masterKey), new TextEncoder().encode(JSON.stringify(payload)));
  return JSON.stringify({ v: 1, iv: bytesToB64u(iv), data: bytesToB64u(new Uint8Array(encrypted)) });
};

export const decryptMailboxPayload = async (
  masterKey: string,
  userId: string,
  messageId: string,
  encryptedPayload: string,
): Promise<Record<string, unknown>> => {
  const envelope = JSON.parse(encryptedPayload) as { v?: unknown; iv?: unknown; data?: unknown };
  if (envelope.v !== 1 || typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') {
    throw new Error('mailbox envelope invalid');
  }
  const plaintext = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: b64uToBytes(envelope.iv),
    additionalData: mailboxAad(userId, messageId),
  }, await importMailboxKey(masterKey), b64uToBytes(envelope.data));
  const parsed = JSON.parse(new TextDecoder().decode(plaintext));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('mailbox payload invalid');
  return parsed as Record<string, unknown>;
};

const ensureMailboxSchema = async (db: DeliveryMailboxDb): Promise<void> => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS amsg_delivery_mailbox (
    user_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    acked_at INTEGER,
    PRIMARY KEY (user_id, message_id)
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_amsg_delivery_mailbox_pending
    ON amsg_delivery_mailbox(user_id, acked_at, created_at)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_amsg_delivery_mailbox_expiry
    ON amsg_delivery_mailbox(expires_at)`).run();
};

const cleanupExpiredMailbox = async (db: DeliveryMailboxDb, nowMs: number): Promise<void> => {
  await db.prepare('DELETE FROM amsg_delivery_mailbox WHERE expires_at <= ?').bind(nowMs).run();
};

export interface MailboxPayloadIdentity {
  taskId: string | number | null;
  taskUuid: string | null;
  recurrenceType: string | null;
  occurrenceMs: number;
  sessionId: string;
}

/** 给推送与云端补拉共用同一组稳定信封字段。 */
export const stampMailboxPayloads = (
  payloads: Array<Record<string, unknown>>,
  identity: MailboxPayloadIdentity,
  timestamp = new Date().toISOString(),
): Array<Record<string, unknown>> => {
  const taskKey = identity.taskUuid || String(identity.taskId ?? 'unknown');
  const total = payloads.length;
  return payloads.map((payload, index) => ({
    ...payload,
    messageId: typeof payload.messageId === 'string' && payload.messageId
      ? payload.messageId
      : `amsg_mail_${taskKey}_${identity.occurrenceMs}_${index}`,
    sessionId: typeof payload.sessionId === 'string' && payload.sessionId
      ? payload.sessionId
      : identity.sessionId,
    timestamp: typeof payload.timestamp === 'string' && payload.timestamp ? payload.timestamp : timestamp,
    messageIndex: index + 1,
    totalMessages: total,
    taskId: identity.taskId,
    taskUuid: identity.taskUuid,
    recurrenceType: identity.recurrenceType,
    occurrenceMs: identity.occurrenceMs,
    deliveryMailbox: true,
  }));
};

/** Push 尝试前先持久化；写失败必须向外抛，让任务重试而不是冒险丢消息。 */
export const persistDeliveryMailbox = async (
  env: DeliveryMailboxEnv,
  userId: string,
  payloads: Array<Record<string, unknown>>,
  nowMs = Date.now(),
): Promise<void> => {
  await ensureMailboxSchema(env.DB);
  await cleanupExpiredMailbox(env.DB, nowMs);
  for (const payload of payloads) {
    const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
    if (!messageId) throw new Error('mailbox payload 缺 messageId');
    const encrypted = await encryptMailboxPayload(env.AMSG_MASTER_KEY, userId, messageId, payload);
    await env.DB.prepare(`INSERT INTO amsg_delivery_mailbox
      (user_id, message_id, encrypted_payload, created_at, expires_at, acked_at)
      VALUES (?, ?, ?, ?, ?, NULL)
      ON CONFLICT(user_id, message_id) DO UPDATE SET
        encrypted_payload = excluded.encrypted_payload,
        expires_at = excluded.expires_at
      WHERE amsg_delivery_mailbox.acked_at IS NULL`)
      .bind(userId, messageId, encrypted, nowMs, nowMs + MAILBOX_RETENTION_MS)
      .run();
  }
};

export const hasDeliveryMailboxMessage = async (
  db: DeliveryMailboxDb,
  messageId: string,
): Promise<boolean> => {
  await ensureMailboxSchema(db);
  const result = await db.prepare(`SELECT message_id FROM amsg_delivery_mailbox
    WHERE message_id = ? AND expires_at > ? LIMIT 1`)
    .bind(messageId, Date.now())
    .all<{ message_id: string }>();
  return (result.results?.length ?? 0) > 0;
};

export interface MailboxBackedPushTransport {
  sendNotification(subscription: unknown, payload: string): Promise<unknown>;
}

/** D1 已经可靠收下时，Push 只剩提醒职责；它失败不再触发整轮 LLM 重跑。 */
export const createMailboxBackedPushTransport = (
  env: DeliveryMailboxEnv,
  transport: MailboxBackedPushTransport,
): MailboxBackedPushTransport => ({
  async sendNotification(subscription: unknown, payload: string): Promise<unknown> {
    try {
      return await transport.sendNotification(subscription, payload);
    } catch (error) {
      let messageId = '';
      try {
        const parsed = JSON.parse(payload) as { messageId?: unknown; deliveryMailbox?: unknown };
        if (parsed.deliveryMailbox === true && typeof parsed.messageId === 'string') messageId = parsed.messageId;
      } catch {
        // 不是本信箱生成的 payload，保持原错误语义。
      }
      if (!messageId || !await hasDeliveryMailboxMessage(env.DB, messageId)) throw error;
      console.warn('[amsg:mailbox] Push 失败，但消息已安全进入 D1，等待 App 补拉', { messageId });
      return undefined;
    }
  },
});

const constantTimeTokenMatch = async (actual: string, expected: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
};

const authorizeMailbox = async (request: Request, env: DeliveryMailboxEnv): Promise<
  { ok: true; userId: string } | { ok: false; response: Response }
> => {
  const userId = request.headers.get('X-User-Id')?.trim() || '';
  if (!userId || userId.length > 200) {
    return { ok: false, response: json(400, { success: false, error: { code: 'USER_ID_REQUIRED' } }) };
  }
  if (env.AMSG_SERVER_TOKEN) {
    const actual = request.headers.get('X-Client-Token') || '';
    if (!await constantTimeTokenMatch(actual, env.AMSG_SERVER_TOKEN)) {
      return { ok: false, response: json(401, { success: false, error: { code: 'UNAUTHORIZED' } }) };
    }
  }
  return { ok: true, userId };
};

export const handleDeliveryMailboxRequest = async (
  request: Request,
  env: DeliveryMailboxEnv,
): Promise<Response | null> => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/delivery-mailbox' && pathname !== '/delivery-mailbox/ack') return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  const auth = await authorizeMailbox(request, env);
  if (!auth.ok) return auth.response;
  await ensureMailboxSchema(env.DB);
  await cleanupExpiredMailbox(env.DB, Date.now());

  if (pathname === '/delivery-mailbox' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT message_id, encrypted_payload
      FROM amsg_delivery_mailbox
      WHERE user_id = ? AND acked_at IS NULL AND expires_at > ?
      ORDER BY created_at ASC LIMIT ?`)
      .bind(auth.userId, Date.now(), MAILBOX_MAX_BATCH)
      .all<MailboxRow>();
    const messages: Record<string, unknown>[] = [];
    for (const row of rows.results || []) {
      try {
        messages.push(await decryptMailboxPayload(
          env.AMSG_MASTER_KEY, auth.userId, row.message_id, row.encrypted_payload,
        ));
      } catch (error) {
        console.warn('[amsg:mailbox] 无法解密消息，保留记录等待排查', {
          messageId: row.message_id,
          error: error instanceof Error ? error.name : 'DecryptFailed',
        });
      }
    }
    return json(200, { success: true, data: { messages } });
  }

  if (pathname === '/delivery-mailbox/ack' && request.method === 'POST') {
    let body: { messageIds?: unknown };
    try {
      body = await request.json() as { messageIds?: unknown };
    } catch {
      return json(400, { success: false, error: { code: 'INVALID_JSON' } });
    }
    const messageIds = Array.isArray(body.messageIds)
      ? [...new Set(body.messageIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
        .slice(0, MAILBOX_MAX_BATCH)
      : [];
    const ackedAt = Date.now();
    for (const messageId of messageIds) {
      await env.DB.prepare(`UPDATE amsg_delivery_mailbox SET acked_at = ?
        WHERE user_id = ? AND message_id = ? AND acked_at IS NULL`)
        .bind(ackedAt, auth.userId, messageId)
        .run();
    }
    return json(200, { success: true, data: { acknowledged: messageIds.length } });
  }

  return json(405, { success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
};
