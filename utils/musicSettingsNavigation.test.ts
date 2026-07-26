import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Music settings navigation', () => {
    const source = readFileSync(new URL('../apps/MusicApp.tsx', import.meta.url), 'utf8');

    it('treats search and settings as sibling pages under the profile home', () => {
        expect(source).toContain("onOpenSearch={() => setView('search')}");
        expect(source).toContain("onClose={() => setView('profile')}");
        expect(source).toContain('onOpenSettings={openInternalSettings}');
        expect(source).toContain('onClick={openInternalSettings}');
        expect(source).not.toContain('settingsReturnViewRef');
    });

    it('returns settings to the profile home on both back and save', () => {
        expect(source).toContain(
            '<MizuHeader title="设置" onBack={() => setView(\'profile\')} />',
        );
        expect(source.match(/setView\('profile'\)/g)?.length).toBeGreaterThanOrEqual(2);
        expect(source).not.toContain("openInternalSettings('search')");
    });

    it('uses a pending Now Playing request for the first rendered view', () => {
        expect(source).toContain('const initialPlayerRequestRef = useRef(hasPendingPlayerRequest());');
        expect(source).toContain("initialPlayerRequestRef.current && current ? 'player' : 'profile'");
        expect(source).toContain('initialPlayerRequestRef.current && current ? readPendingPlayerReturnApp() : null');
    });
});
