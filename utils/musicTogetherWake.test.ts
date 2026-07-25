import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicTogetherWake } from './musicTogetherWake';

const STORAGE_KEY = 'music_together_wake_schedules_v1';

describe('MusicTogetherWake restore policy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    MusicTogetherWake.detach();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps active schedules, removes exited roles, and does not replay stale wakes', async () => {
    const now = new Date('2026-07-25T12:00:00Z').getTime();
    vi.setSystemTime(now);
    const triggered: string[] = [];
    MusicTogetherWake.onTrigger(charId => {
      triggered.push(charId);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      active: {
        charId: 'active',
        nextWakeAt: now - 2 * 60 * 1000,
        intervalMs: 5 * 60 * 1000,
      },
      exited: {
        charId: 'exited',
        nextWakeAt: now + 5 * 60 * 1000,
        intervalMs: 5 * 60 * 1000,
      },
      stale: {
        charId: 'stale',
        nextWakeAt: now - 11 * 60 * 1000,
        intervalMs: 5 * 60 * 1000,
      },
    }));

    MusicTogetherWake.reconcile(['active', 'stale']);
    expect(MusicTogetherWake.getSchedules().map(item => item.charId)).toEqual(['active']);
    expect(triggered).toEqual([]);

    await vi.advanceTimersByTimeAsync(500);
    expect(triggered).toEqual(['active']);
    expect(MusicTogetherWake.getSchedules()).toEqual([]);
  });
});
