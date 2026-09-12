import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const layoutPath = join(root, 'src/layouts/LessonLayout.astro');
const scanDirs = ['src/components/content', 'src/components/ui', 'src/components/viz'];

function collectAstroFiles(dir) {
  try {
    return readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((entry) => entry.endsWith('.astro'))
      .map((entry) => `${dir}/${entry.replace(/\\/g, '/')}`)
      .sort();
  } catch {
    return [];
  }
}

const files = scanDirs.flatMap(collectAstroFiles);
const components = files.map((file) => {
  const name = file.split('/').pop().replace(/\.astro$/, '');
  return { name, path: `@/${file.replace(/^src\//, '')}` };
});

const seen = new Map();
for (const component of components) {
  const previous = seen.get(component.name);
  if (previous) {
    console.error(`duplicate component name "${component.name}": ${previous} and ${component.path}`);
    process.exit(1);
  }
  seen.set(component.name, component.path);
}

const importBlock = components.map((c) => `import ${c.name} from '${c.path}';`).join('\n');
const mapBlock = components.map((c) => `  ${c.name},`).join('\n');

let source = readFileSync(layoutPath, 'utf8');

const importPattern = /\/\/ <components:imports>\n[\s\S]*?\/\/ <\/components:imports>/;
const mapPattern = /\/\/ <components:map>\n[\s\S]*?\/\/ <\/components:map>/;

if (!importPattern.test(source) || !mapPattern.test(source)) {
  console.error('LessonLayout.astro is missing the component markers; cannot sync.');
  process.exit(1);
}

source = source.replace(importPattern, `// <components:imports>\n${importBlock}\n// </components:imports>`);
source = source.replace(mapPattern, `// <components:map>\n${mapBlock}\n// </components:map>`);

writeFileSync(layoutPath, source, 'utf8');
console.log(`synced ${components.length} MDX components into LessonLayout.astro`);
