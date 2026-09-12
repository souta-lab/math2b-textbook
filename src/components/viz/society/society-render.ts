import { formatCount, type GrowthFrame, type PlanFrame } from './society-math';

const esc = (n: number): string => String(n);

/**
 * The dynamic layer of the plan comparison: one guide at the current usage and
 * a labelled point for each plan. Recomputed on every slider move and injected
 * with `innerHTML`, mirroring the sequence-plot pattern. Labels sit above plan
 * A and below plan B so that they do not collide at the crossover.
 */
export function planDynamicMarkup(f: PlanFrame): string {
  if (f.markers.length === 0) return '';
  const parts: string[] = [];
  const usageX = f.markers[0].x;
  const topY = Math.min(...f.markers.map((marker) => marker.y));

  parts.push(
    `<line class="v-soc-guide" x1="${esc(usageX)}" y1="${esc(f.zeroY)}" x2="${esc(usageX)}" y2="${esc(topY)}" />`,
  );

  for (const marker of f.markers) {
    const above = marker.key === 'A';
    const labelY = above ? marker.y - 12 : marker.y + 20;
    const prefix = marker.key === 'A' ? 'A' : 'B';
    parts.push(
      `<circle class="v-soc-halo v-soc-halo--${marker.key.toLowerCase()}" cx="${esc(marker.x)}" cy="${esc(marker.y)}" r="9" />`,
      `<circle class="v-soc-marker v-soc-marker--${marker.key.toLowerCase()}" cx="${esc(marker.x)}" cy="${esc(marker.y)}" r="5" />`,
      `<text class="v-soc-marker-text v-soc-marker-text--${marker.key.toLowerCase()}" x="${esc(marker.x)}" y="${esc(labelY)}" text-anchor="middle">${prefix} ${formatCount(marker.yen)}円</text>`,
    );
  }

  return parts.join('');
}

/**
 * The dynamic layer of the growth model: a vertical step marker on each curve
 * with its value. The two rates are drawn to the same scale so the widening gap
 * is the visual message.
 */
export function growthDynamicMarkup(f: GrowthFrame): string {
  if (!f.marker) return '';
  const { x, mainY, altY } = f.marker;

  return [
    `<line class="v-soc-guide" x1="${esc(x)}" y1="${esc(f.zeroY)}" x2="${esc(x)}" y2="${esc(mainY)}" />`,
    `<circle class="v-soc-halo v-soc-halo--a" cx="${esc(x)}" cy="${esc(mainY)}" r="9" />`,
    `<circle class="v-soc-marker v-soc-marker--a" cx="${esc(x)}" cy="${esc(mainY)}" r="5" />`,
    `<text class="v-soc-marker-text v-soc-marker-text--a" x="${esc(x)}" y="${esc(mainY - 12)}" text-anchor="middle">${f.values.main}</text>`,
    `<circle class="v-soc-halo v-soc-halo--b" cx="${esc(x)}" cy="${esc(altY)}" r="9" />`,
    `<circle class="v-soc-marker v-soc-marker--b" cx="${esc(x)}" cy="${esc(altY)}" r="5" />`,
    `<text class="v-soc-marker-text v-soc-marker-text--b" x="${esc(x)}" y="${esc(altY - 12)}" text-anchor="middle">${f.values.alt}</text>`,
  ].join('');
}
