/**
 * Pure trigonometric helpers shared by visualizations and tests.
 *
 * Conventions:
 *  - Angles are mathematical (counter-clockwise positive).
 *  - `normalizeDeg` returns [0, 360), `normalizeRad` returns [0, 2π).
 *  - `polarToCartesian` (in graph.ts) flips y for SVG screen coordinates.
 */

const TWO_PI = Math.PI * 2;
const EPS = 1e-12;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Normalize degrees into [0, 360). */
export function normalizeDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Normalize radians into [0, 2π). */
export function normalizeRad(rad: number): number {
  const r = rad % TWO_PI;
  return r < 0 ? r + TWO_PI : r;
}

export type Quadrant = 1 | 2 | 3 | 4;

/** Quadrant of an angle in degrees, or null when the angle lies on an axis. */
export function quadrantDeg(deg: number): Quadrant | null {
  const d = normalizeDeg(deg);
  if (Math.abs(d % 90) < EPS || Math.abs((d % 90) - 90) < EPS) return null;
  return (Math.floor(d / 90) + 1) as Quadrant;
}

export function quadrantRad(rad: number): Quadrant | null {
  return quadrantDeg(radToDeg(rad));
}

export type Sign = -1 | 0 | 1;

export interface TrigSigns {
  sin: Sign;
  cos: Sign;
  tan: Sign;
}

/** Signs of sin/cos/tan for an angle in degrees (0 when exactly zero/undefined). */
export function signsOfDeg(deg: number): TrigSigns {
  const rad = degToRad(normalizeDeg(deg));
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const sign = (v: number): Sign => (Math.abs(v) < 1e-9 ? 0 : v > 0 ? 1 : -1);
  return {
    sin: sign(s),
    cos: sign(c),
    tan: Math.abs(c) < 1e-9 ? 0 : sign(s / c),
  };
}

/** Arc length of a sector: s = rθ, θ in radians. */
export const arcLength = (r: number, theta: number): number => r * theta;

/** Area of a sector: S = ½r²θ, θ in radians. */
export const sectorArea = (r: number, theta: number): number => 0.5 * r * r * theta;

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Format a radian angle as a rational multiple of π, e.g. π/6, 2π/3, π, -π/2.
 * Returns null when no fraction with denominator ≤ maxDenominator matches.
 */
export function formatPi(rad: number, maxDenominator = 12): string | null {
  const x = rad / Math.PI;
  for (let den = 1; den <= maxDenominator; den++) {
    const num = x * den;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const n = Math.round(num);
      if (n === 0) return '0';
      const sign = n < 0 ? '-' : '';
      const a = Math.abs(n);
      if (den === 1) return `${sign}${a === 1 ? '' : a}π`;
      const numer = a === 1 ? 'π' : `${a}π`;
      return `${sign}${numer}/${den}`;
    }
  }
  return null;
}

/** Reference (acute) angle in degrees, in [0, 90]. */
export function referenceAngleDeg(deg: number): number {
  const d = normalizeDeg(deg);
  if (d <= 90) return d;
  if (d <= 180) return 180 - d;
  if (d <= 270) return d - 180;
  return 360 - d;
}
