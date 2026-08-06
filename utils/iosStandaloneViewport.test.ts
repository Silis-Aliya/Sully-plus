import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveStandaloneAppHeight, selectStandaloneHeightBaseline } from './iosStandalone';

describe('iOS standalone viewport baseline', () => {
  it('does not let a later transient oversized sample poison the app height', () => {
    expect(selectStandaloneHeightBaseline(844, 910)).toBe(844);
  });

  it('accepts the first healthy viewport sample', () => {
    expect(selectStandaloneHeightBaseline(0, 844)).toBe(844);
  });

  it('can explicitly recalibrate after keyboard close or foreground resume', () => {
    expect(selectStandaloneHeightBaseline(910, 844, true)).toBe(844);
  });

  it('ignores transient invalid viewport values', () => {
    expect(selectStandaloneHeightBaseline(844, 0, true)).toBe(844);
    expect(selectStandaloneHeightBaseline(844, Number.NaN, true)).toBe(844);
  });

  it('does not add the home-indicator safe area to the normal app height', () => {
    expect(resolveStandaloneAppHeight(844, 844, false)).toBe(844);
  });

  it('uses the reduced visual viewport while the keyboard is open', () => {
    expect(resolveStandaloneAppHeight(844, 510, true)).toBe(510);
  });

  it('lets self-managed app backgrounds reach the viewport bottom', () => {
    const source = readFileSync(new URL('../components/PhoneShell.tsx', import.meta.url), 'utf8');
    expect(source).toContain(': { bottom: 0 }');
    expect(source).not.toContain(": { bottom: 'var(--standalone-safe-area-bottom, 0px)' }");
  });

  it('repairs a stale keyboard viewport immediately on foreground resume', () => {
    const source = readFileSync(new URL('./iosStandalone.ts', import.meta.url), 'utf8');
    const handler = source.slice(
      source.indexOf('const handleForeground'),
      source.indexOf("window.addEventListener('resize'"),
    );
    expect(handler.indexOf('resetStandaloneHeight();')).toBeGreaterThanOrEqual(0);
    expect(handler.indexOf('resetStandaloneHeight();')).toBeLessThan(handler.indexOf('scheduleViewportRecovery();'));
  });
});
