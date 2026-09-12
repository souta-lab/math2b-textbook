import type { AreaFrame, AreaRect, Segment, TangentFrame } from './calculus-math';

const esc = (n: number): string => String(n);

function lineMarkup(className: string, s: Segment): string {
  return `<line class="${className}" x1="${esc(s.x1)}" y1="${esc(s.y1)}" x2="${esc(s.x2)}" y2="${esc(s.y2)}" />`;
}

/** Dynamic parts of the secant → tangent figure. */
export function tangentDynamicMarkup(frame: TangentFrame): string {
  const parts: string[] = [];

  if (frame.secant) parts.push(lineMarkup('v-secant', frame.secant));
  if (frame.tangent) parts.push(lineMarkup('v-tangent', frame.tangent));

  if (frame.triangle) {
    parts.push(lineMarkup('v-delta-x', frame.triangle.dx));
    parts.push(lineMarkup('v-delta-y', frame.triangle.dy));
  }

  parts.push(`<circle class="v-point-a" cx="${esc(frame.pointA.x)}" cy="${esc(frame.pointA.y)}" r="4.6" />`);
  if (frame.pointB) {
    parts.push(`<circle class="v-point-b" cx="${esc(frame.pointB.x)}" cy="${esc(frame.pointB.y)}" r="4.6" />`);
  }

  parts.push(
    `<text class="v-line-label" x="${esc(frame.tangentLabel.x)}" y="${esc(frame.tangentLabel.y)}" text-anchor="end">接線</text>`,
  );
  if (frame.secantLabel) {
    parts.push(
      `<text class="v-line-label v-line-label--secant" x="${esc(frame.secantLabel.x)}" y="${esc(frame.secantLabel.y)}" text-anchor="end">割線</text>`,
    );
  }

  return parts.join('');
}

function rectMarkup(rect: AreaRect): string {
  return `<rect class="v-riemann" x="${esc(rect.x)}" y="${esc(rect.y)}" width="${esc(rect.width)}" height="${esc(rect.height)}" />`;
}

/** Dynamic parts of the area-under-curve figure: the region and its rectangles. */
export function areaDynamicMarkup(frame: AreaFrame): string {
  const parts: string[] = [`<path class="v-region" d="${frame.region}" />`];
  for (const rect of frame.rects) parts.push(rectMarkup(rect));
  return parts.join('');
}
