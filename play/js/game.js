// The game: input, the player and chase camera, scene loading, the frame loop,
// and the hand-off between the 2D landing scene and the 3D world.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr, UI;
  var G = GG.game = {};
  var cv, r3, ctx, W = 0, H = 0;
  var mode = "landing"; // landing | world | close
  var keys = {}, stick = { on: false, x: 0, y: 0, ox: 0, oy: 0, id: null, t0: 0, moved: false };
  var lock = 0, tasks = [];
  var player = { x: 0, z: 0, heading: 0, dist: 0, moving: false, speed: 3.6, look: null, carry: null, hidden: false };
  var cam = { x: 0, y: 3, z: 0, yaw: 0, pitch: 0.24 };
  var camCfg = { dist: 5, height: 3.6, pitch: 0.235, look: 0 };
  var camAnim = null, camFixed = null, camFollow = true;
  var scene = null, items = [], E = null, envR = null, pup = null;
  var weather = [], lastNow = 0, T = 0;
  G.player = player; G.cam = cam;
  GG.reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var LOOK = { cap: "#c8473f", hair: "#5a3a24", skin: "#e0aa86", shirt: "#3f8f86", pants: "#34405e", shoes: "#4a3428", pack: "#d9a441", hat: "cap" };
  player.look = LOOK;

  // ---------- setup ----------
  G.init = function () {
    UI = GG.ui;
    cv = document.getElementById("g"); r3 = new GG.R3(cv); ctx = r3.ctx;
    GG.save.load();
    UI.init();
    resize();
    window.addEventListener("resize", function () { clearTimeout(G._rt); G._rt = setTimeout(resize, 120); });
    bindInput();
    GG.landingCtl.init();
    var q = location.search, m = /[?&]scene=(\w+)/.exec(q);
    if (m) {
      var k = m[1], sp = { street: { x: 0, z: 6, h: 0 }, trail: { x: 0, z: 1, h: 0 }, summit: { x: 0, z: 18, h: 0 }, tiny: { x: 1, z: -3, h: 0 } }[k];
      G.enterWorld(k, k === "block" ? function () { return GG.events.blockOpt(0); } : { mode: "street", spawn: sp });
      return;
    }
    if (/[?&]play/.test(q)) setTimeout(function () { GG.landingCtl.egg(); }, 400);
  };
  function resize() {
    var dpr = window.devicePixelRatio || 1, vw = window.innerWidth, vh = window.innerHeight;
    var P = Math.max(2, Math.floor(Math.min(vw * dpr / 200, vh * dpr / 190)));
    W = Math.ceil(vw * dpr / P); H = Math.ceil(vh * dpr / P);
    r3.resize(W, H);
    cv.style.width = (W * P / dpr) + "px"; cv.style.height = (H * P / dpr) + "px";
    var tall = H / W;
    // frame the chase camera so the player stands low with plenty of street ahead
    if (tall > 1.25) { r3.f = Math.max(W * 1.05, H * 0.6); camCfg = { dist: 6.2, height: 4.7, pitch: 0.4 }; r3.cy0 = Math.round(H * 0.47); }
    else { r3.f = Math.min(H * 0.95, W * 0.95); camCfg = { dist: 5.0, height: 3.6, pitch: 0.235 }; r3.cy0 = Math.round(H * 0.5); }
    G.W = W; G.H = H; G.P = P;
    initWeather();
  }

  // ---------- input ----------
  var KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    Space: "ok", Enter: "ok", KeyE: "ok", KeyZ: "ok", KeyB: "pack", KeyI: "pack", Tab: "pack", KeyP: "photo", KeyC: "photo", Escape: "esc" };
  function bindInput() {
    window.addEventListener("keydown", function (e) {
      var k = KEYMAP[e.code]; if (!k) return;
      GG.sfx && GG.sfx.unlock();
      if (mode === "landing") { if (GG.landingCtl.key(k, e)) e.preventDefault(); return; }
      e.preventDefault();
      if (e.repeat && (k === "ok" || k === "pack" || k === "photo")) return;
      if (UI.key(k)) { return; }
      if (mode === "close" && G.close && G.close.key) { G.close.key(k, true); return; }
      if (k === "ok") interact();
      else if (k === "pack") G.togglePack();
      else if (k === "photo") G.photo();
      else keys[k] = true;
    });
    window.addEventListener("keyup", function (e) {
      var k = KEYMAP[e.code]; if (!k) return;
      keys[k] = false;
      if (mode === "close" && G.close && G.close.key) G.close.key(k, false);
    });
    window.addEventListener("blur", function () { keys = {}; stick.on = false; });
    cv.addEventListener("pointerdown", function (e) {
      GG.sfx && GG.sfx.unlock();
      e.preventDefault();
      if (UI.boxOpen()) { UI.advance(); return; }
      var p = toLow(e);
      if (mode === "close") { if (G.close && G.close.down) G.close.down(p[0], p[1]); return; }
      stick.on = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; stick.t0 = performance.now(); stick.moved = false;
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      showStick(true, e.clientX, e.clientY, 0, 0);
    });
    cv.addEventListener("pointermove", function (e) {
      if (mode === "close") { if (G.close && G.close.move) { var p = toLow(e); G.close.move(p[0], p[1], e.buttons); } return; }
      if (!stick.on || e.pointerId !== stick.id) return;
      var dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, R = 44, l = Math.hypot(dx, dy);
      if (l > 8) stick.moved = true;
      if (l > R) { dx *= R / l; dy *= R / l; }
      stick.x = dx / R; stick.y = -dy / R;
      showStick(true, stick.ox, stick.oy, dx, dy);
    });
    function up(e) {
      if (mode === "close") { if (G.close && G.close.up) G.close.up(); return; }
      if (!stick.on || e.pointerId !== stick.id) return;
      var tap = !stick.moved && performance.now() - stick.t0 < 300;
      stick.on = false; stick.x = stick.y = 0; showStick(false);
      if (tap) interact();
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  function toLow(e) { var rc = cv.getBoundingClientRect(); return [(e.clientX - rc.left) / rc.width * W, (e.clientY - rc.top) / rc.height * H]; }
  var stickEl;
  function showStick(on, x, y, dx, dy) {
    stickEl = stickEl || document.getElementById("stick");
    stickEl.hidden = !on;
    if (!on) return;
    stickEl.style.left = x + "px"; stickEl.style.top = y + "px";
    stickEl.firstElementChild.style.transform = "translate(" + dx + "px," + dy + "px)";
  }
  function moveInput() {
    var x = 0, y = 0;
    if (keys.up) y += 1; if (keys.down) y -= 1; if (keys.left) x -= 1; if (keys.right) x += 1;
    if (stick.on && (stick.x || stick.y)) { x = stick.x; y = stick.y; }
    var l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; l = 1; }
    return [x, y, l];
  }

  // ---------- locks and scripted beats ----------
  G.lock = function () { lock++; };
  G.unlock = function () { lock = Math.max(0, lock - 1); };
  G.locked = function () { return lock > 0; };
  // run an async beat with the player's controls held
  G.beat = function (fn) {
    lock++;
    return Promise.resolve().then(fn).catch(function (e) { console.error(e); }).then(function (v) { lock = Math.max(0, lock - 1); return v; });
  };
  function task(fn) { return new Promise(function (res) { tasks.push({ fn: fn, res: res }); }); }
  G.wait = function (s) { var t = 0; return task(function (dt) { t += dt; return t >= s; }); };
  G.walkTo = function (x, z, speed) {
    speed = speed || player.speed * 0.8;
    return task(function (dt) {
      var dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { player.moving = false; return true; }
      var want = Math.atan2(dx, dz);
      player.heading = turnToward(player.heading, want, 9 * dt);
      var st = Math.min(d, speed * dt);
      player.x += dx / d * st; player.z += dz / d * st; player.dist += st; player.moving = true;
      return false;
    });
  };
  G.turnTo = function (h, secs) {
    var t = 0, h0 = player.heading, dh = U.wrapA(h - h0); secs = secs || 0.4;
    return task(function (dt) { t += dt; var k = Math.min(1, t / secs); player.heading = h0 + dh * k; return k >= 1; });
  };
  function turnToward(a, b, max) { var d = U.wrapA(b - a); return a + U.clamp(d, -max, max); }
  function followPose(yaw) {
    var p = player;
    return { x: p.x - Math.sin(yaw) * camCfg.dist, y: camCfg.height, z: p.z - Math.cos(yaw) * camCfg.dist, yaw: yaw, pitch: camCfg.pitch };
  }
  // fly the camera from wherever it is to a pose (or back to following) over secs
  G.camTo = function (pose, secs) {
    var from = { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch };
    camFixed = null;
    return new Promise(function (res) { camAnim = { from: from, to: pose, t: 0, dur: secs || 1.5, res: res }; });
  };
  G.camFollowYaw = function (yaw) { return function () { return followPose(yaw); }; };
  G.setCam = function (pose) { camFixed = pose; camAnim = null; };
  G.releaseCam = function () { camFixed = null; camAnim = null; camFollow = true; };

  // ---------- scenes ----------
  G.enterWorld = function (kind, opt) {
    opt = opt || {};
    GG.landingCtl.pause(true);
    document.getElementById("c").hidden = true;
    var crate = document.getElementById("crate"); if (crate) crate.hidden = true;
    cv.hidden = false;
    if (!E || (opt && opt.reroll)) E = GG.env.roll(U.rng((Date.now() / 1000) | 0));
    G.E = E;
    if (typeof opt === "function") opt = opt();
    mode = "world";
    UI.setHud(true);
    G.load(kind, opt);
    lastNow = performance.now();
    if (!G._raf) G._raf = requestAnimationFrame(loop);
  };
  G.load = function (kind, opt) {
    opt = opt || {};
    var b = GG.scenes[kind] || GG.scenes.street;
    scene = b(E, GG.save, opt);
    scene.opt = opt;
    envR = GG.env.render(E, kind === "block" ? "street" : kind, { north: opt.north || 0 });
    scene.envR = envR;
    items = scene.meshes.map(function (m) { return { k: "mesh", m: m }; }).concat(scene.props, scene.lines);
    scene.glows.forEach(function (g) { items.push({ k: "pt", x: g.x, y: g.y, z: g.z, s: 0.35, c: [255, 236, 170], glow: true }); });
    scene.actors = scene.actors.map(function (a) { return GG.actors.wrap(a, scene); });
    scene.lights.forEach(function (L) { L.r2 = L.r * L.r; });
    player.carry = null; player.hidden = false; player.moving = false;
    tasks = []; camAnim = null; camFixed = null;
    var sp = opt.spawn || { x: 0, z: 0, h: 0 };
    player.x = sp.x; player.z = sp.z; player.heading = sp.h || 0;
    var pose = followPose(player.heading); cam.x = pose.x; cam.y = pose.y; cam.z = pose.z; cam.yaw = pose.yaw; cam.pitch = pose.pitch;
    pup = GG.save.data.puppy && kind !== "tiny" ? GG.actors.puppy(player) : null;
    G.scene = scene;
    GG.events.setup(kind, scene, opt);
  };
  G.addActor = function (a) { a = GG.actors.wrap(a, scene); scene.actors.push(a); return a; };
  G.removeActor = function (a) { var i = scene.actors.indexOf(a); if (i >= 0) scene.actors.splice(i, 1); };
  G.trigger = function (t) { scene.triggers.push(t); return t; };

  // to the landing page, walking up the driveway
  G.goHome = function () {
    return UI.fadeTo(true, 0.6).then(function () {
      mode = "landing"; cv.hidden = true; UI.setHud(false);
      scene = null; tasks = [];
      document.getElementById("c").hidden = false;
      var crate = document.getElementById("crate"); if (crate) crate.hidden = false;
      GG.save.data.outings++; GG.save.write();
      E = null;
      GG.landingCtl.pause(false);
      GG.landingCtl.arrive();
      return UI.fadeTo(false, 0.6);
    });
  };
  // swap scenes behind a fade
  G.swap = function (kind, opt) {
    return UI.fadeTo(true, 0.5).then(function () { G.load(kind, opt); return UI.fadeTo(false, 0.5); });
  };

  // ---------- interaction ----------
  function interact() {
    if (mode !== "world" || lock || UI.isOpen()) return;
    var best = null, bd = 2.4;
    scene.actors.forEach(function (a) {
      if (!a.talk) return;
      var d = Math.hypot(a.x - player.x, a.z - player.z);
      if (d < bd) { bd = d; best = a; }
    });
    if (best) G.beat(function () { return best.talk(); });
    else if (scene.onInteract) G.beat(GG.events.interact);
  }
  G.setPup = function () { pup = GG.actors.puppy(player); };
  G.togglePack = function () {
    if (UI.boxOpen()) return;
    var p = document.getElementById("pack");
    if (!p.hidden) { UI.closePack(); return; }
    lock++;
    UI.openPack("items").then(function () { lock = Math.max(0, lock - 1); });
  };
  G.photo = function () {
    if (UI.boxOpen()) return;
    var src;
    try {
      var c = mode === "landing" ? document.getElementById("c") : cv;
      var k = Math.min(1, 200 / c.width), o = document.createElement("canvas");
      o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
      var ox = o.getContext("2d"); ox.imageSmoothingEnabled = false; ox.drawImage(c, 0, 0, o.width, o.height);
      src = o.toDataURL("image/png");
    } catch (e) { return; }
    UI.flash(); GG.sfx && GG.sfx.shutter();
    if (GG.save.addPhoto(src)) UI.caption(GG.data.world.ui.photo, 2.5);
  };
  // add to the backpack, handling a full pack (C3)
  G.give = function (id, line) {
    var it = GG.data.items[id]; if (!it) return Promise.resolve(false);
    if (GG.save.add(id)) { GG.sfx && GG.sfx.get(); return UI.say(line || U.fmt(GG.data.trail.got, { item: it.name })).then(function () { return true; }); }
    return GG.events.fullPack(id);
  };

  // ---------- frame ----------
  function loop(now) {
    G._raf = requestAnimationFrame(loop);
    if (mode === "landing") { lastNow = now; return; }
    var dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; T += dt;
    if (mode === "close" && G.close) { var c = G.close; if (c.update) c.update(dt, T); if (G.close === c) c.draw(ctx, W, H, T); return; }
    update(dt);
    render(T, dt);
  }
  G.setMode = function (m) { mode = m; if (m !== "world") { stick.on = false; showStick(false); keys = {}; } UI.setHud(m === "world"); };
  G.mode = function () { return mode; };

  function update(dt) {
    // scripted tasks
    for (var i = tasks.length - 1; i >= 0; i--) if (tasks[i].fn(dt)) { var t = tasks.splice(i, 1)[0]; t.res(); }
    player.moving = player.moving && tasks.length > 0;
    var mv = moveInput();
    if (!lock && !UI.isOpen() && mv[2] > 0.05) {
      var want = cam.yaw + Math.atan2(mv[0], mv[1]);
      player.heading = turnToward(player.heading, want, 7 * dt);
      var sp = player.speed * mv[2] * dt, nx = player.x + Math.sin(player.heading) * sp, nz = player.z + Math.cos(player.heading) * sp;
      var res = collide(nx, nz);
      var moved = Math.hypot(res[0] - player.x, res[1] - player.z);
      player.x = res[0]; player.z = res[1]; player.dist += moved; player.moving = moved > 0.001;
    } else if (!tasks.length) player.moving = false;
    // the world
    scene.actors.forEach(function (a) { a.update && a.update(dt, T); });
    if (pup) pup.update(dt, T);
    if (scene.update) scene.update(dt, T);
    if (!lock && !UI.isOpen()) {
      for (var j = 0; j < scene.triggers.length; j++) {
        var tr = scene.triggers[j];
        if (tr.done) { if (tr.rearm && !tr.test(player)) tr.done = false; continue; }
        if (tr.test(player)) { tr.done = true; G.beat(tr.fn); break; }
      }
    }
    updateCam(dt, mv);
  }
  function collide(x, z) {
    var R = 0.35, sc = scene;
    if (!sc.walk(x, z)) { if (sc.walk(x, player.z)) z = player.z; else if (sc.walk(player.x, z)) x = player.x; else return [player.x, player.z]; }
    for (var i = 0; i < sc.solids.length; i++) {
      var s = sc.solids[i];
      if (x > s[0] - R && x < s[1] + R && z > s[2] - R && z < s[3] + R) {
        var px = player.x, pz = player.z;
        if (!(px > s[0] - R && px < s[1] + R)) x = px; else if (!(pz > s[2] - R && pz < s[3] + R)) z = pz; else return [px, pz];
      }
    }
    var posts = sc.posts.concat(sc.actors.filter(function (a) { return a.solidR; }).map(function (a) { return { x: a.x, z: a.z, r: a.solidR }; }));
    for (var j = 0; j < posts.length; j++) {
      var p = posts[j], dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), m = p.r + R;
      if (d < m && d > 1e-4) { x = p.x + dx / d * m; z = p.z + dz / d * m; }
    }
    if (!sc.walk(x, z)) return [player.x, player.z];
    return [x, z];
  }
  function updateCam(dt, mv) {
    if (camFixed) { Object.assign(cam, typeof camFixed === "function" ? camFixed() : camFixed); return; }
    if (camAnim) {
      var a = camAnim; a.t += dt;
      var k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k), to = typeof a.to === "function" ? a.to() : a.to;
      cam.x = U.lerp(a.from.x, to.x, e); cam.y = U.lerp(a.from.y, to.y, e); cam.z = U.lerp(a.from.z, to.z, e);
      cam.yaw = a.from.yaw + U.wrapA(to.yaw - a.from.yaw) * e; cam.pitch = U.lerp(a.from.pitch, to.pitch, e);
      if (k >= 1) { camAnim = null; a.res(); }
      return;
    }
    // swing round behind the player while they walk; don't flip when they walk toward the camera
    var rel = U.wrapA(player.heading - cam.yaw);
    if (player.moving && Math.abs(rel) < 2.3) cam.yaw += rel * Math.min(1, dt * 1.7);
    var p = followPose(cam.yaw);
    // keep the camera out of houses: pull it in toward the player
    for (var n = 0; n < 8 && insideSolid(p.x, p.z); n++) { var f = 1 - (n + 1) / 9; p.x = player.x - Math.sin(cam.yaw) * camCfg.dist * f; p.z = player.z - Math.cos(cam.yaw) * camCfg.dist * f; }
    var s = Math.min(1, dt * 8);
    cam.x += (p.x - cam.x) * s; cam.z += (p.z - cam.z) * s; cam.y += (p.y - cam.y) * s; cam.pitch += (p.pitch - cam.pitch) * s;
  }
  function insideSolid(x, z) { return scene.solids.some(function (s) { return x > s[0] - 0.3 && x < s[1] + 0.3 && z > s[2] - 0.3 && z < s[3] + 0.3; }); }
  G.followPose = followPose;

  // which way a figure faces relative to the camera
  G.facing = function (heading) {
    var rel = U.wrapA(heading - cam.yaw);
    if (Math.abs(rel) < 0.75) return { dir: "back", flip: false };
    if (Math.abs(rel) > 2.4) return { dir: "front", flip: false };
    return { dir: "side", flip: rel < 0 };
  };
  function playerItem() {
    var f = G.facing(player.heading), fr = player.moving ? (Math.floor(player.dist / 0.42) % 4) : 0;
    var spr = S.person(Object.assign({}, player.look, { dir: f.dir, frame: fr }));
    return { k: "spr", spr: spr, x: player.x, z: player.z, y: 0, h: 1.8, flip: f.flip, int: true, shadow: true };
  }

  // ---------- rendering ----------
  var LT = [];
  function render(t, dt) {
    r3.setCam(cam);
    // nearby lights only
    LT.length = 0;
    if (E.tod !== "day") {
      for (var i = 0; i < scene.lights.length; i++) { var L = scene.lights[i]; if (Math.abs(L.x - cam.x) + Math.abs(L.z - cam.z) < 70) LT.push(L); }
      if (scene.kind === "trail" || scene.kind === "summit") {
        var hl = { x: player.x + Math.sin(player.heading) * 2.6, z: player.z + Math.cos(player.heading) * 2.6, r: 6.5, i: 1.0, c: [1, 0.95, 0.8] };
        hl.r2 = hl.r * hl.r; LT.push(hl);
      }
    }
    r3.lights = LT;
    r3.begin(envR);
    r3.drawSky(t);
    r3.drawGround(scene);
    var list = items.slice();
    scene.actors.forEach(function (a) { if (a.draw) a.draw(list, t); });
    if (pup) pup.draw(list, t);
    if (!player.hidden) {
      var pi = playerItem(); list.push(pi);
      if (player.carry) list.push({ k: "spr", spr: player.carry, x: player.x, z: player.z, y: 1.65, h: 0.9, int: false, bias: -0.05 });
    }
    scene.particles.forEach(function (p) { list.push(p); });
    r3.drawList(list);
    drawWeather(dt, t);
    if (G.overlay) G.overlay(r3, t);
    r3.present();
  }

  // ---------- weather ----------
  function initWeather() {
    weather = [];
    var n = Math.round(W * H / 260), r = Math.random;
    for (var i = 0; i < n; i++) weather.push({ x: r() * W, y: r() * H, v: 0.6 + r() * 0.8, p: r() * 6.28 });
  }
  function drawWeather(dt, t) {
    var we = E.weather, u = r3.u32;
    if (we !== "rain" && we !== "snow" && we !== "wind") return;
    if (scene.kind === "tiny" && we !== "rain") return;
    var night = E.tod === "night";
    var rc = night ? U.pack(110, 120, 160) : U.pack(200, 210, 224), sc2 = U.pack(246, 248, 252), lc = [U.pack(208, 120, 42), U.pack(224, 168, 56), U.pack(120, 150, 70)];
    var turn = 0;
    if (G._lastYaw != null) turn = U.wrapA(cam.yaw - G._lastYaw) * r3.f; G._lastYaw = cam.yaw;
    for (var i = 0; i < weather.length; i++) {
      var d = weather[i];
      if (we === "rain") {
        if (i % 2) continue;
        d.y += d.v * 180 * dt; d.x -= d.v * 40 * dt + turn;
        for (var k = 0; k < 4; k++) { var x = (d.x + k * 0.25) | 0, y = (d.y - k) | 0; if (x >= 0 && y >= 0 && x < W && y < H) u[y * W + x] = rc; }
      } else if (we === "snow") {
        d.y += d.v * 22 * dt; d.x += Math.sin(t * 0.8 + d.p) * 6 * dt - turn;
        var x2 = d.x | 0, y2 = d.y | 0; if (x2 >= 0 && y2 >= 0 && x2 < W && y2 < H) { u[y2 * W + x2] = sc2; if (d.v > 1.1 && x2 + 1 < W) u[y2 * W + x2 + 1] = sc2; }
      } else if (we === "wind") {
        if (i % 9) continue;
        d.x += (60 + d.v * 70) * dt - turn; d.y += Math.sin(t * 2 + d.p) * 14 * dt + 6 * dt;
        var x3 = d.x | 0, y3 = d.y | 0; if (x3 >= 0 && y3 >= 0 && x3 < W - 1 && y3 < H) { var c = E.season === "autumn" ? lc[i % 2] : lc[2]; u[y3 * W + x3] = c; u[y3 * W + x3 + 1] = c; }
      }
      if (d.y > H) { d.y -= H; d.x = Math.random() * W; }
      if (d.x < 0) d.x += W; if (d.x > W) d.x -= W;
    }
  }

  G.r3 = function () { return r3; };
  G.canvas = function () { return cv; };
  G.size = function () { return [W, H]; };
})();
