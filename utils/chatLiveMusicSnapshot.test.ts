import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('chat live music snapshot wiring', () => {
    const chatSource = readFileSync(new URL('../hooks/useChatAI.ts', import.meta.url), 'utf8');
    const musicSource = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');
    const messageItemSource = readFileSync(new URL('../components/chat/MessageItem.tsx', import.meta.url), 'utf8');

    it('reads the MusicProvider snapshot at request time instead of rebuilding it from Chat state', () => {
        expect(chatSource).toContain('const liveMusicSnapshot = loadMusicPlaybackSnapshot();');
        expect(chatSource).toContain('musicSnapshot: liveMusicSnapshot');
        expect(chatSource).toContain('musicSnapshot: loadMusicPlaybackSnapshot(),');
        expect(chatSource).not.toContain('const music = useMusic();');
        expect(chatSource).not.toContain('current: music.current');
        expect(chatSource).not.toContain('listeningTogetherWith: music.listeningTogetherWith');
    });

    it('publishes playback changes before the updated UI can be interacted with', () => {
        expect(musicSource).toContain('patchMusicPlaybackSnapshot({');
        expect(musicSource).toContain('current: song,');
        expect(musicSource.indexOf('patchMusicPlaybackSnapshot({')).toBeLessThan(
            musicSource.indexOf('setLoadingSong(true)'),
        );
        expect(musicSource).toContain('useLayoutEffect(() => {');
        expect(musicSource).toContain('__musicPlaybackSnapshot = {');
        expect(musicSource).toContain('__musicPlaybackSnapshot = null;');
    });

    it('publishes together membership before a same-tick proactive request', () => {
        expect(musicSource).toContain('listeningTogetherWith: nextListeners,');
        expect(musicSource).toContain('listeningTogetherInviterByCharId: nextInviters,');
        expect(musicSource.indexOf('listeningTogetherWith: nextListeners,')).toBeLessThan(
            musicSource.indexOf('setListeningTogetherWith(prev => prev.includes(charId)'),
        );
    });

    it('joins immediately after accepting a together request', () => {
        expect(messageItemSource).toContain("hooks?.joinListeningTogether?.(m.charId, 'character');");
        expect(messageItemSource).not.toContain(
            "window.setTimeout(() => {\n                    loadMusicHooks()?.joinListeningTogether?.(m.charId, 'character');",
        );
    });
});
