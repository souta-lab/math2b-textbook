import type { BinomialFrame, NormalFrame } from './statistics-math';

const esc = (n: number): string => String(n);

/**
 * Dynamic layer of a normal curve: the shaded region is replaced by setting
 * the path's `d`, and this markup refreshes the marker. Recomputed on every
 * slider move and injected with `innerHTML`, mirroring the trig-graph pattern.
 */
export function normalMarkerMarkup(f: NormalFrame): string {
  if (!f.marker) return '';
  const { x, y, value } = f.marker;
  const label = `z = ${Math.round(value * 100) / 100}`;
  const labelY = y < f.plot.y + 24 ? y + 20 : y - 10;
  return [
    `<line class="v-normal-guide" x1="${esc(x)}" y1="${esc(f.baseY)}" x2="${esc(x)}" y2="${esc(y)}" />`,
    `<circle class="v-normal-halo" cx="${esc(x)}" cy="${esc(y)}" r="9" />`,
    `<circle class="v-normal-marker" cx="${esc(x)}" cy="${esc(y)}" r="5" />`,
    `<text class="v-normal-marker-text" x="${esc(x)}" y="${esc(labelY)}" text-anchor="middle">${label}</text>`,
  ].join('');
}

/**
 * Dynamic layer of a binomial bar chart: stems/bars plus the mean line and the
 * μ ± σ band. Rebuilt whenever p (or n) changes.
 */
export function binomialDynamicMarkup(f: BinomialFrame, highlight?: number | null): string {
  const parts: string[] = [];

  if (f.sdBand) {
    const x = Math.min(f.sdBand.x1, f.sdBand.x2);
    const w = Math.abs(f.sdBand.x2 - f.sdBand.x1);
    parts.push(`<rect class="v-bin-band" x="${esc(x)}" y="${esc(f.plot.y)}" width="${esc(w)}" height="${esc(f.baseY - f.plot.y)}" />`);
  }

  for (const bar of f.bars) {
    const hinted = highlight != null && bar.k === Math.round(highlight) ? ' is-hinted' : '';
    parts.push(
      `<rect class="v-bin-bar${hinted}" x="${esc(bar.x)}" y="${esc(bar.y)}" width="${esc(bar.w)}" height="${esc(bar.h)}" />`,
    );
  }

  parts.push(
    `<line class="v-bin-mean" x1="${esc(f.meanX)}" y1="${esc(f.plot.y)}" x2="${esc(f.meanX)}" y2="${esc(f.baseY)}" />`,
  );
  parts.push(
    `<text class="v-bin-mean-text" x="${esc(f.meanX)}" y="${esc(f.plot.y - 7)}" text-anchor="middle">${f.meanLabel}</text>`,
  );

  return parts.join('');
}
