import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('character music action attribution', () => {
  const source = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');
  const parserSource = readFileSync(new URL('./chatParser.ts', import.meta.url), 'utf8');

  it('starts a fresh user-change baseline after the role changes the track', () => {
    expect(source).toContain('pendingCharacterTrackChangeRef.current = { charId: cid }');
    expect(source).toContain('characterChange && wasListening.includes(characterChange.charId)');
    expect(source).toContain('setListeningTogetherChangeCount(0)');
    expect(source).toContain('setListeningTogetherPreviousSong(null)');
  });

  it('clears pending attribution when no actual track change occurs', () => {
    expect(source).toContain('if (!target || target.id === current?.id)');
    expect(source).toContain('pendingCharacterTrackChangeRef.current = null');
  });

  it('passes the acting role id into the player hook', () => {
    expect(parserSource).toContain('musicHooks.nextSong?.(charId)');
  });
});
