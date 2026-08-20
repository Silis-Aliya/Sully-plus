import { describe, expect, it, vi } from 'vitest';
import {
  createMailboxBackedPushTransport,
  handleDeliveryMailboxRequest,
  persistDeliveryMailbox,
  stampMailboxPayloads,
  type DeliveryMailboxDb,
} from './deliveryMailbox';

interface Row {
  userId: string;
  messageId: string;
  encryptedPayload: string;
  createdAt: number;
  expiresAt: number;
  ackedAt: number | null;
}

const makeDb = () => {
  const rows = new Map<string, Row>();
  const db: DeliveryMailboxDb = {
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...next: unknown[]) { values = next; return statement; },
        async run() {
          if (sql.startsWith('DELETE FROM amsg_delivery_mailbox')) {
            for (const [key, row] of rows) if (row.expiresAt <= Number(values[0])) rows.delete(key);
          } else if (sql.includes('INSERT INTO amsg_delivery_mailbox')) {
            const [userId, messageId, encryptedPayload, createdAt, expiresAt] = values as [string, string, string, number, number];
            const key = `${userId}\0${messageId}`;
            const old = rows.get(key);
            if (!old || old.ackedAt === null) {
              rows.set(key, { userId, messageId, encryptedPayload, createdAt, expiresAt, ackedAt: old?.ackedAt ?? null });
            }
          } else if (sql.includes('UPDATE amsg_delivery_mailbox SET acked_at')) {
            const [ackedAt, userId, messageId] = values as [number, string, string];
            const row = rows.get(`${userId}\0${messageId}`);
            if (row && row.ackedAt === null) row.ackedAt = ackedAt;
          }
          return { results: [] };
        },
        async all<T>() {
          if (sql.includes('WHERE message_id = ?')) {
            const [messageId, now] = values as [string, number];
            return { results: [...rows.values()]
              .filter((row) => row.messageId === messageId && row.expiresAt > now)
              .slice(0, 1)
              .map((row) => ({ message_id: row.messageId } as T)) };
          }
          const [userId, now] = values as [string, number];
          return { results: [...rows.values()]
            .filter((row) => row.userId === userId && row.ackedAt === null && row.expiresAt > now)
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((row) => ({ message_id: row.messageId, encrypted_payload: row.encryptedPayload } as T)) };
        },
      };
      return statement;
    },
  };
  return { db, rows };
};

const masterKey = 'ab'.repeat(32);
const headers = {
  'X-User-Id': 'user-1',
  'X-Client-Token': 'secret',
};

describe('AMSG delivery mailbox', () => {
  it('先加密入 D1，再按原 push payload 补拉，ACK 后不再返回', async () => {
    const { db, rows } = makeDb();
    const env = { DB: db, AMSG_MASTER_KEY: masterKey, AMSG_SERVER_TOKEN: 'secret' };
    const payloads = stampMailboxPayloads([{ message: '不能裸存的正文', metadata: { charId: 'c1' } }], {
      taskId: 7,
      taskUuid: 'task-uuid',
      recurrenceType: 'none',
      occurrenceMs: 1234,
      sessionId: 'session-1',
    }, '2026-08-06T00:00:00.000Z');
    await persistDeliveryMailbox(env, 'user-1', payloads, Date.now());

    expect(rows.size).toBe(1);
    expect([...rows.values()][0].encryptedPayload).not.toContain('不能裸存的正文');

    const pulled = await handleDeliveryMailboxRequest(
      new Request('https://worker.example/delivery-mailbox', { headers }), env,
    );
    expect(pulled?.status).toBe(200);
    const body = await pulled!.json() as any;
    expect(body.data.messages).toEqual(payloads);

    const messageId = String(payloads[0].messageId);
    const acked = await handleDeliveryMailboxRequest(new Request(
      'https://worker.example/delivery-mailbox/ack',
      { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: [messageId] }) },
    ), env);
    expect(acked?.status).toBe(200);

    const after = await handleDeliveryMailboxRequest(
      new Request('https://worker.example/delivery-mailbox', { headers }), env,
    );
    expect((await after!.json() as any).data.messages).toEqual([]);
  });

  it('拒绝错误 Client Token', async () => {
    const { db } = makeDb();
    const response = await handleDeliveryMailboxRequest(new Request(
      'https://worker.example/delivery-mailbox',
      { headers: { 'X-User-Id': 'user-1', 'X-Client-Token': 'wrong' } },
    ), { DB: db, AMSG_MASTER_KEY: masterKey, AMSG_SERVER_TOKEN: 'secret' });
    expect(response?.status).toBe(401);
  });

  it('Push 报错但 D1 已存时不重跑模型；没有信箱记录则保留原错误', async () => {
    const { db } = makeDb();
    const env = { DB: db, AMSG_MASTER_KEY: masterKey };
    const [payload] = stampMailboxPayloads([{ message: 'hello' }], {
      taskId: 8, taskUuid: 't8', recurrenceType: 'none', occurrenceMs: 88, sessionId: 's8',
    });
    await persistDeliveryMailbox(env, 'u', [payload]);
    const transport = createMailboxBackedPushTransport(env, {
      sendNotification: vi.fn(async () => { throw new Error('Apple rejected'); }),
    });
    await expect(transport.sendNotification({}, JSON.stringify(payload))).resolves.toBeUndefined();
    await expect(transport.sendNotification({}, JSON.stringify({ messageId: 'missing' })))
      .rejects.toThrow('Apple rejected');
  });
});
