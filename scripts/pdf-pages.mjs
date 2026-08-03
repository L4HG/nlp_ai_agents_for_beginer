#!/usr/bin/env node
// Считает страницы в собранных PDF и сверяет с числом слайдов в HTML.
// Скриптом, а не утилитой, потому что в окружении нет ни qpdf, ни pdfinfo, ни pypdf.
//
// Использование: node scripts/pdf-pages.mjs build/*.pdf

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { PDFDocument } from 'pdf-lib';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Использование: node scripts/pdf-pages.mjs <build/*.pdf>');
  process.exit(1);
}

let failed = false;

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`✗ нет файла: ${file}`);
    failed = true;
    continue;
  }

  const doc = await PDFDocument.load(readFileSync(file), { updateMetadata: false });
  const pages = doc.getPageCount();

  // сверяем с HTML-сборкой той же колоды, если она есть
  const html = file.replace(/\.pdf$/, '.html');
  let expected = null;
  if (existsSync(html)) {
    const src = readFileSync(html, 'utf8');
    expected = (src.match(/<section\b/g) || []).length;
  }

  const name = basename(file);
  if (expected === null) {
    console.log(`   ${name}: ${pages} стр.`);
  } else if (expected === pages) {
    console.log(`   ✓ ${name}: ${pages} стр. (совпадает с HTML)`);
  } else {
    console.log(`   ✗ ${name}: ${pages} стр. в PDF, но ${expected} секций в HTML — баг сборки`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
