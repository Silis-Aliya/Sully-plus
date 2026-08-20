import type { Anticipation, DigestReport, EventBox, MemoryNode, MemoryRoom, RoomPlate } from './types';
import { safeResponseJson } from '../safeApi';

export const OMBRE_BRIDGE_URL_KEY = 'mp_ombre_bridge_url';
export const OMBRE_BRIDGE_API_KEY = 'mp_ombre_bridge_key';
export const OMBRE_BRIDGE_AUTO_SYNC_KEY = 'mp_ombre_bridge_auto_sync';
export const OMBRE_BRIDGE_CHAR_NAMES_KEY = 'mp_ombre_bridge_char_names';
const OMBRE_BRIDGE_MIRRORED_SIGS_KEY = 'mp_ombre_bridge_mirrored_sigs';

export interface OmbreBridgeConfig {
    baseUrl: string;
    apiKey?: string;
}

export interface OmbreBridgeContext {
    key: string;
    kind: 'character' | 'group' | 'system' | 'unbound';
    charId?: string;
    charName?: string;
    groupId?: string;
    groupName?: string;
    label: string;
    total: number;
    byRoom: Partial<Record<MemoryRoom | 'missing', number>>;
    byType: Record<string, number>;
    anchors: number;
}

export interface OmbreBridgeMemory {
    bucketId: string;
    sullyNodeId?: string;
    charId?: string;
    charName?: string;
    groupId?: string;
    groupName?: string;
    room?: MemoryRoom;
    type?: 'dynamic' | 'permanent' | 'feel';
    visibility?: string;
    scope?: string;
    source?: string;
    title?: string;
    tags?: string[];
    importance?: number;
    mood?: string;
    valence?: number;
    arousal?: number;
    anchor?: boolean;
    occurredAt?: string;
    createdAt?: string;
    triggeredBy?: string;
    content?: string;
}

export interface OmbreBridgeSearchParams {
    query?: string;
    charId?: string;
    groupId?: string;
    adminScope?: boolean;
    room?: MemoryRoom;
    type?: 'dynamic' | 'permanent' | 'feel' | 'no_feel';
    limit?: number;
    includeFeel?: boolean;
}

export interface OmbreBridgeWriteOptions {
    title?: string;
    charName?: string;
    groupName?: string;
    visibility?: 'private' | 'character' | 'group' | 'shared' | 'system';
    scope?: string;
    source?: string;
    type?: 'dynamic' | 'permanent' | 'feel';
    anchor?: boolean;
    triggeredBy?: string;
    whyRemembered?: string;
}

export interface OmbreBridgeCharacterIndexItem {
    id: string;
    name: string;
    avatar?: string;
    visibility?: string;
    description?: string;
    memoryPalaceEnabled?: boolean;
    autoArchiveEnabled?: boolean;
    impression?: unknown;
    learned?: unknown;
    memories?: unknown[];
    refinedMemories?: Record<string, string>;
    activeMemoryMonths?: string[];
    selfInsights?: string[];
    personalityStyle?: 'emotional' | 'narrative' | 'imagery' | 'analytical';
    ruminationTendency?: number;
    worldview?: string;
    systemPrompt?: string;
}

export interface OmbreBridgeCharacterIndexPayload {
    memoryPalaceConfig?: unknown;
    embeddingConfig?: unknown;
}

export interface OmbreBridgeRoomPlateItem extends RoomPlate {
    charName?: string;
}

function bridgeBaseUrl(config: OmbreBridgeConfig): string {
    const base = (config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!base) throw new Error('Ombre Bridge baseUrl 不能为空');
    return base;
}

function bridgeHeaders(config: OmbreBridgeConfig, json: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (config.apiKey?.trim()) headers['X-Sully-Bridge-Key'] = config.apiKey.trim();
    return headers;
}

async function readBridgeJson(response: Response, endpointLabel = response.url): Promise<any> {
    const data = await safeResponseJson(response);
    if (!response.ok || data?.ok === false) {
        const detail = data?.error || response.statusText || '请求失败';
        throw new Error(`${endpointLabel} 返回 HTTP ${response.status}: ${detail}`);
    }
    return data;
}

function getStoredBridgeConfig(): OmbreBridgeConfig | null {
    try {
        const baseUrl = localStorage.getItem(OMBRE_BRIDGE_URL_KEY)?.trim() || '';
        if (!baseUrl) return null;
        return {
            baseUrl,
            apiKey: localStorage.getItem(OMBRE_BRIDGE_API_KEY)?.trim() || undefined,
        };
    } catch {
        return null;
    }
}

function getStoredCharName(charId: string): string {
    try {
        const raw = localStorage.getItem(OMBRE_BRIDGE_CHAR_NAMES_KEY);
        if (!raw) return '';
        const map = JSON.parse(raw);
        return typeof map?.[charId] === 'string' ? map[charId] : '';
    } catch {
        return '';
    }
}

export function saveOmbreBridgeSettings(args: {
    baseUrl: string;
    apiKey?: string;
    autoSync?: boolean;
    charNames?: Record<string, string>;
}): void {
    localStorage.setItem(OMBRE_BRIDGE_URL_KEY, args.baseUrl.trim());
    localStorage.setItem(OMBRE_BRIDGE_API_KEY, args.apiKey?.trim() || '');
    localStorage.setItem(OMBRE_BRIDGE_AUTO_SYNC_KEY, args.autoSync ? '1' : '0');
    if (args.charNames) {
        localStorage.setItem(OMBRE_BRIDGE_CHAR_NAMES_KEY, JSON.stringify(args.charNames));
    }
}

export function readOmbreBridgeSettings(): {
    baseUrl: string;
    apiKey: string;
    autoSync: boolean;
    charNames: Record<string, string>;
} {
    try {
        return {
            baseUrl: localStorage.getItem(OMBRE_BRIDGE_URL_KEY) || '',
            apiKey: localStorage.getItem(OMBRE_BRIDGE_API_KEY) || '',
            autoSync: localStorage.getItem(OMBRE_BRIDGE_AUTO_SYNC_KEY) === '1',
            charNames: JSON.parse(localStorage.getItem(OMBRE_BRIDGE_CHAR_NAMES_KEY) || '{}'),
        };
    } catch {
        return { baseUrl: '', apiKey: '', autoSync: false, charNames: {} };
    }
}

export function shouldAutoSyncToOmbre(): boolean {
    try {
        return localStorage.getItem(OMBRE_BRIDGE_AUTO_SYNC_KEY) === '1' && !!localStorage.getItem(OMBRE_BRIDGE_URL_KEY)?.trim();
    } catch {
        return false;
    }
}

function nodeMirrorSignature(node: MemoryNode): string {
    return JSON.stringify({
        content: node.content,
        room: node.room,
        tags: node.tags,
        importance: node.importance,
        mood: node.mood,
        valence: node.valence ?? 0,
        arousal: node.arousal ?? 0,
        pinned: !!node.pinnedUntil,
        archived: !!node.archived,
        origin: node.origin || '',
    });
}

function getMirroredSignatures(): Record<string, string> {
    try {
        return JSON.parse(localStorage.getItem(OMBRE_BRIDGE_MIRRORED_SIGS_KEY) || '{}');
    } catch {
        return {};
    }
}

function setMirroredSignature(nodeId: string, signature: string): void {
    try {
        const sigs = getMirroredSignatures();
        sigs[nodeId] = signature;
        localStorage.setItem(OMBRE_BRIDGE_MIRRORED_SIGS_KEY, JSON.stringify(sigs));
    } catch {
        // Best-effort cache only. Failed cache writes should not block local memory.
    }
}

function clearMirroredSignature(nodeId: string): void {
    try {
        const sigs = getMirroredSignatures();
        delete sigs[nodeId];
        localStorage.setItem(OMBRE_BRIDGE_MIRRORED_SIGS_KEY, JSON.stringify(sigs));
    } catch {
        // Best-effort cache only. Failed cache writes should not block local deletion.
    }
}

export function memoryNodeToOmbrePayload(
    node: MemoryNode,
    options: OmbreBridgeWriteOptions = {},
): Record<string, unknown> {
    return {
        id: node.id,
        sullyNodeId: node.id,
        charId: node.charId,
        charName: options.charName || '',
        groupId: node.groupId,
        groupName: options.groupName || '',
        content: node.content,
        room: node.room,
        tags: node.tags,
        importance: node.importance,
        mood: node.mood,
        valence: node.valence ?? 0,
        arousal: node.arousal ?? 0,
        createdAt: node.createdAt,
        updatedAt: node.lastAccessedAt || node.createdAt,
        title: options.title || node.content.slice(0, 48),
        eventBoxId: node.eventBoxId || '',
        archived: !!node.archived,
        isBoxSummary: !!node.isBoxSummary,
        pinnedUntil: node.pinnedUntil || null,
        origin: node.origin || '',
        visibility: options.visibility || (node.groupId ? 'group' : 'character'),
        scope: options.scope || 'memory_palace',
        source: options.source || 'sullyos_memory_palace',
        type: options.type || 'permanent',
        anchor: options.anchor ?? false,
        triggeredBy: options.triggeredBy || '',
        whyRemembered: options.whyRemembered || '',
    };
}

export async function listOmbreBridgeContexts(config: OmbreBridgeConfig): Promise<OmbreBridgeContext[]> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/contexts`, {
        headers: bridgeHeaders(config, false),
        credentials: 'omit',
    });
    const data = await readBridgeJson(response, '/api/sully/contexts');
    return Array.isArray(data.contexts) ? data.contexts : [];
}

export async function pushMemoryNodeToOmbre(
    config: OmbreBridgeConfig,
    node: MemoryNode,
    options: OmbreBridgeWriteOptions = {},
): Promise<{ bucket_id: string; ok: boolean; [key: string]: unknown }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/memories`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify(memoryNodeToOmbrePayload(node, options)),
    });
    const data = await readBridgeJson(response, '/api/sully/memories');
    setMirroredSignature(node.id, nodeMirrorSignature(node));
    return data;
}

export async function pushCharacterIndexToOmbre(
    config: OmbreBridgeConfig,
    characters: OmbreBridgeCharacterIndexItem[],
    payload: OmbreBridgeCharacterIndexPayload = {},
): Promise<{ ok: boolean; characters?: OmbreBridgeCharacterIndexItem[]; [key: string]: unknown }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/characters`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ ...payload, characters }),
    });
    return await readBridgeJson(response, '/api/sully/characters');
}

export async function pushMemoryPalaceConfigToOmbre(
    config: OmbreBridgeConfig,
    memoryPalaceConfig: unknown,
): Promise<{ ok: boolean; embeddingConfig?: unknown; [key: string]: unknown }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/config`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ memoryPalaceConfig }),
    });
    return await readBridgeJson(response, '/api/sully/config');
}

export async function pushMemoryPalaceExportToOmbre(
    config: OmbreBridgeConfig,
    memoryPalaceExport: unknown,
): Promise<{ ok: boolean; data?: unknown; totals?: unknown; [key: string]: unknown }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/import`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify(memoryPalaceExport),
    });
    return await readBridgeJson(response, '/api/import');
}

export interface MemoryHubContextAssembly {
    ok: boolean;
    authority: 'memory-hub';
    storage: 'authority.sqlite';
    characterId: string;
    stableSystemPrompt: string;
    volatileContext: string;
    finalSystemPrompt: string;
    finalMessages: Array<{ role: string; content: unknown; [key: string]: unknown }>;
    activatedWorldbooks: unknown[];
    recallResult: { items?: unknown[]; [key: string]: unknown };
    modelConfig?: unknown;
    stateChanges?: unknown[];
}

export async function previewSullyMigrationOnHub(
    config: OmbreBridgeConfig,
    backup: unknown,
): Promise<{ ok: boolean; report?: any; sourceHash?: string }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/v1/migrations/sully/preview`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ backup }),
    });
    return await readBridgeJson(response, '/api/v1/migrations/sully/preview');
}

export async function importSullyMigrationToHub(
    config: OmbreBridgeConfig,
    backup: unknown,
): Promise<{ ok: boolean; report?: any }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/v1/migrations/sully/import`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ backup, actorId: 'sullyos-migration', mode: 'one-time-migration' }),
    });
    return await readBridgeJson(response, '/api/v1/migrations/sully/import');
}

/**
 * Request the fully assembled model context from Memory Hub.
 * This is the authority-client path; callers may compare it with the local
 * ContextBuilder result until golden parity is confirmed before activating it.
 */
export async function assembleContextOnMemoryHub(
    config: OmbreBridgeConfig,
    input: {
        characterId: string;
        userId?: string;
        query?: string;
        historyLimit?: number;
        recallLimit?: number;
        now?: number;
    },
): Promise<MemoryHubContextAssembly> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/v1/context/assemble`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify(input),
    });
    return await readBridgeJson(response, '/api/v1/context/assemble');
}

export async function assembleAuthorityContextIfConfigured(
    characterId: string,
    messages: Array<{ id?: string | number; role?: string; content?: unknown; timestamp?: number; createdAt?: unknown }>,
): Promise<MemoryHubContextAssembly | null> {
    if (!shouldAutoSyncToOmbre()) return null;
    const config = getStoredBridgeConfig();
    if (!config) return null;
    const recent = messages.slice(-1000).map((message) => ({ ...message, charId: characterId }));
    if (recent.length) {
        const runtimeResponse = await fetch(`${bridgeBaseUrl(config)}/api/runtime/messages`, {
            method: 'POST',
            headers: bridgeHeaders(config),
            credentials: 'omit',
            body: JSON.stringify({ characterId, messages: recent, autoProcess: false, turnCompleted: false }),
        });
        await readBridgeJson(runtimeResponse, '/api/runtime/messages');
    }
    return await assembleContextOnMemoryHub(config, {
        characterId,
        historyLimit: Math.max(1, Math.min(1000, recent.length || 100)),
        query: recent.slice(-12).map((item) => typeof item.content === 'string' ? item.content : '').filter(Boolean).join('\n'),
    });
}

export async function pushRoomPlatesToOmbre(
    config: OmbreBridgeConfig,
    roomPlates: OmbreBridgeRoomPlateItem[],
): Promise<{ ok: boolean; roomPlates?: OmbreBridgeRoomPlateItem[]; total?: number; [key: string]: unknown }> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/room-plates`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ roomPlates }),
    });
    return await readBridgeJson(response, '/api/sully/room-plates');
}

async function pushPalaceEntitiesToOmbre(
    endpoint: 'event-boxes' | 'anticipations' | 'digest-reports',
    payload: Record<string, unknown>,
): Promise<void> {
    if (!shouldAutoSyncToOmbre()) return;
    const config = getStoredBridgeConfig();
    if (!config) return;
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/${endpoint}`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify(payload),
    });
    await readBridgeJson(response, `/api/sully/${endpoint}`);
}

export function mirrorEventBoxToOmbreIfConfigured(box: EventBox): void {
    pushPalaceEntitiesToOmbre('event-boxes', { eventBoxes: [box] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] EventBox mirror failed:', error?.message || error);
    });
}

export function mirrorEventBoxDeletionToOmbreIfConfigured(id: string): void {
    pushPalaceEntitiesToOmbre('event-boxes', { deletedIds: [id] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] EventBox delete mirror failed:', error?.message || error);
    });
}

export function mirrorRoomPlateToOmbreIfConfigured(plate: RoomPlate): void {
    if (!shouldAutoSyncToOmbre()) return;
    const config = getStoredBridgeConfig();
    if (!config) return;
    pushRoomPlatesToOmbre(config, [plate]).catch(error => {
        console.warn('[MemoryPalace/Ombre] RoomPlate mirror failed:', error?.message || error);
    });
}

export function mirrorRoomPlateDeletionToOmbreIfConfigured(id: string): void {
    if (!shouldAutoSyncToOmbre()) return;
    const config = getStoredBridgeConfig();
    if (!config) return;
    fetch(`${bridgeBaseUrl(config)}/api/sully/room-plates`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ deletedIds: [id] }),
    }).then(response => readBridgeJson(response, '/api/sully/room-plates')).catch(error => {
        console.warn('[MemoryPalace/Ombre] RoomPlate delete mirror failed:', error?.message || error);
    });
}

export function mirrorAnticipationToOmbreIfConfigured(anticipation: Anticipation): void {
    pushPalaceEntitiesToOmbre('anticipations', { anticipations: [anticipation] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] Anticipation mirror failed:', error?.message || error);
    });
}

export function mirrorAnticipationDeletionToOmbreIfConfigured(id: string): void {
    pushPalaceEntitiesToOmbre('anticipations', { deletedIds: [id] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] Anticipation delete mirror failed:', error?.message || error);
    });
}

export function mirrorDigestReportToOmbreIfConfigured(report: DigestReport): void {
    pushPalaceEntitiesToOmbre('digest-reports', { digestReports: [report] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] DigestReport mirror failed:', error?.message || error);
    });
}

export function mirrorDigestReportDeletionToOmbreIfConfigured(id: string): void {
    pushPalaceEntitiesToOmbre('digest-reports', { deletedIds: [id] }).catch(error => {
        console.warn('[MemoryPalace/Ombre] DigestReport delete mirror failed:', error?.message || error);
    });
}

export function mirrorMemoryNodeToOmbreIfConfigured(node: MemoryNode): void {
    if (!shouldAutoSyncToOmbre()) return;
    const config = getStoredBridgeConfig();
    if (!config) return;
    const signature = nodeMirrorSignature(node);
    if (getMirroredSignatures()[node.id] === signature) return;
    pushMemoryNodeToOmbre(config, node, {
        charName: getStoredCharName(node.charId),
        groupName: node.groupName || '',
        type: node.origin === 'digestion' ? 'feel' : 'permanent',
        anchor: !!node.pinnedUntil,
    }).catch((error) => {
        console.warn('[MemoryPalace/Ombre] mirror failed:', error?.message || error);
    });
}

export function mirrorMemoryNodeDeletionToOmbreIfConfigured(id: string): void {
    clearMirroredSignature(id);
    if (!shouldAutoSyncToOmbre()) return;
    const config = getStoredBridgeConfig();
    if (!config) return;
    fetch(`${bridgeBaseUrl(config)}/api/sully/memories`, {
        method: 'POST',
        headers: bridgeHeaders(config),
        credentials: 'omit',
        body: JSON.stringify({ deletedIds: [id] }),
    }).then(response => readBridgeJson(response, '/api/sully/memories')).catch(error => {
        console.warn('[MemoryPalace/Ombre] MemoryNode delete mirror failed:', error?.message || error);
    });
}

export async function searchOmbreBridgeMemories(
    config: OmbreBridgeConfig,
    params: OmbreBridgeSearchParams,
): Promise<OmbreBridgeMemory[]> {
    const query = new URLSearchParams();
    if (params.query) query.set('q', params.query);
    if (params.charId) query.set('charId', params.charId);
    if (params.groupId) query.set('groupId', params.groupId);
    if (params.adminScope) query.set('admin_scope', 'true');
    if (params.room) query.set('room', params.room);
    if (params.type) query.set('type', params.type);
    query.set('includeFeel', String(params.includeFeel ?? true));
    query.set('limit', String(params.limit || 10));
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/memories?${query.toString()}`, {
        headers: bridgeHeaders(config, false),
        credentials: 'omit',
    });
    const data = await readBridgeJson(response, '/api/sully/memories');
    return Array.isArray(data.results) ? data.results : [];
}

export async function inspectOmbreBridgeSchema(config: OmbreBridgeConfig): Promise<any> {
    const response = await fetch(`${bridgeBaseUrl(config)}/api/sully/schema`, {
        headers: bridgeHeaders(config, false),
        credentials: 'omit',
    });
    return await readBridgeJson(response, '/api/sully/schema');
}
