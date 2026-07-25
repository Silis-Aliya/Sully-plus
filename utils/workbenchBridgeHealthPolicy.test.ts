import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Workbench bridge health policy', () => {
    const source = readFileSync(new URL('../apps/WorkbenchApp.tsx', import.meta.url), 'utf8');

    it('silently checks /health while Code is visible without surfacing errors', () => {
        expect(source).toContain('const checkSilently = async () => {');
        expect(source).toContain("document.visibilityState !== 'visible'");
        expect(source).toContain('window.setInterval(() => { void checkSilently(); }, 30_000)');
        expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
        expect(source).not.toContain("setTestResult('电脑未连接');\n            } finally");
    });

    it('checks the bridge lazily before an assistant request', () => {
        expect(source).toContain('if (!bridgeUsable && bridgeConfigured)');
        expect(source).toContain('await testWorkbenchBridge(config)');
        expect(source).toContain("throw makeSilentBridgeOfflineError()");
    });

    it('treats auth failures as silent bridge disconnects', () => {
        expect(source).toMatch(/Unauthorized.*40\[13\]/);
    });

    it('keeps a successful connection online when unchanged settings are saved', () => {
        expect(source).toContain("const keepOnline = bridgeStatus === 'online'");
        expect(source).toContain('workbenchBridgeConnectionKey(config) === workbenchBridgeConnectionKey(stored)');
        expect(source).toContain("setBridgeStatus(keepOnline ? 'online' : 'offline')");
    });
});
