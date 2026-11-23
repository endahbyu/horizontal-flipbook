// Sound: the client's background music (public/audio/ambient.webm, or ambient.m4a where WebM won't play), plus short cues for clicks, hovering and
// travelling between topics, made in the browser. Nothing plays until the visitor has interacted with the page,
// and everything can be muted for the visit; every visit starts with sound on.

let ctx: AudioContext | undefined, master: GainNode | undefined, music: HTMLAudioElement | undefined, musicUrl = '';
let muted = false, lastHover = 0;


function context() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return undefined;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One short tone that fades out: the building block for the cues. */
function tone(from: number, to: number, seconds: number, volume: number, type: OscillatorType = 'sine') {
  const c = context(); if (!c || !master || muted) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + seconds);
  g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  o.connect(g).connect(master); o.start(t); o.stop(t + seconds + 0.02);
}

export const sound = {
  get muted() { return muted; },
  /** `base`: where the music lives without its ending; the WebM is used where the browser plays it, AAC (.m4a) elsewhere (older iPhones). */
  init(base = '') { muted = false; try { localStorage.removeItem('sound'); } catch { /* private window */ } // sound is on at every visit (a choice from an earlier visit is cleared)
    musicUrl = base && (new Audio().canPlayType('audio/webm; codecs="opus"') ? `${base}.webm` : `${base}.m4a`); },
  setMuted(off: boolean) { muted = off; if (ctx && master) master.gain.setTargetAtTime(off ? 0 : 1, ctx.currentTime, 0.15); },
  /** Start the background music (looping, fading in). Call from a click, or the browser will refuse. */
  startAmbient() {
    const c = context(); if (!c || !master || music || !musicUrl) return;
    music = new Audio(musicUrl); music.loop = true; music.preload = 'auto';
    const gain = c.createGain(); gain.gain.value = 0; gain.gain.setTargetAtTime(0.5, c.currentTime, 1.5); // fades in over a few seconds
    c.createMediaElementSource(music).connect(gain).connect(master); // through the master volume, so muting works everywhere (iOS ignores an audio element's own volume)
    void music.play().catch(() => { music = undefined; }); // refused (no click yet): try again on the next one
  },
  click() { tone(720, 420, 0.09, 0.07); },
  hover() { const now = performance.now(); if (now - lastHover < 90) return; lastHover = now; tone(1250, 1100, 0.04, 0.018, 'triangle'); },
  /** Travelling to another topic: a short rush of filtered noise. */
  travel() {
    const c = context(); if (!c || !master || muted) return;
    const length = Math.floor(c.sampleRate * 0.9), buffer = c.createBuffer(1, length, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), filter = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = buffer; filter.type = 'bandpass'; filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(300, t); filter.frequency.exponentialRampToValueAtTime(2400, t + 0.45); filter.frequency.exponentialRampToValueAtTime(400, t + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(filter).connect(g).connect(master); src.start(t);
  },
};
