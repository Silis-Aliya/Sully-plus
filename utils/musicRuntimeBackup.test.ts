import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('music runtime backup continuity', () => {
    const source = readFileSync(new URL('../context/MusicContext.tsx', import.meta.url), 'utf8');

    it('stores queue, index, mode and together session as one runtime value', () => {
        expect(source).toContain(
            'JSON.stringify({ queue, idx, playMode, togetherSession })',
        );
        expect(source).toContain('currentSongId: current.id');
        expect(source).toContain('saveState(queue, idx, playMode, togetherSession)');
    });

    it('rejects stale or song-mismatched together sessions', () => {
        expect(source).toContain('Date.now() - updatedAt > MUSIC_TOGETHER_SESSION_MAX_AGE_MS');
        expect(source).toContain('expectedSongId !== current.id');
        expect(source).toContain('validCharacterIds.has(id)');
    });

    it('applies imported runtime state without requiring an app restart', () => {
        expect(source).toContain("window.addEventListener(LOCAL_SETTINGS_IMPORTED_EVENT, restoreImportedRuntime)");
        expect(source).toContain('const next = loadCfg()');
        expect(source).toContain('_clearAllCache()');
        expect(source).toContain('setLocalAlbumSongs(loadLocalAlbum())');
        expect(source).toContain('setQueueState(restored.queue)');
        expect(source).toContain('setPlayMode(restored.playMode)');
    });
});
