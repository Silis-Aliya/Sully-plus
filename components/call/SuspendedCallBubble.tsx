import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterProfile } from '../../types';
import { getChibi } from '../../utils/vrWorld/chibi';
import { clampBubblePos, resolveInsets } from '../../utils/floatingBallBounds';
import { resolveVideoCallBackground, resolveVideoCallForeground, resolveVideoCallForegroundPlacement } from '../../utils/videoCallBackground';
import { useBlobRefUrl } from '../../utils/blobRef';
import { DEFAULT_STAGE_FRAMING } from '../../utils/avatarPerformance';
import type { SuspendedCallInfo } from '../../context/OSContext';
import VRMVideoCallStage from './VRMVideoCallStage';

const STORAGE_KEY = 'sully-suspended-call-bubble-position';
const VIDEO_COLLAPSED_KEY = 'sully-suspended-video-window-collapsed';
const BUBBLE_SIZE = 88;
const VIDEO_WINDOW_WIDTH = 184;
const VIDEO_COLLAPSED_WIDTH = 132;

interface SuspendedCallBubbleProps {
  character: CharacterProfile;
  call: SuspendedCallInfo;
  onResume: () => void;
}

const readPosition = (): { x: number; y: number } | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y) ? parsed : null;
  } catch {
    return null;
  }
};

const SuspendedCallBubble: React.FC<SuspendedCallBubbleProps> = ({ character, call, onResume }) => {
  const rootRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number; moved: boolean } | null>(null);
  const [position, setPosition] = useState(() => readPosition() || { x: -1, y: 96 });
  const positionRef = useRef(position);
  const chibi = getChibi(character);
  const [quickText, setQuickText] = useState('');
  const [videoCollapsed, setVideoCollapsed] = useState(() => localStorage.getItem(VIDEO_COLLAPSED_KEY) === '1');
  const videoBackgroundUrl = useBlobRefUrl(resolveVideoCallBackground(character));
  const videoForegroundUrl = useBlobRefUrl(resolveVideoCallForeground(character));
  const miniVideoFraming = useMemo(() => {
    const base = character.videoAvatar?.framing || DEFAULT_STAGE_FRAMING;
    const multiplier = character.videoAvatar?.format === 'live2d' ? 1.9 : 1.55;
    return {
      ...base,
      scale: Math.min(3.4, Math.max(1.8, base.scale * multiplier)),
    };
  }, [character.videoAvatar?.format, character.videoAvatar?.framing]);

  const sendQuickText = () => {
    const text = quickText.trim();
    if (!text) return;
    window.dispatchEvent(new CustomEvent('sully-suspended-call-message', { detail: { text } }));
    setQuickText('');
  };

  const clampToShell = (x: number, y: number) => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return { x, y };
    const rect = parent.getBoundingClientRect();
    const style = getComputedStyle(parent);
    const insets = resolveInsets({
      padTop: parseFloat(style.paddingTop) || 0,
      padBottom: parseFloat(style.paddingBottom) || 0,
      safeTop: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--standalone-safe-area-top')) || 0,
    });
    return clampBubblePos(x < 0 ? rect.width - BUBBLE_SIZE - 12 : x, y, {
      parentW: rect.width,
      parentH: rect.height,
      insetTop: insets.insetTop,
      insetBottom: insets.insetBottom,
      bubble: call.callMode === 'video' ? (videoCollapsed ? VIDEO_COLLAPSED_WIDTH : VIDEO_WINDOW_WIDTH) : BUBBLE_SIZE,
      pad: 8,
    });
  };

  useEffect(() => {
    const fit = () => setPosition(current => {
      const next = clampToShell(current.x, current.y);
      positionRef.current = next;
      return next;
    });
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [videoCollapsed]);

  const setCollapsed = (collapsed: boolean) => {
    setVideoCollapsed(collapsed);
    localStorage.setItem(VIDEO_COLLAPSED_KEY, collapsed ? '1' : '0');
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const parent = rootRef.current?.parentElement;
    if (!drag || drag.pointerId !== event.pointerId || !parent) return;
    const rect = parent.getBoundingClientRect();
    const next = clampToShell(event.clientX - rect.left - drag.dx, event.clientY - rect.top - drag.dy);
    if (Math.abs(next.x - position.x) > 3 || Math.abs(next.y - position.y) > 3) drag.moved = true;
    positionRef.current = next;
    setPosition(next);
  };

  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current));
    if (!drag.moved && call.callMode !== 'video') onResume();
  };

  if (call.callMode === 'video') {
    if (videoCollapsed) {
      return (
        <section
          ref={rootRef as React.RefObject<HTMLElement>}
          aria-label={`与 ${character.name} 的折叠视频通话小窗`}
          className="absolute z-[56] w-[132px] touch-none select-none overflow-hidden rounded-[1rem] border border-white/45 bg-[#080c14] text-white shadow-[0_12px_34px_rgba(5,10,22,.4)]"
          style={{ left: position.x, top: position.y }}
        >
          <header
            className="absolute inset-x-0 top-0 z-20 flex h-7 cursor-move items-center justify-between bg-gradient-to-b from-black/65 to-transparent px-1.5"
            onPointerDown={event => {
              const rect = rootRef.current?.getBoundingClientRect();
              if (!rect) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
            }}
            onPointerMove={move}
            onPointerUp={finishDrag}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            <span className="max-w-[78px] truncate text-[9px] font-semibold">{character.name}</span>
            <button
              type="button"
              aria-label="展开视频小窗"
              title="展开"
              onPointerDown={event => event.stopPropagation()}
              onClick={() => setCollapsed(false)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
            </button>
          </header>
          <button type="button" onClick={onResume} className="relative block h-[96px] w-full overflow-hidden bg-black/50 text-left">
            <div className="pointer-events-none absolute inset-0">
              <VRMVideoCallStage
                characterName={character.name}
                fallbackAvatar={character.avatar}
                model={character.videoAvatar}
                baseFraming={miniVideoFraming}
                motionState="idle"
                accentColor="#60a5fa"
                backgroundUrl={videoBackgroundUrl}
                foregroundUrl={videoForegroundUrl}
                foregroundPlacement={resolveVideoCallForegroundPlacement(character)}
                onChooseModel={() => undefined}
                companionMode
                framingEditable={false}
                maxFps={10}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
          </button>
        </section>
      );
    }

    return (
      <section
        ref={rootRef as React.RefObject<HTMLElement>}
        aria-label={`与 ${character.name} 的视频通话小窗`}
        className="absolute z-[56] w-[184px] touch-none select-none overflow-hidden rounded-[1.25rem] border border-white/35 bg-[#101521]/95 text-white shadow-[0_14px_42px_rgba(5,10,22,.38)] backdrop-blur-xl"
        style={{ left: position.x, top: position.y }}
      >
        <header
          className="flex h-9 cursor-move items-center justify-between px-2.5"
          onPointerDown={event => {
            const rect = rootRef.current?.getBoundingClientRect();
            if (!rect) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
          }}
          onPointerMove={move}
          onPointerUp={finishDrag}
          onPointerCancel={() => { dragRef.current = null; }}
        >
          <span className="min-w-0 truncate text-xs font-semibold">视频中 · {character.name}</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onPointerDown={event => event.stopPropagation()}
              onClick={() => setCollapsed(true)}
              className="rounded-full bg-white/10 px-2 py-1 text-[10px] active:scale-95"
            >收起</button>
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={onResume} className="rounded-full bg-white/10 px-2 py-1 text-[10px] active:scale-95">全屏</button>
          </span>
        </header>
        <button type="button" onClick={onResume} className="relative block h-[112px] w-full overflow-hidden bg-black/50 text-left">
          <div className="pointer-events-none absolute inset-0">
            <VRMVideoCallStage
              characterName={character.name}
              fallbackAvatar={character.avatar}
              model={character.videoAvatar}
              baseFraming={miniVideoFraming}
              motionState="idle"
              accentColor="#60a5fa"
              backgroundUrl={videoBackgroundUrl}
              foregroundUrl={videoForegroundUrl}
              foregroundPlacement={resolveVideoCallForegroundPlacement(character)}
              onChooseModel={() => undefined}
              companionMode
              framingEditable={false}
              maxFps={15}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-[9px] backdrop-blur">点击恢复通话</span>
        </button>
        <div className="flex items-center gap-1 p-1.5">
          <input
            value={quickText}
            onChange={event => setQuickText(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') sendQuickText(); }}
            placeholder="边看边发消息…"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] text-white outline-none placeholder:text-white/35"
          />
          <button type="button" onClick={sendQuickText} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold active:scale-90">↑</button>
        </div>
      </section>
    );
  }

  return (
    <button
      ref={rootRef}
      type="button"
      aria-label={`返回与 ${character.name} 的通话`}
      title={`通话中 · ${character.name} · 点击返回`}
      className="absolute z-[56] h-[88px] w-[88px] touch-none select-none bg-transparent active:scale-95"
      style={{ left: position.x, top: position.y }}
      onPointerDown={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
      }}
      onPointerMove={move}
      onPointerUp={finishDrag}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <span className="absolute inset-x-1 bottom-2 top-0 flex items-end justify-center" style={{ animation: 'suspendedChibiFloat 3.2s ease-in-out infinite' }}>
        {chibi.img ? (
          <img
            src={chibi.img}
            alt=""
            draggable={false}
            className="max-h-[78px] max-w-[78px] object-contain object-bottom"
            style={{ transform: `scaleX(${chibi.flip ? -1 : 1}) translateY(${chibi.offsetY || 0}px) scale(${chibi.scale || 1})`, filter: 'drop-shadow(0 5px 6px rgba(0,0,0,.4))' }}
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-300 text-lg font-bold text-white shadow-lg">{character.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="absolute bottom-0 left-3 h-2 w-12 rounded-[50%] bg-black/25 blur-[2px]" />
      <style>{'@keyframes suspendedChibiFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}'}</style>
    </button>
  );
};

export default SuspendedCallBubble;
