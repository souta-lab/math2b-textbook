/**
 * Pure math and SVG frame builders for the 指数関数・対数関数 visualizations.
 *
 * Shared by the Astro server render and the vanilla-TS hydration scripts, so
 * the static SVG and the interactive SVG can never drift apart. No DOM here.
 *
 * Scope (数学II): the base is real with a > 0 and a ≠ 1. The logarithm is only
 * ever sampled where it is defined, x > 0, so the curve never tries to draw
 * across the y-axis.
 */
import { buildFunctionPath, scaleLinear } from '../../../lib/graph';
import { fmtNum } from '../viz-math';

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface AxisTick {
  x: number;
  label: string;
}

export interface YTick {
  y: number;
  label: string;
}

export type ExpLogFn = 'exp' | 'log';

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Interactive range for the base slider (a = 1 is reachable and is handled). */
export const BASE_MIN = 0.2;
export const BASE_MAX = 3;
export const BASE_STEP = 0.05;

/** A base is usable for 指数関数/対数関数 exactly when a > 0 and a ≠ 1. */
export function isValidBase(a: number): boolean {
  return Number.isFinite(a) && a > 0 && Math.abs(a - 1) > 1e-6;
}

/** a^x: defined for every real x as soon as a > 0. */
export function expValue(a: number, x: number): number {
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(x)) return Number.NaN;
  return Math.pow(a, x);
}

/** log_a x: defined only for x > 0 (with a > 0, a ≠ 1). */
export function logValue(a: number, x: number): number {
  if (!isValidBase(a) || !(x > 0)) return Number.NaN;
  return Math.log(x) / Math.log(a);
}

export interface ReflectionPair {
  /** (t, a^t), a point on y = a^x. */
  onExp: Point;
  /** (a^t, t), its mirror image on y = log_a x. */
  onLog: Point;
}

/** The mirror pair across y = x: (t, a^t) ↔ (a^t, t). */
export function reflectionPair(a: number, t: number): ReflectionPair {
  const y = expValue(a, t);
  return { onExp: { x: t, y }, onLog: { x: y, y: t } };
}

/* ------------------------------------------------------------------ *
 * Geometry (a square plot, so the mirror line y = x really reads as 45°)
 * ------------------------------------------------------------------ */

export const EXP_GRAPH_GEOM = {
  width: 460,
  height: 454,
  pad: { left: 40, right: 20, top: 20, bottom: 34 },
  xMin: -3,
  xMax: 3,
  yMin: -3,
  yMax: 3,
  steps: 480,
  /** First x sampled for a logarithm; kept positive so log is always defined. */
  logStart: 1e-4,
} as const;

/** Slider range for t so both mirror points stay inside the plot window. */
export function reflectionCursorRange(a: number): [number, number] {
  const { yMax } = EXP_GRAPH_GEOM;
  const ratio = Math.max(a, 1 / a);
  const limit = Math.log(yMax * 0.8) / Math.log(ratio);
  const m = Math.max(0.4, Math.min(2, Math.floor(limit * 10) / 10));
  return [-m, m];
}

/* ------------------------------------------------------------------ *
 * ExpLogGraph frame: one curve, driven by the base slider
 * ------------------------------------------------------------------ */

export interface ExpLogFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroX: number;
  zeroY: number;
  curve: string;
  /** y = 0 for exp, x = 0 for log (the horizontal/vertical asymptote). */
  asymptote: Segment;
  keyPoint: Point | null;
  keyGuide: Segment | null;
  xTicks: AxisTick[];
  yTicks: YTick[];
  valid: boolean;
  values: { base: string; x: string; f: string; keyPoint: string };
}

export function expLogFrame(fn: ExpLogFn, a: number): ExpLogFrame {
  const { width, height, pad, xMin, xMax, yMin, yMax, steps, logStart } = EXP_GRAPH_GEOM;
  const xScale = scaleLinear({ domain: [xMin, xMax], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [yMin, yMax], range: [height - pad.bottom, pad.top] });
  const valid = isValidBase(a);

  const from: number = fn === 'exp' ? xMin : logStart;
  const fnImpl = (x: number): number => (fn === 'exp' ? expValue(a, x) : logValue(a, x));
  const curve = valid
    ? buildFunctionPath(fnImpl, {
        from,
        to: xMax,
        steps,
        xScale,
        yScale,
        clipY: [yMin, yMax],
      })
    : '';

  const zeroY = round(yScale(0));
  const zeroX = round(xScale(0));
  const asymptote: Segment =
    fn === 'exp'
      ? { x1: pad.left, y1: zeroY, x2: width - pad.right, y2: zeroY }
      : { x1: zeroX, y1: pad.top, x2: zeroX, y2: height - pad.bottom };

  // exp is anchored at (1, a); log is anchored at (a, 1) because log_a a = 1.
  const kx = fn === 'exp' ? 1 : a;
  const kf = fn === 'exp' ? expValue(a, kx) : logValue(a, kx);
  const inWindow = valid && Number.isFinite(kf) && kx >= xMin && kx <= xMax && kf >= yMin && kf <= yMax;
  const keyPoint: Point | null = inWindow ? { x: round(xScale(kx)), y: round(yScale(kf)) } : null;
  const keyGuide: Segment | null = keyPoint
    ? fn === 'exp'
      ? { x1: keyPoint.x, y1: zeroY, x2: keyPoint.x, y2: keyPoint.y }
      : { x1: zeroX, y1: keyPoint.y, x2: keyPoint.x, y2: keyPoint.y }
    : null;

  const xTicks: AxisTick[] = [];
  for (let v = xMin; v <= xMax; v++) xTicks.push({ x: round(xScale(v)), label: String(v) });
  const yTicks: YTick[] = [];
  for (let v = yMin; v <= yMax; v++) yTicks.push({ y: round(yScale(v)), label: String(v) });

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    zeroX,
    zeroY,
    curve,
    asymptote,
    keyPoint,
    keyGuide,
    xTicks,
    yTicks,
    valid,
    values: {
      base: fmtNum(a, 2),
      x: fmtNum(kx, 2),
      f: valid ? fmtNum(kf, 3) : '—',
      keyPoint: valid ? `(${fmtNum(kx, 2)}, ${fmtNum(kf, 3)})` : '—',
    },
  };
}

/* ------------------------------------------------------------------ *
 * InverseReflection frame: y = a^x, y = log_a x and the mirror line y = x
 * ------------------------------------------------------------------ */

export interface ReflectionFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroX: number;
  zeroY: number;
  expCurve: string;
  logCurve: string;
  diagonal: Segment;
  pointExp: Point | null;
  pointLog: Point | null;
  mirrorSegment: Segment | null;
  xTicks: AxisTick[];
  yTicks: YTick[];
  valid: boolean;
  values: { base: string; t: string; exp: string; log: string; check: string };
}

export function reflectionFrame(a: number, t: number): ReflectionFrame {
  const { width, height, pad, xMin, xMax, yMin, yMax, steps, logStart } = EXP_GRAPH_GEOM;
  const xScale = scaleLinear({ domain: [xMin, xMax], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [yMin, yMax], range: [height - pad.bottom, pad.top] });
  const valid = isValidBase(a);

  const expCurve = valid
    ? buildFunctionPath((x) => expValue(a, x), {
        from: xMin,
        to: xMax,
        steps,
        xScale,
        yScale,
        clipY: [yMin, yMax],
      })
    : '';
  const logCurve = valid
    ? buildFunctionPath((x) => logValue(a, x), {
        from: logStart,
        to: xMax,
        steps,
        xScale,
        yScale,
        clipY: [yMin, yMax],
      })
    : '';

  const zeroY = round(yScale(0));
  const zeroX = round(xScale(0));
  const diagonal: Segment = {
    x1: round(xScale(xMin)),
    y1: round(yScale(xMin)),
    x2: round(xScale(xMax)),
    y2: round(yScale(xMax)),
  };

  const pair = reflectionPair(a, t);
  const inWindow = (p: Point): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;
  const pointExp = inWindow(pair.onExp) ? { x: round(xScale(pair.onExp.x)), y: round(yScale(pair.onExp.y)) } : null;
  const pointLog = inWindow(pair.onLog) ? { x: round(xScale(pair.onLog.x)), y: round(yScale(pair.onLog.y)) } : null;
  const mirrorSegment: Segment | null =
    pointExp && pointLog ? { x1: pointExp.x, y1: pointExp.y, x2: pointLog.x, y2: pointLog.y } : null;

  const xTicks: AxisTick[] = [];
  for (let v = xMin; v <= xMax; v++) xTicks.push({ x: round(xScale(v)), label: String(v) });
  const yTicks: YTick[] = [];
  for (let v = yMin; v <= yMax; v++) yTicks.push({ y: round(yScale(v)), label: String(v) });

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    zeroX,
    zeroY,
    expCurve,
    logCurve,
    diagonal,
    pointExp,
    pointLog,
    mirrorSegment,
    xTicks,
    yTicks,
    valid,
    values: {
      base: fmtNum(a, 2),
      t: fmtNum(t, 2),
      exp: valid ? fmtNum(pair.onExp.y, 3) : '—',
      log: valid ? fmtNum(pair.onLog.x, 3) : '—',
      check: valid ? fmtNum(logValue(a, pair.onLog.x), 3) : '—',
    },
  };
}
