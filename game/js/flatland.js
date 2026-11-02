// The ant game, flat. You shrink so far you leave the third dimension: the world is a plane,
// everyone is a polygon, and the crumb is a visitor from above who only touches the plane a little at a time.
// One clear errand, one gesture: hold anywhere and you glide toward your finger (arrows/WASD on a keyboard).
// A goal line at the bottom and an arrow at the screen edge always say where to go next:
//   say hi to the Elder -> find the crumb -> catch it when it glows -> bring it home (with a parade) -> step into the circle.
// Its own music mood ("flat") and its own look (pure line art).
// GG.flat.play() resolves "grown" (took the Sphere up) or "left" (walked off the page).
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, F = GG.flat = {};
  var TAU = Math.PI * 2;
  var WORLD = { w: 1300, h: 560 };
  var START = { x: 55, y: 360 };
  var PANTRY = { x: 150, y: 300, r: 30 };
  var CRUMB0 = { x: 1090, y: 280 };
  var SPHERE0 = { x: 280, y: 330 };
  var GAP1 = { x: 384, y: 142 }, GAP2 = { x: 800, y: 268 }; // the polite ways through the cracks
  var PR = 7;      // you
  var CATCH = 8.5; // the crumb is catchable below this radius
  var BG = "#14122a", DOT = "#2a2552", INK = "#f4f0e6", WALLC = "#cdbfff", MINT = "#7ee8d0", GOLD = "#f2d890", GREEN = "#9ef08a";

  // the cracks of the pavement, seen from inside: lines you can't cross, with gaps
  var WALLS = [
    [[380, 0], [372, 60], [388, 110]], [[380, 175], [392, 230], [374, 300], [386, 395]], [[380, 450], [390, 500], [380, 560]],
    [[800, 0], [790, 70], [806, 140], [794, 235]], [[800, 300], [810, 380], [792, 470], [800, 560]],
    [[470, 220], [470, 350]], [[470, 350], [520, 350]],
    [[580, 500], [580, 380]], [[580, 380], [700, 380]], [[920, 60], [920, 170]], [[950, 330], [950, 500]], [[1000, 200], [1100, 200]]
  ];
  var SEGS = [];
  WALLS.forEach(function (pl) { for (var i = 0; i < pl.length - 1; i++) SEGS.push([pl[i][0], pl[i][1], pl[i + 1][0], pl[i + 1][1]]); });
  var SHY = { x: 800, y0: 235, y1: 300 };

  function D() { return GG.data.flat; }
  var st = null, c = null, W = 0, H = 0;
  function rgba(hex, a) { return U.css(U.hx(hex), a); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // ---------- state ----------
  function fresh() {
    var rr = U.rng((Date.now() & 0xffff) + 7);
    var s = {
      t: 0, busy: true, done: false, resolve: null, phase: "intro", idle: 0, tipAt: 0, talkCD: 0,
      p: { x: START.x, y: START.y, vx: 0, vy: 0, a: 0 }, cam: { x: START.x, y: START.y }, keys: {}, press: null, hold: null,
      rings: [], folk: [], ants: [], parade: [], carry: false, delivered: false, cheer: 0, colony: 3,
      crumb: { x: CRUMB0.x, y: CRUMB0.y, r: 10, bigSaid: false },
      shy: { open: false, reveal: 0 }, sphere: { on: false, t: 0 },
      lifting: null, bump: 0, W: 0, H: 0
    };
    D().folk.forEach(function (f, i) {
      s.folk.push({ d: f, x: f.at[0], y: f.at[1], n: f.n, rot: i * 0.7, spin: (i % 2 ? 1 : -1) * (0.12 + (i % 3) * 0.05), li: 0, pulse: 0, next: 0, joined: false });
    });
    for (var i = 0; i < 9; i++) s.ants.push({ x: 120 + rr() * 1000, y: 40 + rr() * 480, tx: 0, ty: 0, a: rr() * TAU, wait: rr() * 3 });
    return s;
  }
  function elder() { return st.folk[0]; }

  // ---------- the goal line (the shared pill at the bottom, see ui.js) ----------
  function setPhase(ph) {
    st.phase = ph;
    var txt = D().goals[ph];
    GG.ui.goal(txt ? txt : null);
  }
  // where the arrow points: the next gap on the way, then the thing itself
  function target() {
    var s = st, p = s.p;
    switch (s.phase) {
      case "elder": return elder();
      case "find": case "catch":
        if (p.x < GAP1.x) return GAP1;
        if (p.x < GAP2.x) return GAP2;
        return s.crumb;
      case "home":
        if (p.x > GAP2.x) return GAP2;
        if (p.x > GAP1.x) return GAP1;
        return PANTRY;
      case "sphere": return SPHERE0;
    }
    return null;
  }

  // ---------- drawing helpers (pure pixels, no smoothing) ----------
  function px(x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function ln(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy, n = 0;
    c.fillStyle = col;
    while (n++ < 2000) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  function ln3(x0, y0, x1, y1, col) { // a line with a cyan and a magenta ghost either side
    ln(x0 - 1, y0, x1 - 1, y1, "rgba(90,220,255,.32)"); ln(x0 + 1, y0, x1 + 1, y1, "rgba(255,90,170,.28)"); ln(x0, y0, x1, y1, col);
  }
  function circ(cx, cy, r, col, dash, ghost) {
    var n = Math.max(12, Math.round(r * TAU));
    for (var i = 0; i < n; i++) {
      if (dash && (i * dash / n | 0) % 2) continue;
      var a = i / n * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (ghost) { px(x - 1, y, "rgba(90,220,255,.3)"); px(x + 1, y, "rgba(255,90,170,.25)"); }
      px(x, y, col);
    }
  }
  function poly(cx, cy, n, r, rot, col, ghost) {
    if (n < 0) return circ(cx, cy, r, col, 0, ghost);
    if (n === 0) { var dx = Math.cos(rot) * r, dy = Math.sin(rot) * r; return (ghost ? ln3 : ln)(cx - dx, cy - dy, cx + dx, cy + dy, col); }
    var px0, py0;
    for (var i = 0; i <= n; i++) {
      var a = rot + (i % n) / n * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i > 0) (ghost ? ln3 : ln)(px0, py0, x, y, col);
      px0 = x; py0 = y;
    }
  }
  function tri(ax, ay, bx, by, cx2, cy2, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(Math.round(ax), Math.round(ay)); c.lineTo(Math.round(bx), Math.round(by)); c.lineTo(Math.round(cx2), Math.round(cy2)); c.closePath(); c.fill();
  }
  function toS(x, y) { return [x - st.cam.x + W / 2, y - st.cam.y + H / 2]; }

  // ---------- the loop ----------
  function update(dt) {
    var s = st; if (!s || s.done) return;
    s.t += dt;
    var UI = GG.ui, p = s.p;
    s.rings.forEach(function (r) { r.t += dt; r.r += dt * 95; });
    s.rings = s.rings.filter(function (r) { return r.t < 1.4; });
    s.folk.forEach(function (f) { f.rot += f.spin * dt; f.pulse = Math.max(0, f.pulse - dt * 2.2); });
    s.shy.reveal = Math.max(0, s.shy.reveal - dt); s.cheer = Math.max(0, s.cheer - dt * 0.35); s.bump = Math.max(0, s.bump - dt);
    s.talkCD = Math.max(0, s.talkCD - dt);
    s.ants.forEach(function (a) {
      a.wait -= dt;
      if (a.wait <= 0) { a.tx = a.x + (Math.random() - 0.5) * 120; a.ty = a.y + (Math.random() - 0.5) * 120; a.wait = 2 + Math.random() * 3; }
      var dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d > 2) { a.a = Math.atan2(dy, dx); a.x += dx / d * 16 * dt; a.y += dy / d * 16 * dt; }
    });
    // the visitor from above: big, then small (and green: catch it now), then big
    var cr = s.crumb;
    if (!s.carry && !s.delivered) {
      var q = 0.5 + 0.5 * Math.sin(s.t * 0.8);
      cr.r = 3 + 13 * Math.pow(q, 1.4);
      cr.x = CRUMB0.x + Math.sin(s.t * 0.4) * 14; cr.y = CRUMB0.y + Math.cos(s.t * 0.33) * 18;
    } else if (s.carry) {
      cr.r = 5 + Math.sin(s.t * 4) * 1.2;
      var tx = p.x - Math.cos(p.a) * 17, ty = p.y - Math.sin(p.a) * 17, k = Math.min(1, dt * 7);
      cr.x += (tx - cr.x) * k; cr.y += (ty - cr.y) * k;
    } else { cr.r = 3 + Math.sin(s.t * 3) * 0.8; cr.x = PANTRY.x; cr.y = PANTRY.y; }
    // the parade: each joined polygon follows the one ahead; at home they dance round the pantry
    s.parade.forEach(function (f, i) {
      var tx3, ty3, kk = Math.min(1, dt * 4);
      if (s.delivered) {
        var ang = s.t * 0.7 + i / s.parade.length * TAU;
        tx3 = PANTRY.x + Math.cos(ang) * 80; ty3 = PANTRY.y + Math.sin(ang) * 80;
      } else {
        var lead = i === 0 ? cr : s.parade[i - 1], dx2 = f.x - lead.x, dy2 = f.y - lead.y, d2 = Math.hypot(dx2, dy2) || 1;
        if (d2 < 17) return;
        tx3 = lead.x + dx2 / d2 * 17; ty3 = lead.y + dy2 / d2 * 17; kk = Math.min(1, dt * 6);
      }
      f.x += (tx3 - f.x) * kk; f.y += (ty3 - f.y) * kk;
    });
    if (s.sphere.on) s.sphere.t += dt;
    if (s.lifting != null) { s.lifting += dt / 2.6; p.vx = p.vy = 0; if (s.lifting >= 1 && !s.liftSaid) { s.liftSaid = true; GG.ui.say(D().sphere.lift).then(function () { finish("grown"); }); } }

    var frozen = s.busy || UI.isOpen();
    if (!frozen) move(dt); else { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); p.x += p.vx * dt; p.y += p.vy * dt; }
    if (!frozen) world(dt);
    // camera
    var tx2 = U.clamp(p.x, W / 2, WORLD.w - W / 2), ty2 = H >= WORLD.h ? WORLD.h / 2 : U.clamp(p.y, H / 2, WORLD.h - H / 2), ck = Math.min(1, dt * 5);
    s.cam.x += (tx2 - s.cam.x) * ck; s.cam.y += (ty2 - s.cam.y) * ck;
    // standing still for a while early on: show how to move again
    if (!frozen && (s.phase === "elder" || s.phase === "find")) {
      s.idle += dt;
      if (s.idle > 8 && s.t > s.tipAt) { s.tipAt = s.t + 20; UI.caption(tipLines()[0], 5); }
    }
  }
  function tipLines() {
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return coarse ? D().help.touch : D().help.keys;
  }

  function move(dt) {
    var s = st, p = s.p, k = s.keys, ix = 0, iy = 0;
    if (k.left) ix -= 1; if (k.right) ix += 1; if (k.up) iy -= 1; if (k.down) iy += 1;
    if (s.hold) { // glide toward the finger
      var ps = toS(p.x, p.y), hx = s.hold.x - ps[0], hy = s.hold.y - ps[1], hd = Math.hypot(hx, hy);
      if (hd > 5) { var kk = Math.min(1, hd / 28); ix += hx / hd * kk; iy += hy / hd * kk; }
    }
    var m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    if (m > 0.05) s.idle = 0;
    var max = 84 * (s.carry ? 0.85 : 1);
    p.vx += ix * 620 * dt; p.vy += iy * 620 * dt;
    var f = Math.exp(-3.6 * dt); p.vx *= f; p.vy *= f;
    var sp = Math.hypot(p.vx, p.vy); if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; sp = max; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (sp > 6) p.a = Math.atan2(p.vy, p.vx);
    // the cracks push back, softly
    var hitShy = false;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < SEGS.length + 1; i++) {
        var sg = i < SEGS.length ? SEGS[i] : (s.shy.open ? null : [SHY.x, SHY.y0, SHY.x, SHY.y1]);
        if (!sg) continue;
        var vx = sg[2] - sg[0], vy = sg[3] - sg[1], l2 = vx * vx + vy * vy, t = U.clamp(((p.x - sg[0]) * vx + (p.y - sg[1]) * vy) / l2, 0, 1);
        var qx = sg[0] + vx * t, qy = sg[1] + vy * t, dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy);
        if (d < PR) {
          var nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0, vn = p.vx * nx + p.vy * ny;
          p.x += nx * (PR - d); p.y += ny * (PR - d);
          if (vn < 0) { if (vn < -28 && s.bump <= 0) { s.bump = 0.25; GG.sfx && GG.sfx.bump(); } p.vx -= vn * nx; p.vy -= vn * ny; }
          if (i === SEGS.length) hitShy = true;
        }
      }
    }
    p.x = U.clamp(p.x, 14, WORLD.w - 14); p.y = U.clamp(p.y, 14, WORLD.h - 14);
    if (hitShy) shyTalk();
  }

  // what you run into
  function world() {
    var s = st, p = s.p, cr = s.crumb, UI = GG.ui;
    if (s.phase === "elder" && dist(p, elder()) < 30) return quest();
    // folk chat when you glide close; while you're carrying the crumb, they join the parade instead
    for (var i = 0; i < s.folk.length; i++) {
      var f = s.folk[i], d = dist(p, f);
      if (s.carry && !f.d.stay && !f.joined && d < 90) { joinParade(f); break; }
      if (!f.joined && d < 26 && s.t > f.next && s.talkCD <= 0 && s.phase !== "elder") { talk(f); f.next = s.t + 12; break; }
    }
    // Madam Line glimmers when you're near her gap, so you know something is there
    if (!s.shy.open && Math.hypot(SHY.x - p.x, (SHY.y0 + SHY.y1) / 2 - p.y) < 70) s.shy.reveal = Math.max(s.shy.reveal, 0.8);
    if (!s.delivered) {
      var dc = dist(cr, p);
      if (s.phase === "find" && dc < 150) { setPhase("catch"); GG.sfx && GG.sfx.ok(); D().crumb.far.forEach(function (l, j) { setTimeout(function () { if (st === s && !s.done && !s.carry) UI.caption(l, 4.4); }, j * 4600); }); }
      if (!s.carry && dc < cr.r + PR) {
        if (cr.r < CATCH) return grab();
        var nx = (p.x - cr.x) / (dc || 1), ny = (p.y - cr.y) / (dc || 1);
        p.vx += nx * 90; p.vy += ny * 90; GG.sfx && GG.sfx.boing();
        if (!cr.bigSaid) { cr.bigSaid = true; UI.caption(D().crumb.big[0], 4.5); }
      }
      if (s.carry && dist(PANTRY, p) < PANTRY.r) return deliver();
    }
    if (s.sphere.on && s.lifting == null) {
      var sr = sphereR();
      if (s.sphere.t > 1.5 && dist(SPHERE0, p) < sr - 4) return lift();
    }
  }
  function sphereR() { var t = st.sphere.t; return Math.min(1, t / 2) * (36 + 6 * Math.sin(t * 2.2)); }
  function talk(f) {
    var L = f.d.lines, line = L[f.li % L.length]; f.li++; f.pulse = 1; st.talkCD = 3;
    GG.sfx && GG.sfx.blip && GG.sfx.blip();
    GG.ui.caption(f.d.name + ": " + line, 5);
  }
  function quest() {
    var s = st; s.busy = true; s.hold = null; elder().pulse = 1; elder().next = s.t + 15;
    GG.sfx && GG.sfx.ping();
    GG.ui.say(D().quest).then(function () { s.busy = false; setPhase("find"); });
  }
  function joinParade(f) {
    var s = st; f.joined = true; f.pulse = 1; s.parade.push(f);
    GG.sfx && GG.sfx.ping();
    GG.ui.caption(s.parade.length === 1 ? D().parade.first : U.fmt(D().parade.join, { name: f.d.name }), 3.2);
  }
  function shyTalk() {
    var s = st; if (!s || s.busy || s.shy.open) return;
    s.busy = true; s.hold = null; s.shy.reveal = 6;
    GG.sfx && GG.sfx.ping();
    GG.ui.say(D().shy.seen).then(function () { s.shy.open = true; s.busy = false; GG.sfx && GG.sfx.get(); GG.ui.caption(D().shy.thanks, 4); });
  }
  function grab() {
    var s = st; s.busy = true; s.hold = null; GG.sfx && GG.sfx.get();
    GG.ui.say(D().crumb.grab).then(function () { s.carry = true; s.busy = false; setPhase("home"); GG.ui.caption(D().crumb.carry, 5); });
  }
  function deliver() {
    var s = st; s.busy = true; s.hold = null; s.carry = false; s.delivered = true; s.cheer = 1; s.colony++;
    s.folk.forEach(function (f) { if (f.n > 2) f.n++; f.pulse = 1; });
    GG.sfx && GG.sfx.chime();
    GG.ui.say(D().home.deliver).then(function () { return GG.ui.say(D().home.elder); }).then(function () {
      s.sphere.on = true; s.sphere.t = 0; s.busy = false; setPhase("sphere"); GG.ui.caption(D().home.sphere, 4);
    });
  }
  function lift() {
    var s = st; s.busy = true; s.hold = null; s.lifting = 0; GG.ui.goal(null); GG.sfx && GG.sfx.lift(); GG.ui.flash();
  }
  // a quick tap (or Space) sends a little hello ring; the nearest polygon answers
  function ping() {
    var s = st; if (!s || s.busy || s.done || GG.ui.isOpen()) return;
    var p = s.p; s.rings.push({ x: p.x, y: p.y, r: 4, t: 0 });
    GG.sfx && GG.sfx.ping();
    var best = null, bd = 70;
    s.folk.forEach(function (f) { var d = dist(f, p); if (d < bd && !f.joined) { bd = d; best = f; } });
    if (!s.shy.open && Math.hypot(SHY.x - p.x, (SHY.y0 + SHY.y1) / 2 - p.y) < 90) { s.shy.reveal = 3; }
    if (best && s.phase !== "elder") talk(best);
  }
  function askLeave() {
    var s = st; if (!s || s.busy || s.done) return;
    s.busy = true; s.hold = null;
    GG.ui.choose(D().leave.prompt, D().leave.choices).then(function (i) { if (i === 1) finish("left"); else s.busy = false; });
  }
  function finish(v) {
    var s = st; if (!s || s.done) return;
    s.done = true; GG.ui.goal(null);
    GG.ui.fadeTo(true, 0.7).then(function () {
      var G = GG.game; G.close = null; G.musicMood = null; G.setMode("world");
      st = null; s.resolve(v);
    });
  }

  // ---------- drawing ----------
  function draw(ctx, w, h) {
    var s = st; if (!s) return;
    c = ctx; W = w; H = h; s.W = w; s.H = h;
    var cx0 = s.cam.x - W / 2, cy0 = s.cam.y - H / 2, t = s.t, p = s.p;
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    // the plane: a faint grid of dots
    for (var gx = Math.floor(cx0 / 24) * 24; gx < cx0 + W + 24; gx += 24) for (var gy = Math.floor(cy0 / 24) * 24; gy < cy0 + H + 24; gy += 24) {
      if (gx < 0 || gy < 0 || gx > WORLD.w || gy > WORLD.h) continue;
      var q = toS(gx, gy); px(q[0], q[1], DOT);
    }
    // the edge of the page
    var e0 = toS(0, 0), e1 = toS(WORLD.w, WORLD.h);
    ln(e0[0], e0[1], e1[0], e0[1], "#3a3468"); ln(e0[0], e1[1], e1[0], e1[1], "#3a3468"); ln(e0[0], e0[1], e0[0], e1[1], "#3a3468"); ln(e1[0], e0[1], e1[0], e1[1], "#3a3468");
    // the visitor's ripples
    var cr = s.crumb, cs = toS(cr.x, cr.y), small = cr.r < CATCH;
    if (!s.delivered && !s.carry) for (var k = 1; k <= 3; k++) circ(cs[0], cs[1], cr.r + k * 16 + ((t * 8) % 16), rgba(small ? GREEN : GOLD, 0.16 / k), 6);
    // the cracks, breathing
    WALLS.forEach(function (pl) {
      for (var i = 0; i < pl.length - 1; i++) {
        var a = toS(pl[i][0] + Math.sin(t * 0.8 + pl[i][1] * 0.04) * 1.6, pl[i][1]), b = toS(pl[i + 1][0] + Math.sin(t * 0.8 + pl[i + 1][1] * 0.04) * 1.6, pl[i + 1][1]);
        if (Math.max(a[0], b[0]) < -4 || Math.min(a[0], b[0]) > W + 4 || Math.max(a[1], b[1]) < -4 || Math.min(a[1], b[1]) > H + 4) continue;
        ln3(a[0], a[1], b[0], b[1], WALLC);
      }
    });
    // the pantry, and the colony going round it
    var ps = toS(PANTRY.x, PANTRY.y);
    circ(ps[0], ps[1], PANTRY.r, GOLD, 10);
    circ(ps[0], ps[1], PANTRY.r - 5 + Math.sin(t * 2) * (s.cheer * 3), rgba(GOLD, 0.35), 0);
    for (var i2 = 0; i2 < 8; i2++) {
      var ang = t * (0.5 + s.cheer * 1.6) + i2 / 8 * TAU, ax = PANTRY.x + Math.cos(ang) * 50, ay = PANTRY.y + Math.sin(ang) * 50, as = toS(ax, ay);
      poly(as[0], as[1], s.colony, 4.5 + s.cheer * 2, -ang * 2, rgba(GOLD, 0.9), false);
    }
    // the people of the plane: always there, brighter when you're close
    s.folk.forEach(function (f) {
      var fs = toS(f.x, f.y + (f.joined ? 0 : Math.sin(t * 0.8 + f.rot) * 1.5));
      if (fs[0] < -30 || fs[0] > W + 30 || fs[1] < -30 || fs[1] > H + 30) return;
      var near = dist(f, p) < 60 || f.joined, al = near ? 1 : 0.55;
      var r = (f.d.n < 0 ? 10 : 8 + (f.n > 6 ? 1 : 0)) * (1 + f.pulse * 0.35) * (f.joined && !s.delivered ? 0.85 : 1);
      poly(fs[0], fs[1], f.n, r, f.rot, rgba(f.d.c, al), near);
      if (near) px(fs[0], fs[1], rgba(f.d.c, 0.7));
    });
    // Madam Line: edge-on she is just a point
    var sh = toS(SHY.x, (SHY.y0 + SHY.y1) / 2);
    if (s.shy.open) { var so = toS(SHY.x + 24, SHY.y0 - 16 + Math.sin(t) * 1.5); ln3(so[0] - 12, so[1], so[0] + 12, so[1], rgba("#f0b8e0", 0.95)); }
    else if (s.shy.reveal > 0) ln3(sh[0], sh[1] - (SHY.y1 - SHY.y0) / 2, sh[0], sh[1] + (SHY.y1 - SHY.y0) / 2, rgba("#f0b8e0", Math.min(1, s.shy.reveal)));
    else { px(sh[0], sh[1], rgba("#f0b8e0", 0.5 + 0.3 * Math.sin(t * 2))); px(sh[0], sh[1] - 1, rgba("#f0b8e0", 0.35)); px(sh[0], sh[1] + 1, rgba("#f0b8e0", 0.35)); }
    // little ants (long, thin triangles)
    s.ants.forEach(function (a) {
      var as2 = toS(a.x, a.y); if (as2[0] < -8 || as2[0] > W + 8 || as2[1] < -8 || as2[1] > H + 8) return;
      var ca = Math.cos(a.a), sa = Math.sin(a.a), col = "rgba(232,226,212,.45)";
      ln(as2[0] + ca * 4, as2[1] + sa * 4, as2[0] - ca * 3 - sa * 1.5, as2[1] - sa * 3 + ca * 1.5, col);
      ln(as2[0] + ca * 4, as2[1] + sa * 4, as2[0] - ca * 3 + sa * 1.5, as2[1] - sa * 3 - ca * 1.5, col);
      ln(as2[0] - ca * 3 - sa * 1.5, as2[1] - sa * 3 + ca * 1.5, as2[0] - ca * 3 + sa * 1.5, as2[1] - sa * 3 - ca * 1.5, col);
    });
    // the Sphere, coming up through the page
    if (s.sphere.on) {
      var sr = sphereR(), ss = toS(SPHERE0.x, SPHERE0.y);
      if (sr > 1) { circ(ss[0], ss[1], sr, INK, 0, true); circ(ss[0], ss[1], sr * 0.66, rgba(INK, 0.5), 0); circ(ss[0], ss[1], sr * 0.33, rgba(INK, 0.3), 0); }
      circ(ss[0], ss[1], sr + 6 + (t * 10 % 8), rgba("#9ef0d8", 0.35), 10);
    }
    // the visitor (and, once caught, your companion). Green and ringed when it's small enough to catch
    var crs = toS(cr.x, cr.y);
    if (s.carry || s.delivered) { circ(crs[0], crs[1], cr.r, "#f6e8c0", 0, true); px(crs[0], crs[1], "#f6e8c0"); }
    else if (small) {
      circ(crs[0], crs[1], cr.r, GREEN, 0, true); px(crs[0], crs[1], GREEN);
      circ(crs[0], crs[1], cr.r + 4 + Math.sin(t * 10) * 1.2, rgba(GREEN, 0.6), 4);
    } else { circ(crs[0], crs[1], cr.r, rgba("#f6e8c0", 0.8), 0, true); circ(crs[0], crs[1], cr.r * 0.5, rgba("#f6e8c0", 0.35), 0); }
    // pings
    s.rings.forEach(function (r) { var rs = toS(r.x, r.y), al = Math.max(0, 1 - r.t / 1.4); circ(rs[0], rs[1], r.r, rgba(INK, 0.55 * al), 0); if (r.r > 14) circ(rs[0], rs[1], r.r - 10, rgba(MINT, 0.3 * al), 0); });
    // you, a very respectable pentagon
    var pl = toS(p.x, p.y), lf = s.lifting == null ? 0 : Math.min(1, s.lifting), sc = 1 + lf * 7, ps2 = Math.hypot(p.vx, p.vy);
    poly(pl[0], pl[1], 5, PR * sc, p.a, rgba(MINT, 1 - lf * 0.8), true);
    var ex = pl[0] + Math.cos(p.a) * (PR - 2) * sc, ey = pl[1] + Math.sin(p.a) * (PR - 2) * sc;
    c.fillStyle = "#fff"; c.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
    if (ps2 > 20 && !s.busy) circ(pl[0] - Math.cos(p.a) * 4, pl[1] - Math.sin(p.a) * 4, PR + 3 + (t * 6 % 3), rgba(MINT, 0.12), 8);
    // where to go next
    if (!s.busy && lf === 0 && !GG.ui.isOpen()) drawArrow(t);
    // the way out
    var bx = W - 26, by = H - 26;
    ln(bx, by, bx + 20, by, "#4a4480"); ln(bx, by + 20, bx + 20, by + 20, "#4a4480"); ln(bx, by, bx, by + 20, "#4a4480"); ln(bx + 20, by, bx + 20, by + 20, "#4a4480");
    ln(bx + 5, by + 10, bx + 15, by + 10, "#8a84c0"); ln(bx + 5, by + 10, bx + 9, by + 6, "#8a84c0"); ln(bx + 5, by + 10, bx + 9, by + 14, "#8a84c0");
    // going up
    if (lf > 0) { c.fillStyle = "rgba(255,255,255," + (lf * lf * 0.95) + ")"; c.fillRect(0, 0, W, H); }
  }
  // on screen: a bobbing chevron over the target. Off screen: an arrow at the edge, pointing the way
  function drawArrow(t) {
    var tg = target(); if (!tg) return;
    var ts = toS(tg.x, tg.y), m = 14, bob = Math.sin(t * 5) * 2;
    var on = ts[0] > m && ts[0] < W - m && ts[1] > m + 16 && ts[1] < H - m - 30;
    if (on) {
      var y0 = ts[1] - 20 + bob;
      tri(ts[0] - 5, y0 - 5, ts[0] + 5, y0 - 5, ts[0], y0 + 1, GOLD);
      return;
    }
    var pl = toS(st.p.x, st.p.y), dx = ts[0] - pl[0], dy = ts[1] - pl[1], a = Math.atan2(dy, dx);
    // walk from the player toward the target until we hit the inner frame
    var kx = dx > 0 ? (W - m - pl[0]) / dx : dx < 0 ? (m - pl[0]) / dx : Infinity;
    var ky = dy > 0 ? (H - m - 34 - pl[1]) / dy : dy < 0 ? (m + 20 - pl[1]) / dy : Infinity;
    var kk = Math.min(kx, ky, 1), ax = pl[0] + dx * kk - Math.cos(a) * bob, ay = pl[1] + dy * kk - Math.sin(a) * bob;
    var ca = Math.cos(a), sa = Math.sin(a), L = 8, Wd = 6;
    tri(ax + ca * L, ay + sa * L, ax - ca * 2 - sa * Wd, ay - sa * 2 + ca * Wd, ax - ca * 2 + sa * Wd, ay - sa * 2 - ca * Wd, rgba(GOLD, 0.95));
  }

  // ---------- its own controls ----------
  var handler = {
    update: function (dt) { update(dt); },
    draw: function (ctx, w, h) { draw(ctx, w, h); },
    key: function (k, down) {
      var s = st; if (!s) return;
      if (k === "up" || k === "down" || k === "left" || k === "right") s.keys[k] = down;
      else if (k === "ok" && down) ping();
      else if (k === "esc" && down) askLeave();
    },
    down: function (x, y) {
      var s = st; if (!s || s.busy) return;
      if (x > W - 32 && y > H - 32) { askLeave(); return; }
      s.press = { x: x, y: y, t: performance.now(), drag: false };
      s.hold = { x: x, y: y };
    },
    move: function (x, y) {
      var s = st; if (!s || !s.press) return;
      if (Math.hypot(x - s.press.x, y - s.press.y) > 5) s.press.drag = true;
      if (s.hold) { s.hold.x = x; s.hold.y = y; }
    },
    up: function () {
      var s = st; if (!s) return;
      var pr = s.press; s.press = null; s.hold = null;
      if (pr && !pr.drag && performance.now() - pr.t < 220) ping();
    }
  };

  F.debug = function () { return st; }; // for tests
  F.target = function () { return st && target(); };

  // ---------- go ----------
  F.play = function (opt) {
    var UI = GG.ui, G = GG.game;
    return new Promise(function (resolve) {
      UI.fadeTo(true, 0.5).then(function () {
        st = fresh(); st.resolve = resolve;
        G.close = handler; G.musicMood = "flat"; G.setMode("close");
        return UI.fadeTo(false, 0.8);
      }).then(function () {
        var arr = D().arrive.slice();
        if (opt && opt.print) arr[0] = U.fmt(D().arriveInk, { print: opt.print, ball: opt.ball || "ball" });
        return UI.say(arr);
      }).then(function () {
        if (!st) return;
        st.busy = false; setPhase("elder");
        UI.caption(tipLines()[0], 5);
      });
    });
  };
})();
