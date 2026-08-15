#!/usr/bin/env bash
# Скачивает общедоступные картинки к трём колодам в assets/memes/downloaded/.
# Запускать на машине с обычным доступом в интернет: ./fetch.sh
# Что не скачалось — печатается в конце; для каждой позиции в каталогах
# есть поисковый запрос-запаска.

set -u
BASE="$(cd "$(dirname "$0")" && pwd)"
OUT="$BASE/downloaded"
UA="Mozilla/5.0 (slide-assets-fetcher for internal training deck)"
OK=0
FAIL=()

get() { # get <относительный путь> <url>
  local rel="$1" url="$2" dest
  dest="$OUT/$rel"
  mkdir -p "$(dirname "$dest")"
  if curl -fsSL --retry 2 --max-time 60 -A "$UA" -o "$dest" "$url"; then
    echo "  OK   $rel"
    OK=$((OK + 1))
  else
    echo "  FAIL $rel"
    FAIL+=("$rel  <-  $url")
    rm -f "$dest"
  fi
}

commons() { # commons <относительный путь> <имя файла на Commons>
  get "$1" "https://commons.wikimedia.org/wiki/Special:FilePath/$2"
}

echo "== Часть 1: как машину научили читать =="
commons "01/1-5-matrix-rain.gif"        "Digital_rain_animation_medium_letters_shine.gif"
commons "01/1-6-turing.jpg"             "Alan_Turing_Aged_16.jpg"
commons "01/2-3-hype-cycle.svg"         "Gartner_Hype_Cycle.svg"
commons "01/2-4-eliza.png"              "ELIZA_conversation.png"
get     "01/2-8-xkcd-machine-learning.png" "https://imgs.xkcd.com/comics/machine_learning.png"
commons "01/6-9-goldfish.jpg"           "Common_goldfish.JPG"

echo "== Часть 2: большие модели и агенты =="
get     "02/1-6-attention-paper.pdf"    "https://arxiv.org/pdf/1706.03762"
commons "02/1-6-transformer-arch.png"   "Transformer,_full_architecture.png"
commons "02/2-3-long-room-library.jpg"  "Long_Room_Interior,_Trinity_College_Dublin,_Ireland_-_Diliff.jpg"
commons "02/3-11-dunning-kruger.svg"    "Dunning%E2%80%93Kruger_Effect_01.svg"
get     "02/4-2-xkcd-citation-needed.png" "https://imgs.xkcd.com/comics/wikipedian_protester.png"
get     "02/6-9-xkcd-bobby-tables.png"  "https://imgs.xkcd.com/comics/exploits_of_a_mom.png"

echo "== Часть 3: воркшоп =="
get "03/1-1-xkcd-git.png"               "https://imgs.xkcd.com/comics/git.png"
get "03/5-5-xkcd-automation.png"        "https://imgs.xkcd.com/comics/automation.png"
get "03/5-5-xkcd-worth-the-time.png"    "https://imgs.xkcd.com/comics/is_it_worth_the_time.png"

echo "== Пустые мем-шаблоны (подписи — в каталогах) =="
get "templates/drake.jpg"               "https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg"
get "templates/distracted-boyfriend.jpg" "https://imgflip.com/s/meme/Distracted-Boyfriend.jpg"
get "templates/expanding-brain.jpg"     "https://imgflip.com/s/meme/Expanding-Brain.jpg"
get "templates/two-buttons.jpg"         "https://imgflip.com/s/meme/Two-Buttons.jpg"
get "templates/one-does-not-simply.jpg" "https://imgflip.com/s/meme/One-Does-Not-Simply.jpg"
get "templates/futurama-fry.jpg"        "https://imgflip.com/s/meme/Futurama-Fry.jpg"
get "templates/this-is-fine.jpg"        "https://imgflip.com/s/meme/This-Is-Fine.jpg"
get "templates/brace-yourselves.jpg"    "https://imgflip.com/s/meme/Brace-Yourselves-X-is-Coming.jpg"
get "templates/change-my-mind.jpg"      "https://imgflip.com/s/meme/Change-My-Mind.jpg"
get "templates/always-has-been.png"     "https://imgflip.com/s/meme/Always-Has-Been.png"

echo
echo "Готово: $OK файлов в $OUT"
if [ "${#FAIL[@]}" -gt 0 ]; then
  echo "Не скачалось (${#FAIL[@]}) — ищем по запросу из каталога:"
  printf '  %s\n' "${FAIL[@]}"
fi
