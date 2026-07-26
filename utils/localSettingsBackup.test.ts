import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    exportLocalStorageSettings,
    applyLocalStorageSettingsPatch,
    importLocalStorageSettings,
    replaceLocalStorageSettings,
    shouldBackupLocalStorageKey,
} from './localSettingsBackup';

describe('localSettingsBackup', () => {
    beforeEach(() => {
        localStorage.clear();
        const values = new Map<string, string>();
        vi.stubGlobal('sessionStorage', {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
            removeItem: (key: string) => values.delete(key),
            clear: () => values.clear(),
        });
        sessionStorage.clear();
    });

    it('applies allowed setting deletions for incremental sync', () => {
        localStorage.setItem('workbench_bridge_config_v1', '{"bridgeUrl":"http://pc:3001"}');
        localStorage.setItem('temporary_cache_blob', 'keep');

        applyLocalStorageSettingsPatch({}, ['workbench_bridge_config_v1', 'temporary_cache_blob']);

        expect(localStorage.getItem('workbench_bridge_config_v1')).toBeNull();
        expect(localStorage.getItem('temporary_cache_blob')).toBe('keep');
    });

    it('replaces portable settings during full import without clearing device-only keys', () => {
        localStorage.setItem('sully_music_local_album_v1', '[{"id":1}]');
        localStorage.setItem('workbench_mode_v1', 'sully');
        localStorage.setItem('temporary_cache_blob', 'keep');

        replaceLocalStorageSettings({
            workbench_mode_v1: 'assistant',
        });

        expect(localStorage.getItem('sully_music_local_album_v1')).toBeNull();
        expect(localStorage.getItem('workbench_mode_v1')).toBe('assistant');
        expect(localStorage.getItem('temporary_cache_blob')).toBe('keep');
    });

    it('keeps legacy backups without a local-settings section non-destructive', () => {
        localStorage.setItem('sully_music_local_album_v1', '[{"id":1}]');

        replaceLocalStorageSettings(undefined);

        expect(localStorage.getItem('sully_music_local_album_v1')).toBe('[{"id":1}]');
    });

    it('exports and imports XHS cookies and backup credentials', () => {
        localStorage.setItem('os_realtime_config', JSON.stringify({
            xhsEnabled: true,
            xhsMcpConfig: {
                enabled: true,
                liteMode: 'simple',
                cookie: 'xhs-cookie=secret',
            },
            xhsPhoneConfig: {
                enabled: true,
                accessToken: 'pixel-token',
            },
        }));
        localStorage.setItem('os_cloud_backup_config', JSON.stringify({
            provider: 'webdav',
            username: 'me',
            password: 'dav-pass',
            githubToken: 'gh-token',
        }));
        localStorage.setItem('aetheros.mcp.servers', JSON.stringify([{ token: 'mcp-token' }]));
        localStorage.setItem('workbench_bridge_config_v1', JSON.stringify({
            bridgeUrl: 'http://pc:8767',
            token: 'workbench-token',
            defaultAgent: 'codex',
            selectedModel: 'gpt-5.2-codex',
            modelProfile: 'deep',
            customInstructions: '先确认再修改',
            codexAvatar: 'blobref:img_code_avatar_1',
            participantEnabled: true,
            participantCharacterId: 'char-1',
            fallbackApiBaseUrl: 'https://api.example.com/v1',
            fallbackApiKey: 'fallback-secret',
            fallbackApiModel: 'chat-model',
            fallbackApiName: '备用助手',
        }));
        localStorage.setItem('workbench_mode_v1', 'sully');

        const snapshot = exportLocalStorageSettings();
        localStorage.clear();
        importLocalStorageSettings(snapshot);

        expect(JSON.parse(localStorage.getItem('os_realtime_config') || '{}').xhsMcpConfig.cookie).toBe('xhs-cookie=secret');
        expect(JSON.parse(localStorage.getItem('os_realtime_config') || '{}').xhsPhoneConfig.accessToken).toBe('pixel-token');
        expect(JSON.parse(localStorage.getItem('os_cloud_backup_config') || '{}').password).toBe('dav-pass');
        expect(JSON.parse(localStorage.getItem('os_cloud_backup_config') || '{}').githubToken).toBe('gh-token');
        expect(JSON.parse(localStorage.getItem('aetheros.mcp.servers') || '[]')[0].token).toBe('mcp-token');
        expect(JSON.parse(localStorage.getItem('workbench_bridge_config_v1') || '{}').token).toBe('workbench-token');
        expect(JSON.parse(localStorage.getItem('workbench_bridge_config_v1') || '{}')).toMatchObject({
            selectedModel: 'gpt-5.2-codex',
            modelProfile: 'deep',
            customInstructions: '先确认再修改',
            codexAvatar: 'blobref:img_code_avatar_1',
            participantEnabled: true,
            participantCharacterId: 'char-1',
            fallbackApiBaseUrl: 'https://api.example.com/v1',
            fallbackApiKey: 'fallback-secret',
            fallbackApiModel: 'chat-model',
            fallbackApiName: '备用助手',
        });
        expect(localStorage.getItem('workbench_mode_v1')).toBe('sully');
    });

    it('includes expected setting prefixes but ignores unrelated large cache keys', () => {
        expect(shouldBackupLocalStorageKey('chat_translate_enabled_char-1')).toBe(true);
        expect(shouldBackupLocalStorageKey('mp_lastMsgId_char-1')).toBe(true);
        expect(shouldBackupLocalStorageKey('temporary_cache_blob')).toBe(false);

        localStorage.setItem('chat_translate_enabled_char-1', 'true');
        localStorage.setItem('temporary_cache_blob', 'nope');
        localStorage.setItem('os_theme', 'x'.repeat(600 * 1024));

        const snapshot = exportLocalStorageSettings();
        expect(snapshot).toEqual({ 'chat_translate_enabled_char-1': 'true' });
    });

    it('backs up durable music state without the live together session', () => {
        expect(shouldBackupLocalStorageKey('sully_music_cfg_v1')).toBe(true);
        expect(shouldBackupLocalStorageKey('sully_music_state_v1')).toBe(true);
        expect(shouldBackupLocalStorageKey('sully_music_local_album_v1')).toBe(true);
        expect(shouldBackupLocalStorageKey('music_together_wake_schedules_v1')).toBe(false);

        localStorage.setItem('sully_music_state_v1', JSON.stringify({
            queue: [{ id: 7, name: 'Track' }],
            idx: 0,
            playMode: 'shuffle',
            togetherSession: {
                charIds: ['char-1'],
                inviterByCharId: { 'char-1': 'character' },
                startedAt: Date.now(),
                updatedAt: Date.now(),
                currentSongId: 7,
            },
        }));

        const snapshot = exportLocalStorageSettings();
        expect(JSON.parse(snapshot?.sully_music_state_v1 || '{}')).toMatchObject({
            idx: 0,
            playMode: 'shuffle',
            togetherSession: null,
        });
    });

    it('does not export together-listening wake schedules', () => {
        const schedule = {
            'char-1': {
                charId: 'char-1',
                nextWakeAt: Date.now() + 5 * 60 * 1000,
                intervalMs: 5 * 60 * 1000,
            },
        };
        localStorage.setItem('music_together_wake_schedules_v1', JSON.stringify(schedule));

        const snapshot = exportLocalStorageSettings();

        expect(snapshot).not.toHaveProperty('music_together_wake_schedules_v1');
    });

    it('strips together sessions from new and legacy imports', () => {
        localStorage.setItem('sully_music_state_v1', JSON.stringify({
            queue: [{ id: 7 }],
            idx: 0,
            playMode: 'loop',
            togetherSession: {
                charIds: ['char-1'],
                inviterByCharId: { 'char-1': 'user' },
                startedAt: 100,
                updatedAt: 100,
                currentSongId: 7,
            },
        }));
        const snapshot = exportLocalStorageSettings();
        const exported = JSON.parse(snapshot?.sully_music_state_v1 || '{}');
        expect(exported.togetherSession).toBeNull();

        importLocalStorageSettings({
            sully_music_state_v1: JSON.stringify({
                queue: [{ id: 8 }],
                idx: 0,
                playMode: 'single',
                togetherSession: { charIds: ['legacy-char'], currentSongId: 8 },
            }),
        });
        expect(JSON.parse(localStorage.getItem('sully_music_state_v1') || '{}')).toMatchObject({
            idx: 0,
            playMode: 'single',
            togetherSession: null,
        });
    });
});
