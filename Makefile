DECKS  := 01-nlp-osnovy 02-llm-i-agenty 03-workshop
MARP   := npx --no-install marp

# Chromium не лежит на PATH — автодетект marp-cli его не найдёт.
# Ищем по порядку: локальный Playwright-хром → симлинк → Google Chrome на macOS.
CHROME ?= $(firstword $(wildcard /opt/pw-browsers/chromium-*/chrome-linux/chrome) \
                      $(wildcard /opt/pw-browsers/chromium/chrome-linux/chrome) \
                      $(wildcard /Applications/Google Chrome.app/Contents/MacOS/Google Chrome))
export CHROME_PATH := $(CHROME)
export CHROME_DISABLE_GPU := 1

PDFS  := $(DECKS:%=build/%.pdf)
HTMLS := $(DECKS:%=build/%.html)
PPTXS := $(DECKS:%=build/%.pptx)
NOTES := $(DECKS:%=build/notes-%.md)

.PHONY: all pdf html pptx notes handouts check watch clean doctor release

all: pdf html notes

pdf:   $(PDFS)
html:  $(HTMLS)
pptx:  $(PPTXS)
notes: $(NOTES)

build:
	@mkdir -p build

build/%.pdf: decks/%.md theme/corporate.css marp.config.mjs | build
	$(MARP) --pdf --pdf-notes --pdf-outlines --allow-local-files -o $@ $<

build/%.html: decks/%.md theme/corporate.css marp.config.mjs | build
	$(MARP) --html --allow-local-files -o $@ $<

build/%.pptx: decks/%.md theme/corporate.css marp.config.mjs | build
	$(MARP) --pptx --allow-local-files -o $@ $<

# Готовые файлы для раздачи: PDF + PPTX + HTML в release/ (коммитятся в git).
# PPTX — послайдовый рендер (картинки), а не редактируемые фигуры: это цена
# точного соответствия вёрстке.
release: pdf html pptx
	@mkdir -p release
	cp $(PDFS) $(HTMLS) $(PPTXS) release/
	node scripts/inline-images.mjs $(HTMLS:build/%=release/%)
	@ls -lh release/

build/notes-%.md: decks/%.md scripts/extract-notes.mjs | build
	node scripts/extract-notes.mjs $< > $@

handouts: | build
	@mkdir -p build/workshop
	@for f in workshop/*.md; do \
		out=build/workshop/$$(basename $$f .md).pdf; \
		echo "  handout $$f -> $$out"; \
		$(MARP) --pdf --allow-local-files --theme handout -o $$out $$f || exit 1; \
	done

check: $(HTMLS) $(PDFS)
	node scripts/check-decks.mjs $(HTMLS)
	node scripts/pdf-pages.mjs   $(PDFS)

watch:
	$(MARP) -w --html --allow-local-files decks/$(DECK).md -o build/$(DECK).html

doctor:
	@echo "CHROME_PATH = $(CHROME_PATH)"
	@test -x "$(CHROME_PATH)" && echo "  chromium: OK" || echo "  chromium: MISSING"
	@echo -n "node: "; node --version
	@echo -n "marp: "; $(MARP) --version 2>/dev/null || echo "НЕ УСТАНОВЛЕН — запустите npm install"

clean:
	rm -rf build
