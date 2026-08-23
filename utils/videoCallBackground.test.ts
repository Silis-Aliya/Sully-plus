import { describe, expect, it } from 'vitest';
import { resolveVideoCallBackground, resolveVideoCallBackgroundPeriod } from './videoCallBackground';

describe('video call time backgrounds', () => {
  const character = { customTimezoneEnabled: true, customTimezone: 'Asia/Shanghai' };

  it('uses the character timezone instead of the device timezone', () => {
    expect(resolveVideoCallBackgroundPeriod(character, new Date('2026-08-23T22:30:00Z'))).toBe('morning');
  });

  it('falls back to the legacy single background when a slot is empty', () => {
    expect(resolveVideoCallBackground({
      ...character,
      videoCallBackground: 'fallback',
      videoCallBackgroundMode: 'time',
      videoCallBackgroundSchedule: { morning: 'morning-bg' },
    }, new Date('2026-08-23T12:00:00Z'))).toBe('fallback');
  });

  it.each([
    [3, '2026-08-23T04:00:00Z', 'afternoon'],
    [4, '2026-08-23T09:30:00Z', 'dusk'],
    [5, '2026-08-23T03:00:00Z', 'noon'],
    [6, '2026-08-23T12:30:00Z', 'evening'],
    [6, '2026-08-23T15:30:00Z', 'night'],
  ] as const)('supports the %s-segment preset', (videoCallBackgroundSegmentCount, iso, expected) => {
    expect(resolveVideoCallBackgroundPeriod(
      { ...character, videoCallBackgroundSegmentCount },
      new Date(iso),
    )).toBe(expected);
  });
});
