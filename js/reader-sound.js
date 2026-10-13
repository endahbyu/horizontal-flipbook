// Page-turn sound for the readers: one recorded sample played with Web Audio.
// File: assets/sounds/page-turn.mp3. If it can't load, the reader stays silent.
(function () {
  "use strict";

  var SRC = "assets/sounds/page-turn.mp3";
  var STORAGE_KEY = "p2630:sound";
  var VOLUME = 0.6;
  var COOLDOWN_MS = 120;

  var ctx = null;
  var buffer = null;
  var lastPlay = 0;

  function readEnabled() {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}").enabled === true; }
    catch (e) { return false; } // off unless the viewer turned it on
  }
  var enabled = readEnabled();

  // Browsers only start audio after a user gesture.
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      fetch(SRC)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (data) { return ctx.decodeAudioData(data); })
        .then(function (decoded) { buffer = decoded; })
        .catch(function () { /* no sound file: stay silent */ });
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  ["pointerdown", "keydown"].forEach(function (type) {
    window.addEventListener(type, function () { if (enabled) unlock(); }, { capture: true });
  });

  window.P2630Sound = {
    // `cue` (forward / back / open / close) only varies the pitch slightly,
    // so covers sound a touch heavier than paper.
    play: function (cue) {
      if (!enabled || !buffer) return;
      var now = Date.now();
      if (now - lastPlay < COOLDOWN_MS) return;
      lastPlay = now;
      var source = ctx.createBufferSource();
      var gain = ctx.createGain();
      source.buffer = buffer;
      var base = cue === "open" || cue === "close" ? 0.85 : 1;
      source.playbackRate.value = base * (0.95 + Math.random() * 0.1);
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
