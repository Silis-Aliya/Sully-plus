import type { APIConfig, CharacterProfile } from '../../types';
import { DB } from '../db';
import { getVRThrottleCounts } from './runSession';
import { getVRApi, getVRApiLog } from './vrApi';
import { VRScheduler } from './scheduler';

const PAGE_STARTED_AT = Date.now();
const hostOf = (url?: string) => { try { return url ? new URL(url).host : '—'; } catch { return url || '—'; } };
const timeOf = (ts?: number) => ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : '—';
const safeStorage = (key: string) => { try { return localStorage.getItem(key) ?? '（没有）'; } catch (error: any) { return `读取失败：${error?.message || error}`; } };

export async function collectVRDiagnostics(characters: CharacterProfile[], chatApi?: APIConfig | null): Promise<string> {
    const [dbCharacters, vrApi, log] = await Promise.all([DB.getAllCharacters().catch(() => []), getVRApi().catch(() => null), getVRApiLog().catch(() => [])]);
    const dbById = new Map(dbCharacters.map(char => [char.id, char]));
    const characterLines = characters.filter(char => char.vrState || dbById.get(char.id)?.vrState).map(char => {
        const dbChar = dbById.get(char.id);
        return `${char.name}：内存=${char.vrState?.enabled ? '接入' : '关闭'}，数据库=${dbChar?.vrState?.enabled ? '接入' : '关闭'}，间隔=${char.vrState?.intervalMinutes || '—'} 分，连续失败=${VRScheduler.getFailStreak(char.id)}`;
    });
    const throttles = Object.entries(getVRThrottleCounts()).map(([id, count]) => `${id.slice(-6)}：拦截 ${count} 次`);
    const recent = log.slice(0, 40).map(item => `${timeOf(item.ts)} ${item.kind ? `[${item.kind}] ${item.note || ''}` : `${item.charName || item.charId || '—'} ${item.ok ? '成功' : '失败'} ${item.error || ''}`}`);
    let storageHealth = '正常';
    try { const key = '__vr_diag_probe__'; localStorage.setItem(key, '1'); localStorage.removeItem(key); } catch (error: any) { storageHealth = `异常：${error?.message || error}`; }
    return [
        '===== SullyOS 彼方排障快照 =====',
        `收集时间：${timeOf(Date.now())}`,
        `页面运行：${Math.round((Date.now() - PAGE_STARTED_AT) / 60000)} 分钟`,
        `localStorage：${storageHealth}`,
        `彼方 API：${hostOf(vrApi?.baseUrl)} · ${vrApi?.model || '未配置'} · key ${vrApi?.apiKey ? `已填（${vrApi.apiKey.length} 位）` : '为空'}`,
        `聊天 API：${hostOf(chatApi?.baseUrl)} · ${chatApi?.model || '未配置'}`,
        '', '--- 角色内存 / 数据库 ---', ...(characterLines.length ? characterLines : ['没有配置彼方的角色']),
        '', '--- 调度原文（随完整备份和增量同步） ---', `vr_schedules=${safeStorage('vr_schedules')}`, `vr_last_fire=${safeStorage('vr_last_fire')}`, `vr_fail_streak=${safeStorage('vr_fail_streak')}`,
        '', '--- 最小间隔拦截 ---', ...(throttles.length ? throttles : ['无']),
        '', '--- 最近记录 ---', ...(recent.length ? recent : ['无']),
        '===== 快照结束 =====',
    ].join('\n');
}
