/**
 * Pure mathematics and plot geometry for the 数列 unit visualizations.
 *
 * A single arithmetic / geometric sequence is described by `SequenceParams`.
 * Both the Astro server render and the client hydration script call
 * `sequenceFrame`, so the static SVG and the interactive SVG can never drift
 * apart. No DOM access here.
 */
import { buildPolylinePath, scaleLinear } from '../../../lib/graph';

export type SequenceKind = 'arithmetic' | 'geometric';

/** `term` plots a_n (the term itself); `sum` plots S_n (the running total). */
export type SequenceMode = 'term' | 'sum';

export interface SequenceParams {
  kind: SequenceKind;
  /** First term a_1. */
  a: number;
  /** Common difference d (arithmetic only). */
  d: number;
  /** Common ratio r (geometric only). */
  r: number;
}

export const DEFAULT_SEQUENCE: SequenceParams = { kind: 'arithmetic', a: 2, d: 3, r: 2 };

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function formatNumber(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(Math.max(1, dp));
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' ? '0' : trimmed;
}

/** The n-th term a_n = a + (n-1)d, or a·r^(n-1). */
export function sequenceTerm(p: SequenceParams, n: number): number {
  if (!Number.isFinite(n) || n < 1) return Number.NaN;
  if (p.kind === 'arithmetic') return p.a + (n - 1) * p.d;
  return p.a * Math.pow(p.r, n - 1);
}

/**
 * The partial sum S_n = a_1 + … + a_n.
 * Arithmetic: n(2a + (n-1)d)/2. Geometric: a(1-r^n)/(1-r), and n·a when r = 1.
 */
export function sequenceSum(p: SequenceParams, n: number): number {
  if (!Number.isFinite(n) || n < 1) return Number.NaN;
  if (p.kind === 'arithmetic') return (n * (2 * p.a + (n - 1) * p.d)) / 2;
  if (Math.abs(p.r - 1) < 1e-12) return n * p.a;
  return (p.a * (1 - Math.pow(p.r, n))) / (1 - p.r);
}

/** The value plotted at index n for the chosen mode. */
export function sequenceValue(p: SequenceParams, mode: SequenceMode, n: number): number {
  return mode === 'sum' ? sequenceSum(p, n) : sequenceTerm(p, n);
}

/** Choose a 1 / 2 / 5 × 10^k step covering `span` in roughly `target` ticks. */
function niceStep(span: number, target = 5): number {
  if (!(span > 0)) return 1;
  const raw = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export const SEQUENCE_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 52, right: 20, top: 20, bottom: 36 },
  minCount: 2,
  maxCount: 30,
} as const;

export interface SequencePoint {
  n: number;
  value: number;
  x: number;
  y: number;
}

export interface SequenceFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroY: number;
  yLo: number;
  yHi: number;
  points: SequencePoint[];
  polyline: string;
  marker: SequencePoint | null;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  values: {
    n: number;
    term: string;
    sum: string;
    mode: SequenceMode;
    symbol: 'a' | 'S';
  };
  ariaText: string;
}

/**
 * Project the first `maxN` terms (or partial sums) onto an SVG frame and mark
 * index `n`. `n` is clamped into [1, maxN]; out-of-range input never throws.
 */
export function sequenceFrame(
  p: SequenceParams,
  maxN: number,
  n: number,
  mode: SequenceMode,
): SequenceFrame {
  const { width, height, pad, minCount, maxCount } = SEQUENCE_GEOM;
  const count = Math.max(minCount, Math.min(maxCount, Math.floor(maxN)));
  const current = Math.max(1, Math.min(count, Math.round(n)));

  const raw: { n: number; value: number }[] = [];
  for (let i = 1; i <= count; i++) raw.push({ n: i, value: sequenceValue(p, mode, i) });

  const finite = raw.map((entry) => entry.value).filter((value) => Number.isFinite(value));
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const padY = (hi - lo) * 0.12;
  lo -= padY;
  hi += padY;

  const xScale = scaleLinear({ domain: [0.6, count + 0.4], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [lo, hi], range: [height - pad.bottom, pad.top] });

  const points: SequencePoint[] = raw.map((entry) => ({
    n: entry.n,
    value: entry.value,
    x: round(xScale(entry.n)),
    y: round(yScale(entry.value)),
  }));

  const marker = points[current - 1] ?? null;

  const stepX = count <= 10 ? 1 : Math.ceil(count / 10);
  const xTicks = points
    .filter((point) => (point.n - 1) % stepX === 0 || point.n === count)
    .map((point) => ({ x: point.x, label: String(point.n) }));

  const yStep = niceStep(hi - lo);
  const yTicks: { y: number; label: string }[] = [];
  for (let v = Math.ceil(lo / yStep) * yStep; v <= hi + yStep * 1e-9; v += yStep) {
    yTicks.push({ y: round(yScale(v)), label: formatNumber(v, 3) });
    if (yTicks.length > 12) break;
  }

  const symbol: 'a' | 'S' = mode === 'sum' ? 'S' : 'a';
  const term = formatNumber(sequenceTerm(p, current));
  const sum = formatNumber(sequenceSum(p, current));

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    zeroY: round(yScale(0)),
    yLo: round(lo),
    yHi: round(hi),
    points,
    polyline: buildPolylinePath(points),
    marker,
    xTicks,
    yTicks,
    values: {
      n: current,
      term,
      sum,
      mode,
      symbol,
    },
    ariaText: `n = ${current} のとき、第 n 項 a_n は ${term}、初項から第 n 項までの和 S_n は ${sum}。`,
  };
}
