import { describe, expect, it } from 'vitest';
import {
  EXP_GRAPH_GEOM,
  expLogFrame,
  expValue,
  isValidBase,
  logValue,
  reflectionCursorRange,
  reflectionFrame,
  reflectionPair,
} from '../src/components/viz/exponential/expo-math';

describe('exponential / logarithm values', () => {
  it('extends exponents to 0, negative and rational powers', () => {
    expect(expValue(2, 0)).toBe(1);
    expect(expValue(2, -3)).toBeCloseTo(1 / 8, 12);
    expect(expValue(2, 0.5)).toBeCloseTo(Math.SQRT2, 12);
    expect(expValue(8, 2 / 3)).toBeCloseTo(4, 12);
  });

  it('computes logarithms as the inverse power', () => {
    expect(logValue(2, 8)).toBeCloseTo(3, 12);
    expect(logValue(10, 0.01)).toBeCloseTo(-2, 12);
    expect(logValue(3, Math.sqrt(3))).toBeCloseTo(0.5, 12);
    expect(logValue(2, 1)).toBe(0);
  });

  it('rejects bases and arguments outside the real domain', () => {
    expect(logValue(2, 0)).toBeNaN();
    expect(logValue(2, -1)).toBeNaN();
    expect(isValidBase(1)).toBe(false);
    expect(isValidBase(0)).toBe(false);
    expect(isValidBase(-2)).toBe(false);
    expect(isValidBase(2)).toBe(true);
  });
});

describe('inverse reflection', () => {
  it('mirrors (t, a^t) to (a^t, t)', () => {
    const pair = reflectionPair(2, 1.5);
    expect(pair.onExp.x).toBe(1.5);
    expect(pair.onExp.y).toBeCloseTo(2 ** 1.5, 12);
    expect(pair.onLog.x).toBeCloseTo(pair.onExp.y, 12);
    expect(pair.onLog.y).toBe(1.5);
  });

  it('satisfies log_a(a^t) = t', () => {
    const a = 2;
    const t = 1.2;
    expect(logValue(a, expValue(a, t))).toBeCloseTo(t, 12);
  });

  it('keeps the cursor range inside the plot window', () => {
    for (const a of [0.5, 2, 3]) {
      const [lo, hi] = reflectionCursorRange(a);
      expect(lo).toBeLessThan(0);
      expect(hi).toBeGreaterThan(0);
      expect(expValue(a, hi)).toBeLessThanOrEqual(EXP_GRAPH_GEOM.yMax + 1e-9);
      expect(expValue(a, -hi)).toBeLessThanOrEqual(EXP_GRAPH_GEOM.yMax + 1e-9);
    }
  });
});

describe('graph frames', () => {
  it('draws the exponential curve through (0,1) and the anchor (1,a)', () => {
    const frame = expLogFrame('exp', 2);
    expect(frame.valid).toBe(true);
    expect(frame.curve.startsWith('M')).toBe(true);
    expect(frame.keyPoint).not.toBeNull();
    expect(frame.values.keyPoint).toBe('(1, 2)');
  });

  it('samples the logarithm only at x > 0', () => {
    const frame = expLogFrame('log', 2);
    expect(frame.valid).toBe(true);
    const first = /M\s*(-?[\d.]+)/.exec(frame.curve);
    expect(first).not.toBeNull();
    expect(Number(first?.[1])).toBeGreaterThan(frame.zeroX);
    expect(frame.asymptote.x1).toBe(frame.zeroX);
  });

  it('drops the curve for the forbidden base a = 1', () => {
    const frame = expLogFrame('exp', 1);
    expect(frame.valid).toBe(false);
    expect(frame.curve).toBe('');
    expect(frame.values.f).toBe('—');
  });

  it('draws both curves and the mirror line in the reflection frame', () => {
    const frame = reflectionFrame(2, 1);
    expect(frame.expCurve.length).toBeGreaterThan(0);
    expect(frame.logCurve.length).toBeGreaterThan(0);
    expect(frame.diagonal.x2).toBeGreaterThan(frame.diagonal.x1);
    expect(frame.mirrorSegment).not.toBeNull();
  });
});
