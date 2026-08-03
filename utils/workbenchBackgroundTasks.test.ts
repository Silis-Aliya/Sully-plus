import { describe, expect, it, vi } from 'vitest';
import {
    getRunningWorkbenchTask,
    runWorkbenchBackgroundTask,
    setWorkbenchBackgroundApproval,
    subscribeWorkbenchBackgroundTasks,
    updateWorkbenchBackgroundProgress,
} from './workbenchBackgroundTasks';

describe('workbench background tasks', () => {
    it('keeps a task discoverable until its runner finishes', async () => {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const events: string[] = [];
        const unsubscribe = subscribeWorkbenchBackgroundTasks(task => events.push(task.status));

        const running = runWorkbenchBackgroundTask('session-a', 'codex', async () => {
            await gate;
            return 'done';
        });

        expect(getRunningWorkbenchTask('session-a')?.speaker).toBe('codex');
        release();
        await expect(running).resolves.toBe('done');
        expect(getRunningWorkbenchTask('session-a')).toBeNull();
        expect(events).toEqual(['running', 'done']);
        unsubscribe();
        vi.clearAllTimers();
    });

    it('keeps bridge activity, approval history, and cancel bound to the current session', async () => {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const cancel = vi.fn(async () => {});
        const running = runWorkbenchBackgroundTask('session-progress', 'codex', async () => {
            await gate;
        });

        updateWorkbenchBackgroundProgress('session-progress', {
            jobId: 'job-1',
            status: 'running',
            phase: 'command',
            activity: '正在执行命令',
            activityDetail: 'pnpm build',
            lastActivityAt: 123,
            approvalHistory: [{
                id: 'approval-1',
                kind: 'command',
                summary: 'pnpm build',
                decision: 'accept',
                decidedAt: 122,
            }],
        }, cancel);

        const snapshot = getRunningWorkbenchTask('session-progress');
        expect(snapshot).toMatchObject({
            phase: 'command',
            activity: '正在执行命令',
            activityDetail: 'pnpm build',
            lastActivityAt: 123,
        });
        expect(snapshot?.approvalHistory).toHaveLength(1);
        await snapshot?.cancel?.();
        expect(cancel).toHaveBeenCalledOnce();

        release();
        await running;
    });

    it('reports an interrupted bridge turn as cancelled instead of failed', async () => {
        const events: string[] = [];
        const unsubscribe = subscribeWorkbenchBackgroundTasks(task => {
            if (task.sessionId === 'session-cancelled') events.push(task.status);
        });
        const cancelledError = Object.assign(new Error('cancelled'), { code: 'WORKBENCH_CANCELLED' });

        await expect(runWorkbenchBackgroundTask('session-cancelled', 'codex', async () => {
            throw cancelledError;
        })).rejects.toBe(cancelledError);

        expect(events).toEqual(['running', 'cancelled']);
        unsubscribe();
    });

    it('does not leave cancelling state when an approval prompt is cleared', async () => {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const running = runWorkbenchBackgroundTask('session-cancelling', 'codex', async () => {
            await gate;
        });

        updateWorkbenchBackgroundProgress('session-cancelling', {
            jobId: 'job-cancelling',
            status: 'cancelling',
            phase: 'cancelling',
            activity: '正在取消任务',
            approvalHistory: [],
        }, async () => {});
        setWorkbenchBackgroundApproval('session-cancelling', null);

        expect(getRunningWorkbenchTask('session-cancelling')?.status).toBe('cancelling');
        release();
        await running;
    });

    it('allows one Codex task and one character reply to run in parallel', async () => {
        let releaseCodex!: () => void;
        let releaseCharacter!: () => void;
        const codexGate = new Promise<void>(resolve => { releaseCodex = resolve; });
        const characterGate = new Promise<void>(resolve => { releaseCharacter = resolve; });

        const codexRun = runWorkbenchBackgroundTask('parallel-session', 'codex', () => codexGate);
        const characterRun = runWorkbenchBackgroundTask('parallel-session', 'character', () => characterGate);

        expect(getRunningWorkbenchTask('parallel-session', 'codex')?.speaker).toBe('codex');
        expect(getRunningWorkbenchTask('parallel-session', 'character')?.speaker).toBe('character');
        await expect(runWorkbenchBackgroundTask('parallel-session', 'codex', async () => {}))
            .rejects.toThrow('已有 AI 助理任务');
        await expect(runWorkbenchBackgroundTask('parallel-session', 'character', async () => {}))
            .rejects.toThrow('角色仍在生成');

        releaseCodex();
        releaseCharacter();
        await Promise.all([codexRun, characterRun]);
    });
});
