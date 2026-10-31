// Soft 8-bit blips, made on the fly. Quiet by default; silent until the first tap or key.
(function () {
  "use strict";
  var GG = window.GG, ac = null, vol = 0.05, muted = false;
  try { muted = localStorage.getItem("garage.game.mute") === "1"; } catch (e) {}
  function unlock() {
    if (muted) return;
    // iPhones mute Web Audio when the ringer switch is on silent unless the page says it's media playback
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && !unlock.primed) { // older iOS: a silent buffer played inside the tap wakes the audio up
      try { var b = ac.createBuffer(1, 1, 22050), s0 = ac.createBufferSource(); s0.buffer = b; s0.connect(ac.destination); s0.start(0); unlock.primed = true; } catch (e) {}
    }
    if (ac && ac.state === "suspended") ac.resume();
    if (ac) music.start();
  }

  // ---------- music: a slow, soft lo-fi loop, made up as it goes ----------
  // four-chord loop on a warm triangle pad, a quiet bass, a sparse pentatonic melody,
  // all through a low-pass filter. Night swaps to a minor, slower loop.
  var music = (function () {
    var bus = null, timer = null, next = 0, step = 0, rnd = Math.random;
    var DAY = { bpm: 78, prog: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], scale: [60, 62, 64, 67, 69, 72, 74, 76] };
    var NIGHT = { bpm: 66, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], scale: [57, 60, 62, 64, 67, 69, 72] };
    // fog and night-in-the-rain: wobbly and a bit spooky. Rain: slow and soft. Face-offs: quick and tense.
    var SPOOKY = { bpm: 58, prog: [[57, 60, 63, 66], [56, 59, 62, 65], [53, 56, 60, 63], [52, 56, 59, 62]], scale: [57, 59, 60, 63, 64, 66, 68], wob: true };
    var RAIN = { bpm: 62, prog: [[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [57, 60, 64, 67]], scale: [60, 62, 64, 65, 67, 69, 72] };
    var BATTLE = { bpm: 132, prog: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], scale: [57, 59, 60, 62, 64, 65, 67, 69], drive: true };
    function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
    function noiseHit(t) {
      var n = (ac.sampleRate * 0.05) | 0, b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0);
      for (var i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = 0.04; s.connect(g); g.connect(bus); s.start(t);
    }
    function note(n, t, d, type, v, cut) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = hz(n);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.08, d * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
    }
    function mood() {
      var G = GG.game; if (!G) return DAY;
      if (G.musicMood === "battle") return BATTLE;
      var E = G.mode() !== "landing" && G.E, night = E ? E.tod === "night" : (window.GGLanding && window.GGLanding.get().night);
      if (E && (E.weather === "fog" || (night && E.weather === "rain"))) return SPOOKY;
      if (E && E.weather === "rain") return RAIN;
      return night ? NIGHT : DAY;
    }
    function tick() {
      if (!ac || muted) return;
      while (next < ac.currentTime + 0.4) {
        var M = mood(), beat = 60 / M.bpm / 2, bar = (step >> 3) % 4, ch = M.prog[bar], i = step % 8;
        if (i === 0) { ch.forEach(function (n) { note(n + (M.wob ? (rnd() < 0.3 ? 1 : 0) : 0), next, beat * 8, "triangle", 0.05); }); note(ch[0] - 24, next, beat * 3, "square", 0.035); }
        if (i === 4) note(ch[0] - 24 + (rnd() < 0.5 ? 7 : 0), next, beat * 3, "square", 0.03);
        if (M.drive) { note(ch[0] - 24 + (i % 2 ? 12 : 0), next, beat * 0.8, "square", 0.03); if (i % 4 === 2) noiseHit(next); }
        var sw = i % 2 ? beat * 0.12 : 0; // a little swing
        if (rnd() < (i % 2 ? 0.22 : 0.38)) note(M.scale[(rnd() * M.scale.length) | 0] + 12, next + sw, beat * (rnd() < 0.3 ? 3 : 1.5), "square", 0.022);
        next += beat; step++;
      }
    }
    return {
      start: function () {
        if (timer || !ac) return;
        bus = ac.createGain(); bus.gain.value = 0.9;
        var lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = 0.4;
        bus.connect(lp); lp.connect(ac.destination);
        next = ac.currentTime + 0.1; step = 0;
        timer = setInterval(tick, 120);
      },
      stop: function () { clearInterval(timer); timer = null; if (bus) { try { bus.disconnect(); } catch (e) {} bus = null; } }
    };
  })();
  function tone(f, d, type, v, slide, delay) {
    if (!ac || muted) return;
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime((v || 1) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, v) {
    if (!ac || muted) return;
    var n = ac.sampleRate * d, b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = (v || 1) * vol;
    s.connect(g); g.connect(ac.destination); s.start();
  }
  // after the first unlock, any tap or key re-wakes audio (iOS suspends it when you leave the tab)
  ["touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, function () { if (ac && !muted) { if (ac.state !== "running") ac.resume(); } }, { passive: true }); });
  GG.sfx = {
    unlock: unlock,
    toggle: function () { muted = !muted; try { localStorage.setItem("garage.game.mute", muted ? "1" : "0"); } catch (e) {} if (!muted) unlock(); else music.stop(); return muted; },
    muted: function () { return muted; },
    blip: function () { tone(520 + Math.random() * 40, 0.03, "square", 0.35); },
    tick: function () { tone(880, 0.04, "square", 0.4); },
    ok: function () { tone(660, 0.05, "square", 0.5); tone(990, 0.07, "square", 0.5, null, 0.05); },
    get: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.08, "square", 0.5, null, i * 0.07); }); },
    pack: function () { tone(330, 0.08, "triangle", 0.8); tone(440, 0.1, "triangle", 0.8, null, 0.06); },
    shutter: function () { noise(0.06, 1.2); tone(1800, 0.03, "square", 0.4, null, 0.05); },
    boing: function () { tone(220, 0.25, "triangle", 1, 440); },
    whoosh: function () { noise(0.25, 0.8); },
    boot: function () { noise(0.08, 1.5); tone(120, 0.15, "square", 1, 60); tone(400, 1.2, "triangle", 0.6, 2400, 0.1); },
    ding: function () { tone(1568, 0.25, "triangle", 0.8); tone(1568, 0.25, "triangle", 0.8, null, 0.3); },
    jingle: function () { [784, 880, 784, 659, 784, 988, 880].forEach(function (f, i) { tone(f, 0.16, "triangle", 0.7, null, i * 0.18); }); },
    roar: function () { noise(0.7, 2); tone(90, 0.7, "sawtooth", 1, 50); },
    shrink: function () { tone(880, 0.6, "square", 0.6, 110); },
    grow: function () { tone(110, 0.6, "square", 0.6, 880); }
  };
})();
