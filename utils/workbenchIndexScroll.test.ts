import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Workbench index resize scroll continuity', () => {
  const source = readFileSync(new URL('../apps/WorkbenchApp.tsx', import.meta.url), 'utf8');

  it('pins a conversation that was already near the bottom during index resize', () => {
    expect(source).toContain('pinBottomAfterIndexResizeRef.current = !container');
    expect(source).toContain('container.scrollHeight - container.scrollTop - container.clientHeight < 80');
    expect(source).toContain('container.scrollTop = container.scrollHeight');
    expect(source).toContain('window.setTimeout(pinToBottom, 240)');
  });

  it('does not use the raw index toggle without capturing scroll position', () => {
    expect(source).toContain('onClick={toggleWorkbenchIndex}');
    expect(source).not.toContain('onClick={() => setIndexOpen(prev => !prev)}');
  });
});
