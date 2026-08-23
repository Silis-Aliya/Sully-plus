import { describe, expect, it } from 'vitest';
import { resolveVideoCallBackground, resolveVideoCallBackgroundPeriod, resolveVideoCallForeground, resolveVideoCallForegroundPlacement } from './videoCallBackground';

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

  it('switches the foreground independently and falls back to its fixed layer', () => {
    expect(resolveVideoCallForeground({
      ...character,
      videoCallForeground: 'desk-default',
      videoCallForegroundMode: 'time',
      videoCallForegroundSchedule: { morning: 'desk-morning' },
    }, new Date('2026-08-23T22:30:00Z'))).toBe('desk-morning');
    expect(resolveVideoCallForeground({
      ...character,
      videoCallForeground: 'desk-default',
      videoCallForegroundMode: 'time',
      videoCallForegroundSchedule: {},
    }, new Date('2026-08-23T22:30:00Z'))).toBe('desk-default');
  });

  it('uses an independent foreground placement for each time period', () => {
    const fallback = { x: 0, y: 0, scale: 1, locked: true };
    const morning = { x: 12, y: -8, scale: 1.4, locked: true };
    expect(resolveVideoCallForegroundPlacement({
      ...character,
      videoCallForegroundMode: 'time',
      videoCallForegroundPlacement: fallback,
      videoCallForegroundPlacementSchedule: { morning },
    }, new Date('2026-08-23T22:30:00Z'))).toEqual(morning);
    expect(resolveVideoCallForegroundPlacement({
      ...character,
      videoCallForegroundMode: 'time',
      videoCallForegroundPlacement: fallback,
      videoCallForegroundPlacementSchedule: {},
    }, new Date('2026-08-23T22:30:00Z'))).toEqual(fallback);
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
