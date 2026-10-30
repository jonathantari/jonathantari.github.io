// Nodes 0.2, 0.3 and 0.5 on the landing scene: the Easter egg, the player
// walking in from behind the camera, the first text box, and coming home.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr;
  var LP = { on: false, x: 0, y: 0, dir: "back", moving: false, dist: 0, target: null, res: null, busy: false };
  var C = GG.landingCtl = {};
  var keyBuf = [], swipes = [], sw = null;

  function L() { return window.GGLanding.get(); }
  function geom() {
    var l = L(), g = l.G;
    var u = Math.max(1, Math.round(g.gh * 0.62 / 24));
    return { l: l, g: g, u: u, cx: Math.round(g.gx + g.gw * 0.56), floor: g.gy + 3, bottom: l.H };
  }
  var dimCache = {};
  function dimmed(s, k) {
    var key = s.cv.width + "x" + s.cv.height + ":" + k + ":" + (s.id || (s.id = Math.random()));
    if (dimCache[key]) return dimCache[key];
    var c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    var x = c.getContext("2d"), img = x.createImageData(s.w, s.h);
    for (var i = 0; i < s.d.length; i += 4) { img.data[i] = s.d[i] * k; img.data[i + 1] = s.d[i + 1] * k; img.data[i + 2] = s.d[i + 2] * Math.min(1, k * 1.15); img.data[i + 3] = s.d[i + 3]; }
    x.putImageData(img, 0, 0);
    return (dimCache[key] = c);
  }

  function draw(ctx, t, dt) {
    if (!LP.on) return;
    var q = geom(), u = q.u;
    if (LP.target != null) {
      var d = LP.target - LP.y, st = 16 * u * dt;
      if (Math.abs(d) <= st) { LP.y = LP.target; LP.target = null; LP.moving = false; var r = LP.res; LP.res = null; if (r) r(); }
      else { LP.y += Math.sign(d) * st; LP.dist += st; LP.moving = true; }
    }
    LP.x = q.cx;
    var fr = LP.moving ? Math.floor(LP.dist / (2.6 * u)) % 4 : 0;
    var s = S.person(Object.assign({}, GG.game.player.look, { dir: LP.dir, frame: fr }));
    var k = q.l.night ? (q.l.S.bulb ? 0.78 : 0.55) : 1;
    // walking down the driveway, you get a touch bigger as you come toward the camera
    var grow = 1 + Math.max(0, (LP.y - q.floor) / (q.bottom - q.floor)) * 0.0;
    var w = s.w * u * grow, h = s.h * u * grow;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(Math.round(LP.x - w * 0.3), Math.round(LP.y) - u, Math.round(w * 0.6), u);
    ctx.drawImage(k < 1 ? dimmed(s, k) : s.cv, Math.round(LP.x - w / 2), Math.round(LP.y - h), Math.round(w), Math.round(h));
    if (GG.save.data.puppy && LP.dir === "front" && !LP.moving) {
      var ps = S.puppy(0, "front");
      ctx.drawImage(k < 1 ? dimmed(ps, k) : ps.cv, Math.round(LP.x + w * 0.55), Math.round(LP.y - ps.h * u), ps.w * u, ps.h * u);
    }
    // the punted ball's star, at night
    if (q.l.night && GG.save.data.ballOrbit) {
      var a = 0.55 + 0.45 * Math.sin(t * 2.2), sx = Math.round(q.l.W * 0.7), sy = Math.round(Math.max(6, q.g.mTop * 0.5));
      ctx.fillStyle = "rgba(255,226,160," + a + ")"; ctx.fillRect(sx, sy, 1, 1);
      if (a > 0.7) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); }
    }
  }
  function walk(y) { return new Promise(function (res) { LP.target = y; LP.res = res; }); }
  function hit(x, y) {
    if (!LP.on || LP.busy) return false;
    var q = geom(), w = 14 * q.u, h = 24 * q.u;
    if (x > LP.x - w / 2 - 4 && x < LP.x + w / 2 + 4 && y > LP.y - h - 4 && y < LP.y + 4) { ready(false); return true; }
    return false;
  }

  function enter() {
    var q = geom();
    LP.on = true; LP.busy = true; LP.dir = "back"; LP.y = q.bottom + 26 * q.u; LP.dist = 0;
    GG.ui.setHud(true);
    return walk(q.floor).then(function () { return U.wait(0.35); }).then(function () { LP.dir = "front"; return U.wait(0.4); })
      .then(function () { var first = !GG.save.data.seenIntro; GG.save.data.seenIntro = true; GG.save.write(); return ready(first); });
  }
  function ready(first) {
    var R = GG.data.world.ready;
    LP.busy = true;
    var lines = first ? R.first : R.again;
    return GG.ui.say(lines).then(function () { return GG.ui.choose(null, R.choices); }).then(function (i) {
      if (i === 0) return leave();
      LP.busy = false;
    });
  }
  function leave() {
    var q = geom();
    LP.dir = "front";
    return walk(q.floor + (q.bottom - q.floor) * 0.45).then(function () { return GG.ui.fadeTo(true, 0.5); }).then(function () {
      LP.on = false; LP.busy = false;
      GG.game.enterWorld("street", { mode: "out", reroll: true, spawn: { x: -9.4, z: 2.8, h: Math.PI / 2 } });
    });
  }
  C.arrive = function () {
    var q = geom(), H = GG.data.world.home;
    LP.on = true; LP.busy = true; LP.dir = "back"; LP.y = q.bottom + 26 * q.u;
    GG.ui.setHud(true);
    return U.wait(0.5).then(function () { return walk(q.floor); }).then(function () { LP.dir = "front"; return U.wait(0.4); })
      .then(function () { var a = [U.pick(Math.random, H.arrive)]; if (GG.save.data.puppy) a = a.concat(H.puppy); return GG.ui.say(a); })
      .then(function () { return ready(false); });
  };

  C.egg = function () { if (LP.on || GG.game.mode() !== "landing") return; enter(); };
  C.pause = function (p) { window.GGLanding.paused = p; };
  C.key = function (k) {
    if (GG.ui.key(k)) return true;
    if (!LP.on) return false;
    if (k === "ok" && !LP.busy) { ready(false); return true; }
    if (k === "pack") { GG.game.togglePack(); return true; }
    if (k === "photo") { GG.game.photo(); return true; }
    return false;
  };
  C.init = function () {
    var H = window.GGLanding;
    H.draw = draw;
    H.click = function (x, y) { return hit(x, y); };
    // 0.2 on desktop: up, up, down, down (or type "play")
    window.addEventListener("keydown", function (e) {
      if (GG.game.mode() !== "landing" || LP.on) return;
      keyBuf.push((e.key || "").toLowerCase()); if (keyBuf.length > 6) keyBuf.shift();
      var s = keyBuf.join(",");
      if (/arrowup,arrowup,arrowdown,arrowdown$/.test(s) || /p,l,a,y$/.test(s)) { keyBuf = []; C.egg(); }
    });
    // 0.2 on mobile: two quick upward swipes on the scene
    var c = document.getElementById("c");
    c.addEventListener("pointerdown", function (e) { sw = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    c.addEventListener("pointerup", function (e) {
      if (!sw || LP.on) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = performance.now() - sw.t; sw = null;
      if (dy < -40 && Math.abs(dx) < Math.abs(dy) && dt < 800) {
        var now = performance.now(); swipes = swipes.filter(function (t) { return now - t < 1600; }); swipes.push(now);
        if (swipes.length >= 2) { swipes = []; C.egg(); }
      }
    });
  };
})();
