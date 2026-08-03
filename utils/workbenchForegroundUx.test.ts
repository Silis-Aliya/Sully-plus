import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Workbench foreground UX', () => {
    const workbenchSource = readFileSync(new URL('../apps/WorkbenchApp.tsx', import.meta.url), 'utf8');
    const osContextSource = readFileSync(new URL('../context/OSContext.tsx', import.meta.url), 'utf8');
    const bridgeSource = readFileSync(new URL('./workbenchBridge.ts', import.meta.url), 'utf8');
    const bridgeServerSource = readFileSync(new URL('../scripts/workbench-cli-bridge.mjs', import.meta.url), 'utf8');

    it('closes the emoji panel when the task input receives focus', () => {
        expect(workbenchSource).toContain('onFocus={() => setEmojiPanelOpen(false)}');
    });

    it('shows the background completion toast briefly instead of keeping it on screen', () => {
        expect(osContextSource).toContain(
            "task.status === 'running' || task.status === 'waiting_approval'",
        );
        expect(osContextSource).toContain(
            "addToast('Code 后台任务已完成', 'success', 1500)",
        );
        expect(osContextSource).toContain('durationMs = 3000');
        expect(osContextSource).toContain('}, durationMs)');
    });

    it('clears expired approval cards and cancels approval timers when app-server closes', () => {
        expect(bridgeSource).toContain("notifiedApprovalId && job?.status !== 'waiting_approval'");
        expect(bridgeSource).toContain('args.onApprovalCleared?.()');
        expect(workbenchSource).toContain('onApprovalCleared: () => {');
        expect(bridgeServerSource).toContain('if (item.approval?.timer) clearTimeout(item.approval.timer)');
    });

    it('shows a session-scoped indexed AI assistant panel with activity, approvals, and cancellation', () => {
        expect(workbenchSource).toContain('aria-label="打开 AI 助理运行面板"');
        expect(workbenchSource).toContain('aria-label="AI 助理运行面板"');
        expect(workbenchSource).toContain('aria-label="关闭 AI 助理运行面板"');
        expect(workbenchSource).toContain('codexTask.approvalHistory.slice(-6)');
        expect(workbenchSource).toContain('cancelActiveCodeTask');
        expect(workbenchSource).toContain('formatRunDuration(runClock - codexTask.startedAt)');
        expect(workbenchSource).not.toContain('aria-label="Code 运行状态"');
        expect(bridgeServerSource).toContain("request('turn/interrupt', { threadId: turn.threadId, turnId: turn.turnId })");
        expect(bridgeServerSource).toContain("url.pathname.match(/^\\/jobs\\/([^/]+)\\/cancel$/)");
    });

    it('keeps ordinary Code input and attachments available while one execution is running', () => {
        expect(workbenchSource).toContain('if (!text) return;');
        expect(workbenchSource).toContain('disabled={!input.trim()}');
        expect(workbenchSource).toContain('disabled={fileUploadBusy}');
        expect(workbenchSource).toContain('disabled={characterBusy || !selectedParticipant}');
        expect(workbenchSource).toContain('disabled={codexBusy || !assistantAvailable}');
        expect(workbenchSource).toContain('{characterTask && (');
        expect(workbenchSource).not.toContain('disabled={!input.trim() || busy}');
    });

    it('reloads the persisted Code thread before a character generation starts', () => {
        expect(workbenchSource).toContain(
            "const recent = (await DB.getWorkbenchMessages(s.id, Number.MAX_SAFE_INTEGER)).slice(-80)",
        );
    });

    it('restores the current conversation before the async database refresh finishes', () => {
        expect(workbenchSource).toContain('let workbenchViewSnapshot: WorkbenchViewSnapshot | null = null');
        expect(workbenchSource).toContain(
            'useState<WorkbenchSession | null>(() => workbenchViewSnapshot?.session || null)',
        );
        expect(workbenchSource).toContain(
            'useState<WorkbenchMessage[]>(() => workbenchViewSnapshot?.messages || [])',
        );
        expect(workbenchSource).toContain('if (!conversationHydrated) return');
        expect(workbenchSource).toContain('{conversationHydrated && messages.length === 0 && (');
        expect(workbenchSource).toContain('messages: [...workbenchViewSnapshot.messages, nextMessage]');
    });

    it('refreshes the open Code conversation after a quick-sync database patch', () => {
        expect(workbenchSource).toContain('window.addEventListener(QUICK_SYNC_APPLIED_EVENT, onQuickSyncApplied)');
        expect(workbenchSource).toContain("stores.some(store => store.startsWith('workbench_'))");
        expect(workbenchSource).toContain('void refresh(workbenchViewSnapshot?.session?.id || session?.id)');
    });

    it('marks progress cards that produced Code Memory entries', () => {
        expect(workbenchSource).toContain('const memoryCountBySummaryId = useMemo(() => {');
        expect(workbenchSource).toContain('const memoryCount = memoryCountBySummaryId.get(card.id) || 0');
        expect(workbenchSource).toContain('Memory · {memoryCount}');
    });

    it('keeps progress-card formatting out of ordinary AI assistant replies', () => {
        expect(bridgeServerSource).toContain('普通回复不得生成、续写或模仿“[Code 进度]”格式');
        expect(bridgeSource).toContain("requestKind: 'progress-summary'");
        expect(bridgeServerSource).toContain("body.requestKind === 'progress-summary'");
        expect(bridgeServerSource).toContain('[系统明确任务]');
    });

    it('forwards selected Code records through the normal chat forwarding path', () => {
        expect(workbenchSource).toContain("type: 'chat_forward'");
        expect(workbenchSource).toContain('buildWorkbenchForwardData');
        expect(workbenchSource).toContain('转发 Code 区记录');
        expect(workbenchSource).toContain('条 Code 区记录转发给');
    });
});
