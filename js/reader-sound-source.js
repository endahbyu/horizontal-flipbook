// Page-turn sounds for the readers, bundled to js/reader-sound.js by esbuild.
// uisfx synthesises each cue with Web Audio, so no audio files are hosted.
import { createUISFX } from "uisfx";

const STORAGE_KEY = "p2630:sound";
const CUES = ["forward", "back", "open", "close"];

const ui = createUISFX({ pack: "zen", volume: 0.5, preferences: { key: STORAGE_KEY } });

// Off by default: only a viewer who switched sound on gets it.
let hasChoice = false;
try {
  hasChoice = typeof JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}").enabled === "boolean";
} catch (e) { /* storage unavailable: stay off */ }
if (!hasChoice) ui.setEnabled(false);

// Browsers only start audio after a user gesture.
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  ui.unlock().then(() => ui.preload(CUES)).catch(() => {});
}
["pointerdown", "keydown"].forEach((type) => window.addEventListener(type, unlock, { once: true, capture: true }));

window.P2630Sound = {
  play(cue) {
    if (ui.isEnabled()) ui.play(cue);
  },
  isEnabled: () => ui.isEnabled(),
  setEnabled(enabled) {
    ui.setEnabled(enabled);
    if (enabled) unlock();
  },
};
