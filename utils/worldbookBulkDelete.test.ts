import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Worldbook bulk deletion', () => {
    const source = readFileSync(new URL('../apps/WorldbookApp.tsx', import.meta.url), 'utf8');

    it('removes every deleted worldbook from the latest character state', () => {
        expect(source).toContain('const deletedIds = new Set(ids);');
        expect(source).toContain('updateCharacter(char.id, current => ({');
        expect(source).toContain('current.mountedWorldbooks?.filter(book => !deletedIds.has(book.id))');
    });
});
