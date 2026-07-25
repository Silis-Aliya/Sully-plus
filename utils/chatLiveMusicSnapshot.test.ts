import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('chat live music snapshot wiring', () => {
    const chatSource = readFileSync(new URL('../hooks/useChatAI.ts', import.meta.url), 'utf8');
    const musicSource = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');

    it('derives chat music context from one current playback snapshot', () => {
        expect(chatSource).toContain('const liveMusicSnapshot = loadMusicPlaybackSnapshot() || {');
        expect(chatSource).toContain('musicSnapshot: liveMusicSnapshot');
        expect(chatSource).not.toContain('const isMusicTogetherForChar = music.listeningTogetherWith.includes(char.id)');
    });

    it('publishes playback changes before the updated UI can be interacted with', () => {
        expect(musicSource).toContain('useLayoutEffect(() => {');
        expect(musicSource).toContain('__musicPlaybackSnapshot = {');
    });
});
