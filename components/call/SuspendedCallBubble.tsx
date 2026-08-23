import React, { useEffect, useRef, useState } from 'react';
import { Phone } from '@phosphor-icons/react';
import type { CharacterProfile } from '../../types';
import { getChibi } from '../../utils/vrWorld/chibi';
import { clampBubblePos, resolveInsets } from '../../utils/floatingBallBounds';
import { loadCreatorPartsForRender } from '../../utils/creatorPartsBlob';

const STORAGE_KEY = 'sully-suspended-call-bubble-position';
const BUBBLE_SIZE = 64;

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
  const [stateRenderedImage, setStateRenderedImage] = useState<string>();
  const rendererRef = useRef<HTMLIFrameElement>(null);
  const positionRef = useRef(position);
  const chibi = getChibi(character);
  const vrSavedState = character.chibiStudio?.vr?.state || character.vrState?.chibi?.state;
  const needsStateRender = !character.vrState?.chibi?.img && !character.chibiStudio?.vr?.img && !!vrSavedState;
  const displayedImage = stateRenderedImage || chibi.img;

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

  useEffect(() => {
    if (!needsStateRender) return;
    let disposed = false;
    let ready = false;
    let parts: any[] = [];
    const send = () => {
      if (!ready || disposed || !rendererRef.current?.contentWindow) return;
      rendererRef.current.contentWindow.postMessage({
        type: 'like520_init',
        payload: {
          mode: 'char',
          charName: character.name,
          savedState: vrSavedState,
          draftKey: `suspended_call_preview_${character.id}`,
          extraItems: parts,
        },
      }, '*');
      window.setTimeout(() => rendererRef.current?.contentWindow?.postMessage({ type: 'like520_render_current' }, '*'), 120);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== rendererRef.current?.contentWindow || !event.data) return;
      if (event.data.type === 'like520_ready') { ready = true; send(); }
      if (event.data.type === 'like520_result' && event.data.payload?.transparentDataUrl) {
        setStateRenderedImage(event.data.payload.transparentDataUrl);
      }
    };
    window.addEventListener('message', receive);
    loadCreatorPartsForRender().then(items => {
      if (disposed) return;
      parts = items.map(item => ({ categoryKey: item.categoryKey, id: item.id, name: item.name, src: item.src, tintable: !!item.tintable, shadowSrc: item.shadowSrc }));
      send();
    }).catch(() => send());
    return () => { disposed = true; window.removeEventListener('message', receive); };
  }, [character.id, character.name, needsStateRender, vrSavedState]);

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
    <>
    <button
      ref={rootRef}
      type="button"
      aria-label={`返回与 ${character.name} 的通话`}
      title={`通话中 · ${character.name} · 点击返回`}
      className="absolute z-[56] h-16 w-16 touch-none select-none rounded-full border border-white/75 bg-white/55 shadow-[0_10px_30px_rgba(15,23,42,.28)] backdrop-blur-xl active:scale-95"
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
      <span className="absolute inset-1 overflow-hidden rounded-full bg-gradient-to-b from-indigo-100/90 to-slate-200/90">
        {displayedImage ? (
          <img
            src={displayedImage}
            alt=""
            draggable={false}
            className="h-full w-full object-contain object-bottom"
            style={{ transform: `translateY(${chibi.offsetY || 0}px) scale(${chibi.scale || 1}) scaleX(${chibi.flip ? -1 : 1})` }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-600">{character.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-md">
        <Phone size={12} weight="fill" />
      </span>
      <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
    </button>
    {needsStateRender && !stateRenderedImage && (
      <iframe
        ref={rendererRef}
        src={`${((import.meta as any).env?.BASE_URL ?? '/').replace(/\/$/, '')}/like520/character_creator.html`}
        title="彼方形象还原"
        aria-hidden="true"
        className="pointer-events-none fixed h-px w-px opacity-0"
        tabIndex={-1}
      />
    )}
    </>
  );
};

export default SuspendedCallBubble;
