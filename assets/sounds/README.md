# Page-turn sounds

The reader plays these recorded files (Web Audio, `js/reader-sound.js`). Any that are missing are skipped silently.

| File | Used for |
|---|---|
| `page-flip-1.mp3`, `page-flip-2.mp3`, `page-flip-3.mp3` | Paper page turns (one picked at random) |
| `book-open.mp3` | Front cover opening / back cover reopening (falls back to a page flip) |
| `book-close.mp3` | Closing onto a cover (falls back to a page flip) |

Add a recording with: `tools/prepare-sounds.sh <input file> <name>` (trims silence, mono, loudness-normalised, ~96 kbps MP3).

Use only recordings you have the right to publish (e.g. CC0), and note the source and licence below.

## Sources

_None yet._
