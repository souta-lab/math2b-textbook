/**
 * Curriculum concept graph for 高校数学 (中学数学の復習・数学I/A/II/B/III/C・大学数学).
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
 *
 * Phase 0 of the multi-subject expansion registers every unit up-front with
 * `status: 'planned'`; authors then fill each `lessonDir` with MDX only.
 * IMPORTANT: object literals MUST declare `id` immediately followed by
 * `lessonDir` — `scripts/new-lesson.mjs` reads that adjacency with a regex.
 */

export type Subject =
  | '中学数学'
  | '数学I'
  | '数学A'
  | '数学II'
  | '数学B'
  | '数学III'
  | '数学C'
  | '大学数学';
export type UnitStatus = 'published' | 'draft' | 'planned';

/** Site-wide presentation order of subjects (中学復習 → 大学). */
export const SUBJECT_ORDER: Subject[] = [
  '中学数学',
  '数学I',
  '数学A',
  '数学II',
  '数学B',
  '数学III',
  '数学C',
  '大学数学',
];

export interface SubjectMeta {
  /** URL slug under /subjects/. */
  slug: string;
  /** Human-readable name used in navigation. */
  label: string;
  /** One-sentence description for the subject landing page. */
  description: string;
  /** School level, used for grouping/annotation. */
  level: '中学' | '高校' | '大学';
}

export const SUBJECT_META: Record<Subject, SubjectMeta> = {
  '中学数学': {
    slug: 'jhs',
    label: '中学数学（復習）',
    description: '高校数学の前提となる計算・図形・資料の扱いを、中学の範囲から復習します。',
    level: '中学',
  },
  '数学I': {
    slug: 'math1',
    label: '数学I',
    description: '数と式・集合と命題・二次関数・図形と計量・データの分析。',
    level: '高校',
  },
  '数学A': {
    slug: 'matha',
    label: '数学A',
    description: '場合の数と確率・図形の性質・数学と人間の活動。',
    level: '高校',
  },
  '数学II': {
    slug: 'math2',
    label: '数学II',
    description: 'いろいろな式・図形と方程式・三角関数・指数対数・微分積分の考え。',
    level: '高校',
  },
  '数学B': {
    slug: 'mathb',
    label: '数学B',
    description: '数列・統計的な推測・数学と社会生活。',
    level: '高校',
  },
  '数学III': {
    slug: 'math3',
    label: '数学III',
    description: '極限・微分法・微分法の応用・積分法。',
    level: '高校',
  },
  '数学C': {
    slug: 'mathc',
    label: '数学C',
    description: 'ベクトル・平面上の曲線と複素数平面・数学的な表現の工夫。',
    level: '高校',
  },
  '大学数学': {
    slug: 'university',
    label: '大学数学（実用ツール）',
    description: '高校数学の先にある道具を、実用に絞って紹介する小さなモジュール集。',
    level: '大学',
  },
};

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
  /** Ordered lesson slugs a planned unit intends to author. */
  lessonPlan?: string[];
}

/**
 * Concepts this textbook assumes but does not teach. Empty since the
 * multi-subject expansion folded every former 数学I/A prerequisite into a real
 * unit; `LEGACY_CONCEPT_TO_UNIT` keeps old ids rendering a label.
 */
export const externalConcepts: ExternalConcept[] = [];

/**
 * Pre-expansion prerequisite ids that used to be "external concepts".
 * They are now real units; this mapping keeps `prerequisiteLabel` honest if any
 * saved content or frontmatter still points at a pre-expansion concept id.
 */
export const LEGACY_CONCEPT_TO_UNIT: Record<string, string> = {
  'i-expression': 'i-expression',
  'i-quadratic': 'i-quadratic',
  'i-trig-ratio': 'i-trig-ratio',
  'i-data': 'i-data',
  'a-probability': 'a-probability',
};

/**
 * All units of the textbook, grouped by subject in `SUBJECT_ORDER`.
 * 数学II・B remains the authored vertical slice; every other unit is
 * registered as `planned` so the graph is complete and honest about what exists.
 */
export const units: Unit[] = [
  // --- 中学数学（復習・5単元） ---
  {
    id: 'jhs-number-expression',
    lessonDir: 'jhs-number-expression',
    subject: '中学数学',
    title: '正負の数と文字式',
    summary: '負の数と文字式を、計算のきまりからていねいに復習する。',
    prerequisites: [],
    status: 'published',
    order: 1,
    lessonPlan: [
      '00-negative-numbers',
      '01-algebraic-expressions',
      '02-poly-calc',
      '03-square-roots',
      '04-review',
    ],
  },
  {
    id: 'jhs-equation-inequality',
    lessonDir: 'jhs-equation-inequality',
    subject: '中学数学',
    title: '方程式と不等式',
    summary: '一次方程式・連立方程式・一次不等式を、等式の性質から解く。',
    prerequisites: ['jhs-number-expression'],
    status: 'published',
    order: 2,
    lessonPlan: [
      '00-linear-equation',
      '01-simultaneous',
      '02-linear-inequality',
      '03-ratio',
      '04-review',
    ],
  },
  {
    id: 'jhs-function',
    lessonDir: 'jhs-function',
    subject: '中学数学',
    title: '比例・反比例・一次関数',
    summary: '比例・反比例から一次関数へ、グラフと式を行き来する。',
    prerequisites: ['jhs-number-expression'],
    status: 'published',
    order: 3,
    lessonPlan: ['00-proportion', '01-linear-graph', '02-slope', '03-using-linear', '04-review'],
  },
  {
    id: 'jhs-geometry',
    lessonDir: 'jhs-geometry',
    subject: '中学数学',
    title: '相似・三平方・円周角',
    summary: '相似・三平方の定理・円周角を、図形の関係として理解する。',
    prerequisites: ['jhs-number-expression'],
    status: 'published',
    order: 4,
    lessonPlan: [
      '00-angle-lines',
      '01-congruence',
      '02-similarity',
      '03-pythagorean',
      '04-inscribed-angle',
      '05-review',
    ],
  },
  {
    id: 'jhs-data',
    lessonDir: 'jhs-data',
    subject: '中学数学',
    title: '資料の整理',
    summary: '度数分布と代表値・相対度数で、資料の傾向を読む。',
    prerequisites: ['jhs-number-expression'],
    status: 'published',
    order: 5,
    lessonPlan: ['00-histogram', '01-representative', '02-relative-freq', '03-review'],
  },

  // --- 数学I（5単元） ---
  {
    id: 'i-expression',
    lessonDir: 'i-expression',
    subject: '数学I',
    title: '数と式',
    summary: '展開・因数分解・実数・平方根と、一次不等式・絶対値を扱う。',
    prerequisites: ['jhs-number-expression', 'jhs-equation-inequality'],
    status: 'published',
    order: 1,
    lessonPlan: [
      '00-expand-formulas',
      '01-factorize',
      '02-real-numbers',
      '03-radical-calc',
      '04-linear-inequality',
      '05-absolute',
      '06-review',
    ],
  },
  {
    id: 'i-sets-logic',
    lessonDir: 'i-sets-logic',
    subject: '数学I',
    title: '集合と命題',
    summary: '集合の記号と、命題・条件・証明の論理を学ぶ。',
    prerequisites: ['i-expression'],
    status: 'published',
    order: 2,
    lessonPlan: [
      '00-sets',
      '01-set-ops',
      '02-proposition',
      '03-necessity',
      '04-contrapositive',
      '05-contradiction',
      '06-review',
    ],
  },
  {
    id: 'i-quadratic',
    lessonDir: 'i-quadratic',
    subject: '数学I',
    title: '二次関数',
    summary: '平方完成からグラフ・最大最小・二次不等式までを扱う。',
    prerequisites: ['i-expression'],
    status: 'published',
    order: 3,
    lessonPlan: [
      '00-function-graph',
      '01-graph-completion',
      '02-translation',
      '03-max-min',
      '04-determine',
      '05-intersection',
      '06-inequality',
      '07-inequality-apps',
      '08-review',
    ],
  },
  {
    id: 'i-trig-ratio',
    lessonDir: 'i-trig-ratio',
    subject: '数学I',
    title: '図形と計量',
    summary: '三角比の定義から正弦定理・余弦定理・面積へ。',
    prerequisites: ['jhs-geometry', 'i-expression'],
    status: 'published',
    order: 4,
    lessonPlan: [
      '00-sin-cos-tan',
      '01-special-angles',
      '02-reciprocal',
      '03-obtuse',
      '04-sine-rule',
      '05-cosine-rule',
      '06-area',
      '07-space',
      '08-review',
    ],
  },
  {
    id: 'i-data',
    lessonDir: 'i-data',
    subject: '数学I',
    title: 'データの分析',
    summary: '四分位数・分散・相関を、散らばりの指標として読む。',
    prerequisites: ['jhs-data'],
    status: 'published',
    order: 5,
    lessonPlan: [
      '00-quartile',
      '01-boxplot',
      '02-variance',
      '03-std-dev',
      '04-correlation',
      '05-causation',
      '06-hypothesis-intro',
      '07-review',
    ],
  },

  // --- 数学A（3単元） ---
  {
    id: 'a-probability',
    lessonDir: 'a-probability',
    subject: '数学A',
    title: '場合の数と確率',
    summary: '数え上げから条件付き確率・期待値まで。',
    prerequisites: ['i-sets-logic', 'jhs-number-expression'],
    status: 'published',
    order: 1,
    lessonPlan: [
      '00-counting',
      '01-permutation',
      '02-circular',
      '03-combination',
      '04-combination-props',
      '05-probability',
      '06-independent',
      '07-repeated',
      '08-conditional',
      '09-expectation',
      '10-review',
    ],
  },
  {
    id: 'a-geometry',
    lessonDir: 'a-plane-geometry',
    subject: '数学A',
    title: '図形の性質',
    summary: '三角形の心・チェバ・円周角・方べきなど平面図形の性質。',
    prerequisites: ['jhs-geometry', 'i-trig-ratio'],
    status: 'published',
    order: 2,
    lessonPlan: [
      '00-triangle-angles',
      '01-centers',
      '02-ceva-menelaus',
      '03-inscribed-angle',
      '04-cyclic-quad',
      '05-tangent-chord',
      '06-two-circles',
      '07-construction',
      '08-space-basics',
      '09-review',
    ],
  },
  {
    id: 'a-activities',
    lessonDir: 'a-activities',
    subject: '数学A',
    title: '数学と人間の活動',
    summary: '約数・互除法・合同式・n進法と、数学の歴史・生活への応用。',
    prerequisites: ['a-probability', 'a-geometry'],
    status: 'published',
    order: 3,
    lessonPlan: [
      '00-divisors',
      '01-euclidean',
      '02-diophantine',
      '03-congruence',
      '04-base-n',
      '05-history',
      '06-life-math',
      '07-review',
    ],
  },

  // --- 数学II（既存・公開中） ---
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

  // --- 数学B（既存・公開中） ---
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

  // --- 数学III（4単元） ---
  {
    id: 'iii-limits',
    lessonDir: 'iii-limits',
    subject: '数学III',
    title: '極限',
    summary: '数列と関数の極限、連続性と中間値の定理。',
    prerequisites: ['b-sequences', 'ii-exponential', 'ii-trigonometric'],
    status: 'planned',
    order: 1,
    lessonPlan: [
      '00-sequence-limit',
      '01-infinite-geometric',
      '02-series',
      '03-geometric-series',
      '04-function-limit',
      '05-one-sided',
      '06-trig-exp-limit',
      '07-continuity',
      '08-intermediate',
      '09-review',
    ],
  },
  {
    id: 'iii-differential',
    lessonDir: 'iii-derivative',
    subject: '数学III',
    title: '微分法',
    summary: '微分の計算規則を三角・指数・対数関数まで広げる。',
    prerequisites: ['iii-limits', 'ii-calculus', 'ii-trigonometric'],
    status: 'planned',
    order: 2,
    lessonPlan: [
      '00-review',
      '01-rules',
      '02-product-quotient',
      '03-composite',
      '04-trig',
      '05-exp-log',
      '06-logarithmic',
      '07-higher',
      '08-review',
    ],
  },
  {
    id: 'iii-differential-apps',
    lessonDir: 'iii-derivative-apps',
    subject: '数学III',
    title: '微分法の応用',
    summary: '接線・平均値の定理・増減・凹凸・グラフ・最適化。',
    prerequisites: ['iii-differential'],
    status: 'planned',
    order: 3,
    lessonPlan: [
      '00-tangent-normal',
      '01-mean-value',
      '02-monotonic',
      '03-concavity',
      '04-sketch',
      '05-optimization',
      '06-equation-apps',
      '07-rates',
      '08-review',
    ],
  },
  {
    id: 'iii-integral',
    lessonDir: 'iii-integral',
    subject: '数学III',
    title: '積分法',
    summary: '置換・部分積分から定積分と面積・体積・曲線の長さへ。',
    prerequisites: ['iii-differential', 'ii-calculus'],
    status: 'planned',
    order: 4,
    lessonPlan: [
      '00-review',
      '01-substitution',
      '02-by-parts',
      '03-partial-fractions',
      '04-definite',
      '05-definite-techniques',
      '06-area',
      '07-volume',
      '08-curve-length',
      '09-review',
    ],
  },

  // --- 数学C（3単元） ---
  {
    id: 'c-vectors',
    lessonDir: 'c-vectors',
    subject: '数学C',
    title: 'ベクトル',
    summary: '平面・空間のベクトルと内積、図形への応用。',
    prerequisites: ['ii-coordinate', 'i-trig-ratio'],
    status: 'planned',
    order: 1,
    lessonPlan: [
      '00-basics',
      '01-components',
      '02-dot',
      '03-position',
      '04-line',
      '05-figures',
      '06-space',
      '07-space-dot',
      '08-space-figures',
      '09-review',
    ],
  },
  {
    id: 'c-curves-complex',
    lessonDir: 'c-curves-complex',
    subject: '数学C',
    title: '平面上の曲線と複素数平面',
    summary: '二次曲線と極座標、複素数平面とド・モアヴルの定理。',
    prerequisites: ['ii-expressions', 'ii-coordinate', 'i-trig-ratio'],
    status: 'planned',
    order: 2,
    lessonPlan: [
      '00-parabola',
      '01-ellipse',
      '02-hyperbola',
      '03-conic-translation',
      '04-polar',
      '05-complex-plane',
      '06-polar-form',
      '07-de-moivre',
      '08-complex-figures',
      '09-review',
    ],
  },
  {
    id: 'c-representation',
    lessonDir: 'c-representation',
    subject: '数学C',
    title: '数学的な表現の工夫',
    summary: '行列・一次変換とその合成、固有値、離散グラフへの入口。',
    prerequisites: ['c-vectors', 'ii-expressions'],
    status: 'planned',
    order: 3,
    lessonPlan: [
      '00-matrix-basics',
      '01-matrix-product',
      '02-inverse',
      '03-linear-systems',
      '04-linear-transform',
      '05-transform-figures',
      '06-composition',
      '07-eigen',
      '08-discrete-graph',
      '09-review',
    ],
  },

  // --- 大学数学（入試時短ツールキット・7モジュール） ---
  {
    id: 'uni-limits-tools',
    lessonDir: 'uni-limits-tools',
    subject: '大学数学',
    title: '極限の時短（ロピタル・近似）',
    summary: 'ロピタルとテイラー近似で、入試の極限計算を短縮する。',
    prerequisites: ['iii-limits'],
    status: 'planned',
    order: 1,
    lessonPlan: ['00-lhopital', '01-taylor-approx', '02-order', '03-review'],
  },
  {
    id: 'uni-calculus-tools',
    lessonDir: 'uni-calculus-tools',
    subject: '大学数学',
    title: '微分積分の時短',
    summary: '陰関数・媒介変数の微分、ラグランジュ、区分求積などの近道。',
    prerequisites: ['iii-integral', 'iii-differential-apps'],
    status: 'planned',
    order: 2,
    lessonPlan: [
      '00-implicit',
      '01-param-derivative',
      '02-lagrange',
      '03-quadrature',
      '04-pappus',
      '05-review',
    ],
  },
  {
    id: 'uni-inequality-tools',
    lessonDir: 'uni-inequality-tools',
    subject: '大学数学',
    title: '不等式の時短',
    summary: 'コーシー・シュワルツや相加相乗の拡張で、不等式の見通しを立てる。',
    prerequisites: ['i-expression', 'ii-calculus'],
    status: 'planned',
    order: 3,
    lessonPlan: ['00-cauchy-schwarz', '01-amgm-ext', '02-rearrangement', '03-review'],
  },
  {
    id: 'uni-integer-tools',
    lessonDir: 'uni-integer-tools',
    subject: '大学数学',
    title: '整数の時短',
    summary: '合同式・フェルマーの小定理・不定方程式の高速解法。',
    prerequisites: ['a-activities'],
    status: 'planned',
    order: 4,
    lessonPlan: ['00-congruence-fast', '01-fermat', '02-diophantine-fast', '03-review'],
  },
  {
    id: 'uni-sequence-tools',
    lessonDir: 'uni-sequence-tools',
    subject: '大学数学',
    title: '数列・漸化式の時短',
    summary: '特性方程式・母関数・確率漸化式・行列のn乗で漸化式を短縮する。',
    prerequisites: ['b-sequences', 'a-probability'],
    status: 'planned',
    order: 5,
    lessonPlan: ['00-characteristic', '01-generating', '02-prob-recurrence', '03-eigen-power', '04-review'],
  },
  {
    id: 'uni-geometry-tools',
    lessonDir: 'uni-geometry-tools',
    subject: '大学数学',
    title: '図形の時短',
    summary: '外積・トレミー・スチュワートなど、空間と平面の図形計算の近道。',
    prerequisites: ['c-vectors', 'a-geometry'],
    status: 'planned',
    order: 6,
    lessonPlan: [
      '00-cross-product',
      '01-tetra-volume',
      '02-tolomey-stewart',
      '03-harmonic',
      '04-review',
    ],
  },
  {
    id: 'uni-complex-matrix-tools',
    lessonDir: 'uni-complex-matrix-tools',
    subject: '大学数学',
    title: '複素数・行列の時短',
    summary: 'ド・モアブル・1のn乗根・ケーリー・ハミルトン・対角化を使いこなす。',
    prerequisites: ['c-curves-complex', 'c-representation'],
    status: 'planned',
    order: 7,
    lessonPlan: [
      '00-de-moivre-fast',
      '01-roots-of-unity',
      '02-cayley-hamilton',
      '03-diagonalize',
      '04-review',
    ],
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
  const legacyUnit = unitById.get(LEGACY_CONCEPT_TO_UNIT[id] ?? '');
  if (legacyUnit) return `${legacyUnit.subject}「${legacyUnit.title}」`;
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
