import { describe, expect, it, vi } from 'vitest';
import {
  handleInstantChat,
  handleInstantChatQueue,
  INSTANT_TICK_CRON,
  type InstantChatQueueMessage,
} from './instantChat';

const USER_ID = '3f2b1c8a-9d4e-4a1b-8c2d-000000000009';
const TASK_UUID = '4f2b1c8a-9d4e-4a1b-8c2d-000000000010';
const envelope = { iv: 'iv', authTag: 'tag', encryptedData: 'ciphertext' };

const request = () => new Request('https://amsg.example/instant-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
  body: JSON.stringify({ statePayload: envelope, taskPayload: envelope }),
});

const upstream = () => ({
  fetch: vi.fn(async (req: Request) => {
    if (new URL(req.url).pathname.endsWith('/schedule-message')) {
      return Response.json({ success: true, data: { uuid: TASK_UUID } });
    }
    return Response.json({ success: true });
  }),
  scheduled: vi.fn().mockResolvedValue(undefined),
});

const db = {
  prepare: vi.fn(() => ({ bind: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ success: true }) })) })),
};

describe('即时对话 Queue 交接', () => {
  it('完整状态落 D1 后只入队小任务身份，不再把生成挂在 HTTP waitUntil 上', async () => {
    const service = upstream();
    const send = vi.fn().mockResolvedValue(undefined);
    const waitUntil = vi.fn();
    const response = await handleInstantChat({
      request: request(),
      env: { DB: db, INSTANT_QUEUE: { send } },
      ctx: { waitUntil },
      upstream: service,
      json: (status, body) => Response.json(body, { status }),
      now: () => 123456,
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ uuid: TASK_UUID, transport: 'queue' });
    expect(send).toHaveBeenCalledWith(
      { kind: 'instant-chat-tick', uuid: TASK_UUID, userId: USER_ID, queuedAt: 123456 },
      undefined,
    );
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('Queue 暂时不可用时仍退回旧立即跳，任务不会因升级瞬间丢失', async () => {
    const service = upstream();
    const waitUntil = vi.fn((promise: Promise<unknown>) => promise);
    const response = await handleInstantChat({
      request: request(),
      env: { DB: db, INSTANT_QUEUE: { send: vi.fn().mockRejectedValue(new Error('queue down')) } },
      ctx: { waitUntil },
      upstream: service,
      json: (status, body) => Response.json(body, { status }),
      now: () => 123456,
    });

    expect((await response.json()).transport).toBe('fallback');
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(service.scheduled).toHaveBeenCalled();
  });

  it('消费者成功才 ack，生成失败则显式 retry', async () => {
    const body: InstantChatQueueMessage = {
      kind: 'instant-chat-tick', uuid: TASK_UUID, userId: USER_ID, queuedAt: 1,
    };
    const ack = vi.fn();
    const retry = vi.fn();
    const service = upstream();
    await handleInstantChatQueue({ batch: { messages: [{ body, ack, retry }] }, env: {}, upstream: service });
    expect(service.scheduled).toHaveBeenCalledWith(expect.objectContaining({ cron: INSTANT_TICK_CRON }), {});
    expect(ack).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();

    const failed = upstream();
    failed.scheduled.mockRejectedValueOnce(new Error('LLM unavailable'));
    ack.mockClear();
    await handleInstantChatQueue({ batch: { messages: [{ body, ack, retry }] }, env: {}, upstream: failed });
    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledWith({ delaySeconds: 60 });
  });
});
