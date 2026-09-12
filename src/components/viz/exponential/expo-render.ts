/**
 * SVG markup builders for the dynamic parts of the exponential/log graphs.
 *
 * The server render and the client hydration both call these, so a base or t
 * change repaints exactly the same nodes the static figure started with.
 * Class names mirror the TrigGraph / UnitCircle conventions.
 */
import type { ExpLogFrame, ReflectionFrame } from './expo-math';

const esc = (n: number): string => String(n);

/** Curve, anchor guide and moving key point of a single exp/log graph. */
export function expGraphDynamicMarkup(f: ExpLogFrame): string {
  const parts: string[] = [];
  if (f.valid && f.curve) {
    parts.push(`<path class="v-curve" d="${f.curve}" />`);
  }
  if (f.keyGuide) {
    parts.push(
      `<line class="v-guide" x1="${esc(f.keyGuide.x1)}" y1="${esc(f.keyGuide.y1)}" x2="${esc(f.keyGuide.x2)}" y2="${esc(f.keyGuide.y2)}" />`,
    );
  }
  if (f.keyPoint) {
    parts.push(`<circle class="v-marker" cx="${esc(f.keyPoint.x)}" cy="${esc(f.keyPoint.y)}" r="4.5" />`);
  }
  return parts.join('');
}

/** Mirror segment and the two reflected points of the inverse visualization. */
export function reflectionDynamicMarkup(f: ReflectionFrame): string {
  const parts: string[] = [];
  if (f.mirrorSegment) {
    parts.push(
      `<line class="v-mirror" x1="${esc(f.mirrorSegment.x1)}" y1="${esc(f.mirrorSegment.y1)}" x2="${esc(f.mirrorSegment.x2)}" y2="${esc(f.mirrorSegment.y2)}" />`,
    );
  }
  if (f.pointExp) {
    parts.push(`<circle class="v-point-exp" cx="${esc(f.pointExp.x)}" cy="${esc(f.pointExp.y)}" r="4.8" />`);
  }
  if (f.pointLog) {
    parts.push(`<circle class="v-point-log" cx="${esc(f.pointLog.x)}" cy="${esc(f.pointLog.y)}" r="4.8" />`);
  }
  return parts.join('');
}
