// The game: input, the player and chase camera, scene loading, the frame loop,
// and the hand-off between the 2D landing scene and the 3D world.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr, UI;
  var G = GG.game = {};
  var cv, r3, ctx, W = 0, H = 0;
  var mode = "landing"; // landing | world | close

  var lock = 0, tasks = [];
  var player = { x: 0, z: 0, y: 0, heading: 0, dist: 0, moving: false, speed: 3.1, look: null, carry: null, hidden: false, lane: 0, l: 0, walking: true };
  var wasLocked = false;
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
    // close and low behind the player, looking down the track over their head
    if (tall > 1.25) { r3.f = Math.max(W * 1.2, H * 0.66); camCfg = { dist: 4.3, height: 3.1, pitch: 0.36 }; r3.cy0 = Math.round(H * 0.46); }
    else { r3.f = Math.min(H * 1.05, W * 1.0); camCfg = { dist: 3.7, height: 2.75, pitch: 0.22 }; r3.cy0 = Math.round(H * 0.5); }
    G.W = W; G.H = H; G.P = P;
    initWeather();
  }

  // ---------- input ----------
  var KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    Space: "ok", Enter: "ok", KeyE: "ok", KeyZ: "ok", KeyB: "pack", KeyI: "pack", Tab: "pack", KeyP: "photo", KeyC: "photo", Escape: "esc" };
  // on the track: walk forward on your own; swipe or press left/right to change lanes,
  // down to stop, up to walk; tap to talk (or to stop and start)
  function bindInput() {
    window.addEventListener("keydown", function (e) {
      var k = KEYMAP[e.code]; if (!k) return;
      if (mode === "landing") { if (GG.landingCtl.key(k, e)) e.preventDefault(); return; }
      GG.sfx && GG.sfx.unlock();
      e.preventDefault();
      if (e.repeat) return;
      if (UI.key(k)) { return; }
      if (mode === "close" && G.close && G.close.key) { G.close.key(k, true); return; }
      if (k === "ok") interact();
      else if (k === "pack") G.togglePack();
      else if (k === "photo") G.photo();
      else steer(k);
    });
    window.addEventListener("keyup", function (e) {
      var k = KEYMAP[e.code]; if (!k) return;
      if (mode === "close" && G.close && G.close.key) G.close.key(k, false);
    });
    var sw = null;
    cv.addEventListener("pointerdown", function (e) {
      GG.sfx && GG.sfx.unlock();
      e.preventDefault();
      if (UI.boxOpen()) { UI.advance(); return; }
      var p = toLow(e);
      if (mode === "close") { if (G.close && G.close.down) G.close.down(p[0], p[1]); return; }
      sw = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    cv.addEventListener("pointermove", function (e) {
      if (mode === "close") { if (G.close && G.close.move) { var p = toLow(e); G.close.move(p[0], p[1], e.buttons); } return; }
      if (!sw || e.pointerId !== sw.id) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 36) { steer(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down")); sw = null; }
    });
    function up(e) {
      if (mode === "close") { if (G.close && G.close.up) G.close.up(); return; }
      if (!sw || e.pointerId !== sw.id) return;
      var tap = performance.now() - sw.t < 350; sw = null;
      if (tap) interact();
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  function toLow(e) { var rc = cv.getBoundingClientRect(); return [(e.clientX - rc.left) / rc.width * W, (e.clientY - rc.top) / rc.height * H]; }
  function steer(k) {
    if (mode !== "world" || lock || UI.isOpen() || !scene || scene.free) return;
    var n = scene.lanes || 1;
    if (k === "left") player.lane = Math.max(-n, player.lane - 1);
    else if (k === "right") player.lane = Math.min(n, player.lane + 1);
    else if (k === "up") player.walking = true;
    else if (k === "down") player.walking = false;
    GG.sfx && GG.sfx.tick();
  }
  // the track: scene.trackX(z) is its centre line, scene.dir which way is forward
  function trackX(z) { return scene.trackX ? scene.trackX(z) : 0; }
  function trackYaw(z) { return Math.atan2(trackX(z + 0.5) - trackX(z - 0.5), 1); } // slope of the centre line, ignoring direction
  function groundY(x, z) { return scene && scene.height ? scene.height(x, z) : 0; }
  // after a scripted beat, pick the track back up from wherever the player ended
  function syncTrack() {
    var d = scene.dir || 1, l = (player.x - trackX(player.z)) * d, w = scene.laneW || 1.2, n = scene.lanes || 1;
    player.l = l; player.lane = U.clamp(Math.round(l / w), -n, n);
  }
  G.syncTrack = function () { syncTrack(); };

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
    var p = player, cx = p.x - Math.sin(yaw) * camCfg.dist, cz = p.z - Math.cos(yaw) * camCfg.dist;
    // on hills, ride a little above whichever is higher, you or the ground under the camera, and tilt with the slope
    var py = groundY(p.x, p.z), gy = Math.max(py, groundY(cx, cz)), ahead = groundY(p.x + Math.sin(yaw) * 6, p.z + Math.cos(yaw) * 6);
    return { x: cx, y: Math.max(py + camCfg.height, gy + 1.4), z: cz, yaw: yaw, pitch: camCfg.pitch - U.clamp((ahead - py) / 6, -0.25, 0.3) * 0.7 };
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
    player.carry = null; player.hidden = false; player.moving = false; player.walking = !opt.still;
    tasks = []; camAnim = null; camFixed = null;
    var sp = opt.spawn || { x: 0, z: 0, h: 0 };
    player.x = sp.x; player.z = sp.z; player.heading = sp.h != null ? sp.h : ((scene.dir || 1) < 0 ? Math.PI : 0);
    syncTrack();
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
    else if (!scene.free) { player.walking = !player.walking; GG.sfx && GG.sfx.tick(); }
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
  G.setMode = function (m) { mode = m; UI.setHud(m === "world"); };
  G.mode = function () { return mode; };

  function update(dt) {
    // scripted tasks
    for (var i = tasks.length - 1; i >= 0; i--) if (tasks[i].fn(dt)) { var t = tasks.splice(i, 1)[0]; t.res(); }
    player.moving = player.moving && tasks.length > 0;
    var free = !lock && !UI.isOpen();
    if (free && wasLocked) syncTrack();
    wasLocked = !free;
    if (free && !scene.free) {
      var d = scene.dir || 1, yaw = trackYaw(player.z), w = scene.laneW || 1.2;
      player.l += (player.lane * w - player.l) * Math.min(1, dt * 7);
      var nz = player.z;
      if (player.walking) {
        var slope = scene.height ? (groundY(player.x, player.z + d) - groundY(player.x, player.z)) : 0;
        var sp = player.speed * dt * Math.cos(yaw) / (1 + Math.max(0, slope) * 0.6);
        nz = player.z + d * sp;
        if (scene.zMax != null && nz > scene.zMax) { nz = scene.zMax; player.walking = false; }
        if (scene.zMin != null && nz < scene.zMin) { nz = scene.zMin; player.walking = false; }
        var why = scene.blocked && scene.blocked(trackX(nz) + player.l * d, nz);
        if (why) { nz = player.z; player.walking = false; if (typeof why === "string") UI.caption(why, 3.5); }
      }
      var nx = trackX(nz) + player.l * d, mv = Math.hypot(nx - player.x, nz - player.z);
      player.dist += mv; player.moving = player.walking && mv > 0.0005;
      player.x = nx; player.z = nz;
      player.heading = yaw + (d < 0 ? Math.PI : 0) + U.clamp((player.lane * w - player.l) * 0.5, -0.6, 0.6) * d;
    }
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
    updateCam(dt);
  }
  function updateCam(dt) {
    if (camFixed) { Object.assign(cam, typeof camFixed === "function" ? camFixed() : camFixed); return; }
    if (camAnim) {
      var a = camAnim; a.t += dt;
      var k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k), to = typeof a.to === "function" ? a.to() : a.to;
      cam.x = U.lerp(a.from.x, to.x, e); cam.y = U.lerp(a.from.y, to.y, e); cam.z = U.lerp(a.from.z, to.z, e);
      cam.yaw = a.from.yaw + U.wrapA(to.yaw - a.from.yaw) * e; cam.pitch = U.lerp(a.from.pitch, to.pitch, e);
      if (k >= 1) { camAnim = null; a.res(); }
      return;
    }
    // sit behind the player, looking down the track (round its bends)
    var want = scene.free ? player.heading : trackYaw(player.z + (scene.dir || 1) * 2) + ((scene.dir || 1) < 0 ? Math.PI : 0);
    cam.yaw += U.wrapA(want - cam.yaw) * Math.min(1, dt * 2.5);
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
    return { k: "spr", spr: spr, x: player.x, z: player.z, y: 0, h: 1.8, flip: f.flip, int: true, shadow: true, bias: -0.3 };
  }

  // ---------- rendering ----------
  var LT = [];
  function render(t, dt) {
    r3.setCam(cam);
    // nearby lights only
    LT.length = 0;
    if (E.tod !== "day") {
      for (var i = 0; i < scene.lights.length; i++) { var L = scene.lights[i]; if (Math.abs(L.x - cam.x) + Math.abs(L.z - cam.z) < 70) LT.push(L); }
      if (scene.kind !== "tiny") { // a flashlight: a bright spot ahead and a long throw down the track
        var fy = cam.yaw, sx = Math.sin(fy), cz2 = Math.cos(fy), k = E.tod === "night" ? 1 : 0.3;
        [[1.6, 3.2, 0.8], [5, 4.6, 1.15], [10, 5.5, 0.85]].forEach(function (q) {
          var hl = { x: player.x + sx * q[0], z: player.z + cz2 * q[0], r: q[1], i: q[2] * k, c: [1, 0.96, 0.82] };
          hl.r2 = hl.r * hl.r; LT.push(hl);
        });
      }
    }
    r3.lights = LT;
    r3.begin(envR);
    r3.hfn = scene.height || null;
    r3.drawSky(t);
    if (scene.height) r3.drawTerrain(scene); else { r3.zbuf = null; r3.drawGround(scene); }
    var list = items.slice();
    scene.actors.forEach(function (a) { if (a.draw) a.draw(list, t); });
    if (pup) pup.draw(list, t);
    if (!player.hidden) {
      var pi = playerItem(); list.push(pi);
      if (player.carry) list.push({ k: "spr", spr: player.carry, x: player.x, z: player.z, y: 1.65, h: 0.9, int: false, bias: -0.35 });
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
