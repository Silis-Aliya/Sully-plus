import { wallClockToTimestamp } from './timezone';

/** 用户所在时区的主动消息睡眠时段：04:00（含）至 10:00（不含）。 */
export const AMSG_QUIET_START_HOUR = 4;
export const AMSG_QUIET_END_HOUR = 10;
export const DEFAULT_AMSG_QUIET_START = '04:00';
export const DEFAULT_AMSG_QUIET_END = '10:00';

export const isValidQuietTimeValue = (value: string): boolean => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

/** UI 文案：结束不晚于开始时，明确显示为“次日”，避免跨夜区间被误读。 */
export const describeQuietHoursRange = (start: string, end: string): string => {
  if (!isValidQuietTimeValue(start) || !isValidQuietTimeValue(end)) return '请选择完整的开始和结束时间';
  if (start === end) return '开始与结束时间不能相同';
  return end < start
    ? `每天 ${start} 至次日 ${end}`
    : `每天 ${start} 至当天 ${end}`;
};

export const resolveQuietHoursRange = (
  start?: string,
  end?: string,
): { start: string; end: string } => {
  const resolvedStart = start && isValidQuietTimeValue(start) ? start : DEFAULT_AMSG_QUIET_START;
  const resolvedEnd = end && isValidQuietTimeValue(end) ? end : DEFAULT_AMSG_QUIET_END;
  return resolvedStart === resolvedEnd
    ? { start: DEFAULT_AMSG_QUIET_START, end: DEFAULT_AMSG_QUIET_END }
    : { start: resolvedStart, end: resolvedEnd };
};

const timeValueToMinutes = (value: string): number => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

export const isAmsgQuietHours = (
  timestampMs: number,
  userTzId: string,
  quietStart = DEFAULT_AMSG_QUIET_START,
  quietEnd = DEFAULT_AMSG_QUIET_END,
): boolean => {
  if (!Number.isFinite(timestampMs) || !userTzId) return false;
  const range = resolveQuietHoursRange(quietStart, quietEnd);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: userTzId,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestampMs));
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    const current = hour * 60 + minute;
    const start = timeValueToMinutes(range.start);
    const end = timeValueToMinutes(range.end);
    return start < end
      ? current >= start && current < end
      : current >= start || current < end;
  } catch {
    // 时区配置损坏时不能把全部主动消息误杀；其他时区校验路径会单独报错。
    return false;
  }
};

/**
 * 当前确实位于静默区时，返回用户当地下一次静默结束所对应的绝对时间。
 * 这只恢复一次“醒来判断”的机会，不携带或顺延被跳过任务的消息内容。
 */
export const nextAmsgQuietEndMs = (
  timestampMs: number,
  userTzId: string,
  quietStart = DEFAULT_AMSG_QUIET_START,
  quietEnd = DEFAULT_AMSG_QUIET_END,
): number | null => {
  if (!isAmsgQuietHours(timestampMs, userTzId, quietStart, quietEnd)) return null;

  const range = resolveQuietHoursRange(quietStart, quietEnd);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: userTzId,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestampMs));
    const readPart = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value);
    const year = readPart('year');
    const month = readPart('month');
    const day = readPart('day');
    const hour = readPart('hour');
    const minute = readPart('minute');
    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

    const startMinutes = timeValueToMinutes(range.start);
    const endMinutes = timeValueToMinutes(range.end);
    const currentMinutes = hour * 60 + minute;
    const endFallsTomorrow = endMinutes < startMinutes && currentMinutes >= startMinutes;
    const localEndDate = new Date(Date.UTC(year, month - 1, day + (endFallsTomorrow ? 1 : 0)));
    const endDate = [
      localEndDate.getUTCFullYear(),
      String(localEndDate.getUTCMonth() + 1).padStart(2, '0'),
      String(localEndDate.getUTCDate()).padStart(2, '0'),
    ].join('-');
    const quietEndMs = wallClockToTimestamp(`${endDate} ${range.end}:00`, userTzId);
    return Number.isFinite(quietEndMs) && quietEndMs > timestampMs ? quietEndMs : null;
  } catch {
    return null;
  }
};

export const AMSG_QUIET_HOURS_MESSAGE = '睡眠时间为每天 04:00-10:00（按用户所在时区），请改到上午 10 点以后。';

export const buildAmsgQuietHoursMessage = (start?: string, end?: string): string => {
  const range = resolveQuietHoursRange(start, end);
  return `静默时间为${describeQuietHoursRange(range.start, range.end)}（按用户所在时区），请改到静默时间之外。`;
};
