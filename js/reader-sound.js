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

  // On by default; only an explicit "Mute" (stored as enabled:false) turns it off.
  function readEnabled() {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}").enabled !== false; }
    catch (e) { return true; }
  }
  var enabled = readEnabled();

  // Download the sample right away; it is decoded once audio is unlocked.
  var data = fetch(SRC)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .catch(function () { return null; }); // no sound file: stay silent

  // Browsers (iOS Safari above all) only start audio inside a user gesture.
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      data.then(function (bytes) {
        if (!bytes) return;
        // Callback form: older iOS Safari has no promise-based decodeAudioData.
        ctx.decodeAudioData(bytes.slice(0), function (decoded) { buffer = decoded; }, function () {});
      });
    }
    if (ctx.state === "suspended" || ctx.state === "interrupted") ctx.resume();
  }
  // Decode ahead of time (a suspended context can decode); the first
  // gesture then only has to resume it, so the very first turn is heard.
  if (enabled) unlock();

  ["pointerdown", "touchend", "keydown"].forEach(function (type) {
    window.addEventListener(type, function () { if (enabled) unlock(); }, { capture: true });
  });

  window.P2630Sound = {
    // `cue` (forward / back / open / close) only varies the pitch slightly,
    // so covers sound a touch heavier than paper.
    play: function (cue) {
      if (!enabled) return;
      unlock();
      if (!buffer) return;
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
