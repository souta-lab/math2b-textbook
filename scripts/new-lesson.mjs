import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsRoot = resolve(root, 'src/content/lessons');
const templatePath = resolve(root, 'templates/lesson.mdx');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function lessonDirByUnit() {
  const source = readFileSync(resolve(root, 'src/data/curriculum.ts'), 'utf8');
  const map = new Map();
  for (const match of source.matchAll(/id: '([^']+)',\s*lessonDir: '([^']+)'/g)) {
    map.set(match[1], match[2]);
  }
  return map;
}

function existingLessons(dir) {
  const abs = resolve(lessonsRoot, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const text = readFileSync(resolve(abs, file), 'utf8');
      const order = Number(/^order:\s*(\d+)/m.exec(text)?.[1] ?? NaN);
      const id = `${dir}/${file.replace(/\.mdx$/, '')}`;
      return { id, order };
    })
    .filter((lesson) => Number.isFinite(lesson.order))
    .sort((a, b) => a.order - b.order);
}

const args = parseArgs(process.argv.slice(2));
const { unit, slug } = args;
if (!unit || !slug) {
  console.error('usage: npm run new-lesson -- --unit <unitId> --slug <slug> [--title "…"] [--summary "…"] [--prereq a,b] [--concept i-trig-ratio]');
  process.exit(1);
}

const dir = lessonDirByUnit().get(unit);
if (!dir) {
  console.error(`unknown unit: ${unit}. known: ${[...lessonDirByUnit().keys()].join(', ')}`);
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('slug must be kebab-case (a-z, 0-9, -)');
  process.exit(1);
}

const existing = existingLessons(dir);
const order = existing.length > 0 ? Math.max(...existing.map((lesson) => lesson.order)) + 1 : 0;
const previous = existing.find((lesson) => lesson.order === order - 1);
const prerequisites = args.prereq
  ? args.prereq.split(',').map((value) => `"${value.trim()}"`)
  : previous
    ? [`"${previous.id}"`]
    : [];
const concept = args.concept ?? (prerequisites[0] ? prerequisites[0].replaceAll('"', '') : 'i-trig-ratio');

const target = resolve(lessonsRoot, dir, `${String(order).padStart(2, '0')}-${slug}.mdx`);
if (existsSync(target)) {
  console.error(`refusing to overwrite existing file: ${target}`);
  process.exit(1);
}

const title = args.title ?? '（タイトル）';
const summary = args.summary ?? '（1文の要約）';
const date = new Date().toISOString().slice(0, 10);

const body = readFileSync(templatePath, 'utf8')
  .replaceAll('{{TITLE}}', title)
  .replaceAll('{{SUMMARY}}', summary)
  .replaceAll('{{UNIT}}', unit)
  .replaceAll('{{ORDER}}', String(order))
  .replaceAll('{{PREREQUISITES}}', `[${prerequisites.join(', ')}]`)
  .replaceAll('{{DATE}}', date)
  .replaceAll('{{PREREQ_CONCEPT}}', concept);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, body, 'utf8');

console.log(`created ${target.replace(`${root}/`, '')}`);
console.log(`  order: ${order}`);
console.log(`  prerequisites: [${prerequisites.join(', ')}]`);
console.log('next: fill the placeholders, then run: npm run verify');
