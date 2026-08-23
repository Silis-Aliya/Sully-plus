import React, { useEffect, useRef, useState } from 'react';
import type { CharacterProfile } from '../../types';
import { getChibi } from '../../utils/vrWorld/chibi';
import { clampBubblePos, resolveInsets } from '../../utils/floatingBallBounds';
import { resolveVideoCallBackground, resolveVideoCallForeground } from '../../utils/videoCallBackground';
import { useBlobRefUrl } from '../../utils/blobRef';
import type { SuspendedCallInfo } from '../../context/OSContext';
import VRMVideoCallStage from './VRMVideoCallStage';

const STORAGE_KEY = 'sully-suspended-call-bubble-position';
const BUBBLE_SIZE = 88;

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
  const videoBackgroundUrl = useBlobRefUrl(resolveVideoCallBackground(character));
  const videoForegroundUrl = useBlobRefUrl(resolveVideoCallForeground(character));

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
      bubble: call.callMode === 'video' ? 224 : BUBBLE_SIZE,
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
  }, []);

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
    return (
      <section
        ref={rootRef as React.RefObject<HTMLElement>}
        aria-label={`与 ${character.name} 的视频通话小窗`}
        className="absolute z-[56] w-[224px] touch-none select-none overflow-hidden rounded-[1.5rem] border border-white/35 bg-[#101521]/95 text-white shadow-[0_18px_55px_rgba(5,10,22,.42)] backdrop-blur-xl"
        style={{ left: position.x, top: position.y }}
      >
        <header
          className="flex h-10 cursor-move items-center justify-between px-3"
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
          <button type="button" onClick={onResume} className="rounded-full bg-white/10 px-2 py-1 text-[10px] active:scale-95">全屏</button>
        </header>
        <button type="button" onClick={onResume} className="relative block h-[150px] w-full overflow-hidden bg-black/50 text-left">
          <div className="pointer-events-none absolute inset-0">
            <VRMVideoCallStage
              characterName={character.name}
              fallbackAvatar={character.avatar}
              model={character.videoAvatar}
              motionState="idle"
              accentColor="#60a5fa"
              backgroundUrl={videoBackgroundUrl}
              foregroundUrl={videoForegroundUrl}
              foregroundPlacement={character.videoCallForegroundPlacement}
              onChooseModel={() => undefined}
              companionMode
              framingEditable={false}
              maxFps={15}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-[9px] backdrop-blur">点击恢复通话</span>
        </button>
        <div className="flex items-center gap-1.5 p-2">
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
