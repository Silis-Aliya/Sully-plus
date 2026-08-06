const asTrimmedString = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const normalizeHttpUrl = (value: unknown): string => {
    const raw = asTrimmedString(value);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^(?:www\.)?(?:xiaohongshu\.com|xhslink\.com)\//i.test(raw)) return `https://${raw}`;
    return '';
};

/** Build the external URL for XHS cards from both current and legacy payload shapes. */
export const getXhsNoteOpenUrl = (note?: Record<string, any> | null): string => {
    if (!note) return '';

    const sourceUrl = normalizeHttpUrl(note.sourceUrl || note.source_url || note.url);
    if (sourceUrl) return sourceUrl;

    const rawNoteId = asTrimmedString(note.noteId || note.note_id || note.id);
    const noteIdUrl = normalizeHttpUrl(rawNoteId);
    if (noteIdUrl) return noteIdUrl;
    if (!rawNoteId) return '';

    const token = asTrimmedString(note.xsecToken || note.xsec_token);
    const encodedId = encodeURIComponent(rawNoteId);
    return `https://www.xiaohongshu.com/explore/${encodedId}${token ? `?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed` : ''}`;
};
