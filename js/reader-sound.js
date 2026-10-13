// Page-turn sounds for the readers: recorded samples played with Web Audio.
// Files live in assets/sounds/ (MP3, plays in every browser). Missing files
// are skipped silently, so the reader works before the sounds are added.
(function () {
  "use strict";

  var BASE = "assets/sounds/";
  var STORAGE_KEY = "p2630:sound";
  var VOLUME = 0.6;
  var COOLDOWN_MS = 120;

  // Each cue picks one of its files at random, so repeated turns don't sound
  // identical. Covers fall back to the paper sounds if their files are missing.
  var CUES = {
    forward: ["page-flip-1", "page-flip-2", "page-flip-3"],
    back: ["page-flip-1", "page-flip-2", "page-flip-3"],
    open: ["book-open"],
    close: ["book-close"],
  };
  var FALLBACK = { open: "forward", close: "back" };

  var ctx = null;
  var buffers = {};   // name -> AudioBuffer | null (null = missing)
  var lastPlay = 0;

  function readEnabled() {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}").enabled === true; }
    catch (e) { return false; } // off unless the viewer turned it on
  }
  var enabled = readEnabled();

  function load(name) {
    if (name in buffers) return;
    buffers[name] = null;
    fetch(BASE + name + ".mp3")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (data) { return ctx.decodeAudioData(data); })
      .then(function (buffer) { buffers[name] = buffer; })
      .catch(function () { /* file not added yet: stay silent */ });
  }

  // Browsers only start audio after a user gesture.
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    Object.keys(CUES).forEach(function (cue) { CUES[cue].forEach(load); });
  }
  ["pointerdown", "keydown"].forEach(function (type) {
    window.addEventListener(type, function () { if (enabled) unlock(); }, { capture: true });
  });

  function pick(cue) {
    var ready = (CUES[cue] || []).filter(function (n) { return buffers[n]; });
    if (!ready.length && FALLBACK[cue]) return pick(FALLBACK[cue]);
    return ready.length ? buffers[ready[Math.floor(Math.random() * ready.length)]] : null;
  }

  window.P2630Sound = {
    play: function (cue) {
      if (!enabled || !ctx) return;
      var now = Date.now();
      if (now - lastPlay < COOLDOWN_MS) return;
      var buffer = pick(cue);
      if (!buffer) return;
      lastPlay = now;
      var source = ctx.createBufferSource();
      var gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 0.94 + Math.random() * 0.12; // slight variation
      gain.gain.value = VOLUME;
      source.connect(gain).connect(ctx.destination);
      source.start();
    },
    isEnabled: function () { return enabled; },
    setEnabled: function (on) {
      enabled = !!on;
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: enabled })); } catch (e) { /* ignore */ }
      if (enabled) unlock();
    },
  };
})();
