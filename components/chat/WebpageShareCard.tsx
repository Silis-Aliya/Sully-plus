import React from 'react';
import type { ExtractedWebpage } from '../../utils/webpageExtractor';
import { formatStatCount } from '../../utils/videoParser';

interface WebpageShareCardProps {
    webpage: ExtractedWebpage;
}

const WebpageShareCard: React.FC<WebpageShareCardProps> = ({ webpage }) => {
    const video = webpage.video;
    let host = (webpage.siteName || '').trim();
    try {
        host = new URL(webpage.finalUrl || webpage.url).hostname.replace(/^www\./, '');
    } catch {
        /* use siteName fallback */
    }
    const openPage = () => {
        const url = webpage.finalUrl || webpage.url;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };
    const excerpt = (webpage.excerpt || '').trim();
    const videoStats = video ? [
        video.playCount ? `▶ ${formatStatCount(video.playCount)}` : '',
        video.likeCount ? `♥ ${formatStatCount(video.likeCount)}` : '',
        video.commentCount ? `💬 ${formatStatCount(video.commentCount)}` : '',
    ].filter(Boolean) : [];

    return (
        <div
            role="link"
            tabIndex={0}
            onClick={openPage}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPage();
                }
            }}
            className="w-64 bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.05)] cursor-pointer active:opacity-90 transition-opacity"
        >
            {webpage.image && (
                <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                    <img
                        src={webpage.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                            const container = event.currentTarget.parentElement;
                            if (container) container.style.display = 'none';
                        }}
                    />
                    {video && video.contentType !== 'image' && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white translate-x-[1px]"><path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.34-5.89a1.5 1.5 0 0 0 0-2.54L6.3 2.84Z" /></svg>
                            </span>
                        </span>
                    )}
                    {video && video.contentType === 'image' && !!video.imageCount && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/45 text-white text-[9px] font-medium pointer-events-none">
                            图集 · {video.imageCount}张
                        </span>
                    )}
                </div>
            )}
            <div className="p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-slate-400">
                            <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium truncate">{video?.platformLabel || host || '网页'}</span>
                </div>
                <div className="font-semibold text-[15px] text-slate-800 line-clamp-2 leading-snug">{webpage.title || host || '网页'}</div>
                {video ? (
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="text-[10px] text-slate-500 truncate">{video.authorName ? `@${video.authorName}` : ''}</span>
                        {videoStats.length > 0 && (
                            <span className="text-[10px] text-slate-400 shrink-0">{videoStats.join(' · ')}</span>
                        )}
                    </div>
                ) : excerpt ? (
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-1.5">{excerpt}</p>
                ) : (
                    <p className="text-[11px] text-slate-300 mt-1.5">未能提取到正文预览，点开看原网页</p>
                )}
            </div>
        </div>
    );
};

export default WebpageShareCard;
