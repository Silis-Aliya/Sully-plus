import { beforeEach, describe, expect, it } from 'vitest';
import { markMusicMigrationEnded, shouldInjectMusicMigrationEnded } from './musicMigrationNotice';

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

describe('music migration reset notice', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('injects only for roles whose active together session was ended', () => {
        markMusicMigrationEnded(['char-1']);

        expect(shouldInjectMusicMigrationEnded('char-1', [])).toBe(true);
        expect(shouldInjectMusicMigrationEnded('char-2', [])).toBe(false);
    });

    it('remains pending while generation is retried, then clears after a role reply', () => {
        const markedAt = Date.now();
        markMusicMigrationEnded(['char-1']);

        expect(shouldInjectMusicMigrationEnded('char-1', [])).toBe(true);
        expect(shouldInjectMusicMigrationEnded('char-1', [{
            id: 'old',
            charId: 'char-1',
            role: 'assistant',
            type: 'text',
            content: 'old reply',
            timestamp: markedAt - 1000,
        } as any])).toBe(true);
        expect(shouldInjectMusicMigrationEnded('char-1', [{
            id: 'new',
            charId: 'char-1',
            role: 'assistant',
            type: 'text',
            content: 'new reply',
            timestamp: markedAt + 1000,
        } as any])).toBe(false);
        expect(shouldInjectMusicMigrationEnded('char-1', [])).toBe(false);
    });
});
