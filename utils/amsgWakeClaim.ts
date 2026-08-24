/** Switch 自主唤醒的 Worker 端幂等闸。 */
export const AMSG_WAKE_CLAIM_KEY = 'switch_wake_claim_v1';
export const AMSG_WAKE_CLAIM_WINDOW_MS = 3 * 60_000;

export interface AmsgWakeClaim {
  v: 1;
  taskUuid: string;
  occurrenceMs: number;
  claimedAt: number;
}

export const parseAmsgWakeClaim = (raw: unknown): AmsgWakeClaim | null => {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AmsgWakeClaim>;
    if (value.v !== 1
      || typeof value.taskUuid !== 'string'
      || typeof value.occurrenceMs !== 'number'
      || typeof value.claimedAt !== 'number') return null;
    return value as AmsgWakeClaim;
  } catch {
    return null;
  }
};

/**
 * 同一个 Switch 角色在几分钟内由两条不同任务唤醒，视为替换失败留下的双任务。
 * 同 task + occurrence 是调度器自身重试，仍放行；后面的确定性 messageId 会处理送达去重。
 */
export const isDuplicateSwitchWake = (
  previous: AmsgWakeClaim | null,
  next: AmsgWakeClaim,
): boolean => Boolean(previous
  && previous.taskUuid !== next.taskUuid
  && next.claimedAt >= previous.claimedAt
  && next.claimedAt - previous.claimedAt < AMSG_WAKE_CLAIM_WINDOW_MS);
