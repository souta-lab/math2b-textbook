/**
 * Pure geometry, formatting and axis framing for the 図形と方程式 visuals.
 *
 * Both the Astro server render and the client hydration script call these
 * functions, so the static SVG and the interactive SVG can never drift apart.
 * No DOM access here.
 *
 * Scope: 数学II 図形と方程式 only (coordinate plane, lines, circles, loci,
 * regions). No vectors, matrices or complex plane.
 */
import { scaleLinear } from '../../../lib/graph';

export interface Pt {
  x: number;
  y: number;
}

/** A non-vertical line y = m x + b. */
export interface LineMB {
  m: number;
  b: number;
}

const EPS = 1e-9;

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function fmt(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(dp);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' || trimmed === '' ? '0' : trimmed;
}

/** Signed term for building "y = x + 3" style labels. */
export function signedTerm(value: number): string {
  const sign = value < 0 ? '-' : '+';
  return `${sign} ${fmt(Math.abs(value))}`;
}

export function lineEquationLabel(l: LineMB): string {
  const m = Math.abs(l.m) < EPS ? '' : l.m === 1 ? 'x' : l.m === -1 ? '-x' : `${fmt(l.m)}x`;
  const b = Math.abs(l.b) < EPS;
  if (!m && b) return 'y = 0';
  if (!m) return `y = ${fmt(l.b)}`;
  if (b) return `y = ${m}`;
  return `y = ${m} ${signedTerm(l.b)}`;
}

/** Right-hand side of y = m x + b, e.g. "x + 3" or "-2x". */
export function lineRhs(l: LineMB): string {
  if (Math.abs(l.m) < EPS) return fmt(l.b);
  const mPart = l.m === 1 ? 'x' : l.m === -1 ? '-x' : `${fmt(l.m)}x`;
  if (Math.abs(l.b) < EPS) return mPart;
  return `${mPart} ${signedTerm(l.b)}`;
}

export function inequalityLabel(relation: 'le' | 'ge', l: LineMB, strict = false): string {
  const op = relation === 'le' ? (strict ? '<' : '≤') : strict ? '>' : '≥';
  return `y ${op} ${lineRhs(l)}`;
}

/* ------------------------------------------------------------------ *
 * Segment geometry: distance, midpoint, internal / external division
 * ------------------------------------------------------------------ */

export const distance = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

export const midpoint = (a: Pt, b: Pt): Pt => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Point A + t (B - A). t in [0,1] lies on segment AB; outside is external. */
export function paramPoint(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Internal division point of AB in the ratio m : n (AP : PB = m : n).
 * P = (n A + m B) / (m + n).
 */
export function internalDiv(a: Pt, b: Pt, m: number, n: number): Pt {
  const s = m + n;
  return { x: (n * a.x + m * b.x) / s, y: (n * a.y + m * b.y) / s };
}

/**
 * External division point of AB in the ratio m : n (AP : PB = m : n), with P
 * outside the segment. P = (-n A + m B) / (m - n), m != n.
 */
export function externalDiv(a: Pt, b: Pt, m: number, n: number): Pt {
  const s = m - n;
  return { x: (-n * a.x + m * b.x) / s, y: (-n * a.y + m * b.y) / s };
}

export function divisionT(m: number, n: number, external = false): number {
  return external ? m / (m - n) : m / (m + n);
}

/** Slope of AB, or null when AB is vertical. */
export function slopeOf(a: Pt, b: Pt): number | null {
  const dx = b.x - a.x;
  if (Math.abs(dx) < EPS) return null;
  return (b.y - a.y) / dx;
}

export const perpSlope = (m: number): number => -1 / m;

/** Line through A and B, or null when vertical. */
export function lineThrough(a: Pt, b: Pt): LineMB | null {
  const m = slopeOf(a, b);
  if (m === null) return null;
  return { m, b: a.y - m * a.x };
}

export function parallelThrough(p: Pt, m: number): LineMB {
  return { m, b: p.y - m * p.x };
}

export function perpendicularThrough(p: Pt, m: number): LineMB {
  const pm = perpSlope(m);
  return { m: pm, b: p.y - pm * p.x };
}

/** Intersection of two non-parallel lines, or null when parallel. */
export function intersect(l1: LineMB, l2: LineMB): Pt | null {
  if (Math.abs(l1.m - l2.m) < EPS) return null;
  const x = (l2.b - l1.b) / (l1.m - l2.m);
  return { x, y: l1.m * x + l1.b };
}

export const lineY = (l: LineMB, x: number): number => l.m * x + l.b;

/** Distance from a point to the line y = m x + b. */
export function distancePointToLine(p: Pt, l: LineMB): number {
  return Math.abs(l.m * p.x - p.y + l.b) / Math.hypot(l.m, 1);
}

/**
 * Signed side of the line y = m x + b: positive means the point lies below the
 * line (satisfies y < m x + b), negative means above.
 */
export function regionValue(l: LineMB, p: Pt): number {
  return l.m * p.x + l.b - p.y;
}

/* ------------------------------------------------------------------ *
 * Circles and circle–line position
 * ------------------------------------------------------------------ */

/** From x^2 + y^2 + Dx + Ey + F = 0 to centre and radius. */
export function circleFromGeneral(D: number, E: number, F: number): { center: Pt; r: number } {
  const cx = -D / 2;
  const cy = -E / 2;
  const r2 = cx * cx + cy * cy - F;
  return { center: { x: cx, y: cy }, r: Math.sqrt(Math.max(0, r2)) };
}

export function circleEquationLabel(cx: number, cy: number, r: number): string {
  const xPart = Math.abs(cx) < EPS ? 'x²' : `(x ${cx > 0 ? '-' : '+'} ${fmt(Math.abs(cx))})²`;
  const yPart = Math.abs(cy) < EPS ? 'y²' : `(y ${cy > 0 ? '-' : '+'} ${fmt(Math.abs(cy))})²`;
  return `${xPart} + ${yPart} = ${fmt(r * r)}`;
}

/** Intersection points of a circle with the line y = m x + b (0, 1 or 2). */
export function lineCircleIntersections(center: Pt, r: number, l: LineMB): Pt[] {
  const a = 1 + l.m * l.m;
  const k = l.b - center.y;
  const b = 2 * (l.m * k - center.x);
  const c = center.x * center.x + k * k - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < -EPS) return [];
  if (Math.abs(disc) <= EPS) {
    const x = -b / (2 * a);
    return [{ x, y: l.m * x + l.b }];
  }
  const s = Math.sqrt(disc);
  const x1 = (-b - s) / (2 * a);
  const x2 = (-b + s) / (2 * a);
  return [
    { x: x1, y: l.m * x1 + l.b },
    { x: x2, y: l.m * x2 + l.b },
  ];
}

export type CircleLineKind = 'two' | 'one' | 'none';

/** Position of a line relative to a circle via the centre distance d. */
export function circleLineRelation(
  center: Pt,
  r: number,
  l: LineMB,
): { kind: CircleLineKind; d: number } {
  const d = distancePointToLine(center, l);
  if (d < r - 1e-7) return { kind: 'two', d };
  if (d > r + 1e-7) return { kind: 'none', d };
  return { kind: 'one', d };
}

export function lineCircleDiscriminant(center: Pt, r: number, l: LineMB): number {
  const a = 1 + l.m * l.m;
  const k = l.b - center.y;
  const b = 2 * (l.m * k - center.x);
  const c = center.x * center.x + k * k - r * r;
  return b * b - 4 * a * c;
}

/* ------------------------------------------------------------------ *
 * Axis framing (math coordinates -> SVG screen coordinates)
 * ------------------------------------------------------------------ */

export interface AxisTick {
  pos: number;
  label: string;
}

export interface PlaneFrame {
  width: number;
  height: number;
  pad: { left: number; right: number; top: number; bottom: number };
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  project(p: Pt): Pt;
  invert(s: Pt): Pt;
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  /** Screen x of the y-axis and screen y of the x-axis (edges when off-view). */
  zeroX: number;
  zeroY: number;
}

export const PLANE_GEOM = {
  width: 380,
  height: 300,
  pad: { left: 30, right: 26, top: 20, bottom: 30 },
} as const;

function tickStep(span: number): number {
  if (span <= 6) return 1;
  if (span <= 14) return 2;
  return 5;
}

function integerTicks(min: number, max: number): number[] {
  const step = tickStep(max - min);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + EPS; v += step) {
    out.push(round3(v));
  }
  return out;
}

export function planeFrame(opts: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width?: number;
  height?: number;
  pad?: { left: number; right: number; top: number; bottom: number };
}): PlaneFrame {
  const width = opts.width ?? PLANE_GEOM.width;
  const height = opts.height ?? PLANE_GEOM.height;
  const pad = opts.pad ?? PLANE_GEOM.pad;
  const sx = scaleLinear({ domain: [opts.xMin, opts.xMax], range: [pad.left, width - pad.right] });
  const sy = scaleLinear({
    domain: [opts.yMin, opts.yMax],
    range: [height - pad.bottom, pad.top],
  });
  const project = (p: Pt): Pt => ({ x: round3(sx(p.x)), y: round3(sy(p.y)) });
  const invert = (s: Pt): Pt => ({ x: sx.invert(s.x), y: sy.invert(s.y) });
  const xTicks = integerTicks(opts.xMin, opts.xMax).map((v) => ({ pos: round3(sx(v)), label: String(v) }));
  const yTicks = integerTicks(opts.yMin, opts.yMax).map((v) => ({ pos: round3(sy(v)), label: String(v) }));
  return {
    width,
    height,
    pad,
    xMin: opts.xMin,
    xMax: opts.xMax,
    yMin: opts.yMin,
    yMax: opts.yMax,
    project,
    invert,
    xTicks,
    yTicks,
    zeroX: round3(clamp(sx(0), pad.left, width - pad.right)),
    zeroY: round3(clamp(sy(0), pad.top, height - pad.bottom)),
  };
}
