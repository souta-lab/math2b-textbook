# AUTHORING.md — 執筆・設計標準

この文書は、数学II・B教材の**本文（MDX）を書く人／コンポーネントを作る人**が従う唯一の規約である。
数学的正確性を最優先し、初学者が前から読むだけで理解できることを目的とする。

対象スコープ（Vertical Slice）: **三角関数 概念スパイン L0–L6**
`L0 三角比の復習 → L1 一般角 → L2 弧度法 → L3 単位円による定義 → L4 相互関係 → L5 周期性と対称性 → L6 グラフ`
（L7 三角方程式・L8 加法定理は Phase 2。今回は書かないが基盤は対応済み）

---

## 1. レッスンのコア骨格（必須）と任意モジュール

1レッスンは **15–20分** で読み切れる長さにする。次のコア骨格を必須とする。

1. **導入（現象・フック）** — `<Hook>`。式を出さず、具体的な状況・素朴な疑問。
2. **予想** — `<Prediction>`。1ステップ・具体・2〜3択の直感プローブ（§3）。
3. **直感 → 図** — 地の文＋可視化。図は学習対象の関係を直接見せる。
4. **数式化** — `$...$` / `$$...$$`。非自明な選択に `<Why>`（§2）。
5. **定義・定理（名前を与える）** — `<Definition>` / `<Theorem>`。
6. **完成例＋自己説明** — `<WorkedExample>`＋`<Reveal>` による `<SelfExplanation>`。
7. **誤概念の否定** — `<Misconception>`（§4）。
8. **記憶からの確認** — `<CheckUnderstanding>`（§5）。
9. **前後ナビ・前提** — `LessonLayout` が自動挿入（本文に書かない）。

任意モジュール（必要時のみ）: `<Contrast>`（対比ケース）、`<FadedExample>`＋`<Reveal>`（穴埋め）、`<Practice>`（追加演習）。
**すべてを毎回入れない。** 長くなったらレッスンを分割する。

---

## 2. `<Why>` の定義（最重要）

`<Why>` は「**なぜその操作・その変形・その順序を選ぶのか**」という*選択の理由・目的*を述べる。手順の言い換えは禁止。

- ✅ 良い例:「$\\sin^2\\theta+\\cos^2\\theta=1$ を使うのは、$\\sin\\theta$ だけが分かっているときに $\\cos\\theta$ を消去できるから。」
- ❌ 悪い例:「両辺を2乗する。なぜなら両辺を2乗するから。」
- 自明な代数変形には付けない（coherence）。1つの導出につき、非自明な分岐に1つを目安。
- 各レッスンに最低1つ、**直感または既習事項（数学I）に結びつける** Why を置く。

---

## 3. `<Prediction>` の制約

- 1ステップで答えられる、具体的な直感プローブにする。**手法の生成を要求しない**（初学者の生産的失敗は逆効果になりうる）。
- 選択肢は2〜3個。即時開示。成績に無関係である旨を明示（コンポーネントが表示）。
- 対象概念の説明の*前*に置く。誤概念はここで早期に elicit する。

## 4. 誤概念（Misconception）

実在する誤りを**名指しして明示的に否定**する（refutation）。`<Wrong>`（よくある誤り）→ `<WhyWrong>`（なぜ誤りか）→ `<Right>`（正しい見方）。
誤概念は `<Prediction>` で先に elicit し、ここで正式に否定する。例:
- 「$\\sin(\\alpha+\\beta)=\\sin\\alpha+\\sin\\beta$」（Phase 2 の核心）
- 「$\\tan\\theta$ の周期は $2\\pi$」（正しくは $\\pi$）
- 「$180^\\circ=\\pi$ だから $\\pi$ は角度の単位」（$\\pi$ は*比*であって単位ではない）

## 5. 検索・分散・交互

- 各レッスン末尾に `<CheckUnderstanding>`（記憶から思い出す。答えは `<Reveal>`）。
- 2〜3レッスンごとに、直前までの内容を**混ぜた**累積レビューを `<Practice>` で入れる（交互学習）。
- 後のレッスンで前の概念を再登場させる（分散）。

## 6. 表記・正準（数学IIの範囲で正確に）

- **弧度法**: $\\pi$ は円周率（半径1の半円の弧長）。$180^\\circ=\\pi$ rad は*対応*であって単位換算の等式ではない。弧度法導入後は原則弧度法で書き、初期のみ度を括弧で併記。
- **一般角**: $\\theta = \\alpha + 2n\\pi$（$n$ は整数）。$\\tan$ は周期 $\\pi$ なので $\\theta=\\alpha+n\\pi$。
- **$\\tan\\theta$ の定義域**: $\\cos\\theta\\ne 0$、すなわち $\\theta\\ne \\frac{\\pi}{2}+n\\pi$。
- **象限の符号**: 単位円の座標から導く（暗記させない）。
- **数学IIの範囲内**にとどめる。行列・回転行列・複素数平面は数学Cなので**使わない**。加法定理の証明は単位円上の2点間距離（Phase 2）。
- 極限を正式に使わない（数学III）。微分の話はPhase 2以降でも「平均変化率」までで抑える。
- 特別角の値（$\\pi/6, \\pi/4, \\pi/3$）は根拠（2つの直角三角形）から導く。

## 7. 数式の書き方

- インライン `$...$`、別行 `$$...$$`（KaTeX, ビルド時SSR）。
- 共通マクロ: `\R` → `\mathbb{R}`, `\Z` → `\mathbb{Z}`, `\deg` → `^{\circ}`。
- LaTeX誤りは**ビルドを失敗**させる（`throwOnError: true`）。書きっぱなしにしない。
- 別行数式が長い場合は折り返さない（横スクロールになる）。導出は `<Steps>` で1段ずつ（segmenting）。

## 8. アクセシビリティ（日本語）

- 日本語数式の自動読み上げは SRE/MathCAT が非対応。よって**表示数式で定義・定理を導入するもの**には、その直前直後に日本語で読み・意味を短く添える（例:「これは $\\sin^2\\theta+\\cos^2\\theta=1$、すなわち単位円上の点の座標がみたす関係です。」）。
- インライン数式は KaTeX の MathML に委ね、`aria-label` を乱用しない（二重読み上げを避ける）。
- 装飾的なラッパーは `aria-hidden="true"`。
- 可視化はキーボード操作可、`prefers-reduced-motion` 尊重、色だけに依存しない。

## 9. コンポーネント API（本文で使うもの）

### コンテンツ
```mdx
<Hook>…</Hook>
<Why>…</Why>
<KeyPoint>…</KeyPoint>
<Definition term="三角関数">…</Definition>
<Theorem name="…">…</Theorem>
<Note type="info | tip | warn">…</Note>
<PrerequisiteNote concept="i-trig-ratio" />

<Steps>
  <Step reason="…（任意）">…</Step>
</Steps>

<WorkedExample title="例題">
  問題文…
  <Steps>…</Steps>
  <Answer>…</Answer>
</WorkedExample>

<Reveal label="答えを見る">…（隠す内容）…</Reveal>

<Prediction
  question="…"
  options={['A', 'B', 'C']}
  answer="B"
  explanation="…"
/>

<SelfExplanation prompt="…" model="…" options={['…', '…']} />

<Misconception>
  <Wrong>…</Wrong>
  <WhyWrong>…</WhyWrong>
  <Right>…</Right>
</Misconception>

<Contrast>…</Contrast>
<FadedExample title="…">… <Reveal label="続きを見る">…</Reveal></FadedExample>
<Practice>… <Reveal label="解答">…</Reveal> …</Practice>
<CheckUnderstanding>… <Reveal label="答え">…</Reveal> …</CheckUnderstanding>
<Figure caption="…">…可視化…</Figure>
```

### 可視化
```mdx
<UnitCircle angleDeg={30} interactive showSin showCos showTan label="…" />
<TrigGraph fn="sin | cos | tan" from={0} to={6.283} interactive linked label="…" />
<AngleDiagram deg={120} showArc showQuadrants label="…" />
<RightTriangle deg={30} showValues label="…" />
<Slider label="角 θ" min={0} max={360} step={1} value={30} unit="°" />
```
> `<TrigGraph fn>` は**文字列enum**（関数は渡さない）。`from`/`to` は弧度法。`linked` を付けると、グラフの下に小さな単位円が表示され、スライダーと連動する。`AngleDiagram` は負の角を時計回り、複数周を螺旋で正しく描く。`showQuadrants` で象限 I–IV を表示。

## 10. ファイル規約とフロントマター

- 場所: `src/content/lessons/<lessonDir>/<order>-<slug>.mdx`（`lessonDir` は `src/data/curriculum.ts` の各単元が持つ）
- frontmatter（Zodで検証）:
```yaml
---
title: "角を広げる — 一般角と動径"
summary: "90°を超える角を、回転としてとらえ直す。"
unit: "ii-trigonometric"
order: 1
objectives:
  - "一般角と動径を説明できる"
  - "度と弧度の対応を用いて角を表せる"
prerequisites: ["i-trig-ratio"]
tags: ["一般角", "動径"]
reviewed: 2026-09-12
---
```
- `prerequisites` は `src/data/curriculum.ts` の id（外部概念含む）または他のレッスン id（例: `"trig/03-definition"`）を参照。
- 読み進める順序が成立するよう、各レッスンは直前のレッスンを prerequisite に持つ。

## 11. レビューチェックリスト（各レッスン）
- [ ] 対象概念の説明前に予想がある。
- [ ] 非自明な選択に `Why` があり、手順の言い換えになっていない。
- [ ] 完成例が1つ以上、各手順に理由がある。
- [ ] 実在の誤概念を名指しして否定している。
- [ ] 末尾に記憶からの確認がある。
- [ ] 公式は現象・具体例・直感の後に提示されている。
- [ ] 度/弧度の混在がない。$\\tan$ の定義域・周期が正しい。
- [ ] 装飾アニメがない。図は機能的。
- [ ] 15–20分で読める長さ（長ければ分割）。

---

## 12. 章を追加する手順（スケーリングの仕組み）

全章へ同じ品質で拡張するための標準手順。**本文を書く前に骨格を足場で生成する。**

```
npm run new-lesson -- --unit <unitId> --slug <slug> --title "…" --summary "…" [--prereq a,b] [--concept i-trig-ratio]
```

- `--unit` は `src/data/curriculum.ts` の単元 id（例: `ii-exponential`）。
- 出力先は `src/data/curriculum.ts` の `lessonDir` から自動決定（例: `ii-exponential` → `src/content/lessons/exponential/`）。
- `order` は同ディレクトリの既存最大+1、`prerequisites` は既定で直前レッスン。`templates/lesson.mdx` を基に生成。
- 生成後、プレースホルダを埋め、`npm run verify` を実行する。

手順:
1. `src/data/curriculum.ts` の対象単元を `status: 'draft'`（公開前）または `'published'` にする。
2. レッスンを1本ずつ `new-lesson` で生成し、`AUTHORING.md` のコア骨格に沿って書く。
3. `npm run verify`（check + test + build）を通す。
4. §15 のレビューを実施し、指摘を修正する。
5. 公開時は `status: 'published'` にし、`npm run test:e2e` も通す。

## 13. 単元 ⇔ ディレクトリ対応

| unit id | lessonDir | 主な可視化（予定） |
|---|---|---|
| ii-expressions | expressions | 数直線、複素数の対応（数学Cではない範囲） |
| ii-coordinate | coordinate | 座標平面、直線、円、領域 |
| ii-trigonometric | trig | 単位円、三角関数グラフ、角 |
| ii-exponential | exponential | 指数・対数グラフ、逆関数の折り返し |
| ii-calculus | calculus | 接線・平均変化率、面積 |
| b-sequences | sequences | 数列の対応、Σ |
| b-statistics | statistics | 度数分布、正規分布、区間推定 |
| b-society | society | 数学的モデル化 |

## 14. 章の Definition of Done
- [ ] 全レッスンが `new-lesson` 由来の構造（Hook/Prediction/Why/WorkedExample/Misconception/CheckUnderstanding）を満たす。
- [ ] `npm run check` 0エラー、`npm run test` 全通過、`npm run build` 成功。
- [ ] `npm run test:e2e` がモバイルで通過（レッスンごとの数式描画・はみ出しなし・可視化動作）。
- [ ] §15 のレビュー（数学・教授設計・図）で BLOCKER/MAJOR がゼロ。
- [ ] `curriculum.ts` の前提とレッスン順序が整合（テストで自動検証）。
- [ ] 新規追加した可視化は、サーバー描画＋vanilla TS の方式とテスト（`viz-math.test.ts` 相当）を持つ。

## 15. レビュー手順（章ごとに実施）
3観点を**独立**に実施し、それぞれ別の文脈で行う（同じ担当にまとめさせない）。

1. **数学的正確性**: 全定義・恒等式・例題を再計算。境界条件（定義域・除外点）を確認。図の角/関数が本文と一致するか。
2. **教授設計**: §11 のチェックリスト、`Why` が手順の言い換えになっていないか、認知負荷（1レッスン1概念・15–20分）、誤概念の elicit→refute、fading/検索。
3. **図と実装**: コンポーネントの数学、a11y（キーボード・aria）、モバイル表示。

加えて機械的検証（§17）を必ず通す。レビューは「OKと言うため」ではなく、反例・反証を探す前提で行う。

## 16. 可視化を追加するパターン
1. 幾何・数値計算を `src/components/viz/viz-math.ts` の純関数に置く（サーバーとクライアントで共有）。
2. 動的な部分のSVG文字列生成を `src/components/viz/viz-render.ts` に置く（SSRとハイドレーションで共有）。
3. `.astro` はサーバー描画＋vanilla TS `<script>` で操作。React島や外部チャートライブラリは使わない。
4. a11y: 静的図は `role="img"`＋`aria-label`、操作可能な図は `role="slider"`＋キーボード対応。装飾は `aria-hidden`。
5. `viz-math.test.ts` に数値回帰テストを追加（例: 2π目盛り、単位円の点・射影）。

## 17. 品質ゲート（CI）
- `deploy.yml`: `npm run check` → `npm run test` を通過しないと**デプロイしない**（壊れた章を公開しない）。
- `ci.yml`: push/PR ごとに check・test・build・e2e（モバイル）を実行。
- ローカル: `npm run verify`（check+test+build）と `npm run test:e2e`。

**テストが検知する劣化**: 必須コンポーネント欠落／`Prediction` の答えが選択肢外／`Step` の理由欠落／空 `Reveal`／プレースホルダ・逃げ表現／長文コピペ／未登録コンポーネント／root絶対パスリンク／unitとディレクトリの不一致／前提順序の逆転。
