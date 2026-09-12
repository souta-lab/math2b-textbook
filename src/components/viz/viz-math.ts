/**
 * Pure geometry + formatting for the visualization components.
 *
 * Both the Astro server render (frontmatter) and the client hydration script
 * call these functions, so the static SVG and the interactive SVG can never
 * drift apart. No DOM access here.
 */
import { arcPath, buildFunctionPath, polarToCartesian, scaleLinear } from '../../lib/graph';
import { degToRad, formatPi, normalizeDeg } from '../../lib/trig';

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

export interface TextLabel extends Point {
  anchor: 'start' | 'middle' | 'end';
}

export type TrigFn = 'sin' | 'cos' | 'tan';

const round = (n: number): number => Math.round(n * 1000) / 1000;

function arrowHead(tipX: number, tipY: number, dirX: number, dirY: number, size = 7, half = 3.4): string {
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;
  const baseX = tipX - ux * size;
  const baseY = tipY - uy * size;
  const nx = -uy;
  const ny = ux;
  return `M${round(tipX)} ${round(tipY)} L${round(baseX + nx * half)} ${round(baseY + ny * half)} L${round(baseX - nx * half)} ${round(baseY - ny * half)} Z`;
}

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function fmtNum(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(dp);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' ? '0' : trimmed;
}

export function fmtDeg(rawDeg: number): string {
  const nearest = Math.round(rawDeg);
  return Math.abs(rawDeg - nearest) < 1e-6 ? String(nearest) : rawDeg.toFixed(1);
}

/** Radians as a rational multiple of π when possible, else a decimal. */
export function fmtRad(rawDeg: number): string {
  const rad = degToRad(rawDeg);
  return formatPi(rad) ?? fmtNum(rad, 2);
}

/* ------------------------------------------------------------------ *
 * Unit circle
 * ------------------------------------------------------------------ */

export const UNIT_CIRCLE_GEOM = {
  size: 320,
  cx: 160,
  cy: 160,
  r: 112,
  arcR: 30,
  tanMax: 1.35,
} as const;

export interface UnitCircleFrame {
  rawDeg: number;
  normDeg: number;
  point: Point;
  origin: Point;
  radiusLine: Segment;
  arc: { d: string; head: string } | null;
  sinSeg: Segment | null;
  sinLabel: TextLabel | null;
  cosSeg: Segment | null;
  cosLabel: TextLabel | null;
  tanLine: Segment;
  tanSeg: Segment | null;
  tanEnd: Point | null;
  tanLabel: TextLabel | null;
  tanDefined: boolean;
  oneX: TextLabel;
  negOneX: TextLabel;
  oneY: TextLabel;
  negOneY: TextLabel;
  quadrants: TextLabel[];
  angleLabel: Point;
  values: { deg: string; rad: string; sin: string; cos: string; tan: string };
  ariaText: string;
}

export function unitCircleFrame(rawDeg: number): UnitCircleFrame {
  const { cx, cy, r, arcR, tanMax } = UNIT_CIRCLE_GEOM;
  const normDeg = normalizeDeg(rawDeg);
  const rad = degToRad(normDeg);
  const cosV = Math.cos(rad);
  const sinV = Math.sin(rad);
  const px = cx + r * cosV;
  const py = cy - r * sinV;
  const tanDefined = Math.abs(cosV) > 1e-9;
  const tanV = tanDefined ? sinV / cosV : Number.NaN;

  const arc =
    normDeg < 0.5
      ? null
      : (() => {
          const end = polarToCartesian(cx, cy, arcR, rad);
          const dirX = -Math.sin(rad);
          const dirY = -Math.cos(rad);
          return { d: arcPath(cx, cy, arcR, 0, rad), head: arrowHead(end.x, end.y, dirX, dirY) };
        })();

  const sinSeg: Segment | null =
    Math.abs(sinV) < 0.01 ? null : { x1: round(px), y1: cy, x2: round(px), y2: round(py) };
  const sinLabel: TextLabel | null = sinSeg
    ? {
        x: round(px + (cosV >= 0 ? 9 : -9)),
        y: round((cy + py) / 2 + 4),
        anchor: cosV >= 0 ? 'start' : 'end',
      }
    : null;

  const cosSeg: Segment | null =
    Math.abs(cosV) < 0.01 ? null : { x1: cx, y1: cy, x2: round(px), y2: cy };
  const cosLabel: TextLabel | null = cosSeg
    ? { x: round((cx + px) / 2), y: cy + 18, anchor: 'middle' }
    : null;

  const tanX = cx + r;
  const tanLine: Segment = { x1: tanX, y1: cy - r, x2: tanX, y2: cy + r };
  let tanSeg: Segment | null = null;
  let tanEnd: Point | null = null;
  let tanLabel: TextLabel | null = null;
  if (tanDefined && Number.isFinite(tanV)) {
    const clamped = Math.max(-tanMax, Math.min(tanMax, tanV));
    const endY = cy - r * clamped;
    tanSeg = { x1: tanX, y1: cy, x2: tanX, y2: round(endY) };
    if (Math.abs(clamped - tanV) < 1e-9) tanEnd = { x: tanX, y: round(endY) };
    tanLabel = { x: tanX + 8, y: round((cy + endY) / 2 + 4), anchor: 'start' };
  }

  const midDeg = Math.max(9, Math.min(351, normDeg / 2));
  const angleLabel = polarToCartesian(cx, cy, arcR + 20, degToRad(midDeg));

  const values = {
    deg: fmtDeg(rawDeg),
    rad: fmtRad(rawDeg),
    sin: fmtNum(sinV),
    cos: fmtNum(cosV),
    tan: tanDefined ? fmtNum(tanV) : '未定義',
  };

  return {
    rawDeg,
    normDeg,
    point: { x: round(px), y: round(py) },
    origin: { x: cx, y: cy },
    radiusLine: { x1: cx, y1: cy, x2: round(px), y2: round(py) },
    arc,
    sinSeg,
    sinLabel,
    cosSeg,
    cosLabel,
    tanLine,
    tanSeg,
    tanEnd,
    tanLabel,
    tanDefined,
    oneX: { x: tanX - 6, y: cy + 18, anchor: 'end' },
    negOneX: { x: cx - r, y: cy + 18, anchor: 'middle' },
    oneY: { x: cx + 8, y: cy - r + 4, anchor: 'start' },
    negOneY: { x: cx + 8, y: cy + r + 4, anchor: 'start' },
    quadrants: [
      { x: cx + r * 0.5, y: cy - r * 0.5, anchor: 'middle' },
      { x: cx - r * 0.5, y: cy - r * 0.5, anchor: 'middle' },
      { x: cx - r * 0.5, y: cy + r * 0.5, anchor: 'middle' },
      { x: cx + r * 0.5, y: cy + r * 0.5, anchor: 'middle' },
    ],
    angleLabel: { x: round(angleLabel.x), y: round(angleLabel.y) },
    values,
    ariaText: `角度 ${values.deg}度、${values.rad}。sin ${values.sin}、cos ${values.cos}、tan ${values.tan}。`,
  };
}

/* ------------------------------------------------------------------ *
 * Trig graph
 * ------------------------------------------------------------------ */

export const TRIG_GRAPH_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 44, right: 18, top: 18, bottom: 34 },
  sinCosY: 1.3,
  tanY: 2.6,
  steps: 240,
} as const;

export interface AxisTick {
  x: number;
  label: string;
}

export interface YTick {
  y: number;
  label: string;
}

export interface TrigGraphFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroY: number;
  yLim: number;
  curve: string;
  xTicks: AxisTick[];
  yTicks: YTick[];
  asymptotes: { x: number }[];
  marker: Point | null;
  guide: Segment | null;
  values: { theta: string; thetaDeg: string; f: string; sin: string; cos: string };
}

export function trigGraphFrame(fn: TrigFn, from: number, to: number, theta: number): TrigGraphFrame {
  const { width, height, pad, sinCosY, tanY, steps } = TRIG_GRAPH_GEOM;
  const yLim = fn === 'tan' ? tanY : sinCosY;
  const xScale = scaleLinear({ domain: [from, to], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [-yLim, yLim], range: [height - pad.bottom, pad.top] });
  const fnImpl = fn === 'sin' ? Math.sin : fn === 'cos' ? Math.cos : Math.tan;

  const curve = buildFunctionPath(fnImpl, {
    from,
    to,
    steps,
    xScale,
    yScale,
    clipY: [-yLim, yLim],
  });

  const xTicks: AxisTick[] = [];
  const halfPi = Math.PI / 2;
  const eps = 1e-6;
  for (let k = Math.ceil(from / halfPi - eps); k <= Math.floor(to / halfPi + eps); k++) {
    const value = k * halfPi;
    xTicks.push({ x: round(xScale(value)), label: formatPi(value) ?? fmtNum(value, 2) });
  }

  const yTickValues = fn === 'tan' ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
  const yTicks: YTick[] = yTickValues.map((v) => ({ y: round(yScale(v)), label: String(v) }));

  const asymptotes: { x: number }[] = [];
  if (fn === 'tan') {
    for (let k = Math.ceil((from - halfPi) / Math.PI); k <= Math.floor((to + halfPi) / Math.PI + eps); k++) {
      const value = halfPi + k * Math.PI;
      if (value > from && value < to) asymptotes.push({ x: round(xScale(value)) });
    }
  }

  const t = Math.max(from, Math.min(to, theta));
  const fv = fnImpl(t);
  const inRange = Number.isFinite(fv) && Math.abs(fv) <= yLim;
  const marker: Point | null = inRange ? { x: round(xScale(t)), y: round(yScale(fv)) } : null;
  const guide: Segment | null =
    inRange && marker ? { x1: marker.x, y1: round(yScale(0)), x2: marker.x, y2: marker.y } : null;

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
    yLim,
    curve,
    xTicks,
    yTicks,
    asymptotes,
    marker,
    guide,
    values: {
      theta: formatPi(t) ?? fmtNum(t, 2),
      thetaDeg: fmtDeg((t * 180) / Math.PI),
      f: Number.isFinite(fv) ? fmtNum(fv) : '未定義',
      sin: fmtNum(Math.sin(t)),
      cos: fmtNum(Math.cos(t)),
    },
  };
}
