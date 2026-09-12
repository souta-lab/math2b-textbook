import type { TrigGraphFrame, UnitCircleFrame } from './viz-math';

export interface UnitCircleOptions {
  showSin: boolean;
  showCos: boolean;
  showTan: boolean;
}

const esc = (n: number): string => String(n);

export function unitCircleDynamicMarkup(f: UnitCircleFrame, o: UnitCircleOptions): string {
  const parts: string[] = [];

  if (o.showTan) {
    parts.push(
      `<line class="v-tan-line" x1="${esc(f.tanLine.x1)}" y1="${esc(f.tanLine.y1)}" x2="${esc(f.tanLine.x2)}" y2="${esc(f.tanLine.y2)}" />`,
    );
  }
  if (f.arc) {
    parts.push(`<path class="v-arc" d="${f.arc.d}" />`);
    parts.push(`<path class="v-arc-head" d="${f.arc.head}" />`);
  }
  if (o.showCos && f.cosSeg) {
    parts.push(
      `<line class="v-cos" x1="${esc(f.cosSeg.x1)}" y1="${esc(f.cosSeg.y1)}" x2="${esc(f.cosSeg.x2)}" y2="${esc(f.cosSeg.y2)}" />`,
    );
  }
  if (o.showSin && f.sinSeg) {
    parts.push(
      `<line class="v-sin" x1="${esc(f.sinSeg.x1)}" y1="${esc(f.sinSeg.y1)}" x2="${esc(f.sinSeg.x2)}" y2="${esc(f.sinSeg.y2)}" />`,
    );
  }
  if (o.showTan && f.tanSeg) {
    parts.push(
      `<line class="v-tan" x1="${esc(f.tanSeg.x1)}" y1="${esc(f.tanSeg.y1)}" x2="${esc(f.tanSeg.x2)}" y2="${esc(f.tanSeg.y2)}" />`,
    );
  }
  if (o.showTan && f.tanEnd) {
    parts.push(`<circle class="v-tan-dot" cx="${esc(f.tanEnd.x)}" cy="${esc(f.tanEnd.y)}" r="3.2" />`);
  }

  parts.push(
    `<line class="v-radius" x1="${esc(f.radiusLine.x1)}" y1="${esc(f.radiusLine.y1)}" x2="${esc(f.radiusLine.x2)}" y2="${esc(f.radiusLine.y2)}" />`,
  );
  parts.push(`<circle class="v-point" cx="${esc(f.point.x)}" cy="${esc(f.point.y)}" r="4.5" />`);

  if (o.showSin && f.sinLabel) {
    parts.push(
      `<text class="v-label v-label-sin" x="${esc(f.sinLabel.x)}" y="${esc(f.sinLabel.y)}" text-anchor="${f.sinLabel.anchor}">sin θ</text>`,
    );
  }
  if (o.showCos && f.cosLabel) {
    parts.push(
      `<text class="v-label v-label-cos" x="${esc(f.cosLabel.x)}" y="${esc(f.cosLabel.y)}" text-anchor="${f.cosLabel.anchor}">cos θ</text>`,
    );
  }
  if (o.showTan && f.tanLabel) {
    parts.push(
      `<text class="v-label v-label-tan" x="${esc(f.tanLabel.x)}" y="${esc(f.tanLabel.y)}" text-anchor="${f.tanLabel.anchor}">tan θ</text>`,
    );
  }
  parts.push(
    `<text class="v-angle" x="${esc(f.angleLabel.x)}" y="${esc(f.angleLabel.y)}" text-anchor="middle">θ</text>`,
  );

  return parts.join('');
}

export function trigMarkerMarkup(f: TrigGraphFrame): string {
  const parts: string[] = [];
  if (f.guide) {
    parts.push(
      `<line class="v-guide" x1="${esc(f.guide.x1)}" y1="${esc(f.guide.y1)}" x2="${esc(f.guide.x2)}" y2="${esc(f.guide.y2)}" />`,
    );
  }
  if (f.marker) {
    parts.push(`<circle class="v-marker" cx="${esc(f.marker.x)}" cy="${esc(f.marker.y)}" r="4.5" />`);
  }
  return parts.join('');
}

export const UNIT_CIRCLE_INSET = { cx: 70, cy: 70, r: 46 } as const;

/** Dynamic parts of the small unit circle shown next to a linked graph. */
export function unitCircleInsetMarkup(angleDeg: number): string {
  const { cx, cy, r } = UNIT_CIRCLE_INSET;
  const rad = (angleDeg * Math.PI) / 180;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad);
  const sinV = Math.sin(rad);
  const cosV = Math.cos(rad);
  const parts: string[] = [];

  if (Math.abs(cosV) > 0.02) {
    parts.push(
      `<line class="v-in-cos" x1="${cx}" y1="${cy}" x2="${px.toFixed(2)}" y2="${cy}" />`,
    );
  }
  if (Math.abs(sinV) > 0.02) {
    parts.push(
      `<line class="v-in-sin" x1="${px.toFixed(2)}" y1="${cy}" x2="${px.toFixed(2)}" y2="${py.toFixed(2)}" />`,
    );
  }
  parts.push(
    `<line class="v-in-radius" x1="${cx}" y1="${cy}" x2="${px.toFixed(2)}" y2="${py.toFixed(2)}" />`,
  );
  parts.push(
    `<circle class="v-in-point" cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3.4" />`,
  );
  return parts.join('');
}
