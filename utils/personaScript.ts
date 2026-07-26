import type { SimScript } from '../types';

export function normalizePersonaScript(script: SimScript): SimScript {
    if (!Array.isArray(script.beats)) return script;
    for (const beat of script.beats) {
        const app = beat?.app;
        if (!app) continue;
        if (app.chat && !Array.isArray(app.chat.lines)) app.chat.lines = [];
        if (app.search && !Array.isArray(app.search.queries)) app.search.queries = [];
        if (app.notes && !Array.isArray(app.notes.items)) app.notes.items = [];
        if (app.browser && !Array.isArray(app.browser.tabs)) app.browser.tabs = [];
        if (app.compose && !Array.isArray(app.compose.drafts)) app.compose.drafts = [];
    }
    return script;
}

const repairPersonaJson = (source: string): string => {
    let inString = false;
    let escaped = false;
    let output = '';
    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (escaped) {
            output += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            output += char;
            escaped = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            output += char;
            continue;
        }
        if (inString) {
            if (char === '\n') {
                output += '\\n';
                continue;
            }
            if (char === '\r') {
                output += '\\r';
                continue;
            }
            if (char === '\t') {
                output += '\\t';
                continue;
            }
            output += char;
            continue;
        }
        if (char === ',') {
            let next = i + 1;
            while (next < source.length && /\s/.test(source[next])) next++;
            if (source[next] === '}' || source[next] === ']') continue;
        }
        output += char;
    }
    return output;
};

export function parsePersonaScript(raw: string): SimScript | null {
    if (!raw) return null;
    let source = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const first = source.indexOf('{');
    const last = source.lastIndexOf('}');
    if (first === -1 || last === -1) return null;
    source = source.slice(first, last + 1);
    try {
        return normalizePersonaScript(JSON.parse(source));
    } catch {}
    try {
        return normalizePersonaScript(JSON.parse(repairPersonaJson(source)));
    } catch (error) {
        console.warn('persona parse failed', error);
        return null;
    }
}
