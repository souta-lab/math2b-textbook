import { describe, expect, it } from 'vitest';
import {
  binomialCoefficient,
  binomialFrame,
  binomialMean,
  binomialPmf,
  binomialSd,
  binomialVariance,
  confidenceFrame,
  confidenceInterval,
  erf,
  histogram,
  histogramFrame,
  mean,
  normalBetween,
  normalCdf,
  normalFrame,
  normalPdf,
  standardDeviation,
  standardNormalCdf,
  standardNormalQuantile,
  variance,
  zCritical,
  zScore,
} from '../src/components/viz/statistics/statistics-math';

const SQRT_2PI = Math.sqrt(2 * Math.PI);

describe('normal distribution', () => {
  it('peaks at the mean with height 1/(σ√(2π))', () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(1 / SQRT_2PI, 12);
    expect(normalPdf(5, 5, 2)).toBeCloseTo(1 / (2 * SQRT_2PI), 12);
    expect(normalPdf(0, 0, 1)).toBeGreaterThan(normalPdf(1, 0, 1));
  });

  it('is symmetric about the mean', () => {
    expect(normalPdf(-1, 0, 1)).toBeCloseTo(normalPdf(1, 0, 1), 12);
    expect(normalPdf(170 - 3, 170, 5)).toBeCloseTo(normalPdf(170 + 3, 170, 5), 12);
  });

  it('computes the standard normal CDF at the table values', () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 7);
    expect(standardNormalCdf(1)).toBeCloseTo(0.8413447, 5);
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.9750021, 5);
    expect(standardNormalCdf(-1.96)).toBeCloseTo(0.0249979, 5);
    // symmetry Φ(z) + Φ(−z) = 1
    expect(standardNormalCdf(1.3) + standardNormalCdf(-1.3)).toBeCloseTo(1, 7);
  });

  it('shifts and scales via μ and σ', () => {
    expect(normalCdf(170, 170, 5)).toBeCloseTo(0.5, 7);
    // 185 is 3σ above 170
    expect(zScore(185, 170, 5)).toBe(3);
    expect(normalCdf(185, 170, 5)).toBeCloseTo(normalCdf(3), 7);
  });

  it('integrates to the familiar 68–95–99.7 areas', () => {
    expect(normalBetween(-1, 1)).toBeCloseTo(0.6826895, 4);
    expect(normalBetween(-2, 2)).toBeCloseTo(0.9544997, 4);
    expect(normalBetween(-3, 3)).toBeCloseTo(0.9973002, 4);
  });

  it('inverts the CDF (quantiles) to the standard table values', () => {
    expect(standardNormalQuantile(0.5)).toBeCloseTo(0, 9);
    expect(standardNormalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(standardNormalQuantile(0.95)).toBeCloseTo(1.644854, 5);
    expect(standardNormalQuantile(0.975) + standardNormalQuantile(0.025)).toBeCloseTo(0, 9);
  });

  it('erf is odd and bounded', () => {
    expect(erf(0)).toBe(0);
    expect(erf(-1)).toBeCloseTo(-erf(1), 9);
    expect(erf(3)).toBeCloseTo(0.9999779, 6);
  });
});

describe('descriptive statistics', () => {
  it('computes mean, variance and standard deviation', () => {
    const data = [1, 2, 3, 4, 5];
    expect(mean(data)).toBe(3);
    expect(variance(data)).toBe(2);
    expect(standardDeviation(data)).toBeCloseTo(Math.sqrt(2), 12);
  });

  it('switches between population and sample variance', () => {
    const data = [1, 2, 3, 4, 5];
    expect(variance(data, true)).toBeCloseTo(2.5, 12);
    expect(variance(data)).toBeCloseTo(2, 12);
  });

  it('bins values into a histogram that preserves the total count', () => {
    const bins = histogram([1, 2, 2, 3, 3, 3, 4], 4);
    expect(bins).toHaveLength(4);
    expect(bins.map((b) => b.count)).toEqual([1, 2, 3, 1]);
    expect(bins.reduce((acc, b) => acc + b.count, 0)).toBe(7);
  });

  it('builds a histogram frame with mean and sd markers', () => {
    const frame = histogramFrame([1, 2, 2, 3, 3, 3, 4], 4, { mean: true, sd: true });
    expect(frame.bars).toHaveLength(4);
    expect(frame.stats.n).toBe(7);
    expect(frame.stats.mean).toBe('2.57');
    expect(frame.meanLine).not.toBeNull();
    expect(frame.sdBand).not.toBeNull();
  });
});

describe('binomial distribution', () => {
  it('computes the binomial coefficient', () => {
    expect(binomialCoefficient(10, 5)).toBeCloseTo(252, 6);
    expect(binomialCoefficient(5, 0)).toBe(1);
    expect(binomialCoefficient(5, 6)).toBe(0);
  });

  it('matches hand-computed probabilities and sums to 1', () => {
    expect(binomialPmf(10, 5, 0.5)).toBeCloseTo(0.24609375, 10);
    let total = 0;
    for (let k = 0; k <= 10; k++) total += binomialPmf(10, k, 0.3);
    expect(total).toBeCloseTo(1, 9);
    // symmetry when p = 1/2
    expect(binomialPmf(10, 3, 0.5)).toBeCloseTo(binomialPmf(10, 7, 0.5), 12);
  });

  it('gives the mean and variance np and np(1−p)', () => {
    expect(binomialMean(10, 0.5)).toBe(5);
    expect(binomialVariance(10, 0.5)).toBe(2.5);
    expect(binomialSd(10, 0.5)).toBeCloseTo(Math.sqrt(2.5), 12);
    expect(binomialMean(5, 1 / 6)).toBeCloseTo(5 / 6, 12);
    expect(binomialVariance(5, 1 / 6)).toBeCloseTo(25 / 36, 12);
  });

  it('builds n+1 bars with a mean line and σ band', () => {
    const frame = binomialFrame(10, 0.5, 5);
    expect(frame.bars).toHaveLength(11);
    expect(frame.meanLabel).toContain('5');
    expect(frame.sdBand).not.toBeNull();
    expect(frame.values.sd).toBe('1.58');
    expect(frame.highlightP).toBe('24.61');
  });
});

describe('confidence intervals', () => {
  it('uses the two-sided critical value for the level', () => {
    expect(zCritical(0.95)).toBeCloseTo(1.959964, 5);
    expect(zCritical(0.99)).toBeCloseTo(2.575829, 5);
  });

  it('halves the interval as n quadruples', () => {
    const a = confidenceInterval(52, 10, 100, 0.95);
    const b = confidenceInterval(52, 10, 400, 0.95);
    expect(a.halfWidth).toBeCloseTo(1.959964, 5);
    expect(b.halfWidth).toBeCloseTo(a.halfWidth / 2, 8);
    expect(a.lo).toBeCloseTo(50.040036, 4);
    expect(a.hi).toBeCloseTo(53.959964, 4);
  });

  it('draws one interval per sample and reports coverage', () => {
    const frame = confidenceFrame({ mu: 50, sigma: 10, n: 16, level: 0.95, count: 20, seed: 7 });
    expect(frame.intervals).toHaveLength(20);
    expect(frame.covered).toBeGreaterThanOrEqual(0);
    expect(frame.covered).toBeLessThanOrEqual(20);
    expect(frame.muX).toBeGreaterThan(frame.plot.x);
    expect(frame.ariaText).toContain('真の平均');
  });
});

describe('normal frames', () => {
  it('draws a curve and shades the requested area', () => {
    const left = normalFrame({ shade: 'left', a: 0 });
    expect(left.curve.startsWith('M')).toBe(true);
    expect(left.shadePaths).toHaveLength(1);
    expect(left.probability).toBeCloseTo(0.5, 6);

    const between = normalFrame({ shade: 'between', a: -1.96, b: 1.96 });
    expect(between.probability).toBeCloseTo(0.95, 3);

    const both = normalFrame({ shade: 'both', a: 1.96 });
    expect(both.shadePaths).toHaveLength(2);
    expect(both.probability).toBeCloseTo(0.05, 3);
  });

  it('places the marker on the curve and marks ±1σ', () => {
    const frame = normalFrame({ shade: 'left', a: 1, marker: 1 });
    expect(frame.marker).not.toBeNull();
    expect(frame.marker?.value).toBe(1);
    expect(frame.sdMarks).toHaveLength(2);
  });
});
