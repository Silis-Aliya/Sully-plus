import type { FullBackupData } from '../../types';
import { DB, openDB } from '../db';
import type { OmbreBridgeConfig } from './ombreBridge';
import { previewSullyMigrationOnHub, importSullyMigrationToHub } from './ombreBridge';

const MEMORY_STORES = {
    memoryNodes: 'memory_nodes',
    memoryVectors: 'memory_vectors',
    memoryLinks: 'memory_links',
    memoryBatches: 'memory_batches',
    topicBoxes: 'topic_boxes',
    anticipations: 'anticipations',
    eventBoxes: 'event_boxes',
    roomPlates: 'room_plates',
    digestReports: 'digest_reports',
} as const;

const SAFE_BACKUP_FIELDS = [
    'characters', 'characterGroups', 'userProfile', 'worldbooks', 'worlds',
    'groups', 'messages', 'scheduledMessages', 'dailySchedules',
    'worldEpisodes', 'storyTheaters', 'storyTheaterPresets', 'storyTheaterMasks',
    'lifeSimState', 'vrMusicRoom', 'vrGuestbook',
] as const satisfies readonly (keyof FullBackupData)[];

const SENSITIVE_KEY = /(?:api[_-]?key|authorization|bearer|password|passwd|secret|token|private[_-]?key|anon[_-]?key|vapid)/i;

export interface HubMigrationPayload extends Partial<FullBackupData> {
    timestamp: number;
    version: number;
    migrationFormat: 'sullyos-hub-p0';
}

export interface HubMigrationReport {
    sourceCounts?: Record<string, number>;
    importedCounts?: Record<string, number>;
    skippedCounts?: Record<string, number>;
    missingReferences?: unknown[];
    unsupportedFields?: unknown[];
    hashDifferences?: unknown[];
    warnings?: unknown[];
    migrationId?: string;
    status?: string;
    [key: string]: unknown;
}

export function sanitizeHubMigrationPayload(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sanitizeHubMigrationPayload);
    if (!value || typeof value !== 'object') return value;
    if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !SENSITIVE_KEY.test(key))
            .map(([key, nested]) => [key, sanitizeHubMigrationPayload(nested)]),
    );
}

async function readStore(storeName: string): Promise<any[]> {
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) return [];
    return await new Promise(resolve => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

function readMemoryRuntimeState(): Pick<HubMigrationPayload, 'memoryPalaceHighWaterMarks' | 'memoryPalaceFlags'> {
    const memoryPalaceHighWaterMarks: Record<string, number> = {};
    const memoryPalaceFlags: Record<string, string> = {};
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key) continue;
        if (key.startsWith('mp_lastMsgId_')) {
            const charId = key.slice('mp_lastMsgId_'.length);
            const value = Number.parseInt(localStorage.getItem(key) || '0', 10);
            if (charId && Number.isFinite(value)) memoryPalaceHighWaterMarks[charId] = value;
        } else if (key.startsWith('mp_personality_tried_') || key.startsWith('mp_first_archive_notice_')) {
            memoryPalaceFlags[key] = localStorage.getItem(key) || '';
        }
    }
    return {
        memoryPalaceHighWaterMarks: Object.keys(memoryPalaceHighWaterMarks).length ? memoryPalaceHighWaterMarks : undefined,
        memoryPalaceFlags: Object.keys(memoryPalaceFlags).length ? memoryPalaceFlags : undefined,
    };
}

/** Build the P0 authority/memory migration payload. It intentionally excludes credentials and UI-only backup data. */
export async function buildHubMigrationPayload(memoryPalaceConfig?: unknown, realtimeConfig?: unknown): Promise<HubMigrationPayload> {
    const backup = await DB.exportFullData();
    const selected: Record<string, unknown> = {};
    for (const field of SAFE_BACKUP_FIELDS) {
        const value = backup[field];
        if (value !== undefined) selected[field] = value;
    }

    const memoryEntries = await Promise.all(
        Object.entries(MEMORY_STORES).map(async ([field, store]) => [field, await readStore(store)] as const),
    );
    const payload = {
        timestamp: Date.now(),
        version: 1,
        migrationFormat: 'sullyos-hub-p0' as const,
        ...selected,
        ...Object.fromEntries(memoryEntries),
        ...readMemoryRuntimeState(),
        memoryPalaceConfig,
        realtimeConfig,
    };
    return sanitizeHubMigrationPayload(payload) as HubMigrationPayload;
}

export async function previewFullSullyMigration(
    config: OmbreBridgeConfig,
    memoryPalaceConfig?: unknown,
    realtimeConfig?: unknown,
): Promise<{ payload: HubMigrationPayload; report: HubMigrationReport; sourceHash?: string }> {
    const payload = await buildHubMigrationPayload(memoryPalaceConfig, realtimeConfig);
    const result = await previewSullyMigrationOnHub(config, payload);
    return { payload, report: result.report || {}, sourceHash: result.sourceHash };
}

export async function commitFullSullyMigration(
    config: OmbreBridgeConfig,
    payload: HubMigrationPayload,
): Promise<HubMigrationReport> {
    const result = await importSullyMigrationToHub(config, payload);
    return result.report || {};
}
