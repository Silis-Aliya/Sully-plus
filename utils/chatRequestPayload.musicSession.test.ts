import { describe, expect, it } from 'vitest';
import { buildChatRequestPayload, deriveListeningFromSnapshot } from './chatRequestPayload';

describe('deriveListeningFromSnapshot', () => {
    it('keeps the current song visible while an active together session is paused', () => {
        const result = deriveListeningFromSnapshot({
            current: { id: 9, name: 'Paused Song', artists: 'Singer' },
            queue: [],
            idx: 0,
            playing: false,
            progress: 12,
            duration: 180,
            lyric: [],
            activeLyricIdx: -1,
            listeningTogetherWith: ['char-1'],
            listeningTogetherStartedAt: Date.now(),
            listeningTogetherChangeCount: 0,
            listeningTogetherPreviousSong: null,
            cfg: {},
            recentTrackChange: null,
        } as any, 'char-1');

        expect(result.isListeningTogether).toBe(true);
        expect(result.userListeningContext).toMatchObject({
            songName: 'Paused Song',
            artists: 'Singer',
        });
    });

    it('keeps the current song visible before the first lyric line becomes active', () => {
        const result = deriveListeningFromSnapshot({
            current: { id: 10, name: 'Intro Song', artists: 'Singer' },
            queue: [],
            idx: 0,
            playing: true,
            progress: 1,
            duration: 180,
            lyric: [{ time: 12, text: 'First line' }],
            activeLyricIdx: -1,
            listeningTogetherWith: ['char-1'],
            listeningTogetherStartedAt: Date.now(),
            listeningTogetherChangeCount: 1,
            listeningTogetherPreviousSong: { id: 9, name: 'Previous Song', artists: 'Singer' },
            cfg: {},
            recentTrackChange: null,
        } as any, 'char-1');

        expect(result.isListeningTogether).toBe(true);
        expect(result.userListeningContext).toMatchObject({
            songName: 'Intro Song',
            artists: 'Singer',
            lyricWindow: [],
            activeIdx: -1,
        });
    });

    it('places the shared current song next to the generation point', async () => {
        const payload = await buildChatRequestPayload({
            char: {
                id: 'char-1',
                name: 'Silis',
                systemPrompt: 'Stay in character.',
            } as any,
            userProfile: { name: 'User' } as any,
            groups: [],
            emojis: [],
            categories: [],
            historyMsgs: [],
            contextLimit: 10,
            musicSnapshot: {
                current: { id: 10, name: 'Current Song', artists: 'Singer' },
                queue: [],
                idx: 0,
                playing: true,
                progress: 1,
                duration: 180,
                lyric: [],
                activeLyricIdx: -1,
                listeningTogetherWith: ['char-1'],
                listeningTogetherStartedAt: Date.now(),
                listeningTogetherChangeCount: 0,
                listeningTogetherPreviousSong: null,
                cfg: {},
                recentTrackChange: null,
            } as any,
        });

        expect(payload.fullMessages.at(-1)).toMatchObject({
            role: 'user',
            content: expect.stringContaining('当前歌曲：《Current Song》— Singer'),
        });
    });
});
