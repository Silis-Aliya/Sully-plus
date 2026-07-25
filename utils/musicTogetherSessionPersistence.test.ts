import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('music together session persistence', () => {
    const source = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');

    it('uses tab-scoped session storage so refresh restores but a new tab does not', () => {
        expect(source).toContain("const MUSIC_TOGETHER_SESSION_KEY = 'sully.music.together.session'");
        expect(source).toContain('sessionStorage.getItem(MUSIC_TOGETHER_SESSION_KEY)');
        expect(source).toContain('sessionStorage.setItem(MUSIC_TOGETHER_SESSION_KEY');
        expect(source).not.toContain('localStorage.setItem(MUSIC_TOGETHER_SESSION_KEY');
    });

    it('clears stale, empty, explicitly ended, or unplayable sessions', () => {
        expect(source).toContain('MUSIC_TOGETHER_SESSION_MAX_AGE_MS');
        expect(source).toContain('sessionStorage.removeItem(MUSIC_TOGETHER_SESSION_KEY)');
        expect(source).toContain('if (listeningTogetherWith.length > 0 && !current)');
        expect(source).toContain('clearListeningPartners()');
    });
});
