/**
 * Pure mathematics for the いろいろな式 unit visualizations.
 *
 * The binomial coefficients of (a+b)^n live in Pascal's triangle: row n holds
 * C(n, 0..n); the discriminant D = b² − 4ac decides how many times the
 * parabola y = ax² + bx + c meets the x-axis. All helpers are DOM-free so the
 * Astro server render and the unit tests share exactly the same numbers.
 * No DOM access here.
 */

/**
 * Binomial coefficients C(n, 0..n) as a single row, e.g. C(3, k) = [1, 3, 3, 1].
 *
 * Uses the recurrence C(n, k) = C(n, k-1) * (n-k+1) / k, so every value stays
 * an exact integer well beyond the textbook's range. Returns an empty array
 * for non-integer or negative n; callers never get NaN entries.
 */
export function pascalRow(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) return [];
  const row: number[] = new Array<number>(n + 1);
  let value = 1;
  for (let k = 0; k <= n; k++) {
    row[k] = value;
    value = (value * (n - k)) / (k + 1);
  }
  return row;
}

/**
 * Rows 0..rows-1 of Pascal's triangle, e.g. `pascalRows(3)` gives
 * `[[1], [1, 1], [1, 2, 1]]`. Returns an empty triangle for non-positive or
 * non-integer counts.
 */
export function pascalRows(rows: number): number[][] {
  if (!Number.isInteger(rows) || rows <= 0) return [];
  const triangle: number[][] = [];
  for (let n = 0; n < rows; n++) triangle.push(pascalRow(n));
  return triangle;
}

/** Format one binomial coefficient for display: 1, 10, 252, … (never 1e+21). */
export function formatCoefficient(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

/** Format a whole row of coefficients as a display string, e.g. "1, 3, 3, 1". */
export function formatCoefficientRow(row: readonly number[]): string {
  return row.map(formatCoefficient).join(', ');
}

/* ------------------------------------------------------------------ *
 * Quadratic discriminant and parabola sampling
 * ------------------------------------------------------------------ */

/** One sampled point of a parabola, in mathematical coordinates. */
export interface ParabolaPoint {
  x: number;
  y: number;
}

/**
 * Discriminant D = b² − 4ac of ax² + bx + c.
 *
 * D > 0: two distinct real roots, D = 0: one repeated root, D < 0: none.
 * This is the same quantity under the square root in the quadratic formula.
 */
export function discriminant(a: number, b: number, c: number): number {
  return b * b - 4 * a * c;
}

/**
 * Sample y = ax² + bx + c over [xMin, xMax] into `steps + 1` points.
 *
 * The endpoints are always included, so the first point is exactly
 * `{ x: xMin, y: axMin² + bxMin + c }` and the last exactly at `xMax`. A
 * non-finite or non-positive step count falls back to a single segment rather
 * than returning NaN entries. Pure: no DOM, safe for SSR and tests.
 */
export function sampleParabola(
  a: number,
  b: number,
  c: number,
  xMin: number,
  xMax: number,
  steps: number,
): ParabolaPoint[] {
  const n = Number.isFinite(steps) && steps >= 1 ? Math.floor(steps) : 1;
  const points: ParabolaPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    points.push({ x, y: a * x * x + b * x + c });
  }
  return points;
}
