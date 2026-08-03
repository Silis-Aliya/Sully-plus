import { describe, expect, it } from 'vitest';
import {
    resolveWorkbenchBridgeConfigForClient,
    DEFAULT_WORKBENCH_CONFIG,
    getWorkbenchJobReleaseReason,
} from './workbenchBridge';

describe('workbench bridge config resolution', () => {
    it('uses the remote bridge URL on mobile instead of localhost', () => {
        const resolved = resolveWorkbenchBridgeConfigForClient({
            ...DEFAULT_WORKBENCH_CONFIG,
            bridgeUrl: 'http://localhost:3001',
            cliBridgeUrl: 'http://localhost:3001',
            remoteBridgeUrl: 'http://pc.local:3001',
            runtimeMode: 'cli',
        }, 'mobile');

        expect(resolved.bridgeUrl).toBe('http://pc.local:3001');
    });

    it('uses the configured private-domain bridge on desktop too', () => {
        const resolved = resolveWorkbenchBridgeConfigForClient({
            ...DEFAULT_WORKBENCH_CONFIG,
            bridgeUrl: 'http://pc.local:3001',
            cliBridgeUrl: 'http://localhost:3001',
            remoteBridgeUrl: 'http://pc.local:3001',
            runtimeMode: 'computer',
        }, 'desktop');

        expect(resolved.bridgeUrl).toBe('http://pc.local:3001');
        expect(resolved.remoteBridgeUrl).toBe('http://pc.local:3001');
    });
});

describe('workbench job lease', () => {
    it('releases the task slot after repeated bridge failures', () => {
        expect(getWorkbenchJobReleaseReason({
            consecutivePollFailures: 3,
        })).toBe('connection_lost');
    });

    it('releases a running job after five minutes without progress', () => {
        expect(getWorkbenchJobReleaseReason({
            status: 'running',
            lastActivityAt: 1_000,
            consecutivePollFailures: 0,
            now: 301_000,
        })).toBe('stalled');
    });

    it('keeps an approval request available while waiting for the user', () => {
        expect(getWorkbenchJobReleaseReason({
            status: 'waiting_approval',
            lastActivityAt: 1_000,
            consecutivePollFailures: 0,
            now: 601_000,
        })).toBeNull();
    });
});
