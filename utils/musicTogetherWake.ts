export interface MusicTogetherWakeSchedule {
  charId: string;
  nextWakeAt: number;
  intervalMs: number;
}

type ScheduleMap = Record<string, MusicTogetherWakeSchedule>;

const STORAGE_KEY = 'music_together_wake_schedules_v1';
const MAX_OVERDUE_MS = 10 * 60 * 1000;

function loadSchedules(): ScheduleMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScheduleMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSchedules(schedules: ScheduleMap) {
  if (Object.keys(schedules).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

let triggerCallback: ((charId: string, schedule: MusicTogetherWakeSchedule) => void | Promise<void>) | null = null;
let preciseTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityListener: (() => void) | null = null;
let focusListener: (() => void) | null = null;

function schedulePreciseTimer() {
  if (preciseTimer) {
    clearTimeout(preciseTimer);
    preciseTimer = null;
  }
  if (!triggerCallback) return;

  const schedules = Object.values(loadSchedules());
  if (schedules.length === 0) return;

  const now = Date.now();
  const nextDue = Math.min(...schedules.map(s => s.nextWakeAt));
  const delay = Math.min(Math.max(nextDue - now, 500), 2_147_000_000);
  preciseTimer = setTimeout(() => {
    preciseTimer = null;
    checkOverdueSchedules();
  }, delay);
}

function checkOverdueSchedules() {
  if (!triggerCallback) return;
  const schedules = loadSchedules();
  const now = Date.now();

  for (const schedule of Object.values(schedules)) {
    if (schedule.nextWakeAt > now) continue;
    delete schedules[schedule.charId];
    saveSchedules(schedules);
    if (now - schedule.nextWakeAt > MAX_OVERDUE_MS) continue;
    void triggerCallback(schedule.charId, schedule);
  }

  schedulePreciseTimer();
}

function handleVisibility() {
  if (document.visibilityState !== 'visible') return;
  checkOverdueSchedules();
}

function handleFocus() {
  checkOverdueSchedules();
}

function attachListeners() {
  detachListeners();
  visibilityListener = handleVisibility;
  focusListener = handleFocus;
  document.addEventListener('visibilitychange', visibilityListener);
  window.addEventListener('focus', focusListener);
  schedulePreciseTimer();
}

function detachListeners() {
  if (visibilityListener) {
    document.removeEventListener('visibilitychange', visibilityListener);
    visibilityListener = null;
  }
  if (focusListener) {
    window.removeEventListener('focus', focusListener);
    focusListener = null;
  }
  if (preciseTimer) {
    clearTimeout(preciseTimer);
    preciseTimer = null;
  }
}

export const MusicTogetherWake = {
  onTrigger(callback: (charId: string, schedule: MusicTogetherWakeSchedule) => void | Promise<void>) {
    triggerCallback = callback;
    attachListeners();
    checkOverdueSchedules();
  },

  schedule(charId: string, minutes: number) {
    const intervalMs = minutes * 60 * 1000;
    const schedules = loadSchedules();
    schedules[charId] = {
      charId,
      intervalMs,
      nextWakeAt: Date.now() + intervalMs,
    };
    saveSchedules(schedules);
    attachListeners();
  },

  stop(charId: string) {
    const schedules = loadSchedules();
    delete schedules[charId];
    saveSchedules(schedules);
    if (Object.keys(schedules).length === 0) {
      detachListeners();
    } else {
      schedulePreciseTimer();
    }
  },

  resume() {
    if (Object.keys(loadSchedules()).length === 0) return;
    attachListeners();
    checkOverdueSchedules();
  },

  reconcile(activeCharIds: string[]) {
    const active = new Set(activeCharIds.filter(Boolean));
    const schedules = loadSchedules();
    const now = Date.now();
    let changed = false;
    for (const [charId, schedule] of Object.entries(schedules)) {
      const valid = (
        active.has(charId)
        && schedule?.charId === charId
        && Number.isFinite(schedule.nextWakeAt)
        && Number.isFinite(schedule.intervalMs)
        && schedule.intervalMs > 0
        && schedule.nextWakeAt >= now - MAX_OVERDUE_MS
      );
      if (valid) continue;
      delete schedules[charId];
      changed = true;
    }
    if (changed) saveSchedules(schedules);
    if (Object.keys(schedules).length === 0) {
      detachListeners();
      return;
    }
    attachListeners();
  },

  detach() {
    triggerCallback = null;
    detachListeners();
  },

  getSchedule(charId: string): MusicTogetherWakeSchedule | null {
    return loadSchedules()[charId] || null;
  },

  getSchedules(): MusicTogetherWakeSchedule[] {
    return Object.values(loadSchedules());
  },
};
