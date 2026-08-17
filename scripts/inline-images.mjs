// Встраивает локальные картинки в HTML как data:-URI, чтобы файл из release/
// можно было отправить одним вложением. Использование:
//   node scripts/inline-images.mjs release/01-nlp-osnovy.html [...]
// Пути в src резолвятся относительно build/ (там HTML собирался), т.е.
// `../assets/...` — от корня репозитория.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

for (const file of process.argv.slice(2)) {
  const html = readFileSync(file, 'utf8');
  let inlined = 0;
  let missed = 0;
  const out = html.replace(/src="([^"]+)"/g, (m, src) => {
    if (src.startsWith('data:') || src.startsWith('http')) return m;
    const mime = MIME[extname(src).toLowerCase()];
    if (!mime) return m;
    try {
      const buf = readFileSync(resolve('build', src));
      inlined++;
      return `src="data:${mime};base64,${buf.toString('base64')}"`;
    } catch {
      missed++;
      return m;
    }
  });
  writeFileSync(file, out);
  console.log(`  ${file}: встроено ${inlined}${missed ? `, НЕ НАЙДЕНО ${missed}` : ''}`);
  if (missed) process.exitCode = 1;
}
