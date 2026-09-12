/**
 * Tiny, dependency-free helpers for building SVG graphs at build time and
 * updating them with vanilla TS. No d3, no framework.
 */

export interface LinearScale {
  (value: number): number;
  invert(value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
}

/** Create a linear scale mapping domain → range (and back via `invert`). */
export function scaleLinear(opts: {
  domain: [number, number];
  range: [number, number];
}): LinearScale {
  const [d0, d1] = opts.domain;
  const [r0, r1] = opts.range;
  const dSpan = d1 - d0;
  const rSpan = r1 - r0;

  const scale = ((v: number) => (dSpan === 0 ? r0 : r0 + ((v - d0) / dSpan) * rSpan)) as LinearScale;
  scale.invert = (v: number) => (rSpan === 0 ? d0 : d0 + ((v - r0) / rSpan) * dSpan);
  Object.defineProperty(scale, 'domain', { value: opts.domain });
  Object.defineProperty(scale, 'range', { value: opts.range });
  return scale;
}

export interface Point {
  x: number;
  y: number;
}

/** Sample a function over [from, to] into `steps + 1` points. */
export function sampleFunction(
  fn: (x: number) => number,
  opts: { from: number; to: number; steps: number },
): Point[] {
  const n = Math.max(1, Math.floor(opts.steps));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const x = opts.from + ((opts.to - opts.from) * i) / n;
    out.push({ x, y: fn(x) });
  }
  return out;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Build an SVG path string from already-projected (screen) points. */
export function buildPolylinePath(points: Point[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`)
    .join(' ');
}

/**
 * Build an SVG path for y = fn(x), projected through the given scales.
 * Non-finite or out-of-clip values start a new subpath so discontinuities
 * (e.g. tan asymptotes) are not connected by a spurious line.
 */
export function buildFunctionPath(
  fn: (x: number) => number,
  opts: {
    from: number;
    to: number;
    steps: number;
    xScale: LinearScale;
    yScale: LinearScale;
    clipY?: [number, number];
  },
): string {
  const clip = opts.clipY;
  const samples = sampleFunction(fn, opts);
  let d = '';
  let penDown = false;

  for (const { x, y } of samples) {
    const valid =
      Number.isFinite(y) && (!clip || (y >= clip[0] && y <= clip[1]));
    if (!valid) {
      penDown = false;
      continue;
    }
    const px = opts.xScale(x);
    const py = opts.yScale(y);
    d += `${penDown ? 'L' : 'M'}${round(px)} ${round(py)} `;
    penDown = true;
  }

  return d.trim();
}

/**
 * Convert a polar coordinate to SVG screen coordinates.
 * `angleRad` is measured counter-clockwise from the positive x-axis; y is
 * flipped so that positive angles go up on screen.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number,
): Point {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
}

/** Describe an SVG arc from angle a to b (radians, mathematical direction). */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  a: number,
  b: number,
): string {
  const start = polarToCartesian(cx, cy, r, a);
  const end = polarToCartesian(cx, cy, r, b);
  const delta = b - a;
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta >= 0 ? 0 : 1;
  return `M${round(start.x)} ${round(start.y)} A${r} ${r} 0 ${largeArc} ${sweep} ${round(end.x)} ${round(end.y)}`;
}
