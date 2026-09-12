import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEQUENCE,
  formatNumber,
  sequenceFrame,
  sequenceSum,
  sequenceTerm,
  sequenceValue,
  type SequenceParams,
} from '../src/components/viz/sequences/sequences-math';

const arithmetic: SequenceParams = { kind: 'arithmetic', a: 2, d: 3, r: 2 };
const geometric: SequenceParams = { kind: 'geometric', a: 3, r: 2, d: 0 };

describe('arithmetic sequences', () => {
  it('computes a_n = a + (n-1)d, including the n=1 and far terms', () => {
    expect(sequenceTerm(arithmetic, 1)).toBe(2);
    expect(sequenceTerm(arithmetic, 2)).toBe(5);
    expect(sequenceTerm(arithmetic, 10)).toBe(29);
  });

  it('computes S_n with the pairing formula', () => {
    // 2 + 5 + ... + 29 = (2 + 29) × 10 / 2
    expect(sequenceSum(arithmetic, 10)).toBe(155);
    expect(sequenceSum({ kind: 'arithmetic', a: 1, d: 1, r: 1 }, 100)).toBe(5050);
  });
});

describe('geometric sequences', () => {
  it('computes a_n = a·r^(n-1)', () => {
    expect(sequenceTerm(geometric, 1)).toBe(3);
    expect(sequenceTerm(geometric, 5)).toBe(48);
    expect(sequenceTerm({ kind: 'geometric', a: 1, r: 0.5, d: 0 }, 3)).toBeCloseTo(0.25, 12);
  });

  it('handles a negative ratio without losing signs', () => {
    const p: SequenceParams = { kind: 'geometric', a: 2, r: -3, d: 0 };
    expect([1, 2, 3, 4].map((n) => sequenceTerm(p, n))).toEqual([2, -6, 18, -54]);
    // 2 - 6 + 18 = 14
    expect(sequenceSum(p, 3)).toBe(14);
  });

  it('computes the geometric sum and the r = 1 exception', () => {
    // 3 + 6 + 12 + 24 + 48 = 93
    expect(sequenceSum(geometric, 5)).toBe(93);
    // r = 1 must not divide by zero: S_n = n·a
    expect(sequenceSum({ kind: 'geometric', a: 5, r: 1, d: 0 }, 4)).toBe(20);
    // r = 0 still sums a once
    expect(sequenceSum({ kind: 'geometric', a: 7, r: 0, d: 0 }, 3)).toBe(7);
  });
});

describe('sequenceValue mode switch', () => {
  it('returns the term or the running total for the same index', () => {
    expect(sequenceValue(arithmetic, 'term', 5)).toBe(14);
    expect(sequenceValue(arithmetic, 'sum', 5)).toBe(40);
  });
});

describe('formatNumber', () => {
  it('keeps integers intact and trims decimals', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(0.5)).toBe('0.5');
    expect(formatNumber(1 / 3)).toBe('0.333');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('sequenceFrame', () => {
  it('plots one point per index and marks the current n', () => {
    const frame = sequenceFrame(arithmetic, 10, 10, 'term');
    expect(frame.points).toHaveLength(10);
    expect(frame.marker?.n).toBe(10);
    expect(frame.marker?.value).toBe(29);
    expect(frame.values.term).toBe('29');
    expect(frame.values.sum).toBe('155');
    expect(frame.polyline.startsWith('M')).toBe(true);
    expect(frame.polyline).toContain('L');
    expect(frame.xTicks.map((tick) => tick.label)).toContain('10');
  });

  it('switches the plotted value to the partial sum', () => {
    const frame = sequenceFrame(arithmetic, 10, 4, 'sum');
    expect(frame.marker?.value).toBe(sequenceSum(arithmetic, 4));
    expect(frame.values.symbol).toBe('S');
    expect(frame.values.sum).toBe('26');
  });

  it('clamps n into [1, maxN]', () => {
    expect(sequenceFrame(arithmetic, 8, 99, 'term').values.n).toBe(8);
    expect(sequenceFrame(arithmetic, 8, 0, 'term').values.n).toBe(1);
    expect(sequenceFrame(arithmetic, 8, -3, 'term').values.n).toBe(1);
  });

  it('keeps zero inside the vertical domain and orders the y axis', () => {
    const positive = sequenceFrame(geometric, 8, 3, 'term');
    expect(positive.yLo).toBeLessThanOrEqual(0);
    expect(positive.yHi).toBeGreaterThanOrEqual(128);
    expect(positive.zeroY).toBeGreaterThan(positive.plot.y);

    const mixed = sequenceFrame({ kind: 'geometric', a: 2, r: -3, d: 0 }, 5, 4, 'term');
    expect(mixed.yLo).toBeLessThan(0);
    expect(mixed.yHi).toBeGreaterThan(0);
  });

  it('never produces fewer than two points', () => {
    const frame = sequenceFrame(arithmetic, 1, 1, 'term');
    expect(frame.points).toHaveLength(2);
  });

  it('uses the documented default params', () => {
    expect(DEFAULT_SEQUENCE).toEqual({ kind: 'arithmetic', a: 2, d: 3, r: 2 });
    const frame = sequenceFrame(DEFAULT_SEQUENCE, 5, 5, 'term');
    expect(frame.values.term).toBe('14');
    expect(frame.ariaText).toContain('n = 5');
  });
});
