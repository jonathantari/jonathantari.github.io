// What happens where: the outing's beats, driven by the data decks.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr, A, G, UI;
  var EV = GG.events = {};
  var R = U.rng((Date.now() & 0xffff) + 1);

  function rnd() { return R(); }
  function sv() { return GG.save.data; }
  function D() { return GG.data; }
  function near(p, x, z, r) { return Math.hypot(p.x - x, p.z - z) < r; }
  function fits(c, E) {
    if (c.when && c.when !== "any" && c.when !== (E.tod === "night" ? "night" : "day")) return false;
    if (c.seasons && c.seasons.indexOf(E.season) < 0) return false;
    if (c.nightOnly && E.tod !== "night") return false;
    return true;
  }
  function caption(s, secs) { UI.caption(s, secs); }
  var pending = [];
  function captions(lines, gap) { lines.forEach(function (l, i) { pending.push(setTimeout(function () { caption(l, gap || 3.2); }, i * (gap || 3.2) * 1000)); }); }

  EV.setup = function (kind, sc, opt) {
    A = GG.actors; G = GG.game; UI = GG.ui;
    pending.forEach(clearTimeout); pending = []; // captions queued in the last scene stay there
    if (kind === "street") street(sc, opt);
    else if (kind === "block") block(sc, opt);
    else if (kind === "trail") trail(sc, opt);
    else if (kind === "summit") summit(sc, opt);
    else if (kind === "tiny") tiny(sc, opt);
  };

  // ======================= Node 1: the street =======================
  function street(sc, opt) {
    var E = sc.E, ev = sc.marks.event.z, wd = D().world;
    // 1.0a: the bird on the wire
    var w = sc.marks.wire, bird = { x: w.x, y: w.y, z: w.z, vy: 0, vz: 0, fly: false, seen: false };
    bird.update = function (dt) {
      var p = G.player;
      if (!bird.seen && p.z > w.z - 16) { bird.seen = true; captions(D().street.quiet.bird, 3.4); }
      if (!bird.fly && Math.hypot(p.x - bird.x, p.z - bird.z) < 5.5) { bird.fly = true; bird.vy = 2.2; bird.vz = 5; setTimeout(function () { caption(D().street.quiet.birdFly); }, 600); }
      if (bird.fly) { bird.y += bird.vy * dt; bird.z += bird.vz * dt; bird.x += 1.5 * dt; }
    };
    bird.draw = function (list, t) {
      if (bird.y > 40) return;
      list.push({ k: "spr", spr: S.bird(bird.fly ? 2 : ((t % 3) < 0.3 ? 1 : 0)), x: bird.x, y: bird.y, z: bird.z, h: 0.32, shadow: false });
    };
    G.addActor(bird);
    if (E.tod === "night") { // a couple of extra birds would be asleep; fireflies in summer
      if (E.season === "summer" && rnd() < 0.5) G.addActor(A.swarm("fireflies", 8, 30));
    }

    // 0.5: back up the driveway
    sc.away = opt.mode === "return" || opt.mode === "resume";
    G.trigger({
      test: function (p) { if (p.z > 12) sc.away = true; return sc.away && (sc.dir || 1) < 0 && p.z < 3.4; },
      rearm: true, fn: homePrompt
    });

    // 1.1: the street moment
    if (opt.mode === "out" || opt.mode === "street") {
      var forced = /[?&]event=(\w+)/.exec(location.search);
      if (!forced && (!sv().ballDone || /[?&]ball/.test(location.search))) ballSetup(sc, ev);
      else {
        var cards = D().street.events.filter(function (c) { return fits(c, E); });
        var card = forced ? D().street.events.filter(function (c) { return c.id === forced[1]; })[0] : GG.save.draw("street", cards, rnd, 3);
        if (card) streetEvent(sc, ev, card);
      }
    }

    // turning round: walking back toward home ends at the driveway, forward again reaches the corner
    sc.onTurn = function (d) { if (d < 0) { sc.away = true; sc.zMin = 2.8; } else { sc.zMin = -20; sc.zMax = sc.cross - 1; } };
    // 1.2: the corner
    G.trigger({ test: function (p) { return (sc.dir || 1) > 0 && p.z > sc.cross - 7 && Math.abs(p.x) < 8; }, rearm: true, fn: function () { return corner(sc); } });

    if (opt.mode === "out") G.beat(function () { return intro(sc); });
    else if (opt.mode === "return") setTimeout(function () { caption("Home's just down the street, on the right."); }, 600);
  }

  function intro(sc) {
    var P = G.player, E = sc.E, wd = D().world;
    P.x = -9.4; P.z = 2.8; P.heading = Math.PI / 2;
    G.setCam({ x: 12.5, y: 2.6, z: 1.6, yaw: -Math.PI / 2, pitch: 0.02 });
    return UI.fadeTo(false, 0.6).then(function () { return G.walkTo(-3.2, 2.8, 2.4); })
      .then(function () { return G.turnTo(0, 0.45); })
      .then(function () { return G.camTo(G.camFollowYaw(0), 2.4); })
      .then(function () {
        G.releaseCam();
        var day = E.date.toLocaleDateString("en-US", { weekday: "long" });
        var part = U.pick(rnd, wd.todWord[E.tod]);
        if (E.tod === "day") part = E.date.getHours() < 12 ? "morning" : "afternoon";
        caption(day + " " + part + ". " + U.pick(rnd, wd.weatherWord[E.weather] || wd.weatherWord.clear), 4.5);
        setTimeout(function () { caption(wd.ui.controls, 11); }, 5000);
      });
  }

  function homePrompt() {
    var h = D().world.home;
    return UI.choose(h.prompt, h.choices).then(function (i) {
      if (i !== 0) { G.scene.dir = 1; G.scene.zMax = G.scene.cross - 1; G.player.heading = 0; G.cam.yaw = 0; G.player.walking = false; return; }
      G.lock();
      return G.walkTo(-6.4, 2.8, 2.6).then(function () {
        G.camTo(function () { return { x: -1.5, y: 2.6, z: 2.8, yaw: -Math.PI / 2, pitch: 0.12 }; }, 1.6);
        return G.walkTo(-9.6, 2.8, 2.2);
      }).then(function () { G.unlock(); return G.goHome(); });
    });
  }

  function corner(sc) {
    var C = D().street.corner, cross = sc.cross, P = G.player;
    return UI.choose(C.prompt, C.choices.map(function (c) { return c.label; })).then(function (i) {
      var id = C.choices[i].id;
      if (id === "B") return G.walkTo(0, cross + 2).then(function () { return G.swap("block", blockOpt(0, { kind: "street" })); });
      if (id === "C") return G.walkTo(-1.5, cross).then(function () { return G.turnTo(-Math.PI / 2, 0.4); }).then(function () { G.walkTo(-12, cross); return U.wait(1.2); })
        .then(function () { return G.swap("trail", { spawn: { x: 0, z: 1, h: 0 }, seed: (Date.now() & 0xfff) }); });
      return G.swap("street", { mode: "return", spawn: { x: -1.2, z: 30, h: Math.PI } });
    });
  }

  // ---------- Branch A: the ball ----------
  function ballSetup(sc, ev) {
    var E = sc.E, B = D().street.ball;
    var kinds = B.kinds.filter(function (k) { return !k.seasons || k.seasons.indexOf(E.season) >= 0; });
    var kind = U.weighted(rnd, kinds), waiter = U.weighted(rnd, B.waiters), talker = U.weighted(rnd, B.talkers);
    if (E.tod === "night") { raccoonInstead(sc, ev); return; }
    var wx = 4.3, wz = ev + 12, wa;
    if (waiter.id === "dog") wa = A.animal("dog", wx, wz, -Math.PI / 2);
    else wa = A.person(waiter.look, wx, wz, -Math.PI / 2);
    wa.tick = function () { if (!wa.path.length) { var p = G.player; wa.heading = Math.atan2(p.x - wa.x, p.z - wa.z); } };
    G.addActor(wa);
    var ball = A.ball(kind.id, 4.4, ev + 9.5);
    ball.hidden = true;
    G.addActor(ball);
    var ctx = { sc: sc, ev: ev, kind: kind, waiter: waiter, talker: talker, wa: wa, ball: ball, done: false };
    // A0: it rolls out and stops a few steps ahead; you keep control
    G.trigger({ test: function (p) { return p.z > ev - 3; }, fn: function () {
      ball.hidden = false; ball.vx = -3.9; ball.vz = -0.2; GG.sfx && GG.sfx.boing();
      caption(U.fmt(B.rolls[0], { ball: kind.name }), 4);
      setTimeout(function () { if (!ctx.done) caption(waiter.call[0], 4); }, 3800);
    } });
    // walk into it: pick it up
    G.trigger({ test: function (p) { return !ball.hidden && !ctx.done && Math.abs(p.x - ball.x) < 0.7 && Math.abs(p.z - ball.z) < 0.9; }, fn: function () { G.player.walking = true; return ballBeat(ctx); } });
    // walk past it: A4
    G.trigger({ test: function (p) { return !ball.hidden && !ctx.done && p.z > ball.z + 5; }, fn: function () {
      ctx.done = true; sv().ballDone = true; GG.save.write();
      caption(waiter.ignore[0], 4);
      wa.go([{ x: ball.x + 0.6, z: ball.z }], 2.4, function () { ball.hidden = true; wa.go([{ x: wx, z: wz }], 2); });
    } });
  }
  function raccoonInstead(sc, ev) {
    // night: a raccoon instead of the ball
    var card = D().street.events.filter(function (c) { return c.id === "raccoon"; })[0];
    streetEvent(sc, ev, card);
    sv().ballDone = true; GG.save.write();
  }

  function ballBeat(ctx) {
    var B = D().street.ball;
    ctx.ball.hidden = true;
    return GG.close.ball(ctx.kind, ctx.talker).then(function (res) {
      if (res === "ant") return antBeat(ctx);
      if (res === "punt") return punt(ctx);
      return throwBack(ctx);
    });
  }
  function throwBack(ctx) {
    var B = D().street.ball, w = ctx.waiter;
    return GG.close.throwBall({ waiter: w, kind: ctx.kind }).then(function (q) {
      ctx.done = true; sv().ballDone = true; GG.save.write();
      var b = ctx.ball, wa = ctx.wa;
      b.hidden = false; b.x = G.player.x; b.z = G.player.z; b.y = 1.2;
      // an arc over to the waiter (or into the hedge)
      var tx = q === "good" ? wa.x : wa.x - 1.5, tz = q === "good" ? wa.z : wa.z + 2.5, sx = b.x, sz = b.z, t = 0;
      b.fly = function (dt) { t += dt / 0.9; var k = Math.min(1, t); b.x = sx + (tx - sx) * k; b.z = sz + (tz - sz) * k; b.y = 1.2 + Math.sin(k * Math.PI) * 3 - k * 0.6; if (k >= 1) { b.fly = null; if (q === "good") b.hidden = true; } };
      return U.wait(1).then(function () { return UI.say(q === "good" ? w.good : w.bad); })
        .then(function () { if (q === "good" && w.gift) return G.give(w.gift); })
        .then(function () {
          if (q !== "good") { wa.go([{ x: tx, z: tz }], 2.4, function () { b.hidden = true; wa.go([{ x: 4.3, z: ctx.ev + 12 }], 2); }); }
          if (w.invites) return invite(ctx);
        })
        .then(function () { caption(B.after[0], 4); });
    });
  }
  function punt(ctx) {
    var B = D().street.ball, E = ctx.sc.E;
    return GG.close.punt(ctx.kind).then(function () {
      ctx.done = true; sv().ballDone = true; sv().ballOrbit = true; GG.save.write();
      return UI.say(B.punt, { ball: ctx.kind.name });
    }).then(function () { return UI.say(ctx.waiter.punted || ["'Whoa.'"]); })
      .then(function () {
        if (E.tod === "night") return UI.say(B.orbitStar);
        caption(B.puntNight, 5);
      })
      .then(function () { caption(B.after[0], 4); });
  }
  function antBeat(ctx) {
    var B = D().street.ball, t = ctx.talker;
    return UI.say(t.ask).then(function () { return UI.choose(null, B.shrinkChoices); }).then(function (i) {
      if (i !== 0) return UI.say(["'Oh. Okay. That's okay.'"]).then(function () { return ballBeat(ctx); });
      return UI.say(B.shrink).then(function () {
        GG.sfx && GG.sfx.shrink();
        ctx.done = true; sv().ballDone = true; GG.save.write();
        return G.swap("tiny", { spawn: { x: 1, z: -3, h: 0 }, talker: t, back: { ev: ctx.ev, ball: ctx.kind.id } });
      });
    });
  }
  function invite(ctx) {
    var B = D().street.ball;
    var game = GG.save.draw("games", B.games, rnd, 2);
    return UI.choose(U.fmt(B.invite.prompt, { game: game.name }), B.invite.choices).then(function (i) {
      if (i !== 0) return UI.say(B.invite.decline);
      return UI.say(game.intro).then(function () {
        if (game.id === "catch") return GG.close.catchGame(ctx);
        if (game.id === "chalk") return GG.close.chalk();
        if (game.id === "lemonade") return GG.close.lemonade();
        return hideAndSeek(ctx, game);
      }).then(function () {
        if (game.id === "hide") return;
        return UI.say(game.done ? [U.pick(rnd, game.done)] : []).then(function () { if (game.gift) return G.give(game.gift); });
      });
    });
  }
  function hideAndSeek(ctx, game) {
    var spots = ["▶ Behind the parked cars", "▶ Behind the big tree", "▶ Behind the hedge", "▶ Under the porch steps"];
    var where = (rnd() * spots.length) | 0, tries = 0;
    function look() {
      return UI.choose("Where do you look?", spots).then(function (i) {
        tries++;
        if (i === where) return UI.say(game.found);
        if (tries >= 2) return UI.say(["'BOO!' The kid pops out from " + spots[where].replace("▶ Behind", "behind").replace("▶ Under", "under").toLowerCase() + ".", "'Ha! You were SO close.'"]);
        return UI.say([U.pick(rnd, game.hint)]).then(look);
      });
    }
    return UI.fadeTo(true, 0.4).then(function () { ctx.wa.hidden = true; return UI.say(["One... two... three...", "...nine... TEN! Ready or not!"]); })
      .then(function () { return UI.fadeTo(false, 0.4); }).then(look)
      .then(function () { ctx.wa.hidden = false; ctx.wa.go([{ x: 4.3, z: ctx.ev + 12 }], 2.2); });
  }

  // ---------- 1.1 later visits: one card from the street deck ----------
  function streetEvent(sc, ev, c) {
    var E = sc.E, P = G.player, fired = false;
    function onNear(r, fn, zz) { G.trigger({ test: function (p) { return p.z > (zz || ev) - r; }, fn: fn }); }
    var t = c.type;
    if (t === "truck") {
      var m = truckMesh(E, "#f2f0e8", ["#f08aa8", "#5ab0e0"]), tr = A.vehicle(m, 0.6, ev + 40, 0, -2.6);
      tr.update = function (dt) {
        var p = G.player, block = p.z < tr.z && p.z > tr.z - 6.5;
        var v = tr.stop || block ? 0 : tr.vz; tr.z += v * dt; m.ox = tr.x; m.oz = tr.z;
      };
      G.addActor(tr);
      G.trigger({ test: function (p) { return Math.abs(p.z - tr.z) < 11; }, fn: function () {
        tr.stop = true; GG.sfx && GG.sfx.jingle();
        return UI.say(c.lines).then(function () { return offer(c); }).then(function () { tr.stop = false; });
      } });
    } else if (t === "sale") {
      G.addActor({ x: 5.9, z: ev + 2, update: function () {}, draw: function (l) { l.push({ k: "spr", spr: S.stand("sale"), x: 5.9, z: ev + 2, h: 1.0, shadow: true }); } });
      var seller = A.person({ shirt: "#5a8ab0", pants: "#6a5a4a", hair: "#a87a4a", hat: "bun", pack: "none" }, 6.8, ev + 3, -Math.PI / 2);
      seller.tick = function () { var p = G.player; seller.heading = Math.atan2(p.x - seller.x, p.z - seller.z); };
      G.addActor(seller);
      onNear(9, function () { return UI.say(c.lines).then(function () { return offer(c); }); });
    } else if (t === "poster") {
      G.addActor({ x: 6.5, z: ev, update: function () {}, draw: function (l) { l.push({ k: "spr", spr: S.sign("poster"), x: 4.5, z: ev, h: 3.2, shadow: false }); } });
      onNear(6, function () { return UI.say(c.lines); });
    } else if (t === "bike") {
      var rider = A.person({ shirt: "#e8b830", pants: "#3a5a8a", hair: "#2a2026", hat: "cap", cap: "#3a6ad0", kid: true, pack: "none" }, 7, ev + 8, -Math.PI / 2);
      rider.y = 0.45; rider.speed = 7; rider.hidden = true;
      rider.extra = function (l) { l.push({ k: "spr", spr: bikeSpr(), x: rider.x, z: rider.z + 0.01, h: 0.8, flip: A.sideFlip(rider), shadow: true }); };
      G.addActor(rider);
      onNear(14, function () { rider.hidden = false; rider.go([{ x: -14, z: ev + 8 }], 7, function () { rider.hidden = true; }); GG.sfx && GG.sfx.ding(); captions(c.lines, 3.2); });
    } else if (t === "van") {
      var vm = GG.scenes.car(E, 0, 0, "#8a5a3a", "z", { tall: true, len: 5, wid: 2.1, cabDec: { e: [[0.1, 0.4, 0.9, 0.85, "#f2e0c0"]], w: [[0.1, 0.4, 0.9, 0.85, "#f2e0c0"]] } }).m;
      G.addActor(A.vehicle(vm, 1.7, ev + 4));
      var drv = A.person({ shirt: "#8a5a3a", pants: "#4a3a2a", hair: "#2a2026", hat: "cap", cap: "#8a5a3a", pack: "none" }, 3.3, ev + 2, 0);
      G.addActor(drv);
      onNear(12, function () { drv.go([{ x: 4.4, z: ev + 2 }, { x: 6.6, z: ev + 5 }], 2.4); return UI.say(c.lines); });
    } else if (t === "sprinkler") {
      G.addActor(A.swarm("sprinkler", 6.0, ev + 3, { side: -1 }));
      onNear(10, function () { captions(c.lines, 3.5); });
      var wet = false;
      G.trigger({ test: function (p) { return !wet && p.x > 0.5 && Math.abs(p.z - ev - 3) < 2; }, fn: function () { wet = true; caption(c.touch[0], 4); } });
    } else if (t === "raccoon") {
      var rc = A.animal("raccoon", -6, ev + 4, Math.PI / 2);
      rc.speed = 1.6; G.addActor(rc);
      onNear(16, function () {
        rc.go([{ x: 0.5, z: ev + 4 }], 1.8, function () {
          setTimeout(function () {
            rc.go([{ x: 7, z: ev + 4 }], 1.6);
            if (c.leaves) G.addActor(A.pickup({ pickup: c.leaves.item, line: c.leaves.line, x: 0.4, z: ev + 3.6, h: 0.22, spr: GG.spr.icon(Object.assign({ id: c.leaves.item }, D().items[c.leaves.item])) }));
          }, 2600);
        });
        captions(c.lines, 3.4);
      });
    } else if (t === "porch") {
      onNear(8, function () {
        var d = G.scene.doors.filter(function (q) { return q.z > ev - 4 && q.z < ev + 24; })[0];
        if (d) { var L = { x: d.x, z: d.z, r: 7, i: 1.2, c: [1, 0.85, 0.55] }; L.r2 = L.r * L.r; G.scene.lights.push(L); }
        captions(c.lines, 3.4);
      });
    } else if (t === "npc") {
      var n = A.person(c.look, 4.3, ev + 6, Math.PI);
      n.tick = function () { var p = G.player; if (near(p, n.x, n.z, 9)) n.heading = Math.atan2(p.x - n.x, p.z - n.z); };
      n.talk = function () { return UI.say(c.lines); };
      G.addActor(n);
      if (c.dog) { var dg = A.animal("dog", 4.4, ev + 7.2, Math.PI); dg.h = 0.6; G.addActor(dg); }
      onNear(8, function () { return UI.say(c.lines); });
    } else if (t === "fireflies") {
      G.addActor(A.swarm("fireflies", 8, ev + 10)); G.addActor(A.swarm("fireflies", -8, ev + 16));
      onNear(10, function () { captions(c.lines, 4); });
    } else if (t === "balloon") {
      var bl = { x: 0.6, z: ev + 30, y: 1.5, update: function (dt, tt) { bl.z -= 1.2 * dt; bl.y = 1.5 + Math.sin(tt) * 0.2; if (!bl.bonk && near(G.player, bl.x, bl.z, 1.1)) { bl.bonk = true; caption(c.lines[1], 4); } },
        draw: function (l) { l.push({ k: "spr", spr: S.ball("balloon"), x: bl.x, y: bl.y, z: bl.z, h: 0.6, shadow: false }); l.push({ k: "line", a: [bl.x, bl.y, bl.z], b: [bl.x + 0.1, bl.y - 1.1, bl.z], c: "#e8e8e8" }); } };
      G.addActor(bl);
      onNear(14, function () { caption(c.lines[0], 4); });
    }
  }
  function offer(c) {
    var o = c.offer; if (!o) return;
    if (o.pick) {
      var names = o.pick.map(function (id) { return "▶ " + D().items[id].name; }).concat(["▶ No thanks"]);
      return UI.choose(o.prompt, names).then(function (i) { if (i >= o.pick.length) return UI.say(o.no); return UI.say(o.yes).then(function () { return G.give(o.pick[i]); }); });
    }
    return UI.choose(o.prompt, ["▶ Yes", "▶ No"]).then(function (i) { if (i) return UI.say(o.no); return UI.say(o.yes).then(function () { return G.give(o.item); }); });
  }
  var _bike;
  function bikeSpr() {
    return _bike || (_bike = S.make(16, 10, function (p) {
      for (var a = 0; a < 20; a++) { var t = a / 20 * 6.283; p.px(Math.round(3.5 + Math.cos(t) * 3), Math.round(6 + Math.sin(t) * 3), "#2a2a30"); p.px(Math.round(12.5 + Math.cos(t) * 3), Math.round(6 + Math.sin(t) * 3), "#2a2a30"); }
      p.line(4, 6, 8, 2, "#c8402a"); p.line(8, 2, 12, 6, "#c8402a"); p.line(8, 2, 8, 6, "#c8402a"); p.line(4, 6, 8, 6, "#c8402a"); p.line(12, 6, 12, 1, "#8a8a90"); p.r(11, 0, 3, 1, "#2a2a30"); p.r(6, 1, 3, 1, "#2a2a30");
    }, { outline: false }));
  }
  function truckMesh(E, col, stripes) {
    var m = GG.scenes.car(E, 0, 0, col, "z", { tall: true, len: 5.6, wid: 2.2, cabDec: {
      w: [[0.05, 0.35, 0.95, 0.5, stripes[0]], [0.3, 0.55, 0.75, 0.95, E.tod === "night" ? "#ffd890" : "#3a4a5a", E.tod === "night"]],
      e: [[0.05, 0.35, 0.95, 0.5, stripes[0]], [0.05, 0.55, 0.95, 0.62, stripes[1]]],
      s: [[0.1, 0.2, 0.9, 0.85, "#3a4a5a"]] } }).m;
    return m;
  }

  // ======================= the tiny world (A2.1) =======================
  function tiny(sc, opt) {
    var T = D().street.ball.tiny, t = opt.talker || { id: "ant", name: "ant" }, M = sc.marks, P = G.player;
    var friend = t.id === "ant" ? A.animal("ant", 3, 1, 0) : { x: 3, z: 1, update: function () {}, draw: function (l, tt) { l.push({ k: "spr", spr: S.bug(t.id, Math.floor(tt * 2) % 2), x: friend.x, z: friend.z, h: 1.1, shadow: true }); } };
    friend.h = 1.0;
    G.addActor(friend);
    // a few ants busy around the hill
    for (var i = 0; i < 4; i++) {
      (function (k) {
        var a = A.animal("ant", M.hill.x + (k - 2) * 2, M.hill.z + 2, 0); a.h = 0.9; a.speed = 1.4;
        a.tick = function () { if (!a.path.length) a.go([{ x: M.hill.x + (rnd() - 0.5) * 9, z: M.hill.z + rnd() * 7 }], 1.2 + rnd()); };
        G.addActor(a);
      })(i);
    }
    var crumb = { x: M.crumb.x, z: M.crumb.z, got: false, update: function () {}, draw: function (l) { if (!crumb.got) l.push({ k: "spr", spr: S.crumb(), x: crumb.x, z: crumb.z, h: 1.2, shadow: true }); } };
    G.addActor(crumb);
    var drip = { x: M.hose.x, z: M.hose.z, on: false, update: function () {}, draw: function (l, tt) {
      if (!drip.on) return;
      l.push({ k: "spr", spr: S.hose(), x: drip.x + 1, z: drip.z + 1, h: 4.5, shadow: false });
      var f = (tt * 0.8) % 1; l.push({ k: "pt", x: drip.x, y: 3.6 - f * 3.6, z: drip.z, s: 0.25, c: [190, 226, 250] });
    } };
    G.addActor(drip);
    G.beat(function () { return UI.fadeTo(false, 0.4).then(function () { return UI.say(T.arrive); }); });
    // crack warning
    var warned = false;
    G.trigger({ test: function (p) { return !warned && sc.cracks.some(function (c) { return Math.abs(p.z - c.z) < c.w + 1.2 && Math.abs(p.x - 1) > 1.5; }); }, fn: function () { warned = true; caption(T.canyon, 4); } });
    G.trigger({ test: function (p) { return !crumb.got && p.z > crumb.z - 1.6; }, fn: function () { crumb.got = true; P.carry = S.crumb(); return UI.say(T.grab).then(function () { sc.dir = -1; sc.zMin = 4; sc.zMax = 60.5; P.walking = true; return G.turnTo(Math.PI, 0.5); }); } });
    G.trigger({ test: function (p) { return crumb.got && P.carry && p.z < 5; }, fn: function () {
      P.carry = null; GG.sfx && GG.sfx.get();
      friend.x = M.hill.x + 2.5; friend.z = M.hill.z + 1.5;
      return UI.say(T.home).then(function () { drip.on = true; sc.dir = 1; sc.zMin = 3; sc.zMax = 14; P.walking = true; return G.turnTo(0, 0.5); });
    } });
    G.trigger({ test: function (p) { return drip.on && p.z > 12.5; }, fn: function () {
      GG.sfx && GG.sfx.grow(); UI.flash();
      return UI.say(T.hose).then(function () {
        var b = opt.back || { ev: 54 };
        return G.swap("street", { mode: "resume", spawn: { x: 0, z: b.ev + 4, h: 0 } });
      }).then(function () { caption(D().street.ball.after[0], 4); });
    } });
  }

  // ======================= Branch B: the wander =======================
  function blockOpt(north, back) {
    var E = GG.game.E, cards = D().wander.lots.filter(function (c) { return !c.nightOnly || E.tod === "night"; });
    if (E.tod === "night") cards = cards.filter(function (c) { return !(c.id === "cafe" && cards.some(function (q) { return q.id === "diner"; })); });
    var lots = [];
    for (var i = 0; i < 3; i++) { var c = GG.save.draw("wander", cards.filter(function (q) { return lots.indexOf(q) < 0; }), rnd, 4); lots.push(c); }
    return { seed: (Date.now() & 0xffff) + 1, north: north, lots: lots, spawn: { x: 0, z: -5, h: 0 }, back: back || { kind: "street" } };
  }
  function block(sc, opt) {
    var E = sc.E, night = E.tod === "night", W = D().wander;
    sc.lotsAt.forEach(function (L) {
      G.trigger({ test: function (p) { return p.z > L.z0 + 5; }, fn: function () {
        var s = night ? L.lot.night : L.lot.day;
        if (s) caption(s, 5);
        if (L.lot.gift && !night && rnd() < 0.6 && !GG.save.data.pack.some(function (q) { return q === L.lot.gift; })) {
          return U.wait(2.2).then(function () { return G.give(L.lot.gift, L.lot.giftLine); });
        }
      } });
    });
    G.trigger({ test: function (p) { return p.z > 50; }, fn: function () { if (rnd() < 0.6) caption(U.pick(rnd, W.extras), 4.5); } });
    // walking back past the start of the block: the way you came (the street corner or the last block)
    G.trigger({ test: function (p) { return (sc.dir || 1) < 0 && p.z < -6.5; }, fn: function () {
      var b = opt.back || { kind: "street" };
      if (b.kind === "block") return G.swap("block", Object.assign({}, b.opt, { reverse: true, spawn: { x: 0, z: 94 } }));
      return G.swap("street", { mode: "return", spawn: { x: 0, z: 116, h: Math.PI } });
    } });
    // the second face-off: a goose in the park
    var park = sc.lotsAt.filter(function (l) { return l.lot.kind === "park"; })[0];
    if (!opt.reverse && park && !night && (rnd() < W.gooseChance || /[?&]goose/.test(location.search))) gooseSetup(sc, park.z0 + 14, W.goose);
    G.trigger({ test: function (p) { return (sc.dir || 1) > 0 && p.z > sc.cross - 7 && Math.abs(p.x) < 8; }, rearm: true, fn: function () {
      var cross = sc.cross, north = opt.north || 0;
      return UI.choose(W.pick.prompt, W.pick.choices).then(function (i) {
        if (i === 3) return G.swap("street", { mode: "return", spawn: { x: -1.2, z: 30, h: Math.PI } });
        var turn = [-1, 0, 1][i];
        var go = G.walkTo(0, cross);
        if (turn) go = go.then(function () { return G.turnTo(turn * Math.PI / 2, 0.4); }).then(function () { G.walkTo(turn * 10, cross); return U.wait(1.1); });
        else go = go.then(function () { G.walkTo(0, cross + 8); return U.wait(1.0); });
        return go.then(function () { return G.swap("block", blockOpt(north + turn * Math.PI / 2, { kind: "block", opt: opt })); });
      });
    } });
  }

  function gooseSetup(sc, z, Gd) {
    var g = A.mover({ x: 0, z: z, h: 0.75, heading: Math.PI, speed: 1.2, stride: 0.2 });
    g.spr = function (f, fr, t) { return { s: S.goose(g.moving ? fr : ((t * 2) | 0) % 2, false), flip: A.sideFlip(g) }; };
    G.addActor(g);
    G.trigger({ test: function (p) { return (sc.dir || 1) > 0 && p.z > z - 4; }, fn: function () {
      g.x = G.player.x;
      return UI.say(Gd.spot).then(function () {
        return GG.close.battle({ data: Gd, foe: function (r) { return S.goose(r ? 1 : 0, true); }, ledge: false, cower: false, ground: E0(sc) });
      }).then(function (res) {
        if (res === "win") { g.go([{ x: 6, z: z + 6 }], 1.0); return UI.say(Gd.win.slice(0, 1)).then(function () { return G.give("feather", Gd.win[1]); }); }
        GG.sfx && GG.sfx.roar(); UI.flash();
        g.go([{ x: 3.5, z: z + 2 }], 2.5);
        return UI.say(Gd.lose);
      });
    } });
  }
  function E0(sc) { return sc.E.season === "winter" ? "#e8eef2" : sc.E.season === "autumn" ? "#8a9a48" : "#6a974a"; }

  // ======================= Branch C: the trail =======================
  function trail(sc, opt) {
    var E = sc.E, T = D().trail;
    // walking back down past the trailhead takes you back to the corner of your street
    G.trigger({ test: function (p) { return (sc.dir || 1) < 0 && p.z < 2; }, fn: function () { return G.swap("street", { mode: "return", spawn: { x: 0, z: 116, h: Math.PI } }); } });
    if (opt.reverse) { setTimeout(function () { caption("Downhill all the way home.", 4); }, 700); return; }
    setTimeout(function () { captions(T.trailhead, 4); }, 700);
    // one early encounter, usually a person
    if (rnd() < 0.6) encounter(sc, sc.marks.early.z, null);
    // C2, or C6 once the puppy's home
    var forced = /[?&]lion/.test(location.search);
    if (!sv().puppy || forced) lionSetup(sc, sc.marks.encounter.z);
    else encounter(sc, sc.marks.encounter.z, null);
    G.trigger({ test: function (p) { return (sc.dir || 1) > 0 && p.z > sc.marks.end.z - 3; }, fn: function () { return G.swap("summit", { spawn: { x: 0, z: 18, h: 0 }, still: true }); } });
  }
  function encounter(sc, z, card) {
    var E = sc.E, T = D().trail;
    var cards = T.encounters.filter(function (c) { return fits(c, E); });
    card = card || GG.save.draw("trail", cards, rnd, 3);
    if (!card) return;
    var cx = GG.scenes.trailX(z), t = card.type, a = null;
    if (t === "npc") {
      a = A.person(card.look, cx + 0.6, z + 14, Math.PI); a.speed = 1.3;
      a.talk = function () { return UI.say(card.lines); };
    } else if (t === "deer" || t === "marmot") {
      a = A.animal(t, cx + (t === "deer" ? 4 : 3), z + 6, -Math.PI / 2);
      if (t === "marmot") a.y = 0.8;
    } else if (t === "owl") {
      a = A.animal("owl", cx + 3.4, z + 4, 0); a.y = 3.2; a.shadow = false;
    } else if (t === "eagle") {
      a = A.animal("eagle", cx, z + 10, 0); a.y = 14; a.shadow = false;
      a.tick = function (dt, tt) { a.x = cx + Math.cos(tt * 0.35) * 9; a.z = z + 10 + Math.sin(tt * 0.35) * 9; a.heading = tt * 0.35 + Math.PI; };
      a.h = 1.2;
    }
    if (a) G.addActor(a);
    G.trigger({ test: function (p) { return p.z > z - 6; }, fn: function () {
      if (t === "npc") a.go([{ x: cx - 0.6, z: z - 30 }], 1.3);
      if (t === "deer") setTimeout(function () { a.go([{ x: cx + 14, z: z + 16 }], 3.5); }, 2500);
      var p = UI.say(card.lines);
      if (card.item) p = p.then(function () { return G.give(card.item, card.itemLine); });
      return p;
    } });
  }
  function lionSetup(sc, z) {
    var cx = GG.scenes.trailX(z + 8), E = sc.E, L = D().trail.lion;
    var rockX = cx + 2.6, rockZ = z + 8;
    G.addActor({ x: rockX + 0.6, z: rockZ + 0.6, update: function () {}, draw: function (l) { l.push({ k: "spr", spr: S.rock(1, E.snowy), x: rockX + 0.6, z: rockZ + 0.6, h: 2.0, shadow: true }); } });
    sc.posts.push({ x: rockX + 0.6, z: rockZ + 0.6, r: 1.4 });
    var pupA = A.mover({ x: rockX - 1.2, z: rockZ - 0.4, h: 0.55, heading: -Math.PI / 2 });
    pupA.spr = function () { return S.puppy(0, "front"); };
    var lion = A.animal("lion", rockX + 0.8, rockZ + 0.9, -Math.PI / 2); lion.y = 1.6; lion.h = 1.0;
    G.addActor(pupA); G.addActor(lion);
    G.trigger({ test: function (p) { return p.z > z - 2; }, fn: function () {
      var P = G.player;
      return G.walkTo(cx - 0.4, z + 2.2, 2).then(function () { return G.turnTo(Math.atan2(rockX - P.x, rockZ - P.z), 0.3); })
        .then(function () { return UI.say(L.spot); })
        .then(function () { return GG.close.battle(); })
        .then(function (res) {
          if (res === "win") {
            lion.y = 0; lion.x = rockX + 2; lion.speed = 5;
            lion.go([{ x: rockX + 16, z: rockZ + 10 }], 5, function () { lion.hidden = true; });
            return UI.say(L.win.slice(0, 1)).then(function () {
              pupA.go([{ x: P.x + 0.8, z: P.z - 0.4 }], 2.5);
              return U.wait(1.2);
            }).then(function () { return UI.say(L.win.slice(1)); }).then(function () {
              sv().puppy = true; GG.save.write();
              G.removeActor(pupA); G.setPup();
            });
          }
          sv().lionTries++; GG.save.write();
          UI.flash(); GG.sfx && GG.sfx.roar();
          pupA.go([{ x: rockX + 6, z: rockZ + 12 }], 6, function () { pupA.hidden = true; });
          return UI.say(L.lose.slice(0, 2)).then(function () { lion.hidden = true; return UI.say(L.lose.slice(2)); });
        });
    } });
  }
  EV.pickup = function (a) {
    var T = D().trail;
    if (a.line) return G.give(a.pickup, a.line);
    if (rnd() < T.oopsChance) return UI.say(U.pick(rnd, T.oops));
    return G.give(a.pickup);
  };
  // C3: a full backpack
  EV.fullPack = function (id) {
    var T = D().trail.gift, it = D().items[id], onTrail = G.scene && (G.scene.kind === "trail" || G.scene.kind === "summit");
    var opts = onTrail ? T.choices : [T.choices[0], T.choices[2]];
    return UI.say(D().world.ui.packFull).then(function () { return UI.choose(T.prompt, opts); }).then(function (i) {
      var act = onTrail ? i : (i === 1 ? 2 : i);
      if (act === 2) return UI.say("You leave the " + it.name.toLowerCase() + " be.");
      return UI.openPack("items", { pick: true, hint: act === 0 ? "Pick something to leave behind." : "Pick a gift for the hiker." }).then(function (idx) {
        if (idx == null) return UI.say("You leave the " + it.name.toLowerCase() + " be.");
        var gone = GG.save.removeAt(idx), gn = D().items[gone].name.toLowerCase();
        GG.save.add(id);
        if (act === 0) return UI.say([U.fmt(T.drop, { item: gn }), U.fmt(D().trail.got, { item: it.name })]);
        return UI.say([U.fmt(T.hikerIntro, { item: gn }), U.pick(rnd, T.hints), U.fmt(D().trail.got, { item: it.name })]);
      });
    });
  };

  // ======================= C5: the summit =======================
  function summit(sc, opt) {
    var E = sc.E, T = D().trail.summit, P = G.player;
    function ask() {
      return UI.choose(null, T.choices).then(function (i) {
        if (i === 0) return G.swap("street", { mode: "return", spawn: { x: -1.2, z: 30, h: Math.PI } });
        if (i === 1) return G.swap("trail", { reverse: true, spawn: { x: GG.scenes.trailX(222), z: 222 } });
        sc.onInteract = function () { return ask(); };
        caption("Tap or press Space when you're ready to head down.", 4);
      });
    }
    G.beat(function () {
      return UI.fadeTo(false, 0.4).then(function () { return U.wait(0.6); }).then(function () { return UI.say(T.arrive); })
        .then(function () { return UI.say(T.turn); })
        .then(function () { return G.turnTo(Math.PI, 0.9); })
        .then(function () { G.camTo(function () { var q = G.followPose(Math.PI); q.pitch += 0.12; q.y += 0.6; return q; }, 2.6); return G.walkTo(0, -3.4, 1.6); })
        .then(function () { return U.wait(1.4); })
        .then(function () {
          var v = E.weather === "fog" ? T.fog : E.weather === "snow" ? T.snow : T.view[E.tod];
          return UI.say(v);
        })
        .then(function () { G.releaseCam(); G.cam.yaw = Math.PI; return ask(); });
    });
  }

  EV.blockOpt = blockOpt;
  EV.interact = function () { var sc = G.scene; if (sc && sc.onInteract) { var f = sc.onInteract; sc.onInteract = null; return f(); } };
})();
