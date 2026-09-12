/**
 * SVG markup builders for the coordinate-plane visuals.
 *
 * The server render and the client hydration script both call these, so the
 * markup produced is identical on first paint and after interaction. Pure
 * string building: no DOM access.
 */
import {
  clamp,
  lineY,
  lineCircleIntersections,
  type LineMB,
  type PlaneFrame,
  type Pt,
} from './coordinate-math';

const EPS = 1e-9;
const esc = (n: number): string => String(n);

export interface ScenePoint {
  p: Pt;
  label?: string;
  kind?: 'dot' | 'division' | 'test' | 'locus';
}

export function gridMarkup(f: PlaneFrame): string {
  const parts: string[] = [];
  for (const t of f.xTicks) {
    parts.push(
      `<line class="v-grid" x1="${esc(t.pos)}" y1="${esc(f.pad.top)}" x2="${esc(t.pos)}" y2="${esc(f.height - f.pad.bottom)}" />`,
    );
  }
  for (const t of f.yTicks) {
    parts.push(
      `<line class="v-grid" x1="${esc(f.pad.left)}" y1="${esc(t.pos)}" x2="${esc(f.width - f.pad.right)}" y2="${esc(t.pos)}" />`,
    );
  }
  return parts.join('');
}

export function axesMarkup(f: PlaneFrame): string {
  const parts: string[] = [];
  const left = f.pad.left;
  const right = f.width - f.pad.right;
  const top = f.pad.top;
  const bottom = f.height - f.pad.bottom;

  parts.push(`<line class="v-axis" x1="${left}" y1="${f.zeroY}" x2="${right}" y2="${f.zeroY}" />`);
  parts.push(
    `<path class="v-axis-head" d="M${right + 6} ${f.zeroY} L${right - 2} ${f.zeroY - 4} L${right - 2} ${f.zeroY + 4} Z" />`,
  );
  parts.push(`<line class="v-axis" x1="${f.zeroX}" y1="${bottom}" x2="${f.zeroX}" y2="${top}" />`);
  parts.push(
    `<path class="v-axis-head" d="M${f.zeroX} ${top - 6} L${f.zeroX - 4} ${top + 2} L${f.zeroX + 4} ${top + 2} Z" />`,
  );

  for (const t of f.xTicks) {
    parts.push(
      `<line class="v-tick" x1="${t.pos}" y1="${f.zeroY - 3}" x2="${t.pos}" y2="${f.zeroY + 3}" />`,
    );
    parts.push(
      `<text class="v-faint" x="${t.pos}" y="${f.zeroY + 15}" text-anchor="middle">${t.label}</text>`,
    );
  }
  for (const t of f.yTicks) {
    if (Math.abs(Number(t.label)) < EPS) continue;
    parts.push(
      `<line class="v-tick" x1="${f.zeroX - 3}" y1="${t.pos}" x2="${f.zeroX + 3}" y2="${t.pos}" />`,
    );
    parts.push(
      `<text class="v-faint" x="${f.zeroX - 6}" y="${t.pos + 4}" text-anchor="end">${t.label}</text>`,
    );
  }
  parts.push(
    `<text class="v-faint" x="${f.zeroX - 6}" y="${f.zeroY + 15}" text-anchor="end">O</text>`,
  );
  return parts.join('');
}

export function pointsMarkup(f: PlaneFrame, points: ScenePoint[]): string {
  const parts: string[] = [];
  for (const item of points) {
    const sp = f.project(item.p);
    const kind = item.kind ?? 'dot';
    const r = kind === 'test' ? 4.6 : 4.2;
    parts.push(
      `<circle class="v-point v-point-${kind}" cx="${esc(sp.x)}" cy="${esc(sp.y)}" r="${r}" />`,
    );
    if (item.label) {
      const anchor = sp.x > f.width - 70 ? 'end' : 'start';
      const dx = anchor === 'end' ? -8 : 8;
      parts.push(
        `<text class="v-label" x="${esc(sp.x + dx)}" y="${esc(sp.y - 7)}" text-anchor="${anchor}">${item.label}</text>`,
      );
    }
  }
  return parts.join('');
}

export function segmentMarkup(f: PlaneFrame, a: Pt, b: Pt, dashed = false): string {
  const p = f.project(a);
  const q = f.project(b);
  const cls = dashed ? 'v-seg v-seg-dashed' : 'v-seg';
  return `<line class="${cls}" x1="${esc(p.x)}" y1="${esc(p.y)}" x2="${esc(q.x)}" y2="${esc(q.y)}" />`;
}

export function polylineMarkup(f: PlaneFrame, pts: Pt[], close = false): string {
  if (pts.length === 0) return '';
  const d =
    pts
      .map((pt, i) => {
        const sp = f.project(pt);
        return `${i === 0 ? 'M' : 'L'}${esc(sp.x)} ${esc(sp.y)}`;
      })
      .join(' ') + (close ? ' Z' : '');
  return `<path class="v-path" d="${d}" />`;
}

/** Part of the line y = m x + b that lies inside the viewport, or null. */
export function clippedLineEndpoints(f: PlaneFrame, l: LineMB): [Pt, Pt] | null {
  let lo = f.xMin;
  let hi = f.xMax;
  if (Math.abs(l.m) < EPS) {
    if (l.b < f.yMin || l.b > f.yMax) return null;
  } else if (l.m > 0) {
    lo = Math.max(lo, (f.yMin - l.b) / l.m);
    hi = Math.min(hi, (f.yMax - l.b) / l.m);
  } else {
    lo = Math.max(lo, (f.yMax - l.b) / l.m);
    hi = Math.min(hi, (f.yMin - l.b) / l.m);
  }
  if (hi < lo - EPS) return null;
  return [
    { x: lo, y: lineY(l, lo) },
    { x: hi, y: lineY(l, hi) },
  ];
}

export function lineMarkup(f: PlaneFrame, l: LineMB, cls = 'v-line'): string {
  const ends = clippedLineEndpoints(f, l);
  if (!ends) return '';
  const p = f.project(ends[0]);
  const q = f.project(ends[1]);
  return `<line class="${cls}" x1="${esc(p.x)}" y1="${esc(p.y)}" x2="${esc(q.x)}" y2="${esc(q.y)}" />`;
}

export function circleMarkup(f: PlaneFrame, c: Pt, r: number, cls = 'v-circle'): string {
  const sp = f.project(c);
  const edge = f.project({ x: c.x + r, y: c.y });
  const rp = Math.abs(edge.x - sp.x);
  return `<circle class="${cls}" cx="${esc(sp.x)}" cy="${esc(sp.y)}" r="${esc(rp)}" />`;
}

export function diskMarkup(f: PlaneFrame, c: Pt, r: number, cls = 'v-disk'): string {
  const sp = f.project(c);
  const edge = f.project({ x: c.x + r, y: c.y });
  const rp = Math.abs(edge.x - sp.x);
  return `<circle class="${cls}" cx="${esc(sp.x)}" cy="${esc(sp.y)}" r="${esc(rp)}" />`;
}

/** Dashed horizontal/vertical legs of the right triangle on AB plus the segment. */
export function distanceMarkup(f: PlaneFrame, a: Pt, b: Pt): string {
  const corner: Pt = { x: b.x, y: a.y };
  const parts: string[] = [];
  parts.push(segmentMarkup(f, a, corner, true));
  parts.push(segmentMarkup(f, corner, b, true));
  parts.push(segmentMarkup(f, a, b, false));
  const mid = f.project({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const anchor = mid.x > f.width - 70 ? 'end' : 'start';
  parts.push(
    `<text class="v-label v-label-dist" x="${esc(mid.x + (anchor === 'end' ? -8 : 8))}" y="${esc(mid.y - 6)}" text-anchor="${anchor}">AB</text>`,
  );
  return parts.join('');
}

/** Line AB with an interior/exterior division point P emphasised. */
export function divisionMarkup(f: PlaneFrame, a: Pt, b: Pt, p: Pt): string {
  return [segmentMarkup(f, a, b, false), pointsMarkup(f, [{ p, kind: 'division' }])].join('');
}

/** Shade the half-plane y <= m x + b ('le') or y >= m x + b ('ge'). */
export function halfPlaneMarkup(f: PlaneFrame, l: LineMB, relation: 'le' | 'ge'): string {
  const yAt = (x: number): number => clamp(lineY(l, x), f.yMin, f.yMax);
  const edge = relation === 'le' ? f.yMin : f.yMax;
  const e1 = f.project({ x: f.xMin, y: edge });
  const e2 = f.project({ x: f.xMax, y: edge });
  const l2 = f.project({ x: f.xMax, y: yAt(f.xMax) });
  const l1 = f.project({ x: f.xMin, y: yAt(f.xMin) });
  const d = `M${esc(e1.x)} ${esc(e1.y)} L${esc(e2.x)} ${esc(e2.y)} L${esc(l2.x)} ${esc(l2.y)} L${esc(l1.x)} ${esc(l1.y)} Z`;
  return `<path class="v-region" d="${d}" />`;
}

/** Points where a line meets a circle, for the circle–line visual. */
export function intersectionMarkup(f: PlaneFrame, center: Pt, r: number, l: LineMB): string {
  return pointsMarkup(
    f,
    lineCircleIntersections(center, r, l).map((p) => ({ p, kind: 'dot' as const })),
  );
}

/** A labelled test point coloured by whether it satisfies the region. */
export function testPointMarkup(f: PlaneFrame, p: Pt, ok: boolean): string {
  const sp = f.project(p);
  const cls = ok ? 'v-point v-point-yes' : 'v-point v-point-no';
  const anchor = sp.x > f.width - 70 ? 'end' : 'start';
  const dx = anchor === 'end' ? -8 : 8;
  return [
    `<circle class="${cls}" cx="${esc(sp.x)}" cy="${esc(sp.y)}" r="4.6" />`,
    `<text class="v-label" x="${esc(sp.x + dx)}" y="${esc(sp.y - 7)}" text-anchor="${anchor}">P</text>`,
  ].join('');
}

export interface RegionSceneOptions {
  line: LineMB;
  relation: 'le' | 'ge';
  strict?: boolean;
  test?: Pt | null;
}

/** Composite scene for the region visual: half-plane shade, boundary, test point. */
export function regionSceneMarkup(f: PlaneFrame, opts: RegionSceneOptions): string {
  const parts: string[] = [];
  parts.push(halfPlaneMarkup(f, opts.line, opts.relation));
  parts.push(
    lineMarkup(f, opts.line, opts.strict ? 'v-boundary v-boundary-dashed' : 'v-boundary'),
  );
  if (opts.test) {
    const ok =
      opts.relation === 'le'
        ? lineY(opts.line, opts.test.x) >= opts.test.y
        : lineY(opts.line, opts.test.x) <= opts.test.y;
    parts.push(testPointMarkup(f, opts.test, ok));
  }
  return parts.join('');
}

/** Right-triangle "run 1 / rise m" on a line, when it fits in the viewport. */
export function slopeTriangleMarkup(f: PlaneFrame, l: LineMB): string {
  let startX: number | null = null;
  for (let x = f.xMin + 0.5; x <= f.xMax - 1.5 + EPS; x += 0.25) {
    const y0 = lineY(l, x);
    const y1 = lineY(l, x + 1);
    if (y0 >= f.yMin && y0 <= f.yMax && y1 >= f.yMin && y1 <= f.yMax) {
      startX = x;
      break;
    }
  }
  if (startX === null) return '';
  const y0 = lineY(l, startX);
  const y1 = lineY(l, startX + 1);
  const a = f.project({ x: startX, y: y0 });
  const c = f.project({ x: startX + 1, y: y0 });
  const b = f.project({ x: startX + 1, y: y1 });
  const parts: string[] = [];
  parts.push(`<line class="v-run" x1="${esc(a.x)}" y1="${esc(a.y)}" x2="${esc(c.x)}" y2="${esc(c.y)}" />`);
  parts.push(`<line class="v-rise" x1="${esc(c.x)}" y1="${esc(c.y)}" x2="${esc(b.x)}" y2="${esc(b.y)}" />`);
  parts.push(
    `<text class="v-label v-label-run" x="${esc((a.x + c.x) / 2)}" y="${esc(c.y + (y1 > y0 ? 15 : -6))}" text-anchor="middle">1</text>`,
  );
  parts.push(
    `<text class="v-label v-label-rise" x="${esc(c.x + (y1 > y0 ? 6 : -6))}" y="${esc((c.y + b.y) / 2 + 4)}" text-anchor="${y1 > y0 ? 'start' : 'end'}">${fmtSlope(l.m)}</text>`,
  );
  return parts.join('');
}

function fmtSlope(m: number): string {
  return Math.abs(m) < EPS ? '0' : String(Math.round(m * 1000) / 1000);
}

export interface LineSceneOptions {
  lines: { l: LineMB; cls?: string }[];
  slopeTriangle?: LineMB | null;
  points?: ScenePoint[];
}

/** Composite scene for the line visual: lines, optional slope triangle, points. */
export function lineSceneMarkup(f: PlaneFrame, opts: LineSceneOptions): string {
  const parts: string[] = [];
  for (const item of opts.lines) {
    parts.push(lineMarkup(f, item.l, item.cls ?? 'v-line'));
  }
  if (opts.slopeTriangle) parts.push(slopeTriangleMarkup(f, opts.slopeTriangle));
  if (opts.points && opts.points.length > 0) parts.push(pointsMarkup(f, opts.points));
  return parts.join('');
}

export interface CircleSceneOptions {
  center: Pt;
  r: number;
  line?: LineMB | null;
  showIntersections?: boolean;
  showRadius?: boolean;
  shade?: 'none' | 'in' | 'out';
  boundary?: 'solid' | 'dashed';
  points?: ScenePoint[];
}

/** Fill everything outside a circle within the plot frame (even-odd rule). */
export function exteriorDiskMarkup(f: PlaneFrame, center: Pt, r: number): string {
  const sp = f.project(center);
  const edge = f.project({ x: center.x + r, y: center.y });
  const rp = Math.abs(edge.x - sp.x);
  const x0 = f.pad.left;
  const y0 = f.pad.top;
  const x1 = f.width - f.pad.right;
  const y1 = f.height - f.pad.bottom;
  const d =
    `M${esc(x0)} ${esc(y0)} H${esc(x1)} V${esc(y1)} H${esc(x0)} Z ` +
    `M${esc(sp.x + rp)} ${esc(sp.y)} A${esc(rp)} ${esc(rp)} 0 1 1 ${esc(sp.x - rp)} ${esc(sp.y)} ` +
    `A${esc(rp)} ${esc(rp)} 0 1 1 ${esc(sp.x + rp)} ${esc(sp.y)} Z`;
  return `<path class="v-disk-out" d="${d}" fill-rule="evenodd" />`;
}

/** Composite scene for the circle visual: circle, radius, optional line. */
export function circleSceneMarkup(f: PlaneFrame, opts: CircleSceneOptions): string {
  const parts: string[] = [];
  const circleCls = opts.boundary === 'dashed' ? 'v-circle v-circle-dashed' : 'v-circle';
  if (opts.shade === 'in') parts.push(diskMarkup(f, opts.center, opts.r, 'v-disk'));
  if (opts.shade === 'out') parts.push(exteriorDiskMarkup(f, opts.center, opts.r));
  parts.push(circleMarkup(f, opts.center, opts.r, circleCls));
  if (opts.showRadius) {
    const sp = f.project(opts.center);
    const edge = f.project({ x: opts.center.x + opts.r, y: opts.center.y });
    parts.push(
      `<line class="v-radius" x1="${esc(sp.x)}" y1="${esc(sp.y)}" x2="${esc(edge.x)}" y2="${esc(edge.y)}" />`,
    );
    parts.push(
      `<text class="v-label v-label-dist" x="${esc((sp.x + edge.x) / 2)}" y="${esc(sp.y - 7)}" text-anchor="middle">r</text>`,
    );
  }
  if (opts.line) {
    parts.push(lineMarkup(f, opts.line, 'v-line'));
    if (opts.showIntersections) {
      parts.push(intersectionMarkup(f, opts.center, opts.r, opts.line));
    }
  }
  parts.push(pointsMarkup(f, [{ p: opts.center, kind: 'dot' }, ...(opts.points ?? [])]));
  return parts.join('');
}
