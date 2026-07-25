import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('character music page together-listening display', () => {
    const source = readFileSync(new URL('../apps/music/CharVisitPage.tsx', import.meta.url), 'utf8');

    it('shows the live shared song while this character is together listening', () => {
        expect(source).toContain('listeningTogetherWith.includes(charId)');
        expect(source).toContain('songName: current.name');
        expect(source).toContain('artists: current.artists');
        expect(source).toContain('albumPic: current.albumPic');
    });

    it('falls back to the character schedule song after together listening ends', () => {
        expect(source).toContain('return profile?.currentListening');
        expect(source).toContain('initialized && displayCurrentListening');
    });
});
