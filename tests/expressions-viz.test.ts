import { describe, expect, it } from 'vitest';
import {
  discriminant,
  formatCoefficient,
  formatCoefficientRow,
  pascalRow,
  pascalRows,
  sampleParabola,
} from '../src/components/viz/expressions/expressions-math';

describe('pascalRow', () => {
  it('returns rows 0 through 5 with their exact binomial coefficients', () => {
    expect(pascalRow(0)).toEqual([1]);
    expect(pascalRow(1)).toEqual([1, 1]);
    expect(pascalRow(2)).toEqual([1, 2, 1]);
    expect(pascalRow(3)).toEqual([1, 3, 3, 1]);
    expect(pascalRow(4)).toEqual([1, 4, 6, 4, 1]);
    expect(pascalRow(5)).toEqual([1, 5, 10, 10, 5, 1]);
  });

  it('is symmetric: C(n, k) = C(n, n-k)', () => {
    for (let n = 0; n <= 12; n++) {
      const row = pascalRow(n);
      expect(row).toHaveLength(n + 1);
      row.forEach((value, k) => {
        expect(value, `C(${n}, ${k}) ≠ C(${n}, ${n - k})`).toBe(row[n - k]);
      });
    }
  });

  it('sums to 2^n on every row', () => {
    for (let n = 0; n <= 20; n++) {
      const sum = pascalRow(n).reduce((total, value) => total + value, 0);
      expect(sum, `C(${n}, 0) + … + C(${n}, ${n})`).toBe(2 ** n);
    }
  });

  it('returns an empty row for invalid input instead of NaN entries', () => {
    expect(pascalRow(-1)).toEqual([]);
    expect(pascalRow(2.5)).toEqual([]);
    expect(pascalRow(Number.NaN)).toEqual([]);
    expect(pascalRow(Number.POSITIVE_INFINITY)).toEqual([]);
  });
});

describe('pascalRows', () => {
  it('returns rows 0 .. rows-1 exactly', () => {
    expect(pascalRows(6)).toEqual([
      [1],
      [1, 1],
      [1, 2, 1],
      [1, 3, 3, 1],
      [1, 4, 6, 4, 1],
      [1, 5, 10, 10, 5, 1],
    ]);
  });

  it('agrees row by row with pascalRow', () => {
    const triangle = pascalRows(10);
    expect(triangle).toHaveLength(10);
    triangle.forEach((row, n) => {
      expect(row).toEqual(pascalRow(n));
    });
  });

  it('returns an empty triangle for non-positive or non-integer counts', () => {
    expect(pascalRows(0)).toEqual([]);
    expect(pascalRows(-3)).toEqual([]);
    expect(pascalRows(2.5)).toEqual([]);
    expect(pascalRows(Number.NaN)).toEqual([]);
  });
});

describe('formatCoefficient', () => {
  it('renders integer coefficients as plain decimal strings', () => {
    expect(formatCoefficient(1)).toBe('1');
    expect(formatCoefficient(10)).toBe('10');
    expect(formatCoefficient(252)).toBe('252');
  });

  it('guards non-finite input', () => {
    expect(formatCoefficient(Number.NaN)).toBe('—');
    expect(formatCoefficient(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatCoefficientRow', () => {
  it('joins a row for display', () => {
    expect(formatCoefficientRow(pascalRow(3))).toBe('1, 3, 3, 1');
    expect(formatCoefficientRow(pascalRow(5))).toBe('1, 5, 10, 10, 5, 1');
  });
});

describe('discriminant', () => {
  it('computes b² − 4ac for the three lesson cases', () => {
    expect(discriminant(1, -2, -3)).toBe(16);
    expect(discriminant(1, -2, 1)).toBe(0);
    expect(discriminant(1, -2, 3)).toBe(-8);
  });

  it('matches the worked examples in the lesson', () => {
    expect(discriminant(3, -2, 1)).toBe(-8);
    expect(discriminant(1, -4, 4)).toBe(0);
    expect(discriminant(1, -2, 4)).toBe(-12);
    expect(discriminant(2, -6, -4)).toBe(68);
  });

  it('classifies the roots: D > 0 two distinct, D = 0 repeated, D < 0 none', () => {
    const twoRoots = discriminant(1, -2, -3);
    expect(twoRoots).toBeGreaterThan(0);
    expect((-(-2) - Math.sqrt(twoRoots)) / 2).toBe(-1);
    expect((-(-2) + Math.sqrt(twoRoots)) / 2).toBe(3);

    expect(discriminant(1, -2, 1)).toBe(0);
    expect(-(-2) / 2).toBe(1);

    expect(discriminant(1, -2, 3)).toBeLessThan(0);
  });
});

describe('sampleParabola', () => {
  it('returns steps + 1 points spanning the closed interval', () => {
    const points = sampleParabola(1, -2, -3, -1, 3, 4);
    expect(points).toHaveLength(5);
    expect(points.map((point) => point.x)).toEqual([-1, 0, 1, 2, 3]);
    expect(points.map((point) => point.y)).toEqual([0, -3, -4, -3, 0]);
  });

  it('is zero at every root the discriminant predicts', () => {
    const cases: ReadonlyArray<readonly [number, number, number]> = [
      [1, -2, -3],
      [1, -2, 1],
      [1, -2, 3],
      [3, -2, 1],
    ];
    for (const [a, b, c] of cases) {
      const d = discriminant(a, b, c);
      if (d < 0) continue;
      const roots = d === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)];
      for (const root of roots) {
        const [point] = sampleParabola(a, b, c, root, root, 1);
        expect(point.x, `x at root of (${a}, ${b}, ${c})`).toBe(root);
        expect(Math.abs(point.y), `y at root ${root}`).toBeLessThan(1e-9);
      }
    }
  });

  it('samples the vertex value c − b²/(4a)', () => {
    const [point] = sampleParabola(1, -2, 3, 1, 1, 1);
    expect(point.y).toBe(2);
    const [low] = sampleParabola(1, -2, -3, 1, 1, 1);
    expect(low.y).toBe(-4);
  });

  it('falls back to a single segment for invalid step counts without NaN', () => {
    for (const steps of [0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const points = sampleParabola(1, -2, -3, -1, 3, steps);
      expect(points.length, `steps=${steps}`).toBeGreaterThanOrEqual(2);
      expect(points[0]).toEqual({ x: -1, y: 0 });
      expect(points[points.length - 1].x).toBe(3);
      for (const point of points) {
        expect(Number.isFinite(point.y), `steps=${steps} produced NaN`).toBe(true);
      }
    }
  });

  it('treats fractional steps as floor(steps) segments', () => {
    expect(sampleParabola(1, 0, 0, 0, 3, 2.9)).toHaveLength(3);
    expect(sampleParabola(0, 1, 2, 0, 4, 4).map((point) => point.y)).toEqual([2, 3, 4, 5, 6]);
  });
});
