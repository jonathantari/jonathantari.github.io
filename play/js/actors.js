// Things that move or can be talked to in the 3D world.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr;

  // a walker: follows a path of points, shows the right side of its sprite to the camera
  function mover(o) {
    var a = Object.assign({ x: 0, z: 0, heading: 0, speed: 2, path: [], dist: 0, h: 1.7, moving: false, hidden: false }, o);
    a.go = function (pts, speed, done) { a.path = pts.slice(); if (speed) a.speed = speed; a.onArrive = done || null; };
    a.goP = function (pts, speed) { return new Promise(function (res) { a.go(pts, speed, res); }); };
    a.update = function (dt, t) {
      if (a.tick) a.tick(dt, t);
      if (!a.path.length) { a.moving = false; return; }
      var p = a.path[0], dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { a.path.shift(); if (!a.path.length) { a.moving = false; if (a.onArrive) { var f = a.onArrive; a.onArrive = null; f(); } } return; }
      a.heading = Math.atan2(dx, dz);
      var s = Math.min(d, a.speed * dt); a.x += dx / d * s; a.z += dz / d * s; a.dist += s; a.moving = true;
    };
    a.draw = function (list, t) {
      if (a.hidden) return;
      var f = GG.game.facing(a.heading), fr = a.moving ? Math.floor(a.dist / (a.stride || 0.4)) % 4 : 0;
      var sp = a.spr(f, fr, t);
      if (!sp) return;
      list.push({ k: "spr", spr: sp.s || sp, x: a.x, z: a.z, y: a.y || 0, h: a.h, flip: sp.flip != null ? sp.flip : f.flip, shadow: a.shadow !== false, int: a.int });
      if (a.extra) a.extra(list, t);
    };
    return a;
  }
  function person(look, x, z, heading, o) {
    var kid = look && look.kid;
    return mover(Object.assign({ x: x, z: z, heading: heading || 0, h: kid ? 1.3 : 1.75, speed: 1.6, look: look,
      spr: function (f, fr) { return S.person(Object.assign({}, look, { dir: f.dir, frame: fr })); } }, o));
  }
  // side-view animals: flip so they face the way they're going on screen
  function sideFlip(a) {
    var r3 = GG.game.r3(), cam = GG.game.cam;
    var rx = Math.sin(a.heading) * Math.cos(cam.yaw) - Math.cos(a.heading) * Math.sin(cam.yaw);
    return rx < 0;
  }
  function animal(kind, x, z, heading, o) {
    var a = mover(Object.assign({ x: x, z: z, heading: heading || 0, speed: 2.2, stride: 0.3 }, o));
    a.kind = kind;
    a.h = { dog: 0.75, lion: 1.0, deer: 1.5, marmot: 0.45, raccoon: 0.45, cat: 0.35, owl: 0.5, eagle: 0.6, ant: 0.6 }[kind] || 0.5;
    a.spr = function (f, fr, t) {
      var fl = sideFlip(a), s;
      if (kind === "dog") s = S.dog(a.moving ? fr : 0);
      else if (kind === "lion") s = S.lion(a.moving ? fr : 0);
      else if (kind === "deer") s = S.deer(a.moving ? fr : 0);
      else if (kind === "marmot") s = S.marmot();
      else if (kind === "raccoon") s = S.raccoon(a.moving ? fr : 0);
      else if (kind === "cat") { s = S.cat(fr, !a.moving); fl = !fl; }
      else if (kind === "owl") { s = S.owl((t % 4) < 0.2); fl = false; }
      else if (kind === "eagle") { s = S.eagle(Math.floor(t * 3) % 2); }
      else if (kind === "ant") s = S.bug("ant", a.moving ? fr : 0);
      return { s: s, flip: fl };
    };
    return a;
  }

  function puppy(player) {
    var a = mover({ x: player.x - 1, z: player.z - 1, heading: player.heading, speed: 4.2, h: 0.55, stride: 0.25 });
    a.spr = function (f, fr) {
      if (!a.moving && f.dir === "front") return S.puppy(0, "front");
      return { s: S.puppy(a.moving ? fr : 0, "side"), flip: sideFlip(a) };
    };
    a.update = function (dt, t) {
      if (a.stay) { a.moving = false; return; }
      var side = Math.sin(t * 0.3) > 0 ? 1 : -1;
      var tx = player.x - Math.sin(player.heading) * 1.3 + Math.cos(player.heading) * 0.9 * side;
      var tz = player.z - Math.cos(player.heading) * 1.3 - Math.sin(player.heading) * 0.9 * side;
      var dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      if (d > 14) { a.x = tx; a.z = tz; return; }
      if (d < 0.45) { a.moving = false; if (Math.hypot(player.x - a.x, player.z - a.z) < 3) a.heading = Math.atan2(player.x - a.x, player.z - a.z); return; }
      a.heading = Math.atan2(dx, dz);
      var sp = Math.min(d, (d > 3 ? 6 : 3.4) * dt);
      a.x += dx / d * sp; a.z += dz / d * sp; a.dist += sp; a.moving = true;
    };
    return a;
  }

  function ball(kind, x, z) {
    var a = { x: x, z: z, y: 0, vx: 0, vz: 0, vy: 0, kind: kind, h: 0.6, rolling: false, hidden: false, spin: 0 };
    a.update = function (dt) {
      if (a.fly) { a.fly(dt); return; }
      if (a.vy || a.y > 0) { a.vy -= 14 * dt; a.y += a.vy * dt; if (a.y <= 0) { a.y = 0; a.vy = Math.abs(a.vy) > 2 ? -a.vy * 0.4 : 0; } }
      var v = Math.hypot(a.vx, a.vz);
      if (v > 0.02) { var f = Math.max(0, 1 - dt * (a.y > 0 ? 0.2 : 0.9)); a.vx *= f; a.vz *= f; a.x += a.vx * dt; a.z += a.vz * dt; a.spin += v * dt; a.rolling = true; }
      else { a.vx = a.vz = 0; a.rolling = false; }
    };
    a.draw = function (list) {
      if (a.hidden) return;
      list.push({ k: "spr", spr: S.ball(a.kind), x: a.x, z: a.z, y: a.y, h: a.h, flip: (a.spin * 3 | 0) % 2 === 1, shadow: true });
    };
    return a;
  }

  function pickup(o) {
    var a = Object.assign({ taken: false }, o);
    a.update = function () {
      if (a.taken || GG.game.locked()) return;
      var p = GG.game.player;
      if (Math.hypot(p.x - a.x, p.z - a.z) < 0.85) { a.taken = true; GG.game.beat(function () { return GG.events.pickup(a); }); }
    };
    a.draw = function (list, t) {
      if (a.taken) return;
      list.push({ k: "spr", spr: a.spr, x: a.x, z: a.z, y: 0, h: a.h, shadow: false });
      if (Math.sin(t * 3 + a.x) > 0.85) list.push({ k: "pt", x: a.x + 0.15, y: a.h + 0.15, z: a.z, s: 0.08, c: [255, 250, 220], glow: true });
    };
    return a;
  }

  function swing(o) {
    var a = Object.assign({}, o);
    a.update = function () {};
    a.draw = function (list, t) {
      var ang = a.still ? Math.sin(t * 0.7) * 0.05 : Math.sin(t * 1.6) * 0.6, L = a.top - 0.6;
      var sx = a.x + Math.sin(ang) * L * (a.x < 0 ? 1 : -1), sy = a.top - Math.cos(ang) * L;
      list.push({ k: "line", a: [a.x, a.top, a.z - 0.35], b: [sx, sy, a.z - 0.35], c: "#3a3a40" }, { k: "line", a: [a.x, a.top, a.z + 0.35], b: [sx, sy, a.z + 0.35], c: "#3a3a40" });
      list.push({ k: "pt", x: sx, y: sy, z: a.z, s: 0.5, c: [40, 40, 46] });
    };
    return a;
  }
  // a parked or driving vehicle built from a mesh
  function vehicle(mesh, x, z, vx, vz) {
    var a = { m: mesh, x: x, z: z, vx: vx || 0, vz: vz || 0 };
    mesh.ox = x; mesh.oz = z;
    a.update = function (dt) { a.x += a.vx * dt; a.z += a.vz * dt; mesh.ox = a.x; mesh.oz = a.z; };
    a.draw = function (list) { list.push({ k: "mesh", m: mesh }); };
    return a;
  }
  // a little cloud of world-space dots: sprinkler spray, fireflies
  function swarm(kind, cx, cz, o) {
    var a = Object.assign({ x: cx, z: cz, kind: kind, pts: [] }, o), r = Math.random;
    if (kind === "fireflies") for (var i = 0; i < 26; i++) a.pts.push({ x: cx + (r() - 0.5) * 18, z: cz + (r() - 0.5) * 30, y: 0.4 + r() * 1.6, p: r() * 6.28 });
    a.update = function () {};
    a.draw = function (list, t) {
      if (kind === "sprinkler") {
        var sweep = Math.sin(t * 0.9) * 0.9;
        for (var k = 0; k < 14; k++) {
          var f = ((t * 0.9 + k / 14) % 1), dir = sweep + (k % 3 - 1) * 0.05, dist = f * 4.2;
          list.push({ k: "pt", x: cx + Math.sin(dir) * dist * (a.side || 1), y: 0.3 + Math.sin(f * Math.PI) * 1.4, z: cz + Math.cos(dir) * dist * 0.4, s: 0.07, c: [214, 236, 250] });
        }
        list.push({ k: "pt", x: cx, y: 0.1, z: cz, s: 0.2, c: [80, 80, 90] });
      } else {
        a.pts.forEach(function (p) {
          var on = Math.sin(t * 2.2 + p.p * 3) > 0.35;
          if (!on) return;
          list.push({ k: "pt", x: p.x + Math.sin(t * 0.4 + p.p) * 0.5, y: p.y + Math.sin(t * 0.7 + p.p) * 0.3, z: p.z, s: 0.07, c: [230, 255, 140], glow: true });
        });
      }
    };
    return a;
  }

  // scene data -> live actors
  function wrap(a, scene) {
    if (a.update && a.draw) return a;
    if (a.pickup) return pickup(a);
    if (a.swing) return swing(a);
    if (a.npc) {
      var p = person(a.look, a.x, a.z, a.heading);
      if (a.lines) p.talk = function () { return GG.ui.say(a.lines); };
      return p;
    }
    a.update = a.update || function () {}; a.draw = a.draw || function () {};
    return a;
  }

  GG.actors = { mover: mover, person: person, animal: animal, puppy: puppy, ball: ball, pickup: pickup, swing: swing, vehicle: vehicle, swarm: swarm, wrap: wrap, sideFlip: sideFlip };
})();
