#!/usr/bin/env node
// Извлекает спикерские заметки из колоды Marp в печатный сценарий.
//
// Соглашение по слайдам:
//   <!-- @ 3.4 токены: разбор фразы -->   ← навигационный якорь (строка с @)
//   ## Заголовок слайда
//   ...контент...
//   <!--
//   Тезис раз.
//   Тезис два.
//   Хронометраж: 90
//   -->
//
// Директивы Marp (_class:, _backgroundColor: и т.п.) заметками не считаются.
//
// Использование: node scripts/extract-notes.mjs decks/01-nlp-osnovy.md > build/notes-01.md

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Использование: node scripts/extract-notes.mjs <deck.md>');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');

// --- отрезаем YAML front matter -------------------------------------------
let body = raw;
let frontMatter = '';
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (fm) {
  frontMatter = fm[1];
  body = raw.slice(fm[0].length);
}

// --- режем на слайды по `---`, не трогая fenced code -----------------------
const lines = body.split(/\r?\n/);
const slides = [];
let current = [];
let inFence = false;

for (const line of lines) {
  if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
  if (!inFence && /^---\s*$/.test(line)) {
    slides.push(current);
    current = [];
  } else {
    current.push(line);
  }
}
slides.push(current);

// --- разбор одного слайда --------------------------------------------------
const DIRECTIVE = /^\s*_?[a-zA-Z][a-zA-Z0-9]*\s*:/;

function parseSlide(slideLines) {
  const text = slideLines.join('\n');
  const comments = [...text.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim());

  let anchor = null;
  const noteChunks = [];

  for (const c of comments) {
    if (c.startsWith('@')) {
      anchor = c.replace(/^@\s*/, '').trim();
      continue;
    }
    // директива Marp: все непустые строки вида `key: value`
    const nonEmpty = c.split('\n').map((l) => l.trim()).filter(Boolean);
    if (nonEmpty.length && nonEmpty.every((l) => DIRECTIVE.test(l))) continue;
    noteChunks.push(c);
  }

  const note = noteChunks.join('\n\n');

  // хронометраж
  let seconds = null;
  const t = note.match(/Хронометраж\s*:\s*(\d+)/i);
  if (t) seconds = parseInt(t[1], 10);
  const noteClean = note.replace(/^.*Хронометраж\s*:.*$/gim, '').trim();

  // заголовок — первый markdown-heading вне комментариев
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
  const h = withoutComments.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*$/m);
  const heading = h ? h[2].trim() : null;

  const hasContent = withoutComments.trim().length > 0;

  return { anchor, note: noteClean, seconds, heading, hasContent };
}

const parsed = slides.map(parseSlide).filter((s) => s.hasContent || s.note);

// --- сводка ----------------------------------------------------------------
const total = parsed.reduce((a, s) => a + (s.seconds || 0), 0);
const missing = parsed.filter((s) => !s.seconds).length;
const deckTitle = (frontMatter.match(/^title:\s*(.+)$/m) || [])[1] || basename(file, '.md');

const mm = Math.floor(total / 60);
const ss = String(total % 60).padStart(2, '0');

const out = [];
out.push(`# Сценарий: ${deckTitle}`);
out.push('');
out.push(`- Слайдов: **${parsed.length}**`);
out.push(`- Суммарный хронометраж: **${mm}:${ss}** (${total} с)`);
if (missing) out.push(`- Без указанного хронометража: **${missing}** слайд(ов)`);
out.push('');
out.push('---');
out.push('');

let running = 0;
parsed.forEach((s, i) => {
  const n = i + 1;
  const at = `${String(Math.floor(running / 60)).padStart(2, '0')}:${String(running % 60).padStart(2, '0')}`;
  running += s.seconds || 0;

  const title = s.heading || (s.anchor ? `_${s.anchor}_` : '(без заголовка)');
  const dur = s.seconds ? `${s.seconds} с` : '—';

  out.push(`## ${n}. ${title}`);
  out.push('');
  out.push(`\`${at}\` · длительность: ${dur}${s.anchor ? ` · якорь: \`${s.anchor}\`` : ''}`);
  out.push('');
  out.push(s.note ? s.note : '_заметок нет_');
  out.push('');
});

process.stdout.write(out.join('\n'));
