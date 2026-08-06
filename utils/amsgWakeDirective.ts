import { resolveSendAtMs } from './amsgFireSchedule';

const AMSG_WAKE_AT_RE = /\[\[AMSG_WAKE_AT:\s*([^\]\r\n]+?)\s*\]\]/gi;
const LOCAL_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export interface ParsedAmsgWakeDirective {
  cleanedText: string;
  wakeAtIso?: string;
  invalidValue?: string;
}
/** Parse the first Switch wake marker and hide every marker from user-visible text. */
export function parseAmsgWakeDirective(
  content: string,
  userTimeZone: string,
): ParsedAmsgWakeDirective {
  const values = Array.from(content.matchAll(AMSG_WAKE_AT_RE), (match) => match[1].trim());
  const cleanedText = content.replace(AMSG_WAKE_AT_RE, '').trim();
  const value = values[0];
  if (!value) return { cleanedText };
  if (!LOCAL_DATE_TIME_RE.test(value)) return { cleanedText, invalidValue: value };

  const wakeAtMs = resolveSendAtMs(value, { tzId: userTimeZone });
  if (!Number.isFinite(wakeAtMs)) return { cleanedText, invalidValue: value };
  return { cleanedText, wakeAtIso: new Date(wakeAtMs).toISOString() };
}
