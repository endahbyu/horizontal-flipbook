# Page-turn sound

`page-turn.mp3` is played by `js/reader-sound.js` on every single-page turn (covers slightly lower in pitch). If it is missing, the reader stays silent.

To replace it: `tools/prepare-sounds.sh <input file> page-turn` (trims silence, mono, loudness-normalised, ~96 kbps MP3).

## Source

- `page-turn.mp3` — converted from `page-turn-sound.ogg`, supplied by the project owner.
