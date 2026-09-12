/**
 * Pure polynomial calculus for the 微分・積分の考え visualizations.
 *
 * Both the Astro server render and the client hydration script call these
 * functions, so the static SVG and the interactive SVG can never drift apart.
 * No DOM access here.
 *
 * Scope note: this is 数学II. Everything stays polynomial; the derivative is
 * the value the average rate of change approaches as h → 0, and the definite
 * integral is the signed area F(b) − F(a). No formal limits are taken.
 */
import {
  buildFunctionPath,
  sampleFunction,
  scaleLinear,
  type LinearScale,
  type Point,
} from '../../../lib/graph';

/** A line segment in screen coordinates. */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A polynomial: coeffs[i] is the coefficient of x^i. E.g. x² is [0, 0, 1]. */
export type Poly = readonly number[];

export interface CalcView {
  x: [number, number];
  y: [number, number];
}

export interface CalcFnSpec {
  coeffs: Poly;
  /** Readable function expression, e.g. "y = x²". */
  label: string;
  /** Readable derivative expression, e.g. "y' = 2x". */
  derivativeLabel: string;
  /** Fixed window used by the figure. */
  view: CalcView;
}

export type CalcFnKey = 'square' | 'cubic' | 'cubic-extrema';

/** The polynomials offered by the figures. Keys are string enums (no functions). */
export const CALC_FNS: Record<CalcFnKey, CalcFnSpec> = {
  square: {
    coeffs: [0, 0, 1],
    label: 'y = x²',
    derivativeLabel: "y' = 2x",
    view: { x: [-2.2, 2.2], y: [-1.4, 5.4] },
  },
  cubic: {
    coeffs: [0, 0, 0, 1],
    label: 'y = x³',
    derivativeLabel: "y' = 3x²",
    view: { x: [-2, 2], y: [-5, 5] },
  },
  'cubic-extrema': {
    coeffs: [0, -3, 0, 1],
    label: 'y = x³ − 3x',
    derivativeLabel: "y' = 3x² − 3",
    view: { x: [-2.4, 2.4], y: [-5, 5] },
  },
};

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function fmtCalc(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(dp);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' ? '0' : trimmed;
}

/* ------------------------------------------------------------------ *
 * Polynomial arithmetic (数学II: non-negative integer powers only)
 * ------------------------------------------------------------------ */

export function polyEval(coeffs: Poly, x: number): number {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 0; i -= 1) acc = acc * x + coeffs[i];
  return acc;
}

/** Derivative coefficients: d/dx Σ aᵢxⁱ = Σ i·aᵢxⁱ⁻¹. */
export function polyDerive(coeffs: Poly): number[] {
  if (coeffs.length <= 1) return [0];
  return coeffs.slice(1).map((coefficient, index) => coefficient * (index + 1));
}

/** Antiderivative coefficients with C = 0: ∫ aᵢxⁱ dx = aᵢ/(i+1)·xⁱ⁺¹. */
export function polyAntiderive(coeffs: Poly): number[] {
  return [0, ...coeffs.map((coefficient, index) => coefficient / (index + 1))];
}

/** Average rate of change on [a, b]: (f(b) − f(a)) / (b − a). */
export function averageRate(coeffs: Poly, a: number, b: number): number {
  if (Math.abs(b - a) < 1e-12) return Number.NaN;
  return (polyEval(coeffs, b) - polyEval(coeffs, a)) / (b - a);
}

/** The derivative (微分係数) at x, read as the limiting slope. */
export function derivativeAt(coeffs: Poly, x: number): number {
  return polyEval(polyDerive(coeffs), x);
}

export interface TangentLine {
  slope: number;
  intercept: number;
}

/** Tangent line at x = a: y = m(x − a) + f(a), rewritten as y = m x + c. */
export function tangentLineAt(coeffs: Poly, a: number): TangentLine {
  const slope = derivativeAt(coeffs, a);
  const intercept = polyEval(coeffs, a) - slope * a;
  return { slope, intercept };
}

/** Definite integral ∫ₐᵇ f(x) dx = F(b) − F(a) with F an antiderivative. */
export function polyDefiniteIntegral(coeffs: Poly, a: number, b: number): number {
  const antiderivative = polyAntiderive(coeffs);
  return polyEval(antiderivative, b) - polyEval(antiderivative, a);
}

/** Midpoint Riemann sum of f on [a, b] with n equal subintervals. */
export function riemannSum(coeffs: Poly, a: number, b: number, n: number): number {
  const count = Math.max(1, Math.floor(n));
  const dx = (b - a) / count;
  let acc = 0;
  for (let i = 0; i < count; i += 1) {
    const midpoint = a + dx * (i + 0.5);
    acc += polyEval(coeffs, midpoint) * dx;
  }
  return acc;
}

/* ------------------------------------------------------------------ *
 * Frame geometry
 * ------------------------------------------------------------------ */

export const CALC_GRAPH_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 46, right: 18, top: 18, bottom: 34 },
  curveSteps: 200,
  regionSteps: 120,
} as const;

export interface CalcPlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface XTick {
  x: number;
  label: string;
}

export interface YTick {
  y: number;
  label: string;
}

/** Integer ticks across a window, widened automatically for tall windows. */
function integerTicks(lo: number, hi: number): { step: number; values: number[] } {
  const span = hi - lo;
  const step = span > 9 ? 2 : 1;
  const values: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) values.push(v);
  return { step, values };
}

/**
 * Clip the line y = m x + c to the visible window and project it, or return
 * null when the line does not cross the plot.
 */
function clipLine(
  m: number,
  c: number,
  view: CalcView,
  xScale: LinearScale,
  yScale: LinearScale,
): Segment | null {
  let xLo = view.x[0];
  let xHi = view.x[1];
  const [yLo, yHi] = view.y;

  if (Math.abs(m) < 1e-12) {
    if (c < yLo || c > yHi) return null;
  } else {
    const xA = (yLo - c) / m;
    const xB = (yHi - c) / m;
    xLo = Math.max(xLo, Math.min(xA, xB));
    xHi = Math.min(xHi, Math.max(xA, xB));
  }
  if (xHi - xLo < 1e-9) return null;

  return {
    x1: round(xScale(xLo)),
    y1: round(yScale(m * xLo + c)),
    x2: round(xScale(xHi)),
    y2: round(yScale(m * xHi + c)),
  };
}

/* ------------------------------------------------------------------ *
 * Secant → tangent figure
 * ------------------------------------------------------------------ */

export interface TangentFrame {
  width: number;
  height: number;
  plot: CalcPlot;
  zeroY: number;
  curve: string;
  xTicks: XTick[];
  yTicks: YTick[];
  pointA: Point;
  pointB: Point | null;
  secant: Segment | null;
  tangent: Segment | null;
  triangle: { dx: Segment; dy: Segment } | null;
  tangentLabel: Point;
  secantLabel: Point | null;
  values: {
    fn: string;
    derivative: string;
    a: string;
    h: string;
    fa: string;
    fb: string;
    average: string;
    slope: string;
    isTangent: boolean;
  };
  ariaText: string;
}

export function tangentFrame(
  coeffs: Poly,
  view: CalcView,
  a: number,
  h: number,
): TangentFrame {
  const { width, height, pad, curveSteps } = CALC_GRAPH_GEOM;
  const xScale = scaleLinear({ domain: view.x, range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({
    domain: view.y,
    range: [height - pad.bottom, pad.top],
  });

  const project = (x: number, y: number): Point => ({
    x: round(xScale(x)),
    y: round(yScale(y)),
  });

  const curve = buildFunctionPath((x) => polyEval(coeffs, x), {
    from: view.x[0],
    to: view.x[1],
    steps: curveSteps,
    xScale,
    yScale,
    clipY: view.y,
  });

  const fa = polyEval(coeffs, a);
  const slope = derivativeAt(coeffs, a);
  const tangent = clipLine(slope, fa - slope * a, view, xScale, yScale);
  const pointA = project(a, fa);

  const isTangent = Math.abs(h) < 1e-9;
  const fb = isTangent ? Number.NaN : polyEval(coeffs, a + h);
  const pointB: Point | null = isTangent ? null : project(a + h, fb);

  const secant = isTangent
    ? null
    : (() => {
        const m = averageRate(coeffs, a, a + h);
        return clipLine(m, fa - m * a, view, xScale, yScale);
      })();

  const triangle =
    pointB && !isTangent
      ? {
          dx: { x1: pointA.x, y1: pointA.y, x2: pointB.x, y2: pointA.y },
          dy: { x1: pointB.x, y1: pointA.y, x2: pointB.x, y2: pointB.y },
        }
      : null;

  const xTickData = integerTicks(view.x[0], view.x[1]);
  const yTickData = integerTicks(view.y[0], view.y[1]);
  const xTicks: XTick[] = xTickData.values.map((v) => ({
    x: round(xScale(v)),
    label: String(v),
  }));
  const yTicks: YTick[] = yTickData.values.map((v) => ({
    y: round(yScale(v)),
    label: String(v),
  }));

  const averageValue = isTangent ? Number.NaN : averageRate(coeffs, a, a + h);
  const avgText = isTangent ? '—' : fmtCalc(averageValue);

  // Place the line labels near their right-hand endpoints, nudged inside.
  const tangentLabel: Point = tangent
    ? { x: Math.min(tangent.x2, width - pad.right + 4), y: Math.max(tangent.y2 - 6, pad.top + 10) }
    : { x: width - pad.right, y: pad.top + 10 };
  const secantLabel: Point | null = secant
    ? { x: Math.min(secant.x2, width - pad.right + 4), y: Math.min(secant.y2 + 14, height - pad.bottom - 4) }
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
    zeroY: round(yScale(0)),
    curve,
    xTicks,
    yTicks,
    pointA,
    pointB,
    secant,
    tangent,
    triangle,
    tangentLabel,
    secantLabel,
    values: {
      fn: 'f(x)',
      derivative: "f'(a)",
      a: fmtCalc(a, 2),
      h: isTangent ? '0' : fmtCalc(h, 2),
      fa: fmtCalc(fa),
      fb: isTangent ? '—' : fmtCalc(fb),
      average: avgText,
      slope: fmtCalc(slope),
      isTangent,
    },
    ariaText: isTangent
      ? `a = ${fmtCalc(a, 2)}、f(a) = ${fmtCalc(fa)}、接線の傾き（微分係数）は ${fmtCalc(slope)}。`
      : `a = ${fmtCalc(a, 2)}、h = ${fmtCalc(h, 2)}、平均変化率は ${avgText}、微分係数は ${fmtCalc(slope)}。`,
  };
}

/* ------------------------------------------------------------------ *
 * Area under a curve figure
 * ------------------------------------------------------------------ */

export interface AreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AreaFrame {
  width: number;
  height: number;
  plot: CalcPlot;
  zeroY: number;
  curve: string;
  region: string;
  rects: AreaRect[];
  xTicks: XTick[];
  yTicks: YTick[];
  values: {
    fn: string;
    a: string;
    b: string;
    n: string;
    exact: string;
    approx: string;
    delta: string;
  };
  ariaText: string;
}

export function areaFrame(
  coeffs: Poly,
  view: CalcView,
  aRaw: number,
  bRaw: number,
  n: number,
): AreaFrame {
  const { width, height, pad, curveSteps, regionSteps } = CALC_GRAPH_GEOM;
  const xScale = scaleLinear({ domain: view.x, range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({
    domain: view.y,
    range: [height - pad.bottom, pad.top],
  });

  const a = Math.min(aRaw, bRaw);
  const b = Math.max(aRaw, bRaw);
  const count = Math.max(1, Math.floor(n));

  const curve = buildFunctionPath((x) => polyEval(coeffs, x), {
    from: view.x[0],
    to: view.x[1],
    steps: curveSteps,
    xScale,
    yScale,
    clipY: view.y,
  });

  // Filled region between the curve and the x-axis on [a, b].
  const samples = sampleFunction((x) => polyEval(coeffs, x), {
    from: a,
    to: b,
    steps: regionSteps,
  });
  const regionParts = [
    `M${round(xScale(a))} ${round(yScale(0))}`,
    ...samples.map((p) => `L${round(xScale(p.x))} ${round(yScale(p.y))}`),
    `L${round(xScale(b))} ${round(yScale(0))}`,
    'Z',
  ];
  const region = regionParts.join(' ');

  // Midpoint rectangles, each anchored to the x-axis (signed height).
  const rects: AreaRect[] = [];
  const dx = (b - a) / count;
  const zeroY = yScale(0);
  for (let i = 0; i < count; i += 1) {
    const left = a + dx * i;
    const midpoint = left + dx / 2;
    const value = polyEval(coeffs, midpoint);
    const xLeft = xScale(left);
    const xRight = xScale(left + dx);
    const yValue = yScale(value);
    rects.push({
      x: round(Math.min(xLeft, xRight)),
      y: round(Math.min(yValue, zeroY)),
      width: round(Math.abs(xRight - xLeft)),
      height: round(Math.abs(yValue - zeroY)),
    });
  }

  const xTickData = integerTicks(view.x[0], view.x[1]);
  const yTickData = integerTicks(view.y[0], view.y[1]);
  const exact = polyDefiniteIntegral(coeffs, a, b);
  const approx = riemannSum(coeffs, a, b, count);

  return {
    width,
    height,
    plot: {
      x: pad.left,
      y: pad.top,
      width: width - pad.left - pad.right,
      height: height - pad.top - pad.bottom,
    },
    zeroY: round(zeroY),
    curve,
    region,
    rects,
    xTicks: xTickData.values.map((v) => ({ x: round(xScale(v)), label: String(v) })),
    yTicks: yTickData.values.map((v) => ({ y: round(yScale(v)), label: String(v) })),
    values: {
      fn: 'f(x)',
      a: fmtCalc(a, 2),
      b: fmtCalc(b, 2),
      n: String(count),
      exact: fmtCalc(exact),
      approx: fmtCalc(approx),
      delta: fmtCalc(approx - exact),
    },
    ariaText: `区間 ${fmtCalc(a, 2)} から ${fmtCalc(b, 2)} まで、分割数 ${count}。定積分の値は ${fmtCalc(exact)}、長方形の合計は ${fmtCalc(approx)}。`,
  };
}
