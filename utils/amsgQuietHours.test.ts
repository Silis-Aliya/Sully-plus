import { describe, expect, it } from 'vitest';
import {
  buildAmsgQuietHoursMessage,
  describeQuietHoursRange,
  isAmsgQuietHours,
  isValidQuietTimeValue,
  nextAmsgQuietEndMs,
} from './amsgQuietHours';

describe('AMSG quiet hours', () => {
  const shanghai = (hour: number, minute = 0) => Date.parse(
    `2026-08-06T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`,
  );

  it('blocks 04:00 inclusive through 10:00 exclusive', () => {
    expect(isAmsgQuietHours(shanghai(3, 59), 'Asia/Shanghai')).toBe(false);
    expect(isAmsgQuietHours(shanghai(4), 'Asia/Shanghai')).toBe(true);
    expect(isAmsgQuietHours(shanghai(9, 59), 'Asia/Shanghai')).toBe(true);
    expect(isAmsgQuietHours(shanghai(10), 'Asia/Shanghai')).toBe(false);
  });

  it('uses the user timezone rather than the worker runtime timezone', () => {
    const atUtcEight = Date.parse('2026-08-06T08:00:00.000Z');
    expect(isAmsgQuietHours(atUtcEight, 'UTC')).toBe(true);
    expect(isAmsgQuietHours(atUtcEight, 'Asia/Shanghai')).toBe(false);
  });

  it('describes same-day and overnight UI ranges explicitly', () => {
    expect(describeQuietHoursRange('04:00', '10:00')).toBe('每天 04:00 至当天 10:00');
    expect(describeQuietHoursRange('15:00', '09:00')).toBe('每天 15:00 至次日 09:00');
    expect(describeQuietHoursRange('15:00', '00:00')).toBe('每天 15:00 至次日 00:00');
  });

  it('enforces a custom cross-midnight range', () => {
    expect(isAmsgQuietHours(shanghai(14, 59), 'Asia/Shanghai', '15:00', '09:00')).toBe(false);
    expect(isAmsgQuietHours(shanghai(15), 'Asia/Shanghai', '15:00', '09:00')).toBe(true);
    expect(isAmsgQuietHours(shanghai(8, 59), 'Asia/Shanghai', '15:00', '09:00')).toBe(true);
    expect(isAmsgQuietHours(shanghai(9), 'Asia/Shanghai', '15:00', '09:00')).toBe(false);
    expect(buildAmsgQuietHoursMessage('15:00', '09:00')).toContain('每天 15:00 至次日 09:00');
  });

  it('rejects incomplete, out-of-range and zero-length UI ranges', () => {
    expect(isValidQuietTimeValue('23:59')).toBe(true);
    expect(isValidQuietTimeValue('24:00')).toBe(false);
    expect(describeQuietHoursRange('04:00', '04:00')).toBe('开始与结束时间不能相同');
  });

  it('resolves the next same-day quiet end in the user timezone', () => {
    expect(nextAmsgQuietEndMs(shanghai(5), 'Asia/Shanghai')).toBe(shanghai(10));
    expect(nextAmsgQuietEndMs(shanghai(11), 'Asia/Shanghai')).toBeNull();
  });

  it('resolves the correct date for a cross-midnight quiet range', () => {
    expect(nextAmsgQuietEndMs(
      shanghai(20), 'Asia/Shanghai', '15:00', '09:00',
    )).toBe(Date.parse('2026-08-07T09:00:00+08:00'));
    expect(nextAmsgQuietEndMs(
      shanghai(8), 'Asia/Shanghai', '15:00', '09:00',
    )).toBe(shanghai(9));
  });
});
