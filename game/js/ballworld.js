// Layer 2: the ball, at ant scale. A real little planet you can walk all the way round.
//
// How it works: the ball's surface is painted once into a latitude/longitude grid (material + height),
// built from the ball you actually picked up (beach panels and welded seams, soccer patches and stitch
// grooves, tennis felt and the white seam canyon, a wobbly water balloon). The player always stands at the
// origin of a local frame (N up, Ex right, Ez forward) that slides over the sphere as they walk; the
// renderer sees an ordinary heightfield whose height drops away like a sphere's, so the horizon curves.
// Everything else on the ball (people, sand grains, the valve) lives as a direction on the sphere and is
// projected into the local frame each frame.
//
// The errand: the ball has a leak. Follow the hiss, ask the keeper at the pole, fetch a patch, plug it,
// then stand on the pole to be puffed back to full size. Six random characters wander about with their own
// small stories, and the ball's printed logo is a way into the flatland (layer 3).
// Content: data/ballworld.js. Test: ?scene=ball&kind=beach|soccer|tennis|balloon&talker=ant|ladybug|...
(function () {
  "use strict";
  var GG = window.GG, U = GG.util, S = GG.spr;
  var BW = GG.ballworld = {};
  var DEG = Math.PI / 180, TAU = Math.PI * 2;
  function D() { return GG.data.ballworld; }

  // ---------- little vector kit ----------
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function addk(a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
  function dirLL(lat, lon) { lat *= DEG; lon *= DEG; var c = Math.cos(lat); return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)]; }
  function angle(a, b) { return Math.acos(U.clamp(dot(a, b), -1, 1)); }
  function tangents(c) { // east and north at a point
    var e = Math.abs(c[1]) > 0.999 ? [1, 0, 0] : norm([-c[2], 0, c[0]]);
    return [e, norm(cross(c, e))];
  }
  function slerpDir(a, b, k) { var w = angle(a, b); if (w < 1e-6) return a; var s = Math.sin(w); return norm(addk(a.map(function (x) { return x * Math.sin((1 - k) * w) / s; }), b, Math.sin(k * w) / s)); }
  function offsetDir(c, du, dv, R) { var t = tangents(c); return norm(addk(addk(c, t[0], du / R), t[1], dv / R)); }

  // ---------- the painted ball ----------
  var NW = 1024, NH = 512;
  var F_CHASM = 1, F_BRIDGE = 2, F_INK = 4, F_STICKY = 8, F_SEAM = 16;
  function cellIndex(d) {
    var iy = ((Math.asin(d[1] > 1 ? 1 : d[1] < -1 ? -1 : d[1]) / Math.PI + 0.5) * NH) | 0;
    var ix = ((Math.atan2(d[2], d[0]) / TAU + 0.5) * NW) | 0;
    if (iy >= NH) iy = NH - 1; if (ix >= NW) ix = NW - 1; if (ix < 0) ix = 0; if (iy < 0) iy = 0;
    return iy * NW + ix;
  }
  function cellDir(ix, iy) { var lat = ((iy + 0.5) / NH - 0.5) * Math.PI, lon = ((ix + 0.5) / NW - 0.5) * TAU, c = Math.cos(lat); return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)]; }

  function Painter(R) {
    this.R = R; this.mat = new Uint8Array(NW * NH); this.h = new Float32Array(NW * NH); this.pal = [];
  }
  Painter.prototype.P = function (hex, f) { this.pal.push({ c: U.hx(hex), f: f || 0 }); return this.pal.length - 1; };
  // call fn(index, dir, u, v, dist) for every cell within rad (world units) of centre c; u east, v north
  Painter.prototype.disc = function (c, rad, fn) {
    var R = this.R, a = rad / R, t = tangents(c), lat = Math.asin(c[1]), lon = Math.atan2(c[2], c[0]);
    var iy0 = Math.max(0, Math.floor(((lat - a) / Math.PI + 0.5) * NH) - 1), iy1 = Math.min(NH - 1, Math.ceil(((lat + a) / Math.PI + 0.5) * NH) + 1);
    var cl = Math.cos(Math.min(Math.PI / 2 - 0.01, Math.abs(lat) + a)), span = Math.abs(lat) + a > Math.PI / 2 - 0.02 ? Math.PI : Math.min(Math.PI, a / Math.max(0.02, cl));
    var nx = Math.ceil(span / TAU * NW) + 1, ixc = ((lon / TAU + 0.5) * NW) | 0, cosA = Math.cos(a);
    for (var iy = iy0; iy <= iy1; iy++) for (var k = -nx; k <= nx; k++) {
      var ix = ((ixc + k) % NW + NW) % NW, d = cellDir(ix, iy), q = dot(d, c);
      if (q < cosA) continue;
      fn(iy * NW + ix, d, R * dot(d, t[0]), R * dot(d, t[1]), R * Math.acos(Math.min(1, q)));
    }
  };

  // the pattern of each kind of ball, cell by cell
  function paintBase(pt, kind, rnd) {
    var R = pt.R, mat = pt.mat, h = pt.h, i, ix, iy, d, lat, lon;
    if (kind === "beach") {
      var gores = ["#e8442a", "#f4f2ee", "#3a7ad0", "#f2c43a", "#f4f2ee", "#4aa86a"].map(function (c) { return pt.P(c); });
      var seam = pt.P("#e0d6cc", F_SEAM), cap = pt.P("#f4f2ee");
      for (iy = 0; iy < NH; iy++) {
        lat = ((iy + 0.5) / NH - 0.5) * 180;
        for (ix = 0; ix < NW; ix++) {
          i = iy * NW + ix; lon = ((ix + 0.5) / NW - 0.5) * 360;
          var al = Math.abs(lat), ring = Math.abs(al - 80) * DEG * R;
          if (ring < 0.45) { mat[i] = seam; h[i] = 0.32 * (1 - ring / 0.45); continue; }
          if (al > 80) { mat[i] = cap; continue; }
          var l2 = (lon + 360) % 360, g = Math.floor(l2 / 60), dl = Math.min(l2 - g * 60, (g + 1) * 60 - l2) * DEG * R * Math.cos(lat * DEG);
          if (dl < 0.45) { mat[i] = seam; h[i] = 0.32 * (1 - (dl / 0.45) * (dl / 0.45)); } else mat[i] = gores[g];
        }
      }
    } else if (kind === "soccer") {
      var phi = (1 + Math.sqrt(5)) / 2, C = [];
      [[0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi], [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0], [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]].forEach(function (p) { C.push({ d: norm(p), pent: true }); });
      var ip = 1 / phi;
      [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1], [0, ip, phi], [0, ip, -phi], [0, -ip, phi], [0, -ip, -phi], [ip, phi, 0], [ip, -phi, 0], [-ip, phi, 0], [-ip, -phi, 0], [phi, 0, ip], [phi, 0, -ip], [-phi, 0, ip], [-phi, 0, -ip]].forEach(function (p) { C.push({ d: norm(p), pent: false }); });
      // turn the ball so a pentagon sits on top (the navel lives there)
      var a0 = C[0].d, b0 = [0, 1, 0], ax = norm(cross(a0, b0)), th = angle(a0, b0), cs = Math.cos(th), sn = Math.sin(th);
      C.forEach(function (c) { var v = c.d, k = dot(ax, v), cr = cross(ax, v); c.d = norm([v[0] * cs + cr[0] * sn + ax[0] * k * (1 - cs), v[1] * cs + cr[1] * sn + ax[1] * k * (1 - cs), v[2] * cs + cr[2] * sn + ax[2] * k * (1 - cs)]); });
      var black = pt.P("#2a2a30"), whites = [pt.P("#f4f2ee"), pt.P("#ebe9e3"), pt.P("#f0eee8")], groove = pt.P("#b8b6ae", F_SEAM);
      for (iy = 0; iy < NH; iy++) for (ix = 0; ix < NW; ix++) {
        i = iy * NW + ix; d = cellDir(ix, iy);
        var b1 = -2, b2 = -2, j1 = 0;
        for (var j = 0; j < 32; j++) { var q = dot(d, C[j].d); if (q > b1) { b2 = b1; b1 = q; j1 = j; } else if (q > b2) b2 = q; }
        var gap = (Math.acos(Math.min(1, b2)) - Math.acos(Math.min(1, b1))) * R;
        if (gap < 0.5) { mat[i] = groove; h[i] = -0.28 * (1 - gap / 0.5); }
        else mat[i] = C[j1].pent ? black : whites[j1 % 3];
      }
    } else if (kind === "tennis") {
      var felt = [pt.P("#cce04a"), pt.P("#c4d844"), pt.P("#d4e856")];
      for (i = 0; i < NW * NH; i++) mat[i] = felt[(U.h2(i % NW, (i / NW) | 0) * 3) | 0];
      var bald = pt.P("#a8b86a");
      pt.disc([0, 1, 0], 6, function (k, dd, u, v, dist) { if (dist < 5 + Math.sin(Math.atan2(v, u) * 5) * 0.8) { mat[k] = bald; h[k] = -0.05; } });
    } else { // balloon
      var pink = pt.P("#e84a6a"), shine = pt.P("#f27a94"), deep = pt.P("#c43c5c");
      for (iy = 0; iy < NH; iy++) {
        lat = ((iy + 0.5) / NH - 0.5) * 180;
        for (ix = 0; ix < NW; ix++) {
          i = iy * NW + ix; d = cellDir(ix, iy);
          var w = Math.sin(d[0] * 5 + d[2] * 3) + Math.sin(d[1] * 7 - d[2] * 4) + Math.sin(d[0] * 3 - d[1] * 6);
          mat[i] = lat > 18 && lat < 34 && Math.sin(((ix / NW) * 360 + lat * 2) * DEG * 3) > -0.2 ? shine : w > 1.4 ? deep : pink;
        }
      }
    }
  }

  // things painted on top: chasms, bridges, the print, the patch, places
  function chasmPath(K, kind) {
    var paths = (K.chasms || []).map(function (c) { return { def: c, pts: c.pts.map(function (p) { return dirLL(p[0], p[1]); }), w: c.w, closed: false }; });
    if (kind === "tennis") { // the classic seam: a single loop that splits the ball into two halves
      var pts = [];
      for (var k = 0; k < 240; k++) {
        var t = k / 240 * TAU, a = 1, b = 0.4, X = a * Math.cos(t) + b * Math.cos(3 * t), Y = a * Math.sin(t) - b * Math.sin(3 * t), Z = 2 * Math.sqrt(a * b) * Math.sin(2 * t);
        var px = X, pz = Y, cr = Math.cos(39 * DEG), sr = Math.sin(39 * DEG); // turned so it misses every landmark
        pts.push(norm([px * cr - pz * sr, Z * 0.82, px * sr + pz * cr]));
      }
      paths.push({ def: { name: K.seam.name, bridges: [] }, pts: pts, w: K.seam.w, closed: true, seam: true });
    }
    return paths;
  }
  function samplePath(path, step, R, fn) {
    var P = path.pts, n = P.length - (path.closed ? 0 : 1);
    for (var s = 0; s < n; s++) {
      var a = P[s], b = P[(s + 1) % P.length], len = angle(a, b) * R, m = Math.max(1, Math.ceil(len / step));
      for (var k = 0; k <= m; k++) fn(slerpDir(a, b, k / m), a, b);
    }
  }
  function nearestOnPath(path, c) {
    var best = null, bd = 1e9;
    samplePath(path, 0.4, D().R, function (q, a, b) { var dd = angle(q, c); if (dd < bd) { bd = dd; best = { q: q, a: a, b: b }; } });
    return best;
  }
  var BRIDGE_COL = { hair: "#5a3a26", "pine needle": "#b08040", twig: "#8a6040", "blade of grass": "#5a9a3a", "lace tag": "#d8d8e0", "fallen fibre": "#e0f07a", "rubber band": "#c88a5a" };

  function paintFeatures(pt, K, kind, W) {
    var R = pt.R, mat = pt.mat, h = pt.h;
    // chasms
    var inside = pt.P(kind === "tennis" ? "#6a6a68" : kind === "balloon" ? "#7a2a40" : "#2a2228", F_CHASM);
    var bank = kind === "tennis" ? pt.P("#f4f2ee") : -1;
    W.paths = chasmPath(K, kind);
    W.paths.forEach(function (path) {
      samplePath(path, 0.3, R, function (q) {
        pt.disc(q, path.w / 2 + (bank >= 0 ? 0.8 : 0.3), function (k, dd, u, v, dist) {
          if (dist < path.w / 2) { mat[k] = inside; h[k] = -3.2; }
          else if (bank >= 0) { if (!(pt.pal[mat[k]].f & F_CHASM)) { mat[k] = bank; h[k] = -0.15; } }
          else if (!(pt.pal[mat[k]].f & F_CHASM)) h[k] = Math.min(h[k], -0.12);
        });
      });
    });
    // bridges across them
    W.bridges = [];
    W.paths.forEach(function (path, pi) {
      var defs = path.def.bridges || [];
      if (path.seam) { // evenly round the tennis seam
        defs = [];
        for (var k = 0; k < K.seam.bridges; k++) { var p = path.pts[Math.floor((k + 0.5) / K.seam.bridges * path.pts.length)]; defs.push({ dir: p, name: K.seam.bridgeName, line: K.seam.line }); }
      }
      defs.forEach(function (b) {
        var c = b.dir || dirLL(b.at[0], b.at[1]), np = nearestOnPath(path, c);
        c = np.q;
        var along = norm(cross(norm(cross(np.a, np.b)), c)), across = norm(cross(c, along));
        var half = path.w / 2 + 1.1, col = pt.P(BRIDGE_COL[b.name.replace(/^an? /, "")] || "#8a6040", F_BRIDGE);
        pt.disc(c, half + 0.5, function (k, dd) {
          var ua = R * dot(dd, along), uc = R * dot(dd, across);
          if (Math.abs(ua) < 0.62 && Math.abs(uc) < half) { mat[k] = col; h[k] = 0.12 + (Math.abs(ua) > 0.45 ? 0.08 : 0); }
        });
        W.bridges.push({ v: c, ends: [offsetAlong(c, across, half + 0.6, R), offsetAlong(c, across, -(half + 0.6), R)], name: b.name, line: b.line, path: pi });
      });
    });
    // tennis: the Bite is two tooth pits
    if (K.pits) {
      var lv = dirLL(K.leak.at[0], K.leak.at[1]), pit = pt.P("#3a3a2a", F_CHASM);
      [-1.6, 1.6].forEach(function (o) { pt.disc(offsetDir(lv, o, 0, R), 1.3, function (k, dd, u, v, dist) { if (dist < 1.1) { mat[k] = pit; h[k] = -2.4; } }); });
    }
    if (kind === "balloon") { var lv2 = dirLL(K.leak.at[0], K.leak.at[1]), hole = pt.P("#8a2a44"); pt.disc(lv2, 0.8, function (k, dd, u, v, dist) { mat[k] = hole; h[k] = -0.4 * (1 - dist / 0.8); }); }
    // the print
    var pr = K.print, pc = dirLL(pr.at[0], pr.at[1]), r = pr.r, inks = {};
    function ink(hex) { return inks[hex] != null ? inks[hex] : (inks[hex] = pt.P(hex, F_INK)); }
    pt.disc(pc, r + 0.5, function (k, dd, u, v, dist) {
      var c = printLook(pr.look, u, v, r, dist);
      if (c) { mat[k] = ink(c); h[k] = 0.02; }
    });
    W.printEye = printEye(pr.look, pc, r, R);
    // the patch site
    var pv = dirLL(K.patch.at[0], K.patch.at[1]);
    if (K.patch.item === "sticker") {
      var paper = pt.P("#f8f6f0"), barc = pt.P("#3a3a46"), price = pt.P("#c8402a");
      pt.disc(pv, 6.5, function (k, dd, u, v) {
        if (Math.abs(u) < 5 && Math.abs(v) < 3.2) { mat[k] = paper; h[k] = 0.04; if (u > -4 && u < 0 && v > -2.4 && v < 0.6 && Math.sin(u * 7) > 0.2) mat[k] = barc; if (u > 0.8 && u < 4 && v > 0.8 && v < 2.2) mat[k] = price; }
      });
    } else if (K.patch.item === "tape") {
      var tape = pt.P("#e8e0b8");
      pt.disc(pv, 5, function (k, dd, u, v) { if (Math.abs(u) < 4.2 && Math.abs(v) < 1.2) { mat[k] = tape; h[k] = 0.05; } });
    }
    // places with their own ground
    (K.places || []).forEach(function (pl) {
      var c = dirLL(pl.at[0], pl.at[1]), m = null, hill = 0;
      if (pl.sticky) m = pt.P("#f2ead8", F_STICKY);
      else if (/Grass Stain/.test(pl.name)) m = pt.P("#7aa84a");
      else if (/Mud/.test(pl.name)) { m = pt.P("#8a6a48"); hill = 2.4; }
      else if (/Drool/.test(pl.name)) m = pt.P("#e0eca8");
      else if (/Shine/.test(pl.name)) m = pt.P("#fca8b8");
      else if (/Puddle/.test(pl.name)) m = pt.P("#a83050");
      if (m == null) return;
      pt.disc(c, pl.r, function (k, dd, u, v, dist) {
        var edge = pl.r * (0.78 + 0.22 * Math.sin(Math.atan2(v, u) * 4 + 1));
        if (dist < edge && !(pt.pal[mat[k]].f & (F_CHASM | F_BRIDGE | F_INK))) { mat[k] = m; if (hill) h[k] = hill * Math.cos(dist / edge * Math.PI / 2); }
      });
    });
    // the pole: a ring round the valve / knot / navel
    if (kind !== "tennis") { var rim = pt.P(kind === "balloon" ? "#c83a5a" : kind === "soccer" ? "#3a3a40" : "#e8e4dc"); pt.disc([0, 1, 0], 2.4, function (k, dd, u, v, dist) { if (dist > 1.4) { mat[k] = rim; h[k] = 0.2; } }); }
  }
  function offsetAlong(c, dir, d, R) { return norm(addk(c, dir, d / R)); }
  // the printed graphic, in the print's own flat coordinates
  function printLook(look, u, v, r, dist) {
    var a = Math.atan2(v, u);
    if (look === "sun") {
      var sg = (Math.abs(u + 0.24 * r) < 0.17 * r || Math.abs(u - 0.24 * r) < 0.17 * r || Math.abs(u) < 0.08 * r) && v > 0.06 * r && v < 0.22 * r;
      if (sg) return "#1a1a20";
      if (dist < 0.55 * r) { var sm = Math.abs(Math.hypot(u, v + 0.02 * r) - 0.3 * r) < 0.045 * r && v < -0.08 * r; return sm ? "#1a1a20" : "#f6c83a"; }
      if (dist > 0.64 * r && dist < r && Math.sin(a * 8) > 0.35) return "#e8742a";
      return null;
    }
    if (look === "stars") {
      var best = null;
      [[-0.5, -0.1, 0.32], [0, 0.18, 0.36], [0.5, -0.1, 0.32]].forEach(function (s) {
        var du = u - s[0] * r, dv = v - s[1] * r, dd = Math.hypot(du, dv), aa = Math.atan2(dv, du) - Math.PI / 2;
        var lim = s[2] * r * (0.42 + 0.58 * Math.pow(Math.max(0, Math.cos(2.5 * aa)), 2));
        if (dd < lim) best = "#d8a830";
      });
      return best;
    }
    if (look === "logo") {
      var e = (u / (0.95 * r)) * (u / (0.95 * r)) + (v / (0.55 * r)) * (v / (0.55 * r));
      if (e > 0.78 && e < 1) return "#2a2a30";
      if (Math.abs(u) < 0.7 * r && Math.abs(v - 0.14 * r * Math.sin(u / r * 7)) < 0.07 * r) return "#2a2a30";
      return null;
    }
    // smiley, stretched
    var su = u / 1.3, sd = Math.hypot(su, v);
    if (Math.abs(sd - 0.85 * r) < 0.07 * r) return "#f8f0f0";
    if (Math.hypot(su + 0.3 * r, v - 0.25 * r) < 0.1 * r || Math.hypot(su - 0.3 * r, v - 0.25 * r) < 0.1 * r) return "#f8f0f0";
    if (Math.abs(sd - 0.45 * r) < 0.06 * r && v < -0.1 * r) return "#f8f0f0";
    return null;
  }
  function printEye(look, c, r, R) { // the spot you lie down on
    if (look === "sun") return offsetDir(c, -0.24 * r, 0.14 * r, R);
    if (look === "stars") return offsetDir(c, 0, 0.18 * r, R);
    if (look === "smiley") return offsetDir(c, -0.39 * r, 0.25 * r, R);
    return c;
  }

  // ---------- the scene the renderer sees ----------
  var W = null; // the live world
  function buildScene(E, save, opt) {
    var data = D(), kind = data.kinds[opt.kind] ? opt.kind : "beach", K = data.kinds[kind], R = data.R;
    var rnd = U.rng((Date.now() & 0xffff) + 99);
    var pt = new Painter(R);
    W = { kind: kind, K: K, R: R, pt: pt, rnd: rnd, t: 0, ents: [], decor: [] };
    paintBase(pt, kind, rnd);
    paintFeatures(pt, K, kind, W);
    var mat = pt.mat, hh = pt.h, pal = pt.pal;
    // the frame: where you stand (N), right (Ex) and forward (Ez)
    var sp = dirLL(8, 0);
    W.N = sp; W.Ez = tangents(sp)[0]; W.Ex = cross(W.N, W.Ez);
    var sc = { kind: "ball", E: E, meshes: [], props: [], lines: [], glows: [], actors: [], lights: [], solids: [], posts: [], triggers: [], particles: [], marks: {},
      free: true, roam: true, noTurn: true, lanes: 0, dir: 1 };
    var wob = !!K.wobble;
    // local (x, z) -> direction on the ball
    function toDir(x, z) {
      var r2 = x * x + z * z, R2 = R * R;
      if (r2 >= R2) r2 = R2 * 0.999;
      var y = Math.sqrt(1 - r2 / R2), N = W.N, Ex = W.Ex, Ez = W.Ez;
      return [(x * Ex[0] + z * Ez[0]) / R + N[0] * y, (x * Ex[1] + z * Ez[1]) / R + N[1] * y, (x * Ex[2] + z * Ez[2]) / R + N[2] * y];
    }
    W.toDir = toDir;
    var lastX = NaN, lastZ = NaN, lastI = 0, lastD = null;
    function cellAt(x, z) { if (x === lastX && z === lastZ) return lastI; lastX = x; lastZ = z; lastD = toDir(x, z); lastI = cellIndex(lastD); return lastI; }
    W.cellAt = cellAt;
    sc.height = function (x, z) {
      var r2 = x * x + z * z; if (r2 > R * R * 0.995) return -R;
      var base = Math.sqrt(R * R - r2) - R, i = cellAt(x, z), f = hh[i];
      if (wob) { var d = lastD; f += 0.28 * Math.sin(d[0] * 9 + W.t * 1.6) * Math.cos(d[2] * 7 - W.t * 1.1); }
      return base + f;
    };
    sc.ground = function (x, z, o, dist) {
      var i = cellAt(x, z), c = pal[mat[i]].c, q = dist < 26 ? U.h2(i % NW, (i / NW) | 0) : 0.5, k = q < 0.12 ? 0.93 : q > 0.9 ? 1.05 : 1;
      if (pal[mat[i]].f & F_CHASM) k *= 0.8;
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    };
    function flagsAt(x, z) { return pal[mat[cellAt(x, z)]].f; }
    W.flagsAt = flagsAt;
    W.flagsDir = function (d) { return pal[mat[cellIndex(d)]].f; };
    sc.walk = function (x, z) {
      var l = Math.hypot(x, z) || 1, px = x + x / l * 0.35, pz = z + z / l * 0.35;
      if (flagsAt(x, z) & F_CHASM && !(flagsAt(x, z) & F_BRIDGE)) return false;
      if ((flagsAt(px, pz) & F_CHASM) && !(flagsAt(px, pz) & F_BRIDGE)) return false;
      for (var j = 0; j < W.decor.length; j++) { var e = W.decor[j]; if (e.solid && e.vis && Math.hypot(e.x - x, e.z - z) < e.solid) return false; }
      return true;
    };
    sc.speedAt = function (x, z) { var f = flagsAt(x, z); return f & F_STICKY ? 0.5 : f & F_BRIDGE ? 0.8 : f & F_SEAM ? 0.85 : 1; };
    sc.blockedSay = function (fx, fz) { return flagsAt(fx * 0.9, fz * 0.9) & F_CHASM ? U.pick(rnd, data.common.chasm) : null; };
    // walking: slide the frame over the ball
    sc.recenter = function (dx, dz) {
      var N = norm(toDir(dx, dz)), Ez = W.Ez;
      Ez = norm(addk(Ez, N, -dot(Ez, N)));
      W.N = N; W.Ez = Ez; W.Ex = cross(N, Ez);
      lastX = NaN;
      W.walked += Math.hypot(dx, dz);
    };
    sc.help = data.help;
    sc.update = function (dt) { W.t += dt; lastX = NaN; };
    W.walked = 0;
    // decor: sand grains, felt, the valve, the dewdrop
    scatterDecor(W, kind, K, rnd);
    return sc;
  }

  // a thing on the ball: a direction, projected into the frame each frame
  function project(e) {
    var N = W.N, q = dot(e.v, N);
    e.vis = q > 0.25;
    e.x = W.R * dot(e.v, W.Ex); e.z = W.R * dot(e.v, W.Ez);
    return e.vis;
  }
  function placeOK(d, gap) {
    if (W.flagsDir(d) & (F_CHASM | F_BRIDGE | F_INK)) return false;
    for (var i = 0; i < W.decor.length; i++) if (W.decor[i].solid && angle(W.decor[i].v, d) * W.R < (gap || 2.5)) return false;
    return true;
  }
  function randomDir(rnd, near, rad) {
    if (!near) { var y = rnd() * 2 - 1, a = rnd() * TAU, c = Math.sqrt(1 - y * y); return [c * Math.cos(a), y, c * Math.sin(a)]; }
    var aa = rnd() * TAU, dd = Math.sqrt(rnd()) * rad; return offsetDir(near, Math.cos(aa) * dd, Math.sin(aa) * dd, W.R);
  }
  function scatterDecor(W, kind, K, rnd) {
    var R = W.R;
    function add(o) { W.decor.push(o); return o; }
    add({ v: [0, 1, 0], spr: S.valve(kind), h: kind === "beach" ? 5.5 : kind === "balloon" ? 6.5 : kind === "soccer" ? 1.4 : 1.2, solid: kind === "beach" || kind === "balloon" ? 1.3 : 0 });
    var dewP = (K.places || []).filter(function (p) { return /Dewdrop/.test(p.name); })[0];
    if (dewP) add({ v: dirLL(dewP.at[0], dewP.at[1]), spr: S.dew(), h: 3.2, solid: 3.4, emit: false });
    var dunes = (K.places || []).filter(function (p) { return /Dunes|Mud/.test(p.name); })[0];
    for (var i = 0, tries = 0; i < (K.grains || 0) && tries < 400; tries++) {
      var d = i < 8 && dunes ? randomDir(rnd, dirLL(dunes.at[0], dunes.at[1]), dunes.r) : randomDir(rnd);
      if (!placeOK(d, 3)) continue;
      add({ v: d, spr: S.grain(i), h: 1.8 + rnd() * 1.6, solid: 1.2, grain: true }); i++;
    }
    for (var gi = 0, gt = 0; gi < 150 && gt < 900; gt++) {
      var gd = randomDir(rnd);
      if (W.flagsDir(gd) & (F_CHASM | F_BRIDGE | F_INK)) continue;
      add({ v: gd, spr: S.rock(gi % 4, false), h: 0.25 + rnd() * 0.35, solid: 0, grit: true }); gi++;
    }
    if (K.fuzz) {
      var forest = dirLL(K.patch.at[0], K.patch.at[1]);
      for (var j = 0, tr = 0; j < K.fuzz && tr < 2000; tr++) {
        var dd = j < 70 ? randomDir(rnd, forest, 13) : randomDir(rnd);
        if (W.flagsDir(dd) & (F_CHASM | F_BRIDGE | F_INK)) continue;
        if (angle(dd, dirLL(K.leak.at[0], K.leak.at[1])) * R < 4 || angle(dd, [0, 1, 0]) * R < 6 || angle(dd, dirLL(8, 0)) * R < 3) continue;
        add({ v: dd, spr: S.fuzz(j % 7), h: 4 + rnd() * 3, solid: 0 }); j++;
      }
    }
    // the patch, sitting where it is
    var pv = dirLL(K.patch.at[0], K.patch.at[1]);
    if (K.patch.sprite === "curl") W.patchDecor = add({ v: offsetDir(pv, 3.6, 2.2, R), spr: S.curl(), h: 2.4 });
    else if (K.patch.sprite === "thread") W.patchDecor = add({ v: pv, spr: S.item("thread"), h: 1.4 });
  }

  // ---------- people on the ball ----------
  var BUGH = { ant: 1.1, ladybug: 1.0, snail: 1.4, waterbear: 1.15, flea: 1.1, mite: 0.95, spider: 1.25, woodlouse: 1.05, aphid: 0.95, springtail: 1.05, beetle: 1.2, gnat: 0.85 };
  function npc(o) {
    var e = Object.assign({ v: [0, 1, 0], x: 0, z: 0, y: 0, vis: false, speed: 1.1, target: null, wait: 0, lx: 0, flip: false, frame: 0 }, o);
    e.h = e.h || BUGH[e.sprite] || 1;
    e.update = function (dt, t) {
      var v0 = e.v;
      if (e.follow) followPlayer(e, dt);
      else if (e.home) wander(e, dt);
      project(e);
      var yaw = GG.game.cam.yaw, mx = W.R * (dot(e.v, W.Ex) - dot(v0, W.Ex)), mz = W.R * (dot(e.v, W.Ez) - dot(v0, W.Ez));
      if (Math.hypot(mx, mz) > dt * 0.15) { e.flip = mx * Math.cos(yaw) - mz * Math.sin(yaw) < 0; e.moving = true; e.frame += dt * 6; }
      else { e.moving = false; if (!e.follow) e.flip = -e.x * Math.cos(yaw) + e.z * Math.sin(yaw) < 0; }
    };
    e.draw = function (list, t) {
      if (!e.vis || e.hidden) return;
      var y = e.y || 0;
      if (e.fly) y = 1.2 + Math.sin(t * 2.3 + e.h * 7) * 0.4;
      if (e.bounce) y = Math.abs(Math.sin(t * 4.2)) * 1.4;
      list.push({ k: "spr", spr: S.bug(e.sprite, e.moving ? (e.frame | 0) % 2 : 0), x: e.x, z: e.z, y: y, h: e.h, flip: e.flip, shadow: true });
      if (e.mark && !e.met) list.push({ k: "spr", spr: bubble(), x: e.x, z: e.z, y: y + e.h + 0.35 + Math.sin(t * 3) * 0.08, h: 0.7, shadow: false });
    };
    return e;
  }
  var _bub = null;
  function bubble() {
    return _bub || (_bub = S.make(13, 11, function (p) {
      p.r(1, 0, 11, 7, "#f4f0e6"); p.r(0, 1, 13, 5, "#f4f0e6"); p.r(5, 7, 3, 1, "#f4f0e6"); p.px(6, 8, "#f4f0e6");
      p.px(3, 3, "#3a3a46"); p.px(6, 3, "#3a3a46"); p.px(9, 3, "#3a3a46");
    }, { outline: "#241e30" }));
  }
  function wander(e, dt) {
    if (e.wait > 0) { e.wait -= dt; return; }
    if (!e.target) { e.target = randomDir(W.rnd, e.home, e.rad || 2.5); }
    var dv = addk(e.target, e.v, -dot(e.target, e.v)), l = Math.hypot(dv[0], dv[1], dv[2]);
    if (l * W.R < 0.08) { e.target = null; e.wait = 1 + W.rnd() * 3; return; }
    var nv = norm(addk(e.v, dv, Math.min(e.speed * dt / W.R, l) / l));
    if (W.flagsDir(nv) & F_CHASM) { e.target = null; e.wait = 0.5; return; }
    e.v = nv;
  }
  function followPlayer(e, dt) {
    var P = GG.game.player, h = P.heading, fx = Math.sin(h), fz = Math.cos(h);
    var tx = fx * 0.5 + fz * 1.7, tz = fz * 0.5 - fx * 1.7;
    project(e);
    var dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    if (!e.vis || d > 14) { e.v = norm(W.toDir(tx, tz)); return; }
    if (d < 0.35) return;
    var s = Math.min(d, (d > 3 ? 4.6 : 3.2) * dt), nx = e.x + dx / d * s, nz = e.z + dz / d * s;
    e.v = norm(W.toDir(nx, nz));
  }

  // ---------- the errand ----------
  var Q = null;
  function vars() {
    var K = W.K, t = Q.talker;
    return { ball: K.world.replace(/^the /, ""), world: K.world, keeper: K.keeper.name, pole: K.pole, patch: K.patch.name, leak: K.leak.name, print: K.print.name, talker: t.name };
  }
  function fmt(s) { return U.fmt(s, vars()); }
  function fmtL(a) { return (Array.isArray(a) ? a : [a]).map(fmt); }
  function say(a) { return GG.ui.say(fmtL(a)); }
  function cap(s, secs) { GG.ui.caption(fmt(s), secs || 4.2); Q.capAt = W.t; }
  function setGoal(ph) {
    Q.phase = ph;
    var g = D().goals[ph];
    GG.ui.goal(g ? fmt(g) : null);
  }
  function distTo(v) { return angle(W.N, v) * W.R; }

  BW.setup = function (sc, opt) {
    var data = D(), K = W.K, G = GG.game, UI = GG.ui, R = W.R, rnd = W.rnd, E = sc.E;
    var tid = data.talkers[opt.talker] ? opt.talker : Object.keys(data.talkers)[(rnd() * 6) | 0];
    var talker = Object.assign({ id: tid }, data.talkers[tid]);
    Q = { phase: "arrive", talker: talker, opt: opt, carry: false, fixed: false, met: {}, said: {}, capAt: 0, ambAt: 30 + rnd() * 20, quipAt: 55 + rnd() * 20, hissAt: 0, printArmed: true, lapSaid: false, inside: {} };
    BW.Q = Q; G.musicMood = "ball";
    W.leakV = dirLL(K.leak.at[0], K.leak.at[1]);
    W.poleV = [0, 1, 0];
    W.keeperV = dirLL(86.5, 25);
    W.patchV = dirLL(K.patch.at[0], K.patch.at[1]);
    W.printV = dirLL(K.print.at[0], K.print.at[1]);
    W.spawnV = W.N.slice();
    // the decor actor
    G.addActor({ update: function () { W.decor.forEach(project); }, draw: function (list, t) {
      W.decor.forEach(function (e) { if (e.vis && !e.hidden && (!e.grit || e.x * e.x + e.z * e.z < 400)) list.push({ k: "spr", spr: e.spr, x: e.x, z: e.z, y: 0, h: e.h, shadow: !!e.solid }); });
      drawLeak(list, t);
    } });
    // your guide
    var guide = npc({ sprite: talker.sprite, v: norm(W.toDir(-1.2, -1.4)), follow: true, name: talker.name });
    guide.talk = function () { return companionTalk(); };
    G.addActor(guide); Q.guide = guide;
    // the keeper
    var kp = npc({ sprite: K.keeper.kind, v: W.keeperV, home: W.keeperV, rad: 1.2, speed: 0.5, name: K.keeper.name, mark: true });
    kp.h = (BUGH[K.keeper.kind] || 1) * 1.25;
    kp.talk = function () { return keeperTalk(); };
    G.addActor(kp); Q.keeper = kp;
    // the sage by the print
    var sg = data.sage, sageV = offsetDir(W.printV, K.print.r + 2.2, -1.5, R);
    var sage = npc({ sprite: sg.sprite, v: sageV, home: sageV, rad: 0.6, speed: 0.3, name: sg.name, mark: true });
    sage.talk = function () { sage.met = true; return say(Q.met.sage ? sg.again : sg.talk).then(function () { Q.met.sage = true; }); };
    sage.teaser = sg.teaser; G.addActor(sage); Q.sage = sage;
    // six strangers with their own business
    var deck = data.encounters.filter(function (c) { return !c.when || c.when === (E.tod === "night" ? "night" : "day"); });
    deck = deck.filter(function (c) { return c.sprite !== talker.sprite || c.id === "funeral"; });
    for (var i = deck.length - 1; i > 0; i--) { var j = (rnd() * (i + 1)) | 0, tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; }
    var avoid = [W.leakV, W.poleV, W.patchV, W.printV, W.spawnV], placed = [];
    deck.slice(0, 6).forEach(function (c) {
      var v = null;
      if (c.onGrain) { var g = W.decor.filter(function (d) { return d.grain; })[0]; if (g) v = offsetDir(g.v, 1.6, 0, R); }
      for (var tries = 0; !v && tries < 300; tries++) {
        var d = randomDir(rnd);
        if (!placeOK(d, 2.5)) continue;
        if (avoid.concat(placed).some(function (a) { return angle(a, d) * R < 12; })) continue;
        v = d;
      }
      if (!v) return;
      placed.push(v);
      var e = npc({ sprite: c.sprite, v: v, home: c.onGrain ? null : v, rad: c.fly ? 3 : 2, speed: c.fly ? 1.4 : 0.6, name: c.name, fly: !!c.fly, bounce: !!c.bounce, mark: true });
      e.card = c; e.teaser = c.teaser;
      e.talk = function () { return encounterTalk(e); };
      G.addActor(e);
    });
    // the 3D arrow and the leak's breath
    G.overlay = overlay;
    // arrive
    G.beat(function () {
      var lines = K.arrive.slice();
      if (E.tod === "night") lines.push(data.common.arriveNight); else if (E.weather === "rain") lines.push(data.common.arriveRain);
      return UI.fadeTo(false, 0.6).then(function () { return say(lines); }).then(function () { return say(talker.arrive); })
        .then(function () { GG.sfx && GG.sfx.hiss && GG.sfx.hiss(0.8); setGoal("hiss"); cap(data.help[0].indexOf("Phone") === 0 && matchMedia("(pointer: coarse)").matches ? data.help[0] : data.help[1], 5); });
    });
    sc.update = (function (base) { return function (dt) { base(dt); tick(dt); }; })(sc.update);
  };

  // per frame: the errand's checks, little discoveries, the world talking to itself
  function tick(dt) {
    var G = GG.game, UI = GG.ui, data = D(), K = W.K, c = data.common;
    if (!Q || G.locked() || UI.isOpen() || Q.phase === "arrive" || Q.leaving) return;
    var ph = Q.phase;
    if (ph === "hiss" && distTo(W.leakV) < 5.5) return G.beat(leakFound);
    if (ph === "keeper" && distTo(Q.keeper.v) < 3) return G.beat(keeperTalk);
    if (ph === "fetch" && distTo(W.patchV) < 4.5) return G.beat(patchGet);
    if (ph === "fix" && distTo(W.leakV) < 5) return G.beat(fixLeak);
    if (ph === "home" && distTo(W.poleV) < 2.6) return G.beat(function () { return leave(true); });
    // the print, from up close
    var de = distTo(W.printEye);
    if (de > 4) Q.printArmed = true;
    if (Q.printArmed && de < 1.7) { Q.printArmed = false; return G.beat(printAsk); }
    // teasers: something interesting nearby
    G.scene.actors.forEach(function (a) { if (a.teaser && !a.teased && a.vis && Math.hypot(a.x, a.z) < 8) { a.teased = true; cap(a.teaser, 4.5); } });
    // places, bridges, the ground underfoot
    (K.places || []).forEach(function (pl, i) { if (!Q.said["pl" + i] && distTo(dirLL(pl.at[0], pl.at[1])) < pl.r) { Q.said["pl" + i] = true; cap(pl.line, 5); } });
    var f = W.flagsAt(0, 0);
    if (f & F_BRIDGE) { var b = nearestBridge(); if (b && !Q.said["br" + b.i]) { Q.said["br" + b.i] = true; cap(b.b.line || c.bridge, 4.5); } }
    if (f & F_SEAM && !Q.said.seam && W.kind === "beach") { Q.said.seam = true; cap(c.seam, 4.5); }
    if (f & F_INK && !Q.said.ink) { Q.said.ink = true; cap(c.ink, 4); }
    if (f & F_STICKY && !Q.said.sticky) { Q.said.sticky = true; cap(c.sticky, 4); }
    if (ph !== "fetch" && !Q.said.patchSee && distTo(W.patchV) < 9) { Q.said.patchSee = true; cap(K.patch.see, 4.5); }
    // you walked all the way round
    if (!Q.lapSaid && W.walked > TAU * W.R * 0.8 && distTo(W.spawnV) < 10) { Q.lapSaid = true; cap(c.lapped, 5); }
    // the hiss
    if (!Q.fixed && W.t > Q.hissAt) {
      var dl = distTo(W.leakV);
      Q.hissAt = W.t + 1.6;
      if (dl < 26 && GG.sfx && GG.sfx.hiss) GG.sfx.hiss(Math.max(0.08, 1 - dl / 26));
      if (dl < 14 && !Q.said.hissNear && ph === "hiss") { Q.said.hissNear = true; cap(c.hissNear, 4); }
    }
    // the world, talking to itself, and your guide chiming in
    if (W.t > Q.ambAt && W.t - Q.capAt > 12) {
      Q.ambAt = W.t + 45 + W.rnd() * 35;
      var pool = c.ambient.concat(K.ambient || []);
      if (G.E.tod === "night") pool = pool.concat(c.ambientNight); if (G.E.weather === "rain") pool = pool.concat(c.ambientRain);
      cap(U.pick(W.rnd, pool), 5);
    } else if (W.t > Q.quipAt && W.t - Q.capAt > 12) {
      Q.quipAt = W.t + 60 + W.rnd() * 40;
      cap(Q.talker.name + ": " + U.pick(W.rnd, Q.talker.quips), 5);
    }
  }
  function nearestBridge() {
    var best = null, bd = 1e9;
    W.bridges.forEach(function (b, i) { var d = distTo(b.v); if (d < bd) { bd = d; best = { b: b, i: i }; } });
    return best;
  }

  function leakFound() {
    var K = W.K;
    GG.sfx && GG.sfx.hiss && GG.sfx.hiss(1);
    return say(K.leak.found).then(function () { return say([Q.talker.name + ": 'That's it. That's the leak. Oh, it's worse up close.'", Q.talker.name + ": 'We need " + K.keeper.name + ". Up at " + K.pole + ". Top of the world.'"]); })
      .then(function () { setGoal("keeper"); });
  }
  function keeperTalk() {
    var K = W.K, kp = Q.keeper; kp.met = true;
    if (Q.phase === "hiss") return say(["'" + K.keeper.name + ", " + K.keeper.title + ". You look like someone who's heard a hiss.'", "'Find the leak first. Then come and tell me about it.'"]);
    if (Q.phase === "keeper") return say(K.keeper.intro).then(function () { setGoal("fetch"); });
    if (Q.phase === "fetch") return say(K.keeper.again);
    if (Q.phase === "fix") return say(["'Well, don't show it to ME. Take it to the leak!'"]);
    return say(K.keeper.thanks);
  }
  function patchGet() {
    var K = W.K, P = K.patch, n = 0;
    function pull() {
      return GG.ui.choose(n === 0 ? fmt(P.prompt) : null, [P.pull]).then(function () {
        GG.sfx && GG.sfx.peel && GG.sfx.peel(n);
        return say(P.pulls[n]).then(function () { n++; if (n < P.pulls.length) return pull(); });
      });
    }
    return pull().then(function () {
      GG.sfx && GG.sfx.get();
      if (W.patchDecor) W.patchDecor.hidden = true;
      GG.game.player.carry = S.item(P.item);
      return say(P.got);
    }).then(function () { setGoal("fix"); });
  }
  function fixLeak() {
    var K = W.K;
    return say(K.leak.fixed).then(function () {
      Q.fixed = true; GG.game.player.carry = null; GG.sfx && GG.sfx.chime();
      GG.ui.flash();
      return say(D().common.party);
    }).then(function () { return say(K.keeper.thanks); })
      .then(function () { setGoal("home"); });
  }
  function companionTalk() {
    var data = D(), c = data.common.companion, t = Q.talker;
    return GG.ui.choose(fmt(t.name + ": " + U.pick(W.rnd, ["'Yes?'", "'Mm?'", "'What's up?'", "'Need something?'"])), c.choices).then(function (i) {
      if (i === 0) return say(Q.fixed ? data.hints.home : data.hints[Q.phase] || data.hints.done);
      if (i === 1) return say(t.name + ": " + U.pick(W.rnd, t.quips));
      if (i === 2) return GG.ui.choose(fmt(Q.fixed ? "Grow back now?" : c.confirm.prompt), c.confirm.choices).then(function (j) { if (j === 1) return leave(false); });
    });
  }
  function encounterTalk(e) {
    var c = e.card;
    if (e.met) return say(c.again || c.talk);
    e.met = true;
    return say(c.talk).then(function () {
      if (!c.ask) return;
      return GG.ui.choose(fmt(c.ask.prompt), c.ask.choices).then(function (i) {
        return say(c.ask.replies[Math.max(0, i)]).then(function () {
          if (c.id === "pip") { e.hidden = true; setTimeout(function () { e.hidden = false; }, 40000); }
          if (c.id === "gerald" && i === 0) { e.sprite = "woodlouse"; }
        });
      });
    });
  }
  function printAsk() {
    var K = W.K, pr = K.print;
    return GG.ui.choose(fmt(pr.prompt), pr.choices).then(function (i) {
      if (i !== 0) return;
      GG.sfx && GG.sfx.shrink();
      var goal = Q.phase;
      return GG.flat.play({ print: pr.name, ball: vars().ball }).then(function (res) {
        GG.game.musicMood = "ball";
        GG.ui.goal(null); setGoal(goal);
        return GG.ui.fadeTo(false, 0.6).then(function () { return say(res === "grown" ? GG.data.flat.toBall : pr.back); });
      });
    });
  }
  // go home: from the pole when it's fixed, or early with your guide's help
  function leave(done) {
    var data = D(), c = data.common, G = GG.game, opt = Q.opt;
    Q.leaving = true;
    GG.ui.goal(null);
    return say(done ? c.exit : c.exitEarly).then(function () {
      GG.sfx && GG.sfx.grow(); GG.ui.flash();
      G.player.carry = null; G.musicMood = null; G.overlay = null;
      var back = opt.back || { ev: 54 }, after = fmt(done ? c.after : c.afterEarly);
      Q = null;
      return G.swap("street", { mode: "resume", spawn: { x: 0, z: (back.ev || 54) + 4, h: 0 } }).then(function () { GG.ui.caption(after, 5); });
    });
  }

  // ---------- the leak breathing out ----------
  function drawLeak(list, t) {
    if (!Q || Q.fixed) return;
    var e = { v: W.leakV }; if (!project(e)) return;
    var pal = W.kind === "balloon" ? [190, 226, 250] : [236, 240, 246];
    for (var i = 0; i < 18; i++) {
      var f = (t * 0.55 + i / 18) % 1, a = i * 2.4;
      list.push({ k: "pt", x: e.x + Math.cos(a) * (0.3 + f * 1.6), y: f * 5.5, z: e.z + Math.sin(a) * (0.3 + f * 1.6), s: 0.12 * (1 - f * 0.6), c: pal });
    }
    if (W.kind === "balloon") { var sw = 0.6 + 0.4 * ((t * 0.4) % 1); list.push({ k: "spr", spr: S.dew(), x: e.x, z: e.z, y: 0, h: 1.6 * sw }); }
  }

  // ---------- the gold arrow ----------
  function goalDir() {
    if (!Q) return null;
    switch (Q.phase) {
      case "hiss": return W.leakV;
      case "keeper": return Q.keeper.v;
      case "fetch": return W.patchV;
      case "fix": return W.leakV;
      case "home": return W.poleV;
    }
    return null;
  }
  // straight there, unless a chasm is in the way: then the bridge that makes the trip shortest
  function blocked(a, b) {
    var w = angle(a, b), n = Math.min(90, Math.ceil(w * W.R / 0.7));
    for (var i = 2; i < n; i++) { var f = W.flagsDir(slerpDir(a, b, i / n)); if ((f & F_CHASM) && !(f & F_BRIDGE)) return true; }
    return false;
  }
  function route(target) {
    var N = W.N;
    if (!W.bridges.length || !blocked(N, target)) return target;
    var best = null, bd = 1e9;
    W.bridges.forEach(function (b) { var d = angle(N, b.v) + angle(b.v, target); if (d < bd) { bd = d; best = b; } });
    if (!best) return target;
    var nearEnd = angle(N, best.ends[0]) < angle(N, best.ends[1]) ? best.ends[0] : best.ends[1], farEnd = nearEnd === best.ends[0] ? best.ends[1] : best.ends[0];
    return angle(N, best.v) * W.R < 3.2 ? farEnd : nearEnd;
  }
  var routeCache = { t: -1, v: null };
  function overlay(r3, t) {
    if (!Q || Q.leaving || GG.game.locked() || GG.ui.isOpen()) return;
    var g = goalDir(); if (!g) return;
    if (t - routeCache.t > 0.25 || routeCache.g !== g) { routeCache = { t: t, g: g, v: route(g) }; }
    var v = routeCache.v, R = W.R, tx = R * dot(v, W.Ex), tz = R * dot(v, W.Ez), dist = angle(W.N, v) * R;
    var u = r3.u32, Wd = r3.W, H = r3.H, gold = U.pack(242, 216, 144), ink = U.pack(36, 30, 48), bob = Math.sin(t * 5) * 1.5;
    if (dist < 13 && dot(v, W.N) > 0) {
      var p = r3.project(tx, GG.game.scene.height(tx, tz) + 2.8, tz);
      if (p && p.x > 6 && p.x < Wd - 6 && p.y > 10 && p.y < H - 10) {
        var y0 = p.y + bob, s = Math.max(3, Math.min(6, 30 / p.z));
        tri(u, Wd, H, [p.x - s - 1, y0 - s - 1, p.x + s + 1, y0 - s - 1, p.x, y0 + 2], ink);
        tri(u, Wd, H, [p.x - s, y0 - s, p.x + s, y0 - s, p.x, y0], gold);
        return;
      }
    }
    var cy = r3.cyw, sy = r3.syw, xr = tx * cy - tz * sy, zr = tx * sy + tz * cy, a = U.clamp(Math.atan2(xr, zr), -2.3, 2.3);
    var cx = Wd / 2 + Math.sin(a) * Wd * 0.38, cyy = H * 0.52 - Math.cos(a) * H * 0.3, dx = Math.sin(a), dy = -Math.cos(a), L = 10 + bob * 0.6, Wa = 7;
    tri(u, Wd, H, [cx + dx * (L + 1.5), cyy + dy * (L + 1.5), cx - dx * 3 - dy * (Wa + 1.5), cyy - dy * 3 + dx * (Wa + 1.5), cx - dx * 3 + dy * (Wa + 1.5), cyy - dy * 3 - dx * (Wa + 1.5)], ink);
    tri(u, Wd, H, [cx + dx * L, cyy + dy * L, cx - dx * 2 - dy * Wa, cyy - dy * 2 + dx * Wa, cx - dx * 2 + dy * Wa, cyy - dy * 2 - dx * Wa], gold);
  }
  function tri(u, Wd, H, p, col) {
    var y0 = Math.max(0, Math.floor(Math.min(p[1], p[3], p[5]))), y1 = Math.min(H - 1, Math.ceil(Math.max(p[1], p[3], p[5])));
    for (var y = y0; y <= y1; y++) {
      var sy = y + 0.5, xl = 1e9, xr = -1e9;
      for (var e = 0; e < 3; e++) {
        var ax = p[e * 2], ay = p[e * 2 + 1], bx = p[(e + 1) % 3 * 2], by = p[(e + 1) % 3 * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) { var x = ax + (sy - ay) * (bx - ax) / (by - ay); if (x < xl) xl = x; if (x > xr) xr = x; }
      }
      if (xl > xr) continue;
      for (var x2 = Math.max(0, Math.ceil(xl - 0.5)); x2 <= Math.min(Wd - 1, Math.ceil(xr - 0.5) - 1); x2++) u[y * Wd + x2] = col;
    }
  }

  // for tests
  BW.debug = function () { return { W: W, Q: Q, teleport: function (lat, lon, back) { var v = Array.isArray(lat) ? lat : dirLL(lat, lon); if (back) v = offsetDir(v, 0, -back, W.R); W.N = norm(v); W.Ez = tangents(W.N)[0]; W.Ex = cross(W.N, W.Ez); }, offsetDir: offsetDir, dist: function (v) { return distTo(v); }, route: route, goal: goalDir, dirLL: dirLL }; };
  GG.scenes.ball = buildScene;
})();
