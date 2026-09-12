/**
 * Pure mathematics and plot geometry for the 数学と社会生活 unit.
 *
 * Two independent models live here, both deliberately simple enough for 数学I・
 * II・B:
 *   - 料金プランの比較: two piecewise-linear monthly costs. `planCost` and
 *     `planCrossover` answer "which plan is cheaper at this usage?".
 *   - 増加のモデル: a discrete geometric model N_n = N0·(1+r)^n used to discuss
 *     idealisation and its limits.
 *
 * Both the Astro server render and the client hydration script call the same
 * frame builders, so the static SVG and the interactive SVG cannot drift apart.
 * No DOM access here.
 */
import { buildPolylinePath, scaleLinear } from '../../../lib/graph';

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Format a number with up to `dp` decimals, trimming trailing zeros. */
export function formatNumber(value: number, dp = 3): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(Math.max(1, dp));
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '-0' ? '0' : trimmed;
}

/** Format an integer-ish value as a rough Japanese count (e.g. 1,234). */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('ja-JP');
}

// ---------------------------------------------------------------------------
// 料金プランの比較
// ---------------------------------------------------------------------------

/**
 * A monthly phone plan. The first `includedGb` gigabytes are covered by
 * `base`; every additional gigabyte costs `perGb`. A flat plan is `perGb = 0`.
 */
export interface PhonePlan {
  /** 月額の基本料金（円）。 */
  base: number;
  /** 基本料金に含まれるデータ量（GB）。 */
  includedGb: number;
  /** 含まれる量を超えた分の1GBあたりの料金（円）。 */
  perGb: number;
}

/** 従量制のプラン: 基本料金 + 使った分だけ加算。 */
export const PLAN_A: PhonePlan = { base: 1500, includedGb: 0, perGb: 800 };
/** 定額のプラン: いくら使っても月額一定。 */
export const PLAN_B: PhonePlan = { base: 4700, includedGb: 0, perGb: 0 };

/** 月々のデータ使用量 `gb`（GB）に対する1か月の料金（円）。 */
export function planCost(plan: PhonePlan, gb: number): number {
  const usage = Math.max(0, gb);
  const extra = Math.max(0, usage - plan.includedGb);
  return plan.base + extra * plan.perGb;
}

/**
 * The usage (GB) at which two plans cost the same, or `null` if no crossing
 * lies in `[0, maxGb]`. Both plans are piecewise linear, so on each interval
 * between their breakpoints the difference is linear and interpolating the
 * endpoint differences gives the exact root (no numerical search).
 */
export function planCrossover(a: PhonePlan, b: PhonePlan, maxGb = 20): number | null {
  const upper = Math.max(0, maxGb);
  const breaks = [0, upper, Math.min(upper, Math.max(0, a.includedGb)), Math.min(upper, Math.max(0, b.includedGb))];
  const xs = [...new Set(breaks.map(round))].sort((p, q) => p - q);

  const diff = (x: number): number => planCost(a, x) - planCost(b, x);

  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const d0 = diff(x0);
    const d1 = diff(x1);
    if (Math.abs(d0) < 1e-9) return round(x0);
    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      return round(x0 + (0 - d0) * (x1 - x0) / (d1 - d0));
    }
  }
  return Math.abs(diff(upper)) < 1e-9 ? round(upper) : null;
}

export const PLAN_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 60, right: 20, top: 20, bottom: 38 },
  defaultMaxGb: 10,
} as const;

export interface PlanFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroY: number;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  lines: { key: 'A' | 'B'; d: string; endY: number }[];
  crossover: { x: number; y: number; gb: number; yen: number } | null;
  markers: { key: 'A' | 'B'; x: number; y: number; yen: number }[];
  values: {
    usage: number;
    costA: number;
    costB: number;
    cheaper: 'A' | 'B' | 'tie';
    crossover: number | null;
  };
  ariaText: string;
}

/**
 * Project two plan-cost lines over `[0, maxGb]` and mark `usage`. All amounts
 * outside the domain are clamped so the component never throws.
 */
export function planFrame(
  a: PhonePlan,
  b: PhonePlan,
  usage: number,
  maxGb: number = PLAN_GEOM.defaultMaxGb,
): PlanFrame {
  const { width, height, pad } = PLAN_GEOM;
  const upper = Math.max(1, maxGb);
  const current = Math.max(0, Math.min(upper, usage));

  const costA = planCost(a, current);
  const costB = planCost(b, current);

  const top = Math.max(planCost(a, upper), planCost(b, upper), 1);
  const yHi = top * 1.12;

  const xScale = scaleLinear({ domain: [0, upper], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [0, yHi], range: [height - pad.bottom, pad.top] });

  const linePoints = (plan: PhonePlan): { x: number; y: number }[] => [
    { x: round(xScale(0)), y: round(yScale(planCost(plan, 0))) },
    { x: round(xScale(upper)), y: round(yScale(planCost(plan, upper))) },
  ];
  const lineA = linePoints(a);
  const lineB = linePoints(b);

  const crossGb = planCrossover(a, b, upper);
  const crossover =
    crossGb === null
      ? null
      : { x: round(xScale(crossGb)), y: round(yScale(planCost(a, crossGb))), gb: crossGb, yen: planCost(a, crossGb) };

  const markers: PlanFrame['markers'] = [
    { key: 'A', x: round(xScale(current)), y: round(yScale(costA)), yen: costA },
    { key: 'B', x: round(xScale(current)), y: round(yScale(costB)), yen: costB },
  ];

  const xStep = upper <= 10 ? 1 : Math.ceil(upper / 10);
  const xTicks: { x: number; label: string }[] = [];
  for (let gb = 0; gb <= upper; gb += xStep) {
    xTicks.push({ x: round(xScale(gb)), label: String(gb) });
  }

  const yStep = niceStep(yHi);
  const yTicks: { y: number; label: string }[] = [];
  for (let v = 0; v <= yHi + yStep * 1e-9; v += yStep) {
    yTicks.push({ y: round(yScale(v)), label: formatCount(v) });
    if (yTicks.length > 12) break;
  }

  const cheaper: 'A' | 'B' | 'tie' =
    Math.abs(costA - costB) < 1e-9 ? 'tie' : costA < costB ? 'A' : 'B';
  const cheaperText = cheaper === 'tie' ? 'どちらも同じ' : `プラン${cheaper}が安い`;

  return {
    width,
    height,
    plot: { x: pad.left, y: pad.top, width: width - pad.left - pad.right, height: height - pad.top - pad.bottom },
    zeroY: round(yScale(0)),
    xTicks,
    yTicks,
    lines: [
      { key: 'A', d: buildPolylinePath(lineA), endY: lineA[1].y },
      { key: 'B', d: buildPolylinePath(lineB), endY: lineB[1].y },
    ],
    crossover,
    markers,
    values: {
      usage: round(current),
      costA,
      costB,
      cheaper,
      crossover: crossGb,
    },
    ariaText:
      `使用量 ${formatNumber(current)} GB のとき、プランA は ${formatCount(costA)} 円、` +
      `プランB は ${formatCount(costB)} 円。${cheaperText}。`,
  };
}

/** Choose a 1 / 2 / 5 × 10^k step covering `span` in roughly 5 ticks. */
function niceStep(span: number, target = 5): number {
  if (!(span > 0)) return 1;
  const raw = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// ---------------------------------------------------------------------------
// 増加のモデル
// ---------------------------------------------------------------------------

export interface GrowthParams {
  /** はじめの人数 N0。 */
  n0: number;
  /** 1ステップあたりの増加率（0.2 なら毎回 1.2 倍）。 */
  rate: number;
  /** 比較用のもう1つの増加率。 */
  altRate: number;
  /** 何ステップ先まで描くか。 */
  maxYear: number;
}

export const DEFAULT_GROWTH: GrowthParams = { n0: 1, rate: 0.2, altRate: 0.3, maxYear: 30 };

/** N_n = N0·(1 + rate)^n — 等比（指数）モデル。 */
export function growthValue(n0: number, rate: number, n: number): number {
  if (!Number.isFinite(n)) return Number.NaN;
  return n0 * Math.pow(1 + rate, n);
}

export const GROWTH_GEOM = {
  width: 480,
  height: 300,
  pad: { left: 60, right: 20, top: 20, bottom: 38 },
  maxSteps: 40,
} as const;

export interface GrowthFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  zeroY: number;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  main: { d: string; points: { n: number; value: number; x: number; y: number }[] };
  alt: { d: string; points: { n: number; value: number; x: number; y: number }[] };
  cap: { y: number; label: string } | null;
  marker: {
    x: number;
    mainY: number;
    altY: number;
    main: number;
    alt: number;
  } | null;
  values: { year: number; main: string; alt: string; ratio: string };
  ariaText: string;
}

/**
 * Project the geometric model and an alternative rate onto one frame, mark
 * `year`, and optionally draw a capacity line to make "the model ignores the
 * ceiling" visible.
 */
export function growthFrame(p: GrowthParams, year: number, cap?: number): GrowthFrame {
  const { width, height, pad, maxSteps } = GROWTH_GEOM;
  const count = Math.max(2, Math.min(maxSteps, Math.floor(p.maxYear)));
  const current = Math.max(0, Math.min(count, Math.round(year)));

  const series = (rate: number): { n: number; value: number }[] => {
    const out: { n: number; value: number }[] = [];
    for (let n = 0; n <= count; n += 1) out.push({ n, value: growthValue(p.n0, rate, n) });
    return out;
  };
  const mainRaw = series(p.rate);
  const altRaw = series(p.altRate);

  const finite = [...mainRaw, ...altRaw].map((e) => e.value).filter((v) => Number.isFinite(v));
  const maxValue = Math.max(0, ...finite, cap ?? 0);
  const yHi = maxValue > 0 ? maxValue * 1.12 : 1;

  const xScale = scaleLinear({ domain: [0, count], range: [pad.left, width - pad.right] });
  const yScale = scaleLinear({ domain: [0, yHi], range: [height - pad.bottom, pad.top] });

  const project = (raw: { n: number; value: number }[]) =>
    raw.map((e) => ({ n: e.n, value: e.value, x: round(xScale(e.n)), y: round(yScale(e.value)) }));

  const main = project(mainRaw);
  const alt = project(altRaw);

  const stepX = count <= 10 ? 1 : Math.ceil(count / 10);
  const xTicks: { x: number; label: string }[] = [];
  for (let n = 0; n <= count; n += stepX) xTicks.push({ x: round(xScale(n)), label: String(n) });

  const yStep = niceStep(yHi);
  const yTicks: { y: number; label: string }[] = [];
  for (let v = 0; v <= yHi + yStep * 1e-9; v += yStep) {
    yTicks.push({ y: round(yScale(v)), label: formatCount(v) });
    if (yTicks.length > 10) break;
  }

  const mainValue = growthValue(p.n0, p.rate, current);
  const altValue = growthValue(p.n0, p.altRate, current);
  const ratio = mainValue > 0 ? altValue / mainValue : Number.NaN;

  return {
    width,
    height,
    plot: { x: pad.left, y: pad.top, width: width - pad.left - pad.right, height: height - pad.top - pad.bottom },
    zeroY: round(yScale(0)),
    xTicks,
    yTicks,
    main: { d: buildPolylinePath(main), points: main },
    alt: { d: buildPolylinePath(alt), points: alt },
    cap:
      cap && cap > 0
        ? { y: round(yScale(cap)), label: `上限 ${formatCount(cap)}` }
        : null,
    marker: {
      x: round(xScale(current)),
      mainY: round(yScale(mainValue)),
      altY: round(yScale(altValue)),
      main: mainValue,
      alt: altValue,
    },
    values: {
      year: current,
      main: formatCount(mainValue),
      alt: formatCount(altValue),
      ratio: formatNumber(ratio, 2),
    },
    ariaText:
      `${current} ステップ後、増加率 ${formatNumber(p.rate * 100)}% のモデルでは ${formatCount(mainValue)} 人、` +
      `増加率 ${formatNumber(p.altRate * 100)}% のモデルでは ${formatCount(altValue)} 人。` +
      `後者は前者の約 ${formatNumber(ratio, 2)} 倍。`,
  };
}
