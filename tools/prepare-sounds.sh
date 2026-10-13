#!/usr/bin/env bash
# Convert recorded page-turn sounds into the reader's format.
#
# Usage: tools/prepare-sounds.sh <input-file> <output-name>
#   e.g. tools/prepare-sounds.sh ~/Downloads/page-turn-sound.ogg page-turn
#
# The reader plays assets/sounds/page-turn.mp3.
#
# Trims leading silence, mixes to mono, normalises loudness, and encodes a
# small MP3 (plays in every browser, including Safari).
set -euo pipefail
in="$1"; name="$2"
out="$(dirname "$0")/../assets/sounds/${name}.mp3"
ffmpeg -hide_banner -loglevel error -y -i "$in" \
  -af "silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-20:TP=-2" \
  -ac 1 -ar 44100 -codec:a libmp3lame -b:a 96k "$out"
echo "Wrote $out ($(wc -c < "$out") bytes)"
