// A tiny software 3D renderer for chunky pixels: a sky, a mountain backdrop
// by compass bearing, a textured ground plane (mode-7 style), flat-shaded
// meshes with decals, and billboard sprites, all painter-sorted.
// World: x right, y up, z forward. yaw 0 looks along +z; positive yaw turns right.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util;
  var bay = U.bay;

  // ---------- meshes ----------
  function Mesh() { this.polys = []; this.cx = 0; this.cy = 0; this.cz = 0; this.rad = 1; }
  var SUN = (function () { var v = [0.45, 0.8, -0.4], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
  Mesh.prototype.poly = function (pts, c, o) {
    o = o || {};
    // outward normal from the first three points (counter-clockwise seen from outside)
    var a = pts[0], b = pts[1], d = pts[2];
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    var nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux, l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    var flat = [], cx = 0, cy = 0, cz = 0;
    for (var i = 0; i < pts.length; i++) { flat.push(pts[i][0], pts[i][1], pts[i][2]); cx += pts[i][0]; cy += pts[i][1]; cz += pts[i][2]; }
    var sh = o.emit ? 1 : 0.74 + 0.3 * Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
    this.polys.push({ p: flat, n: [nx, ny, nz], c: U.col(c), sh: sh, emit: !!o.emit, two: !!o.two, cx: cx / pts.length, cy: cy / pts.length, cz: cz / pts.length });
    return this;
  };
  // a face given its 4 corners (bottom-left, bottom-right, top-right, top-left seen from outside)
  // plus decals in u,v (0..1) space on it
  Mesh.prototype.face = function (q, c, decals, o) {
    this.poly(q, c, o);
    if (!decals) return this;
    var n = this.polys[this.polys.length - 1].n, e = 0.02;
    for (var i = 0; i < decals.length; i++) {
      var D = decals[i];
      var pts = [[D[0], D[1]], [D[2], D[1]], [D[2], D[3]], [D[0], D[3]]].map(function (uv) {
        var u = uv[0], v = uv[1];
        var bx = q[0][0] + (q[1][0] - q[0][0]) * u, by = q[0][1] + (q[1][1] - q[0][1]) * u, bz = q[0][2] + (q[1][2] - q[0][2]) * u;
        var tx = q[3][0] + (q[2][0] - q[3][0]) * u, ty = q[3][1] + (q[2][1] - q[3][1]) * u, tz = q[3][2] + (q[2][2] - q[3][2]) * u;
        return [bx + (tx - bx) * v + n[0] * e * (1 + i * 0.1), by + (ty - by) * v + n[1] * e, bz + (tz - bz) * v + n[2] * e * (1 + i * 0.1)];
      });
      this.poly(pts, D[4], { emit: D[5] });
    }
    return this;
  };
  // axis-aligned box. c: colour or {n,s,e,w,t}. dec: {n,s,e,w,t: [[u0,v0,u1,v1,col,emit],...]}
  Mesh.prototype.box = function (x0, x1, y0, y1, z0, z1, c, dec, skip) {
    dec = dec || {}; skip = skip || {};
    function C(k) { return typeof c === "string" || Array.isArray(c) ? c : (c[k] || c.all); }
    if (!skip.s) this.face([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], C("s"), dec.s);
    if (!skip.n) this.face([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], C("n"), dec.n);
    if (!skip.e) this.face([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], C("e"), dec.e);
    if (!skip.w) this.face([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], C("w"), dec.w);
    if (!skip.t) this.face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], C("t"), dec.t);
    return this;
  };
  // gable roof over a box footprint; ridge runs along "x" or "z"; ov = overhang
  Mesh.prototype.gable = function (x0, x1, z0, z1, y, h, axis, roofC, endC, ov) {
    ov = ov || 0.4;
    var X0 = x0 - ov, X1 = x1 + ov, Z0 = z0 - ov, Z1 = z1 + ov, top = y + h, yo = y - ov * 0.3;
    if (axis === "x") {
      var zm = (z0 + z1) / 2;
      this.poly([[X0, yo, Z0], [X1, yo, Z0], [X1, top, zm], [X0, top, zm]], roofC);
      this.poly([[X1, yo, Z1], [X0, yo, Z1], [X0, top, zm], [X1, top, zm]], roofC);
      this.poly([[x1, y, z0], [x1, y, z1], [x1, top, zm]], endC);
      this.poly([[x0, y, z1], [x0, y, z0], [x0, top, zm]], endC);
    } else {
      var xm = (x0 + x1) / 2;
      this.poly([[X0, yo, Z1], [X0, yo, Z0], [xm, top, Z0], [xm, top, Z1]], roofC);
      this.poly([[X1, yo, Z0], [X1, yo, Z1], [xm, top, Z1], [xm, top, Z0]], roofC);
      this.poly([[x0, y, z0], [x1, y, z0], [xm, top, z0]], endC);
      this.poly([[x1, y, z1], [x0, y, z1], [xm, top, z1]], endC);
    }
    return this;
  };
  Mesh.prototype.done = function () {
    var mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, mnz = 1e9, mxz = -1e9;
    this.polys.forEach(function (p) {
      for (var i = 0; i < p.p.length; i += 3) {
        mnx = Math.min(mnx, p.p[i]); mxx = Math.max(mxx, p.p[i]);
        mny = Math.min(mny, p.p[i + 1]); mxy = Math.max(mxy, p.p[i + 1]);
        mnz = Math.min(mnz, p.p[i + 2]); mxz = Math.max(mxz, p.p[i + 2]);
      }
    });
    this.cx = (mnx + mxx) / 2; this.cy = (mny + mxy) / 2; this.cz = (mnz + mxz) / 2;
    this.rad = Math.hypot(mxx - mnx, mxy - mny, mxz - mnz) / 2;
    this.aabb = [mnx, mxx, mnz, mxz];
    return this;
  };

  // ---------- renderer ----------
  function R3(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext("2d");
    this.cam = { x: 0, y: 3, z: -5, yaw: 0, pitch: 0.3 };
    this.tmp = [0, 0, 0];
    this.gOut = [0, 0, 0];
    this.lights = [];
  }
  R3.Mesh = Mesh;
  R3.prototype.resize = function (W, H) {
    this.W = W; this.H = H;
    this.cv.width = W; this.cv.height = H;
    this.img = this.ctx.createImageData(W, H);
    this.u32 = new Uint32Array(this.img.data.buffer);
    this.f = Math.min(H * 0.92, W * 0.95);
    this.cy0 = Math.round(H * 0.5);
  };
  R3.prototype.setCam = function (c) {
    var k = this.cam;
    k.x = c.x; k.y = c.y; k.z = c.z; k.yaw = c.yaw; k.pitch = c.pitch;
    this.cyw = Math.cos(c.yaw); this.syw = Math.sin(c.yaw);
    this.cp = Math.cos(c.pitch); this.sp = Math.sin(c.pitch);
  };
  // world -> camera space, into this.tmp (x right, y up, z depth)
  R3.prototype.toCam = function (x, y, z) {
    var k = this.cam, dx = x - k.x, dy = y - k.y, dz = z - k.z;
    var xr = dx * this.cyw - dz * this.syw, zr = dx * this.syw + dz * this.cyw;
    var t = this.tmp;
    t[0] = xr; t[1] = dy * this.cp + zr * this.sp; t[2] = zr * this.cp - dy * this.sp;
    return t;
  };
  R3.prototype.project = function (x, y, z) {
    var t = this.toCam(x, y, z);
    if (t[2] < 0.05) return null;
    return { x: this.W / 2 + this.f * t[0] / t[2], y: this.cy0 - this.f * t[1] / t[2], z: t[2] };
  };

  // env: { sky:[cols top->horizon], fog:col, fogNear, fogFar, amb:[r,g,b], ridge:fn(az)->elev|null, ridgeCol:fn, stars }
  R3.prototype.begin = function (env) {
    this.env = env;
    this.fogC = U.col(env.fog);
    this.amb = env.amb || [1, 1, 1];
  };

  R3.prototype.horizonRow = function () { return this.cy0 - this.f * Math.tan(this.cam.pitch); };

  R3.prototype.drawSky = function (t) {
    var W = this.W, H = this.H, u = this.u32, env = this.env, sky = env.sky, n = sky.length - 1;
    var hy = Math.min(H, Math.ceil(this.horizonRow()) + 2);
    var packed = sky.map(function (c) { c = U.col(c); return U.pack(c[0] | 0, c[1] | 0, c[2] | 0); });
    for (var y = 0; y < hy; y++) {
      var yc = -(y + 0.5 - this.cy0) / this.f;
      var dy = yc * this.cp - this.sp, zr = yc * this.sp + this.cp;
      var e = Math.atan2(dy, zr); // elevation of this row
      var tt = U.clamp(1 - e / 0.9, 0, 1) * n, i = Math.floor(tt), fr = tt - i;
      if (i >= n) { i = n - 1; fr = 1; }
      var a = packed[i], b = packed[i + 1], row = y * W;
      for (var x = 0; x < W; x++) u[row + x] = fr > bay(x, y) ? b : a;
    }
    if (env.stars) this.drawStars(t);
    if (env.ridge) this.drawRidge();
  };

  R3.prototype.dirToScreen = function (az, el) {
    // direction (bearing az, elevation el) -> screen, ignoring camera position
    var ce = Math.cos(el), dx = Math.sin(az) * ce, dy = Math.sin(el), dz = Math.cos(az) * ce;
    var xr = dx * this.cyw - dz * this.syw, zr = dx * this.syw + dz * this.cyw;
    var y2 = dy * this.cp + zr * this.sp, z2 = zr * this.cp - dy * this.sp;
    if (z2 < 0.02) return null;
    return [this.W / 2 + this.f * xr / z2, this.cy0 - this.f * y2 / z2];
  };

  R3.prototype.drawStars = function (t) {
    var st = this.env.stars, u = this.u32, W = this.W, H = this.H;
    for (var i = 0; i < st.length; i++) {
      var s = st[i], p = this.dirToScreen(s.az, s.el);
      if (!p) continue;
      var x = p[0] | 0, y = p[1] | 0;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      var a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * (s.sp || 0.5) + s.p));
      var c = s.c || [255, 243, 214], o = u[y * W + x];
      var r0 = o & 255, g0 = (o >> 8) & 255, b0 = (o >> 16) & 255;
      u[y * W + x] = U.pack((r0 + (c[0] - r0) * a) | 0, (g0 + (c[1] - g0) * a) | 0, (b0 + (c[2] - b0) * a) | 0);
      if (s.big && a > 0.6) {
        var cc = U.pack(c[0], c[1], c[2]);
        if (x > 0) u[y * W + x - 1] = cc; if (x < W - 1) u[y * W + x + 1] = cc;
        if (y > 0) u[(y - 1) * W + x] = cc; if (y < H - 1) u[(y + 1) * W + x] = cc;
      }
    }
    if (this.env.moon) {
      var m = this.env.moon, mp = this.dirToScreen(m.az, m.el);
      if (mp) {
        var mc = U.pack(244, 231, 192);
        for (var yy = -5; yy <= 5; yy++) for (var xx = -5; xx <= 5; xx++) {
          var d = Math.sqrt(xx * xx + yy * yy);
          if (d <= 5.2 && Math.sqrt((xx + 2.5) * (xx + 2.5) + (yy + 1.5) * (yy + 1.5)) > 4.6) {
            var px = (mp[0] | 0) + xx, py = (mp[1] | 0) + yy;
            if (px >= 0 && py >= 0 && px < W && py < H) u[py * W + px] = mc;
          }
        }
      }
    }
  };

  // mountains: env.ridge(az) gives the crest elevation (radians) or null; env.rock(az, depth, x, y) gives colour
  R3.prototype.drawRidge = function () {
    var env = this.env, W = this.W, H = this.H, u = this.u32, hy = this.horizonRow();
    var haze = env.ridgeHaze == null ? 0.25 : env.ridgeHaze, fc = this.fogC;
    for (var x = 0; x < W; x++) {
      var xr = (x + 0.5 - W / 2) / this.f;
      var a = Math.atan(xr * this.cp), az = this.cam.yaw + a + (env.north || 0);
      var el = env.ridge(az);
      if (el == null || el <= 0) continue;
      var ca = Math.cos(a), te = Math.tan(el);
      var yc = (te * this.cp + ca * this.sp) / (ca * this.cp - te * this.sp);
      var top = Math.round(this.cy0 - this.f * yc);
      var bot = Math.min(H, Math.ceil(hy) + 1);
      for (var y = Math.max(0, top); y < bot; y++) {
        var dep = (y - top) / Math.max(1, bot - top);
        var c = env.rock(az, dep, x, y, y - top);
        var h = haze + (1 - haze) * Math.pow(dep, 3) * 0.5;
        u[y * W + x] = U.pack((c[0] + (fc[0] - c[0]) * h) | 0, (c[1] + (fc[1] - c[1]) * h) | 0, (c[2] + (fc[2] - c[2]) * h) | 0);
      }
    }
  };

  // ground: scene.ground(x, z, out, dist) fills out with rgb; scene.low = {y, ground, inside(x,z)} for a drop-off
  R3.prototype.drawGround = function (scene) {
    var W = this.W, H = this.H, u = this.u32, k = this.cam, f = this.f, out = this.gOut;
    var env = this.env, fc = this.fogC, fn = env.fogNear, ff = env.fogFar, amb = this.amb;
    var L = this.lights, nL = L.length, low = scene.low;
    var y0 = Math.max(0, Math.floor(this.horizonRow()));
    var cyw = this.cyw, syw = this.syw;
    for (var y = y0; y < H; y++) {
      var yc = -(y + 0.5 - this.cy0) / f;
      var dy = yc * this.cp - this.sp, zr = yc * this.sp + this.cp;
      if (dy > -1e-4) continue;
      var t = -k.y / dy;
      var xr0 = (0.5 - W / 2) / f, dxr = 1 / f;
      var wx = k.x + t * (xr0 * cyw + zr * syw), wz = k.z + t * (-xr0 * syw + zr * cyw);
      var sx = t * dxr * cyw, sz = -t * dxr * syw;
      var dist = t * zr, fg = U.clamp((dist - fn) / (ff - fn), 0, 1);
      if (dist > ff * 1.05 && !low) { var fp = U.pack(fc[0] | 0, fc[1] | 0, fc[2] | 0); for (var q = 0; q < W; q++) u[y * W + q] = fp; continue; }
      var row = y * W;
      for (var x = 0; x < W; x++, wx += sx, wz += sz) {
        var fgx = fg, gx = wx, gz = wz, lowHit = false;
        if (low && !low.inside(wx, wz)) {
          var t2 = (low.y - k.y) / dy, xr = xr0 + x * dxr;
          gx = k.x + t2 * (xr * cyw + zr * syw); gz = k.z + t2 * (-xr * syw + zr * cyw);
          var d2 = t2 * zr; fgx = U.clamp((d2 - low.fogNear) / (low.fogFar - low.fogNear), 0, 1); lowHit = true;
          low.ground(gx, gz, out, d2, x, y);
        } else scene.ground(wx, wz, out, dist, x, y);
        var r = out[0], g = out[1], b = out[2];
        if (out.emit) { out.emit = false; }
        else {
          var lr = amb[0], lg = amb[1], lb = amb[2];
          if (!lowHit) for (var i = 0; i < nL; i++) {
            var Lt = L[i], ddx = wx - Lt.x, ddz = wz - Lt.z, d = ddx * ddx + ddz * ddz;
            if (d >= Lt.r2) continue;
            var q2 = (1 - Math.sqrt(d) / Lt.r) * Lt.i;
            q2 = Math.floor(q2 * 5 + bay(x, y)) / 5; // banded pools of light
            lr += Lt.c[0] * q2; lg += Lt.c[1] * q2; lb += Lt.c[2] * q2;
          }
          r *= lr; g *= lg; b *= lb;
        }
        if (fgx > 0) { r += (fc[0] - r) * fgx; g += (fc[1] - g) * fgx; b += (fc[2] - b) * fgx; }
        u[row + x] = U.pack(r > 255 ? 255 : r | 0, g > 255 ? 255 : g | 0, b > 255 ? 255 : b | 0);
      }
    }
  };


  // hilly ground: march each screen column out from the camera over scene.height(x,z),
  // front to back, filling down to what's already drawn. Keeps a depth per pixel so
  // sprites behind a ridge stay hidden.
  R3.prototype.drawTerrain = function (scene) {
    var W = this.W, H = this.H, u = this.u32, k = this.cam, f = this.f, out = this.gOut;
    var env = this.env, fc = this.fogC, fn = env.fogNear, ff = env.fogFar, amb = this.amb, L = this.lights, nL = L.length;
    if (!this.zbuf || this.zbuf.length !== W * H) this.zbuf = new Float32Array(W * H);
    var zb = this.zbuf; zb.fill(1e9);
    var hf = scene.height, cyw = this.cyw, syw = this.syw, cp = this.cp, sp = this.sp, cy0 = this.cy0;
    for (var x = 0; x < W; x++) {
      var xr = (x + 0.5 - W / 2) / f; // camera-space direction with zr = 1 (horizontal)
      var dx = xr * cyw + syw, dz = -xr * syw + cyw, len = Math.sqrt(1 + xr * xr);
      var ybot = H, d = 0.6, step = 0.12;
      while (d < ff * 1.1 && ybot > 0) {
        var wx = k.x + dx * d, wz = k.z + dz * d, h = hf(wx, wz);
        // project (depth along view, height) -> screen row
        var dy = h - k.y, y2 = dy * cp + d * sp, z2 = d * cp - dy * sp;
        if (z2 > 0.05) {
          var sy = Math.floor(cy0 - f * y2 / z2);
          if (sy < ybot) {
            scene.ground(wx, wz, out, d * len, x, sy);
            var r = out[0], g = out[1], b = out[2];
            // shade slopes: compare with a step further on
            var h2 = hf(wx + dx * 0.4, wz + dz * 0.4), sl = U.clamp((h2 - h) * 0.6, -0.3, 0.3) - Math.abs(U.clamp((h2 - h) * 0.5, -0.25, 0.25));
            var lr = amb[0], lg = amb[1], lb = amb[2];
            for (var i = 0; i < nL; i++) {
              var Lt = L[i], ex = wx - Lt.x, ez = wz - Lt.z, dd = ex * ex + ez * ez;
              if (dd >= Lt.r2) continue;
              var q = Math.floor((1 - Math.sqrt(dd) / Lt.r) * Lt.i * 5 + 0.5) / 5;
              lr += Lt.c[0] * q; lg += Lt.c[1] * q; lb += Lt.c[2] * q;
            }
            var sh = 1 + sl;
            r *= lr * sh; g *= lg * sh; b *= lb * sh;
            var fg = U.clamp((d * len - fn) / (ff - fn), 0, 1);
            if (fg > 0) { r += (fc[0] - r) * fg; g += (fc[1] - g) * fg; b += (fc[2] - b) * fg; }
            var col = U.pack(r > 255 ? 255 : r | 0, g > 255 ? 255 : g | 0, b > 255 ? 255 : b | 0);
            for (var yy = Math.max(0, sy); yy < ybot; yy++) { u[yy * W + x] = col; zb[yy * W + x] = z2; }
            ybot = Math.max(0, sy);
          }
        }
        d += step; step *= 1.012;
      }
    }
  };

  // light at a world point -> multipliers
  R3.prototype.lightAt = function (x, z, out) {
    var a = this.amb; out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
    for (var i = 0; i < this.lights.length; i++) {
      var L = this.lights[i], dx = x - L.x, dz = z - L.z, d = dx * dx + dz * dz;
      if (d >= L.r2) continue;
      var q = (1 - Math.sqrt(d) / L.r) * L.i * 0.9;
      out[0] += L.c[0] * q; out[1] += L.c[1] * q; out[2] += L.c[2] * q;
    }
    return out;
  };
  R3.prototype.fogAt = function (d) { return U.clamp((d - this.env.fogNear) / (this.env.fogFar - this.env.fogNear), 0, 1); };

  // ---------- drawables ----------
  // list items: {k:"mesh", m}, {k:"spr", x,y,z,h,spr,flip,int,shadow,emit}, {k:"pt", x,y,z,s,c,glow}, {k:"line", a,b,c}
  R3.prototype.drawList = function (items) {
    var self = this, L = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], t;
      if (it.k === "mesh") {
        t = this.toCam(it.m.cx + (it.m.ox || 0), it.m.cy, it.m.cz + (it.m.oz || 0));
        if (t[2] < -it.m.rad || t[2] > this.env.fogFar + it.m.rad) continue;
        if (Math.abs(t[0]) > t[2] * this.W / this.f + it.m.rad * 1.5) continue;
        it._d = t[2] + (it.bias || 0);
      } else if (it.k === "line") {
        t = this.toCam((it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, (it.a[2] + it.b[2]) / 2);
        it._d = t[2];
      } else {
        t = this.toCam(it.x, it.y || 0, it.z);
        if (t[2] < 0.2 || t[2] > this.env.fogFar) continue;
        it._d = t[2] + (it.bias || 0);
      }
      L.push(it);
    }
    L.sort(function (a, b) { return b._d - a._d; });
    for (var j = 0; j < L.length; j++) {
      var o = L[j];
      if (o.k === "mesh") self.drawMesh(o.m);
      else if (o.k === "spr") self.drawSprite(o);
      else if (o.k === "pt") self.drawPt(o);
      else if (o.k === "line") self.drawLine(o);
    }
  };

  var CLIP = [], CLIP2 = [];
  R3.prototype.drawMesh = function (m) {
    var k = this.cam, lt = [0, 0, 0], fc = this.fogC, ox = m.ox || 0, oz = m.oz || 0;
    for (var i = 0; i < m.polys.length; i++) {
      var p = m.polys[i], P = p.p, n = p.n;
      if (!p.two && (n[0] * (k.x - P[0] - ox) + n[1] * (k.y - P[1]) + n[2] * (k.z - P[2] - oz)) <= 0) continue;
      // to camera space
      var cnt = P.length / 3; CLIP.length = 0;
      for (var j = 0; j < cnt; j++) { var t = this.toCam(P[j * 3] + ox, P[j * 3 + 1], P[j * 3 + 2] + oz); CLIP.push(t[0], t[1], t[2]); }
      var poly = this.clipNear(CLIP, cnt);
      if (!poly) continue;
      // shade
      var c = p.c, r, g, b;
      if (p.emit) { r = c[0]; g = c[1]; b = c[2]; }
      else {
        this.lightAt(p.cx + ox, p.cz + oz, lt);
        r = c[0] * p.sh * lt[0]; g = c[1] * p.sh * lt[1]; b = c[2] * p.sh * lt[2];
      }
      var d = this.toCam(p.cx + ox, p.cy, p.cz + oz)[2], fg = this.fogAt(d);
      if (p.emit) fg *= 0.5;
      r += (fc[0] - r) * fg; g += (fc[1] - g) * fg; b += (fc[2] - b) * fg;
      this.fillPoly(poly, U.pack(Math.min(255, r) | 0, Math.min(255, g) | 0, Math.min(255, b) | 0));
    }
  };
  R3.prototype.clipNear = function (C, cnt) {
    var near = 0.06; CLIP2.length = 0;
    for (var i = 0; i < cnt; i++) {
      var j = (i + 1) % cnt;
      var ax = C[i * 3], ay = C[i * 3 + 1], az = C[i * 3 + 2], bx = C[j * 3], by = C[j * 3 + 1], bz = C[j * 3 + 2];
      var ain = az >= near, bin = bz >= near;
      if (ain) CLIP2.push(ax, ay, az);
      if (ain !== bin) { var tt = (near - az) / (bz - az); CLIP2.push(ax + (bx - ax) * tt, ay + (by - ay) * tt, near); }
    }
    if (CLIP2.length < 9) return null;
    var out = [], W2 = this.W / 2, f = this.f, cy0 = this.cy0;
    for (var q = 0; q < CLIP2.length; q += 3) out.push(W2 + f * CLIP2[q] / CLIP2[q + 2], cy0 - f * CLIP2[q + 1] / CLIP2[q + 2]);
    return out;
  };
  R3.prototype.fillPoly = function (pts, col) {
    var W = this.W, H = this.H, u = this.u32, n = pts.length / 2, mn = 1e9, mx = -1e9;
    for (var i = 0; i < n; i++) { mn = Math.min(mn, pts[i * 2 + 1]); mx = Math.max(mx, pts[i * 2 + 1]); }
    var y0 = Math.max(0, Math.ceil(mn - 0.5)), y1 = Math.min(H - 1, Math.ceil(mx - 0.5) - 1);
    for (var y = y0; y <= y1; y++) {
      var sy = y + 0.5, xl = 1e9, xr = -1e9;
      for (var e = 0; e < n; e++) {
        var ax = pts[e * 2], ay = pts[e * 2 + 1], f2 = (e + 1) % n, bx = pts[f2 * 2], by = pts[f2 * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          var x = ax + (sy - ay) * (bx - ax) / (by - ay);
          if (x < xl) xl = x; if (x > xr) xr = x;
        }
      }
      if (xl > xr) continue;
      var a = Math.max(0, Math.ceil(xl - 0.5)), b = Math.min(W - 1, Math.ceil(xr - 0.5) - 1), row = y * W;
      for (var x2 = a; x2 <= b; x2++) u[row + x2] = col;
    }
  };

  // sprite: {w,h,d: Uint8ClampedArray rgba}
  R3.prototype.drawSprite = function (o) {
    var t = this.toCam(o.x, (o.y || 0) + (this.hfn ? this.hfn(o.x, o.z) : 0), o.z);
    if (t[2] < 0.2) return;
    var W = this.W, H = this.H, u = this.u32, s = o.spr, z = t[2];
    var sx = W / 2 + this.f * t[0] / z, sy = this.cy0 - this.f * t[1] / z;
    var sc = (o.h * this.f / z) / s.h;
    if (o.int) sc = Math.max(1, Math.round(sc));
    var dw = s.w * sc, dh = s.h * sc;
    var x0 = Math.round(sx - dw / 2), y0 = Math.round(sy - dh), x1 = Math.round(sx + dw / 2), y1 = Math.round(sy);
    if (x1 < 0 || x0 >= W || y1 < 0 || y0 >= H) return;
    var lt = [1, 1, 1];
    if (!o.emit) this.lightAt(o.x, o.z, lt);
    var fg = this.fogAt(z), fc = this.fogC, k = o.tint || 1, al = o.alpha == null ? 1 : o.alpha;
    if (!o.int && z < 4.6) al = Math.min(al, (z - 1.4) / 3.2); // things between the camera and you dissolve
    if (al <= 0) return;
    // soft blob shadow on the ground
    if (o.shadow && !this.env.dark) {
      var sw = Math.round(dw * 0.36), shy = y1 - Math.max(1, Math.round(sc * 0.6));
      for (var yy = shy; yy <= y1; yy++) for (var xx = Math.round(sx - sw); xx <= Math.round(sx + sw); xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (((xx - sx) / sw) * ((xx - sx) / sw) + ((yy - (shy + y1) / 2) / Math.max(1, (y1 - shy) / 2 + 0.5)) * ((yy - (shy + y1) / 2) / Math.max(1, (y1 - shy) / 2 + 0.5)) > 1) continue;
        var q = u[yy * W + xx];
        u[yy * W + xx] = U.pack(((q & 255) * 0.72) | 0, (((q >> 8) & 255) * 0.72) | 0, (((q >> 16) & 255) * 0.74) | 0);
      }
    }
    var d = s.d, flip = o.flip, zb = this.hfn ? this.zbuf : null;
    for (var y = Math.max(0, y0); y < Math.min(H, y1); y++) {
      var v = Math.min(s.h - 1, ((y - y0) / sc) | 0), row = y * W;
      for (var x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        var uu = Math.min(s.w - 1, ((x - x0) / sc) | 0);
        if (flip) uu = s.w - 1 - uu;
        var i = (v * s.w + uu) * 4;
        if (d[i + 3] < 128) continue;
        if (al < 1 && al < bay(x, y)) continue;
        if (zb && zb[row + x] < z - 0.4) continue;
        var r = d[i] * lt[0] * k, g = d[i + 1] * lt[1] * k, b = d[i + 2] * lt[2] * k;
        if (s.e && s.e[v * s.w + uu]) { r = d[i]; g = d[i + 1]; b = d[i + 2]; }
        r += (fc[0] - r) * fg; g += (fc[1] - g) * fg; b += (fc[2] - b) * fg;
        u[row + x] = U.pack(r > 255 ? 255 : r | 0, g > 255 ? 255 : g | 0, b > 255 ? 255 : b | 0);
      }
    }
    o._sx = sx; o._sy = sy; o._sc = sc;
  };
  R3.prototype.drawPt = function (o) {
    var t = this.toCam(o.x, o.y + (this.hfn ? this.hfn(o.x, o.z) : 0), o.z);
    if (t[2] < 0.2) return;
    var W = this.W, H = this.H, u = this.u32;
    var sx = W / 2 + this.f * t[0] / t[2], sy = this.cy0 - this.f * t[1] / t[2];
    var s = Math.max(1, Math.round((o.s || 0.1) * this.f / t[2])), c = U.col(o.c);
    var lt = [1, 1, 1];
    if (!o.glow) this.lightAt(o.x, o.z, lt);
    var fg = o.glow ? 0 : this.fogAt(t[2]), fc = this.fogC;
    var col = U.pack(Math.min(255, (c[0] * lt[0] + (fc[0] - c[0] * lt[0]) * fg)) | 0, Math.min(255, (c[1] * lt[1] + (fc[1] - c[1] * lt[1]) * fg)) | 0, Math.min(255, (c[2] * lt[2] + (fc[2] - c[2] * lt[2]) * fg)) | 0);
    var x0 = Math.round(sx - s / 2), y0 = Math.round(sy - s / 2);
    for (var y = y0; y < y0 + s; y++) for (var x = x0; x < x0 + s; x++) if (x >= 0 && y >= 0 && x < W && y < H) u[y * W + x] = col;
  };
  R3.prototype.drawLine = function (o) {
    var a = this.toCam(o.a[0], o.a[1], o.a[2]).slice(), b = this.toCam(o.b[0], o.b[1], o.b[2]).slice();
    var near = 0.1;
    if (a[2] < near && b[2] < near) return;
    if (a[2] < near) { var t = (near - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]; }
    if (b[2] < near) { var t2 = (near - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t2, b[1] + (a[1] - b[1]) * t2, near]; }
    var W2 = this.W / 2, f = this.f, cy0 = this.cy0;
    var x0 = W2 + f * a[0] / a[2], y0 = cy0 - f * a[1] / a[2], x1 = W2 + f * b[0] / b[2], y1 = cy0 - f * b[1] / b[2];
    var c = U.col(o.c), lt = [1, 1, 1]; this.lightAt((o.a[0] + o.b[0]) / 2, (o.a[2] + o.b[2]) / 2, lt);
    var fg = this.fogAt((a[2] + b[2]) / 2), fc = this.fogC;
    var col = U.pack((c[0] * lt[0] + (fc[0] - c[0] * lt[0]) * fg) | 0, (c[1] * lt[1] + (fc[1] - c[1] * lt[1]) * fg) | 0, (c[2] * lt[2] + (fc[2] - c[2] * lt[2]) * fg) | 0);
    var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    if (n > 2000) n = 2000;
    var W = this.W, H = this.H, u = this.u32;
    for (var i = 0; i <= n; i++) {
      var x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1));
      if (x >= 0 && y >= 0 && x < W && y < H) u[y * W + x] = col;
    }
  };

  R3.prototype.present = function () { this.ctx.putImageData(this.img, 0, 0); };

  GG.R3 = R3;
})();
