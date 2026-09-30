#!/usr/bin/env bash
# Pose la musique sur une vidéo muette, sans réencoder l'image.
# Usage : bash tools/mux.sh <video-muette.mp4> <musique.wav> <sortie.mp4>
# La musique se régénère avec : python3 music/compose.py out/music/raw.wav
# puis : python3 music/normalize.py out/music/raw.wav out/music/music.wav
set -euo pipefail
video="$1"
audio="$2"
out="$3"
dur=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 "$video")
ffmpeg -v error -y -i "$video" -i "$audio" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -t "$dur" -movflags +faststart "$out"
echo "OK $out (${dur}s)"
