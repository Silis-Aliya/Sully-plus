import { describe, expect, it } from 'vitest';
import { parseAmsgWakeDirective } from './amsgWakeDirective';

describe('parseAmsgWakeDirective', () => {
  it('uses the user timezone and removes the hidden marker', () => {
    const result = parseAmsgWakeDirective(
      '晚点见。\n[[AMSG_WAKE_AT: 2026-08-06T16:00:00]]',
      'Europe/London',
    );
    expect(result.cleanedText).toBe('晚点见。');
    expect(result.wakeAtIso).toBe('2026-08-06T15:00:00.000Z');
  });

  it('only schedules the first marker and hides all duplicates', () => {
    const result = parseAmsgWakeDirective(
      '[[AMSG_WAKE_AT: 2026-08-06T16:00:00]]\n[[AMSG_WAKE_AT: 2026-08-06T17:00:00]]',
      'UTC',
    );
    expect(result.cleanedText).toBe('');
    expect(result.wakeAtIso).toBe('2026-08-06T16:00:00.000Z');
  });

  it('hides malformed values without scheduling them', () => {
    const result = parseAmsgWakeDirective('正文[[AMSG_WAKE_AT: tomorrow]]', 'UTC');
    expect(result.cleanedText).toBe('正文');
    expect(result.wakeAtIso).toBeUndefined();
    expect(result.invalidValue).toBe('tomorrow');
  });
});
