import type { SequenceFrame } from './sequences-math';

const esc = (n: number): string => String(n);

/**
 * The dynamic layer of a sequence plot: a guide from the axis to the current
 * point, a halo that marks it without relying on colour alone, the point
 * itself, and its value. Recomputed on every slider move and injected with
 * `innerHTML`, mirroring the trig-graph pattern.
 */
export function sequenceDynamicMarkup(f: SequenceFrame): string {
  if (!f.marker) return '';
  const { x, y } = f.marker;
  const above = y < f.zeroY;
  const labelY = above ? y - 11 : y + 19;
  const value = f.values.mode === 'sum' ? f.values.sum : f.values.term;
  const label = `${f.values.symbol}${f.values.n} = ${value}`;

  return [
    `<line class="v-seq-guide" x1="${esc(x)}" y1="${esc(f.zeroY)}" x2="${esc(x)}" y2="${esc(y)}" />`,
    `<circle class="v-seq-halo" cx="${esc(x)}" cy="${esc(y)}" r="9" />`,
    `<circle class="v-seq-marker" cx="${esc(x)}" cy="${esc(y)}" r="5" />`,
    `<text class="v-seq-marker-text" x="${esc(x)}" y="${esc(labelY)}" text-anchor="middle">${label}</text>`,
  ].join('');
}
