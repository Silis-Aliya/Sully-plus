import type {
    WorkbenchBridgeApproval,
    WorkbenchBridgeApprovalDecision,
    WorkbenchBridgeApprovalRecord,
    WorkbenchBridgeJobProgress,
} from './workbenchBridge';
import { isWorkbenchTaskCancelledError } from './workbenchBridge';

export type WorkbenchBackgroundSpeaker = 'codex' | 'character';
export type WorkbenchBackgroundStatus = 'running' | 'waiting_approval' | 'cancelling' | 'done' | 'cancelled' | 'error';

export interface WorkbenchBackgroundTaskSnapshot {
    id: string;
    sessionId: string;
    speaker: WorkbenchBackgroundSpeaker;
    status: WorkbenchBackgroundStatus;
    startedAt: number;
    finishedAt?: number;
    error?: string;
    phase?: string;
    activity?: string;
    activityDetail?: string;
    lastActivityAt?: number;
    approvalHistory?: WorkbenchBridgeApprovalRecord[];
    cancel?: () => Promise<void>;
    approval?: {
        request: WorkbenchBridgeApproval;
        decide: (decision: WorkbenchBridgeApprovalDecision) => Promise<void>;
        submitting: boolean;
    };
}

type Listener = (snapshot: WorkbenchBackgroundTaskSnapshot) => void;

const tasks = new Map<string, WorkbenchBackgroundTaskSnapshot>();
const listeners = new Set<Listener>();
let activeWorkbenchSessionId: string | null = null;

export const setActiveWorkbenchSessionSnapshot = (sessionId: string | null) => {
    activeWorkbenchSessionId = sessionId;
};

export const getActiveWorkbenchSessionSnapshot = () => activeWorkbenchSessionId;

const emit = (snapshot: WorkbenchBackgroundTaskSnapshot) => {
    listeners.forEach(listener => listener({ ...snapshot }));
};

export const getRunningWorkbenchTask = (
    sessionId?: string | null,
    speaker?: WorkbenchBackgroundSpeaker,
) => {
    if (!sessionId) return null;
    return Array.from(tasks.values()).find(task => (
        task.sessionId === sessionId
        && (!speaker || task.speaker === speaker)
        && (task.status === 'running' || task.status === 'waiting_approval' || task.status === 'cancelling')
    )) || null;
};

export const subscribeWorkbenchBackgroundTasks = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const setWorkbenchBackgroundApproval = (
    sessionId: string,
    approval: WorkbenchBackgroundTaskSnapshot['approval'] | null,
) => {
    const task = getRunningWorkbenchTask(sessionId, 'codex');
    if (!task) return;
    task.approval = approval || undefined;
    if (task.status !== 'cancelling') {
        task.status = approval ? 'waiting_approval' : 'running';
    }
    emit(task);
};

export const updateWorkbenchBackgroundProgress = (
    sessionId: string,
    progress: WorkbenchBridgeJobProgress,
    cancel: () => Promise<void>,
) => {
    const task = getRunningWorkbenchTask(sessionId, 'codex');
    if (!task) return;
    task.status = progress.status;
    task.phase = progress.phase;
    task.activity = progress.activity;
    task.activityDetail = progress.activityDetail;
    task.lastActivityAt = progress.lastActivityAt;
    task.approvalHistory = progress.approvalHistory;
    task.cancel = cancel;
    emit(task);
};

export const runWorkbenchBackgroundTask = async <T>(
    sessionId: string,
    speaker: WorkbenchBackgroundSpeaker,
    runner: () => Promise<T>,
): Promise<T> => {
    if (getRunningWorkbenchTask(sessionId, speaker)) {
        throw new Error(speaker === 'codex' ? '当前 Code 对话已有 AI 助理任务正在运行' : '当前角色仍在生成回复');
    }

    const snapshot: WorkbenchBackgroundTaskSnapshot = {
        id: `workbench_task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        speaker,
        status: 'running',
        startedAt: Date.now(),
        activity: speaker === 'codex' ? '正在连接 Code 助理' : '正在等待角色回应',
        lastActivityAt: Date.now(),
        approvalHistory: [],
    };
    tasks.set(snapshot.id, snapshot);
    emit(snapshot);

    try {
        const result = await runner();
        snapshot.status = 'done';
        snapshot.finishedAt = Date.now();
        emit(snapshot);
        return result;
    } catch (error: any) {
        snapshot.status = isWorkbenchTaskCancelledError(error) ? 'cancelled' : 'error';
        snapshot.finishedAt = Date.now();
        snapshot.error = error?.message || '后台回复失败';
        emit(snapshot);
        throw error;
    } finally {
        const cleanupTimer = globalThis.setTimeout(() => tasks.delete(snapshot.id), 5 * 60_000);
        (cleanupTimer as any)?.unref?.();
    }
};
