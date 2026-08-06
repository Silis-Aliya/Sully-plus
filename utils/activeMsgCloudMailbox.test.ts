import { describe, expect, it, vi } from 'vitest';
import { reconcileCloudMailboxWith } from './activeMsgRuntime';

describe('cloud delivery mailbox reconciliation', () => {
  it('只 ACK Service Worker 明确收下的 messageId', async () => {
    const acknowledge = vi.fn(async () => undefined);
    const delivered: string[] = [];
    const count = await reconcileCloudMailboxWith({
      pull: async () => [
        { messageId: 'm1', message: 'one' },
        { messageId: 'm2', message: 'two' },
      ],
      deliver: async (payload) => {
        delivered.push(String(payload.messageId));
        return payload.messageId === 'm1' ? { ok: true } : { ok: false };
      },
      acknowledge,
    });
    expect(delivered).toEqual(['m1', 'm2']);
    expect(acknowledge).toHaveBeenCalledWith(['m1']);
    expect(count).toBe(1);
  });

  it('SW 报业务落库失败时不 ACK，留给下次前台重试', async () => {
    const acknowledge = vi.fn(async () => undefined);
    await reconcileCloudMailboxWith({
      pull: async () => [{ messageId: 'm1' }],
      deliver: async () => ({ ok: true, businessError: 'inbox write failed' }),
      acknowledge,
    });
    expect(acknowledge).not.toHaveBeenCalled();
  });
});
