import type { Message } from '../types';

const STORAGE_KEY = 'sully.music.migration-ended-notice.v1';

type NoticeMap = Record<string, number>;

const readNotices = (): NoticeMap => {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeNotices = (notices: NoticeMap): void => {
    try {
        if (Object.keys(notices).length === 0) {
            sessionStorage.removeItem(STORAGE_KEY);
        } else {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
        }
    } catch {}
};

export const markMusicMigrationEnded = (charIds: string[]): void => {
    const ids = [...new Set(charIds.filter(Boolean))];
    if (ids.length === 0) return;
    const notices = readNotices();
    const now = Date.now();
    for (const charId of ids) notices[charId] = now;
    writeNotices(notices);
};

export const shouldInjectMusicMigrationEnded = (
    charId: string,
    historyMsgs: Message[],
): boolean => {
    const notices = readNotices();
    const markedAt = Number(notices[charId]);
    if (!Number.isFinite(markedAt) || markedAt <= 0) return false;
    const alreadyAnswered = historyMsgs.some(message =>
        message.role === 'assistant'
        && typeof message.timestamp === 'number'
        && message.timestamp > markedAt,
    );
    if (!alreadyAnswered) return true;
    delete notices[charId];
    writeNotices(notices);
    return false;
};
