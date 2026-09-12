import { describe, expect, it } from 'vitest';
import {
  CALC_FNS,
  areaFrame,
  averageRate,
  derivativeAt,
  polyAntiderive,
  polyDefiniteIntegral,
  polyDerive,
  polyEval,
  riemannSum,
  tangentFrame,
  tangentLineAt,
} from '../src/components/viz/calculus/calculus-math';

const SQUARE = CALC_FNS.square.coeffs;
const CUBIC_EXTREMA = CALC_FNS['cubic-extrema'].coeffs;

describe('polynomial calculus helpers', () => {
  it('evaluates a polynomial', () => {
    expect(polyEval(SQUARE, 3)).toBe(9);
    expect(polyEval([1, 2, 1], 2)).toBe(9);
  });

  it('differentiates x² to 2x and x³−3x to 3x²−3', () => {
    expect(polyDerive(SQUARE)).toEqual([0, 2]);
    expect(polyDerive(CUBIC_EXTREMA)).toEqual([-3, 0, 3]);
  });

  it('finds the derivative of x² at a point', () => {
    expect(derivativeAt(SQUARE, 3)).toBe(6);
    expect(derivativeAt(SQUARE, -2)).toBe(-4);
    expect(derivativeAt(CUBIC_EXTREMA, 1)).toBe(0);
    expect(derivativeAt(CUBIC_EXTREMA, 0)).toBe(-3);
  });

  it('matches the average rate to the derivative at the midpoint for x²', () => {
    expect(averageRate(SQUARE, 1, 3)).toBe(4);
    expect(averageRate(SQUARE, 1, 3)).toBe(derivativeAt(SQUARE, 2));
  });

  it('builds the tangent line y = 2x − 1 at x = 1', () => {
    expect(tangentLineAt(SQUARE, 1)).toEqual({ slope: 2, intercept: -1 });
  });

  it('integrates x² from 0 to 2 as 8/3', () => {
    expect(polyAntiderive(SQUARE)).toEqual([0, 0, 0, 1 / 3]);
    expect(polyDefiniteIntegral(SQUARE, 0, 2)).toBeCloseTo(8 / 3, 12);
    expect(polyDefiniteIntegral(SQUARE, 1, 2)).toBeCloseTo(7 / 3, 12);
  });

  it('makes the midpoint sum exact for linear polynomials', () => {
    expect(riemannSum([1, 2], 0, 3, 5)).toBeCloseTo(12, 12);
  });

  it('approaches the definite integral as n grows', () => {
    const coarse = riemannSum(SQUARE, 0, 2, 4);
    expect(coarse).toBeCloseTo(2.625, 12);
    expect(riemannSum(SQUARE, 0, 2, 100)).toBeCloseTo(8 / 3, 3);
    expect(riemannSum(SQUARE, 0, 2, 1000)).toBeCloseTo(8 / 3, 5);
  });
});

describe('tangentFrame', () => {
  it('reports the secant slope as the average rate and the tangent slope as f′(a)', () => {
    const frame = tangentFrame(SQUARE, CALC_FNS.square.view, 1, 1);
    expect(frame.values.average).toBe('3');
    expect(frame.values.slope).toBe('2');
    expect(frame.values.isTangent).toBe(false);
    expect(frame.secant).not.toBeNull();
    expect(frame.pointB).not.toBeNull();
  });

  it('collapses the secant into the tangent when h = 0', () => {
    const frame = tangentFrame(SQUARE, CALC_FNS.square.view, 1, 0);
    expect(frame.values.isTangent).toBe(true);
    expect(frame.secant).toBeNull();
    expect(frame.pointB).toBeNull();
    expect(frame.values.average).toBe('—');
    expect(frame.values.slope).toBe('2');
  });

  it('produces tick labels and a curve path', () => {
    const frame = tangentFrame(SQUARE, CALC_FNS.square.view, 0, 1);
    expect(frame.curve.startsWith('M')).toBe(true);
    expect(frame.xTicks.map((t) => t.label)).toContain('0');
    expect(frame.yTicks.map((t) => t.label)).toContain('0');
  });
});

describe('areaFrame', () => {
  it('reports the exact integral and four midpoint rectangles', () => {
    const frame = areaFrame(SQUARE, CALC_FNS.square.view, 0, 2, 4);
    expect(frame.values.exact).toBe('2.667');
    expect(frame.values.approx).toBe('2.625');
    expect(frame.rects).toHaveLength(4);
    expect(frame.region.startsWith('M')).toBe(true);
  });

  it('keeps the region inside the plot and grows with the interval', () => {
    const short = areaFrame(SQUARE, CALC_FNS.square.view, 1, 2, 8);
    const long = areaFrame(SQUARE, CALC_FNS.square.view, 0, 2, 8);
    expect(Number(short.values.exact)).toBeLessThan(Number(long.values.exact));
    for (const rect of long.rects) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThanOrEqual(0);
    }
  });
});
