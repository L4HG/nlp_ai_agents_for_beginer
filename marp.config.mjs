// Конфигурация сборки Marp.
//
// ВАЖНО: emoji.* и math отключены намеренно, это не косметика.
// Marp-core по умолчанию рендерит эмодзи как <img> на cdn.jsdelivr.net (twemoji),
// а KaTeX тянет оттуда же шрифты. Chromium, через который идёт экспорт в PDF,
// в этом окружении не имеет выхода в сеть — включённые эмодзи/математика дают
// битые картинки в PDF. Системный Noto Color Emoji установлен, поэтому эмодзи
// прекрасно рендерятся обычным текстом.
export default {
  allowLocalFiles: true,
  html: true,
  themeSet: ['./theme'],
  pdfNotes: true,
  pdfOutlines: { pages: false, headings: true },
  options: {
    emoji: { shortcode: false, unicode: false },
    math: false,
  },
};
