// 图片 Blob 引用层（base64 → Blob 迁移的核心）。
//
// 背景：本项目图片历来以 base64 data URL 直接存进 IndexedDB / CharacterProfile。base64 比
// 原始二进制大 ~33%，且作为 JS 字符串常驻内存（React state / <img src> 里都拖着整段），
// 壁纸、小屋（RoomApp）这类大图尤其吃配额和内存。
//
// 方案：图片二进制存进 blob_assets store（IndexedDB 原生支持 Blob），字段里只存一个短
// 令牌 `blobref:<id>`。这样：
//   · 字段仍是 string —— CharacterProfile / 各 store 记录仍可 JSON 安全序列化、结构化克隆；
//   · 渲染时把令牌解析成 objectURL（URL.createObjectURL）喂给 <img>/CSS 背景，并管好回收；
//   · 备份导出前把令牌解析回 data URL，复用既有「data:image → zip assets/*」抽取管线，
//     备份格式与可移植性完全不变（见 context/OSContext.tsx 导出/导入）。
//
// 兼容：旧值（`data:...` / `http(s)://...` / CSS 渐变字符串）一律原样透传，永远能渲染；
// 惰性迁移由各消费方（壁纸加载、进入小屋）在读到 data: 时顺手 put 成 Blob 完成。

import { useEffect, useState } from 'react';
import { dataUrlToBlob, blobToDataUrl, hashBlob } from '@rei-standard/blob-store';
import { DB } from './db';
import type { AppearancePreset } from '../types';

export const BLOBREF_PREFIX = 'blobref:';

// 用带品牌的 string 子类型做类型守卫：正分支收窄成 BlobRef，负分支仍保留 string
// （若直接用 `v is string`，对本就是 string 的入参，否定分支会被收窄成 never）。
export type BlobRef = string & { readonly __blobRef: unique symbol };

/** 是否是 blobref 令牌。 */
export const isBlobRef = (v: unknown): v is BlobRef =>
    typeof v === 'string' && v.startsWith(BLOBREF_PREFIX);

const idOfRef = (ref: string): string => ref.slice(BLOBREF_PREFIX.length);

let seq = 0;
const genId = (): string =>
    `img_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** 把 Blob 存进 blob_assets，返回 `blobref:<id>` 令牌。 */
export async function putImageBlob(blob: Blob): Promise<string> {
    const id = genId();
    await DB.putBlobAsset(id, blob);
    return BLOBREF_PREFIX + id;
}

/** 读取令牌对应的 Blob（非令牌或不存在返回 null）。 */
export async function getBlobForRef(ref: string): Promise<Blob | null> {
    if (!isBlobRef(ref)) return null;
    try {
        return await DB.getBlobAsset(idOfRef(ref));
    } catch {
        return null;
    }
}

/**
 * 删除令牌对应的 Blob（best-effort）。
 * 注意：同一令牌可能被多处引用（小屋自定义素材的 image 会被复制进摆放的 item.image），
 * 所以调用方需自行确认无人再引用后才删，否则会删出「碎图」。多数消费方从简：不主动删，
 * 残留孤儿 Blob 由后续 GC 处理，宁可占一点空间也不冒破图风险。
 *
 * 少数字段（桌面静态形象 / 视频舞台背景 / 桌面背景 / 通话快照 / 假摄像头图）确实会在
 * 换图时直接删掉旧 Blob——它们的图来自用户当场选的文件，一份令牌只归自己。这批字段
 * 登记在 utils/blobDedupe.ts 的 collectUnmergeableRefs 里，令牌合并会整组绕开它们。
 * 新增这类裸删调用点时，记得把字段一并登记过去。
 */
export async function deleteBlobRef(ref: string | undefined | null): Promise<void> {
    if (ref && isBlobRef(ref)) {
        try { await DB.deleteBlobAsset(idOfRef(ref)); } catch { /* ignore */ }
    }
}

/**
 * 仅在令牌已不再被持久化设置引用时删除 Blob。
 *
 * 壁纸、锁屏和外观预设可能共享同一令牌；直接在换图时 delete 会让预设或“切回默认”备份
 * 变成死图。这里检查 assets（含 appearance_preset_* JSON）和 localStorage（含皮肤壁纸备份）
 * 后再清理。读取引用表失败时宁可保留，也绝不冒险删图。
 */
export async function deleteBlobRefIfUnreferenced(ref: string | undefined | null): Promise<boolean> {
    if (!ref || !isBlobRef(ref)) return false;

    try {
        const assets = await DB.getAllAssets();
        if (assets.some(asset => typeof asset.data === 'string' && asset.data.includes(ref))) {
            return false;
        }
    } catch {
        return false;
    }

    try {
        const characters = await DB.getAllCharacters();
        if (characters.some(character => JSON.stringify(character).includes(ref))) {
            return false;
        }
    } catch {
        return false;
    }

    try {
        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                if (localStorage.getItem(key)?.includes(ref)) return false;
            }
        }
    } catch {
        return false;
    }

    await deleteBlobRef(ref);
    return true;
}

// ─── data URL ⇄ Blob 互转 ───────────────────────────────────────
// 语义随 SDK：dataUrlToBlob 非法输入抛错、非 base64 退化 UTF-8 编码；
// blobToDataUrl 优先 FileReader，无 FileReader 环境（Worker / Node 测试）退化 arrayBuffer 手编。
export { dataUrlToBlob, blobToDataUrl };

// ─── 内容记忆：同一份图别存第二遍 ───────────────────────────────
//
// 惰性迁移分散在各消费点（壁纸加载、进小屋、图标、捏人器部件），彼此不知道对方转过什么。
// 导入过「同一张图内联在好几处」的旧备份后，这些入口会在几分钟里把同一份 base64 各转一遍，
// 库里于是躺着好几份一模一样的 Blob。这层记忆按内容哈希把它们收敛到同一个令牌上。
//
// key 用哈希而不是 data URL：后者动辄几 MB，缓存它等于把 base64 又请回内存，
// 那正是 blobRef 要解决的问题。
//
// 只在进程内有效（刷新即空）。跨会话的重复交给「优化资源存储」——它扫全库按内容合并，
// 并在开头拿扫描结果给这份记忆预热，于是转换时能直接复用库里已经有的那份。
const contentMemo = new Map<string, string>();

/**
 * 用扫库结果预热内容记忆。tokens 按创建时间升序，取第一个（也是合并时的保留方）。
 *
 * 调用方要先滤掉「被裸删字段引用」的令牌（见 utils/blobDedupe.ts 的 collectUnmergeableRefs）：
 * 复用到那种令牌，等于让新字段和一个「换图就直接删」的字段共享 Blob，对方一删这边就破图。
 */
export function primeContentMemo(byHash: Map<string, string[]>): void {
    for (const [hash, tokens] of byHash) {
        if (tokens.length > 0) contentMemo.set(hash, tokens[0]);
    }
}

/** 仅测试用：清空内容记忆，避免用例之间串味。 */
export function clearContentMemo(): void {
    contentMemo.clear();
}

/**
 * 存 Blob，但先看看同样内容的是不是已经有了——有就复用它的令牌，不再存第二份。
 * 算不出哈希（非安全上下文没有 crypto.subtle）时退化成普通 put，功能照旧、只是不去重。
 *
 * 只给迁移路径用。用户当场上传的图仍走 putImageBlob 各存各的：那几个字段换图时是
 * 裸删旧 Blob 的，共享会让一次删除波及别人（见 deleteBlobRef 的注释）。
 */
export async function putImageBlobDeduped(blob: Blob): Promise<{ token: string; reused: boolean }> {
    let hash: string | null = null;
    try { hash = await hashBlob(blob); } catch { hash = null; }

    if (hash) {
        const remembered = contentMemo.get(hash);
        // 记住的令牌可能已经不在了：它写进某个字段后那个字段又被改掉，Blob 成孤儿被 GC 收走。
        // 直接还回去就是个死令牌，所以确认 Blob 还在才复用。
        if (remembered) {
            if (await getBlobForRef(remembered)) return { token: remembered, reused: true };
            contentMemo.delete(hash);
        }
    }

    const token = await putImageBlob(blob);
    if (hash) contentMemo.set(hash, token);
    return { token, reused: false };
}

/**
 * 把一个 data: 图片存成 Blob 并返回令牌（惰性迁移用）。同内容的图已经存过就复用它，
 * 不再存第二份。转换失败时回退返回原字符串，保证调用方永远拿到一个可渲染的值，
 * 不会因迁移失败而丢图。
 */
export async function migrateDataUrlToRef(dataUrl: string): Promise<string> {
    try {
        return (await putImageBlobDeduped(dataUrlToBlob(dataUrl))).token;
    } catch {
        return dataUrl;
    }
}

/**
 * 外观预设导入专用迁移：只转换已经接入 BlobRef 渲染链路的字段，其他 data URL 保持原状。
 *
 * 同一张原图在壁纸、锁屏或多个图标里出现时只会存一份 Blob——这由 migrateDataUrlToRef
 * 的内容记忆保证（按哈希认人）。这里不再自备一层 data URL → 令牌的缓存：键是几 MB 的
 * base64 原文，一批预设过下来等于把它们全留在内存里，而收益只是省掉一次哈希计算。
 */
export async function migrateAppearancePresetBlobRefs(
    preset: AppearancePreset,
): Promise<AppearancePreset> {
    const migrate = async (value: string | undefined): Promise<string | undefined> => {
        if (!value?.startsWith('data:')) return value;
        return await migrateDataUrlToRef(value);
    };

    const theme = { ...preset.theme };
    theme.wallpaper = (await migrate(theme.wallpaper)) || theme.wallpaper;
    if ('lockWallpaper' in theme) theme.lockWallpaper = await migrate(theme.lockWallpaper);

    let customIcons = preset.customIcons;
    if (customIcons) {
        customIcons = {};
        for (const [appId, icon] of Object.entries(preset.customIcons || {})) {
            customIcons[appId] = (await migrate(icon)) || icon;
        }
    }

    return { ...preset, theme, customIcons };
}

/**
 * 把单个值从令牌解析成可直接用的 data URL（读 Blob → base64）；非令牌原样返回。
 * 用在必须拿 base64 字符串的消费点（如跨 iframe postMessage 的捏人器部件）。
 * Blob 已丢时返回空串（避免把死令牌当 img src 用）。
 */
export async function resolveRefToDataUrl(value: string): Promise<string> {
    if (!isBlobRef(value)) return value;
    const blob = await getBlobForRef(value);
    return blob ? blobToDataUrl(blob) : '';
}

/**
 * 深度遍历对象树，把所有 `blobref:<id>` 字符串原地替换成对应的 data URL（读 Blob 转 base64）。
 * 备份导出前调用，令牌随之变回 data:image，交给既有 zip 抽取管线处理。解析不到的令牌置空串
 * （图已丢，避免导出一个恢复端认不得的死令牌）。原地修改传入对象，调用方须传独立副本。
 */
export async function resolveBlobRefsDeep(root: unknown): Promise<void> {
    if (root === null || typeof root !== 'object') return;
    const hits: Array<{ container: any; key: string | number; ref: string }> = [];
    const seen = new WeakSet<object>();
    const stack: object[] = [root as object];
    while (stack.length) {
        const node = stack.pop()!;
        if (seen.has(node)) continue;
        seen.add(node);
        const entries: Array<[string | number, unknown]> = Array.isArray(node)
            ? node.map((v, i) => [i, v])
            : Object.keys(node).map(k => [k, (node as any)[k]]);
        for (const [key, v] of entries) {
            if (isBlobRef(v)) {
                hits.push({ container: node, key, ref: v });
            } else if (v !== null && typeof v === 'object') {
                stack.push(v as object);
            }
        }
    }
    if (!hits.length) return;
    // 同一令牌只读一次。
    const cache = new Map<string, string>();
    for (const { container, key, ref } of hits) {
        let dataUrl = cache.get(ref);
        if (dataUrl === undefined) {
            const blob = await getBlobForRef(ref);
            dataUrl = blob ? await blobToDataUrl(blob) : '';
            cache.set(ref, dataUrl);
        }
        container[key] = dataUrl;
    }
}

// ─── React 渲染 hook ────────────────────────────────────────────

/**
 * 把一个图片字段值解析成可直接用于 <img src>/CSS url() 的字符串。
 *   · blobref 令牌 → 读 Blob 建 objectURL，组件卸载 / value 变化时 revoke，绝不泄漏；
 *   · 其它（data: / http(s) / 渐变 / undefined）→ 原样返回。
 * 令牌解析前返回 undefined（首帧可能无图，等 Blob 读出后再渲染，属预期）。
 */
export function useBlobRefUrl(value: string | undefined | null): string | undefined {
    const [url, setUrl] = useState<string | undefined>(
        isBlobRef(value) ? undefined : (value ?? undefined)
    );

    useEffect(() => {
        if (!isBlobRef(value)) {
            setUrl(value ?? undefined);
            return;
        }
        let alive = true;
        let objUrl: string | undefined;
        getBlobForRef(value).then(blob => {
            if (!alive) return;
            if (blob) {
                objUrl = URL.createObjectURL(blob);
                setUrl(objUrl);
            } else {
                setUrl(undefined);
            }
        });
        return () => {
            alive = false;
            if (objUrl) URL.revokeObjectURL(objUrl);
        };
    }, [value]);

    return url;
}
