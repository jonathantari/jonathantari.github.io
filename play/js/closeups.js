// Close-up screens drawn flat on the low-res canvas: the ball in your hands,
// throwing, punting, the standoff, chalk art, the lemonade stand.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr;
  var CL = GG.close = {};
  var R = U.rng(Date.now() & 0xffff);
  var snap = null;

  function start(h) {
    var G = GG.game, r3 = G.r3();
    // the world frame behind the close-up (keep the old one when chaining close-ups)
    if (G.mode() === "world" || !snap) snap = r3.ctx.getImageData(0, 0, G.W, G.H);
    G.close = h; G.setMode("close");
  }
  function end() { var G = GG.game; G.close = null; G.setMode("world"); }
  function back(ctx, W, H, dim) {
    if (snap && snap.width === W) ctx.putImageData(snap, 0, 0); else { ctx.fillStyle = "#334"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "rgba(20,18,30," + (dim == null ? 0.45 : dim) + ")"; ctx.fillRect(0, 0, W, H);
  }
  function spr(ctx, s, x, y, k, flip) {
    ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.save(); ctx.translate(Math.round(x + s.w * k), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(s.cv, 0, 0, s.w * k, s.h * k); ctx.restore(); }
    else ctx.drawImage(s.cv, Math.round(x), Math.round(y), Math.round(s.w * k), Math.round(s.h * k));
  }
  function disc(ctx, cx, cy, r, fn) {
    for (var y = Math.floor(cy - r); y <= cy + r; y++) for (var x = Math.floor(cx - r); x <= cx + r; x++) {
      var dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = dx * dx + dy * dy;
      if (d <= 1) { var c = fn(dx, dy, d, x, y); if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }
    }
  }
  var BALLC = {
    soccer: function (dx, dy) { var a = Math.atan2(dy, dx), r = Math.hypot(dx, dy); return (r < 0.28 || (Math.abs(Math.sin(a * 2.5)) < 0.18 && r > 0.55 && r < 0.85)) ? [42, 42, 48] : [244, 242, 238]; },
    beach: function (dx) { return dx < -0.33 ? [232, 68, 42] : dx < 0.33 ? [244, 242, 238] : [58, 122, 208]; },
    tennis: function (dx, dy) { return Math.abs(Math.sin(dx * 2.2) * 0.55 - dy) < 0.08 ? [244, 242, 238] : [204, 224, 74]; },
    balloon: function () { return [232, 74, 106]; }
  };
  function drawBall(ctx, kind, cx, cy, r) {
    var f = BALLC[kind] || BALLC.soccer;
    disc(ctx, cx, cy, r, function (dx, dy, d, x, y) {
      var c = f(dx, dy), l = 1.05 - 0.35 * (dx * 0.5 + dy * 0.7 + 0.6);
      if (d > 0.82 && U.bay(x, y) > 0.5) l *= 0.85;
      if (dx < -0.3 && dy < -0.3 && d < 0.5 && U.bay(x, y) > 0.7) l = 1.25;
      return U.css([Math.min(255, c[0] * l), Math.min(255, c[1] * l), Math.min(255, c[2] * l)]);
    });
  }
  var SKIN = [224, 170, 134];
  function hand(ctx, cx, cy, r, flip) {
    disc(ctx, cx, cy, r, function (dx, dy, d, x, y) { var l = 1 - dy * 0.15 - (flip ? -dx : dx) * 0.1; if (d > 0.8) l *= 0.82; return U.css(U.dk(SKIN, l)); });
    for (var i = 0; i < 3; i++) { ctx.fillStyle = U.css(U.dk(SKIN, 0.72)); ctx.fillRect(Math.round(cx + (flip ? 1 : -1) * r * 0.2 + (flip ? -1 : 1) * i * r * 0.28), Math.round(cy - r * 0.55), 1, Math.round(r * 0.5)); }
  }

  // ---------- A0: the ball in your hands ----------
  CL.ball = function (kind, talker) {
    var B = GG.data.street.ball;
    return new Promise(function (res) {
      var t = 0, ant = { a: -0.6, v: 0.25 }, done = false, R0 = 0, cx = 0, cy = 0;
      start({
        update: function (dt) { t += dt; ant.a += ant.v * dt * (Math.sin(t * 0.7) > -0.2 ? 1 : -0.6); },
        draw: function (ctx, W, H) {
          back(ctx, W, H, 0.5);
          R0 = Math.round(Math.min(W, H) * 0.22); cx = Math.round(W / 2); cy = Math.round(H * 0.42 + Math.sin(t * 2.2) * 2);
          drawBall(ctx, kind.id, cx, cy, R0);
          hand(ctx, cx - R0 * 0.82, cy + R0 * 0.55, R0 * 0.42, false); hand(ctx, cx + R0 * 0.82, cy + R0 * 0.55, R0 * 0.42, true);
          ctx.fillStyle = U.css(U.dk(SKIN, 0.9)); ctx.fillRect(cx - R0 * 1.25, cy + R0 * 0.8, R0 * 0.35, H); ctx.fillRect(cx + R0 * 0.9, cy + R0 * 0.8, R0 * 0.35, H);
          // the tiny talker, wandering over the top of the ball
          var ax = Math.round(cx + Math.cos(ant.a - 1.2) * R0 * 0.7), ay = Math.round(cy + Math.sin(ant.a - 1.2) * R0 * 0.55);
          ant.x = ax; ant.y = ay;
          if (talker.id === "ladybug") { ctx.fillStyle = "#d83a32"; ctx.fillRect(ax - 1, ay - 1, 3, 2); ctx.fillStyle = "#2a2026"; ctx.fillRect(ax + 2, ay - 1, 1, 1); }
          else if (talker.id === "snail") { ctx.fillStyle = "#c8864a"; ctx.fillRect(ax - 1, ay - 2, 3, 2); ctx.fillStyle = "#c8b8a0"; ctx.fillRect(ax - 2, ay, 5, 1); }
          else { ctx.fillStyle = "#2a1e1a"; ctx.fillRect(ax - 2, ay, 2, 2); ctx.fillRect(ax, ay, 1, 1); ctx.fillRect(ax + 1, ay - 1, 2, 2); var lg = (t * 8 | 0) % 2; ctx.fillRect(ax - 2 + lg, ay + 2, 1, 1); ctx.fillRect(ax + lg, ay + 2, 1, 1); ctx.fillRect(ax + 2 - lg, ay + 1, 1, 1); ctx.fillRect(ax + 3, ay - 2, 1, 1); }
        },
        down: function (x, y) {
          if (done) return;
          if (Math.hypot(x - ant.x, y - ant.y) < 7) { done = true; GG.ui.cancel(); finish("ant"); }
        }
      });
      function finish(v) { end(); res(v); }
      GG.ui.choose(U.fmt(B.closeup.prompt, { ball: kind.name }), B.closeup.choices).then(function (i) { if (done) return; done = true; finish(i === 1 ? "punt" : "throw"); });
    });
  };

  // a timing meter: returns how close to centre you pressed (0 best .. 1 worst)
  function meter(ctx, W, H, t, zone, speed) {
    var bw = Math.round(W * 0.7), bx = Math.round((W - bw) / 2), by = Math.round(H * 0.8), bh = Math.max(6, Math.round(H * 0.035));
    ctx.fillStyle = "#1a1820"; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = "#e8e2d4"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#6ab04a"; ctx.fillRect(Math.round(bx + bw * (0.5 - zone / 2)), by, Math.round(bw * zone), bh);
    var m = 0.5 + 0.5 * Math.sin(t * speed);
    ctx.fillStyle = "#c8402a"; ctx.fillRect(Math.round(bx + bw * m) - 1, by - 4, 3, bh + 8);
    return m;
  }
  function waiterSpr(w) {
    if (w.id === "dog") return S.dog(0);
    return S.person(Object.assign({}, w.look, { dir: "front", frame: 0 }));
  }
  // one throw. o: {waiter, kind, zone, speed, back}
  function oneThrow(o) {
    return new Promise(function (res) {
      var t = 0, phase = "aim", m = 0.5, fly = 0, q = null, wsp = waiterSpr(o.waiter), zone = o.zone || 0.22, speed = o.speed || 3.2;
      start({
        update: function (dt) { t += dt; if (phase === "fly") { fly += dt / 0.9; if (fly >= 1) { phase = "done"; setTimeout(function () { end(); res(q); }, 350); } } },
        draw: function (ctx, W, H) {
          back(ctx, W, H, 0.25);
          var k = Math.max(2, Math.round(H / 70)), wx = W / 2 - wsp.w * k / 2, wy = H * 0.5 - wsp.h * k;
          spr(ctx, wsp, wx, wy, k);
          if (phase === "aim") { m = meter(ctx, W, H, t, zone, speed); drawBall(ctx, o.kind.id, W / 2, H * 0.68, Math.round(H * 0.07)); hand(ctx, W / 2 + H * 0.06, H * 0.74, H * 0.05, true); }
          else if (phase === "fly" || phase === "done") {
            var f = Math.min(1, fly), off = q === "good" ? 0 : W * 0.28;
            var bx = U.lerp(W / 2, W / 2 + off, f), by = U.lerp(H * 0.68, H * 0.42, f) - Math.sin(f * Math.PI) * H * 0.25, br = U.lerp(H * 0.07, H * 0.018, f);
            if (!(q === "good" && f >= 1)) drawBall(ctx, o.kind.id, Math.round(bx), Math.round(by), Math.max(2, Math.round(br)));
          }
        },
        key: function (k, down) { if (down && k === "ok") press(); },
        down: function () { press(); }
      });
      function press() { if (phase !== "aim") return; q = Math.abs(m - 0.5) < zone / 2 ? "good" : "bad"; phase = "fly"; GG.sfx && GG.sfx.whoosh(); }
    });
  }
  CL.throwBall = function (o) { GG.ui.caption(GG.data.street.ball.throwHelp, 4); return oneThrow(o); };
  CL.catchGame = function (ctx) {
    var n = 0, good = 0;
    function round() {
      if (n >= 3) return GG.ui.say(good >= 2 ? ["'" + good + " out of 3! Pro.'"] : ["'That's okay. Catch is mostly about the running.'"]);
      n++;
      return oneThrow({ waiter: ctx.waiter, kind: ctx.kind, zone: 0.26 - n * 0.05, speed: 2.8 + n * 0.6 }).then(function (q) { if (q === "good") good++; GG.ui.caption(q === "good" ? "Caught it!" : "Whoops, over the hedge.", 1.6); return U.wait(0.6); }).then(round);
    }
    return round();
  };

  // ---------- A3: punt ----------
  CL.punt = function (kind) {
    return new Promise(function (res) {
      var t = 0;
      start({
        update: function (dt) { t += dt; if (t > 3.4) { end(); res(); } },
        draw: function (ctx, W, H) {
          // looking straight up at the sky
          var night = GG.game.E.tod === "night", sky = night ? ["#0e1228", "#202852"] : ["#4f8fcc", "#a8cce9"];
          for (var b2 = 0; b2 < 5; b2++) { ctx.fillStyle = U.css(U.mix(U.hx(sky[0]), U.hx(sky[1]), b2 / 4)); ctx.fillRect(0, Math.round(H * b2 / 5), W, Math.ceil(H / 5)); }
          var drop = Math.min(1, t / 0.5), kick = t > 0.5;
          if (!kick) { drawBall(ctx, kind.id, W / 2, H * 0.3 + drop * H * 0.45, Math.round(H * 0.08)); }
          else {
            var f = Math.min(1, (t - 0.5) / 2.2), r = Math.max(1, Math.round(H * 0.09 * (1 - f) * (1 - f)));
            if (f < 1) drawBall(ctx, kind.id, W / 2 + f * W * 0.06, H * 0.75 - Math.pow(f, 0.6) * H * 0.62, r);
            else if ((t * 6 | 0) % 2) { ctx.fillStyle = "#fff4c0"; ctx.fillRect(W / 2 + W * 0.06 - 1, H * 0.13, 3, 1); ctx.fillRect(W / 2 + W * 0.06, H * 0.13 - 1, 1, 3); }
            // the boot, swinging up
            var by = H * (1.05 - Math.min(1, (t - 0.5) * 4) * 0.35);
            ctx.fillStyle = "#4a3428"; ctx.fillRect(W / 2 - H * 0.08, by, H * 0.16, H * 0.08); ctx.fillStyle = "#34405e"; ctx.fillRect(W / 2 - H * 0.06, by + H * 0.08, H * 0.12, H * 0.3);
          }
          if (kick && t < 0.65) { GG.ui.flash(); }
        }
      });
      setTimeout(function () { GG.sfx && GG.sfx.boot(); }, 500);
    });
  };

  // ---------- C2: the standoff ----------
  // cfg: { data, foe(roaring) -> sprite, ledge, ground, cower } (defaults: the lion on its ledge)
  CL.battle = function (cfg) {
    cfg = cfg || {};
    var L = cfg.data || GG.data.trail.lion, E = GG.game.E;
    var foe = cfg.foe || function (r) { return S.lion(r ? 1 : 0, true); }, ledge = cfg.ledge !== false, cower = cfg.cower !== false;
    return new Promise(function (res) {
      var t = 0, shake = 0, step = 0, roar = 0, calm = 0, last = null;
      var se = E.season, night = E.tod === "night";
      var ground = cfg.ground || (se === "winter" ? "#e8eef2" : se === "spring" ? "#7aa858" : "#aab070"), rockC = "#a89480";
      start({
        update: function (dt) { t += dt; shake = Math.max(0, shake - dt); roar = Math.max(0, roar - dt); },
        draw: function (ctx, W, H) {
          var sky = night ? ["#161b3c", "#313868"] : E.tod === "dusk" ? ["#6a508a", "#e08a6a"] : ["#67a2d6", "#c6def0"];
          var hz = Math.round(H * 0.3), s0 = U.hx(sky[0]), s1 = U.hx(sky[1]);
          for (var b2 = 0; b2 < 4; b2++) { ctx.fillStyle = U.css(U.mix(s0, s1, b2 / 3)); ctx.fillRect(0, Math.round(hz * b2 / 4), W, Math.ceil(hz / 4)); }
          // far ridge
          ctx.fillStyle = night ? "#1c2243" : "#7f9397";
          for (var x = 0; x < W; x++) { var ry = hz - 6 - Math.round(Math.abs(Math.sin(x * 0.05)) * 8 + Math.sin(x * 0.17) * 2); ctx.fillRect(x, ry, 1, hz - ry); }
          ctx.fillStyle = ground; ctx.fillRect(0, hz, W, H - hz);
          ctx.fillStyle = U.css(U.dk(U.hx(ground), 0.9)); for (var i = 0; i < 60; i++) ctx.fillRect((i * 37) % W, hz + 2 + ((i * 53) % (H - hz)), 3, 1);
          var sx = shake > 0 ? Math.round(Math.sin(t * 60) * 2) : 0;
          var k = Math.max(2, Math.round(Math.min(W / 100, H / 72)));
          // the ledge, and the lion on it (facing you)
          var fs = foe(roar > 0), lw = fs.w * k, lx = Math.round(W * 0.92 - lw) + sx + step * k * 3, ly = Math.round(H * 0.06), foot = ly + fs.h * k;
          if (ledge) {
            ctx.fillStyle = rockC; ctx.beginPath(); ctx.ellipse(lx + lw * 0.5, foot - k, lw * 0.62, 5 * k, 0, 0, 7); ctx.fill();
            ctx.fillStyle = U.css(U.dk(U.hx(rockC), 0.8)); ctx.fillRect(Math.round(lx - lw * 0.1), foot - k, Math.round(lw * 1.2), 6 * k);
          } else { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(lx + lw * 0.5, foot, lw * 0.45, 2 * k, 0, 0, 7); ctx.fill(); }
          spr(ctx, fs, lx, ly + (roar > 0 ? Math.round(Math.sin(t * 40) * k) : 0), k, false);
          if (cower) { // the puppy, cowering below the ledge
            var pp = S.puppy(0, "front");
            spr(ctx, pp, Math.round(W * 0.5), foot + 5 * k - pp.h * k + (Math.sin(t * 20) > 0.6 ? 1 : 0), k);
          }
          // you, from behind
          var ps = S.person(Object.assign({}, GG.game.player.look, { dir: "back", frame: 0 }));
          spr(ctx, ps, Math.round(W * 0.12), Math.round(H * 0.62 - ps.h * k * 1.3), Math.round(k * 1.3));
          if (roar > 0) { ctx.fillStyle = "rgba(255,255,255," + (roar * 0.3) + ")"; ctx.fillRect(0, 0, W, H); }
        }
      });
      var turn = 0;
      function go() {
        var acts = L.actions;
        return GG.ui.choose(turn === 0 ? L.start + " " + L.prompt : L.prompt, acts.map(function (a) { return "▶ " + a.label; })).then(function (i) {
          var a = acts[i], gain = a.calm, lines = a.lines, vars = {};
          if (a.needs === "snack") {
            var idx = GG.save.findSnack();
            if (idx < 0) { gain = 0; lines = a.none; }
            else { var id = GG.save.removeAt(idx); vars.item = GG.data.items[id].name.toLowerCase(); }
          } else if (a.flopChance && R() < a.flopChance) { gain = 1; lines = a.flop; }
          if (last === a.id) gain = Math.floor(gain / 2);
          last = a.id; calm += gain; turn++;
          if (gain >= 2) { shake = 0.4; step += 1; }
          return GG.ui.say(lines, vars).then(function () {
            if (calm >= L.need) return "win";
            if (turn >= L.turns) { roar = 1.2; shake = 0.8; return "lose"; }
            return GG.ui.say(L.react[Math.min(L.react.length - 1, Math.floor(calm / 2))]).then(go);
          });
        });
      }
      go().then(function (v) { setTimeout(function () { end(); res(v); }, v === "lose" ? 700 : 200); });
    });
  };

  // ---------- A1.1: chalk ----------
  CL.chalk = function () {
    var COLS = ["#f4f0e8", "#6ab0e0", "#f0a0c0", "#f2dc70", "#90d080"];
    return new Promise(function (res) {
      var pad = null, ci = 1, last = null, cur = { x: 0, y: 0 }, held = {}, W0 = 0, H0 = 0, finished = false;
      GG.ui.caption("Draw with a finger or the mouse. Arrows draw too; Space swaps colour. Tap DONE to finish.", 6);
      function ensure(W, H) {
        if (pad && W0 === W && H0 === H) return;
        W0 = W; H0 = H; pad = document.createElement("canvas"); pad.width = W; pad.height = H;
        var p = pad.getContext("2d");
        p.fillStyle = "#a8a49c"; p.fillRect(0, 0, W, H);
        for (var i = 0; i < W * H / 14; i++) { p.fillStyle = (i % 3) ? "#9a968e" : "#b4b0a8"; p.fillRect((i * 7919) % W, (i * 104729) % H, 1, 1); }
        p.fillStyle = "#8a867e"; for (var x = Math.round(W / 3); x < W; x += Math.round(W / 3)) p.fillRect(x, 0, 1, H);
        cur.x = W / 2; cur.y = H / 2;
      }
      function dot(x, y) { var p = pad.getContext("2d"); p.fillStyle = COLS[ci]; p.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
      function stroke(x, y) {
        if (last) { var n = Math.ceil(Math.hypot(x - last.x, y - last.y)); for (var i = 0; i <= n; i++) dot(last.x + (x - last.x) * i / (n || 1), last.y + (y - last.y) * i / (n || 1)); }
        else dot(x, y);
        last = { x: x, y: y };
      }
      function ui(W, H) { var s = Math.max(8, Math.round(H * 0.07)); return { s: s, y: H - s - 3, x0: 4, done: { x: W - s * 3 - 4, w: s * 3 } }; }
      start({
        update: function (dt) {
          if (!pad) return;
          var dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
          if (dx || dy) { cur.x = U.clamp(cur.x + dx * 40 * dt, 0, W0 - 1); cur.y = U.clamp(cur.y + dy * 40 * dt, 0, H0 * 0.85); stroke(cur.x, cur.y); } else if (!held.mouse) last = null;
        },
        draw: function (ctx, W, H) {
          ensure(W, H); ctx.drawImage(pad, 0, 0);
          var u = ui(W, H);
          COLS.forEach(function (c, i) { ctx.fillStyle = "#2a2a30"; ctx.fillRect(u.x0 + i * (u.s + 3) - 1, u.y - 1, u.s + 2, u.s + 2); ctx.fillStyle = c; ctx.fillRect(u.x0 + i * (u.s + 3), u.y, u.s, u.s); if (i === ci) { ctx.fillStyle = "#c8402a"; ctx.fillRect(u.x0 + i * (u.s + 3), u.y - 3, u.s, 2); } });
          ctx.fillStyle = "#2a2a30"; ctx.fillRect(u.done.x, u.y, u.done.w, u.s); ctx.fillStyle = "#90d080";
          // a big check mark
          var gx = u.done.x + Math.round(u.done.w / 2) - 4, gy = u.y + Math.round(u.s / 2) - 2;
          [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0], [7, -1]].forEach(function (q) { ctx.fillRect(gx + q[0], gy + q[1], 2, 2); });
          if (held.kb) { ctx.fillStyle = COLS[ci]; ctx.fillRect(cur.x - 2, cur.y, 5, 1); ctx.fillRect(cur.x, cur.y - 2, 1, 5); }
        },
        key: function (k, down) {
          held[k] = down; if (down && /up|down|left|right/.test(k)) held.kb = true;
          if (down && k === "ok") ci = (ci + 1) % COLS.length;
          if (down && k === "esc") finish();
        },
        down: function (x, y) {
          var u = ui(W0, H0);
          if (y >= u.y - 2) {
            if (x >= u.done.x) { finish(); return; }
            var i = Math.floor((x - u.x0) / (u.s + 3)); if (i >= 0 && i < COLS.length) ci = i; return;
          }
          held.mouse = true; last = null; stroke(x, y);
        },
        move: function (x, y, b) { if (held.mouse && b) stroke(x, y); },
        up: function () { held.mouse = false; last = null; }
      });
      function finish() {
        if (finished) return; finished = true;
        GG.ui.choose("Nice work.", ["▶ Take a photo of it", "▶ Done"]).then(function (i) {
          if (i === 0) GG.game.photo();
          setTimeout(function () { end(); res(); }, i === 0 ? 400 : 0);
        });
      }
    });
  };

  // ---------- A1.1: lemonade ----------
  CL.lemonade = function () {
    return new Promise(function (res) {
      var t = 0, level = 0, pouring = false, cust = 0, phase = "walk", px = -0.3, result = null, good = 0;
      var looks = [{ shirt: "#5a8ab0", hair: "#e0dcd4", hat: "none", pack: "none" }, { shirt: "#c8402a", hair: "#2a2026", hat: "cap", cap: "#2a6aa8", pack: "none" }, { shirt: "#8a6aa8", hair: "#a87a4a", hat: "bun", pack: "none" }];
      GG.ui.caption("Hold to pour. Let go at the line.", 5);
      start({
        update: function (dt) {
          t += dt;
          if (phase === "walk") { px += dt * 0.5; if (px >= 0.3) { px = 0.3; phase = "pour"; level = 0; } }
          else if (phase === "pour" && pouring) { level += dt * 0.42; if (level > 1.08) { pouring = false; done(); } }
          else if (phase === "leave") { px += dt * 0.6; if (px > 1.3) { cust++; if (cust >= 3) { phase = "end"; finish(); } else { phase = "walk"; px = -0.3; } } }
        },
        draw: function (ctx, W, H) {
          back(ctx, W, H, 0.2);
          var k = Math.max(2, Math.round(H / 60)), st = S.stand("lemonade");
          var c = looks[cust % 3], ps = S.person(Object.assign({ pants: "#4a4a5a" }, c, { dir: phase === "walk" || phase === "leave" ? "side" : "front", frame: phase === "pour" ? 0 : Math.floor(t * 6) % 4 }));
          spr(ctx, ps, W * px - ps.w * k / 2, H * 0.62 - ps.h * k, k, false);
          spr(ctx, st, W / 2 - st.w * k / 2, H * 0.62 - st.h * k, k);
          // the cup, big, up front
          var cw = Math.round(H * 0.16), ch = Math.round(H * 0.24), cx = Math.round(W / 2 - cw / 2), cy = Math.round(H * 0.7);
          ctx.fillStyle = "#e8e4dc"; ctx.fillRect(cx - 2, cy, cw + 4, ch + 2);
          ctx.fillStyle = "#c8d8e0"; ctx.fillRect(cx, cy, cw, ch);
          var lv = Math.min(1, level);
          ctx.fillStyle = "#f2dc50"; ctx.fillRect(cx, cy + Math.round(ch * (1 - lv)), cw, Math.round(ch * lv));
          ctx.fillStyle = "#c8402a"; ctx.fillRect(cx - 4, cy + Math.round(ch * 0.2), cw + 8, 1);
          if (pouring) { ctx.fillStyle = "#f2dc50"; ctx.fillRect(W / 2 - 1, cy - H * 0.1, 3, H * 0.1 + ch * (1 - lv)); ctx.fillStyle = "#e8e4dc"; ctx.fillRect(W / 2 - 6, cy - H * 0.14, 14, H * 0.05); }
          if (level > 1.0) { ctx.fillStyle = "#f2dc50"; ctx.fillRect(cx - 4, cy + ch, cw + 8, 2); }
        },
        key: function (k, down) { if (k === "ok") { if (down) startPour(); else stopPour(); } },
        down: function () { startPour(); },
        up: function () { stopPour(); }
      });
      function startPour() { if (phase === "pour") pouring = true; }
      function stopPour() { if (phase === "pour" && pouring) { pouring = false; done(); } }
      function done() {
        phase = "said";
        var d = Math.abs(level - 0.8), line = level > 1 ? "Whoops! Lemonade everywhere. They drink it anyway." : d < 0.08 ? "Perfect. 'Ahh,' they say. 'That's the stuff.'" : level < 0.6 ? "A little light. 'Very... refreshing,' they say." : "Pretty close! They tip the kid a nickel.";
        if (d < 0.08) good++;
        GG.ui.caption(line, 2.6);
        setTimeout(function () { phase = "leave"; }, 1800);
      }
      function finish() { setTimeout(function () { end(); res(good); }, 300); }
    });
  };
})();
