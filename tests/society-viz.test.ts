import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROWTH,
  PLAN_A,
  PLAN_B,
  PLAN_GEOM,
  formatCount,
  formatNumber,
  growthFrame,
  growthValue,
  planCost,
  planCrossover,
  planFrame,
  type PhonePlan,
} from '../src/components/viz/society/society-math';

const included: PhonePlan = { base: 3000, includedGb: 5, perGb: 500 };

describe('phone plan costs', () => {
  it('adds per-GB charges only above the included amount', () => {
    expect(planCost(included, 0)).toBe(3000);
    expect(planCost(included, 3)).toBe(3000);
    expect(planCost(included, 5)).toBe(3000);
    expect(planCost(included, 8)).toBe(3000 + 3 * 500);
  });

  it('models the flat plan as a constant cost', () => {
    expect(planCost(PLAN_B, 0)).toBe(4700);
    expect(planCost(PLAN_B, 20)).toBe(4700);
  });

  it('computes the lesson scenario exactly', () => {
    // 1500 + 800x = 4700  →  x = 4
    expect(planCost(PLAN_A, 3)).toBe(3900);
    expect(planCost(PLAN_A, 5)).toBe(5500);
    expect(planCrossover(PLAN_A, PLAN_B)).toBe(4);
  });

  it('handles a crossing that happens above an included allowance', () => {
    const flat5000: PhonePlan = { base: 5000, includedGb: 0, perGb: 0 };
    // 3000 (5GB included, +500/GB) equals 5000 at (5000-3000)/500 + 5 = 9 GB.
    expect(planCrossover(included, flat5000)).toBe(9);
    expect(planCrossover(flat5000, included)).toBe(9);
    // Against PLAN_B (flat 4700) the same crossing is at 4700: 8.4 GB.
    expect(planCrossover(included, PLAN_B)).toBe(8.4);
  });

  it('returns null when two plans never cost the same', () => {
    const cheapFlat: PhonePlan = { base: 4000, includedGb: 0, perGb: 0 };
    const dearFlat: PhonePlan = { base: 5000, includedGb: 0, perGb: 0 };
    expect(planCrossover(cheapFlat, dearFlat)).toBeNull();
  });
});

describe('planFrame', () => {
  it('reports both costs and which plan is cheaper', () => {
    const low = planFrame(PLAN_A, PLAN_B, 2, 10);
    expect(low.values.costA).toBe(3100);
    expect(low.values.costB).toBe(4700);
    expect(low.values.cheaper).toBe('A');

    const high = planFrame(PLAN_A, PLAN_B, 6, 10);
    expect(high.values.cheaper).toBe('B');

    const tie = planFrame(PLAN_A, PLAN_B, 4, 10);
    expect(tie.values.cheaper).toBe('tie');
    expect(tie.values.costA).toBe(tie.values.costB);
  });

  it('clamps the usage into the displayed domain', () => {
    expect(planFrame(PLAN_A, PLAN_B, 99, 10).values.usage).toBe(10);
    expect(planFrame(PLAN_A, PLAN_B, -3, 10).values.usage).toBe(0);
  });

  it('marks both plans and the crossover on one frame', () => {
    const frame = planFrame(PLAN_A, PLAN_B, 3, 10);
    expect(frame.markers).toHaveLength(2);
    expect(frame.markers.map((marker) => marker.key)).toEqual(['A', 'B']);
    expect(frame.crossover?.gb).toBe(4);
    expect(frame.xTicks.map((tick) => tick.label)).toContain('10');
    expect(frame.yTicks.map((tick) => tick.label)).toContain('0');
    expect(frame.ariaText).toContain('プランAが安い');
  });

  it('uses the documented default domain', () => {
    expect(PLAN_GEOM.defaultMaxGb).toBe(10);
    const frame = planFrame(PLAN_A, PLAN_B, 3);
    expect(frame.xTicks[frame.xTicks.length - 1]?.label).toBe('10');
  });
});

describe('growthValue', () => {
  it('computes N0·(1+r)^n', () => {
    expect(growthValue(1, 0.2, 0)).toBeCloseTo(1, 12);
    expect(growthValue(1, 0.2, 10)).toBeCloseTo(Math.pow(1.2, 10), 12);
    expect(growthValue(1000, 0.05, 0)).toBe(1000);
    expect(growthValue(1000, 0.05, 1)).toBeCloseTo(1050, 12);
  });
});

describe('growthFrame', () => {
  it('plots one point per step and marks the current year', () => {
    const frame = growthFrame(DEFAULT_GROWTH, 10, 1000);
    expect(frame.main.points).toHaveLength(DEFAULT_GROWTH.maxYear + 1);
    expect(frame.values.year).toBe(10);
    expect(frame.marker?.main).toBeCloseTo(Math.pow(1.2, 10), 9);
    expect(frame.marker?.alt).toBeCloseTo(Math.pow(1.3, 10), 9);
    expect(frame.values.main).toBe(formatCount(Math.pow(1.2, 10)));
    expect(frame.values.ratio).toBe('2.23');
    expect(frame.xTicks.map((tick) => tick.label)).toContain('30');
  });

  it('clamps the year into [0, maxYear]', () => {
    expect(growthFrame(DEFAULT_GROWTH, 99, 0).values.year).toBe(30);
    expect(growthFrame(DEFAULT_GROWTH, -5, 0).values.year).toBe(0);
  });

  it('draws the capacity line only when a cap is given', () => {
    expect(growthFrame(DEFAULT_GROWTH, 10, 0).cap).toBeNull();
    const withCap = growthFrame(DEFAULT_GROWTH, 10, 1000);
    expect(withCap.cap).not.toBeNull();
    expect(withCap.cap?.label).toContain('1,000');
  });

  it('describes the gap between the two rates', () => {
    const frame = growthFrame(DEFAULT_GROWTH, 10, 0);
    expect(frame.ariaText).toContain('増加率 20%');
    expect(frame.ariaText).toContain('約 2.23 倍');
  });
});

describe('number formatting', () => {
  it('rounds counts and trims decimals', () => {
    expect(formatCount(4700)).toBe('4,700');
    expect(formatNumber(0.5)).toBe('0.5');
    expect(formatNumber(1 / 3)).toBe('0.333');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
