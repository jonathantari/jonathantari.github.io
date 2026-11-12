// The second secret (spoilers: docs/egg-2-spoilers.md). The skis in the corner of the garage are not
// decoration: tap them twice and you are at the top of the mountain at first light, with one long run
// home. Its own canvas, its own look (top-down, long blue shadows), its own controls (one thumb).
// Nothing to lose: trees only hug. Words and the course are in data/egg2.js.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, E = GG.egg2 = {};
  function D() { return GG.data.egg2; }
  var cv = null, ctx = null, W = 0, H = 0, st = null, C = null, raf = 0, last = 0, busy = false, SP = null, snd = null;
  var TAU = Math.PI * 2;

  // ---------- colours ----------
  var K = {
    snow: [234, 241, 251], snowSh: [212, 224, 244], snowHi: [251, 252, 255], warm: [249, 243, 243], drift: [224, 233, 249],
    shadow: "rgb(58,84,150)", track: "rgba(120,146,200,0.75)",
    pine: [44, 84, 62], pineHi: [62, 108, 76], pineLo: [30, 60, 50], trunk: [84, 62, 46],
    rock: [124, 128, 140], rockLo: [92, 96, 112], rockHi: [156, 160, 170],
    ice: [170, 208, 234], iceHi: [214, 236, 248], iceLo: [128, 170, 208],
    road: [206, 213, 226], roadTrk: [184, 193, 211], bank: [246, 249, 255], bankSh: [176, 190, 220],
    ink: [34, 38, 58], red: [200, 71, 63], white: [240, 238, 232], gold: [217, 164, 65], teal: [63, 143, 134], navy: [52, 64, 94], skin: [224, 170, 134],
    wood: [150, 108, 70], woodDk: [104, 72, 46], glow: [255, 214, 130]
  };
  function css(c, a) { return U.css(c, a); }
  function mk(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); var x = c.getContext("2d"); x.imageSmoothingEnabled = false; return { c: c, x: x, w: c.width, h: c.height }; }
  function px(x, c, X, Y) { x.fillStyle = css(c); x.fillRect(X | 0, Y | 0, 1, 1); }
  function rc(x, c, X, Y, w, h) { x.fillStyle = css(c); x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); }

  // ---------- a 3x5 font for signs, speech and the title ----------
  var FONT = {
    A: ".#.#.#####.##.#", B: "##.#.###.#.###.", C: ".###..#..#...##", D: "##.#.##.##.###.", E: "####..##.#..###", F: "####..##.#..#..",
    G: ".###..#.##.#.##", H: "#.##.#####.##.#", I: "###.#..#..#.###", J: "..#..#..##.#.#.", K: "#.##.###.#.##.#", L: "#..#..#..#..###",
    M: "#.########.##.#", N: "####.##.##.##.#", O: ".#.#.##.##.#.#.", P: "##.#.###.#..#..", Q: ".#.#.##.#.#...#", R: "##.#.###.#.##.#",
    S: ".###...#...###.", T: "###.#..#..#..#.", U: "#.##.##.##.####", V: "#.##.##.##.#.#.", W: "#.##.########.#", X: "#.##.#.#.#.##.#",
    Y: "#.##.#.#..#..#.", Z: "###..#.#.#..###", "0": "####.##.##.####", "1": ".#.##..#..#.###", "2": "##...#.#.#..###", "3": "##...#.#...###.",
    "4": "#.##.####..#..#", "5": "####..##...###.", "6": ".###..####.####", "7": "###..#.#..#..#.", "8": "####.#####.####", "9": "####.####..###.",
    "!": ".#..#..#.....#.", "?": "##...#.#.....#.", ".": ".............#.", ",": "..........#.#..", "'": ".#..#..........", "-": "......###......", ":": "....#.....#...."
  };
  function textW(s, k) { return (s.length * 4 - 1) * (k || 1); }
  function text(x, s, X, Y, c, k) {
    k = k || 1; x.fillStyle = css(c); X = Math.round(X); Y = Math.round(Y);
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s[i]]; if (!g) continue;
      for (var j = 0; j < 15; j++) if (g[j] === "#") x.fillRect(X + (i * 4 + j % 3) * k, Y + ((j / 3) | 0) * k, k, k);
    }
  }

  // ---------- sprites, all drawn here ----------
  function cm(rows, pal) {
    var s = mk(rows[0].length, rows.length);
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) { var ch = rows[y][x]; if (ch !== "." && pal[ch]) px(s.x, pal[ch], x, y); }
    return s;
  }
  function flip(s) { var o = mk(s.w, s.h); o.x.translate(s.w, 0); o.x.scale(-1, 1); o.x.drawImage(s.c, 0, 0); return o; }
  function pine(w, h, R) {
    var s = mk(w, h), tiers = h > 22 ? 4 : 3, th = (h - 3) / tiers, cxp = (w - 1) / 2;
    for (var y = 0; y < h - 2; y++) {
      var t = Math.min(tiers - 1, Math.floor(y / th)), f = (y - t * th) / th;
      var half = 0.5 + (w / 2 - 0.5) * ((t + 1) / tiers) * (0.42 + 0.58 * f);
      for (var x = Math.ceil(cxp - half); x <= Math.floor(cxp + half); x++) {
        var u = (x - cxp) / Math.max(1, half);
        var sn = y < 2 || (f < 0.5 && u < 0.45 - f * 1.4 + (R() - 0.5) * 0.3);
        var c = sn ? (u < -0.15 ? K.snowHi : K.snowSh) : (u > 0.3 ? K.pineLo : (u < -0.45 ? K.pineHi : K.pine));
        if (!sn && R() < 0.07) c = K.pineLo;
        px(s.x, c, x, y);
      }
    }
    rc(s.x, K.trunk, Math.floor(cxp), h - 2, 2, 2);
    return s;
  }
  function rock(w, h, R) {
    var s = mk(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h * 0.6) / (h * 0.6), d = dx * dx + dy * dy + (R() - 0.5) * 0.18;
      if (d > 1) continue;
      px(s.x, y < h * 0.34 + dx * 1.2 ? (dx < 0 ? K.snowHi : K.snowSh) : dx > 0.25 ? K.rockLo : dx < -0.5 ? K.rockHi : K.rock, x, y);
    }
    return s;
  }
  // the long low-sun shadow of anything w wide and h tall
  function shade(w, h) {
    var L = Math.round(h * 0.75) + 2, s = mk(L + 2, Math.round(L * 0.4) + w + 2);
    s.x.fillStyle = K.shadow;
    for (var i = 0; i < L; i++) { var wd = Math.max(1, Math.round(w * 0.7 * (1 - i / L))); s.x.fillRect(i, Math.round(i * 0.36) + Math.round((w - wd) / 2), 1, wd); }
    s.ay = Math.round(w / 2);
    return s;
  }
  function kicker(w) {
    var s = mk(w, 9);
    for (var y = 0; y < 9; y++) { var ins = Math.max(0, 3 - y); rc(s.x, y < 6 ? (y < 2 ? K.drift : K.snowHi) : (y === 6 ? K.bank : [150, 170, 214]), ins, y, w - ins * 2, 1); }
    rc(s.x, [110, 132, 190], 1, 8, w - 2, 1); rc(s.x, [236, 140, 60], 0, 2, 1, 5); rc(s.x, [236, 140, 60], w - 1, 2, 1, 5);
    return s;
  }
  function pole(c) {
    var s = mk(7, 15);
    rc(s.x, K.wood, 3, 3, 1, 12); rc(s.x, c, 4, 3, 3, 3); px(s.x, U.dk(c, 0.75), 6, 5);
    rc(s.x, K.gold, 2, 0, 3, 3); px(s.x, [255, 240, 190], 2, 0); px(s.x, K.ink, 3, 3);
    return s;
  }
  function house(R) {
    var w = 40 + ((R() * 3) | 0) * 4, s = mk(w, 40);
    var wall = U.pick(R, [[92, 96, 108], [150, 104, 84], [190, 186, 172], [104, 128, 138], [148, 152, 122]]);
    rc(s.x, K.snowSh, 0, 2, w, 24); rc(s.x, K.snowHi, 0, 2, w, 11); rc(s.x, [188, 204, 236], 0, 12, w, 1);
    rc(s.x, U.dk(wall, 0.6), 0, 25, w, 1);
    for (var i = 0; i < 5; i++) rc(s.x, U.dk(wall, 0.5), 3 + ((R() * (w - 8)) | 0), 15 + ((R() * 8) | 0), 3 + ((R() * 3) | 0), 1);
    rc(s.x, wall, 1, 26, w - 2, 13); rc(s.x, U.dk(wall, 0.8), 1, 38, w - 2, 1);
    var ch = 5 + ((R() * (w - 14)) | 0); rc(s.x, [120, 84, 72], ch, 0, 4, 6); rc(s.x, K.snowHi, ch, 0, 4, 1);
    var door = 6 + ((R() * (w - 16)) | 0); rc(s.x, [120, 78, 50], door, 31, 4, 7);
    s.wins = [];
    for (var x = 4; x < w - 8; x += 9) if (Math.abs(x - door) > 6) { rc(s.x, [60, 76, 104], x, 29, 5, 5); rc(s.x, [132, 160, 190], x, 29, 5, 1); if (R() < 0.75) s.wins.push([x, 29]); }
    s.chim = ch + 2;
    return s;
  }
  function car(R) {
    var s = mk(13, 22), c = U.pick(R, [[62, 96, 132], [150, 60, 52], [70, 110, 84], [70, 72, 80], [196, 176, 120]]);
    rc(s.x, U.dk(c, 0.7), 1, 3, 11, 18); rc(s.x, c, 1, 3, 11, 16); rc(s.x, K.snowHi, 2, 1, 9, 17); rc(s.x, K.snowSh, 2, 14, 9, 4);
    rc(s.x, [40, 50, 70], 2, 16, 9, 2); rc(s.x, K.ink, 0, 5, 1, 4); rc(s.x, K.ink, 12, 5, 1, 4); rc(s.x, K.ink, 0, 15, 1, 4); rc(s.x, K.ink, 12, 15, 1, 4);
    px(s.x, [240, 90, 70], 2, 20); px(s.x, [240, 90, 70], 10, 20);
    return s;
  }
  function board(lines) {
    var w = 0; lines.forEach(function (l) { w = Math.max(w, textW(l)); });
    var bw = w + 6, bh = lines.length * 6 + 3, s = mk(bw, bh + 7);
    rc(s.x, K.woodDk, bw / 2 - 1, bh, 2, 7); rc(s.x, [238, 228, 204], 0, 0, bw, bh); rc(s.x, K.woodDk, 0, bh - 1, bw, 1); rc(s.x, K.snowHi, 0, 0, bw, 1);
    lines.forEach(function (l, i) { text(s.x, l, (bw - textW(l)) / 2, 2 + i * 6, K.ink); });
    return s;
  }
  // a small person from the front: you, a hiker, a kid. x is the middle, y the feet.
  function body(x, X, Y, o) {
    var ln = o.lean || 0, legH = o.tuck ? 2 : 3, torH = o.kid ? 3 : 4, ty = Y - legH - torH, hx = X + Math.round(ln * 1.7), tx = X + Math.round(ln * 0.8);
    var coatD = U.dk(o.coat, 0.78);
    rc(x, o.pants, X - 2, Y - legH, 2, legH); rc(x, o.pants, X + 1, Y - legH, 2, legH);
    rc(x, o.coat, tx - 2, ty, 5, torH); rc(x, coatD, tx - 2, ty + torH - 1, 5, 1);
    rc(x, coatD, tx - 3, ty + 1, 1, 2);
    if (o.wave) rc(x, coatD, tx + 3, ty - 2, 1, 3); else rc(x, coatD, tx + 3, ty + 1, 1, 2);
    if (o.pack) { px(x, o.pack, tx - 1, ty); px(x, o.pack, tx + 1, ty); px(x, o.pack, tx - 1, ty + 1); px(x, o.pack, tx + 1, ty + 1); }
    rc(x, o.skin, hx - 1, ty - 3, 3, 3); px(x, K.ink, hx - 1, ty - 2); px(x, K.ink, hx + 1, ty - 2);
    rc(x, o.cap, hx - 2, ty - 5, 5, 2); rc(x, U.dk(o.cap, 0.75), hx - (o.beanie ? 2 : 2), ty - 3, 5, 1);
    if (o.beanie) px(x, K.white, hx, ty - 6);
    if (o.splat) { px(x, K.snowHi, tx - 1, ty + 1); px(x, K.snowHi, tx, ty + 1); px(x, K.snowHi, tx, ty + 2); px(x, K.snowHi, tx + 1, ty); }
  }
  function skis(x, X, Y, h, len) {
    var dx = Math.sin(h), dy = Math.cos(h), nx = Math.cos(h), ny = -Math.sin(h);
    len = len || 5;
    [-2, 2].forEach(function (s) {
      for (var i = -3; i <= len; i++) px(x, i >= len - 1 ? K.white : K.red, Math.round(X + nx * s + dx * i), Math.round(Y + ny * s + dy * i * 0.9));
    });
  }
  function sprites() {
    if (SP) return SP;
    var R = U.rng(77), S = {};
    S.tile = (function () {
      var s = mk(128, 128), im = s.x.createImageData(128, 128), d = im.data, f = TAU / 128;
      for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) {
        var n = Math.sin((x + y * 3) * f + 1) + 0.5 * Math.sin((x * 2 - y * 5) * f + 2) + 0.35 * Math.sin((x * 3 + y * 8) * f), v = n * 0.2 + 0.5 + (U.bay(x, y) - 0.5) * 0.16;
        var c = v > 0.72 ? K.drift : v < 0.24 ? K.warm : K.snow;
        if (U.h2(x, y) < 0.006) c = K.snowHi;
        var i = (y * 128 + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      s.x.putImageData(im, 0, 0); return s;
    })();
    S.pines = []; S.pineSh = [];
    [[9, 14], [11, 18], [13, 22], [15, 26], [17, 30]].forEach(function (z) { for (var k = 0; k < 3; k++) { S.pines.push(pine(z[0], z[1], R)); S.pineSh.push(shade(z[0], z[1])); } });
    S.rocks = [rock(9, 7, R), rock(12, 9, R), rock(8, 6, R)]; S.rockSh = [shade(9, 5), shade(12, 6), shade(8, 4)];
    S.boulder = rock(24, 16, R); S.boulderSh = shade(22, 12);
    S.kick = kicker(24); S.poleB = pole([70, 120, 200]); S.poleR = pole(K.red);
    S.houses = [house(R), house(R), house(R), house(R), house(R)]; S.houseSh = shade(30, 30);
    S.cars = [car(R), car(R), car(R), car(R)]; S.carSh = shade(12, 10);
    S.deer = [cm([".........d.d.", ".........bbb.", ".........bkb.", "..........bb.", ".bbbbbbbbbb..", "wbbbbbbbbbb..", ".bbbbbbbbb...", ".b.b...b.b...", ".b.b...b.b...", ".d.d...d.d..."], { b: [150, 104, 68], d: [96, 64, 44], w: K.white, k: K.ink }),
      cm(["..........d.d", "..........bbb", "..........bkb", "...........bb", "..bbbbbbbbbb.", "wbbbbbbbbbb..", ".bbbbbbbbb...", "b.b.....b..b.", "d..........d.", "............."], { b: [150, 104, 68], d: [96, 64, 44], w: K.white, k: K.ink })];
    S.deerL = S.deer.map(flip);
    S.cat = cm([".k.k.......", ".kkk.......", "kekk.......", ".kkw.......", "..kwk......", "..kwkk.....", "..kwkkk....", "..kwkkkk...", "..wwkkkk.kk", "..wwkkkkkk."], { k: [24, 22, 27], w: K.white, e: [232, 200, 74] });
    S.catR = flip(S.cat);
    S.lion = [cm(["...........t.t.", "..........ttttt", ".ttttttttttt-t.", "tttttttttttttt.", "t.ttttttttttt..", "t.............."], { t: [196, 160, 104], "-": K.ink }),
      cm(["...........t.t.", "..........ttttt", ".tttttttttttet.", "tttttttttttttt.", ".tttttttttttt..", "..t............"], { t: [196, 160, 104], e: [240, 214, 80] })];
    S.marmot = cm([".bb.", "bkbk", "bbbb", "bwwb", "bwwb"], { b: [136, 102, 70], k: K.ink, w: [196, 168, 128] });
    S.snowman = (function () {
      var s = mk(11, 17); function ball(cx, cy, r) { for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) px(s.x, x > r * 0.3 || y > r * 0.5 ? K.snowSh : K.snowHi, cx + x, cy + y); }
      ball(5, 12, 4); ball(5, 6, 3); rc(s.x, K.ink, 3, 1, 5, 2); rc(s.x, K.ink, 2, 3, 7, 1); px(s.x, K.ink, 4, 5); px(s.x, K.ink, 6, 5); px(s.x, [236, 140, 60], 5, 6); px(s.x, [236, 140, 60], 6, 6);
      rc(s.x, K.red, 3, 8, 5, 1); px(s.x, K.woodDk, 0, 9); px(s.x, K.woodDk, 1, 10); px(s.x, K.woodDk, 10, 9); px(s.x, K.woodDk, 9, 10); return s;
    })();
    S.snowman2 = (function () { var s = mk(11, 17); s.x.drawImage(S.snowman.c, 0, 0); s.x.clearRect(0, 0, 11, 8); rc(s.x, K.red, 3, 8, 5, 1); return s; })();
    S.fort = (function () { var s = mk(18, 8); for (var y = 0; y < 8; y++) { var i = Math.max(0, 2 - y); rc(s.x, y < 3 ? K.snowHi : K.snowSh, i, y, 18 - i * 2, 1); } rc(s.x, [168, 184, 222], 0, 7, 18, 1); return s; })();
    S.cairn = (function () { var s = mk(10, 16); rc(s.x, K.rock, 1, 12, 8, 4); rc(s.x, K.rockLo, 2, 9, 6, 3); rc(s.x, K.rock, 3, 6, 4, 3); rc(s.x, K.snowHi, 3, 6, 4, 1); rc(s.x, K.woodDk, 5, 0, 1, 6); rc(s.x, K.red, 6, 0, 3, 2); return s; })();
    S.fence = (function () { var s = mk(12, 8); rc(s.x, K.woodDk, 1, 1, 2, 7); rc(s.x, K.wood, 0, 2, 12, 1); rc(s.x, K.wood, 0, 5, 12, 1); rc(s.x, K.snowHi, 0, 1, 12, 1); return s; })();
    S.lamp = (function () { var s = mk(7, 20); rc(s.x, [70, 74, 88], 3, 4, 1, 16); rc(s.x, [70, 74, 88], 1, 3, 5, 1); rc(s.x, [250, 236, 190], 2, 4, 3, 2); rc(s.x, K.snowHi, 1, 2, 5, 1); return s; })();
    S.mail = (function () { var s = mk(5, 8); rc(s.x, K.woodDk, 2, 3, 1, 5); rc(s.x, [80, 96, 130], 0, 1, 5, 3); rc(s.x, K.snowHi, 0, 0, 5, 1); px(s.x, K.red, 4, 1); return s; })();
    S.post = (function () { var s = mk(4, 10); rc(s.x, K.woodDk, 1, 1, 2, 9); rc(s.x, K.snowHi, 0, 0, 4, 1); return s; })();
    S.plow = (function () {
      var s = mk(24, 34); rc(s.x, [226, 150, 52], 3, 6, 18, 24); rc(s.x, [190, 120, 40], 3, 26, 18, 4); rc(s.x, K.snowHi, 5, 8, 14, 9); rc(s.x, [50, 60, 84], 5, 20, 14, 4);
      rc(s.x, [120, 126, 140], 0, 30, 24, 3); rc(s.x, [200, 204, 214], 0, 30, 24, 1); rc(s.x, K.ink, 2, 9, 1, 5); rc(s.x, K.ink, 21, 9, 1, 5); rc(s.x, [255, 196, 60], 11, 5, 2, 2); return s;
    })();
    S.ball = (function () { var s = mk(5, 5); rc(s.x, K.red, 1, 0, 3, 5); rc(s.x, K.red, 0, 1, 5, 3); rc(s.x, K.white, 2, 0, 1, 5); px(s.x, [255, 220, 200], 1, 1); return s; })();
    S.sk = mk(40, 40); S.dark = null;
    S.sh1 = shade(8, 12);
    return (SP = S);
  }

  // ---------- the course ----------
  function secAt(y) { var a = C.secs; for (var i = 0; i < a.length; i++) if (y < a[i].y1) return a[i]; return a[a.length - 1]; }
  function par(y, k) {
    var s = secAt(y), B = 180, a = C.secs, i = s.i, v = s[k];
    if (y - s.y0 < B && i > 0) return U.lerp((a[i - 1][k] + v) / 2, v, Math.max(0, (y - s.y0) / B));
    if (s.y1 - y < B && i < a.length - 1) return U.lerp(v, (a[i + 1][k] + v) / 2, 1 - (s.y1 - y) / B);
    return v;
  }
  function cx(y) { return par(y, "wind") * (Math.sin(y / 230 + C.p1) * 0.7 + Math.sin(y / 97 + C.p2) * 0.3); }
  function hw(y) { return par(y, "hw"); }
  function build(seed) {
    var R = U.rng(seed), S = sprites(), o = [], y = 0;
    C = { p1: R() * TAU, p2: R() * TAU, objs: o, gates: 0 };
    C.secs = D().sections.map(function (s, i) { var q = Object.assign({}, s, { i: i, y0: y }); y += s.len; q.y1 = y; return q; });
    C.len = y;
    function add(q) { o.push(q); return q; }
    function tree(x, yy, big) { var k = Math.min(S.pines.length - 1, (R() * R() * (big ? 15 : 10) + (big ? 2 : 0)) | 0); return add({ t: "tree", x: x, y: yy, s: S.pines[k], sh: S.pineSh[k], r: 2.6 + k * 0.12 }); }
    function clear(x, yy, d) { for (var i = o.length - 1; i >= 0 && i > o.length - 60; i--) if (Math.abs(o[i].x - x) < d && Math.abs(o[i].y - yy) < d) return false; return true; }
    C.secs.forEach(function (s) {
      var n, i, yy, x;
      for (n = Math.round(s.trees * s.len / 100), i = 0; i < n; i++) {
        yy = s.y0 + R() * s.len; x = cx(yy) + (R() * 2 - 1) * hw(yy);
        if (s.ground === "ice" && Math.abs(x - cx(yy)) < 26) continue;
        if (yy > 300 && clear(x, yy, 12)) tree(x, yy);
      }
      for (n = Math.round(s.rocks * s.len / 100), i = 0; i < n; i++) {
        yy = s.y0 + R() * s.len; x = cx(yy) + (R() * 2 - 1) * hw(yy) * 0.9;
        var k = (R() * 3) | 0; if (yy > 300 && clear(x, yy, 14)) add({ t: "rock", x: x, y: yy, s: S.rocks[k], sh: S.rockSh[k], r: 3.6 });
      }
      for (i = 0; i < s.kickers; i++) {
        yy = s.y0 + s.len * (i + 0.6 + R() * 0.3) / (s.kickers + 0.4); x = cx(yy) + (R() * 2 - 1) * hw(yy) * (s.ground ? 0.25 : 0.5);
        add({ t: "kick", x: x, y: yy, s: S.kick, w: 24, flat: 1 });
      }
      (s.set || []).forEach(function (p) { setPiece(s, p, R, add, tree); });
    });
    // the walls: forest (or open rock, or houses' back gardens) either side of the way down
    for (var wy = -260; wy < C.len + 420; wy += 15) {
      var yc = Math.max(0, Math.min(C.len - 1, wy)), c = cx(yc), h = hw(yc), s = secAt(yc);
      for (var side = -1; side <= 1; side += 2) for (var d = 0; d < 330; d += 15) {
        var x = c + side * (h + 5 + d + R() * 11 + (d === 0 ? R() * R() * 26 : 0)), yy = wy + R() * 11;
        if (s.wall === "houses" && d < 100) continue;
        if (s.wall === "open" || wy < 0) { if (R() < 0.07) { var k = (R() * 3) | 0; add({ t: "rock", x: x, y: yy, s: S.rocks[k], sh: S.rockSh[k], r: 3.6 }); } continue; }
        if (d > 160 && R() < 0.2) continue;
        if (s.i === 1 && yc - s.y0 < 260 && R() > (yc - s.y0) / 260) continue; // the forest thickens in
        tree(x, yy, d > 15);
      }
    }
    o.sort(function (a, b) { return a.y - b.y; });
  }
  function setPiece(s, p, R, add, tree) {
    var S = sprites(), y = s.y0 + (p.at || 0) * s.len, x = cx(y) + (p.dx || 0), i, h = hw(y);
    if (p.t === "cairn") add({ t: "cairn", x: x, y: y, s: S.cairn, sh: S.rockSh[0], r: 3 });
    else if (p.t === "sign") { var b = board(p.text); add({ t: "sign", x: x, y: y, s: b, sh: S.sh1 }); }
    else if (p.t === "deer") { for (i = 0; i < 3; i++) add({ t: "deer", x: cx(y) - h - 26 - i * 8, y: y + i * 16, x0: cx(y) - h - 26 - i * 8, x1: cx(y) + h + 40 + i * 9, wait: i * 0.4, go: 0, ph: 0 }); }
    else if (p.t === "marmot") add({ t: "marmot", x: cx(y) - 22, y: y, s: S.rocks[1], sh: S.rockSh[1], r: 4.2, up: 0 });
    else if (p.t === "lion") add({ t: "lion", x: cx(y) + h - 4, y: y, s: S.boulder, sh: S.boulderSh, r: 9, awake: 0 });
    else if (p.t === "hiker") add({ t: "hiker", x: cx(y) - h + 4, y: y, sh: S.sh1, seen: 0 });
    else if (p.t === "gates") {
      for (i = 0; i < p.n; i++) { var gy = y + i * p.gap, gx = cx(gy) + (i % 2 ? 1 : -1) * 22; add({ t: "gate", x: gx, y: gy, gap: 38, n: i, ring: 0, done: false }); }
      C.gates = p.n; C.gateEnd = y + p.n * p.gap;
    }
    else if (p.t === "funnel") { for (i = 0; i < 16; i++) { var fy = y + i * 11, fw = U.lerp(s.hw + 10, 48, i / 15); add({ t: "fence", x: -fw, y: fy, s: S.fence, r: 3 }); add({ t: "fence", x: fw, y: fy, s: S.fence, r: 3 }); } add({ t: "car", x: -h - 30, y: y - 40, s: S.cars[0], sh: S.carSh }); add({ t: "car", x: h + 34, y: y - 70, s: S.cars[2], sh: S.carSh }); }
    else if (p.t === "street") {
      var end = C.len + 380, yy, side, n = 0;
      for (yy = s.y0 + 40; yy < end; yy += 76) for (side = -1; side <= 1; side += 2) {
        var hs = S.houses[(R() * S.houses.length) | 0];
        add({ t: "house", x: side * (s.hw + 42 + R() * 8), y: yy + R() * 16 + (side > 0 ? 30 : 0), s: hs, sh: S.houseSh, smoke: R() < 0.6 ? R() * 2 : -1 });
        if (R() < 0.6) tree(side * (s.hw + 82 + R() * 14), yy + 40 + R() * 20);
        add({ t: "mail", x: side * (s.hw + 9), y: yy + 22 + R() * 30, s: S.mail });
      }
      for (yy = s.y0 + 150; yy < end; yy += 240) { side = (n++ % 2) ? 1 : -1; add({ t: "lamp", x: side * (s.hw + 6), y: yy, s: S.lamp, sh: S.sh1 }); }
      for (yy = s.y0 + 200; yy < s.y1 - 520; yy += 170 + R() * 150) { side = R() < 0.5 ? -1 : 1; add({ t: "car", x: side * (s.hw - 9), y: yy, s: S.cars[(R() * 4) | 0], sh: S.carSh, bw: 8, bh: 20 }); }
    }
    else if (p.t === "snowman") add({ t: "snowman", x: x, y: y, s: S.snowman, sh: S.sh1, r: 4 });
    else if (p.t === "kid") { add({ t: "fort", x: x + 5, y: y + 4, s: S.fort }); y -= 5; add({ t: "kid", x: x, y: y, thrown: false }); }
    else if (p.t === "ball") add({ t: "ball", x: -h - 20, y: y, go: false, z: 0, vz: 0, flat: 0 });
    else if (p.t === "cat") { add({ t: "post", x: x, y: y, s: S.post }); add({ t: "cat", x: x, y: y - 9, seen: false }); }
    else if (p.t === "bank") { C.bankY = y; add({ t: "bank", x: 0, y: y, w: h * 2 + 10, flat: 1 }); add({ t: "plow", x: 6, y: y + 120, s: S.plow, sh: S.houseSh }); }
  }

  // ---------- state ----------
  function fresh() {
    var L = window.GGLanding.get();
    build((Date.now() & 0xfffff) + 3);
    var s = {
      t: 0, phase: "title", night: !!L.night, p: { x: cx(60), y: 60, py: 60, h: 0, v: 0, lean: 0 }, cam: { x: 0, y: 0 }, keys: {}, ptr: null, touch: false,
      air: null, spin: 0, crash: null, inv: 0, hugs: 0, clock: 0, tracks: [], parts: [], flakes: [], balls: [], bub: [], white: 1, i0: 0, bells: 0, sec: -1, splat: 0, said: {}, fly: 0, done: false,
      pup: GG.save && GG.save.data && GG.save.data.puppy ? { x: cx(40) - 10, y: 46, d: 0 } : null
    };
    for (var i = 0; i < 46; i++) s.flakes.push({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8, p: Math.random() * TAU });
    return s;
  }
  function cap(s, secs, low) { if (s) GG.ui.caption(s, secs || 4, false, low); }
  function sayOnce(k, s, secs) { if (st.said[k]) return; st.said[k] = 1; cap(s, secs); }
  function puff(x, y, n, sp, up) {
    for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = (0.3 + Math.random()) * sp; st.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - (up || 0), l: 0.35 + Math.random() * 0.45, c: Math.random() < 0.5 ? K.snowHi : K.snowSh }); }
  }
  function bubble(o, s, dy) { st.bub.push({ o: o, s: s, t: 2.6, dy: dy || 16 }); }

  // ---------- update ----------
  function steerIn() {
    var s = st, k = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0);
    if (k) return k;
    if (s.ptr) return U.clamp((s.ptr.x - (s.p.x - s.cam.x)) / 26, -1, 1);
    return 0;
  }
  function crash(o) {
    var s = st, p = s.p, c = cx(p.y), h = hw(p.y);
    s.hugs++; p.v = 0; s.inv = 2.1;
    var tx = p.x + (p.x < o.x ? -10 : 10);
    if (Math.abs(tx - c) > h - 10) tx = c + (p.x < c ? -1 : 1) * (h - 16);
    s.crash = { t: 0, d: 0.95, x0: p.x, tx: tx };
    puff(p.x, p.y - 3, 22, 46, 20);
    if (o.t === "tree") { puff(o.x, o.y - o.s.h * 0.6, 14, 20, -10); }
    GG.sfx.bump(); GG.sfx.burst(0.3, 0.9);
    if (o.t === "snowman") { o.s = sprites().snowman2; o.r = 0; cap(D().say.snowman, 3); }
    else if (o.t === "car") { cap(D().say.car, 3); GG.sfx.note(660, 0.12, "square", 0.5, null, 0.2); GG.sfx.note(660, 0.12, "square", 0.5, null, 0.45); }
    else if (o.t === "tree") { if (s.hugs <= 2 || Math.random() < 0.45) cap(U.pick(Math.random, D().crash), 3); }
    else if (s.hugs <= 2 || Math.random() < 0.45) cap(U.pick(Math.random, D().rock), 3);
  }
  function near(fn, y0, y1) {
    var o = C.objs; for (var i = st.i0; i < o.length; i++) { if (o[i].y > y1) break; if (o[i].y >= y0) fn(o[i]); }
  }
  function update(dt) {
    var s = st, p = s.p, S = D().say; s.t += dt;
    if (s.white > 0 && s.phase !== "fly") s.white = Math.max(0, s.white - dt * 1.1);
    var steer = 0;
    if (s.phase === "run") {
      steer = steerIn(); s.clock += dt; p.py = p.y;
      var sec = secAt(p.y);
      if (sec.i !== s.sec) { s.sec = sec.i; if (sec.i > 0) cap(sec.cap[s.night ? "night" : "day"], 4.5); }
      if (s.crash) {
        var cr = s.crash; cr.t += dt; var u = Math.min(1, cr.t / cr.d);
        p.x = U.lerp(cr.x0, cr.tx, u * u * (3 - 2 * u)); p.h = 0;
        if (u >= 1) { s.crash = null; puff(p.x, p.y, 8, 22, 8); }
      } else if (s.air) {
        var a = s.air; a.t += dt; s.spin += steer * dt * 9.5;
        p.x += Math.sin(p.h) * p.v * 1.2 * dt; p.y += Math.cos(p.h) * p.v * dt;
        if (a.t >= a.d) {
          s.air = null; puff(p.x, p.y, 12, 30, 6); GG.sfx.burst(0.14, 0.9); GG.sfx.note(150, 0.1, "triangle", 0.8, 80);
          if (Math.abs(s.spin) > 5.4) { st.bub.push({ o: { x: p.x, y: p.y }, s: U.pick(Math.random, S.spin), t: 1.4, dy: 24, free: 1 }); GG.sfx.chime(); }
          else sayOnce("air", U.pick(Math.random, S.air), 2.5);
          s.spin = 0;
        }
      } else {
        var ice = sec.ground === "ice" && Math.abs(p.x - cx(p.y)) < iceW(p.y, sec);
        var tuck = s.keys.down ? 1.28 : s.keys.up ? 0.5 : 1, th = steer * 1.1;
        var ph = p.h; p.h += (th - p.h) * Math.min(1, dt * (ice ? 2 : 6.5));
        var vt = 96 * par(p.y, "pitch") * (0.48 + 0.52 * Math.cos(p.h)) * tuck * (ice ? 1.18 : 1);
        p.v += (vt - p.v) * Math.min(1, dt * (vt > p.v ? 0.95 : 2.6));
        p.x += Math.sin(p.h) * p.v * 1.25 * dt; p.y += Math.cos(p.h) * p.v * dt;
        p.lean += (U.clamp((p.h - ph) / dt * 0.25 + p.h * 0.9, -1, 1) - p.lean) * Math.min(1, dt * 10);
        s.tuck = tuck > 1;
        // the edge of the way: a snowbank on the street, a gentle shove elsewhere
        var c = cx(p.y), h = hw(p.y), lim = sec.ground === "road" ? h - 2 : h + 46, off = p.x - c;
        if (Math.abs(off) > lim) { p.x = c + (off > 0 ? lim : -lim); p.v *= 1 - dt * 2; if (Math.random() < 0.5) puff(p.x, p.y, 1, 20, 8); }
        // carving spray
        var turn = Math.abs(p.h - ph) / dt;
        if (p.v > 40 && (turn > 1.2 || Math.abs(p.h) > 0.75) && Math.random() < 0.7) s.parts.push({ x: p.x - Math.sin(p.h) * 3, y: p.y - 2, vx: -Math.sin(p.h) * 26 + (Math.random() - 0.5) * 22, vy: -8 - Math.random() * 14, l: 0.3 + Math.random() * 0.3, c: K.snowHi });
        if (snd) sndSet(Math.min(1, turn / 4 + Math.abs(p.h) * 0.5), p.v, ice);
        if (s.inv > 0) s.inv -= dt;
        near(function (o) {
          var dx = p.x - o.x, dy = p.y - o.y;
          if (o.t === "kick" && p.py < o.y && p.y >= o.y && Math.abs(dx) < o.w / 2 && p.v > 30) { s.air = { t: 0, d: 0.5 + p.v / 190, h: 9 + p.v / 9 }; s.spin = 0; GG.sfx.boing(); puff(p.x, p.y, 6, 20, 10); }
          else if (o.t === "gate" && !o.done && p.py < o.y && p.y >= o.y) {
            o.done = true;
            if (Math.abs(dx) < o.gap / 2) { o.ring = 1; var sc = [523, 587, 659, 784, 880, 1047, 1175, 1319]; GG.sfx.note(sc[Math.min(7, s.bells)], 0.7, "sine", 0.9); GG.sfx.note(sc[Math.min(7, s.bells)] * 2.01, 0.5, "triangle", 0.3, null, 0.02); s.bells++; }
          }
          else if (o.t === "bank" && p.py < o.y && p.y >= o.y) launch();
          else if (s.inv <= 0 && !s.crash) {
            if (o.bw) { if (Math.abs(dx) < o.bw && dy > -o.bh && dy < 2) crash(o); }
            else if (o.r && dx * dx + dy * dy * 2.2 < (o.r + 1.8) * (o.r + 1.8)) crash(o);
          }
        }, p.y - 30, p.y + 12);
        if (C.gateEnd && p.py < C.gateEnd && p.y >= C.gateEnd && s.bells > 0) cap(s.bells >= C.gates ? S.bellsAll : U.fmt(S.bellsSome, { n: s.bells, of: C.gates }), 4);
        if (s.bells >= C.gates && !s.said.bells && C.gates) { s.said.bells = 1; GG.sfx.chime(); }
      }
      if (!s.air) { var tr = s.tracks, lt = tr[tr.length - 1]; if (!lt || Math.abs(lt.x - p.x) + Math.abs(lt.y - p.y) > 1.6) { tr.push({ x: p.x, y: p.y, h: p.h, c: !!s.crash }); if (tr.length > 420) tr.shift(); } }
      else if (s.tracks.length && !s.tracks[s.tracks.length - 1].gap) s.tracks.push({ x: p.x, y: p.y, gap: true });
    } else if (s.phase === "title") {
      if (s.go || s.t > 14) { s.phase = "run"; s.p.v = 26; GG.sfx.whoosh(); cap(D().sections[0].cap[s.night ? "night" : "day"], 4); setTimeout(function () { if (st === s) cap(D().tips[s.touch ? "touch" : "keys"], 6); }, 4600); if (s.pup) setTimeout(function () { if (st === s) cap(D().say.pup, 4, true); }, 15000); }
    } else if (s.phase === "fly") {
      s.fly += dt; p.y += p.v * dt * 0.5; s.white = Math.min(1, Math.max(0, (s.fly - 0.35) / 0.75));
      if (s.fly > 1.3 && !s.done) { s.done = true; finish(false); }
    }
    // the puppy keeps up
    if (s.pup) { var q = s.tracks[Math.max(0, s.tracks.length - 12)] || { x: p.x - 10, y: p.y - 14 }, pu = s.pup, ddx = q.x + 7 - pu.x, ddy = q.y - 2 - pu.y; pu.x += ddx * Math.min(1, dt * 6); pu.y += ddy * Math.min(1, dt * 6); pu.d += (Math.abs(ddx) + Math.abs(ddy)) * dt * 6; }
    // camera: you sit a third of the way down, with a little lead into the turn
    s.cam.y = p.y - Math.round(H * 0.34);
    s.cam.x += (p.x + Math.sin(p.h) * 16 - W / 2 - s.cam.x) * Math.min(1, dt * 4);
    var o = C.objs; while (s.i0 < o.length && o[s.i0].y < s.cam.y - 70) s.i0++;
    near(function (ob) { live(ob, dt); }, s.cam.y - 60, s.cam.y + H + 60);
    var i, f;
    for (i = s.parts.length - 1; i >= 0; i--) { f = s.parts[i]; f.l -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 60 * dt; if (f.l <= 0) s.parts.splice(i, 1); }
    for (i = s.balls.length - 1; i >= 0; i--) {
      f = s.balls[i]; f.t += dt; var u2 = f.t / f.d;
      if (u2 >= 1) {
        var hit = Math.hypot(f.tx - p.x, f.ty - p.y) < 9 && !s.air; puff(f.tx, f.ty - (hit ? 6 : 0), 9, 26, 8); GG.sfx.burst(0.08, 1);
        if (hit) { s.splat = 6; GG.sfx.note(300, 0.12, "triangle", 0.8, 150); } bubble(f.kid, hit ? S.kidHit : S.kidMiss); s.balls.splice(i, 1);
      }
    }
    for (i = s.bub.length - 1; i >= 0; i--) { s.bub[i].t -= dt; if (s.bub[i].free) s.bub[i].dy += dt * 14; if (s.bub[i].t <= 0) s.bub.splice(i, 1); }
    if (s.splat > 0) s.splat -= dt;
  }
  function iceW(y, sec) { return (19 + 4 * Math.sin(y / 37)) * Math.min(1, (y - sec.y0) / 90, (sec.y1 - y) / 90); }
  // the things that are alive
  function live(o, dt) {
    var s = st, p = s.p, S = D().say, dy = o.y - p.y;
    if (o.t === "deer") {
      if (!o.go && dy < 170 && s.phase === "run") { o.go = 1; if (o.wait === 0) cap(S.deer, 4, true); }
      if (o.go && o.x < o.x1) { o.wait -= dt; if (o.wait <= 0) { o.x += 78 * dt; o.ph += dt * 5.4; } }
    } else if (o.t === "marmot") {
      if (!o.up && dy < 70 && dy > -20) { o.up = 0.01; GG.sfx.note(2300, 0.14, "sine", 0.7, 2900); GG.sfx.note(2300, 0.14, "sine", 0.7, 2900, 0.2); cap(S.marmot, 3.5, true); }
      if (o.up) o.up = Math.min(1, o.up + dt * 6);
    } else if (o.t === "lion") {
      if (!o.awake && dy < 64 && dy > -30) { o.awake = 1; cap(s.pup ? S.lionPup : S.lion, 4); }
      if (o.awake && dy < -60) o.awake = 0;
      if (!o.awake && Math.random() < dt * 0.9) s.bub.push({ o: { x: o.x + 8, y: o.y - 20 }, s: "Z", t: 1.3, dy: 0, free: 1, bare: 1 });
    } else if (o.t === "hiker") {
      if (!o.seen && dy < 100) { o.seen = 1; bubble(o, S.hiker[s.night ? "night" : "day"]); GG.sfx.note(700, 0.08, "square", 0.4); GG.sfx.note(880, 0.1, "square", 0.4, null, 0.09); }
    } else if (o.t === "kid") {
      if (!o.thrown && dy < 118 && s.phase === "run") { o.thrown = true; var d = 0.85; s.balls.push({ x0: o.x, y0: o.y - 8, tx: p.x + Math.sin(p.h) * p.v * 1.25 * d, ty: p.y + Math.cos(p.h) * p.v * d, t: 0, d: d, kid: o }); GG.sfx.note(500, 0.2, "sine", 0.5, 900); }
    } else if (o.t === "ball") {
      if (!o.go && dy < 105 && s.phase === "run") o.go = true;
      if (o.go && !o.up) { o.x += 50 * dt; o.flat += dt; if (Math.hypot(o.x - p.x, o.y - p.y) < 7 && !s.air) { o.up = 1; o.vz = 150; GG.sfx.boing(); cap(S.ball, 4); } }
      if (o.up) { o.z += o.vz * dt; o.vz += 60 * dt; }
    } else if (o.t === "cat") {
      if (!o.seen && dy < 90) { o.seen = true; cap(S.cat, 4); }
    } else if (o.t === "house") {
      if (o.smoke >= 0) { o.smoke -= dt; if (o.smoke < 0) { o.smoke = 0.5 + Math.random() * 0.5; s.parts.push({ x: o.x - o.s.w / 2 + o.s.chim, y: o.y - o.s.h, vx: 5 + Math.random() * 4, vy: -72, l: 1.4, c: [200, 208, 224], sm: 1 }); } }
    } else if (o.t === "gate") { if (o.ring > 0) o.ring = Math.max(0, o.ring - dt * 1.4); }
  }
  function launch() {
    var s = st; if (s.phase !== "run") return;
    s.phase = "fly"; s.fly = 0; s.air = { t: 0, d: 9, h: 30 }; s.p.h = 0;
    GG.sfx.boing(); GG.sfx.lift(); puff(s.p.x, s.p.y, 20, 40, 14); sndSet(0, 0);
  }

  // ---------- draw ----------
  function drawSkier(x, sx, sy, sc) {
    var s = st, p = s.p, S = sprites(), k = S.sk.x, z = 0, body0 = { lean: p.lean, tuck: s.tuck, cap: K.red, coat: K.teal, pants: K.navy, skin: K.skin, pack: K.gold, splat: s.splat > 0 };
    k.clearRect(0, 0, 40, 40);
    if (s.crash) {
      var u = s.crash.t / s.crash.d, a = u * 9, r = 5;
      for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 2) px(k, (xx + yy > 3) ? K.snowSh : K.snowHi, 20 + xx, 24 + yy);
      skis(k, 20, 24, a, 8); rc(k, K.red, 19 + Math.round(Math.cos(a * 1.3) * 3), 22 + Math.round(Math.sin(a * 1.3) * 3), 3, 2);
    } else {
      if (s.air) { var f = Math.min(1, s.air.t / s.air.d); z = s.phase === "fly" ? s.fly * 26 : s.air.h * 4 * f * (1 - f); }
      skis(k, 20, 30, p.h + s.spin);
      if (s.air && Math.abs(s.spin) > 0.4) body0.lean = Math.sin(s.spin);
      body(k, 20, 30, body0);
      rc(k, [60, 64, 80], 16 + Math.round(body0.lean * 0.8), 27, 1, 4); rc(k, [60, 64, 80], 24 + Math.round(body0.lean * 0.8), 27, 1, 4);
    }
    if (z > 0 || s.air) { x.globalAlpha = 0.3; x.fillStyle = K.shadow; var sw = Math.max(3, 9 - z * 0.12); x.fillRect(Math.round(sx - sw / 2 + z * 0.5), Math.round(sy - 1 + z * 0.18), Math.round(sw), 2); x.globalAlpha = 1; }
    else if (!s.crash) { x.globalAlpha = 0.3; x.drawImage(S.sh1.c, Math.round(sx), Math.round(sy - 4)); x.globalAlpha = 1; }
    if (s.inv > 0 && !s.crash && Math.floor(s.t * 14) % 2) return;
    sc = sc || 1;
    x.drawImage(S.sk.c, 0, 0, 40, 40, Math.round(sx - 20 * sc), Math.round(sy - z - 30 * sc), 40 * sc, 40 * sc);
  }
  function drawObj(x, o, sx, sy) {
    var s = st, S = sprites(), p = s.p, sp = o.s, t = s.t;
    if (o.t === "deer") { var hop = o.go && o.wait <= 0 && o.x < o.x1 ? Math.abs(Math.sin(o.ph)) : 0; sp = S.deer[hop > 0.35 ? 1 : 0]; x.drawImage(sp.c, Math.round(sx - 6), Math.round(sy - 10 - hop * 6)); return; }
    if (o.t === "gate") {
      var w = Math.round(Math.sin(t * 30) * 2 * o.ring);
      x.drawImage(S.poleB.c, Math.round(sx - o.gap / 2 - 3) + w, Math.round(sy - 15)); x.drawImage(S.poleR.c, Math.round(sx + o.gap / 2 - 3) - w, Math.round(sy - 15));
      if (o.ring > 0.3) { text(x, "'", sx - o.gap / 2 - 6, sy - 20 - (1 - o.ring) * 8, K.gold); text(x, "'", sx + o.gap / 2 + 4, sy - 20 - (1 - o.ring) * 8, K.gold); }
      return;
    }
    if (o.t === "bank") {
      var bw = Math.round(o.w), x0 = Math.round(sx - bw / 2), yy;
      for (yy = 0; yy < 16; yy++) { var ins = Math.max(0, 4 - yy); rc(x, yy < 3 ? K.snowSh : yy < 12 ? K.snowHi : K.bank, x0 + ins, sy - 14 + yy, bw - ins * 2, 1); }
      rc(x, [120, 144, 200], x0 + 1, sy + 2, bw - 2, 2); return;
    }
    if (o.t === "hiker") { body(x, Math.round(sx), Math.round(sy), { cap: [226, 150, 52], beanie: 1, coat: [96, 132, 84], pants: [70, 70, 84], skin: [200, 146, 108], wave: o.seen && Math.floor(t * 5) % 2 }); rc(x, K.woodDk, sx - 5, sy - 6, 1, 7); return; }
    if (o.t === "kid") { body(x, Math.round(sx), Math.round(sy), { cap: [70, 120, 200], beanie: 1, coat: [232, 140, 60], pants: K.navy, skin: K.skin, kid: 1, wave: o.thrown && Math.floor(t * 6) % 2 }); return; }
    if (o.t === "ball") { if (o.z < 400) { if (!o.up) { x.globalAlpha = 0.3; x.fillStyle = K.shadow; x.fillRect(Math.round(sx - 1), Math.round(sy), 5, 1); x.globalAlpha = 1; } x.drawImage(S.ball.c, Math.round(sx - 2), Math.round(sy - 5 - o.z)); } return; }
    if (o.t === "cat") { x.drawImage((p.x > o.x ? S.catR : S.cat).c, Math.round(sx - 5), Math.round(sy - 10)); return; }
    if (!sp) return;
    x.drawImage(sp.c, Math.round(sx - sp.w / 2), Math.round(sy - sp.h));
    if (o.t === "marmot" && o.up) x.drawImage(S.marmot.c, 0, 0, 4, Math.round(5 * o.up), Math.round(sx - 2), Math.round(sy - sp.h - 5 * o.up + 1), 4, Math.round(5 * o.up));
    if (o.t === "lion") x.drawImage(S.lion[o.awake ? 1 : 0].c, Math.round(sx - 8), Math.round(sy - sp.h - 4));
  }
  function ground(x) {
    var s = st, S = sprites(), cam = s.cam, ox = -(((Math.round(cam.x) % 128) + 128) % 128), oy = -(((Math.round(cam.y) % 128) + 128) % 128), i, j;
    for (j = oy; j < H; j += 128) for (i = ox; i < W; i += 128) x.drawImage(S.tile.c, i, j);
    var cy = Math.round(cam.y), cxr = Math.round(cam.x);
    for (var sy = 0; sy < H; sy++) {
      var wy = cy + sy, sec = secAt(Math.max(0, wy));
      if (sec.ground === "ice" && wy > sec.y0 && wy < sec.y1) {
        var c = cx(wy), iw = iceW(wy, sec); if (iw < 1) continue;
        var a = Math.round(c - iw) - cxr, b = Math.round(c + iw) - cxr;
        rc(x, K.ice, a, sy, b - a, 1); px(x, K.iceLo, a, sy); px(x, K.iceLo, b - 1, sy); px(x, K.snowHi, a - 1, sy);
        var hsh = U.h2(7, wy >> 2); if (hsh < 0.5) rc(x, K.iceHi, a + 3 + ((hsh * 2 * (b - a - 10)) | 0), sy, 3 + (wy & 3), 1);
      } else if (sec.ground === "road" && wy > sec.y0) {
        var hh = Math.round(hw(wy)), rx = Math.round(cx(wy)) - cxr, fade = Math.min(1, (wy - sec.y0) / 40);
        if (sec.i === 6 && fade < 1 && U.bay(0, wy) > fade) continue;
        rc(x, K.road, rx - hh, sy, hh * 2, 1);
        var rh = U.h2(3, wy >> 1); if (rh < 0.09) rc(x, K.bank, rx - hh + 4 + ((rh * 3.3 * (hh * 2 - 22)) | 0), sy, 6 + ((rh * 90) % 9 | 0), 1);
        if ((wy >> 1) % 9) { px(x, K.roadTrk, rx - 10, sy); px(x, K.roadTrk, rx + 9, sy); px(x, K.roadTrk, rx - 9, sy); px(x, K.roadTrk, rx + 10, sy); }
        rc(x, K.bank, rx - hh - 3, sy, 3, 1); rc(x, K.bank, rx + hh, sy, 3, 1); px(x, K.bankSh, rx - hh, sy); px(x, K.bankSh, rx + hh - 1, sy);
      }
    }
  }
  function draw() {
    var s = st, x = ctx, S = sprites(), cam = s.cam, p = s.p, cxr = Math.round(cam.x), cyr = Math.round(cam.y), i, o;
    ground(x);
    // tracks
    x.fillStyle = K.track;
    for (i = 0; i < s.tracks.length; i++) {
      var q = s.tracks[i]; if (q.gap) continue; var ty = Math.round(q.y - cyr); if (ty < -2) continue;
      var nx = Math.cos(q.h) * 1.6, ny = -Math.sin(q.h) * 1.6;
      if (q.c) { x.fillRect(Math.round(q.x - cxr) - 2, ty - 1, 5, 2); continue; }
      x.fillRect(Math.round(q.x + nx - cxr), Math.round(q.y + ny - cyr), 1, 1); x.fillRect(Math.round(q.x - nx - cxr), Math.round(q.y - ny - cyr), 1, 1);
    }
    // what's in view, back to front
    var vis = [];
    near(function (ob) { var sx = ob.x - cxr; if (sx > -60 && sx < W + 40) vis.push(ob); }, cyr - 50, cyr + H + 50);
    x.globalAlpha = s.night ? 0.42 : 0.3;
    for (i = 0; i < vis.length; i++) { o = vis[i]; if (o.sh) x.drawImage(o.sh.c, Math.round(o.x - cxr), Math.round(o.y - cyr - 1 - (o.sh.ay || 0))); }
    x.globalAlpha = 1;
    for (i = 0; i < vis.length; i++) { o = vis[i]; if (o.flat) { if (o.t === "kick") x.drawImage(o.s.c, Math.round(o.x - cxr - 12), Math.round(o.y - cyr - 7)); else drawObj(x, o, o.x - cxr, o.y - cyr); } }
    var drew = false, sc = s.phase === "fly" ? 1 + Math.floor(s.fly * 3.2) : 1;
    function me() { drew = true; if (s.pup) { var ps = GG.spr.puppy(Math.floor(s.pup.d / 5) % 2, "front"); x.drawImage(ps.cv, Math.round(s.pup.x - cxr - ps.w / 2), Math.round(s.pup.y - cyr - ps.h)); } drawSkier(x, p.x - cxr, p.y - cyr, sc); }
    for (i = 0; i < vis.length; i++) { o = vis[i]; if (o.flat) continue; if (!drew && o.y > p.y && !s.air) me(); drawObj(x, o, o.x - cxr, o.y - cyr); }
    if (!drew) me();
    // snowballs, spray, smoke
    for (i = 0; i < s.balls.length; i++) { var b = s.balls[i], u = b.t / b.d; rc(x, K.snowHi, U.lerp(b.x0, b.tx, u) - cxr - 1, U.lerp(b.y0, b.ty, u) - cyr - 1 - Math.sin(u * Math.PI) * 22, 2, 2); }
    for (i = 0; i < s.parts.length; i++) { var f = s.parts[i]; if (f.sm) { x.globalAlpha = Math.min(0.7, f.l * 0.5); rc(x, f.c, f.x - cxr, f.y - cyr, 2, 2); x.globalAlpha = 1; f.vy = -9; } else px(x, f.c, f.x - cxr, f.y - cyr); }
    // night: dark blue over everything, your headlamp and the lamps cut through it
    if (s.night) night(x, vis, cxr, cyr);
    // falling snow
    x.fillStyle = "rgba(255,255,255,0.85)";
    for (i = 0; i < s.flakes.length; i++) { var fl = s.flakes[i]; x.fillRect(Math.round(((fl.x * W + Math.sin(s.t * fl.v + fl.p) * 6 - cam.x * 0.3) % W + W) % W), Math.round(((fl.y * H + s.t * 16 * fl.v - cam.y * 0.25 * fl.v) % H + H) % H), 1, 1); }
    // speech
    for (i = 0; i < s.bub.length; i++) {
      var bb = s.bub[i], bx = Math.round(bb.o.x - cxr), by = Math.round(bb.o.y - cyr - bb.dy), tw = textW(bb.s);
      bx = U.clamp(bx, tw / 2 + 4, W - tw / 2 - 4);
      if (!bb.bare) { rc(x, K.ink, bx - tw / 2 - 3, by - 3, tw + 6, 11); rc(x, [250, 248, 240], bx - tw / 2 - 2, by - 2, tw + 4, 9); }
      text(x, bb.s, bx - tw / 2, by, bb.bare ? [150, 170, 220] : K.ink);
    }
    if (s.phase === "title") title(x);
    // the way out, top right
    x.globalAlpha = 0.5; rc(x, K.ink, W - 12, 3, 9, 9); x.globalAlpha = 1; text(x, "X", W - 9, 5, [250, 248, 240]);
    if (s.white > 0) { x.fillStyle = "rgba(255,255,255," + s.white + ")"; x.fillRect(0, 0, W, H); }
  }
  function night(x, vis, cxr, cyr) {
    var s = st, S = sprites(), p = s.p, i, o;
    if (!S.dark || S.dark.w !== W || S.dark.h !== H) S.dark = mk(W, H);
    var d = S.dark.x, NV = [64, 78, 146]; d.globalCompositeOperation = "source-over"; d.fillStyle = css(NV); d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = "lighten";
    function light(X, Y, rx, ry, rot, c) { for (var k = 0; k < 6; k++) { var f = (k + 1) / 6; d.fillStyle = css(U.mix(NV, c, f * f)); d.beginPath(); d.ellipse(X, Y, rx * (1 - k * 0.15), ry * (1 - k * 0.15), rot || 0, 0, TAU); d.fill(); } }
    var sx = p.x - cxr, sy = p.y - cyr, hx2 = Math.sin(p.h + s.spin), hy2 = Math.cos(p.h + s.spin), HL = [255, 246, 222];
    if (!s.crash) light(sx + hx2 * 34, sy + hy2 * 34, 30, 56, -(p.h + s.spin), HL);
    light(sx, sy - 4, 14, 14, 0, [200, 200, 215]);
    for (i = 0; i < vis.length; i++) {
      o = vis[i]; var ox = o.x - cxr, oy = o.y - cyr;
      if (o.t === "lamp") light(ox, oy + 5, 40, 30, 0, [255, 232, 176]);
      else if (o.t === "gate") { light(ox - o.gap / 2, oy - 8, 11, 11, 0, [255, 214, 140]); light(ox + o.gap / 2, oy - 8, 11, 11, 0, [255, 214, 140]); }
      else if (o.t === "house") light(ox, oy + 7, o.s.w * 0.55, 12, 0, [214, 176, 130]);
    }
    x.globalCompositeOperation = "multiply";
    x.drawImage(S.dark.c, 0, 0); x.globalCompositeOperation = "source-over";
    for (i = 0; i < vis.length; i++) {
      o = vis[i]; var hx3 = Math.round(o.x - cxr), hy3 = Math.round(o.y - cyr);
      if (o.t === "house") o.s.wins.forEach(function (w) { rc(x, K.glow, hx3 - o.s.w / 2 + w[0], hy3 - o.s.h + w[1], 5, 5); rc(x, [255, 240, 190], hx3 - o.s.w / 2 + w[0] + 1, hy3 - o.s.h + w[1] + 1, 3, 2); });
      else if (o.t === "lamp") rc(x, [255, 244, 200], hx3 - 1, hy3 - 16, 3, 2);
      else if (o.t === "gate") { rc(x, K.glow, hx3 - o.gap / 2 - 1, hy3 - 15, 3, 3); rc(x, K.glow, hx3 + o.gap / 2 - 1, hy3 - 15, 3, 3); }
      else if (o.t === "lion" && o.awake) px(x, [255, 230, 90], hx3 + 4, hy3 - o.s.h - 2);
    }
  }
  function title(x) {
    var s = st, T = D().title, k = W > 150 ? 3 : 2, y = Math.round(H * 0.5), a = Math.min(1, s.t * 1.5);
    x.globalAlpha = a;
    T.forEach(function (l, i) { var w = textW(l, k); text(x, l, (W - w) / 2 + 1, y + i * 7 * k + 1, [120, 146, 200], k); text(x, l, (W - w) / 2, y + i * 7 * k, K.ink, k); });
    if (s.t > 1.2 && Math.floor(s.t * 1.6) % 2) { var m = D().push[s.touch ? "touch" : "keys"]; text(x, m, (W - textW(m)) / 2, y + T.length * 7 * k + 10, K.red); }
    x.globalAlpha = 1;
  }

  // ---------- sound: skis on snow ----------
  function sndStart() {
    var ac = GG.sfx.ctx(); if (!ac || snd) return;
    try {
      var n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ac.createBufferSource(); src.buffer = b; src.loop = true;
      var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.6;
      var g = ac.createGain(); g.gain.value = 0; src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start();
      snd = { src: src, g: g, bp: bp, ac: ac };
    } catch (e) { snd = null; }
  }
  function sndSet(carve, v, ice) {
    if (!snd) return; var t = snd.ac.currentTime;
    snd.g.gain.setTargetAtTime(GG.sfx.level() * (0.1 * Math.min(1, v / 110) + 0.7 * carve * Math.min(1, v / 60)), t, 0.06);
    snd.bp.frequency.setTargetAtTime((ice ? 3200 : 1300) + v * 9 + carve * 900, t, 0.08);
  }
  function sndStop() { if (!snd) return; try { snd.src.stop(); snd.g.disconnect(); } catch (e) {} snd = null; }

  // ---------- canvas, input, loop ----------
  var KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowDown: "down", KeyS: "down", ArrowUp: "up", KeyW: "up" };
  function resize() {
    if (!cv) return;
    var dpr = window.devicePixelRatio || 1, vw = window.innerWidth, vh = window.innerHeight;
    var P = Math.max(2, Math.floor(Math.min(vw * dpr / 160, vh * dpr / 215)));
    W = Math.ceil(vw * dpr / P); H = Math.ceil(vh * dpr / P); cv.width = W; cv.height = H;
    cv.style.width = (W * P / dpr) + "px"; cv.style.height = (H * P / dpr) + "px";
    ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  }
  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  function onKey(e) {
    if (!st) return;
    var down = e.type === "keydown", k = KEYS[e.code];
    if (e.code === "Escape" && down) { e.preventDefault(); quit(); return; }
    if (k) { e.preventDefault(); st.keys[k] = down; }
    if (down && !e.repeat && st.phase === "title" && st.t > 0.8 && !e.metaKey && !e.ctrlKey) { st.go = true; st.touch = false; }
  }
  function mount() {
    if (!cv) {
      cv = document.createElement("canvas"); cv.id = "e2"; cv.setAttribute("aria-label", "A secret");
      cv.style.cssText = "position:fixed;left:0;top:0;z-index:3;background:#fff;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;opacity:0;transition:opacity .55s linear;-webkit-tap-highlight-color:transparent;";
      cv.addEventListener("pointerdown", function (e) {
        if (!st) return; e.preventDefault(); GG.sfx.unlock(); var q = pt(e);
        if (q.x > W - 16 && q.y < 16) { quit(); return; }
        st.touch = e.pointerType !== "mouse";
        if (st.phase === "title") { if (st.t > 0.8) st.go = true; return; }
        st.ptr = q; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      });
      cv.addEventListener("pointermove", function (e) { if (st && st.ptr) st.ptr = pt(e); });
      var up = function () { if (st) st.ptr = null; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);
      window.addEventListener("blur", function () { if (st) { st.keys = {}; st.ptr = null; } });
      window.addEventListener("resize", function () { if (st) { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); } });
    }
    document.body.appendChild(cv); cv.hidden = false; resize();
  }
  function frame(now) {
    if (!st) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (dt > 0) { for (var k = 0, n = st.ff || 1; k < n && st; k++) update(dt); if (st) draw(); }
    raf = requestAnimationFrame(frame);
  }
  function startRun() {
    mount(); st = fresh(); st.touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    st.cam.x = st.p.x - W / 2; st.cam.y = st.p.y - Math.round(H * 0.34);
    GG.game.musicMood = st.night ? "egg2n" : "egg2";
    draw(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    void cv.offsetWidth; cv.style.opacity = "1";
    setTimeout(function () { window.GGLanding.paused = true; sndStart(); }, 600);
  }
  function quit() { if (st && !st.done && st.phase !== "fly") { st.done = true; st.quit = true; finish(true); } }
  // leave the mountain: fade the page back to the garage
  function finish(walked) {
    var s = st, res = { time: s.clock, hugs: s.hugs, walked: walked };
    sndStop(); GG.game.musicMood = null; window.GGLanding.paused = false;
    var go = function () {
      cv.style.opacity = "0";
      setTimeout(function () { st = null; cancelAnimationFrame(raf); cv.hidden = true; if (cv.parentNode) cv.parentNode.removeChild(cv); }, 600);
      home(res);
    };
    if (walked) { s.phase = "fly"; s.white = 1; s.air = null; setTimeout(go, 60); } else go();
  }

  // ---------- on the landing page: the skis, the way out, the way back in ----------
  var LS = { taps: 0, rattle: 0, flakes: [], next: 7, leave: null, act: null, pile: 0, parts: [] };
  function LG() { return window.GGLanding.get(); }
  function unit(l) { return Math.max(1, Math.round(l.G.gh * 0.62 / 24)); }
  function canStart() { return !busy && GG.game.mode() === "landing" && !(GG.landingCtl.on && GG.landingCtl.on()) && !GG.ui.isOpen(); }
  function onSkis(x, y) { var k = LG().G.ski; return k && x > k.x0 - 6 && x < k.x1 + 7 && y > k.y1 - 5 && y < k.y0 + 4; }
  function tap() {
    var k = LG().G.ski; GG.sfx.unlock(); LS.taps++;
    if (LS.taps < 2) {
      LS.rattle = 0.5; GG.sfx.note(980, 0.03, "square", 0.5); GG.sfx.note(760, 0.03, "square", 0.5, null, 0.09); GG.sfx.note(980, 0.03, "square", 0.4, null, 0.17);
      for (var i = 0; i < 4; i++) LS.flakes.push({ x: k.x1 - 1 + Math.random() * 3 - i, y: k.y1 + 2 + i * 5, t: 0, p: Math.random() * 6 });
      return;
    }
    begin();
  }
  function begin() {
    if (busy) return;
    busy = true; LS.taps = 0; GG.sfx.unlock(); GG.sfx.whoosh();
    var H0 = window.GGLanding; H0.noSkis = true; H0.rerender();
    LS.leave = { t: 0 };
    setTimeout(startRun, 1250);
  }
  function home(res) {
    var l = LG(), g = l.G, u = unit(l), Dd = D();
    LS.leave = null;
    var lx = Math.round(g.gx + g.gw * 0.52), ly = Math.round(g.gy + (l.H - g.gy) * 0.58);
    if (res.walked) {
      window.GGLanding.noSkis = false; window.GGLanding.rerender(); busy = false;
      setTimeout(function () { GG.ui.caption(Dd.abort, 5); }, 700);
      return;
    }
    var best = null, isBest = false;
    try { best = JSON.parse(localStorage.getItem("garage.egg2.v1") || "null"); } catch (e) {}
    if (!best || !(best.best > 0) || res.time < best.best) { isBest = !!(best && best.best > 0); best = { best: res.time, runs: ((best && best.runs) || 0) + 1 }; } else best.runs = (best.runs || 0) + 1;
    try { localStorage.setItem("garage.egg2.v1", JSON.stringify(best)); } catch (e) {}
    var a = LS.act = { ph: "fly", t: 0, x: l.W + 14, y: -24, lx: lx, ly: ly, dir: "side", flip: true, rot: 0, skis: "on", dist: 0, moving: false };
    setTimeout(function () { GG.sfx.note(1500, 1.1, "sine", 0.6, 300); }, 500);
    function walkTo(x, y, dir) { return new Promise(function (r) { a.ph = "walk"; a.tx = x; a.ty = y; a.dir = dir; a.res = r; }); }
    a.landed = function () {
      a.ph = "slide"; a.t = 0; a.rot = 0; a.dir = "front"; GG.sfx.bump(); GG.sfx.burst(0.25, 1.2);
      for (var i = 0; i < 26; i++) { var an = Math.PI + Math.random() * Math.PI; LS.parts.push({ x: a.x, y: a.y, vx: Math.cos(an) * (10 + Math.random() * 26), vy: Math.sin(an) * (8 + Math.random() * 22), l: 0.5 + Math.random() * 0.5 }); }
      U.wait(1.5).then(function () { a.skis = "carry"; GG.sfx.tick(); return U.wait(0.5); })
        .then(function () { var k = LG().G.ski; return walkTo(k.x0 + 5 * u, LG().G.gy + 1, "back"); })
        .then(function () { return U.wait(0.3); })
        .then(function () { a.skis = null; window.GGLanding.noSkis = false; window.GGLanding.rerender(); LS.pile = 1; GG.sfx.note(760, 0.04, "square", 0.5); GG.sfx.note(980, 0.04, "square", 0.5, null, 0.08); return U.wait(0.5); })
        .then(function () { a.dir = "front"; return U.wait(0.4); })
        .then(function () {
          var m = Math.floor(res.time / 60), sc = Math.floor(res.time % 60), lines = [U.fmt(Dd.end.time, { time: m + ":" + (sc < 10 ? "0" : "") + sc })];
          lines.push(U.fmt(Dd.end.hugs[res.hugs] || Dd.end.hugs.n, { hugs: res.hugs }));
          if (isBest) lines.push(Dd.end.best);
          return GG.ui.say(lines.concat(Dd.end.last));
        })
        .then(function () { var l2 = LG(); return walkTo(a.x, l2.H + 30 * u, "front"); })
        .then(function () { LS.act = null; busy = false; });
    };
  }
  var dims = {};
  function person(l, dir, frame, flp) {
    var s = GG.spr.person(Object.assign({}, GG.game.player.look, { dir: dir, frame: frame, flip: flp }));
    var k = l.night ? (l.S.bulb ? 0.78 : 0.55) : 1; if (k >= 1) return { c: s.cv, w: s.w, h: s.h };
    var key = dir + frame + (flp ? "f" : "") + k; if (dims[key]) return dims[key];
    var m = mk(s.cv.width, s.cv.height); m.x.drawImage(s.cv, 0, 0);
    var im = m.x.getImageData(0, 0, m.w, m.h), d = im.data; for (var i = 0; i < d.length; i += 4) { d[i] *= k; d[i + 1] *= k; d[i + 2] *= Math.min(1, k * 1.15); }
    m.x.putImageData(im, 0, 0); return (dims[key] = { c: m.c, w: s.w, h: s.h });
  }
  function overlay(c, t, dt) {
    var l = LG(), g = l.G, k = g.ski, i, f; if (!k) return;
    var RM = GG.reducedMotion;
    // a flake of snow falls off the skis now and then. It is not snowing.
    if (!busy && !RM) { LS.next -= dt; if (LS.next <= 0) { LS.next = 11 + Math.random() * 8; LS.flakes.push({ x: k.x1 - 1, y: k.y1 + 3, t: 0, p: Math.random() * 6 }); } }
    c.fillStyle = "rgba(255,255,255,0.95)";
    for (i = LS.flakes.length - 1; i >= 0; i--) { f = LS.flakes[i]; f.t += dt; f.y += dt * 9; if (f.y > k.y0) { LS.flakes.splice(i, 1); continue; } c.fillRect(Math.round(f.x + Math.sin(f.t * 2.4 + f.p) * 1.6 - (f.y - k.y1) * 0.08), Math.round(f.y), 1, 1); }
    if (LS.rattle > 0) { LS.rattle -= dt; var w = Math.floor(LS.rattle * 16) % 2; c.fillStyle = "rgba(40,36,30,0.55)"; c.fillRect(k.x1 + 3 + w, k.y1 + 4, 2, 1); c.fillRect(k.x1 - 6 - w, k.y1 + 9, 2, 1); c.fillRect(k.x1 + 2 + w, k.y1 + 15, 2, 1); }
    if (LS.pile > 0 && !l.G.noPile) { LS.pile -= dt / 200; c.fillStyle = "rgba(244,248,255," + Math.min(1, LS.pile * 3) + ")"; c.fillRect(k.x0 - 2, k.y0, 6, 1); c.fillRect(k.x0 - 1, k.y0 - 1, 3, 1); c.fillRect(k.x0 + 5, k.y0 + 1, 2, 1); }
    // off they go: the skis lift out of the corner and it starts, improbably, to snow
    if (LS.leave) {
      var q = LS.leave; q.t += dt; var up = q.t * q.t * 260, n = Math.min(160, Math.floor(q.t * q.t * 150));
      c.fillStyle = "rgb(200,71,63)";
      for (i = 0; i <= 20; i++) { var fx = U.lerp(k.x0, k.x1 - 2, i / 20), fy = U.lerp(k.y0, k.y1, i / 20) - up; c.fillStyle = i > 17 ? "rgb(240,238,232)" : "rgb(200,71,63)"; c.fillRect(Math.round(fx), Math.round(fy), 1, 3); c.fillRect(Math.round(fx) + 2, Math.round(fy), 1, 3); }
      c.fillStyle = "rgba(255,255,255,0.9)";
      for (i = 0; i < n; i++) c.fillRect(Math.round(((U.h2(i, 3) * l.W + t * (10 + (i % 5) * 4)) % l.W)), Math.round(((U.h2(i, 9) * l.H + t * (40 + (i % 7) * 12)) % l.H)), 1 + (i % 9 === 0 ? 1 : 0), 1);
    }
    // and home again: over the roof, onto the driveway
    var a = LS.act; if (!a) { LS.parts.length = 0; return; }
    var u = unit(l); a.t += dt;
    if (a.ph === "fly") {
      var uu = Math.min(1, a.t / 1.7); a.x = U.lerp(l.W + 14, a.lx + 10 * u, uu); a.y = -24 + (a.ly + 24) * uu * uu; a.rot = -uu * TAU * 2;
      if (uu >= 1) a.landed();
    } else if (a.ph === "slide") { var sl = Math.max(0, 1 - a.t / 0.7); a.x -= sl * 26 * u * dt; if (sl > 0 && Math.random() < 0.6) LS.parts.push({ x: a.x + 5 * u, y: a.y, vx: 14 + Math.random() * 20, vy: -6 - Math.random() * 12, l: 0.4 }); }
    else if (a.ph === "walk") {
      var dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), stp = 17 * u * dt;
      if (d <= stp) { a.x = a.tx; a.y = a.ty; a.moving = false; a.ph = "stand"; var r = a.res; a.res = null; if (r) r(); } else { a.x += dx / d * stp; a.y += dy / d * stp; a.dist += stp; a.moving = true; }
    }
    c.fillStyle = "rgba(255,255,255,0.95)";
    for (i = LS.parts.length - 1; i >= 0; i--) { f = LS.parts[i]; f.l -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 40 * dt; if (f.l <= 0) { LS.parts.splice(i, 1); continue; } c.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    var fr = a.moving ? Math.floor(a.dist / (2.6 * u)) % 4 : 0, sp = person(l, a.dir, fr, a.flip && a.dir === "side"), w = sp.w * u, h = sp.h * u;
    c.imageSmoothingEnabled = false;
    c.save(); c.translate(Math.round(a.x), Math.round(a.y - h / 2)); if (a.rot) c.rotate(a.rot);
    if (a.ph !== "fly") { c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(Math.round(-w * 0.3), Math.round(h / 2) - u, Math.round(w * 0.6), u); }
    if (a.skis === "on") { c.fillStyle = "rgb(200,71,63)"; c.fillRect(Math.round(-w * 0.75), Math.round(h / 2) - u, Math.round(w * 1.5), u); c.fillStyle = "rgb(240,238,232)"; c.fillRect(Math.round(-w * 0.75), Math.round(h / 2) - u, 2 * u, u); }
    c.drawImage(sp.c, Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h));
    if (a.skis === "carry") { for (i = 0; i < 20; i++) { c.fillStyle = i > 17 ? "rgb(240,238,232)" : "rgb(200,71,63)"; c.fillRect(Math.round(w * 0.32 - i * 0.12 * u), Math.round(h * 0.3 - i * u * 0.9), u, u); c.fillStyle = "rgb(160,57,50)"; c.fillRect(Math.round(w * 0.32 - i * 0.12 * u) + u, Math.round(h * 0.3 - i * u * 0.9), 1, u); } }
    c.restore();
  }

  E.busy = function () { return busy; };
  E.debug = function () { return { st: st, C: C, LS: LS, cx: cx }; };
  E.init = function () {
    var H0 = window.GGLanding, prev = H0.click, prevDraw = H0.draw, buf = "";
    H0.click = function (x, y) { if (busy) return true; if (canStart() && onSkis(x, y)) { tap(); return true; } return prev ? prev(x, y) : false; };
    H0.draw = function (c, t, dt) { if (prevDraw) prevDraw(c, t, dt); overlay(c, t, dt); };
    window.addEventListener("keydown", function (e) {
      if (!canStart() || (e.key || "").length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-3); if (buf === "ski") { buf = ""; begin(); }
    });
    if (/[?&]ski\b/.test(location.search)) setTimeout(function () { if (canStart()) begin(); }, 500);
  };
})();
