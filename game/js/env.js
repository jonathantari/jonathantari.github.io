// Time of day, season and weather for an outing, and the sky/fog/mountain
// settings the renderer needs for each.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util;

  function params() { return location.search; }
  function dayInfo(d) {
    var start = new Date(d.getFullYear(), 0, 0), doy = (d - start) / 864e5, hr = d.getHours() + d.getMinutes() / 60;
    var len = 12 + 4 * Math.cos(2 * Math.PI * (doy - 172) / 365);
    return { hr: hr, rise: 12.8 - len / 2, set: 12.8 + len / 2, doy: doy };
  }
  // same rule as the landing page, plus a dusk band around sunset and sunrise
  function timeOfDay(d) {
    var q = params();
    if (/[?&]night/.test(q)) return "night";
    if (/[?&]dusk/.test(q)) return "dusk";
    if (/[?&]day/.test(q)) return "day";
    var i = dayInfo(d || new Date());
    if (i.hr < i.rise || i.hr > i.set) return "night";
    if (i.hr > i.set - 0.75 || i.hr < i.rise + 0.4) return "dusk";
    return "day";
  }
  function season(d) {
    var m = /[?&]season=(\w+)/.exec(params());
    if (m) return m[1];
    var mo = (d || new Date()).getMonth();
    return mo === 11 || mo < 2 ? "winter" : mo < 5 ? "spring" : mo < 8 ? "summer" : "autumn";
  }
  function rollWeather(se, r) {
    var m = /[?&]weather=(\w+)/.exec(params());
    if (m) return m[1];
    return U.weighted(r, GG.data.world.weather[se]).id;
  }

  // compose an outing's environment
  function roll(r) {
    var d = new Date(), tod = timeOfDay(d), se = season(d), we = rollWeather(se, r);
    if (we === "snow" && se === "summer") we = "rain";
    return { tod: tod, season: se, weather: we, wet: we === "rain", snowy: se === "winter" && (we === "snow" || r() < 0.5), date: d };
  }

  var PAL = {
    day: { sky: ["#4f8fcc", "#67a2d6", "#86b7e0", "#a8cce9", "#c6def0"], fog: "#c6def0", amb: [1, 1, 1] },
    dusk: { sky: ["#3a3f7a", "#6a508a", "#b0607a", "#e08a6a", "#f2b884"], fog: "#d8a088", amb: [0.95, 0.78, 0.72] },
    night: { sky: ["#0e1228", "#161b3c", "#202852", "#313868", "#454273"], fog: "#2a2f58", amb: [0.4, 0.44, 0.64] }
  };
  var GREY = {
    day: { sky: ["#7c8a98", "#8a98a6", "#9aa6b2", "#aab4be", "#b8c0c8"], fog: "#b8c0c8", amb: [0.86, 0.88, 0.92] },
    dusk: { sky: ["#4a4a6a", "#6a6080", "#8a7488", "#a8888e", "#b89a98"], fog: "#a8908e", amb: [0.78, 0.7, 0.7] },
    night: { sky: ["#101424", "#161a30", "#1c223c", "#242a48", "#2c3252"], fog: "#262b48", amb: [0.36, 0.4, 0.56] }
  };
  var FOG = { clear: [34, 120], wind: [30, 110], rain: [16, 75], snow: [12, 62], fog: [3, 30] };

  var MT = {
    day: { m: "#7f9397", pine: "#73878c", fh: "#62786c", slab: "#b8a58e", hi: "#cfbda4", lo: "#93897f", snow: "#eef2f6" },
    dusk: { m: "#6a6080", pine: "#5e5676", fh: "#4e4a66", slab: "#c8907a", hi: "#e0a888", lo: "#8a6a72", snow: "#f2d8d0" },
    night: { m: "#1c2243", pine: "#191f3e", fh: "#161b36", slab: "#252b4f", hi: "#2b3259", lo: "#1a1f3e", snow: "#5a6088" }
  };
  Object.keys(MT).forEach(function (k) { Object.keys(MT[k]).forEach(function (q) { MT[k][q] = U.hx(MT[k][q]); }); });

  // the Flatirons and the ridge they lean against. az 0 = the way the street runs.
  function ridgeFn(scale, lift) {
    return function (az) {
      az = U.wrapA(az);
      if (az < -2.3 || az > 1.5) return null;
      var e = 0.035 + 0.075 * Math.exp(-Math.pow((az + 0.15) / 0.55, 2)) + 0.03 * Math.exp(-Math.pow((az + 1.3) / 0.5, 2));
      e += Math.sin(az * 23) * 0.003 + Math.sin(az * 61) * 0.0015;
      // tilted slabs make a saw edge along the crest
      if (az > -0.55 && az < 0.35) { var f = ((az + 0.55) * 9) % 1; e += (f < 0.55 ? f : (1 - f) * 1.2) * 0.012; }
      var edge = Math.min(1, (az + 2.3) / 0.35, (1.5 - az) / 0.35);
      return (e * edge + (lift || 0)) * scale;
    };
  }
  function rockFn(tod, snowy) {
    var c = MT[tod] || MT.day;
    return function (az, dep, x, y, py) {
      if (dep > 0.62) return (U.bay(x, y) > 0.75 && (x + y) % 3 === 0) ? c.pine : c.fh;
      if (snowy && py < 3 + ((x * 7) % 3)) return c.snow;
      if (az > -0.6 && az < 0.4 && dep < 0.55) {
        var f = (((az + 0.6) * 9 + dep * 1.1) % 1 + 1) % 1;
        if (f < 0.5) return f < 0.12 ? c.hi : f > 0.4 ? c.lo : c.slab;
      }
      return (U.bay(x, y) > 0.8 && (x + y * 2) % 5 === 0) ? c.pine : c.m;
    };
  }

  // seen from the top of a ball: a giant blurry world on every side (a car, a hedge, a house, a shoe)
  var GIANT = [
    { a: 0.25, w: 0.5, e: 0.075, c: "#a8584a", kind: "car" },     // a parked car, mountain-sized
    { a: 1.25, w: 0.42, e: 0.09, c: "#4a7a3a", kind: "hedge" },  // the hedge
    { a: 2.2, w: 0.42, e: 0.15, c: "#d8d0c0", kind: "house" },  // a house
    { a: 3.2, w: 0.3, e: 0.07, c: "#3a3a46", kind: "shoe" },    // somebody's shoe
    { a: 4.3, w: 0.5, e: 0.16, c: "#5a8a4a", kind: "tree" },    // a tree
    { a: 5.35, w: 0.22, e: 0.24, c: "#8a8a92", kind: "post" }    // a lamp post
  ];
  function giantAt(az) {
    az = ((az % 6.283) + 6.283) % 6.283;
    for (var i = 0; i < GIANT.length; i++) { var g = GIANT[i], d = U.wrapA(az - g.a) / g.w; if (Math.abs(d) <= 1) return { g: g, d: d }; }
    return null;
  }
  function giantFn() {
    return function (az) {
      var q = giantAt(az); if (!q) return 0.03 + 0.012 * Math.sin(az * 9);
      var g = q.g, d = Math.abs(q.d), e;
      if (g.kind === "car") e = g.e * (d < 0.55 ? 1 : 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - (d - 0.55) / 0.45)));
      else if (g.kind === "house") e = d < 0.92 ? g.e * (1 - 0.35 * d) : 0.05;
      else if (g.kind === "post") e = d < 0.3 ? g.e : d < 0.7 ? 0.08 : 0.04;
      else if (g.kind === "shoe") e = g.e * Math.sqrt(1 - d * d) * (q.d > 0 ? 1 : 0.7);
      else e = g.e * Math.sqrt(1 - d * d) * (0.88 + 0.12 * Math.sin(az * 60));
      return Math.max(0.03, e);
    };
  }
  function giantCol(tod) {
    var dim = tod === "night" ? 0.32 : tod === "dusk" ? 0.72 : 1;
    function D(c) { return U.dk(U.hx(c), dim); }
    var ground = D("#9aa080");
    return function (az, dep, x, y) {
      var q = giantAt(az); if (!q) return ground;
      var g = q.g, d = q.d;
      if (g.kind === "car") { if (dep > 0.12 && dep < 0.3 && Math.abs(d) < 0.5) return D(tod === "night" ? "#ffd890" : "#8ab0c8"); if (dep > 0.72 && (Math.abs(d - 0.6) < 0.16 || Math.abs(d + 0.6) < 0.16)) return D("#2a2a30"); }
      if (g.kind === "house") { var wx = ((d + 1) * 5) % 1, wy = dep * 6 % 1; if (wx > 0.3 && wx < 0.7 && wy > 0.3 && wy < 0.75 && dep < 0.8) return D(tod === "night" ? "#ffd890" : "#7a90a8"); }
      if (g.kind === "shoe" && dep < 0.4 && ((x + y) % 4 === 0)) return D("#f2f0e8");
      if ((g.kind === "hedge" || g.kind === "tree") && U.bay(x, y) > 0.7) return D(g.kind === "tree" ? "#6a9a58" : "#5a8a48");
      if (g.kind === "tree" && dep > 0.6 && Math.abs(d) < 0.12) return D("#6a4a32");
      return D(g.c);
    };
  }

  // renderer settings. kind: street|trail|summit|tiny. north: bearing offset of the scene
  function render(E, kind, opt) {
    opt = opt || {};
    var grey = E.weather === "rain" || E.weather === "fog" || E.weather === "snow";
    var P = (grey ? GREY : PAL)[E.tod];
    var fog = FOG[E.weather] || FOG.clear;
    var near = fog[0], far = fog[1];
    if (kind === "summit") { near *= 2; far *= 3; }
    if (kind === "tiny") { near = 10; far = 60; }
    if (kind === "ball") { near = Math.min(near, 14); far = Math.min(Math.max(far, 46), 52); }
    var o = {
      sky: P.sky, fog: P.fog, amb: P.amb.slice(), fogNear: near, fogFar: far,
      north: opt.north || 0, dark: E.tod === "night"
    };
    if (kind !== "tiny" && kind !== "ball" && E.weather !== "fog") {
      o.ridge = ridgeFn(kind === "trail" ? 2.6 : kind === "summit" ? 1.3 : 1.7, 0);
      o.rock = rockFn(E.tod, E.season === "winter");
      o.ridgeHaze = grey ? 0.45 : 0.18;
    }
    if (E.tod === "night" && E.weather !== "fog" && E.weather !== "rain") {
      var r = U.rng(77), st = [];
      for (var i = 0; i < 160; i++) st.push({ az: r() * 6.283, el: 0.04 + Math.pow(r(), 0.7) * 1.1, p: r() * 6.28, sp: 0.3 + r() * 0.6 });
      if (GG.save && GG.save.data.ballOrbit) st.push({ az: 0.55, el: 0.42, p: 0, sp: 2.2, big: true, c: [255, 226, 160] });
      o.stars = st;
      o.moon = { az: -0.9, el: 0.5 };
    }
    if (kind === "ball") { // the sky over a ball: the street, enormous and out of focus, all the way round
      o.ridge = giantFn(); o.rock = giantCol(E.tod); o.ridgeDown = true; o.ridgeHaze = grey ? 0.62 : 0.5;
      if (E.tod === "day") { o.sky = ["#7fb2e2", "#9cc4ea", "#b8d6f0", "#d2e4f4", "#e6eef6"]; o.fog = grey ? P.fog : "#dfe9f2"; }
    }
    if (kind === "tiny") { o.sky = ["#86b7e0", "#a8cce9", "#c6def0", "#dfeaf2", "#eef4f6"]; o.fog = "#e6eef0"; if (E.tod === "night") { o.sky = P.sky; o.fog = P.fog; } }
    return o;
  }

  GG.env = { roll: roll, timeOfDay: timeOfDay, season: season, render: render, dayInfo: dayInfo, MT: MT };
})();
