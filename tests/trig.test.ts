import { describe, expect, it } from 'vitest';
import {
  arcLength,
  clamp,
  degToRad,
  formatPi,
  normalizeDeg,
  normalizeRad,
  quadrantDeg,
  radToDeg,
  referenceAngleDeg,
  sectorArea,
  signsOfDeg,
} from '../src/lib/trig';

describe('angle conversion', () => {
  it('converts degrees and radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 12);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 12);
  });

  it('normalizes degrees into [0, 360)', () => {
    expect(normalizeDeg(370)).toBe(10);
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(720)).toBe(0);
  });

  it('normalizes radians into [0, 2π)', () => {
    expect(normalizeRad(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(normalizeRad(2 * Math.PI)).toBeCloseTo(0, 12);
  });
});

describe('quadrants', () => {
  it('identifies quadrants', () => {
    expect(quadrantDeg(45)).toBe(1);
    expect(quadrantDeg(120)).toBe(2);
    expect(quadrantDeg(200)).toBe(3);
    expect(quadrantDeg(300)).toBe(4);
  });

  it('returns null on axes', () => {
    expect(quadrantDeg(0)).toBeNull();
    expect(quadrantDeg(90)).toBeNull();
    expect(quadrantDeg(180)).toBeNull();
    expect(quadrantDeg(270)).toBeNull();
  });
});

describe('signs of trigonometric functions', () => {
  it('gives correct signs by quadrant', () => {
    expect(signsOfDeg(60)).toEqual({ sin: 1, cos: 1, tan: 1 });
    expect(signsOfDeg(120)).toEqual({ sin: 1, cos: -1, tan: -1 });
    expect(signsOfDeg(210)).toEqual({ sin: -1, cos: -1, tan: 1 });
    expect(signsOfDeg(300)).toEqual({ sin: -1, cos: 1, tan: -1 });
  });

  it('handles axis angles', () => {
    expect(signsOfDeg(90)).toEqual({ sin: 1, cos: 0, tan: 0 });
    expect(signsOfDeg(0)).toEqual({ sin: 0, cos: 1, tan: 0 });
  });
});

describe('sector arc length and area (radians)', () => {
  it('computes s = rθ and S = ½r²θ', () => {
    expect(arcLength(2, Math.PI / 3)).toBeCloseTo((2 * Math.PI) / 3, 12);
    expect(sectorArea(2, Math.PI / 3)).toBeCloseTo((2 * Math.PI) / 3, 12);
  });
});

describe('formatPi', () => {
  it('formats rational multiples of π', () => {
    expect(formatPi(0)).toBe('0');
    expect(formatPi(Math.PI)).toBe('π');
    expect(formatPi(Math.PI / 6)).toBe('π/6');
    expect(formatPi((2 * Math.PI) / 3)).toBe('2π/3');
    expect(formatPi(-Math.PI / 2)).toBe('-π/2');
    expect(formatPi(Math.PI / 4)).toBe('π/4');
  });

  it('returns null for non-rational multiples', () => {
    expect(formatPi(1.234)).toBeNull();
  });
});

describe('reference angles', () => {
  it('returns the acute angle to the x-axis', () => {
    expect(referenceAngleDeg(45)).toBe(45);
    expect(referenceAngleDeg(150)).toBe(30);
    expect(referenceAngleDeg(210)).toBe(30);
    expect(referenceAngleDeg(300)).toBe(60);
  });
});

describe('clamp', () => {
  it('bounds a value', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
