/**
 * Curriculum concept graph for 数学II・数学B (current 平成30年告示 curriculum).
 *
 * This is a *schema*, not a UI deliverable. Unit nodes and prerequisite edges
 * exist so lessons can declare/validate prerequisites and the course map can
 * show how units depend on each other as content is added over time.
 *
 * Prerequisite edges incorporate an instructional-design review:
 *  - 三角関数 depends on 図形と方程式 (coordinate plane / circle for the unit circle).
 *  - 微分・積分 depends on 図形と方程式 (tangent lines, coordinate geometry).
 *  - 指数関数・対数関数 depends on 二次関数 (function/graph concept).
 *  - 数列 does NOT depend on 場合の数と確率 (that link is only 発展: 確率漸化式).
 *  - 数学と社会生活 is a capstone following 統計的な推測.
 *
 * Source for scope: MEXT 学習指導要領解説 数学編 理数編 (平成30年告示).
 * ベクトル is in 数学C, not 数学B.
 */

export type Subject = '数学I' | '数学A' | '数学II' | '数学B' | '数学C';
export type UnitStatus = 'published' | 'draft' | 'planned';

/** A prerequisite concept taught in a prior subject (not yet a unit here). */
export interface ExternalConcept {
  id: string;
  label: string;
}

/** A unit (章) of the textbook. Lessons attach to a unit via frontmatter. */
export interface Unit {
  id: string;
  subject: Subject;
  title: string;
  summary: string;
  /** Prerequisite ids: other unit ids or external concept ids. */
  prerequisites: string[];
  status: UnitStatus;
  /** Display order within the subject. */
  order: number;
  /** Directory under src/content/lessons/ holding this unit's lesson MDX files. */
  lessonDir: string;
}

/** Concepts from 数学I/A that this textbook assumes. */
export const externalConcepts: ExternalConcept[] = [
  { id: 'i-expression', label: '数学I 数と式（展開・因数分解・実数・集合と命題）' },
  { id: 'i-quadratic', label: '数学I 二次関数（関数とグラフ）' },
  { id: 'i-trig-ratio', label: '数学I 図形と計量（三角比）' },
  { id: 'i-data', label: '数学I データの分析' },
  { id: 'a-probability', label: '数学A 場合の数と確率' },
];

/**
 * All units of 数学II・B. Only 三角関数 is authored in the vertical slice;
 * the rest are registered as `planned` so the graph is complete and honest
 * about what exists.
 */
export const units: Unit[] = [
  {
    id: 'ii-expressions',
    lessonDir: 'expressions',
    subject: '数学II',
    title: 'いろいろな式',
    summary: '式と証明、高次方程式。複素数まで数の範囲を広げる。',
    prerequisites: ['i-expression', 'i-quadratic'],
    status: 'published',
    order: 1,
  },
  {
    id: 'ii-coordinate',
    lessonDir: 'coordinate',
    subject: '数学II',
    title: '図形と方程式',
    summary: '座標平面で直線と円を式で表し、軌跡と領域を考える。',
    prerequisites: ['i-expression', 'i-quadratic'],
    status: 'published',
    order: 2,
  },
  {
    id: 'ii-trigonometric',
    lessonDir: 'trig',
    subject: '数学II',
    title: '三角関数',
    summary: '角を一般角へ広げ、単位円で三角関数を定義し、グラフと性質を読む。',
    prerequisites: ['i-trig-ratio', 'i-quadratic', 'ii-coordinate'],
    status: 'published',
    order: 3,
  },
  {
    id: 'ii-exponential',
    lessonDir: 'exponential',
    subject: '数学II',
    title: '指数関数・対数関数',
    summary: '指数を実数へ拡張し、その逆として対数を導入する。',
    prerequisites: ['i-expression', 'i-quadratic'],
    status: 'published',
    order: 4,
  },
  {
    id: 'ii-calculus',
    lessonDir: 'calculus',
    subject: '数学II',
    title: '微分・積分の考え',
    summary: '微分係数と導関数、関数の増減、定積分と面積。',
    prerequisites: ['i-quadratic', 'ii-expressions', 'ii-coordinate'],
    status: 'published',
    order: 5,
  },
  {
    id: 'b-sequences',
    lessonDir: 'sequences',
    subject: '数学B',
    title: '数列',
    summary: '等差数列・等比数列、Σ、漸化式と数学的帰納法。',
    prerequisites: ['i-expression', 'i-quadratic'],
    status: 'published',
    order: 1,
  },
  {
    id: 'b-statistics',
    lessonDir: 'statistics',
    subject: '数学B',
    title: '統計的な推測',
    summary: '確率変数と確率分布、二項分布・正規分布、区間推定と仮説検定。',
    prerequisites: ['i-data', 'a-probability'],
    status: 'published',
    order: 2,
  },
  {
    id: 'b-society',
    lessonDir: 'society',
    subject: '数学B',
    title: '数学と社会生活',
    summary: '社会生活の問題を数学化し、解決・批判的検討・一般化を行う。',
    prerequisites: ['i-data', 'a-probability', 'b-statistics'],
    status: 'published',
    order: 3,
  },
];

const unitById = new Map(units.map((u) => [u.id, u]));
const externalById = new Map(externalConcepts.map((c) => [c.id, c]));

export function getUnit(id: string): Unit | undefined {
  return unitById.get(id);
}

/** Human-readable label for a prerequisite id (unit or external concept). */
export function prerequisiteLabel(id: string): string {
  const unit = unitById.get(id);
  if (unit) return `${unit.subject}「${unit.title}」`;
  return externalById.get(id)?.label ?? id;
}

/** All prerequisite labels for a unit, in declared order. */
export function prerequisiteLabels(unitId: string): string[] {
  return (unitById.get(unitId)?.prerequisites ?? []).map(prerequisiteLabel);
}

export function unitsBySubject(subject: Subject): Unit[] {
  return units.filter((u) => u.subject === subject).sort((a, b) => a.order - b.order);
}

/** Every valid prerequisite id (units + external concepts). Used by tests. */
export function allConceptIds(): string[] {
  return [...units.map((u) => u.id), ...externalConcepts.map((c) => c.id)];
}

export const statusLabel: Record<UnitStatus, string> = {
  published: '公開中',
  draft: '作成中',
  planned: '準備中',
};
