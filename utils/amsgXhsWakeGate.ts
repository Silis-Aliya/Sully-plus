export const AMSG_XHS_WAKE_GATE_KEY = 'xhs_wake_gate';
export const AMSG_XHS_WAKE_CHANCE = 0.5;

const AMSG_XHS_DIRECTIVE_RE = /\[\[XHS_(?:SEARCH|BROWSE|DETAIL|SHARE|LIKE|FAV|COMMENT|REPLY|POST|MY_PROFILE)(?::[^\]\r\n]*)?\]\]/gi;

/** A non-eligible autonomous wake must not turn stale XHS syntax into another LLM round. */
export const stripUnavailableAmsgXhsDirectives = (content: string): string =>
  content.replace(AMSG_XHS_DIRECTIVE_RE, '').trim();

const LEGACY_XHS_SECTION_RE = /^\s*\d+\.\s+\*\*(?:📕\s*)?小红书（你的社交账号）\*\*:/;
const LEGACY_XHS_PHONE_SECTION_RE = /^\s*\d+\.\s+\*\*(?:📱\s*)?小红书手机通道（真实手机浏览）\*\*:/;
const NUMBERED_CAPABILITY_RE = /^\s*\d+\.\s+\*\*/;

/** Remove XHS capability blocks baked by older frontends into a Switch fire_pack. */
export const stripLegacySwitchFirePackXhs = (prompt: string): string => {
  const lines = prompt.split('\n');
  const kept: string[] = [];
  let skipping: 'capability' | 'code' | null = null;

  for (const line of lines) {
    if (!skipping && (LEGACY_XHS_SECTION_RE.test(line) || LEGACY_XHS_PHONE_SECTION_RE.test(line))) {
      skipping = 'capability';
      continue;
    }
    if (!skipping && /^###\s+小红书\s*$/.test(line)) {
      skipping = 'code';
      continue;
    }
    if (skipping === 'capability') {
      if (!NUMBERED_CAPABILITY_RE.test(line) && !line.startsWith('（注意：上面角色设定里的')) continue;
      skipping = null;
    } else if (skipping === 'code') {
      if (!/^###\s+/.test(line) && !/^\s*-\s*表情包：/.test(line)) continue;
      skipping = null;
    }

    kept.push(line.replace('联网搜索、逛小红书等能力', '联网搜索等能力'));
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

export interface AmsgXhsWakeGateState {
  v: 1;
  occurrenceMs: number;
  eligible: boolean;
}

export const parseAmsgXhsWakeGateState = (value: string | undefined): AmsgXhsWakeGateState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AmsgXhsWakeGateState>;
    return parsed?.v === 1
      && Number.isFinite(parsed.occurrenceMs)
      && typeof parsed.eligible === 'boolean'
      ? parsed as AmsgXhsWakeGateState
      : null;
  } catch {
    return null;
  }
};

const stableWakeRoll = (charId: string, occurrenceMs: number): number => {
  const input = `${charId}:${occurrenceMs}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
};

export const resolveAmsgXhsWakeGate = (
  previous: AmsgXhsWakeGateState | null,
  charId: string,
  occurrenceMs: number,
  roll = stableWakeRoll(charId, occurrenceMs),
): { eligible: boolean; state: AmsgXhsWakeGateState; reused: boolean } => {
  if (previous?.occurrenceMs === occurrenceMs) {
    return { eligible: previous.eligible, state: previous, reused: true };
  }

  const eligible = previous?.eligible === true
    ? false
    : Math.max(0, Math.min(1, roll)) < AMSG_XHS_WAKE_CHANCE;
  return {
    eligible,
    state: { v: 1, occurrenceMs, eligible },
    reused: false,
  };
};
