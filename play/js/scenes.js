// Scene layouts: the street (with the house), wander blocks, the trail, the
// summit and the tiny world. Each builder returns a scene:
//   { kind, ground(x,z,out,dist), low?, meshes[], props[] (static sprites), actors[],
//     solids[] (aabbs), posts[] (circles), walk(x,z) -> bool, lights[], spawn, marks{} }
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr, Mesh = GG.R3.Mesh;
  var h2 = U.h2, hx = U.hx;

  function C(s) { return hx(s); }
  var COL = {
    asphalt: C("#5c5e64"), asphaltLo: C("#535559"), asphaltHi: C("#66686e"), asphaltWet: C("#44474e"),
    yellow: C("#d8b84a"), white: C("#e8e6e0"), curb: C("#b8b4aa"), gutter: C("#8a8780"),
    walk: C("#c7c2b9"), walkLn: C("#aaa59c"), drive: C("#bdb7ad"), driveLn: C("#a29c92"),
    grass: C("#6a974a"), grassLo: C("#5c8840"), grassHi: C("#80ad5a"), grassDk: C("#4f773a"),
    grassA: C("#8a9a48"), grassALo: C("#7a8a40"), leafO: C("#d0782a"), leafY: C("#e0a838"),
    snow: C("#e8eef2"), snowLo: C("#d4dce6"), snowHi: C("#f6f8fa"),
    dirt: C("#b89a72"), dirtLo: C("#a88a64"), dirtHi: C("#c8aa82"), pebble: C("#8a7c6c"),
    dry: C("#9aa060"), dryLo: C("#8a9456"), dryHi: C("#aab06c"),
    rock: C("#b8a58e"), rockLo: C("#a08e78"), rockHi: C("#cfbda4"), lichen: C("#8a9a6a"), lichenO: C("#c89040"),
    mulch: C("#7a5a3e"), rubber: C("#7a4a3a"), plaza: C("#c8beb0"), plazaLn: C("#b0a698")
  };
  function set(o, c) { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }

  // seasonal lawn
  function lawn(o, x, z, dist, se) {
    var q = dist < 30 ? h2(Math.floor(x * 3), Math.floor(z * 3)) : 0.5;
    if (se === "winter") { set(o, q < 0.1 ? COL.snowLo : q > 0.92 ? COL.snowHi : COL.snow); return; }
    var band = Math.floor((x + z * 0.7) / 1.6) & 1;
    var A = se === "autumn" ? COL.grassA : COL.grass, B = se === "autumn" ? COL.grassALo : COL.grassLo;
    set(o, band ? A : B);
    if (q < 0.1) set(o, COL.grassHi); else if (q < 0.17) set(o, COL.grassDk);
    else if (se === "autumn" && q > 0.93) set(o, q > 0.965 ? COL.leafO : COL.leafY);
    else if (se === "spring" && q > 0.975) set(o, [240, 240, 236]);
  }

  // ---------- street ground (also used by wander blocks) ----------
  function streetGround(P) {
    var se = P.season, wet = P.wet, cross = P.cross, drives = P.drives, patches = P.patches || [];
    var RD = 3.3, CB = 3.6, WK = 5.0; // road half-width, curb, sidewalk edge: a narrow old street
    var asph = wet ? COL.asphaltWet : COL.asphalt;
    return function (x, z, o, dist) {
      var ax = x < 0 ? -x : x, near = dist < 32;
      var dc = cross == null ? 99 : Math.abs(z - cross);
      if (ax < RD || dc < RD) {
        set(o, asph);
        if (near) { var q = h2(Math.floor(x * 4), Math.floor(z * 4)); if (q < 0.12) set(o, COL.asphaltLo); else if (q > 0.94) set(o, COL.asphaltHi); }
        if (dc < RD && ax > RD) return;
        if (dc >= RD && ax < 0.08 && (((z % 6) + 6) % 6) < 3) set(o, COL.yellow);
        if (cross != null && dc < RD + 1.3 && dc > RD + 0.1 && ax < RD && (((x + 40) % 1.1) < 0.55)) set(o, COL.white);
        if (se === "winter" && P.snowy && near && h2(Math.floor(x * 2), Math.floor(z * 2)) > 0.8) set(o, COL.snowLo);
        return;
      }
      if (cross != null && dc < CB && ax >= RD) { // corners of the cross street: curb
        set(o, COL.curb); return;
      }
      if (ax < CB && dc >= CB) { set(o, ax < RD + 0.12 ? COL.gutter : COL.curb); return; }
      var inWalk = ax < WK || (cross != null && dc < WK);
      // driveways
      for (var i = 0; i < drives.length; i++) {
        var d = drives[i];
        if ((x < 0) === (d.side < 0) && z > d.z0 && z < d.z1 && ax < d.x1) {
          set(o, COL.drive);
          if (near && Math.abs(z - (d.z0 + d.z1) / 2) < 0.06) set(o, COL.driveLn);
          if (inWalk && near && Math.abs(ax - WK) < 0.05) set(o, COL.driveLn);
          return;
        }
      }
      if (inWalk) {
        set(o, COL.walk);
        if (near && ((((z + 0.3) % 1.6) + 1.6) % 1.6) < 0.07) set(o, COL.walkLn);
        if (se === "winter" && P.snowy && near && h2(Math.floor(x * 3), Math.floor(z * 3)) > 0.7) set(o, COL.snowLo);
        return;
      }
      for (var j = 0; j < patches.length; j++) {
        var p = patches[j];
        if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) { patchMat(o, p.mat, x, z, near, se); return; }
      }
      lawn(o, x, z, dist, se);
    };
  }
  function patchMat(o, mat, x, z, near, se) {
    var q = near ? h2(Math.floor(x * 3), Math.floor(z * 3)) : 0.5;
    if (mat === "dirt") { set(o, q < 0.15 ? COL.dirtLo : q > 0.9 ? COL.dirtHi : COL.dirt); if (q > 0.97) set(o, COL.pebble); return; }
    if (mat === "mulch") { set(o, q < 0.3 ? U.dk(COL.mulch, 0.85) : COL.mulch); return; }
    if (mat === "rubber") { set(o, ((Math.floor(x) + Math.floor(z)) & 1) ? COL.rubber : U.dk(COL.rubber, 0.9)); return; }
    if (mat === "plaza") { set(o, ((Math.floor(x * 0.9) + Math.floor(z * 0.9)) & 1) ? COL.plaza : COL.plazaLn); return; }
    if (mat === "beds") { set(o, (Math.floor(z * 0.7) & 1) ? [110, 82, 56] : (se === "winter" ? COL.snow : COL.grassDk)); return; }
    lawn(o, x, z, near ? 10 : 50, se);
  }

  // ---------- mesh helpers ----------
  var WALLS = ["#e0d8c8", "#c8b8a0", "#9aa8b0", "#b85a4a", "#e8e0d0", "#7a8a7a", "#d8c098", "#a8b8c8", "#c8a888", "#8a7a8a"];
  var ROOFS = ["#4a4d54", "#5a4a42", "#6a3a32", "#3a4a5a", "#4a5a4a", "#5a5a5e"];
  function windowCol(E, r, litP) {
    if (E.tod === "night") return r() < (litP == null ? 0.45 : litP) ? ["#ffcf7a", true] : ["#1a2038", false];
    if (E.tod === "dusk") return r() < 0.3 ? ["#f2b060", true] : ["#6a7090", false];
    return ["#9fc0d8", false];
  }
  // a house facing the street. side -1 = left side (front faces +x)
  var TRIMS = ["#f1efe9", "#f1efe9", "#2a3a4a", "#5a3a2a", "#e8e0c8"], SHUT = ["#2f5a7a", "#3a6a4a", "#7a3a3a", "#2a2a30", "#c8a040"];
  function house(E, r, side, zc, o) {
    o = o || {};
    var m = new Mesh(), fx = o.fx || (6.4 + r() * 1.4), w = o.w || (7 + r() * 3), d = o.d || (7 + r() * 1.6), h = o.h || (3.2 + r() * 0.5) * (r() < 0.55 ? 2 : 1);
    var x0 = side < 0 ? -(fx + w) : fx, x1 = side < 0 ? -fx : fx + w, z0 = zc - d / 2, z1 = zc + d / 2;
    var wall = o.wall || U.pick(r, WALLS), roof = o.roof || U.pick(r, ROOFS), trim = U.pick(r, TRIMS), shut = r() < 0.5 ? U.pick(r, SHUT) : null;
    var face = side < 0 ? "e" : "w";
    var dec = [], two = h > 5;
    // siding lines or brick courses so walls aren't flat
    if (r() < 0.5) for (var sl = 1; sl < (two ? 14 : 7); sl++) dec.push([0, sl / (two ? 14 : 7) - 0.006, 1, sl / (two ? 14 : 7), U.dk(U.hx(wall), 0.9)]);
    var rows = two ? [[0.14, 0.38], [0.6, 0.84]] : [[0.3, 0.7]];
    var garage = o.garage != null ? o.garage : r() < 0.45;
    rows.forEach(function (rw, ri) {
      var cols = ri === 0 && garage ? [[0.08, 0.28]] : [[0.08, 0.28], [0.62, 0.86]];
      if (ri === 1) cols = r() < 0.3 ? [[0.1, 0.9]] : [[0.12, 0.36], [0.62, 0.86]];
      cols.forEach(function (cl) {
        var wc = windowCol(E, r);
        if (shut && cl[1] - cl[0] < 0.4) { dec.push([cl[0] - 0.07, rw[0], cl[0] - 0.025, rw[1], shut]); dec.push([cl[1] + 0.025, rw[0], cl[1] + 0.07, rw[1], shut]); }
        dec.push([cl[0] - 0.02, rw[0] - 0.03, cl[1] + 0.02, rw[1] + 0.03, trim]);
        dec.push([cl[0], rw[0], cl[1], rw[1], wc[0], wc[1]]);
        dec.push([(cl[0] + cl[1]) / 2 - 0.006, rw[0], (cl[0] + cl[1]) / 2 + 0.006, rw[1], trim]);
        if (ri === 0 && r() < 0.5) { dec.push([cl[0] - 0.02, rw[0] - 0.09, cl[1] + 0.02, rw[0] - 0.03, "#7a5034"]); dec.push([cl[0], rw[0] - 0.07, cl[1], rw[0] - 0.04, U.pick(r, ["#d8423e", "#e8b830", "#c86aa8", "#5b8a4f"])]); }
      });
    });
    var doorU = garage ? 0.36 : 0.42, doorTop = two ? 0.33 : 0.62;
    dec.push([doorU - 0.015, 0, doorU + 0.135, doorTop + 0.02, trim]);
    dec.push([doorU, 0, doorU + 0.12, doorTop, o.door || U.pick(r, ["#a8663c", "#3a5a7a", "#7a3a3a", "#3a6a4a", "#e8c040", "#c8402a"])]);
    if (garage) {
      dec.push([0.54, 0, 0.95, two ? 0.36 : 0.7, "#e4e0d8"]);
      for (var g = 1; g < 4; g++) dec.push([0.54, (two ? 0.36 : 0.7) * g / 4 - 0.01, 0.95, (two ? 0.36 : 0.7) * g / 4, "#c8c4bc"]);
    }
    var lit = E.tod !== "day";
    if (lit) dec.push([doorU + 0.14, doorTop - 0.06, doorU + 0.17, doorTop - 0.01, "#ffe2a0", true]);
    var decs = {}; decs[face] = dec;
    m.box(x0, x1, 0, h, z0, z1, wall, decs);
    var axis = o.axis || (r() < 0.5 ? "x" : "z");
    m.gable(x0, x1, z0, z1, h, 1.6 + r() * 1.4, axis, roof, wall, 0.5);
    // a front porch with a little roof and two posts
    var fxx = side < 0 ? x1 : x0, out = side < 0 ? 1 : -1;
    if (!garage || r() < 0.5) {
      var pz0 = z0 + d * (side < 0 ? doorU - 0.12 : 1 - doorU - 0.25), pz1 = pz0 + d * 0.38, px = fxx + out * 1.3;
      m.box(Math.min(fxx, px), Math.max(fxx, px), 0, 0.35, pz0, pz1, "#b8b0a0");
      m.box(Math.min(fxx, px) - 0.1, Math.max(fxx, px) + 0.1, 2.4, 2.6, pz0 - 0.15, pz1 + 0.15, U.dk(U.hx(roof), 1.1));
      [pz0 + 0.1, pz1 - 0.2].forEach(function (zz) { m.box(px - 0.08 - (out > 0 ? 0.1 : 0), px + 0.08 - (out > 0 ? 0.1 : 0), 0.35, 2.4, zz, zz + 0.12, trim); });
    }
    if (r() < 0.45) { var cx = side < 0 ? x0 + w * 0.3 : x1 - w * 0.3; m.box(cx - 0.4, cx + 0.4, h, h + 2.6, zc + d * 0.2, zc + d * 0.2 + 0.8, U.pick(r, ["#8a5a4a", "#6a6a6e"])); }
    m.done();
    var res = { m: m, solid: [x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2], door: { x: side < 0 ? x1 + 0.6 : x0 - 0.6, z: z0 + d * (1 - doorU - 0.06) }, front: fxx };
    if (side > 0) res.door.z = z1 - d * (doorU + 0.06);
    if (lit) res.light = { x: res.door.x + side * -0.4, z: res.door.z, r: 5, i: 0.9, c: [1, 0.82, 0.55] };
    res.drive = garage ? { side: side, z0: side < 0 ? z0 + d * 0.54 : z1 - d * 0.95, z1: side < 0 ? z0 + d * 0.95 : z1 - d * 0.54, x1: fx } : null;
    return res;
  }
  // a picket fence or a low stone wall along the front of a lot
  function frontage(m, r, side, z0, z1, kind) {
    var x = side * 5.25;
    if (kind === "fence") {
      m.box(x - 0.04, x + 0.04, 0.5, 0.62, z0, z1, "#f2efe6");
      for (var z = z0; z < z1; z += 0.45) m.box(x - 0.05, x + 0.05, 0, 0.9, z, z + 0.16, "#f2efe6");
    } else m.box(x - 0.25, x + 0.25, 0, 0.55, z0, z1, { all: "#9f9d97", t: "#bab8b2" });
  }
  // our house, as seen on the landing page: front gable, dark siding, brick band, open garage, tall stucco tower
  function homeHouse(E) {
    var m = new Mesh(), night = E.tod === "night", x0 = -21, x1 = -10, z0 = -5, z1 = 6, h = 7;
    var wc = night ? ["#ffcf7a", true] : E.tod === "dusk" ? ["#f2b060", true] : ["#9fc0d8", false];
    var dark = night ? "#1a2038" : "#9fc0d8";
    var dec = [
      [0, 0.38, 1, 0.5, "#3a3d42"], [0, 0.5, 1, 1, "#43464c"], [0, 0, 1, 0.38, "#c3c4c0"],
      [0, 0.495, 1, 0.505, "#232529"],
      // open garage: interior, raised door, a warm bulb
      [0.5, 0, 0.94, 0.45, night ? "#8a6a48" : "#7a7060", night], [0.48, 0, 0.5, 0.47, "#55585f"], [0.94, 0, 0.96, 0.47, "#55585f"], [0.48, 0.45, 0.96, 0.47, "#55585f"],
      [0.51, 0.4, 0.93, 0.44, "#4a4d54"], [0.6, 0.06, 0.88, 0.3, night ? "#6a5038" : "#a39884", night], [0.62, 0.18, 0.7, 0.24, "#9a7c58", night],
      [0.7, 0.36, 0.72, 0.39, "#fff1c4", true],
      // windows: wide one left, the cat's window over the garage, lower one behind shrubs
      [0.08, 0.6, 0.44, 0.84, "#f1efe9"], [0.1, 0.62, 0.42, 0.82, wc[0], wc[1]], [0.255, 0.62, 0.265, 0.82, "#f1efe9"],
      [0.6, 0.6, 0.86, 0.84, "#f1efe9"], [0.62, 0.62, 0.84, 0.82, dark, false], [0.62, 0.72, 0.84, 0.82, night ? "#d27a2c" : "#c8d8e4", night],
      [0.12, 0.12, 0.36, 0.3, "#f1efe9"], [0.14, 0.14, 0.34, 0.28, wc[0], wc[1]],
      // sconce by the garage
      [0.44, 0.36, 0.46, 0.42, "#1e1f23"], [0.44, 0.355, 0.46, 0.365, "#d2c8aa", night]
    ];
    m.box(x0, x1, 0, h, z0, z1, { all: "#43464c", e: "#43464c" }, { e: dec });
    m.gable(x0, x1, z0, z1, h, 1.8, "x", "#3a3c42", "#43464c", 0.6);
    // the tower behind, to the left, with a shed roof
    var tx0 = -20, tx1 = -12.5, tz0 = -10.5, tz1 = -5;
    m.box(tx0, tx1, 0, 10.5, tz0, tz1, "#b9bcbb", { e: [[0.18, 0.62, 0.42, 0.8, "#f1efe9"], [0.2, 0.64, 0.4, 0.78, wc[0], wc[1]], [0.58, 0.6, 0.8, 0.76, "#f1efe9"], [0.6, 0.62, 0.78, 0.74, dark], [0.62, 0, 0.82, 0.38, "#a8663c"], [0.44, 0, 0.56, 0.4, night ? "#1a2038" : "#3a404a"]] });
    m.poly([[tx0 - 0.4, 10.5, tz0 - 0.4], [tx1 + 0.8, 10.0, tz0 - 0.4], [tx1 + 0.8, 10.0, tz1 + 0.2], [tx0 - 0.4, 10.5, tz1 + 0.2]], "#232529");
    // porch landing and stair
    m.box(-12.5, -10, 0, 0.6, -5, -2.2, "#4a4d54");
    m.done();
    return { m: m, solids: [[x0, x1, z0, z1], [tx0, tx1, tz0, tz1]], drive: { side: -1, z0: 0.3, z1: 5.3, x1: 10 }, light: night ? { x: -9.3, z: 2.8, r: 9, i: 1.1, c: [1, 0.8, 0.55] } : null };
  }
  var CARS = ["#3f6fa3", "#c8473f", "#e8e4dc", "#3a3a40", "#7a8a6a", "#c8a040", "#8a8e96", "#5a3a5a"];
  function car(E, x, z, col, axis, opts) {
    opts = opts || {};
    var m = new Mesh(), L = opts.len || 4.2, Wd = opts.wid || 1.8, h1 = 1.0, h2v = opts.tall ? 2.4 : 1.6;
    var hz = axis === "x" ? Wd / 2 : L / 2, hxw = axis === "x" ? L / 2 : Wd / 2;
    var x0 = x - hxw, x1 = x + hxw, z0 = z - hz, z1 = z + hz, glass = E.tod === "night" ? "#1a2038" : "#3a4a5a";
    var wheel = "#1e1e22";
    var sideDec = [[0.12, 0, 0.3, 0.32, wheel], [0.7, 0, 0.88, 0.32, wheel], [0, 0.04, 1, 0.12, U.dk(hx(col), 0.6)]];
    var endF = [[0.08, 0.5, 0.26, 0.7, E.tod === "day" ? "#f2f0e0" : "#fff4c0", E.tod !== "day"], [0.74, 0.5, 0.92, 0.7, E.tod === "day" ? "#f2f0e0" : "#fff4c0", E.tod !== "day"]];
    var endB = [[0.08, 0.5, 0.24, 0.7, "#c8302a", E.tod !== "day"], [0.76, 0.5, 0.92, 0.7, "#c8302a", E.tod !== "day"]];
    var dec = axis === "x" ? { n: sideDec, s: sideDec, e: endF, w: endB } : { e: sideDec, w: sideDec, n: endF, s: endB };
    if (opts.decals) Object.keys(opts.decals).forEach(function (k) { dec[k] = (dec[k] || []).concat(opts.decals[k]); });
    m.box(x0, x1, 0.25, h1, z0, z1, col, dec);
    if (opts.tall) {
      var cd = opts.cabDec || {};
      m.box(x0 + (axis === "x" ? 0 : 0.05), x1 - (axis === "x" ? 0 : 0.05), h1, h2v, z0 + (axis === "x" ? 0.05 : 0), z1 - (axis === "x" ? 0.05 : 0), col, cd);
    } else {
      var inset = 0.9, ci = 0.12;
      var cz0 = axis === "x" ? z0 + ci : z0 + inset, cz1 = axis === "x" ? z1 - ci : z1 - inset * 1.1, cx0 = axis === "x" ? x0 + inset : x0 + ci, cx1 = axis === "x" ? x1 - inset * 1.1 : x1 - ci;
      var gw = [[0.08, 0.1, 0.92, 0.9, glass]];
      m.box(cx0, cx1, h1, h2v, cz0, cz1, col, { n: gw, s: gw, e: gw, w: gw });
    }
    m.done();
    return { m: m, solid: [x0 - 0.15, x1 + 0.15, z0 - 0.15, z1 + 0.15] };
  }
  function pole(x, z) {
    var m = new Mesh();
    m.box(x - 0.13, x + 0.13, 0, 7.6, z - 0.13, z + 0.13, "#6a5038");
    m.box(x - 0.9, x + 0.9, 7.0, 7.2, z - 0.1, z + 0.1, "#5a4030");
    m.done();
    return m;
  }

  // ---------- static sprite props ----------
  function prop(spr, x, z, h, o) { o = o || {}; return { k: "spr", spr: spr, x: x, z: z, y: o.y || 0, h: h, flip: !!o.flip, shadow: o.shadow !== false, emit: o.emit, id: o.id }; }
  function treeProp(E, r, x, z, big) {
    var se = E.season, v = (r() * 9) | 0;
    if (r() < 0.25) return prop(S.pine(v, se === "winter" && E.snowy), x, z, big ? 9 : 6.5 + r() * 2);
    return prop(S.tree(se, v, se === "winter" && E.snowy), x, z, big ? 10 : 6 + r() * 2.5);
  }

  // ---------- the street (Node 1) ----------
  function street(E, save, opt) {
    var r = U.rng(opt.seed || 1234), sc = base("street", E);
    var cross = 124;
    var drives = [], home = homeHouse(E);
    sc.meshes.push(home.m); home.solids.forEach(function (s2) { sc.solids.push(s2); });
    drives.push(home.drive);
    if (home.light) sc.lights.push(home.light);
    sc.marks.home = { x: -9.5, z: 2.8 };
    sc.props.push(prop(S.tree(E.season, 3, E.season === "winter" && E.snowy), -11, -8.5, 11));
    sc.props.push(prop(S.pine(2, E.snowy), -23, 9, 10), prop(S.pine(5, E.snowy), -24, -3, 11), prop(S.pine(1, E.snowy), -16, 10, 9));
    [-6.5, -8.0].forEach(function (zz, i) { sc.props.push(prop(S.bush(E.season, i), -10.6, zz + 1.4 * i - 2, 1.0)); });
    // houses shoulder to shoulder, both sides, the right side leaving a gap across from home
    var L = [], Rt = [];
    for (var z = -30; z < 116; z += 9.5 + r() * 2) if (z < -7 || z > 9) L.push(z);
    for (var z2 = -26; z2 < 116; z2 += 9 + r() * 2.5) if (z2 < -5 || z2 > 8) Rt.push(z2);
    [138, 150, 162].forEach(function (zz) { L.push(zz); Rt.push(zz + 4); });
    L.map(function (z3) { return [-1, z3]; }).concat(Rt.map(function (z3) { return [1, z3]; })).forEach(function (hz) {
      var hh = house(E, r, hz[0], hz[1]);
      sc.meshes.push(hh.m); sc.solids.push(hh.solid);
      if (hh.drive) drives.push(hh.drive);
      if (hh.light) sc.lights.push(hh.light);
      sc.doors.push(hh.door);
      var fm = new Mesh(), q = r(), d2 = hh.drive;
      if (q < 0.55 && hz[1] < cross - 8) {
        var zA = hz[1] - 4.5, zB = hz[1] + 4.5;
        if (d2) { if (d2.z0 - zA > 0.6) frontage(fm, r, hz[0], zA, d2.z0 - 0.2, q < 0.3 ? "fence" : "wall"); }
        else frontage(fm, r, hz[0], zA, zB, q < 0.3 ? "fence" : "wall");
        if (fm.polys.length) { fm.done(); sc.meshes.push(fm); }
      }
      if (r() < 0.45) sc.props.push(prop(S.bush(E.season, (r() * 5) | 0), hz[0] * 5.8, hz[1] + (r() - 0.5) * 5, 1.0 + r() * 0.5));
      if (r() < 0.35) sc.props.push(prop(S.mailbox(), hz[0] * 4.85, hz[1] - 2.5, 1.1));
    });
    // the cross street at the corner, with its own row of houses and parked cars
    [[-20, 1], [-30, 1], [-40, 1], [20, 1], [30, 1], [40, 1], [-20, -1], [-30, -1], [20, -1], [30, -1], [40, -1]].forEach(function (p) {
      var zc = cross + p[1] * 9.5, m = new Mesh(), w = 8, d = 7, hh2 = 3.4 + r() * 3.4;
      m.box(p[0] - w / 2, p[0] + w / 2, 0, hh2, zc - d / 2, zc + d / 2, U.pick(r, WALLS), {});
      m.gable(p[0] - w / 2, p[0] + w / 2, zc - d / 2, zc + d / 2, hh2, 1.8, "z", U.pick(r, ROOFS), U.pick(r, WALLS));
      m.done(); sc.meshes.push(m);
    });
    [-11, -18, 12, 19, 27].forEach(function (x, i) { var cc = car(E, x, cross + (i % 2 ? 2.55 : -2.55), U.pick(r, CARS), "x"); sc.meshes.push(cc.m); });
    sc.props.push(prop(S.sign("street"), -4.3, cross - 4.4, 3.2), prop(S.sign("trail"), -4.6, cross - 5.2, 2.0, { id: "trailsign" }), prop(S.sign("stop"), 4.3, cross - 4.4, 2.6));
    // parked cars nose to tail along both curbs, the way they are on the real street
    [-1, 1].forEach(function (side) {
      for (var cz = -28; cz < cross - 7; cz += 5.2 + r() * 3) {
        if (side < 0 && cz > -5 && cz < 9) continue;
        if (drives.some(function (dr) { return (dr.side < 0) === (side < 0) && cz + 2.3 > dr.z0 && cz - 2.3 < dr.z1; })) continue;
        if (r() < 0.22) continue;
        var cc2 = car(E, side * 2.5, cz, U.pick(r, CARS), "z", { tall: r() < 0.25, len: 4.0 + r() * 0.8 });
        sc.meshes.push(cc2.m); sc.marks["car" + sc.meshes.length] = { x: side * 2.5, z: cz, side: side };
      }
    });
    // big old trees in the parking strip, their crowns meeting over the street
    for (var tz = -30; tz < cross - 6; tz += 7 + r() * 4) {
      [-1, 1].forEach(function (s3) {
        var zz = tz + (s3 > 0 ? 3.5 : 0) + r() * 2;
        if (s3 < 0 && zz > -10 && zz < 8) return;
        if (r() < 0.2) return;
        sc.props.push(r() < 0.18 ? prop(S.pine((r() * 9) | 0, E.snowy), s3 * 5.6, zz, 9 + r() * 3) : prop(S.tree(E.season, (r() * 9) | 0, E.season === "winter" && E.snowy), s3 * 5.5, zz, 10 + r() * 4));
      });
    }
    var poles = [-20, 4, 28, 52, 76, 100];
    poles.forEach(function (z4) { sc.meshes.push(pole(5.0, z4)); });
    for (var p2 = 0; p2 + 1 < poles.length; p2++) {
      [-0.75, 0.75].forEach(function (o) {
        var a = [5.0 + o, 7.2, poles[p2]], b = [5.0 + o, 7.2, poles[p2 + 1]], mid = [5.0 + o, 6.6, (poles[p2] + poles[p2 + 1]) / 2];
        sc.lines.push({ k: "line", a: a, b: mid, c: "#2a2a2e" }, { k: "line", a: mid, b: b, c: "#2a2a2e" });
      });
    }
    sc.marks.wire = { x: 5.75, y: 6.62, z: 40 };
    [22, 58, 94].forEach(function (z5) { lamp(sc, E, -4.6, z5); });
    sc.props.push(prop(S.hydrant(), 4.1, 47, 0.8), prop(S.hydrant(), -4.1, 86, 0.8));
    sc.ground = streetGround({ season: E.season, wet: E.wet, snowy: E.snowy, cross: cross, drives: drives });
    sc.drives = drives;
    sc.cross = cross;
    sc.lanes = 1; sc.laneW = 1.05;
    if (opt.mode === "return") { sc.dir = -1; sc.zMin = 2.8; sc.zMax = cross; }
    else { sc.dir = 1; sc.zMin = -20; sc.zMax = cross - 1; }
    sc.marks.event = { z: 54 };
    return sc;
  }
  function lamp(sc, E, x, z) {
    var on = E.tod !== "day";
    sc.props.push(prop(S.streetlight(on), x, z, 5.2, { emit: false }));
    if (on) { sc.lights.push({ x: x + (x < 0 ? 1.2 : -1.2), z: z, r: 8, i: 1.0, c: [1, 0.86, 0.6] }); sc.glows.push({ x: x + (x < 0 ? 0.25 : -0.25), y: 5.05, z: z }); }
  }

  function base(kind, E) {
    return { kind: kind, E: E, meshes: [], props: [], actors: [], solids: [], posts: [], lines: [], lights: [], glows: [], doors: [], marks: {}, triggers: [], particles: [], lotsAt: [] };
  }

  // ---------- a wander block (B1) ----------
  function block(E, save, opt) {
    var r = U.rng(opt.seed || 99), sc = base("block", E), lots = opt.lots || [], len = 96, cross = len + 6;
    var patches = [], drives = [];
    // three lots per side, 30 long each, from z = 4
    var slots = [[-1, 4], [1, 4], [-1, 34], [1, 34], [-1, 64], [1, 64]];
    var li = 0;
    slots.forEach(function (sl, i) {
      var side = sl[0], z0 = sl[1], lot = (i % 2 === 0 || i === 3) && li < lots.length ? lots[li++] : null;
      if (lot) { buildLot(sc, E, r, lot, side, z0, patches); sc.lotsAt.push({ side: side, z0: z0, z1: z0 + 30, lot: lot }); }
      else { [z0 + 7, z0 + 22].forEach(function (zz) { var hh = house(E, r, side, zz); sc.meshes.push(hh.m); sc.solids.push(hh.solid); if (hh.drive) drives.push(hh.drive); if (hh.light) sc.lights.push(hh.light); }); }
    });
    // houses behind you and past the corner
    [-12, cross + 16].forEach(function (zz) { [-1, 1].forEach(function (s) { var hh = house(E, r, s, zz); sc.meshes.push(hh.m); sc.solids.push(hh.solid); }); });
    for (var z = 10; z < len; z += 22) lamp(sc, E, (z / 22) % 2 < 1 ? 4.6 : -4.6, z);
    var carN = 2 + ((r() * 3) | 0);
    for (var c = 0; c < carN + 3; c++) { var s2 = r() < 0.5 ? -1 : 1, zz2 = 4 + r() * 86, cc = car(E, s2 * 2.5, zz2, U.pick(r, CARS), "z"); sc.meshes.push(cc.m); }
    [[-24, cross], [24, cross]].forEach(function (p) { var m = new Mesh(); m.box(p[0] - 5, p[0] + 5, 0, 4 + r() * 4, p[1] + 7, p[1] + 16, U.pick(r, WALLS)); m.done(); sc.meshes.push(m); });
    sc.ground = streetGround({ season: E.season, wet: E.wet, snowy: E.snowy, cross: cross, drives: drives, patches: patches });
    sc.cross = cross;
    sc.lanes = 1; sc.laneW = 1.05; sc.dir = opt.reverse ? -1 : 1; sc.zMin = -8; sc.zMax = cross - 1;
    for (var tz = 2; tz < len; tz += 9 + r() * 6) { var s4 = r() < 0.5 ? -1 : 1; if (!sc.lotsAt.some(function (l) { return l.side === s4 && tz > l.z0 && tz < l.z1 && l.lot.kind !== "park"; })) sc.props.push(treeProp(E, r, s4 * 5.5, tz, true)); }
    return sc;
  }
  function buildLot(sc, E, r, lot, side, z0, patches) {
    var night = E.tod === "night", fx = 5.2, X = function (d) { return side * (fx + d); }, zc = z0 + 15;
    var kind = lot.kind;
    function addMesh(m) { m.done(); sc.meshes.push(m); return m; }
    function shopFront(name, wallC, awn, open) {
      var m = new Mesh(), w = 9, d = 22, h = 5;
      var x0 = side < 0 ? -(fx + 3 + w) : fx + 3, x1 = x0 + w, face = side < 0 ? "e" : "w";
      var lit = night ? (open ? ["#ffd890", true] : ["#2a3050", false]) : ["#9fc0d8", false];
      var dec = [[0.08, 0.12, 0.44, 0.62, "#f1efe9"], [0.1, 0.14, 0.42, 0.6, lit[0], lit[1]], [0.56, 0.12, 0.92, 0.62, "#f1efe9"], [0.58, 0.14, 0.9, 0.6, lit[0], lit[1]],
        [0.45, 0, 0.55, 0.6, "#5a3a2a"], [0.08, 0.7, 0.92, 0.88, awn || "#2f5a7a"], [0.12, 0.74, 0.88, 0.84, night && open ? "#ff8a6a" : "#f2eee0", night && open]];
      var decs = {}; decs[face] = dec;
      m.box(x0, x1, 0, h, zc - d / 2, zc + d / 2, wallC, decs);
      m.box(x0 - 0.2, x1 + 0.2, h, h + 0.6, zc - d / 2 - 0.2, zc + d / 2 + 0.2, U.dk(hx(wallC), 0.7));
      addMesh(m); sc.solids.push([x0, x1, zc - d / 2, zc + d / 2]);
      patches.push({ x0: Math.min(X(0), X(3)), x1: Math.max(X(0), X(3)), z0: z0, z1: z0 + 30, mat: "plaza" });
      if (night && open) sc.lights.push({ x: X(2), z: zc, r: 9, i: 0.9, c: [1, 0.75, 0.55] });
    }
    if (kind === "park") {
      patches.push({ x0: Math.min(X(0), X(20)), x1: Math.max(X(0), X(20)), z0: z0, z1: z0 + 30, mat: lot.id === "garden" ? "beds" : "grass" });
      for (var i = 0; i < 5; i++) { var tx = X(3 + r() * 14), tz = z0 + 3 + r() * 24; sc.props.push(treeProp(E, r, tx, tz, r() < 0.3)); sc.posts.push({ x: tx, z: tz, r: 0.45 }); }
      sc.props.push(prop(S.bench(), X(1.2), zc, 0.9));
      if (lot.id === "garden") for (var f = 0; f < 6; f++) sc.props.push(prop(S.flower(E.season === "autumn" ? "aster" : "sunflower"), X(2 + f * 1.4), zc + 4, 1.4));
      if (!night) sc.actors.push({ npc: true, look: { shirt: "#c8a0c0", pants: "#4a4a5a", hair: "#2a2026", hat: "none", pack: "none" }, x: X(5), z: zc - 3, heading: side < 0 ? Math.PI / 2 : -Math.PI / 2, sit: true });
    } else if (kind === "cafe") {
      var open = !night || lot.nightOnly;
      shopFront(lot.name, lot.nightOnly ? "#c8c8d0" : "#c8a888", lot.nightOnly ? "#a83a3a" : "#3a6a4a", open);
      if (open) [-6, 0, 6].forEach(function (dz) { sc.props.push(prop(S.cafeTable(), X(1.6), zc + dz, 1.6)); });
    } else if (kind === "shop") {
      shopFront(lot.name, "#a85a4a", "#c8a040", false);
      sc.props.push(prop(S.cat(0, true), X(2.6), zc - 3, 0.5, { shadow: false }));
    } else if (kind === "library") {
      var m = new Mesh(), x0 = side < 0 ? -(fx + 5 + 12) : fx + 5, x1 = x0 + 12, face = side < 0 ? "e" : "w", lt = night ? ["#2a3050", false] : ["#9fc0d8", false];
      var dec = [];
      for (var cI = 0; cI < 5; cI++) dec.push([0.1 + cI * 0.18, 0, 0.14 + cI * 0.18, 0.7, "#e8e4dc"]);
      dec.push([0.3, 0.2, 0.42, 0.6, lt[0]], [0.58, 0.2, 0.7, 0.6, lt[0]], [0.44, 0, 0.56, 0.5, "#5a3a2a"], [0.05, 0.76, 0.95, 0.9, "#c8c0b0"]);
      var dd = {}; dd[face] = dec;
      m.box(x0, x1, 0, 7.5, zc - 12, zc + 12, "#b8aea0", dd); m.gable(x0, x1, zc - 12, zc + 12, 7.5, 2.4, "x", "#5a5a5e", "#c8c0b0", 0.6);
      addMesh(m); sc.solids.push([x0, x1, zc - 12, zc + 12]);
      patches.push({ x0: Math.min(X(0), X(5)), x1: Math.max(X(0), X(5)), z0: z0, z1: z0 + 30, mat: "plaza" });
      sc.props.push(prop(S.streetlight(night), X(4), zc - 4, 3), prop(S.streetlight(night), X(4), zc + 4, 3));
    } else if (kind === "construction") {
      patches.push({ x0: Math.min(X(0), X(22)), x1: Math.max(X(0), X(22)), z0: z0, z1: z0 + 30, mat: "dirt" });
      var dg = new Mesh(), dx = X(9);
      dg.box(dx - 2, dx + 2, 0.6, 2.2, zc - 1.6, zc + 1.6, "#e8b830", {});
      dg.box(dx - 1.6, dx + 1.6, 0, 0.6, zc - 2.2, zc + 2.2, "#3a3a3e");
      dg.box(dx - 1.2, dx + 0.6, 2.2, 3.6, zc - 1.2, zc + 0.6, "#e8b830", { n: [[0.1, 0.2, 0.9, 0.9, "#3a4a5a"]], s: [[0.1, 0.2, 0.9, 0.9, "#3a4a5a"]] });
      dg.box(dx - 0.25, dx + 0.25, 2.0, 2.4, zc + 1.6, zc + 5.4, "#d8a020");
      dg.box(dx - 0.25, dx + 0.25, 0.4, 2.4, zc + 5.0, zc + 5.6, "#d8a020");
      dg.box(dx - 0.8, dx + 0.8, 0, 0.7, zc + 5.2, zc + 6.4, "#5a5a60");
      addMesh(dg); sc.solids.push([dx - 2.2, dx + 2.2, zc - 2.4, zc + 6.6]);
      for (var k = 0; k < 7; k++) sc.props.push(prop(S.cone(), X(0.4), z0 + 3 + k * 4, 0.75));
      var pile = new Mesh(); pile.gable(X(15) - 3, X(15) + 3, zc - 8, zc - 2, 0, 2.5, "z", "#9a7a52", "#8a6a48", 0); addMesh(pile);
    } else if (kind === "playground") {
      patches.push({ x0: Math.min(X(0), X(16)), x1: Math.max(X(0), X(16)), z0: z0, z1: z0 + 30, mat: "mulch" });
      var px = X(6), pz = zc - 4, sw = new Mesh();
      sw.box(px - 0.1, px + 0.1, 0, 3, pz - 2.6, pz - 2.4, "#c8402a"); sw.box(px - 0.1, px + 0.1, 0, 3, pz + 2.4, pz + 2.6, "#c8402a");
      sw.box(px - 0.12, px + 0.12, 2.9, 3.1, pz - 2.6, pz + 2.6, "#c8402a");
      addMesh(sw);
      sc.actors.push({ swing: true, x: px, z: pz - 1, top: 2.9 }, { swing: true, x: px, z: pz + 1, top: 2.9, still: true });
      var sl = new Mesh(), sx2 = X(11), sz2 = zc + 6;
      sl.box(sx2 - 0.8, sx2 + 0.8, 0, 2.2, sz2 - 0.8, sz2 + 0.8, "#3a6aa0");
      sl.poly([[sx2 - 0.6, 2.2, sz2 + 0.8], [sx2 + 0.6, 2.2, sz2 + 0.8], [sx2 + 0.6, 0.1, sz2 + 4.4], [sx2 - 0.6, 0.1, sz2 + 4.4]], "#e8b830", { two: true });
      addMesh(sl); sc.solids.push([sx2 - 0.9, sx2 + 0.9, sz2 - 0.9, sz2 + 4.4]);
    }
  }

  // ---------- the trail (C0, C1, C2/C6) ----------
  function trailX(z) { var s2 = Math.max(0, z - 26), k = Math.min(1, s2 / 25); return (Math.sin(s2 * 0.055) * 6 + Math.sin(s2 * 0.019) * 9) * k; }
  // the climb: steady uphill with switchback swells; the path is cut into a hillside that
  // rises on one side and drops away on the other, swapping sides as it twists
  function trailBase(z) { var s2 = Math.max(0, z - 22); return s2 * 0.17 + Math.sin(s2 * 0.045) * 2.2 * Math.min(1, s2 / 30); }
  function trailH(x, z) {
    var b = trailBase(z);
    if (z < 22) return 0;
    var off = x - trailX(z), a = Math.abs(off) - 1.5;
    if (a <= 0) return b;
    var up = Math.sin(z * 0.022 + 0.8) > 0 ? 1 : -1;
    var rise = off * up > 0 ? Math.pow(a, 1.1) * 0.42 : -a * 0.4;
    return b + rise + Math.sin(x * 0.6) * Math.sin(z * 0.45) * 0.35 * Math.min(1, a);
  }
  function trailGround(E) {
    var se = E.season, wet = E.wet;
    return function (x, z, o, dist) {
      var near = dist < 30;
      if (z < 22 && Math.abs(x) < 4.2) { set(o, wet ? COL.asphaltWet : COL.asphalt); if (near && z > 20.5 && Math.abs(x) < 4) set(o, COL.yellow); return; }
      if (z < 22 && x > 4.2 && x < 13 && z > 2) { set(o, COL.asphaltLo); if (near && (((z % 3) + 3) % 3) < 0.12) set(o, COL.white); return; }
      var cx = trailX(z), d = Math.abs(x - cx), q = near ? h2(Math.floor(x * 3), Math.floor(z * 3)) : 0.5;
      var w = 1.15 + 0.25 * Math.sin(z * 0.2);
      if (z >= 20 && d < w) {
        if (se === "winter" && E.snowy) { set(o, q < 0.4 ? COL.snowLo : [214, 206, 196]); return; }
        set(o, q < 0.14 ? COL.dirtLo : q > 0.88 ? COL.dirtHi : COL.dirt);
        if (q > 0.965) set(o, COL.pebble);
        if (wet) { o[0] *= 0.85; o[1] *= 0.85; o[2] *= 0.88; }
        return;
      }
      if (se === "winter") { set(o, q < 0.12 ? COL.snowLo : COL.snow); if (q > 0.97) set(o, COL.pebble); return; }
      var up = Math.sin(z * 0.022 + 0.8) > 0 ? 1 : -1;
      if ((x - cx) * up > 6 + Math.sin(z * 0.3) * 2 && z > 30 && h2(Math.floor(x * 0.5), Math.floor(z * 0.5)) > 0.35) { set(o, q < 0.3 ? COL.rockLo : q > 0.85 ? COL.rockHi : COL.rock); return; }
      var band = (Math.floor((x * 0.6 + z) / 2.4) & 1);
      var A = se === "spring" ? COL.grass : COL.dry, B = se === "spring" ? COL.grassLo : COL.dryLo;
      if (se === "autumn") { A = [176, 160, 96]; B = [160, 144, 84]; }
      set(o, band ? A : B);
      if (q < 0.08) set(o, COL.dryHi); else if (q > 0.95) set(o, COL.pebble);
      if (d < w + 0.5 && q > 0.5) set(o, COL.dirtLo);
    };
  }
  function trail(E, save, opt) {
    var r = U.rng(opt.seed || 7), sc = base("trail", E), len = 230;
    sc.ground = trailGround(E);
    sc.pathX = trailX;
    // trailhead: end of the road, a parked car, a kiosk, a sign
    var cc = car(E, 8.5, 9, U.pick(r, CARS), "x"); sc.meshes.push(cc.m); sc.solids.push(cc.solid);
    sc.props.push(prop(S.sign("kiosk"), -3.5, 23, 2.6, { id: "kiosk" }), prop(S.sign("trail"), 1.8, 24.5, 1.9));
    sc.posts.push({ x: -3.5, z: 23, r: 0.6 });
    // a gate of boulders where asphalt turns to dirt
    [-3.2, 3.2, -5.5, 5.5].forEach(function (x) { sc.props.push(prop(S.rock(1, E.snowy), x, 21.5, 0.9)); sc.posts.push({ x: x, z: 21.5, r: 0.6 }); });
    // pines, scrub, rocks along the way
    for (var z = 18; z < len + 30; z += 2.2) {
      var cx = trailX(z);
      [-1, 1].forEach(function (s) {
        if (r() < 0.35) return;
        var off = 2.4 + r() * 13, x = cx + s * off, t = r();
        if (z < 24 && Math.abs(x) < 14) return;
        if (t < 0.45) { sc.props.push(prop(S.pine((r() * 9) | 0, E.snowy, true), x, z, 6 + r() * 6)); sc.posts.push({ x: x, z: z, r: 0.5 }); }
        else if (t < 0.7) sc.props.push(prop(S.bush(E.season, (r() * 5) | 0), x, z, 0.9 + r() * 0.6));
        else if (t < 0.85) { sc.props.push(prop(S.rock((r() * 4) | 0, E.snowy), x, z, 0.9 + r() * 1.4)); sc.posts.push({ x: x, z: z, r: 0.7 }); }
        else sc.props.push(prop(S.tuft(E.season), x, z, 0.4));
      });
    }
    // pickups beside the path
    var pool = GG.data.trail.pickups[E.season] || GG.data.trail.pickups.summer;
    for (var p = 0; p < 7; p++) {
      var pz = 34 + p * 26 + r() * 10, px = trailX(pz) + ((r() * 3) | 0) * 0.85 - 0.85, id = U.pick(r, pool);
      var spr = id === "pinecone" || id === "acorn" ? S.pinecone() : id === "rock" ? S.rock(2, false) : id === "leaf" ? S.bush("autumn", 1) : S.flower(id);
      var h = id === "pinecone" || id === "acorn" ? 0.35 : id === "rock" ? 0.3 : id === "leaf" ? 0.3 : 0.75;
      sc.actors.push({ pickup: id, x: px, z: pz, h: h, spr: spr });
    }
    sc.height = trailH;
    sc.trackX = function (z) { return z < 22 ? 0 : trailX(z); };
    sc.lanes = 1; sc.laneW = 0.85; sc.dir = opt.reverse ? -1 : 1; sc.zMin = 0; sc.zMax = len;
    sc.marks.encounter = { z: 150 };
    sc.marks.end = { z: len };
    sc.marks.early = { z: 85 };
    return sc;
  }

  // ---------- the summit (C5) ----------
  function summit(E, save, opt) {
    var sc = base("summit", E), r = U.rng(5);
    var night = E.tod === "night", dusk = E.tod === "dusk", se = E.season;
    function inside(x, z) {
      if (z > 30) return true;
      var edge = -7 + Math.sin(x * 0.7) * 0.8 + h2(Math.floor(x), 3) * 0.6;
      return z > edge && Math.abs(x) < 14 + Math.sin(z * 0.3) * 2;
    }
    sc.ground = function (x, z, o, dist) {
      var q = dist < 30 ? h2(Math.floor(x * 3), Math.floor(z * 3)) : 0.5;
      if (se === "winter" && q < 0.5) { set(o, COL.snow); return; }
      var plate = h2(Math.floor(x * 0.35 + z * 0.12), Math.floor(z * 0.3));
      set(o, plate < 0.3 ? COL.rockLo : plate > 0.8 ? COL.rockHi : COL.rock);
      if (q > 0.9) set(o, COL.rockHi); else if (q < 0.1) set(o, COL.rockLo);
      if (q < 0.04) set(o, COL.lichen); else if (q > 0.985) set(o, COL.lichenO);
    };
    // the town far below: a quilt of blocks, streets and treetops
    sc.low = {
      y: -95, fogNear: 90, fogFar: E.weather === "fog" ? 120 : 760, inside: inside,
      ground: function (x, z, o, dist, sx, sy) {
        var bx = Math.floor(x / 16), bz = Math.floor(z / 16), lx = ((x % 16) + 16) % 16, lz = ((z % 16) + 16) % 16;
        if (lx < 2.2 || lz < 2.2) {
          set(o, [104, 104, 108]);
          if (night || dusk) { if (h2(Math.floor(x / 4), Math.floor(z / 4)) > 0.75 && (lx < 0.6 || lz < 0.6)) { set(o, [255, 214, 140]); o.emit = true; } }
          return;
        }
        var cell = h2(Math.floor(x / 5.3), Math.floor(z / 5.3)), park = h2(bx, bz) > 0.88;
        if (park) { set(o, se === "winter" ? COL.snow : [96, 140, 74]); if (cell > 0.7) set(o, [70, 110, 60]); return; }
        if (cell < 0.45) {
          var rc = [[168, 96, 80], [120, 120, 126], [90, 96, 110], [150, 130, 110], [200, 196, 186]][Math.floor(cell * 11) % 5];
          set(o, se === "winter" ? [226, 230, 236] : rc);
          if ((night || dusk) && h2(Math.floor(x / 1.5), Math.floor(z / 1.5)) > (night ? 0.82 : 0.93)) { set(o, [255, 210, 130]); o.emit = true; }
        } else if (cell < 0.75) set(o, se === "winter" ? [210, 216, 224] : se === "autumn" ? [190, 140, 70] : [80, 124, 64]);
        else set(o, se === "winter" ? COL.snow : [112, 150, 84]);
      }
    };
    for (var i = 0; i < 6; i++) { var x = (r() - 0.5) * 22, z = 4 + r() * 20; sc.props.push(prop(S.pine((r() * 9) | 0, E.snowy, true), x, z + 6, 5 + r() * 4)); sc.posts.push({ x: x, z: z + 6, r: 0.5 }); }
    [[-5, 2], [6, 5], [3, -2]].forEach(function (p) { sc.props.push(prop(S.rock(p[0] > 0 ? 1 : 0, E.snowy), p[0], p[1], 1.2)); sc.posts.push({ x: p[0], z: p[1], r: 0.8 }); });
    sc.free = true;
    return sc;
  }

  // ---------- the tiny world (A2.1) ----------
  function tiny(E, save, opt) {
    var sc = base("tiny", E), r = U.rng(3), se = E.season;
    var cracks = [{ z: 26, w: 1.8 }, { z: 46, w: 2.2 }];
    sc.cracks = cracks;
    sc.ground = function (x, z, o, dist) {
      var q = dist < 40 ? h2(Math.floor(x * 1.5), Math.floor(z * 1.5)) : 0.5;
      if (x > 9) { // the lawn: soil between blades
        set(o, q > 0.5 ? [96, 76, 52] : [84, 66, 46]); if (se === "winter") set(o, COL.snowLo); return;
      }
      for (var i = 0; i < cracks.length; i++) {
        var c = cracks[i], cz = c.z + Math.sin(x * 0.25) * 1.2, d = Math.abs(z - cz);
        if (d < c.w) {
          if (Math.abs(x - 1) < 0.7) { set(o, [140, 104, 66]); if (Math.abs(x - 1) > 0.55) set(o, [100, 72, 44]); return; } // twig bridge
          var t = d / c.w; set(o, U.mix([40, 36, 34], [120, 114, 104], t * t)); return;
        }
      }
      var big = h2(Math.floor(x * 0.6), Math.floor(z * 0.6));
      set(o, big > 0.9 ? [168, 160, 150] : big < 0.08 ? [150, 146, 138] : [190, 184, 174]);
      if (q > 0.93) set(o, [210, 204, 196]); else if (q < 0.05) set(o, [140, 134, 126]);
    };
    for (var i = 0; i < 70; i++) { var x = 10 + r() * 18, z = -10 + r() * 80; sc.props.push(prop(S.blade((r() * 9) | 0), x, z, 6 + r() * 6, { shadow: false })); }
    for (var j = 0; j < 8; j++) sc.props.push(prop(S.rock((r() * 4) | 0, false), -8 + r() * 14, -5 + r() * 70, 1 + r() * 2));
    sc.props.push(prop(S.flower("aster"), 14, 30, 16, { shadow: false }), prop(S.flower("columbine"), 18, 50, 18, { shadow: false }));
    sc.props.push(prop(S.anthill(), -3, 3, 2.2, { id: "hill" }));
    sc.posts.push({ x: -3, z: 2, r: 2.2 });
    sc.marks.crumb = { x: 1, z: 60 };
    sc.marks.hill = { x: -3, z: 3 };
    sc.marks.hose = { x: 2.2, z: 14 };
    sc.noTurn = true; sc.trackX = function () { return 1; }; sc.lanes = 1; sc.laneW = 1.3; sc.dir = 1; sc.zMin = -3; sc.zMax = 60.5;
    sc.blocked = function (x, z) {
      for (var i = 0; i < cracks.length; i++) { var c = cracks[i]; if (Math.abs(z - c.z) < c.w + 0.4 && Math.abs(x - 1) > 0.65) return GG.data.street.ball.tiny.canyon; }
      return false;
    };
    sc.walk = function (x, z) {
      if (x < -12 || x > 30 || z < -8 || z > 70) return false;
      for (var i = 0; i < cracks.length; i++) { var c = cracks[i], cz = c.z + Math.sin(x * 0.25) * 1.2; if (Math.abs(z - cz) < c.w && Math.abs(x - 1) > 0.65) return false; }
      return true;
    };
    return sc;
  }

  GG.scenes = { street: street, block: block, trail: trail, summit: summit, tiny: tiny, car: car, prop: prop, Mesh: Mesh, trailX: trailX, COL: COL };
})();
