import { describe, expect, it } from 'vitest';
import { buildChatRequestPayload, deriveListeningFromSnapshot } from './chatRequestPayload';
import { buildMusicWakeHint } from './musicTrackChange';
import { markMusicMigrationEnded } from './musicMigrationNotice';

if (typeof sessionStorage === 'undefined') {
    const sessionValues = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: {
            getItem: (key: string) => sessionValues.get(key) ?? null,
            setItem: (key: string, value: string) => sessionValues.set(key, String(value)),
            removeItem: (key: string) => sessionValues.delete(key),
            clear: () => sessionValues.clear(),
        },
    });
}

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

    it('attributes the current song only when this character selected it', async () => {
        const baseInput = {
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
        };
        const snapshot = {
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
            characterSelectedSongByCharId: {
                'char-1': { id: 10, name: 'Current Song', artists: 'Singer' },
            },
            cfg: {},
            recentTrackChange: null,
        } as any;

        const selectedPayload = await buildChatRequestPayload({ ...baseInput, musicSnapshot: snapshot });
        expect(selectedPayload.fullMessages.at(-1)?.content)
            .toContain('《Current Song》是你上次主动切换或点播的。');

        const changedPayload = await buildChatRequestPayload({
            ...baseInput,
            musicSnapshot: {
                ...snapshot,
                current: { id: 11, name: 'Later Song', artists: 'Singer' },
            },
        });
        expect(changedPayload.fullMessages.at(-1)?.content)
            .not.toContain('是你上次主动切换或点播的');
    });

    it('uses the same character-selection attribution in natural wakes', () => {
        const wake = buildMusicWakeHint({
            userName: 'User',
            song: { id: 10, name: 'Current Song', artists: 'Singer' },
            togetherDuration: '03:00',
            progress: '01:00 / 04:00',
            selectedByCharacter: true,
        });
        expect(wake).toContain('《Current Song》是你上次主动切换或点播的。');
        expect(wake).not.toContain('上次唤醒后的变化');
        expect(wake).not.toContain('用户切过');
    });

    it('injects the confirmed migration-ended state without creating a chat message', async () => {
        sessionStorage.clear();
        markMusicMigrationEnded(['char-1']);
        const payload = await buildChatRequestPayload({
            char: { id: 'char-1', name: 'Silis', systemPrompt: 'Stay in character.' } as any,
            userProfile: { name: 'User' } as any,
            groups: [],
            emojis: [],
            categories: [],
            historyMsgs: [],
            contextLimit: 10,
        });

        expect(payload.fullMessages.at(-1)).toEqual({
            role: 'system',
            content: `[系统状态（非用户发言）：
之前的一起听会话已因数据迁移结束，目前不在一起听模式。
]`,
        });
    });
});
