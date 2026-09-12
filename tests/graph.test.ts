import { describe, expect, it } from 'vitest';
import {
  arcPath,
  buildFunctionPath,
  buildPolylinePath,
  polarToCartesian,
  sampleFunction,
  scaleLinear,
} from '../src/lib/graph';

describe('scaleLinear', () => {
  it('maps domain to range and inverts', () => {
    const s = scaleLinear({ domain: [0, 10], range: [0, 100] });
    expect(s(0)).toBe(0);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(100);
    expect(s.invert(50)).toBe(5);
  });

  it('handles reversed ranges', () => {
    const s = scaleLinear({ domain: [0, 1], range: [100, 0] });
    expect(s(0)).toBe(100);
    expect(s(1)).toBe(0);
    expect(s(0.5)).toBe(50);
  });

  it('does not divide by zero on a degenerate domain', () => {
    const s = scaleLinear({ domain: [3, 3], range: [0, 100] });
    expect(s(3)).toBe(0);
  });
});

describe('sampleFunction', () => {
  it('returns steps + 1 points including endpoints', () => {
    const pts = sampleFunction((x) => x, { from: 0, to: 4, steps: 4 });
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 4, y: 4 });
  });

  it('samples sin correctly at known points', () => {
    const pts = sampleFunction(Math.sin, { from: 0, to: Math.PI, steps: 2 });
    expect(pts[0].y).toBeCloseTo(0, 12);
    expect(pts[1].y).toBeCloseTo(1, 12);
    expect(pts[2].y).toBeCloseTo(0, 12);
  });
});

describe('buildPolylinePath', () => {
  it('builds M/L commands', () => {
    expect(buildPolylinePath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe('M0 0 L1 1');
  });

  it('returns empty string for no points', () => {
    expect(buildPolylinePath([])).toBe('');
  });
});

describe('buildFunctionPath', () => {
  const xScale = scaleLinear({ domain: [0, Math.PI], range: [0, 100] });
  const yScale = scaleLinear({ domain: [-1, 1], range: [100, 0] });

  it('draws a single continuous subpath for sin', () => {
    const d = buildFunctionPath(Math.sin, {
      from: 0,
      to: Math.PI,
      steps: 8,
      xScale,
      yScale,
    });
    expect(d.startsWith('M')).toBe(true);
    expect(d.match(/M/g)).toHaveLength(1);
  });

  it('breaks the path at tan discontinuities when clipped', () => {
    // Range spans the asymptotes at ±π/2, whose values exceed the clip.
    const d = buildFunctionPath(Math.tan, {
      from: -2,
      to: 2,
      steps: 80,
      xScale: scaleLinear({ domain: [-2, 2], range: [0, 100] }),
      yScale: scaleLinear({ domain: [-5, 5], range: [100, 0] }),
      clipY: [-5, 5],
    });
    expect(d.match(/M/g)?.length ?? 0).toBeGreaterThan(1);
  });
});

describe('polar coordinates for SVG', () => {
  it('flips y so positive angles rise on screen', () => {
    expect(polarToCartesian(0, 0, 1, 0)).toEqual({ x: 1, y: 0 });
    const up = polarToCartesian(0, 0, 1, Math.PI / 2);
    expect(up.x).toBeCloseTo(0, 12);
    // SVG y grows downward, so "above centre" is y = -1.
    expect(up.y).toBe(-1);
  });

  it('builds an arc path', () => {
    const d = arcPath(50, 50, 40, 0, Math.PI / 2);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('A40 40');
  });
});
