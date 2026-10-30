// The garage landing scene, copied from garage.jonathantari.com (index.html)
// with a few hooks so the game can draw the player into it. Keep in step with the live page.
(function () {
  "use strict";
  var cv = document.getElementById("c"), ctx = cv.getContext("2d");
  var link = document.getElementById("crate");
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function mk() { var c = document.createElement("canvas"); return { c: c, x: c.getContext("2d") }; }
  var SKY = mk(), BASE = mk(), GLOW = mk();

  // ---------- utils ----------
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
  function hx(s) { return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function dk(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var K = {
    skyDay: ["#4f8fcc", "#67a2d6", "#86b7e0", "#a8cce9", "#c6def0"].map(hx),
    skyNight: ["#0e1228", "#161b3c", "#202852", "#313868", "#454273"].map(hx),
    star: hx("#fff3d6"), moon: hx("#f4e7c0"),
    // house
    siding: hx("#43464c"), sidingLn: hx("#36383d"), sidingHi: hx("#4c4f56"),
    brick: hx("#3a3d42"), mortar: hx("#2e3034"),
    shingle: hx("#4a4d54"), shingleLn: hx("#3b3e44"),
    roofEdge: hx("#232529"), soffit: hx("#9a7350"),
    upper: hx("#b9bcbb"), upperLn: hx("#adb0af"), upperSh: hx("#9c9f9f"),
    stucco: hx("#c3c4c0"), stuccoLo: hx("#b5b6b2"),
    door: hx("#a8663c"), doorLn: hx("#8a5230"), stair: hx("#2b2d32"), stairHi: hx("#4a4d54"),
    trim: hx("#f1efe9"), trimSh: hx("#c9c6be"), frame: hx("#55585f"),
    glassDay: hx("#9fc0d8"), glassDayLo: hx("#6f93b0"), glassNight: hx("#1a2038"),
    warmHi: hx("#ffcf7a"), warmLo: hx("#f09a3e"), blind: hx("#d27a2c"),
    // ground
    grass: hx("#6a974a"), grassLo: hx("#5c8840"), grassHi: hx("#80ad5a"), grassDk: hx("#4f773a"),
    drive: hx("#bdb7ad"), driveLn: hx("#a29c92"), driveTrk: hx("#b1aba1"),
    wall: hx("#9f9d97"), wallCap: hx("#bab8b2"), wallSh: hx("#85837e"),
    walk: hx("#c7c2b9"), walkLn: hx("#aaa59c"),
    shrub: hx("#46703f"), shrubHi: hx("#5b8a4f"), flower: hx("#d8423e"),
    // garage interior
    ceil: hx("#b5ad9e"), wallIn: hx("#aea38f"), backIn: hx("#a39884"), floorIn: hx("#938e86"), floorSt: hx("#86817a"),
    track: hx("#55565e"), panel: hx("#4a4d54"), panelLn: hx("#3a3d43"), opener: hx("#3e3f45"),
    peg: hx("#9a7c58"), pegHole: hx("#6e5638"), metal: hx("#6a6d76"), steel: hx("#9a9ea8"), wood: hx("#a8784a"), woodDk: hx("#6e4a2c"),
    shelf: hx("#5e6068"), bins: ["#4f6f92", "#a2643f", "#c2a46a", "#5f7f5d", "#8a8d96", "#9c4f4f"].map(hx),
    card: hx("#b88d5a"), cardDk: hx("#99734a"), tape: hx("#d9c08c"),
    skiA: hx("#c8473f"), skiB: hx("#e6e2da"), hose: hx("#4f8a4a"),
    bulbOff: hx("#d9d5c8"), bulbOn: hx("#fff1c4"), cord: hx("#2a2a2e"), bead: hx("#d0b070"),
    // the crate
    crate: hx("#3f6fa3"), crateHi: hx("#5686ba"), crateLo: hx("#2f5582"), crateIn: hx("#223d5e"), hole: hx("#1d2f46"),
    sticker: hx("#f3eee2"), stickerLn: hx("#d6cfbd"), ink: hx("#2a2a30"), amber: hx("#f2a34b"),
    // trees
    trunk: hx("#5a4636"), leaf: hx("#4f7d3e"), leafHi: hx("#679950"), leafLo: hx("#3f6633"),
    pine: hx("#36553a"), pineHi: hx("#446a46"), pineLo: hx("#2b452f"),
    // mountains
    mDay: hx("#7f9397"), mDayPine: hx("#73878c"), fhDay: hx("#62786c"), fhDayPine: hx("#566c61"),
    slabDay: hx("#b8a58e"), slabDayHi: hx("#cfbda4"), slabDayLo: hx("#93897f"),
    mNight: hx("#1c2243"), mNightPine: hx("#191f3e"), fhNight: hx("#161b36"), fhNightPine: hx("#131830"),
    slabNight: hx("#252b4f"), slabNightHi: hx("#2b3259"), slabNightLo: hx("#1a1f3e"),
    wd: hx("#b08454"), wdHi: hx("#c69a66"), wdLo: hx("#8a6440"), wdGap: hx("#3e2c1e"), stencil: hx("#3a2a1e"),
    // cat
    cat: hx("#18161b"), catW: hx("#ecebe6"), eye: hx("#e8c84a")
  };

  // zones: 0 sky (transparent), 1 exterior, 2 garage interior, 3 far (unlit), 4 emissive, 5 ground
  var P, W, H, dpr, cssW, cssH, cssLeft, night;
  var A, Z, SPILL, OCC, FG = 0, MASK, MK = 0, OVB = mk(), OVG = mk();
  var zone = 1, R;
  var G = {}, wins = [];
  var VIEW = { frame: null, tod: null };
  window.garageView = function (frame, tod) { VIEW.frame = frame; VIEW.tod = tod; layout(); };
  var S = { bulb: true, porch: true, flick: 0, pull: -1 };
  // hooks for the game: draw on top, take clicks, pause while the 3D world runs
  var HOOK = window.GGLanding = { draw: null, click: null, paused: false, get: function () { return { G: G, W: W, H: H, P: P, dpr: dpr, night: night, cssW: cssW, cssH: cssH, cssLeft: cssLeft, K: K, S: S, canvas: cv }; } };

  function put(x, y, c) {
    x = x | 0; y = y | 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    var i = y * W + x; A[i * 3] = c[0]; A[i * 3 + 1] = c[1]; A[i * 3 + 2] = c[2]; Z[i] = zone;
    if (FG) OCC[i] = 1;
    if (MK) MASK[i] = 1;
  }
  function rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) put(x + i, y + j, c);
  }
  function poly(pts, fn) {
    var minY = 1e9, maxY = -1e9, n = pts.length;
    for (var k = 0; k < n; k++) { minY = Math.min(minY, pts[k][1]); maxY = Math.max(maxY, pts[k][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var sy = y + 0.5, xs = [];
      for (var e = 0; e < n; e++) {
        var a = pts[e], b = pts[(e + 1) % n];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (var m = 0; m + 1 < xs.length; m += 2)
        for (var x = Math.round(xs[m]); x < Math.round(xs[m + 1]); x++) fn(x, y);
    }
  }
  function blob(cx, cy, rx, ry, fn) {
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
      var d = ((x + 0.5 - cx) / rx) * ((x + 0.5 - cx) / rx) + ((y + 0.5 - cy) / ry) * ((y + 0.5 - cy) / ry);
      if (d <= 1) fn(x, y, d);
    }
  }
  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) { put(x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function ring(cx, cy, r, c) { for (var a = 0; a < 48; a++) { var t = a / 48 * 6.2832; put(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), c); } }

  var GLYPH = {
    t: [".#.", "###", ".#.", ".#.", "..#"],
    u: ["...", "#.#", "#.#", "#.#", ".##"],
    r: ["...", "#.#", "##.", "#..", "#.."],
    n: ["...", "##.", "#.#", "#.#", "#.#"],
    a: ["...", "##.", "..#", ".##", "###"],
    o: ["...", ".#.", "#.#", "#.#", ".#."],
    d: ["..#", "..#", ".##", "#.#", ".##"]
  };

  function isNight() {
    if (VIEW.tod) return VIEW.tod === "night";
    var q = location.search;
    if (/[?&]night/.test(q)) return true;
    if (/[?&]day/.test(q)) return false;
    var d = new Date(), start = new Date(d.getFullYear(), 0, 0);
    var doy = (d - start) / 864e5, hr = d.getHours() + d.getMinutes() / 60;
    var len = 12 + 4 * Math.cos(2 * Math.PI * (doy - 172) / 365);
    return hr < 12.8 - len / 2 || hr > 12.8 + len / 2;
  }

  // ---------- layout ----------
  function layout() {
    dpr = window.devicePixelRatio || 1;
    var vw = window.innerWidth, vh = window.innerHeight, off = 0;
    if (VIEW.frame) {
      var ar = VIEW.frame === "phone" ? 9 / 19.5 : 16 / 10, fw = vw, fh = vw / ar;
      if (fh > vh - 56) { fh = vh - 56; fw = fh * ar; }
      off = Math.round((vh - fh) / 2); vw = fw; vh = fh;
    }
    G.off = off;
    var dw = vw * dpr, dh = vh * dpr;
    P = Math.max(2, Math.floor(Math.min(dw / 160, dh / 215)));
    W = Math.ceil(dw / P); H = Math.ceil(dh / P);
    [cv, SKY.c, BASE.c, GLOW.c].forEach(function (c) { c.width = W; c.height = H; });
    cssW = W * P / dpr; cssH = H * P / dpr; cssLeft = (window.innerWidth - cssW) / 2;
    cv.style.width = cssW + "px"; cv.style.height = cssH + "px"; cv.style.left = cssLeft + "px"; cv.style.bottom = G.off + "px";

    var g = G, tall = H / W > 1.5;
    g.tall = tall;
    g.swH = 4;
    g.streetH = tall ? Math.round(H * 0.2) : clamp(Math.round(H * 0.17), 26, 60);
    g.gy = H - g.streetH;
    g.gw = tall ? Math.round(W * 0.66) : clamp(Math.round(Math.min(W * 0.4, (H * 0.9 - g.streetH - 8) / 1.52)), 80, 170);
    g.gh = Math.round(g.gw * 0.62);
    g.gx = tall ? W - 14 - g.gw : Math.round(W * 0.5 + g.gw * 0.11 - 6);
    g.gTop = g.gy - g.gh;
    g.floor = g.gTop - 8;
    g.bodyR = g.gx + g.gw + 12;
    g.bodyL = g.gx - g.gw;
    g.cxB = (g.bodyL + g.bodyR) / 2;
    g.half = (g.bodyR - g.bodyL) / 2 + 9;
    g.slope = 0.3;
    g.eave = g.floor - Math.round(g.gw * 0.25);
    g.peak = Math.round(g.eave - g.half * g.slope);
    g.brickBot = g.floor + Math.round(g.gh * 0.3);
    // the tall stucco block behind the gable, with a shed roof falling to the right
    g.twL = Math.round(g.bodyL - g.gw * 0.22); g.twR = Math.round(g.cxB - g.gw * 0.08);
    g.twTop = g.peak - Math.round((g.eave - g.peak) * 1.05);
    g.upTop = g.twTop;
    g.doorW = Math.round(g.gw * 0.12); g.doorX = g.bodyL - g.doorW - 4;
    g.mTop = Math.max(Math.round(H * 0.06), Math.round(g.peak - (g.gy - g.peak) * 0.22));
    g.flat = g.tall ? 0.7 : 0.8;
    g.ribs = [];
    var hc = W * (g.flat + 0.06);
    [-46, -32, -19, -8].forEach(function (o) { g.ribs.push(Math.round(hc + o)); });
    // interior perspective
    g.vx = g.gx + g.gw / 2; g.vy = g.gTop + Math.round(g.gh * 0.42); g.s = 0.6;
    g.L = Math.round(g.vx - g.gw / 2 * g.s); g.R = Math.round(g.vx + g.gw / 2 * g.s);
    g.T = Math.round(g.vy - (g.vy - g.gTop) * g.s); g.Bt = Math.round(g.vy + (g.gy - g.vy) * g.s);
    g.pH = Math.max(4, Math.round(g.gh * 0.08));
    g.bulbX = Math.round(g.vx - g.gw * 0.08); g.bulbY = g.gTop + g.pH + Math.round(g.gh * 0.1);
    g.sconce = { x: g.gx - 10, y: g.gTop + 8 };
    // the crate: bottom-left of the front face
    g.fw = 26; g.fh = 14; g.sd = 6; g.su = 4;
    g.cx = Math.round(g.vx - g.fw - 4); g.cy = g.gy - 5;

    night = isNight();
    var saved = loadLights();
    S.bulb = saved && typeof saved.bulb === "boolean" ? saved.bulb : true;
    S.porch = saved && typeof saved.porch === "boolean" ? saved.porch : true;
    if (/[?&]dark/.test(location.search)) S.bulb = false;
    placeLink();
    render();
    initDynamic();
    if (HOOK.layout) HOOK.layout();
  }

  function placeLink() {
    var g = G, k = P / dpr, bottom = window.innerHeight - G.off - cssH;
    var x = g.cx - 3, y = g.cy - g.fh - g.su - 9, w = g.fw + g.sd + 6, h = g.fh + g.su + 13;
    var L = cssLeft + x * k, T = bottom + y * k, Wd = w * k, Ht = h * k, pad = Math.max(0, (48 - Math.min(Wd, Ht)) / 2);
    link.style.left = (L - pad) + "px"; link.style.top = (T - pad) + "px";
    link.style.width = (Wd + pad * 2) + "px"; link.style.height = (Ht + pad * 2) + "px";
  }

  // ---------- static scene ----------
  function render() {
    var N = W * H;
    A = new Float32Array(N * 3); Z = new Uint8Array(N); SPILL = new Uint8Array(N); OCC = new Uint8Array(N); FG = 0; MASK = new Uint8Array(N);
    R = rng(17 + W * 7 + H * 3);
    wins = [];
    drawSky();
    drawMountains();
    drawBackTrees();
    drawTower();
    drawFacade();
    FG = 1; // anything drawn from here on sits in front of the windows
    drawGarage();
    drawGround();
    drawTrees();
    FG = 0;
    wins.forEach(function (w) {
      var hid = 0;
      for (var j = 0; j < w.h; j++) for (var i = 0; i < w.w; i++) if (OCC[(w.y + j) * W + w.x + i]) hid++;
      w.vis = 1 - hid / (w.w * w.h);
    });
    var sv = loadLights();
    if (night && sv && sv.wins && sv.wins.length === wins.length) wins.forEach(function (w, i) { var l = !!sv.wins[i]; if (l !== w.lit) { w.lit = l; glass(w); } });
    var g = G, sp = Math.round((g.H5 = H - g.swH - g.gy) * 0.35);
    poly([[g.gx, g.gy], [g.gx + g.gw, g.gy], [g.gx + g.gw + sp, H], [g.gx - sp, H]], function (x, y) {
      if (x >= 0 && y >= 0 && x < W && y < H) SPILL[y * W + x] = 1;
    });
    shadeAll();
  }

  function drawSky() {
    var st = night ? K.skyNight : K.skyDay, end = G.eave;
    var img = SKY.x.createImageData(W, H), d = img.data;
    for (var y = 0; y < H; y++) {
      var t = clamp(y / end, 0, 1) * (st.length - 1), i = Math.floor(t), f = t - i;
      for (var x = 0; x < W; x++) {
        var c = (f > bay(x, y) && i + 1 < st.length) ? st[i + 1] : st[i], o = (y * W + x) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    SKY.x.putImageData(img, 0, 0);
    if (night) {
      var mx = Math.round(W * (G.tall ? 0.22 : 0.18)), my = Math.round(Math.max(10, G.mTop * 0.45));
      for (var yy = -11; yy <= 11; yy++) for (var xx = -11; xx <= 11; xx++) {
        var dd = Math.sqrt(xx * xx + yy * yy);
        if (dd < 11 && dd > 6 && (11 - dd) / 5 * 0.3 > bay(mx + xx, my + yy)) { SKY.x.fillStyle = css(mix(st[1], st[3], 0.55)); SKY.x.fillRect(mx + xx, my + yy, 1, 1); }
        if (dd <= 5.2 && Math.sqrt((xx + 2.5) * (xx + 2.5) + (yy + 1.5) * (yy + 1.5)) > 4.6) { SKY.x.fillStyle = css(K.moon); SKY.x.fillRect(mx + xx, my + yy, 1, 1); }
      }
    }
  }

  // The Flatirons, seen from a way off: a low forested ridge whose face is
  // ribbed with long sandstone slabs tilted up toward their crests.
  function ridge(x) {
    var g = G, u = x / W, range = g.gy - g.mTop;
    var hump = Math.exp(-Math.pow((u - g.flat - 0.06) / 0.3, 2));
    var y = g.mTop + range * 0.42 - hump * range * 0.42 + Math.sin(x * 0.13) * 1.4 + Math.sin(x * 0.41) * 0.6;
    for (var i = 0; i < g.ribs.length; i++) { var d = Math.abs(x - g.ribs[i]); if (d < 2.5) y -= (2.5 - d) * 0.8; }
    return y;
  }
  function drawMountains() {
    zone = 3;
    var g = G, m = night ? K.mNight : K.mDay, mp = night ? K.mNightPine : K.mDayPine;
    var range = g.gy - g.mTop;
    for (var x = 0; x < W; x++) {
      var ry = Math.round(ridge(x));
      for (var y = ry; y < g.gy; y++) put(x, y, (bay(x, y) > 0.8 && (x + y * 2) % 5 === 0) ? mp : m);
    }
    var sl = night ? [K.slabNight, K.slabNightHi, K.slabNightLo] : [K.slabDay, K.slabDayHi, K.slabDayLo];
    // a few tilted rock fins on the ridge's left shoulder: narrow at the crest, widening and leaning down-right
    var lens = [0.13, 0.19, 0.16, 0.11], wids = [10, 15, 13, 8];
    g.ribs.forEach(function (rx, i) {
      var ty = Math.round(ridge(rx)) + 1, len = Math.round(range * lens[i]), wB = wids[i], lean = 0.45;
      for (var k = 0; k < len; k++) {
        var t = k / len, ww = Math.max(1, Math.round(1 + (wB - 1) * Math.pow(t, 0.5)));
        var x0 = Math.round(rx + k * lean - ww * 0.4), y = ty + k;
        for (var q = 0; q < ww; q++) {
          var c = q === ww - 1 ? sl[1] : (q < Math.max(1, ww * 0.35) ? sl[2] : sl[0]);
          if (t > 0.75 && bay(x0 + q, y) < (t - 0.75) * 3) continue; // ragged foot into the trees
          put(x0 + q, y, c);
        }
      }
    });
    // forest in front, swallowing the foot of the slabs
    var fh = night ? K.fhNight : K.fhDay, fp = night ? K.fhNightPine : K.fhDayPine;
    for (var x2 = 0; x2 < W; x2++) {
      var top2 = Math.round(g.gy - range * 0.42 + Math.sin(x2 * 0.07) * 3 + Math.sin(x2 * 0.29) * 1.5 - (x2 % 4 === 0 ? 1 : 0));
      for (var y2 = top2; y2 < g.gy; y2++) put(x2, y2, (bay(x2, y2) > 0.75 && (y2 + x2) % 3 === 0) ? fp : fh);
    }
  }

  function towerTop(x) { var g = G; return g.twTop + (x - g.twL) * 0.2; }
  function drawTower() {
    var g = G, x0 = g.twL, x1 = g.twR;
    zone = 1;
    for (var x = x0; x < x1; x++) {
      var t = Math.round(towerTop(x));
      for (var y = t; y < g.gy; y++) put(x, y, x >= x1 - 2 ? K.upperSh : (R() < 0.07 ? K.upperLn : K.upper));
      put(x, t, K.upperSh); put(x, t + 1, K.upperLn); // shadow under the eave
    }
    // shed roof: deep overhang on the high side
    for (var x2 = x0 - 8; x2 < x1 + 3; x2++) { var t2 = Math.round(towerTop(x2)); rect(x2, t2 - 3, 1, 3, K.roofEdge); }
    var ww = Math.round(g.gw * 0.13), wh = Math.round(g.gw * 0.19);
    var wx1 = Math.round(x0 + (x1 - x0) * 0.16), wx2 = Math.round(x0 + (x1 - x0) * 0.56);
    G.boxWin = window2(wx1, Math.round(towerTop(wx1 + ww)) + 7, ww, wh, false, { room: "shelf" });
    window2(wx2, Math.round(towerTop(wx2 + ww)) + 7, Math.round(ww * 0.85), Math.round(wh * 0.85), night, { room: "fan" });
    // the porch: tucked under the gable's long left eave, a door with a tall sidelight
    var L = g.bodyL, db = g.brickBot, dw = g.doorW, dx = g.doorX, dh = Math.round(g.gw * 0.3);
    for (var px = x0 + 1; px < L; px++) {
      var top = Math.round(g.peak + Math.abs(px + 0.5 - g.cxB) * g.slope) + 1;
      for (var py = top; py < db; py++) put(px, py, py < top + 2 ? dk(K.upper, 0.5) : dk(K.upper, 0.64));
    }
    for (var j = 0; j < dh; j++) for (var i = 0; i < dw; i++) put(dx + i, db - dh + j, i % 4 === 3 ? K.doorLn : K.door);
    rect(dx + dw - 3, db - Math.round(dh * 0.5), 1, 2, [210, 200, 180]);
    var slw = Math.max(4, Math.round(dw * 0.4)), slx = dx - slw - 2;
    rect(slx - 1, db - dh - 1, slw + 2, dh + 1, K.stair);
    for (var j2 = 0; j2 < dh - 1; j2++) for (var i2 = 0; i2 < slw; i2++) put(slx + i2, db - dh + j2, j2 % 6 === 5 ? K.stair : (night ? K.glassNight : mix(K.glassDayLo, [40, 44, 52], 0.55)));
    // landing slab
    var s0 = x0 + 1, rise = g.gy - db, sh = 3, n = Math.floor(rise / sh);
    rect(s0 - 2, db, L - s0 + 2, 2, K.stairHi); rect(s0 - 2, db + 2, L - s0 + 2, 1, K.stair);
    // steel stair with open risers; it reaches further left as it comes down toward the walk
    for (var k = 1; k <= n; k++) {
      var ty = db + 2 + k * sh, tl = s0 - 2 - k;
      rect(tl, ty - sh + 1, L - tl, sh - 2, dk(K.upper, 0.72));
      rect(tl, ty - 1, L - tl, 1, K.stairHi);
      rect(tl, ty, L - tl, 1, K.stair);
    }
    var bl = s0 - 2 - n, by = db + 2 + n * sh;
    line(s0 - 3, db + 2, bl - 1, by, K.stair); line(s0 - 4, db + 2, bl - 2, by, K.stair);
    // railing: three posts, a top rail and two mid rails, all following the stringer
    var rh = Math.max(10, Math.round(g.gw * 0.1));
    [0, 0.5, 1].forEach(function (f) { var x = Math.round(s0 - 4 + (bl - s0 + 2) * f), y = Math.round(db + 2 + (by - db - 2) * f); rect(x, y - rh, 1, rh, K.stair); });
    [rh, Math.round(rh * 0.66), Math.round(rh * 0.33)].forEach(function (o, q) {
      line(s0 - 4, db + 2 - o, bl - 2, by - o, K.stair);
      if (!q) line(s0 - 4, db + 1 - o, bl - 2, by - 1 - o, K.stair);
    });
    G.stairFootX = Math.round((bl + L) / 2);
  }

  function window2(x, y, w, h, lit, opts) {
    opts = opts || {};
    zone = 1;
    rect(x - 2, y - 2, w + 4, h + 4, K.trim);
    rect(x - 2, y + h + 1, w + 4, 1, K.trimSh);
    var win = { x: x, y: y, w: w, h: h, lit: lit, blinds: opts.blinds, split: opts.split, room: opts.room, vis: 1 };
    wins.push(win);
    glass(win);
    return win;
  }
  // what you can make out of a lit room: a fan, a shelf, a lamp
  function roomPx(win, i, j) {
    var w = win.w, h = win.h, rm = win.room, sil = mix(K.warmLo, [70, 36, 22], 0.62), sil2 = mix(K.warmLo, [70, 36, 22], 0.38);
    if (rm === "fan") {
      var fx = Math.round(w * 0.5), by = Math.max(2, Math.round(h * 0.2));
      if (i === fx && j < by) return sil;
      if (j === by && Math.abs(i - fx) <= Math.round(w * 0.3)) return sil;
      if (j === by + 1 && Math.abs(i - fx) <= 1) return sil;
      var sb = h - Math.max(3, Math.round(h * 0.22));
      if (j >= sb && i > w * 0.18 && i < w * 0.82) return sil2;
      if (j >= sb - 2 && (Math.abs(i - w * 0.18) < 1.5 || Math.abs(i - w * 0.82) < 1.5)) return sil2;
    } else if (rm === "shelf") {
      var s0 = Math.round(w * 0.56), s1 = w - 2, st = Math.round(h * 0.15);
      if (i >= s0 && i <= s1 && j >= st) {
        if (i === s0 || i === s1 || (j - st) % 5 === 0) return sil;
        if ((i * 7 + ((j - st) / 5 | 0) * 3) % 4 === 0) return sil2;
      }
      var f0 = Math.round(w * 0.12), f1 = Math.round(w * 0.4), g0 = Math.round(h * 0.22), g1 = Math.round(h * 0.45);
      if (((i === f0 || i === f1) && j >= g0 && j <= g1) || ((j === g0 || j === g1) && i >= f0 && i <= f1)) return sil2;
    } else if (rm === "lamp") {
      var lx = Math.round(w * 0.25), t0 = Math.round(h * 0.28);
      if (i === lx && j > t0 + 3) return sil;
      if (j >= t0 && j <= t0 + 3 && Math.abs(i - lx) <= (j === t0 ? 1 : 2)) return sil2;
      var px = Math.round(w * 0.74);
      if (j >= h - 3 && Math.abs(i - px) <= 1) return sil;
      var dy = j - (h - 6);
      if (j >= h - 9 && j < h - 3 && (i - px) * (i - px) + dy * dy * 0.8 < 7 && bay(i, j) > 0.25) return sil2;
    }
    return null;
  }
  function glass(win) {
    var x = win.x, y = win.y, w = win.w, h = win.h, bl = Math.round(h * 0.52);
    zone = 4;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var c;
      if (night && win.lit) {
        c = mix(K.warmHi, K.warmLo, j / h);
        var rc = roomPx(win, i, j); if (rc) c = rc;
        if (win.blinds && j < bl) c = (j % 3 === 2) ? K.blind : mix(K.warmHi, K.blind, 0.25);
        if (win.blinds && j === bl) c = dk(K.blind, 0.6);
      } else if (night) {
        c = K.glassNight;
        if (win.blinds && j < bl && j % 3 === 2) c = mix(K.glassNight, [60, 66, 96], 0.6);
      } else {
        c = mix(K.glassDay, K.glassDayLo, j / h);
        if (win.blinds && j < bl && j % 3 === 2) c = mix(c, [235, 235, 230], 0.35);
        var dg = i + j * 0.7;
        if (Math.abs(dg - w * 0.5) < 1.1 || Math.abs(dg - w * 0.75) < 0.6) c = mix(c, [235, 245, 252], 0.55);
      }
      if (OCC && OCC[(y + j) * W + x + i]) continue; // a tree is in front of this bit of glass
      put(x + i, y + j, c);
    }
    zone = 1;
    if (win.split) rect(x + Math.round(w * win.split), y, 1, h, K.trim);
  }

  function drawFacade() {
    var g = G, cx = g.cxB, L = g.bodyL, Rr = g.bodyR;
    zone = 1;
    // gable and upper floor: dark vertical boards
    function rl(x) { return g.peak + Math.abs(x - cx) * g.slope + 1; }
    poly([[L, rl(L)], [cx, g.peak + 1], [Rr, rl(Rr)], [Rr, g.floor], [L, g.floor]], function (x, y) {
      var m = (x - L) % 5, c = m === 0 ? K.sidingLn : (m === 1 ? K.sidingHi : K.siding);
      put(x, y, c);
    });
    // gable vent
    var vw = Math.max(6, Math.round(g.gw * 0.09)), vy = g.peak + Math.round((g.eave - g.peak) * 0.4);
    rect(cx - vw / 2 - 1, vy - 1, vw + 2, 9, K.sidingLn);
    for (var j = 0; j < 4; j++) rect(cx - vw / 2, vy + j * 2, vw, 1, K.sidingHi);
    // dark brick band under the windows, light stucco below it
    for (var y = g.floor; y < g.brickBot; y++) for (var x = L; x < Rr; x++) {
      var row = (y - g.floor) / 3 | 0, c = K.brick;
      if ((y - g.floor) % 3 === 2 || (x + (row % 2) * 4) % 8 === 0) c = K.mortar;
      put(x, y, c);
    }
    rect(L, g.floor, Rr - L, 1, K.roofEdge);
    for (var y2 = g.brickBot; y2 < g.gy; y2++) for (var x2 = L; x2 < Rr; x2++) put(x2, y2, R() < 0.1 ? K.stuccoLo : K.stucco);
    rect(L, g.brickBot, Rr - L, 1, dk(K.stucco, 0.82));
    // low-pitch roof: one dark fascia, running long on the left over the porch
    for (var x3 = Math.round(Math.min(cx - g.half, g.twL - 3)); x3 <= Math.round(cx + g.half); x3++) {
      var ry = Math.round(g.peak + Math.abs(x3 + 0.5 - cx) * g.slope);
      rect(x3, ry - 3, 1, 4, K.roofEdge);
      if (x3 >= L && x3 < Rr) put(x3, ry + 1, dk(K.siding, 0.72));
    }
    // upstairs windows: a wide one on the left, the cat's window over the garage
    var wh = Math.round(g.gw * 0.21), wy = g.floor - wh - 4;
    var lw = Math.round(g.gw * 0.46), lx = Math.round(g.gx - g.gw * 0.62);
    window2(lx, wy, lw, wh, night, { split: 0.5, room: "fan" });
    var cw = Math.round(g.gw * 0.32), cxw = Math.round(g.gx + g.gw * 0.6 - cw / 2);
    G.catWin = window2(cxw, wy, cw, wh, night, { split: 0.5, blinds: true, room: "lamp" });
    // a lower window behind the shrubs on the left
    var bw = Math.round(g.gw * 0.3);
    window2(Math.round(g.gx - g.gw * 0.55), g.brickBot + 6, bw, Math.max(5, Math.round((g.gy - g.brickBot) * 0.42)), false, { split: 0.5, room: "shelf" });
    // wall sconce by the garage
    zone = 1;
    var sc = g.sconce;
    rect(sc.x - 1, sc.y - 4, 4, 9, [30, 31, 35]); rect(sc.x - 2, sc.y - 5, 6, 1, [24, 25, 28]);
    zone = 4; rect(sc.x, sc.y + 5, 2, 1, [210, 200, 170]);
  }

  function drawGarage() {
    var g = G, L = g.L, Rr = g.R, T = g.T, Bt = g.Bt, s = g.s;
    zone = 1;
    rect(g.gx - 3, g.gTop - 3, g.gw + 6, 3, K.frame);
    rect(g.gx - 3, g.gTop, 3, g.gh, K.frame); rect(g.gx + g.gw, g.gTop, 3, g.gh, K.frame);
    zone = 2;
    for (var y = g.gTop; y < g.gy; y++) for (var x = g.gx; x < g.gx + g.gw; x++) {
      var c, depth;
      if (x >= L && x < Rr && y >= T && y < Bt) { c = K.backIn; depth = 1; }
      else {
        var hx2 = Math.abs(x + 0.5 - g.vx) / (g.gw / 2);
        var ht = y + 0.5 < g.vy ? (g.vy - y - 0.5) / (g.vy - g.gTop) : (y + 0.5 - g.vy) / (g.gy - g.vy);
        var k = Math.max(hx2, ht);
        depth = clamp((1 / k - 1) / (1 / s - 1), 0, 1);
        if (hx2 >= ht) c = K.wallIn;
        else if (y + 0.5 < g.vy) {
          c = K.ceil;
          var tu = (x + 0.5 - g.vx) / k / (g.gw / 2);
          if (Math.abs(Math.abs(tu) - 0.92) < 0.04 / k) c = K.track;
          if (Math.abs(tu) < 0.02 / k) c = K.track; // opener rail
        } else {
          c = K.floorIn;
        }
      }
      put(x, y, dk(c, 1 - depth * 0.25));
    }
    // opener box at the back of the rail
    rect(g.vx - 4, T - 3, 8, 3, K.opener); rect(g.vx - 3, T - 1, 6, 1, [200, 80, 60]);
    // raised door tucked under the ceiling
    for (var py = 0; py < g.pH; py++) rect(g.gx + 1 + py, g.gTop + py, g.gw - 2 - py * 2, 1, py % 2 ? K.panelLn : K.panel);
    var bw = Rr - L, bh = Bt - T;
    // pegboard + tools (right of back wall)
    var px0 = L + Math.round(bw * 0.5), px1 = Rr - 2, py0 = T + 3, py1 = T + Math.round(bh * 0.52);
    for (var yy = py0; yy < py1; yy++) for (var xx = px0; xx < px1; xx++) put(xx, yy, ((xx - px0) % 3 === 1 && (yy - py0) % 3 === 1) ? K.pegHole : K.peg);
    var tw = px1 - px0;
    // hammer, wrenches, saw, tape
    rect(px0 + 3, py0 + 2, 1, 8, K.woodDk); rect(px0 + 2, py0 + 2, 3, 2, K.metal);
    rect(px0 + 7, py0 + 2, 1, 7, K.steel); rect(px0 + 9, py0 + 3, 1, 6, K.steel); rect(px0 + 11, py0 + 4, 1, 5, K.steel);
    if (tw > 22) { poly([[px0 + 14, py0 + 2], [px0 + 22, py0 + 2], [px0 + 22, py0 + 4], [px0 + 14, py0 + 7]], function (x, y) { put(x, y, K.steel); }); rect(px0 + 20, py0 + 2, 3, 3, K.wood); }
    if (tw > 28) { rect(px0 + 25, py0 + 3, 3, 3, [212, 182, 60]); put(px0 + 26, py0 + 4, [60, 60, 60]); }
    // workbench
    var bTop = T + Math.round(bh * 0.58);
    G.bench = { x0: px0 - 2, x1: px1 + 1, y: bTop };
    rect(px0 - 2, bTop, px1 - px0 + 3, 2, K.wood); rect(px0 - 2, bTop + 2, px1 - px0 + 3, 2, K.woodDk);
    rect(px0 - 1, bTop + 4, 1, Bt - bTop - 4, K.woodDk); rect(px1, bTop + 4, 1, Bt - bTop - 4, K.woodDk);
    rect(px0, Bt - 3, px1 - px0, 1, K.woodDk);
    rect(px1 - 6, bTop - 3, 4, 3, K.metal); rect(px1 - 8, bTop - 2, 2, 1, K.metal); // vise
    rect(px0 + 2, bTop - 4, 6, 4, [150, 60, 46]); rect(px0 + 3, bTop - 3, 2, 2, [60, 40, 34]); // radio
    rect(px0 + 10, bTop - 3, 3, 3, [120, 150, 160]); // jar
    // paint cans under the bench
    rect(px0 + 2, Bt - 6, 4, 4, [170, 170, 176]); rect(px0 + 2, Bt - 6, 4, 1, [200, 200, 205]);
    rect(px0 + 7, Bt - 5, 3, 3, [170, 170, 176]);
    // metal shelving on the left of the back wall, with bins and boxes
    var sx0 = L + 2, sx1 = L + Math.round(bw * 0.38);
    rect(sx0, T + 1, 1, bh - 1, K.shelf); rect(sx1, T + 1, 1, bh - 1, K.shelf);
    [0.3, 0.62, 0.95].forEach(function (f, i) {
      var sy = T + Math.round(bh * f);
      rect(sx0, sy, sx1 - sx0 + 1, 1, K.shelf);
      var x = sx0 + 1;
      while (x < sx1 - 2) {
        var bwid = 3 + ((R() * 4) | 0), bht = 3 + ((R() * 3) | 0), col = K.bins[(R() * K.bins.length) | 0];
        if (x + bwid > sx1) bwid = sx1 - x;
        rect(x, sy - bht, bwid, bht, R() < 0.4 ? K.card : col);
        if (bwid > 3) rect(x, sy - bht, bwid, 1, mix(R() < 0.4 ? K.card : col, [255, 255, 255], 0.2));
        x += bwid + 1;
      }
    });
    // a taped cardboard box beside the crate, a small crate on top of it
    MK = 1; // these two sit in front of the cat's path along the back
    var bxx = g.cx + g.fw + g.sd + 3, bw2 = 20, bh2 = 13, bsd = 5, bsu = 3, bby = g.gy - 3;
    for (var i2 = 0; i2 < bsd; i2++) { var o2 = Math.round((i2 + 1) * bsu / bsd); rect(bxx + bw2 + i2, bby - bh2 + 1 - o2, 1, bh2, K.cardDk); }
    for (var r3 = 1; r3 <= bsu; r3++) rect(bxx + Math.round(r3 * bsd / bsu) - 1, bby - bh2 + 1 - r3, bw2, 1, mix(K.card, [255, 240, 210], 0.15));
    rect(bxx, bby - bh2 + 1, bw2, bh2, K.card);
    rect(bxx + 9, bby - bh2 - 2, 3, bh2 + 3, K.tape);
    rect(bxx, bby, bw2, 1, K.cardDk); rect(bxx + 2, bby - 4, 6, 2, mix(K.card, [255, 255, 255], 0.35));
    var scx = bxx + 3, sbt = bby - bh2 - 1, sw2 = 12, sh2 = 7;
    rect(scx, sbt - sh2, sw2, sh2, K.wd); rect(scx, sbt - 4, sw2, 1, K.wdGap); rect(scx, sbt - sh2, 1, sh2, K.wdLo); rect(scx + sw2 - 1, sbt - sh2, 1, sh2, K.wdLo);
    rect(scx + 1, sbt - sh2 - 1, sw2 + 2, 1, K.wdHi); rect(scx + sw2, sbt - sh2, 2, sh2, K.wdLo);
    MK = 0; G.boxX = bxx;
    // boxes stacked on the floor at the back-left
    rect(L + 3, Bt - 9, 12, 9, K.card); rect(L + 3, Bt - 9, 12, 1, K.tape); rect(L + 8, Bt - 9, 2, 9, K.tape);
    rect(L + 5, Bt - 15, 9, 6, K.cardDk); rect(L + 5, Bt - 15, 9, 1, K.card);
    // skis leaning in the front-left corner
    line(g.gx + 4, g.gy - 2, g.gx + 9, g.gTop + Math.round(g.gh * 0.25), K.skiA);
    line(g.gx + 6, g.gy - 2, g.gx + 11, g.gTop + Math.round(g.gh * 0.27), K.skiB);
    line(g.gx + 5, g.gy - 2, g.gx + 10, g.gTop + Math.round(g.gh * 0.26), dk(K.skiA, 0.8));
    // hose coiled on the right wall, and a broom
    var hx3 = g.gx + g.gw - 9, hy3 = g.gTop + Math.round(g.gh * 0.45);
    ring(hx3, hy3, 4, K.hose); ring(hx3, hy3, 3, dk(K.hose, 0.8)); put(hx3, hy3 - 5, K.metal);
    line(g.gx + g.gw - 4, g.gy - 2, g.gx + g.gw - 7, g.gTop + Math.round(g.gh * 0.55), K.wood);
    rect(g.gx + g.gw - 6, g.gy - 5, 5, 3, [190, 160, 90]);
    // bare bulb + pull string
    rect(g.bulbX, g.gTop + g.pH, 1, g.bulbY - g.gTop - g.pH - 1, K.cord);
    rect(g.bulbX - 1, g.bulbY - 1, 3, 1, [96, 92, 86]);
    zone = 4; rect(g.bulbX - 1, g.bulbY, 3, 3, K.bulbOff); put(g.bulbX, g.bulbY + 3, K.bulbOff);
    zone = 2;
  }

  function drawGround() {
    var g = G, dl0 = g.gx - 2, dr0 = g.gx + g.gw + 2, bottom = H - g.swH, spread = Math.round((bottom - g.gy) * 0.22);
    function dl(y) { return dl0 - spread * (y - g.gy) / (bottom - g.gy); }
    function dr(y) { return dr0 + spread * (y - g.gy) / (bottom - g.gy); }
    // the walk runs from the foot of the stairs down and to the left, to steps in the front wall
    var wc0 = G.stairFootX, wc1 = wc0 - g.gw * 0.18;
    function wl(y) { var t = (y - g.gy) / (bottom - g.gy); return wc0 + (wc1 - wc0) * t - (7 + 2 * t); }
    function wr(y) { var t = (y - g.gy) / (bottom - g.gy); return wc0 + (wc1 - wc0) * t + (7 + 2 * t); }
    var lowWall = 4, highWall = 9;
    zone = 5;
    // lawns: low on the left of the walk, raised between the walk and the driveway
    for (var y = g.gy - 7; y < bottom; y++) for (var x = 0; x < W; x++) {
      if (x >= dl(y) - 4 && x <= dr(y)) continue;
      var raised = x > wr(y) && x < dl(y) - 4;
      if (y < g.gy) { if (!raised || x >= g.gx - 3 || x < g.bodyL) continue; if (y < g.gy - 6) continue; }
      if (y >= bottom - (raised ? highWall : (x < wl(y) ? lowWall : 0))) continue;
      if (x >= wl(y) && x <= wr(y)) continue;
      var c = Math.floor((x + (y - g.gy) * 0.7) / 9) % 2 ? K.grass : K.grassLo;
      var r = R();
      if (r < 0.12) c = K.grassHi; else if (r < 0.2) c = K.grassDk;
      if (raised && y > bottom - highWall - 4 && bay(x, y) > 0.5) c = dk(c, 0.88); // the bank rolling over
      put(x, y, c);
      if (r < 0.06 && y > g.gy - 6) put(x, y - 1, K.grassHi);
    }
    // the walk
    for (var y1 = g.gy; y1 < bottom; y1++) {
      var a1 = Math.round(wl(y1)), b1 = Math.round(wr(y1)), inWall = y1 >= bottom - highWall;
      for (var x1 = a1; x1 <= b1; x1++) {
        var c1 = K.walk;
        if (inWall) c1 = (bottom - y1) % 3 === 0 ? dk(K.walk, 0.8) : ((bottom - y1) % 3 === 1 ? mix(K.walk, [255, 255, 255], 0.15) : K.walk);
        else if ((y1 - g.gy) % 9 === 8) c1 = K.walkLn;
        put(x1, y1, c1);
      }
      if (!inWall) { put(b1 + 1, y1, K.wallCap); put(b1 + 2, y1, K.wallSh); }
    }
    // front retaining walls along the sidewalk
    zone = 1;
    for (var x5 = 0; x5 < W; x5++) {
      var hgt = 0;
      if (x5 < wl(bottom - 1)) hgt = lowWall;
      else if (x5 > wr(bottom - 1) + 2 && x5 < dl(bottom - 1) - 4) hgt = highWall;
      if (!hgt) continue;
      for (var k = 0; k < hgt; k++) put(x5, bottom - hgt + k, k === 0 ? K.wallCap : (k === hgt - 1 ? K.wallSh : (R() < 0.08 ? K.wallSh : K.wall)));
    }
    zone = 5;
    // driveway concrete with tyre tracks and joints
    for (var y2 = g.gy; y2 < bottom; y2++) {
      var l = dl(y2), r2 = dr(y2), w = r2 - l, mid = (l + r2) / 2;
      for (var x2 = Math.round(l); x2 < Math.round(r2); x2++) {
        var c2 = K.drive, u = (x2 + 0.5 - l) / w;
        if (Math.abs(u - 0.27) < 0.07 || Math.abs(u - 0.73) < 0.07) c2 = K.driveTrk;
        if (R() < 0.05) c2 = dk(c2, 0.96);
        if (Math.abs(x2 + 0.5 - mid) < 0.6) c2 = K.driveLn;
        if (y2 === Math.round(g.gy + (bottom - g.gy) * 0.45)) c2 = K.driveLn;
        put(x2, y2, c2);
      }
    }
    // retaining wall along the left edge of the driveway, holding up the raised lawn
    zone = 1;
    for (var y3 = g.gy - 7; y3 < bottom; y3++) {
      var l3 = Math.round(dl(Math.max(y3, g.gy)));
      put(l3 - 4, y3, K.wallCap); put(l3 - 3, y3, K.wallCap);
      put(l3 - 2, y3, K.wall); put(l3 - 1, y3, K.wallSh);
    }
    // sidewalk
    zone = 5;
    for (var y4 = bottom; y4 < H; y4++) for (var x4 = 0; x4 < W; x4++) put(x4, y4, (x4 + 7) % 18 === 0 ? K.walkLn : (y4 === bottom ? dk(K.walk, 0.9) : K.walk));
    // shrubs and roses along the raised bed under the window
    zone = 1;
    for (var sx = Math.max(g.bodyL, Math.round(wr(g.gy))) + 4; sx < g.gx - 18; sx += 11) {
      var flowered = ((sx / 11) | 0) % 2 === 0;
      blob(sx + 5, g.gy - 8, 7, 6, function (x, y, d) {
        var c = (d < 0.45 && y < g.gy - 9 && bay(x, y) > 0.4) ? K.shrubHi : K.shrub;
        if (flowered && d < 0.8 && bay(x, y) > 0.9) c = K.flower;
        put(x, y, c);
      });
    }
  }

  function tree(cx, baseY, r, trunkH, tw) {
    zone = 1; tw = tw || 4;
    rect(cx - tw / 2, baseY - trunkH, tw, trunkH, K.trunk); rect(cx - tw / 2 + 1, baseY - trunkH, 1, trunkH, dk(K.trunk, 0.8));
    line(cx, baseY - trunkH + 4, cx - r * 0.5, baseY - trunkH - r * 0.3, K.trunk);
    var top = baseY - trunkH;
    [[0, -0.6, 1], [-0.7, -0.2, 0.7], [0.7, -0.25, 0.72], [-0.3, -1.2, 0.75], [0.45, -1.05, 0.7], [-0.9, -0.8, 0.5]].forEach(function (b) {
      var bx = cx + b[0] * r, by = top + b[1] * r, br = r * b[2];
      blob(bx, by, br, br * 0.85, function (x, y, d) {
        var c = K.leaf, rel = (y - by) / br + (x - bx) / br * 0.4;
        if (rel < -0.35 && bay(x, y) > 0.3) c = K.leafHi;
        if (rel > 0.4 && bay(x, y) > 0.45) c = K.leafLo;
        if (d > 0.85 && bay(x, y) > 0.7) return;
        put(x, y, c);
      });
    });
  }
  function pine(cx, baseY, h, w) {
    zone = 1;
    var top = baseY - h;
    for (var y = top; y < baseY; y++) {
      var t = (y - top) / h, tier = ((y - top) % 7) / 7, hw = Math.max(1, w / 2 * (0.25 + 0.75 * t) * (0.65 + 0.35 * tier));
      for (var x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        var c = K.pine, e = (x - cx) / hw;
        if (e < -0.4 && bay(x, y) > 0.4) c = K.pineHi;
        if (e > 0.45 || tier > 0.85) c = K.pineLo;
        if (Math.abs(e) > 0.85 && bay(x, y) > 0.6) continue;
        put(x, y, c);
      }
    }
  }
  // evergreens standing behind the house
  function drawBackTrees() {
    var g = G;
    pine(Math.round(g.twR + g.gw * 0.12), g.eave + 4, Math.round(g.gw * 0.62), Math.round(g.gw * 0.28));
    pine(Math.round(g.bodyR + g.gw * 0.18), g.eave + 10, Math.round(g.gw * 0.7), Math.round(g.gw * 0.32));
    if (!g.tall) pine(Math.round(g.twL - g.gw * 0.25), g.eave + 14, Math.round(g.gw * 0.5), Math.round(g.gw * 0.24));
  }
  function clump(bx, by, br) {
    blob(bx, by, br, br * 0.8, function (x, y, d) {
      var c = K.leaf, rel = (y - by) / br + (x - bx) / br * 0.4;
      if (rel < -0.35 && bay(x, y) > 0.3) c = K.leafHi;
      if (rel > 0.35 && bay(x, y) > 0.45) c = K.leafLo;
      if (d > 0.78 && bay(x, y) > 0.62) return;
      put(x, y, c);
    });
  }
  // an old cottonwood: a leaning trunk with leafy clumps all the way up
  function bigTree(cx, baseY, h, r) {
    zone = 1;
    var tw = Math.max(4, Math.round(r * 0.15));
    function tx(f) { return cx + Math.sin(f * 2.4) * r * 0.12; }
    for (var y = Math.round(baseY - h * 0.88); y < baseY; y++) {
      var f = (baseY - y) / h, w = Math.max(2, Math.round(tw * (1 - f * 0.55))), xo = Math.round(tx(f));
      rect(xo - w / 2, y, w, 1, K.trunk); put(xo - w / 2 + 1, y, dk(K.trunk, 0.8));
    }
    var C = [[-0.1, 0.4, 0.46], [0.85, 0.48, 0.56], [-0.62, 0.56, 0.58], [0.95, 0.66, 0.52], [0.2, 0.68, 0.66], [-0.45, 0.78, 0.58], [0.7, 0.84, 0.6], [-0.05, 0.94, 0.56]];
    C.forEach(function (c) {
      if (Math.abs(c[0]) < 0.3) return;
      var f0 = c[1] * 0.8, x0 = tx(f0), y0 = baseY - h * f0, x1 = cx + c[0] * r * 0.8, y1 = baseY - h * c[1];
      line(x0, y0, x1, y1, K.trunk); line(x0, y0 + 1, x1, y1 + 1, dk(K.trunk, 0.85));
    });
    C.forEach(function (c) { clump(cx + c[0] * r, baseY - h * c[1], r * c[2]); });
  }
  function drawTrees() {
    var g = G, bottom = H - g.swH;
    if (g.tall) {
      tree(W + 6, g.gTop - 4, Math.round(W * 0.2), Math.round(g.gh * 0.7));
      bigTree(Math.round(W * 0.04), bottom - 3, Math.round((bottom - g.eave) * 0.95), Math.round(W * 0.17));
      return;
    }
    // a thick of trees on the right, past the driveway
    tree(Math.round(Math.min(W + 8, g.gx + g.gw + g.gw * 0.95)), g.gy + 4, Math.round(g.gw * 0.42), Math.round(g.gh * 1.25), 5);
    tree(Math.round(g.gx + g.gw + g.gw * 0.5), g.gy + 8, Math.round(g.gw * 0.28), Math.round(g.gh * 0.95));
    // the big old tree in the front yard on the left, leafy all the way up past the tower
    bigTree(Math.round(g.twL - g.gw * 0.14), bottom - 3, Math.round((bottom - g.twTop) * 0.98), Math.round(g.gw * 0.3));
  }

  // ---------- lighting ----------
  function shade(out, glowOn) {
    var img = out.x.createImageData(W, H), d = img.data, g = G;
    var AMB = night
      ? { 1: [0.5, 0.53, 0.72], 2: [0.15, 0.15, 0.18], 5: [0.42, 0.45, 0.64] }
      : { 1: [1, 1, 1], 2: [0.42, 0.42, 0.45], 5: [1, 1, 1] };
    var Ls = [];
    if (S.bulb) Ls.push({ x: g.bulbX, y: g.bulbY + 2, r: g.gw * 1.1, i: night ? 1.25 : 0.75, c: [1, 0.8, 0.55], k: "bulb" });
    if (S.porch) Ls.push({ x: g.sconce.x + 1, y: g.sconce.y + 7, r: night ? 34 : 18, i: night ? 0.95 : 0.25, c: [1, 0.82, 0.58], k: "out" });
    if (glowOn) Ls.push({ x: g.cx + g.fw / 2 + 3, y: g.cy - g.fh - 2, r: g.gw * 0.62, i: 1.15, c: [0.35, 1, 0.5], k: "glow" });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, z = Z[i], o = i * 4;
      if (z === 0) { d[o + 3] = 0; continue; }
      var r = A[i * 3], g2 = A[i * 3 + 1], b = A[i * 3 + 2];
      if (z === 3 || z === 4) { d[o] = r; d[o + 1] = g2; d[o + 2] = b; d[o + 3] = 255; continue; }
      var am = AMB[z], lr = am[0], lg = am[1], lb = am[2], bt = bay(x, y);
      for (var k = 0; k < Ls.length; k++) {
        var Lt = Ls[k], w = 0;
        if (Lt.k === "out") w = z !== 2 ? 1 : 0;
        else w = z === 2 ? 1 : (SPILL[i] ? (Lt.k === "glow" ? 0.6 : (night ? 0.85 : 0)) : 0);
        if (!w) continue;
        var dx = x + 0.5 - Lt.x, dy = (y + 0.5 - Lt.y) * (z === 5 ? 0.6 : 1);
        var f = 1 - Math.sqrt(dx * dx + dy * dy) / Lt.r;
        if (f <= 0) continue;
        var q = Math.pow(f, 1.3) * Lt.i * w;
        q = z === 2 ? Math.min(1.3, q) : Math.min(1.3, Math.floor(q * 6 + bt) / 6); // smooth light inside the garage
        lr += Lt.c[0] * q; lg += Lt.c[1] * q; lb += Lt.c[2] * q;
      }
      d[o] = Math.min(255, r * lr); d[o + 1] = Math.min(255, g2 * lg); d[o + 2] = Math.min(255, b * lb); d[o + 3] = 255;
    }
    out.x.putImageData(img, 0, 0);
    // emissive bulbs drawn on top so they read lit/unlit
    out.x.fillStyle = css(S.bulb ? K.bulbOn : dk(K.bulbOff, night ? 0.35 : 0.8));
    out.x.fillRect(g.bulbX - 1, g.bulbY, 3, 3); out.x.fillRect(g.bulbX, g.bulbY + 3, 1, 1);
    out.x.fillStyle = css(S.porch ? K.bulbOn : dk(K.bulbOff, night ? 0.3 : 0.75));
    out.x.fillRect(g.sconce.x, g.sconce.y + 5, 2, 1);
  }
  function cutout(src, dst) {
    dst.c.width = W; dst.c.height = H;
    var img = src.x.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < W * H; i++) if (!MASK[i]) d[i * 4 + 3] = 0;
    dst.x.putImageData(img, 0, 0);
  }
  function shadeAll() {
    shade(BASE, false); cutout(BASE, OVB);
    if (!S.bulb) { shade(GLOW, true); cutout(GLOW, OVG); }
  }

  // ---------- dynamic ----------
  var stars = [], clouds = [], motes = [];
  function initDynamic() {
    stars = []; clouds = []; motes = [];
    var r = rng(5 + W);
    if (night) {
      var n = Math.floor(W * G.mTop / 120);
      for (var i = 0; i < n; i++) stars.push({ x: r() * W | 0, y: r() * G.peak * 0.9 | 0, p: r() * 6.28 });
    } else {
      for (var c = 0; c < 3; c++) clouds.push(makeCloud(r, r() * W, 6 + r() * Math.max(10, G.mTop * 0.8), 0.4 + r() * 0.4));
    }
    for (var m = 0; m < 8; m++) motes.push({ p: Math.random() * 6.28, x: Math.random(), s: 0.5 + Math.random() });
  }
  function makeCloud(r, x, y, v) {
    var w = 16 + r() * 22 | 0, parts = [];
    for (var k = 0; k < 4; k++) parts.push([r() * (w - 10) | 0, -(r() * 4 | 0), 6 + r() * 6 | 0]);
    return { x: x, y: y | 0, w: w, v: v, parts: parts };
  }
  function drawClouds(dt) {
    clouds.forEach(function (c) {
      if (!RM) c.x += c.v * dt;
      if (c.x > W + 10) c.x = -c.w - 10;
      var x = Math.round(c.x);
      ctx.fillStyle = "rgba(238,244,250,0.92)";
      ctx.fillRect(x, c.y, c.w, 3);
      c.parts.forEach(function (p) { ctx.fillRect(x + p[0], c.y + p[1] - 2, p[2], 3 - p[1]); ctx.fillRect(x + p[0] + 1, c.y + p[1] - 3, p[2] - 2, 1); });
      ctx.fillStyle = "rgba(200,216,232,0.9)"; ctx.fillRect(x + 1, c.y + 3, c.w - 2, 1);
    });
  }
  function drawStars(t) {
    stars.forEach(function (s) {
      var a = RM ? 0.6 : 0.3 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.5 + s.p));
      ctx.fillStyle = css(K.star, a); ctx.fillRect(s.x, s.y, 1, 1);
    });
  }

  // ---------- the cat (a tuxedo) ----------
  // sprites face left; the last row is the feet. cat.y is the ground line the feet stand on.
  var WALK = [
    ["k.k.........", "kkk......k..", "ekw.....k...", "wkkkkkkkk...", ".wkkkkkkk...", ".w.k..k.k...", ".w.k..w.w..."],
    ["k.k.........", "kkk.......k.", "ekw......k..", "wkkkkkkkk...", ".wkkkkkkk...", "..wk..kw....", "..w....w...."]
  ];
  var SIT = [
    [".k.k.......", ".kkk.......", "kekk.......", ".kkw.......", "..kwk......", "..kwkk.....", "..kwkkk....", "..kwkkkk...", "..wwkkkk.kk", "..wwkkkkkk."],
    [".k.k.......", ".kkk.......", "kkkk.......", ".kkw.......", "..kwk......", "..kwkk.....", "..kwkkk....", "..kwkkkk...", "..wwkkkk.kk", "..wwkkkkkk."]
  ];
  var PUFF = [
    ["..........k.k", ".....kkk...kk", "k.k.kkkkk..k.", "kkk.kkkkkk.k.", "ekkkkkkkkkkk.", ".kkkkkkkkkk..", ".wk.k...k.k..", ".w..k...k.k..", ".w..w...w.w.."],
    [".........k.k.", ".....kkk..kkk", "k.k.kkkkkk.k.", "kkkkkkkkkk.k.", "ekkkkkkkkkkk.", ".kkkkkkkkkk..", ".wk.k...k.k..", ".w..k...k.k..", ".w..w...w.w.."]
  ];
  var cat = { mode: "idle", wait: RM ? 1e9 : 5, t: 0, next: 0, path: [], i: 0, x: 0, y: 0, dir: -1, dist: 0, puff: 0 };
  var PLAN = ["garage", "window", "drive", "roof", "window", "drive"];
  var CKEY = "garage.cat.v1";
  function saveCat(n) { try { localStorage.setItem(CKEY, String(n % PLAN.length)); } catch (e) {} }
  try { var cv0 = parseInt(localStorage.getItem(CKEY), 10); if (cv0 >= 0 && cv0 < PLAN.length) cat.next = cv0; } catch (e) {}
  function roofFoot(x) { return G.peak + Math.abs(x + 6 - G.cxB) * G.slope - 3; }
  function catStep() { return cat.path[cat.i]; }
  function startCat(m) {
    var g = G;
    if (!m) { m = PLAN[cat.next % PLAN.length]; saveCat(cat.next); cat.next++; } // a reload mid-scene replays this one
    cat.mode = m; cat.t = 0; cat.i = 0; cat.dist = 0; cat.lit = false; cat.puff = 0; cat.roof = false; cat.path = [];
    if (m === "garage") {
      // hidden behind the boxes at the back, a few steps until the ears show, up onto the bench, then into the crate
      var b = g.bench;
      cat.x = g.boxX + 4; cat.y = g.Bt + 2; cat.dir = 1;
      cat.path = [
        { k: "sit", d: 1.2 },
        { k: "walk", x: g.boxX + 9, v: 4 },
        { k: "sit", d: 1.4 },
        { k: "jump", x: b.x1 - 22, y: b.y, h: 10, d: 0.5 },
        { k: "walk", x: b.x0, v: 6 },
        { k: "sit", d: 2.2 },
        { k: "jump", x: g.cx + 7, y: g.cy - g.fh + 5, h: 9, d: 0.55 },
        { k: "hide", d: 1.2 },
        { k: "peek", d: 4.5 },
        { k: "hide", d: 0.4 }
      ];
    } else if (m === "drive") {
      cat.x = W + 2; cat.y = Math.round(g.gy + (H - g.swH - g.gy) * 0.45); cat.dir = -1;
      cat.path = [{ k: "walk", x: g.gx + g.gw * 0.45, v: 9 }, { k: "sit", d: 5 }, { k: "walk", x: -16, v: 9 }];
    } else if (m === "roof") {
      // a leap from the tree onto the eave, up to the ridge for a look around, down the far side and off
      var xr = Math.round(g.cxB + g.half - 18), xl = Math.round(g.cxB - g.half + 4);
      cat.x = xr + 16; cat.y = Math.round(roofFoot(xr) + 14); cat.dir = -1;
      cat.path = [
        { k: "jump", x: xr, y: roofFoot(xr), h: 9, d: 0.55, roof: true },
        { k: "walk", x: Math.round(g.cxB - 6), v: 5 },
        { k: "sit", d: 6 },
        { k: "walk", x: xl, v: 5 },
        { k: "jump", x: xl - 16, y: roofFoot(xl) + 18, h: 5, d: 0.5, off: true },
        { k: "hide", d: 0.2 }
      ];
    } else {
      // window: walk in along the inside sill from the right, sit and look out, then drop out of sight
      var w = g.catWin;
      cat.wx0 = w.x + w.w; cat.wx1 = w.x + Math.round(w.w * 0.5) - 5;
      cat.tWalk = (cat.wx0 - cat.wx1) / 6; cat.sitFor = cat.tWalk + 10;
    }
  }
  function nextStep() {
    var st = catStep();
    if (st && st.roof) cat.roof = true;
    if (st && st.off) cat.roof = false;
    cat.i++;
    if (cat.i >= cat.path.length) endCat();
  }
  function setWin(w, on) { w.lit = on; var pz = zone; glass(w); zone = pz; shadeAll(); }
  function updateCat(dt) {
    if (cat.mode === "idle") { cat.wait -= dt; if (cat.wait <= 0) startCat(); return; }
    cat.t += dt;
    if (cat.mode === "window") {
      // at night, the room light comes on before the cat leaves so you see its outline; off again after
      var w = G.catWin;
      if (night && !w.lit && !cat.lit && cat.t > cat.sitFor - 4.5) { cat.lit = true; setWin(w, true); }
      if (cat.t > cat.sitFor) { if (cat.lit) setWin(w, false); endCat(); }
      return;
    }
    // a passing bike puts the cat's fur up
    if (bike && cat.mode === "drive" && Math.abs(bike.x - cat.x) < W * 0.7) cat.puff = Math.max(cat.puff, 1.4);
    if (cat.puff > 0) { cat.puff -= dt; return; }
    var st = catStep();
    if (!st) { endCat(); return; }
    st.e = (st.e || 0) + dt;
    if (st.k === "walk") {
      var dx = st.x - cat.x, ty = st.y != null ? st.y : cat.y, dy = ty - cat.y, d = Math.sqrt(dx * dx + dy * dy), v = st.v * dt;
      if (Math.abs(dx) > 0.01) cat.dir = dx < 0 ? -1 : 1;
      cat.dist += Math.min(v, d);
      if (d <= v) { cat.x = st.x; cat.y = ty; nextStep(); } else { cat.x += dx / d * v; cat.y += dy / d * v; }
      if (cat.roof) cat.y = roofFoot(cat.x);
    } else if (st.k === "jump") {
      if (st.sx == null) { st.sx = cat.x; st.sy = cat.y; }
      var t = Math.min(1, st.e / st.d);
      cat.dir = st.x < st.sx ? -1 : 1;
      cat.x = st.sx + (st.x - st.sx) * t; cat.y = st.sy + (st.y - st.sy) * t - st.h * 4 * t * (1 - t);
      if (t >= 1) nextStep();
    } else if (st.e >= st.d) nextStep();
  }
  function endCat() { if (cat.mode !== "idle") saveCat(cat.next); cat.mode = "idle"; cat.path = []; cat.i = 0; cat.puff = 0; cat.wait = 12 + Math.random() * 14; }
  function sprite(rows, x, y, flip, dim, shear) {
    for (var r = 0; r < rows.length; r++) for (var i = 0; i < rows[r].length; i++) {
      var ch = rows[r][i]; if (ch === ".") continue;
      var c = ch === "e" ? (night ? K.eye : dk(K.eye, 0.6)) : ch === "w" ? dk(K.catW, dim) : K.cat;
      var cx = flip ? rows[r].length - 1 - i : i, sy = shear ? Math.round((cx - rows[r].length / 2) * shear) : 0;
      ctx.fillStyle = css(c);
      ctx.fillRect(x + cx, y + r + sy, 1, 1);
    }
  }
  function catDim() { return cat.mode === "garage" ? (night ? (S.bulb ? 0.8 : 0.3) : (S.bulb ? 0.95 : 0.6)) : (night ? 0.45 : 1); }
  function drawCat(t) {
    if (cat.mode === "idle") return;
    var blink = (t % 3.7) < 0.15, dim = catDim();
    if (cat.mode === "window") {
      var w = G.catWin, wd = night && w.lit ? 0.7 : dim, sill = w.y + w.h;
      ctx.save(); ctx.beginPath(); ctx.rect(w.x, w.y, w.w, w.h); ctx.clip();
      if (cat.t < cat.tWalk) {
        var wx = cat.wx0 - cat.t * 6, wr = WALK[Math.floor(cat.t * 6 / 2.2) % 2];
        sprite(wr, Math.round(wx), sill - wr.length, false, wd);
      } else {
        var sp = SIT[blink ? 1 : 0], fall = Math.max(0, (cat.t - cat.sitFor + 1) / 1);
        sprite(sp, cat.wx1, sill - sp.length + Math.round(fall * (sp.length + 1)), false, wd);
      }
      ctx.restore(); return;
    }
    var st = catStep();
    if (!st || st.k === "hide" || st.k === "peek") return;
    var x = Math.round(cat.x), fy = Math.round(cat.y), rows, shear = 0;
    if (cat.puff > 0) rows = PUFF[Math.floor(t * 6) % 2];
    else if (st.k === "sit") rows = SIT[blink ? 1 : 0];
    else if (st.k === "jump") rows = WALK[1];
    else {
      rows = WALK[Math.floor(cat.dist / 2.2) % 2];
      if (cat.roof) shear = (cat.x + 6 < G.cxB ? -1 : 1) * G.slope; // body follows the pitch
    }
    if (!night && cat.mode === "drive") { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x + 1, fy, 10, 1); }
    sprite(rows, x, fy - rows.length, cat.dir > 0, dim, shear);
  }
  // ears and eyes over the crate's back rim
  function drawPeek(t) {
    var st = catStep();
    if (cat.mode !== "garage" || !st || st.k !== "peek") return;
    var g = G, rim = g.cy - g.fh + 1 - g.su, up = Math.min(1, st.e / 0.4, (st.d - st.e) / 0.4);
    var rows = (t % 2.9) < 0.15 ? ["k..k", "kkkk", "kkkk"] : ["k..k", "kkkk", "keek"];
    var y0 = rim - Math.round(up * 3), x0 = g.cx + g.sd + 9;
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, 0, 10, rim); ctx.clip();
    sprite(rows, x0, y0, false, catDim());
    ctx.restore();
  }

  // ---------- the crate ----------
  var hover = false, pressed = -1;
  function crateLift(t) {
    if (RM) return 0;
    var ph = t % 16;
    return ph > 15.3 && ph < 15.75 ? 1 : 0;
  }
  function drawCrate(t, glow) {
    var g = G, fw = g.fw, fh = g.fh, sd = g.sd, su = g.su;
    var lift = pressed >= 0 ? 0 : (hover ? 1 : crateLift(t));
    var x = g.cx, y = g.cy - lift, top = y - fh + 1;
    var k = night ? (S.bulb ? 1 : 0.32) : (S.bulb ? 0.97 : 0.55);
    var GL = [150, 255, 160];
    function c(col) { return css(dk(col, k)); }
    function px(xx, yy, col) { ctx.fillStyle = c(col); ctx.fillRect(xx, yy, 1, 1); }
    ctx.fillStyle = "rgba(15,12,10,0.4)"; ctx.fillRect(x - 1, g.cy + 1, fw + sd, 1);
    // open top, dark inside (or lit green from within)
    for (var r = 1; r <= su; r++) { ctx.fillStyle = glow ? css(mix(GL, [20, 40, 30], 0.35 + r * 0.08)) : c(K.wdGap); ctx.fillRect(x + Math.round(r * sd / su), top - r, fw - 1, 1); }
    // stuff poking out: rolled plans, a book, a wrench, a plant
    for (var i = 0; i < 9; i++) { px(x + 4 + Math.round(i * 0.3), top - 2 - i, [150, 186, 216]); px(x + 5 + Math.round(i * 0.3), top - 2 - i, [118, 152, 186]); }
    ctx.fillStyle = c([146, 58, 52]); ctx.fillRect(x + 10, top - 5, 3, 5); ctx.fillStyle = c([220, 205, 170]); ctx.fillRect(x + 10, top - 5, 3, 1);
    for (var j = 0; j < 6; j++) px(x + 16, top - 2 - j, K.steel);
    px(x + 15, top - 8, K.steel); px(x + 17, top - 8, K.steel);
    [[21, -4], [22, -6], [23, -5], [20, -5], [22, -7], [24, -6]].forEach(function (p) { px(x + p[0], top + p[1], [88, 136, 70]); });
    // rims
    ctx.fillStyle = c(K.wdHi); ctx.fillRect(x + sd, top - su, fw, 1);
    for (var r2 = 0; r2 <= su; r2++) px(x + fw - 1 + Math.round(r2 * sd / su), top - r2, K.wdHi);
    // side face: slats with gaps
    for (var i2 = 0; i2 < sd; i2++) {
      var o = Math.round((i2 + 1) * su / sd);
      ctx.fillStyle = c(K.wdLo); ctx.fillRect(x + fw + i2, top - o, 1, fh);
      [6].forEach(function (gy) { ctx.fillStyle = glow ? css(GL, 0.9) : c(K.wdGap); ctx.fillRect(x + fw + i2, top - o + gy, 1, 1); });
    }
    // front: three slats, gaps between, corner posts
    ctx.fillStyle = c(K.wd); ctx.fillRect(x, top, fw, fh);
    [6].forEach(function (gy) { ctx.fillStyle = glow ? css(GL, 0.95) : c(K.wdGap); ctx.fillRect(x + 2, top + gy, fw - 4, 1); });
    ctx.fillStyle = c(K.wdHi); ctx.fillRect(x, top, fw, 1);
    ctx.fillStyle = c(K.wdLo); ctx.fillRect(x, top, 2, fh); ctx.fillRect(x + fw - 2, top, 2, fh); ctx.fillRect(x, top + fh - 1, fw, 1);
    // wood grain
    ctx.fillStyle = c(dk(K.wd, 0.9)); ctx.fillRect(x + 3, top + 3, 2, 1); ctx.fillRect(x + 21, top + 9, 3, 1);
    // stencilled name
    var lines = [["turn", 0], ["around", 7]];
    ctx.fillStyle = c(K.stencil);
    lines.forEach(function (L) {
      var str = L[0], wdt = str.length * 4 - 1, sx = x + Math.round((fw - wdt) / 2), sy = top + L[1];
      for (var kk = 0; kk < str.length; kk++) {
        var gl = GLYPH[str[kk]];
        for (var rr = 0; rr < 5; rr++) for (var cc = 0; cc < 3; cc++) if (gl[rr][cc] === "#") ctx.fillRect(sx + kk * 4 + cc, sy + rr, 1, 1);
      }
    });
    if (hover) { ctx.fillStyle = "rgba(255,240,200,0.25)"; ctx.fillRect(x, top, fw, 1); }
    // in the dark: a faint green haze from inside
    if (glow) {
      var br = 0.85 + 0.1 * Math.sin(t * 0.7);
      for (var b = 0; b < 8; b++) { ctx.fillStyle = "rgba(150,255,170," + (br * (1 - b / 8) * 0.16) + ")"; ctx.fillRect(x + sd + 2, top - su - b, fw - 4, 1); }
      motes.forEach(function (m) {
        var ph = ((t * 0.08 * m.s + m.p) % 1 + 1) % 1;
        var mx = x + sd + 3 + m.x * (fw - 6) + Math.sin(t * 0.6 + m.p * 6) * 1.5, my = top - su - ph * 18;
        ctx.fillStyle = "rgba(170,255,185," + (0.5 * (1 - ph)) + ")"; ctx.fillRect(mx | 0, my | 0, 1, 1);
      });
    }
  }

  // ---------- bulb string ----------
  function drawString() {
    var g = G, ext = 0;
    if (S.pull >= 0) ext = Math.round(Math.sin(Math.min(1, S.pull / 0.35) * Math.PI) * 4);
    var len = 7 + ext, x = g.bulbX + 2, y0 = g.bulbY;
    var k = night && !S.bulb ? 0.4 : 1;
    ctx.fillStyle = css(dk(K.cord, 1)); ctx.fillRect(x, y0, 1, len);
    ctx.fillStyle = css(dk(K.bead, k)); ctx.fillRect(x, y0 + len, 1, 2);
  }

  // ---------- loop ----------
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (HOOK.paused) { requestAnimationFrame(frame); return; }
    var t = now / 1000;
    updateCat(dt);
    // pull-string animation and the switch
    if (S.pull >= 0) {
      S.pull += dt;
      if (S.pull > 0.17 && !S.pulled) { S.pulled = true; toggleBulb(); }
      if (S.pull > 0.35) { S.pull = -1; S.pulled = false; }
    }
    if (S.flick > 0) { S.flick -= dt; }
    ctx.drawImage(SKY.c, 0, 0);
    if (night) drawStars(t); else drawClouds(dt);
    ctx.drawImage(BASE.c, 0, 0);
    var glow = !S.bulb && S.flick <= 0;
    if (glow) { ctx.globalAlpha = 0.85 + 0.06 * Math.sin(t * 0.7); ctx.drawImage(GLOW.c, 0, 0); ctx.globalAlpha = 1; }
    if (S.flick > 0 && Math.floor(S.flick * 25) % 2) { ctx.fillStyle = "rgba(10,10,20,0.35)"; ctx.fillRect(G.gx, G.gTop, G.gw, G.gh); }
    drawString();
    updateBike(dt);
    drawCat(t);
    if (cat.mode === "garage") { // put the front boxes back over the cat
      ctx.drawImage(OVB.c, 0, 0);
      if (glow) { ctx.globalAlpha = 0.85 + 0.06 * Math.sin(t * 0.7); ctx.drawImage(OVG.c, 0, 0); ctx.globalAlpha = 1; }
    }
    drawCrate(t, glow);
    drawPeek(t);
    drawBike();
    if (HOOK.draw) HOOK.draw(ctx, t, dt);
    if (pressed >= 0) {
      pressed += dt;
      if (pressed > 0.14 && !G.navigated) { G.navigated = true; location.href = link.getAttribute("href"); }
    }
    requestAnimationFrame(frame);
  }

  function toggleBulb() {
    S.bulb = !S.bulb;
    if (S.bulb && !RM) S.flick = 0.25;
    shadeAll(); saveLights();
  }

  // ---------- remember which lights were on ----------
  var LKEY = "garage.lights.v1";
  function loadLights() { try { return JSON.parse(localStorage.getItem(LKEY) || "null"); } catch (e) { return null; } }
  function saveLights() {
    try { localStorage.setItem(LKEY, JSON.stringify({ bulb: S.bulb, porch: S.porch, wins: wins.map(function (w) { return w.lit ? 1 : 0; }) })); } catch (e) {}
  }

  // ---------- a bike, once in a long while ----------
  // the street is just out of frame, so only the rider and the top of the bike show along the bottom edge
  var bike = null, bikeWait = 20 + Math.random() * 40;
  var SHIRTS = [[58, 110, 120], [196, 152, 58], [160, 70, 56], [52, 66, 104], [110, 120, 80]];
  var SKINS = [[230, 190, 160], [200, 146, 108], [150, 102, 72], [100, 68, 48]];
  var HELMS = [[232, 232, 226], [44, 44, 48], [196, 84, 62], [70, 120, 150]];
  var FRAMES = [[60, 100, 140], [178, 60, 50], [40, 40, 44], [222, 212, 190], [70, 110, 80]];
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function spawnBike() {
    var u = Math.max(2, Math.round(G.gw / 42)), dir = Math.random() < 0.5 ? 1 : -1;
    bike = { u: u, dir: dir, x: dir > 0 ? -16 * u : W + 16 * u, v: W / (4.5 + Math.random() * 1.5), ph: 0, shirt: pick(SHIRTS), skin: pick(SKINS), helm: pick(HELMS), frame: pick(FRAMES) };
  }
  function updateBike(dt) {
    if (!bike) { if (RM) return; bikeWait -= dt; if (bikeWait <= 0) spawnBike(); return; }
    bike.x += bike.dir * bike.v * dt; bike.ph += bike.v * dt / (bike.u * 8);
    if (bike.x < -20 * bike.u || bike.x > W + 20 * bike.u) { bike = null; bikeWait = 240 + Math.random() * 300; }
  }
  function drawBike() {
    if (!bike) return;
    var b = bike, u = b.u, hubY = H + 3 * u, k = night ? 0.45 : 1;
    function P(p) { return [b.x + p[0] * u * b.dir, hubY + p[1] * u]; }
    function seg(a, c, wd, col) {
      a = P(a); c = P(c);
      var dx = c[0] - a[0], dy = c[1] - a[1], n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))), sz = Math.max(1, Math.round(wd * u));
      ctx.fillStyle = css(dk(col, k));
      for (var i = 0; i <= n; i++) ctx.fillRect(Math.round(a[0] + dx * i / n - sz / 2), Math.round(a[1] + dy * i / n - sz / 2), sz, sz);
    }
    function disc(p, r, col, half) {
      var c = P(p); ctx.fillStyle = css(dk(col, k));
      for (var yy = -r * u; yy <= (half ? 0 : r * u); yy++) for (var xx = -r * u; xx <= r * u; xx++) if (xx * xx + yy * yy <= r * r * u * u) ctx.fillRect(Math.round(c[0] + xx), Math.round(c[1] + yy), 1, 1);
    }
    function wheel(cx) {
      for (var a = 0; a < 64; a++) { var t1 = a / 64 * 6.283, t2 = (a + 1) / 64 * 6.283; seg([cx + Math.cos(t1) * 9, Math.sin(t1) * 9], [cx + Math.cos(t2) * 9, Math.sin(t2) * 9], 1.1, [30, 30, 34]); }
      for (var sp = 0; sp < 6; sp++) { var th = b.ph + sp * 1.047; seg([cx, 0], [cx + Math.cos(th) * 8.3, Math.sin(th) * 8.3], 0.3, [150, 150, 158]); }
    }
    function leg(a, col) {
      var hip = [-4, -14], ft = [-1 + 3 * Math.sin(a), 1 - 3 * Math.cos(a)];
      var dx = ft[0] - hip[0], dy = ft[1] - hip[1], d = Math.min(18.6, Math.sqrt(dx * dx + dy * dy)), hgt = Math.sqrt(Math.max(0, 9.4 * 9.4 - d * d / 4));
      var nx = -dy / d, ny = dx / d; if (nx < 0) { nx = -nx; ny = -ny; }
      var knee = [hip[0] + dx / 2 + nx * hgt, hip[1] + dy / 2 + ny * hgt];
      seg(hip, knee, 2.6, col); seg(knee, ft, 2, col); seg(ft, [ft[0] + 1.6, ft[1]], 1.2, [36, 36, 40]);
    }
    var pants = [44, 46, 54], a = b.ph;
    leg(a + Math.PI, dk(pants, 0.8));
    wheel(-10); wheel(10);
    seg([-1, 1], [-10, 0], 0.9, b.frame); seg([-4, -11], [-10, 0], 0.9, b.frame);
    seg([-1, 1], [-4, -11], 1.1, b.frame); seg([-1, 1], [8, -7], 1.2, b.frame); seg([-4, -10], [7, -10], 1.1, b.frame);
    seg([7, -11], [8, -7], 1.2, b.frame); seg([8, -7], [10, 0], 1, b.frame);
    seg([7, -11], [7.5, -13], 0.8, [60, 60, 66]); seg([7, -13], [9.5, -13], 0.9, [36, 36, 40]);
    seg([-6, -12.4], [-2.6, -12.4], 1, [30, 30, 34]);
    leg(a, pants);
    seg([-4, -14], [3, -23], 3.4, b.shirt);
    seg([3, -22], [6, -18], 1.5, b.shirt); seg([6, -18], [8.6, -13.6], 1.3, b.skin);
    seg([3.5, -23.5], [4.6, -24.6], 1.2, b.skin);
    disc([5.4, -26.6], 2.3, b.skin);
    disc([5.1, -27.2], 2.6, b.helm, true); seg([6.4, -27.2], [8.4, -27], 0.6, dk(b.helm, 0.8));
    if (night) { var hl = P([9.6, -12]); ctx.fillStyle = "rgba(255,244,200,0.9)"; ctx.fillRect(Math.round(hl[0]), Math.round(hl[1]), u, u); }
  }

  // ---------- interaction ----------
  link.addEventListener("mouseenter", function () { hover = true; });
  link.addEventListener("mouseleave", function () { hover = false; });
  link.addEventListener("focus", function () { hover = true; });
  link.addEventListener("blur", function () { hover = false; });
  link.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button || RM) return;
    e.preventDefault();
    if (pressed < 0) pressed = 0;
  });
  window.addEventListener("pageshow", function () { pressed = -1; G.navigated = false; hover = false; });

  cv.addEventListener("click", function (e) {
    var rc = cv.getBoundingClientRect(), g = G;
    var x = (e.clientX - rc.left) / rc.width * W, y = (e.clientY - rc.top) / rc.height * H;
    if (HOOK.click && HOOK.click(x, y)) return;
    // the bulb's pull string
    if (Math.abs(x - g.bulbX - 1) < 7 && y > g.bulbY - 6 && y < g.bulbY + 14) { if (S.pull < 0) { S.pull = 0; S.pulled = false; } if (RM) toggleBulb(); return; }
    // the wall sconce
    if (Math.abs(x - g.sconce.x - 1) < 7 && Math.abs(y - g.sconce.y) < 9) { S.porch = !S.porch; shadeAll(); saveLights(); return; }
    // the cat stops and looks at you
    var cs = catStep();
    if ((cat.mode === "drive" || cat.mode === "roof") && cs && cs.k === "walk" && Math.abs(x - cat.x - 6) < 9 && Math.abs(y - cat.y + 4) < 9) { cat.path.splice(cat.i, 0, { k: "sit", d: 3 }); return; }
    // windows switch on and off at night
    if (!night) return;
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      if (w.vis > 0.6 && x >= w.x - 2 && x < w.x + w.w + 2 && y >= w.y - 2 && y < w.y + w.h + 2) {
        w.lit = !w.lit;
        var prevZone = zone; glass(w); zone = prevZone; shadeAll(); saveLights(); return;
      }
    }
  });

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layout, 100); });
  setInterval(function () { if (isNight() !== night) layout(); }, 60000);
  window.garageDebug = { bike: function () { if (!bike) spawnBike(); }, cat: function (m) { if (m) startCat(m); else { endCat(); cat.wait = 0; } } };
  layout();
  requestAnimationFrame(frame);
})();
