import React, { useEffect, useRef } from 'react';
import { Crosshair, Pause as PauseIcon, Play as PlayIcon } from '@phosphor-icons/react';
import { useMusicProgress, type Song } from '../../context/MusicContext';
import { BokehBg, C, CrossStar, GlassProgress, Sparkle } from './MusicUI';

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

export const PlayerProgress: React.FC<{ seek: (pct: number) => void }> = React.memo(({ seek }) => {
  const { progress, duration } = useMusicProgress();
  return (
    <div className="w-full shrink-0 max-w-sm">
      <GlassProgress progress={progress} duration={duration} fmtTime={fmtTime} onSeek={seek} />
    </div>
  );
});

export const PlayerLyrics: React.FC<{
  lyric: { t: number; text: string }[];
  tlyric: { t: number; text: string }[];
  loadingSong: boolean;
}> = React.memo(({ lyric, tlyric, loadingSong }) => {
  const { activeLyricIdx } = useMusicProgress();
  const lyricBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = lyricBoxRef.current;
    if (!box || activeLyricIdx < 0) return;
    const el = box.querySelector<HTMLDivElement>(`[data-lyric-idx="${activeLyricIdx}"]`);
    if (!el) return;
    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elTopInBox = elRect.top - boxRect.top + box.scrollTop;
    box.scrollTo({ top: elTopInBox - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [activeLyricIdx]);

  return (
    <div
      ref={lyricBoxRef}
      className="flex-1 w-full my-3 min-h-0 overflow-y-auto text-center scroll-smooth shizuku-scrollbar px-2"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
      }}
    >
      {lyric.length === 0 ? (
        <div className="pt-6 flex flex-col items-center gap-2" style={{ color: C.faint }}>
          <Sparkle size={12} color={C.glow} />
          <span className="text-[11px] italic tracking-wider" style={{ fontFamily: `'Noto Serif','Georgia',serif` }}>
            {loadingSong ? 'loading...' : 'no lyrics'}
          </span>
        </div>
      ) : (
        <div className="space-y-4 py-8">
          {lyric.map((l, i) => {
            const tr = tlyric.find(t => Math.abs(t.t - l.t) < 0.2);
            const active = i === activeLyricIdx;
            return (
              <div key={i} data-lyric-idx={i}
                className="transition-transform duration-300 will-change-transform"
                style={{
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center center',
                  opacity: active ? 1 : 0.45,
                }}>
                <div className="flex items-center justify-center gap-2 px-3">
                  <CrossStar size={12} color={C.sakura} delay={0} solid={active} className={active ? '' : 'opacity-0'} />
                  <div
                    className="text-[16px] leading-[1.4]"
                    style={{
                      fontFamily: `'Noto Serif','Georgia',serif`,
                      fontWeight: 400,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      color: active ? undefined : C.faint,
                      ...(active
                        ? {
                            background: `linear-gradient(135deg, ${C.primary} 0%, ${C.accent} 50%, #9a6bc5 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: `drop-shadow(0 0 14px ${C.glow}a0) drop-shadow(0 0 4px ${C.sakura}80)`,
                          }
                        : {}),
                    }}
                  >
                    {l.text}
                  </div>
                  <CrossStar size={12} color={C.lavender} delay={0.9} solid={active} className={active ? '' : 'opacity-0'} />
                </div>
                {tr && (
                  <div
                    className="text-[12px] leading-[1.4] mt-1 px-3"
                    style={{
                      fontWeight: 400,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      opacity: active ? 0.78 : 0.4,
                      color: active ? C.accent : C.faint,
                    }}
                  >
                    {tr.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export const LyricSyncOverlay: React.FC<{
  current: Song;
  lyric: { t: number; text: string }[];
  syncDraft: number[];
  setSyncDraft: React.Dispatch<React.SetStateAction<number[]>>;
  setShowLyricSync: (show: boolean) => void;
  addLocalSong: (song: Song) => void;
  playSong: (song: Song, opts?: { alsoSetQueue?: boolean; replaceQueue?: Song[]; startIdx?: number }) => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  playing: boolean;
  togglePlay: () => void;
  seek: (pct: number) => void;
}> = React.memo(({ current, lyric, syncDraft, setSyncDraft, setShowLyricSync, addLocalSong, playSong, addToast, playing, togglePlay, seek }) => {
  const { progress, duration, activeLyricIdx } = useMusicProgress();
  const fmt = (value: number) => {
    if (!isFinite(value)) return '0:00.0';
    const m = Math.floor(value / 60);
    const sec = (value % 60).toFixed(1).padStart(4, '0');
    return `${m}:${sec}`;
  };
  const setLineTime = (lineIdx: number, t: number) => {
    setSyncDraft(prev => {
      const next = [...prev];
      next[lineIdx] = Math.max(0, t);
      return next;
    });
  };
  const resetAuto = () => {
    if (!duration || duration <= 0) return;
    const intro = Math.min(2, duration * 0.05);
    const outro = Math.min(3, duration * 0.05);
    const usable = Math.max(duration - intro - outro, duration * 0.6);
    const step = usable / Math.max(1, lyric.length);
    setSyncDraft(lyric.map((_, i) => intro + i * step));
  };
  const saveSync = () => {
    const updated: Song = { ...current, lyricLineTimings: syncDraft };
    addLocalSong(updated);
    playSong(updated, { alsoSetQueue: false });
    setShowLyricSync(false);
    addToast('对轴已保存 ✦', 'success');
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col"
      style={{ background: `linear-gradient(180deg, #ffffff 0%, ${C.bg} 60%, ${C.bgDeep} 100%)` }}>
      <BokehBg />
      <div className="relative z-10 shizuku-glass-strong"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.3)`, paddingTop: 'var(--safe-top)' }}>
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => setShowLyricSync(false)} className="text-[11px] px-2 py-1 rounded-full" style={{ color: C.muted }}>取消</button>
          <div className="flex items-center gap-1.5">
            <Crosshair size={13} weight="duotone" color={C.primary} />
            <span className="text-[12px] tracking-[0.25em]" style={{ color: C.primary, fontFamily: 'Georgia, serif' }}>歌词对轴</span>
          </div>
          <button onClick={saveSync} className="text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, color: 'white', boxShadow: `0 2px 10px ${C.glow}50` }}>保存</button>
        </div>
      </div>

      <div className="relative z-10 px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, color: 'white', boxShadow: `0 3px 12px ${C.glow}50` }}
          >
            {playing ? <PauseIcon size={14} weight="fill" /> : <PlayIcon size={14} weight="fill" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: C.muted, fontFamily: 'monospace' }}>
              <span style={{ color: C.primary, fontWeight: 600 }}>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
            <div className="h-1 rounded-full shizuku-glass cursor-pointer relative"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div className="absolute top-0 left-0 h-full rounded-full"
                style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.glow})` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={resetAuto} className="text-[10px] underline" style={{ color: C.muted }}>重置为均匀分布</button>
          <p className="text-[10px] flex-1 text-right" style={{ color: C.muted }}>播放时点 ⊙ 把当前时间设给那一句</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 shizuku-scrollbar relative z-10 pt-1">
        {lyric.length === 0 ? (
          <div className="text-center text-[11px] py-12" style={{ color: C.faint }}>没有歌词可对轴</div>
        ) : (
          <div className="space-y-1.5">
            {lyric.map((line, lineIdx) => {
              const t = syncDraft[lineIdx] ?? line.t;
              const isActive = lineIdx === activeLyricIdx;
              return (
                <div key={lineIdx}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all"
                  style={{
                    background: isActive ? `linear-gradient(135deg, ${C.glow}25, ${C.lavender}18)` : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${isActive ? C.glow + '60' : C.faint + '30'}`,
                    boxShadow: isActive ? `0 2px 12px ${C.glow}30` : 'none',
                  }}
                >
                  <span className="text-[9px] tabular-nums w-5 text-center shrink-0" style={{ color: C.faint }}>{lineIdx + 1}</span>
                  <button
                    onClick={() => setLineTime(lineIdx, progress)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
                    style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}30`, color: C.primary }}
                    title="把这一句设到当前播放时间"
                  >
                    ⊙
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] truncate" style={{ color: isActive ? C.primary : C.text, fontWeight: isActive ? 600 : 400 }}>{line.text}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] tabular-nums" style={{ color: C.muted, fontFamily: 'monospace' }}>{fmt(t)}</span>
                      <button onClick={() => setLineTime(lineIdx, t - 0.2)} className="text-[9px] px-1 rounded" style={{ color: C.faint }}>−.2s</button>
                      <button onClick={() => setLineTime(lineIdx, t + 0.2)} className="text-[9px] px-1 rounded" style={{ color: C.faint }}>+.2s</button>
                      <button onClick={() => seek(duration > 0 ? t / duration : 0)} className="text-[9px] px-1 rounded ml-auto" style={{ color: C.accent }}>跳到此处</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
