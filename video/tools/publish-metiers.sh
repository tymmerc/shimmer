#!/usr/bin/env bash
# Publie les variantes métier du film sur la page de visionnage de dev
# (https://dev.tymmerc.eu/shimmer/film/metiers/, noindex). Opération légère :
# copie des mp4 et extraction d'une affiche par ffmpeg (une image, pas de rendu).
# Usage : bash tools/publish-metiers.sh
set -euo pipefail
cd "$(dirname "$0")/.."
dest=../apps/showcase-dev/film/metiers
mkdir -p "$dest"
cp tools/page-metiers.html "$dest/index.html"
for v in cave epicerie mode enfant bijoux cosmetique; do
  src=out/shimmer-pov-$v.mp4
  if [ ! -f "$src" ]; then echo "manque $src (pas encore rendu)"; continue; fi
  cp "$src" "$dest/"
  # Affiche : le dock avec la question guidée et ses puces (12,4 s).
  ffmpeg -v error -y -ss 12.4 -i "$src" -frames:v 1 -q:v 3 "$dest/poster-$v.jpg"
  echo "publié $v"
done
