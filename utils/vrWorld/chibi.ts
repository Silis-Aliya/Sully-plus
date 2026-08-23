/**
 * 彼方 chibi 立绘解析（单一来源）：vrState.chibi → date 皮肤/sprites → 头像兜底。
 * VRWorldApp 的房间站位、剧院的演出回放共用这套逻辑。
 */
import type { CharacterProfile } from '../../types';

export interface ChibiDisplay {
    img: string;
    scale: number;
    offsetY: number;
    flip: boolean;
    /** 是否走了兜底（没专属 chibi） */
    isFallback: boolean;
}

export const getChibi = (char: CharacterProfile): ChibiDisplay => {
    const c = char.vrState?.chibi;
    if (c?.img) return { img: c.img, scale: c.scale ?? 1, offsetY: c.offsetY ?? 0, flip: !!c.flip, isFallback: false };
    // 一些从旧版/工坊草稿迁移来的角色只有 chibiStudio.vr 的预览图，尚未把图片
    // 回填到 vrState.chibi。它仍然是“彼方”槽位，必须排在普通头像兜底之前。
    const studioVR = char.chibiStudio?.vr?.img;
    if (studioVR) return { img: studioVR, scale: 1, offsetY: 0, flip: false, isFallback: false };
    const sprites = (char.activeSkinSetId && char.dateSkinSets?.find(s => s.id === char.activeSkinSetId)?.sprites)
        || char.sprites || {};
    // 更早的单槽捏人版本会把 Q 版图只留在 sprites.chibi。
    if (sprites['chibi'] && !String(sprites['chibi']).startsWith('blobref:')) {
        return { img: sprites['chibi'], scale: 1, offsetY: 0, flip: false, isFallback: false };
    }
    const fb = sprites['happy'] || sprites['normal'] || sprites['smile'] || char.avatar || '';
    return { img: fb, scale: 1, offsetY: 0, flip: false, isFallback: true };
};
