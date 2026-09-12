/**
 * Pure mathematics + plot geometry for the 数学B「統計的な推測」unit.
 *
 * Every number the visualizations show (probabilities, means, standard
 * deviations, confidence intervals) is produced here, by plain functions with
 * no DOM access. The Astro server render and the client hydration scripts call
 * the same `*Frame` builders, so the static SVG and the interactive SVG can
 * never drift apart.
 *
 * Numerical honesty: the standard normal CDF uses the Abramowitz–Stegun
 * 7.1.26 erf approximation (absolute error < 1.5e-7) and the quantile uses
 * Acklam's rational approximation (relative error ~1e-9). Both are far more
 * precise than the four-figure tables used in the lessons, so displayed values
 * agree with the tables while staying honest about being approximations.
 */
import { buildFunctionPath, sampleFunction, scaleLinear } from '../../../lib/graph';

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function fmtStat(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(dp);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' ? '0' : trimmed;
}

/** Choose a 1 / 2 / 5 × 10^k step covering `span` in roughly `target` ticks. */
export function niceStep(span: number, target = 5): number {
  if (!(span > 0)) return 1;
  const raw = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/* ------------------------------------------------------------------ *
 * Descriptive statistics (数学I データの分析の復習 / 標本の要約)
 * ------------------------------------------------------------------ */

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** Population variance by default; pass `sample = true` for the n−1 version. */
export function variance(values: number[], sample = false): number {
  const n = values.length;
  if (n === 0) return Number.NaN;
  if (sample && n < 2) return Number.NaN;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return ss / (sample ? n - 1 : n);
}

export function standardDeviation(values: number[], sample = false): number {
  return Math.sqrt(variance(values, sample));
}

/* ------------------------------------------------------------------ *
 * Binomial distribution
 * ------------------------------------------------------------------ */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Lanczos log-gamma, accurate to ~15 significant digits for positive reals. */
export function logGamma(x: number): number {
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = 0.99999999999980993;
  const t = z + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (z + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

export function logFactorial(n: number): number {
  if (n < 0) return Number.NaN;
  return logGamma(n + 1);
}

export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const value = Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k));
  const nearest = Math.round(value);
  return Math.abs(value - nearest) < 1e-6 ? nearest : value;
}

/** P(X = k) for X ~ B(n, p). */
export function binomialPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logC = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function binomialMean(n: number, p: number): number {
  return n * p;
}

export function binomialVariance(n: number, p: number): number {
  return n * p * (1 - p);
}

export function binomialSd(n: number, p: number): number {
  return Math.sqrt(binomialVariance(n, p));
}

/* ------------------------------------------------------------------ *
 * Normal distribution
 * ------------------------------------------------------------------ */

export function normalPdf(x: number, mu = 0, sd = 1): number {
  if (!(sd > 0)) return Number.NaN;
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** erf via Abramowitz–Stegun 7.1.26 (max error ~1.5e-7). */
export function erf(x: number): number {
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592);
  const y = 1 - poly * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number, mu = 0, sd = 1): number {
  if (!(sd > 0)) return Number.NaN;
  return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
}

export function standardNormalCdf(z: number): number {
  return normalCdf(z, 0, 1);
}

/** Inverse standard normal CDF via Acklam's rational approximation. */
export function standardNormalQuantile(p: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  let r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  q = p - 0.5;
  r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** Standardize x: z = (x − μ) / σ. */
export function zScore(x: number, mu = 0, sd = 1): number {
  if (!(sd > 0)) return Number.NaN;
  return (x - mu) / sd;
}

/** P(a ≤ X ≤ b) for X ~ N(μ, σ²). */
export function normalBetween(a: number, b: number, mu = 0, sd = 1): number {
  return normalCdf(b, mu, sd) - normalCdf(a, mu, sd);
}

/** Two-sided critical value z with P(−z ≤ Z ≤ z) = level. */
export function zCritical(level = 0.95): number {
  return standardNormalQuantile(1 - (1 - level) / 2);
}

export interface ConfidenceInterval {
  z: number;
  halfWidth: number;
  lo: number;
  hi: number;
}

/** X̄ ± z · σ/√n confidence interval for a normal population. */
export function confidenceInterval(
  sampleMean: number,
  sd: number,
  n: number,
  level = 0.95,
): ConfidenceInterval {
  const z = zCritical(level);
  const halfWidth = z * (sd / Math.sqrt(n));
  return { z, halfWidth, lo: sampleMean - halfWidth, hi: sampleMean + halfWidth };
}

/* ------------------------------------------------------------------ *
 * Plot geometry — normal curve
 * ------------------------------------------------------------------ */

export const NORMAL_GEOM = {
  width: 480,
  height: 280,
  pad: { left: 40, right: 18, top: 22, bottom: 34 },
  steps: 220,
  span: 4,
} as const;

export type NormalShade = 'none' | 'left' | 'right' | 'between' | 'both';

export interface NormalFrameOptions {
  mu?: number;
  sd?: number;
  shade?: NormalShade;
  /** Primary boundary in data units (left tail / right tail / both tails). */
  a?: number;
  /** Second boundary for `between`. */
  b?: number;
  marker?: number | null;
}

export interface NormalFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  baseY: number;
  yPeak: number;
  curve: string;
  shadePaths: string[];
  sdMarks: { x: number; label: string }[];
  xTicks: { x: number; label: string }[];
  marker: { x: number; y: number; value: number } | null;
  probability: number | null;
  ariaText: string;
}

function areaPath(
  fn: (x: number) => number,
  from: number,
  to: number,
  steps: number,
  xScale: (x: number) => number,
  yScale: (y: number) => number,
  baseY: number,
): string {
  if (!(to > from)) return '';
  const pts = sampleFunction(fn, { from, to, steps }).filter((p) => Number.isFinite(p.y));
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  let d = `M${round(xScale(first.x))} ${round(baseY)}`;
  for (const p of pts) d += ` L${round(xScale(p.x))} ${round(yScale(p.y))}`;
  d += ` L${round(xScale(last.x))} ${round(baseY)} Z`;
  return d;
}

export function normalFrame(opts: NormalFrameOptions = {}): NormalFrame {
  const { width, height, pad, steps, span } = NORMAL_GEOM;
  const mu = opts.mu ?? 0;
  const sd = opts.sd && opts.sd > 0 ? opts.sd : 1;
  const shade = opts.shade ?? 'none';
  const lo = mu - span * sd;
  const hi = mu + span * sd;
  const yPeak = normalPdf(mu, mu, sd) * 1.08;

  const xScale = scaleLinear({ domain: [lo, hi], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({
    domain: [0, yPeak],
    range: [height - pad.bottom, pad.top],
  });

  const fn = (x: number): number => normalPdf(x, mu, sd);
  const curve = buildFunctionPath(fn, {
    from: lo,
    to: hi,
    steps,
    xScale,
    yScale,
    clipY: [0, yPeak],
  });

  const baseY = yScale(0);
  const shadePaths: string[] = [];
  let probability: number | null = null;

  const leftBoundary = opts.a ?? mu;
  const bothHalf = Math.abs((opts.a ?? mu + 1.96 * sd) - mu);
  switch (shade) {
    case 'left': {
      shadePaths.push(areaPath(fn, lo, leftBoundary, steps, xScale, yScale, baseY));
      probability = normalCdf(leftBoundary, mu, sd);
      break;
    }
    case 'right': {
      shadePaths.push(areaPath(fn, leftBoundary, hi, steps, xScale, yScale, baseY));
      probability = 1 - normalCdf(leftBoundary, mu, sd);
      break;
    }
    case 'between': {
      const a = opts.a ?? mu - 1.96 * sd;
      const b = opts.b ?? mu + 1.96 * sd;
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      shadePaths.push(areaPath(fn, from, to, steps, xScale, yScale, baseY));
      probability = normalBetween(from, to, mu, sd);
      break;
    }
    case 'both': {
      const lower = mu - bothHalf;
      const upper = mu + bothHalf;
      shadePaths.push(areaPath(fn, lo, lower, steps, xScale, yScale, baseY));
      shadePaths.push(areaPath(fn, upper, hi, steps, xScale, yScale, baseY));
      probability = normalCdf(lower, mu, sd) + (1 - normalCdf(upper, mu, sd));
      break;
    }
    default:
      probability = null;
  }

  const xTicks: { x: number; label: string }[] = [];
  for (let k = -span; k <= span; k++) {
    xTicks.push({ x: round(xScale(mu + k * sd)), label: fmtStat(mu + k * sd, 2) });
  }

  const sdMarks = [-1, 1].map((k) => ({
    x: round(xScale(mu + k * sd)),
    label: k < 0 ? '−1σ' : '+1σ',
  }));

  let marker: NormalFrame['marker'] = null;
  if (opts.marker != null && Number.isFinite(opts.marker) && opts.marker >= lo && opts.marker <= hi) {
    marker = {
      x: round(xScale(opts.marker)),
      y: round(yScale(normalPdf(opts.marker, mu, sd))),
      value: opts.marker,
    };
  }

  const pct = probability == null ? null : `${fmtStat(probability * 100, 2)}%`;
  const ariaText =
    probability == null
      ? `平均 ${fmtStat(mu, 2)}、標準偏差 ${fmtStat(sd, 2)} の正規分布の曲線。`
      : `平均 ${fmtStat(mu, 2)}、標準偏差 ${fmtStat(sd, 2)} の正規分布で、着色部分の確率は約 ${pct}。`;

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    baseY: round(baseY),
    yPeak: round(yPeak),
    curve,
    shadePaths,
    sdMarks,
    xTicks,
    marker,
    probability,
    ariaText,
  };
}

/* ------------------------------------------------------------------ *
 * Plot geometry — binomial distribution
 * ------------------------------------------------------------------ */

export const BINOMIAL_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 42, right: 18, top: 22, bottom: 36 },
} as const;

export interface BinomialBar {
  k: number;
  prob: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BinomialFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  baseY: number;
  bars: BinomialBar[];
  meanX: number;
  meanLabel: string;
  sdBand: { x1: number; x2: number } | null;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  highlightP: string | null;
  values: { mean: string; sd: string };
  ariaText: string;
}

export function binomialFrame(n: number, p: number, highlight?: number | null): BinomialFrame {
  const { width, height, pad } = BINOMIAL_GEOM;
  const count = Math.max(1, Math.min(40, Math.round(n)));
  const prob = Math.max(0.01, Math.min(0.99, p));
  const probs: number[] = [];
  for (let k = 0; k <= count; k++) probs.push(binomialPmf(count, k, prob));
  const maxProb = Math.max(...probs, 1e-9);

  const xScale = scaleLinear({
    domain: [-0.6, count + 0.6],
    range: [pad.left, width - pad.right],
  });
  const yScale = scaleLinear({
    domain: [0, maxProb * 1.18],
    range: [height - pad.bottom, pad.top],
  });
  const baseY = yScale(0);
  const slot = (width - pad.left - pad.right) / (count + 1);
  const barW = slot * 0.7;

  const bars: BinomialBar[] = probs.map((value, k) => {
    const x = xScale(k) - barW / 2;
    const y = yScale(value);
    return { k, prob: value, x: round(x), y: round(y), w: round(barW), h: round(baseY - y) };
  });

  const m = binomialMean(count, prob);
  const s = binomialSd(count, prob);
  const meanX = round(xScale(m));
  const sdBand =
    s > 0
      ? { x1: round(xScale(Math.max(0, m - s))), x2: round(xScale(Math.min(count, m + s))) }
      : null;

  const stepX = count <= 12 ? 1 : Math.ceil(count / 12);
  const xTicks: { x: number; label: string }[] = [];
  for (let k = 0; k <= count; k++) {
    if (k % stepX === 0 || k === count) xTicks.push({ x: round(xScale(k)), label: String(k) });
  }

  const yStep = niceStep(maxProb * 1.18, 4);
  const yTicks: { y: number; label: string }[] = [];
  for (let v = yStep; v <= maxProb * 1.18 + yStep * 1e-9; v += yStep) {
    yTicks.push({ y: round(yScale(v)), label: fmtStat(v, 3) });
    if (yTicks.length > 6) break;
  }

  const highlightP =
    highlight != null && highlight >= 0 && highlight <= count
      ? fmtStat(binomialPmf(count, Math.round(highlight), prob) * 100, 2)
      : null;

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    baseY: round(baseY),
    bars,
    meanX,
    meanLabel: `μ = ${fmtStat(m, 2)}`,
    sdBand,
    xTicks,
    yTicks,
    highlightP,
    values: { mean: fmtStat(m, 2), sd: fmtStat(s, 2) },
    ariaText: `二項分布 B(${count}, ${fmtStat(prob, 2)})。期待値 ${fmtStat(m, 2)}、標準偏差 ${fmtStat(s, 2)}。`,
  };
}

/* ------------------------------------------------------------------ *
 * Plot geometry — histogram
 * ------------------------------------------------------------------ */

export const HISTOGRAM_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 44, right: 18, top: 22, bottom: 36 },
} as const;

export interface HistogramBin {
  lo: number;
  hi: number;
  count: number;
}

export function histogram(values: number[], binCount: number): HistogramBin[] {
  if (values.length === 0 || binCount < 1) return [];
  const dataLo = Math.min(...values);
  const dataHi = Math.max(...values);
  const width = dataHi > dataLo ? (dataHi - dataLo) / binCount : 1;
  const base = dataHi > dataLo ? dataLo : dataLo - 0.5;
  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ lo: base + i * width, hi: base + (i + 1) * width, count: 0 });
  }
  for (const v of values) {
    let idx = Math.floor((v - base) / width);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count += 1;
  }
  return bins;
}

export interface HistogramBar extends HistogramBin {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HistogramFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  baseY: number;
  bars: HistogramBar[];
  meanLine: { x: number } | null;
  sdBand: { x1: number; x2: number } | null;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  stats: { n: number; mean: string; sd: string; min: string; max: string };
  ariaText: string;
}

export function histogramFrame(
  values: number[],
  binCount: number,
  opts: { mean?: boolean; sd?: boolean } = {},
): HistogramFrame {
  const { width, height, pad } = HISTOGRAM_GEOM;
  const bins = histogram(values, binCount);
  const finite = values.filter((v) => Number.isFinite(v));
  const dataLo = finite.length ? Math.min(...finite) : 0;
  const dataHi = finite.length ? Math.max(...finite) : 1;
  const span = dataHi > dataLo ? dataHi - dataLo : 1;
  const xScale = scaleLinear({
    domain: [dataLo - span * 0.04, dataHi + span * 0.04],
    range: [pad.left, width - pad.right],
  });
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const yScale = scaleLinear({
    domain: [0, maxCount * 1.15],
    range: [height - pad.bottom, pad.top],
  });
  const baseY = yScale(0);

  const bars: HistogramBar[] = bins.map((b) => {
    const x = xScale(b.lo);
    const y = yScale(b.count);
    return { ...b, x: round(x), y: round(y), w: round(xScale(b.hi) - x), h: round(baseY - y) };
  });

  const m = finite.length ? mean(finite) : Number.NaN;
  const s = finite.length ? standardDeviation(finite) : Number.NaN;
  const meanLine = opts.mean && Number.isFinite(m) ? { x: round(xScale(m)) } : null;
  const sdBand =
    opts.sd && s > 0
      ? { x1: round(xScale(m - s)), x2: round(xScale(m + s)) }
      : null;

  const xStep = niceStep(dataHi - dataLo, 5);
  const xTicks: { x: number; label: string }[] = [];
  for (let v = Math.ceil(dataLo / xStep) * xStep; v <= dataHi + xStep * 1e-9; v += xStep) {
    xTicks.push({ x: round(xScale(v)), label: fmtStat(v, 2) });
    if (xTicks.length > 8) break;
  }

  const yStep = niceStep(maxCount, 4);
  const yTicks: { y: number; label: string }[] = [];
  for (let v = 0; v <= maxCount + yStep * 1e-9; v += yStep) {
    yTicks.push({ y: round(yScale(v)), label: String(Math.round(v)) });
    if (yTicks.length > 6) break;
  }

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    baseY: round(baseY),
    bars,
    meanLine,
    sdBand,
    xTicks,
    yTicks,
    stats: {
      n: finite.length,
      mean: fmtStat(m, 2),
      sd: fmtStat(s, 2),
      min: fmtStat(dataLo, 2),
      max: fmtStat(dataHi, 2),
    },
    ariaText: `${finite.length} 個のデータのヒストグラム。平均 ${fmtStat(m, 2)}、標準偏差 ${fmtStat(s, 2)}、最小 ${fmtStat(dataLo, 2)}、最大 ${fmtStat(dataHi, 2)}。`,
  };
}

/* ------------------------------------------------------------------ *
 * Plot geometry — repeated confidence intervals (coverage)
 * ------------------------------------------------------------------ */

export const CI_GEOM = {
  width: 480,
  height: 320,
  pad: { left: 44, right: 18, top: 22, bottom: 36 },
} as const;

export interface CIInterval {
  lo: number;
  hi: number;
  sampleMean: number;
  x1: number;
  x2: number;
  meanX: number;
  y: number;
  covers: boolean;
}

export interface CIFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  intervals: CIInterval[];
  muX: number;
  covered: number;
  total: number;
  halfWidth: string;
  z: string;
  level: string;
  xTicks: { x: number; label: string }[];
  ariaText: string;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function standardNormalSample(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function confidenceFrame(opts: {
  mu?: number;
  sigma?: number;
  n?: number;
  level?: number;
  count?: number;
  seed?: number;
} = {}): CIFrame {
  const { width, height, pad } = CI_GEOM;
  const mu = opts.mu ?? 50;
  const sigma = opts.sigma && opts.sigma > 0 ? opts.sigma : 10;
  const n = Math.max(1, Math.round(opts.n ?? 16));
  const level = opts.level ?? 0.95;
  const total = Math.max(3, Math.min(40, Math.round(opts.count ?? 20)));
  const se = sigma / Math.sqrt(n);
  const { z, halfWidth } = confidenceInterval(mu, sigma, n, level);

  const rng = mulberry32(opts.seed ?? 20260912);
  const raw: { sampleMean: number; lo: number; hi: number; covers: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const sampleMean = mu + standardNormalSample(rng) * se;
    const lo = sampleMean - halfWidth;
    const hi = sampleMean + halfWidth;
    raw.push({ sampleMean, lo, hi, covers: lo <= mu && mu <= hi });
  }

  const loAll = Math.min(mu, ...raw.map((r) => r.lo));
  const hiAll = Math.max(mu, ...raw.map((r) => r.hi));
  const padX = (hiAll - loAll || 1) * 0.06;
  const xScale = scaleLinear({
    domain: [loAll - padX, hiAll + padX],
    range: [pad.left, width - pad.right],
  });

  const top = pad.top + 6;
  const bottom = height - pad.bottom - 6;
  const rowGap = (bottom - top) / Math.max(1, total - 1);
  const intervals: CIInterval[] = raw.map((r, i) => ({
    lo: r.lo,
    hi: r.hi,
    sampleMean: r.sampleMean,
    x1: round(xScale(r.lo)),
    x2: round(xScale(r.hi)),
    meanX: round(xScale(r.sampleMean)),
    y: round(top + i * rowGap),
    covers: r.covers,
  }));

  const covered = intervals.filter((r) => r.covers).length;
  const xStep = niceStep(hiAll - loAll || 1, 5);
  const xTicks: { x: number; label: string }[] = [];
  for (let v = Math.ceil((loAll - padX) / xStep) * xStep; v <= hiAll + padX + xStep * 1e-9; v += xStep) {
    xTicks.push({ x: round(xScale(v)), label: fmtStat(v, 2) });
    if (xTicks.length > 7) break;
  }

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    intervals,
    muX: round(xScale(mu)),
    covered,
    total,
    halfWidth: fmtStat(halfWidth, 2),
    z: fmtStat(z, 3),
    level: fmtStat(level * 100, 1),
    xTicks,
    ariaText: `${total} 回の標本から作った ${fmtStat(level * 100, 1)}% 信頼区間。真の平均 ${fmtStat(mu, 2)} を含む区間は ${covered} 本。`,
  };
}
