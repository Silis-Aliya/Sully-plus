import { describe, expect, it } from 'vitest';
import {
  AMSG_WAKE_CLAIM_WINDOW_MS,
  isDuplicateSwitchWake,
  parseAmsgWakeClaim,
  type AmsgWakeClaim,
} from './amsgWakeClaim';

const claim = (taskUuid: string, claimedAt: number, occurrenceMs = claimedAt): AmsgWakeClaim => ({
  v: 1, taskUuid, claimedAt, occurrenceMs,
});

describe('Switch wake claim', () => {
  it('拦住短时间内来自另一条任务的重复唤醒', () => {
    expect(isDuplicateSwitchWake(claim('old', 1_000), claim('new', 2_000))).toBe(true);
  });

  it('放行同任务同轮重试，交给确定性 messageId 去重', () => {
    expect(isDuplicateSwitchWake(claim('same', 1_000), claim('same', 2_000))).toBe(false);
  });

  it('不误拦时间窗外的下一次正常唤醒', () => {
    expect(isDuplicateSwitchWake(
      claim('first', 1_000),
      claim('second', 1_000 + AMSG_WAKE_CLAIM_WINDOW_MS),
    )).toBe(false);
  });

  it('损坏状态按无历史处理', () => {
    expect(parseAmsgWakeClaim('{bad')).toBeNull();
    expect(parseAmsgWakeClaim(JSON.stringify({ v: 1, taskUuid: 'x' }))).toBeNull();
  });
});
