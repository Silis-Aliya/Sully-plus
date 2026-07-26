import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('music together wake scheduling', () => {
  const source = readFileSync(new URL('./musicTogetherWake.ts', import.meta.url), 'utf8');

  it('waits for the exact wake time without a polling interval', () => {
    expect(source).toContain('preciseTimer = setTimeout');
    expect(source).not.toContain('setInterval(');
  });

  it('checks overdue wakes when the page becomes visible or focused', () => {
    expect(source).toContain("document.addEventListener('visibilitychange'");
    expect(source).toContain("window.addEventListener('focus'");
    expect(source).toContain('checkOverdueSchedules();');
  });
});
