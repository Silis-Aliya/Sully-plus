import { describe, expect, it } from 'vitest';
import { selectStandaloneHeightBaseline } from './iosStandalone';

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
});
