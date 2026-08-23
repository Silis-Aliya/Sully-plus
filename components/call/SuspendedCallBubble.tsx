import React, { useEffect, useRef, useState } from 'react';
import type { CharacterProfile } from '../../types';
import { getChibi } from '../../utils/vrWorld/chibi';
import { clampBubblePos, resolveInsets } from '../../utils/floatingBallBounds';

const STORAGE_KEY = 'sully-suspended-call-bubble-position';
const BUBBLE_SIZE = 88;

interface SuspendedCallBubbleProps {
  character: CharacterProfile;
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

const SuspendedCallBubble: React.FC<SuspendedCallBubbleProps> = ({ character, onResume }) => {
  const rootRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number; moved: boolean } | null>(null);
  const [position, setPosition] = useState(() => readPosition() || { x: -1, y: 96 });
  const positionRef = useRef(position);
  const chibi = getChibi(character);

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
      bubble: BUBBLE_SIZE,
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

  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const parent = rootRef.current?.parentElement;
    if (!drag || drag.pointerId !== event.pointerId || !parent) return;
    const rect = parent.getBoundingClientRect();
    const next = clampToShell(event.clientX - rect.left - drag.dx, event.clientY - rect.top - drag.dy);
    if (Math.abs(next.x - position.x) > 3 || Math.abs(next.y - position.y) > 3) drag.moved = true;
    positionRef.current = next;
    setPosition(next);
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    rootRef.current?.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current));
    if (!drag.moved) onResume();
  };

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
