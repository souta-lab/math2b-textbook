import { describe, expect, it } from 'vitest';
import {
  circleFromGeneral,
  circleLineRelation,
  distance,
  distancePointToLine,
  externalDiv,
  inequalityLabel,
  internalDiv,
  intersect,
  lineCircleIntersections,
  lineEquationLabel,
  lineThrough,
  perpSlope,
  planeFrame,
  regionValue,
  type Pt,
} from '../src/components/viz/coordinate/coordinate-math';

const A: Pt = { x: 1, y: 2 };
const B: Pt = { x: 4, y: 6 };

describe('distance and division of a segment', () => {
  it('computes the distance through the right triangle (3-4-5)', () => {
    expect(distance(A, B)).toBeCloseTo(5, 10);
  });

  it('computes internal division in the ratio m : n', () => {
    const p = internalDiv(A, B, 2, 1);
    expect(p.x).toBeCloseTo(3, 10);
    expect(p.y).toBeCloseTo(14 / 3, 10);
    expect(distance(A, p) / distance(p, B)).toBeCloseTo(2, 10);
  });

  it('computes external division outside the segment', () => {
    const p = externalDiv(A, B, 2, 1);
    expect(p.x).toBeCloseTo(7, 10);
    expect(p.y).toBeCloseTo(10, 10);
    expect(distance(A, p) / distance(p, B)).toBeCloseTo(2, 10);
  });
});

describe('lines', () => {
  it('finds the line through two points', () => {
    const l = lineThrough({ x: -1, y: 3 }, { x: 2, y: 0 });
    expect(l).not.toBeNull();
    expect(l?.m).toBeCloseTo(-1, 10);
    expect(l?.b).toBeCloseTo(2, 10);
  });

  it('returns null for a vertical line through two points', () => {
    expect(lineThrough({ x: 2, y: 1 }, { x: 2, y: 5 })).toBeNull();
  });

  it('uses the negative reciprocal for perpendicular slopes', () => {
    expect(perpSlope(2)).toBeCloseTo(-0.5, 10);
  });

  it('intersects two non-parallel lines and detects parallel lines', () => {
    const p = intersect({ m: 2, b: 1 }, { m: -1, b: 4 });
    expect(p?.x).toBeCloseTo(1, 10);
    expect(p?.y).toBeCloseTo(3, 10);
    expect(intersect({ m: 2, b: 1 }, { m: 2, b: 5 })).toBeNull();
  });

  it('formats line and inequality labels', () => {
    expect(lineEquationLabel({ m: 2, b: 3 })).toBe('y = 2x + 3');
    expect(lineEquationLabel({ m: -1, b: 0 })).toBe('y = -x');
    expect(inequalityLabel('le', { m: -1, b: 3 })).toBe('y ≤ -x + 3');
    expect(inequalityLabel('ge', { m: 1, b: 0 }, true)).toBe('y > x');
  });
});

describe('circles and circle–line position', () => {
  it('recover the centre and radius from the general form', () => {
    const { center, r } = circleFromGeneral(-4, 6, -3);
    expect(center.x).toBeCloseTo(2, 10);
    expect(center.y).toBeCloseTo(-3, 10);
    expect(r).toBeCloseTo(4, 10);
  });

  it('intersects a circle and a line in two points', () => {
    const points = lineCircleIntersections({ x: 0, y: 0 }, 5, { m: 1, b: 1 });
    expect(points).toHaveLength(2);
    const xs = points.map((p) => p.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-4, 10);
    expect(xs[1]).toBeCloseTo(3, 10);
  });

  it('classifies two / one / none by the centre distance', () => {
    expect(circleLineRelation({ x: 0, y: 0 }, 5, { m: 1, b: 1 }).kind).toBe('two');
    expect(circleLineRelation({ x: 0, y: 0 }, 5, { m: 0, b: 5 }).kind).toBe('one');
    expect(circleLineRelation({ x: 0, y: 0 }, 5, { m: 0, b: 6 }).kind).toBe('none');
  });

  it('measures the perpendicular distance to a line', () => {
    expect(distancePointToLine({ x: 0, y: 0 }, { m: 1, b: 1 })).toBeCloseTo(Math.SQRT1_2, 10);
  });
});

describe('regions', () => {
  it('reports the side of a point relative to the boundary', () => {
    expect(regionValue({ m: 1, b: 1 }, { x: 0, y: 0 })).toBeGreaterThan(0);
    expect(regionValue({ m: 1, b: 1 }, { x: 2, y: 5 })).toBeLessThan(0);
  });
});

describe('planeFrame', () => {
  it('projects the origin to the screen axes', () => {
    const frame = planeFrame({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 });
    const o = frame.project({ x: 0, y: 0 });
    expect(o.x).toBeCloseTo(frame.zeroX, 6);
    expect(o.y).toBeCloseTo(frame.zeroY, 6);
  });

  it('round-trips a point through project and invert', () => {
    const frame = planeFrame({ xMin: -4, xMax: 4, yMin: -3, yMax: 5 });
    const p: Pt = { x: 1.5, y: -1.25 };
    const back = frame.invert(frame.project(p));
    expect(back.x).toBeCloseTo(p.x, 2);
    expect(back.y).toBeCloseTo(p.y, 2);
  });
});
