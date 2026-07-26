import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('music progress visibility policy', () => {
  const musicSource = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../apps/MusicApp.tsx', import.meta.url), 'utf8');

  it('updates React progress only while a visible progress UI is subscribed', () => {
    expect(musicSource).toContain(
      "document.visibilityState !== 'visible' || __musicProgressSubscriberCount === 0",
    );
    expect(musicSource).toContain('__musicProgressSubscriberCount += 1');
    expect(musicSource).toContain('__musicProgressSubscriberCount = Math.max(0, __musicProgressSubscriberCount - 1)');
  });

  it('keeps non-React snapshots live by reading the audio element at request time', () => {
    expect(musicSource).toContain('const audio = __musicAudioElement;');
    expect(musicSource).toContain('progress: liveProgress,');
    expect(musicSource).toContain(
      'activeLyricIdx: findActiveLyricIndex(__musicPlaybackSnapshot.lyric, liveProgress)',
    );
  });

  it('resynchronizes visible UI and pauses the together-duration timer while hidden', () => {
    expect(musicSource).toContain("document.addEventListener('visibilitychange', onVisibility)");
    expect(musicSource).toContain('syncProgressUi();');
    expect(appSource).toContain("if (document.visibilityState !== 'visible') return;");
    expect(appSource).toContain('window.setTimeout(scheduleVisibleTick');
    expect(appSource).not.toContain('window.setInterval(() => setTogetherNow');
  });
});
