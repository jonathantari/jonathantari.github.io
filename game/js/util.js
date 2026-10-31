// Shared helpers: colour, random numbers, dithering, tiny promises.
(function () {
  "use strict";
  var GG = window.GG = window.GG || {};

  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // cheap integer hash for ground texture, 0..1
  function h2(x, y) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function hx(s) { if (s.length === 4) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)]; }
  function col(c) { return typeof c === "string" ? hx(c) : c; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function dk(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function pack(r, g, b) { return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrapA(a) { while (a > Math.PI) a -= 6.283185307; while (a < -Math.PI) a += 6.283185307; return a; }
  function pick(r, a) { return a[(r() * a.length) | 0]; }
  // weighted draw; items carry .w (default 1)
  function weighted(r, items) {
    var tot = 0, i;
    for (i = 0; i < items.length; i++) tot += items[i].w == null ? 1 : items[i].w;
    var x = r() * tot;
    for (i = 0; i < items.length; i++) { x -= items[i].w == null ? 1 : items[i].w; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function wait(s) { return new Promise(function (res) { setTimeout(res, s * 1000); }); }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; }); }

  GG.util = { bay: bay, rng: rng, h2: h2, hx: hx, col: col, mix: mix, dk: dk, css: css, pack: pack, clamp: clamp, lerp: lerp, wrapA: wrapA, pick: pick, weighted: weighted, wait: wait, fmt: fmt };
})();
