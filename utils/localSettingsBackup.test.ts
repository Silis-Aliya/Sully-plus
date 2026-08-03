import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ACTIVE_MSG_GLOBAL_CONFIG_MIRROR_READY_KEY,
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

    it('backs up and incrementally restores the Active Message 2.0 connection identity', () => {
        const config = JSON.stringify({
            userId: 'amsg-user-1',
            workerUrl: 'https://amsg.example.workers.dev',
            serverToken: 'amsg-secret',
            initializedAt: 123,
            updatedAt: 456,
        });
        localStorage.setItem('amsg2_global_config_v1', config);

        const snapshot = exportLocalStorageSettings();
        expect(snapshot?.amsg2_global_config_v1).toBe(config);

        localStorage.clear();
        applyLocalStorageSettingsPatch({ amsg2_global_config_v1: config }, []);
        expect(localStorage.getItem('amsg2_global_config_v1')).toBe(config);
    });

    it('marks a synced Active Message config deletion so stale device data stays deleted', () => {
        localStorage.setItem('amsg2_global_config_v1', '{"userId":"old"}');

        applyLocalStorageSettingsPatch({}, ['amsg2_global_config_v1']);

        expect(localStorage.getItem('amsg2_global_config_v1')).toBeNull();
        expect(localStorage.getItem(ACTIVE_MSG_GLOBAL_CONFIG_MIRROR_READY_KEY)).toBe('1');
        expect(exportLocalStorageSettings()).not.toHaveProperty(ACTIVE_MSG_GLOBAL_CONFIG_MIRROR_READY_KEY);
    });

    it('backs up Ears Lite API settings through os_api_config', () => {
        localStorage.setItem('os_api_config', JSON.stringify({
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-main',
            model: 'chat-model',
            ears: {
                asrProvider: 'volcengine',
                groqApiKey: 'gsk_voice_secret',
                groqBaseUrl: 'https://api.groq.com/openai/v1',
                groqAsrModel: 'whisper-large-v3-turbo',
                volcengineApiKey: 'volc_voice_secret',
                volcengineEndpoint: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
                volcengineResourceId: 'volc.bigasr.auc_turbo',
                volcengineUid: 'sullyos',
                groqToneEnabled: true,
                groqToneModel: 'llama-3.3-70b-versatile',
                tencentSecretId: 'tencent-id',
                xfyunAppId: 'xfyun-app',
            },
        }));

        const snapshot = exportLocalStorageSettings();
        localStorage.clear();
        importLocalStorageSettings(snapshot);

        const restored = JSON.parse(localStorage.getItem('os_api_config') || '{}');
        expect(restored.ears).toMatchObject({
            asrProvider: 'volcengine',
            groqApiKey: 'gsk_voice_secret',
            groqBaseUrl: 'https://api.groq.com/openai/v1',
            groqAsrModel: 'whisper-large-v3-turbo',
            volcengineApiKey: 'volc_voice_secret',
            volcengineEndpoint: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
            volcengineResourceId: 'volc.bigasr.auc_turbo',
            volcengineUid: 'sullyos',
            groqToneEnabled: true,
            groqToneModel: 'llama-3.3-70b-versatile',
            tencentSecretId: 'tencent-id',
            xfyunAppId: 'xfyun-app',
        });
    });

    it('applies Ears Lite API settings through incremental localStorage patches', () => {
        applyLocalStorageSettingsPatch({
            os_api_config: JSON.stringify({
                baseUrl: 'https://api.example.com/v1',
                apiKey: 'sk-main',
                model: 'chat-model',
                ears: {
                    asrProvider: 'auto',
                    groqApiKey: 'gsk_incremental_voice_secret',
                    groqBaseUrl: 'https://api.groq.com/openai/v1',
                    groqAsrModel: 'whisper-large-v3-turbo',
                    volcengineApiKey: 'volc_incremental_secret',
                    volcengineEndpoint: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
                    volcengineResourceId: 'volc.bigasr.auc_turbo',
                    volcengineUid: 'sullyos',
                    groqToneEnabled: true,
                    groqToneModel: 'llama-3.3-70b-versatile',
                },
            }),
        }, []);

        const restored = JSON.parse(localStorage.getItem('os_api_config') || '{}');
        expect(restored.ears?.asrProvider).toBe('auto');
        expect(restored.ears?.groqApiKey).toBe('gsk_incremental_voice_secret');
        expect(restored.ears?.volcengineApiKey).toBe('volc_incremental_secret');
        expect(restored.ears?.volcengineEndpoint).toBe('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash');
        expect(restored.ears?.volcengineResourceId).toBe('volc.bigasr.auc_turbo');
        expect(restored.ears?.volcengineUid).toBe('sullyos');
        expect(restored.ears?.groqToneEnabled).toBe(true);
        expect(restored.ears?.groqToneModel).toBe('llama-3.3-70b-versatile');
    });

    it('backs up Ears Lite voice baseline for cross-device calibration', () => {
        localStorage.setItem('sully_ears_lite_baseline_v1', JSON.stringify({
            count: 8,
            rmsMean: 0.12,
            pauseRatio: 0.31,
            pitchHz: 260,
            energySway: 0.82,
            brightness: 1.4,
        }));

        const snapshot = exportLocalStorageSettings();
        localStorage.clear();
        importLocalStorageSettings(snapshot);

        expect(JSON.parse(localStorage.getItem('sully_ears_lite_baseline_v1') || '{}')).toMatchObject({
            count: 8,
            pitchHz: 260,
        });
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
