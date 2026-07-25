/**
 * Small localStorage settings that should travel with backups and QuickSync.
 *
 * This intentionally includes private self-hosted credentials such as XHS
 * cookies, WebDAV/GitHub backup passwords, MCP tokens, and worker tokens. The
 * fork is personal-use first, and cross-device restore should reproduce the
 * working setup instead of silently dropping credentials.
 */

export const BACKUP_LOCAL_STORAGE_EXACT_KEYS: readonly string[] = [
    'os_theme',
    'os_api_config',
    'os_api_presets',
    'os_available_models',
    'os_realtime_config',
    'os_memory_palace_config',
    'os_remote_vector_config',
    'os_cloud_backup_config',
    'os_dream_collection',
    'os_last_active_char_id',
    'os_char_groups_expanded',
    'study_api_config',
    'study_tutor_presets',
    'instant_push_config_v1',
    'push_vapid_v1',
    'proactive_push_enabled_v1',
    'chat_translate_source_lang',
    'chat_translate_lang',
    'chat_archive_prompts',
    'chat_active_archive_prompt_id',
    'character_refine_prompts',
    'character_active_refine_prompt_id',
    'schedule_app_theme',
    'handbook_lifestream_depth',
    'groupchat_context_limit',
    'browser_brave_key',
    'browser_use_real_search',
    'bm25_mode',
    'tama_accent_hue',
    'tama_style_v2',
    'mg_style_v1',
    'tama_board_img',
    'tama_board_fg',
    'spark_char_handles',
    'spark_user_id',
    'spark_user_bg',
    'spark_social_profile',
    'room_custom_assets',
    'world_home_api',
    'world_custom_styles',
    'cp_tavern_style',
    'vr_help_seen',
    'vr_po_base',
    'vr_po_device',
    'signal_my_authorship',
    'signal_my_lines',
    'signal_notice_ack',
    'aetheros.mcp.servers',
    'aetheros.mcp.useNativeTools',
    'aetheros.luckin.mcpToken',
    'aetheros.luckin.mcpEnabled',
    'aetheros.mcd.mcpToken',
    'aetheros.mcd.mcpEnabled',
    'sully_proxy_worker_url_v1',
    'sully_video_parse_key_v1',
    'workbench_bridge_config_v1',
    'workbench_projects_v1',
    'workbench_mode_v1',
    'sully_music_cfg_v1',
    'sully_music_state_v1',
    'sully_music_local_album_v1',
    'music_together_wake_schedules_v1',
] as const;

export const LOCAL_SETTINGS_IMPORTED_EVENT = 'sully-local-settings-imported';

const BACKUP_LOCAL_STORAGE_PREFIXES: readonly string[] = [
    'mp_lastMsgId_',
    'mp_personality_tried_',
    'mp_first_archive_notice_',
    'chat_translate_enabled_',
    'chat_translate_source_lang_',
    'chat_translate_lang_',
    'sullyos_',
] as const;

const MAX_VALUE_BYTES = 512 * 1024;
const MAX_MUSIC_VALUE_BYTES = 5 * 1024 * 1024;
const MUSIC_STATE_KEY = 'sully_music_state_v1';
const MUSIC_TOGETHER_SESSION_KEY = 'sully.music.together.session';
const MUSIC_BACKUP_KEYS = new Set(['sully_music_cfg_v1', MUSIC_STATE_KEY, 'sully_music_local_album_v1']);

const maxValueBytesForKey = (key: string): number =>
    MUSIC_BACKUP_KEYS.has(key) ? MAX_MUSIC_VALUE_BYTES : MAX_VALUE_BYTES;

const byteLength = (value: string): number => {
    try {
        return new TextEncoder().encode(value).byteLength;
    } catch {
        return value.length;
    }
};

export const shouldBackupLocalStorageKey = (key: string): boolean => {
    if (BACKUP_LOCAL_STORAGE_EXACT_KEYS.includes(key as any)) return true;
    return BACKUP_LOCAL_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix));
};

export const exportLocalStorageSettings = (): Record<string, string> | undefined => {
    try {
        const out: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !shouldBackupLocalStorageKey(key)) continue;
            let value = localStorage.getItem(key);
            if (typeof value !== 'string') continue;
            if (
                key === MUSIC_STATE_KEY
                && typeof sessionStorage !== 'undefined'
                && sessionStorage.getItem(MUSIC_TOGETHER_SESSION_KEY)
            ) {
                try {
                    const state = JSON.parse(value);
                    if (state?.togetherSession) {
                        state.togetherSession.updatedAt = Date.now();
                        value = JSON.stringify(state);
                    }
                } catch {
                    /* malformed music state is left untouched for normal import validation */
                }
            }
            if (byteLength(value) > maxValueBytesForKey(key)) continue;
            out[key] = value;
        }
        // Keep an explicit empty object in modern full backups. Its presence
        // distinguishes "the source has no portable settings" from a legacy
        // backup that predates this section.
        return out;
    } catch {
        return undefined;
    }
};

export const importLocalStorageSettings = (data: Record<string, string> | null | undefined): void => {
    if (!data || typeof data !== 'object') return;
    const importedKeys: string[] = [];
    try {
        for (const [key, value] of Object.entries(data)) {
            if (!shouldBackupLocalStorageKey(key)) continue;
            if (typeof value !== 'string') continue;
            if (byteLength(value) > maxValueBytesForKey(key)) continue;
            localStorage.setItem(key, value);
            importedKeys.push(key);
        }
        if (importedKeys.length > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LOCAL_SETTINGS_IMPORTED_EVENT, { detail: { keys: importedKeys } }));
        }
    } catch {
        /* localStorage unavailable or quota full: keep import best-effort */
    }
};

export const replaceLocalStorageSettings = (data: Record<string, string> | null | undefined): void => {
    if (!data || typeof data !== 'object') return;
    const incomingKeys = new Set(
        Object.entries(data)
            .filter(([key, value]) =>
                shouldBackupLocalStorageKey(key)
                && typeof value === 'string'
                && byteLength(value) <= maxValueBytesForKey(key))
            .map(([key]) => key),
    );
    const removedKeys: string[] = [];
    try {
        const existingKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) existingKeys.push(key);
        }
        for (const key of existingKeys) {
            if (!shouldBackupLocalStorageKey(key) || incomingKeys.has(key)) continue;
            localStorage.removeItem(key);
            removedKeys.push(key);
        }
    } catch {
        /* localStorage unavailable: keep import best-effort */
    }
    importLocalStorageSettings(data);
    if (removedKeys.length > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LOCAL_SETTINGS_IMPORTED_EVENT, { detail: { keys: removedKeys } }));
    }
};

export const applyLocalStorageSettingsPatch = (
    upserts: Record<string, string> | null | undefined,
    deletes: string[] | null | undefined,
): void => {
    importLocalStorageSettings(upserts);
    if (!Array.isArray(deletes)) return;
    try {
        const removedKeys: string[] = [];
        for (const key of deletes) {
            if (typeof key === 'string' && shouldBackupLocalStorageKey(key)) {
                localStorage.removeItem(key);
                removedKeys.push(key);
            }
        }
        if (removedKeys.length > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LOCAL_SETTINGS_IMPORTED_EVENT, { detail: { keys: removedKeys } }));
        }
    } catch {
        /* localStorage unavailable: keep sync best-effort */
    }
};
