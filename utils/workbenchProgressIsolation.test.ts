import { describe, expect, it } from 'vitest';
import { stripUnexpectedWorkbenchProgressCard } from './workbenchText';

describe('Workbench progress-card isolation', () => {
    it('removes an unsolicited progress-card tail from an ordinary reply', () => {
        const result = stripUnexpectedWorkbenchProgressCard(`先回答你的问题。

[Code 进度]
作者：Code
任务：测试
状态：进行中
决策：暂无新增
进度：已回复
待办：继续观察
备注：无`);

        expect(result).toBe('先回答你的问题。');
    });

    it('does not remove ordinary discussion that merely mentions a progress card', () => {
        const content = '这里提到了 [Code 进度]，但并没有生成固定格式的卡片。';
        expect(stripUnexpectedWorkbenchProgressCard(content)).toBe(content);
    });

    it('recognizes a markdown-decorated progress-card header', () => {
        const result = stripUnexpectedWorkbenchProgressCard(`正文

**[Code 进度]**
任务：测试
状态：进行中
进度：完成检查`);

        expect(result).toBe('正文');
    });
});
