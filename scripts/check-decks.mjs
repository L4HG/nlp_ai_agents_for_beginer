#!/usr/bin/env node
// Проверка собранных колод: число слайдов, переполнение, перегруз текстом.
//
// Использование:
//   node scripts/check-decks.mjs build/01-nlp-osnovy.html [...]
//   node scripts/check-decks.mjs --shots build/*.html    ← PNG проблемных слайдов
//
// Требует CHROME_PATH (Makefile его выставляет).

import { existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const shots = args.includes('--shots');
const files = args.filter((a) => !a.startsWith('--'));

if (!files.length) {
  console.error('Использование: node scripts/check-decks.mjs [--shots] <build/*.html>');
  process.exit(1);
}

const CHROME = process.env.CHROME_PATH;
if (!CHROME || !existsSync(CHROME)) {
  console.error(`CHROME_PATH не задан или не существует: ${CHROME || '(пусто)'}`);
  console.error('Запускайте через `make check` — Makefile находит Chromium сам.');
  process.exit(1);
}

// Пороги, ориентированные на аудиторию без технического бэкграунда.
const MIN_SLIDES = 60;
const MAX_SLIDES = 100;
const MAX_CHARS = 350;
const MAX_LIST_ITEMS = 7;
const OVERFLOW_TOLERANCE = 2; // px, на округление раскладки

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});

let failed = false;

for (const file of files) {
  const path = resolve(file);
  if (!existsSync(path)) {
    console.error(`✗ нет файла: ${file}`);
    failed = true;
    continue;
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const report = await page.evaluate(
    (TOL, MAX_CHARS, MAX_LIST_ITEMS) => {
      const sections = [...document.querySelectorAll('section')];
      return sections.map((s, i) => {
        const cs = getComputedStyle(s);
        const padT = parseFloat(cs.paddingTop);
        const padB = parseFloat(cs.paddingBottom);
        const padL = parseFloat(cs.paddingLeft);
        const padR = parseFloat(cs.paddingRight);
        const box = s.getBoundingClientRect();

        const innerTop = box.top + padT;
        const innerBottom = box.bottom - padB;
        const innerLeft = box.left + padL;
        const innerRight = box.right - padR;

        let overBottom = 0;
        let overRight = 0;
        let overTop = 0;

        for (const el of s.querySelectorAll('*')) {
          const st = getComputedStyle(el);
          if (st.position === 'absolute' || st.position === 'fixed') continue;
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          overBottom = Math.max(overBottom, r.bottom - innerBottom);
          overRight = Math.max(overRight, r.right - innerRight);
          overTop = Math.max(overTop, innerTop - r.top);
        }

        const h = s.querySelector('h1, h2, h3, h4');
        const text = (s.innerText || '').replace(/\s+/g, ' ').trim();
        const listItems = s.querySelectorAll('li').length;

        return {
          n: i + 1,
          heading: h ? h.innerText.trim().slice(0, 60) : '(без заголовка)',
          overBottom: Math.round(Math.max(0, overBottom - TOL)),
          overRight: Math.round(Math.max(0, overRight - TOL)),
          overTop: Math.round(Math.max(0, overTop - TOL)),
          chars: text.length,
          listItems,
          dense: text.length > MAX_CHARS || listItems > MAX_LIST_ITEMS,
        };
      });
    },
    OVERFLOW_TOLERANCE,
    MAX_CHARS,
    MAX_LIST_ITEMS,
  );

  const name = basename(file);
  const count = report.length;
  const overflows = report.filter((r) => r.overBottom || r.overRight || r.overTop);
  const denses = report.filter((r) => r.dense);

  console.log(`\n── ${name}`);
  console.log(`   слайдов: ${count}`);

  if (count < MIN_SLIDES || count > MAX_SLIDES) {
    console.log(`   ✗ вне диапазона ${MIN_SLIDES}–${MAX_SLIDES}`);
    failed = true;
  }

  if (overflows.length) {
    failed = true;
    console.log(`   ✗ переполнение на ${overflows.length} слайд(ах):`);
    for (const r of overflows) {
      const parts = [];
      if (r.overBottom) parts.push(`низ +${r.overBottom}px`);
      if (r.overRight) parts.push(`право +${r.overRight}px`);
      if (r.overTop) parts.push(`верх +${r.overTop}px`);
      console.log(`      #${r.n} «${r.heading}» — ${parts.join(', ')}`);
    }
  } else {
    console.log('   ✓ переполнений нет');
  }

  if (denses.length) {
    console.log(`   ⚠ перегруз (>${MAX_CHARS} знаков или >${MAX_LIST_ITEMS} пунктов) на ${denses.length} слайд(ах):`);
    for (const r of denses) {
      console.log(`      #${r.n} «${r.heading}» — ${r.chars} знаков, ${r.listItems} пунктов`);
    }
  }

  if (shots && overflows.length) {
    const dir = resolve('build/overflow');
    mkdirSync(dir, { recursive: true });
    const sections = await page.$$('section');
    for (const r of overflows) {
      const el = sections[r.n - 1];
      if (!el) continue;
      const out = `${dir}/${basename(file, '.html')}-${String(r.n).padStart(3, '0')}.png`;
      await el.screenshot({ path: out });
      console.log(`      снимок: ${out}`);
    }
  }

  await page.close();
}

await browser.close();

console.log(failed ? '\n✗ Проверка не пройдена' : '\n✓ Все проверки пройдены');
process.exit(failed ? 1 : 0);
