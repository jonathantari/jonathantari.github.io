// Pixel-art sprites, drawn procedurally once and cached.
// A sprite is {w, h, d: rgba bytes, e: emissive mask?, cv: canvas}.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util;
  var OUT = [36, 30, 40];

  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  // draw with a little pen into a w x h buffer, then outline it
  function make(w, h, fn, opts) {
    opts = opts || {};
    var pad = opts.outline === false ? 0 : 1;
    var buf = new Array(w * h).fill(null), em = {};
    var pen = {
      px: function (x, y, c, e) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; buf[y * w + x] = c ? U.col(c) : null; if (e) em[y * w + x] = 1; else delete em[y * w + x]; },
      r: function (x, y, ww, hh, c, e) { for (var j = 0; j < hh; j++) for (var i = 0; i < ww; i++) pen.px(x + i, y + j, c, e); },
      get: function (x, y) { return buf[y * w + x]; },
      blob: function (cx, cy, rx, ry, cfn) {
        for (var y = Math.floor(cy - ry); y <= cy + ry; y++) for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
          var d = ((x + 0.5 - cx) / rx) * ((x + 0.5 - cx) / rx) + ((y + 0.5 - cy) / ry) * ((y + 0.5 - cy) / ry);
          if (d <= 1) { var c = cfn(x, y, d); if (c) pen.px(x, y, c); }
        }
      },
      line: function (x0, y0, x1, y1, c) {
        var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
        for (var i = 0; i <= n; i++) pen.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
      },
      w: w, h: h
    };
    fn(pen);
    var W = w + pad * 2, H = h + pad * 2, d = new Uint8ClampedArray(W * H * 4), e = new Uint8Array(W * H), anyE = false;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = buf[y * w + x]; if (!c) continue;
      var o = ((y + pad) * W + x + pad);
      d[o * 4] = c[0]; d[o * 4 + 1] = c[1]; d[o * 4 + 2] = c[2]; d[o * 4 + 3] = 255;
      if (em[y * w + x]) { e[o] = 1; anyE = true; }
    }
    if (pad) {
      var oc = U.col(opts.outline || OUT), copy = new Uint8ClampedArray(d);
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
        var i = (y2 * W + x2) * 4; if (copy[i + 3]) continue;
        var near = false;
        for (var k = 0; k < 4 && !near; k++) {
          var nx = x2 + [1, -1, 0, 0][k], ny = y2 + [0, 0, 1, -1][k];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && copy[(ny * W + nx) * 4 + 3]) near = true;
        }
        if (near) { d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2]; d[i + 3] = 255; }
      }
    }
    var cv = canvas(W, H), cx = cv.getContext("2d"), img = cx.createImageData(W, H);
    img.data.set(d); cx.putImageData(img, 0, 0);
    return { w: W, h: H, d: d, e: anyE ? e : null, cv: cv };
  }
  // string art: rows of chars, palette maps char -> colour ("." is clear)
  function art(rows, pal, opts) {
    return make(rows[0].length, rows.length, function (p) {
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x]; if (ch !== "." && pal[ch]) p.px(x, y, pal[ch], opts && opts.emit && opts.emit.indexOf(ch) >= 0); } });
    }, opts);
  }

  var cache = {};
  function memo(key, fn) { return cache[key] || (cache[key] = fn()); }

  // ---------- people ----------
  // o: {dir: back|front|side, frame 0..3, cap, hair, skin, shirt, pants, shoes, pack, kid, hat, beard, gray, flip}
  function person(o) {
    var key = "p" + JSON.stringify(o);
    return memo(key, function () {
      var kid = o.kid, H = kid ? 17 : 22;
      return make(12, H, function (p) {
        var skin = U.col(o.skin || "#e8b896"), skinS = U.dk(skin, 0.85), hair = U.col(o.hair || "#5a3a24");
        var shirt = U.col(o.shirt || "#3f8f86"), shirtD = U.dk(shirt, 0.8), pants = U.col(o.pants || "#34405e"), pantsD = U.dk(pants, 0.8);
        var shoe = U.col(o.shoes || "#4a3428"), cap = U.col(o.cap || "#c8473f"), capD = U.dk(cap, 0.78), pack = U.col(o.pack || "#d9a441"), packD = U.dk(pack, 0.75);
        var hat = o.hat || "cap", f = o.frame || 0, step = f === 1 ? 1 : f === 3 ? -1 : 0;
        var hy = 0, ty = kid ? 7 : 9, th = kid ? 5 : 7, ly = ty + th, lh = kid ? 3 : 5;
        var bob = (f === 1 || f === 3) ? 0 : 0;
        // head
        if (o.dir === "side") {
          p.r(3, hy + 2, 6, 6, skin);
          p.r(3, hy + 2, 3, 5, hair);
          p.px(5, hy + 5, skinS);
          p.px(8, hy + 4, "#2a2430");
          if (o.beard) p.r(6, hy + 6, 3, 2, hair);
          if (hat === "cap") { p.r(3, hy, 6, 3, cap); p.r(4, hy - 1 < 0 ? 0 : hy, 4, 1, cap); p.r(7, hy + 2, 4, 1, capD); }
          else if (hat === "ranger") { p.r(2, hy + 1, 9, 1, "#7a6040"); p.r(4, hy, 5, 1, "#8a6e4a"); }
          else if (hat === "beanie") p.r(3, hy, 6, 3, cap);
          else if (hat === "bun") { p.r(3, hy + 1, 6, 2, hair); p.r(2, hy, 3, 3, hair); }
          else p.r(3, hy + 1, 6, 2, hair);
        } else {
          p.r(3, hy + 2, 6, 6, o.dir === "back" ? hair : skin);
          if (o.dir === "front") {
            p.px(3, hy + 3, hair); p.px(8, hy + 3, hair);
            p.px(4, hy + 5, "#2a2430"); p.px(7, hy + 5, "#2a2430");
            if (o.beard) p.r(4, hy + 6, 4, 2, hair);
            else p.px(5, hy + 7, skinS), p.px(6, hy + 7, skinS);
            if (o.glasses) { p.r(3, hy + 5, 2, 1, "#2a2430"); p.r(7, hy + 5, 2, 1, "#2a2430"); }
          }
          p.px(2, hy + 5, skin); p.px(9, hy + 5, skin);
          if (hat === "cap") {
            p.r(3, hy, 6, 3, cap); p.r(4, hy - 1 < 0 ? 0 : hy, 4, 1, cap);
            if (o.dir === "front") p.r(2, hy + 3, 8, 1, capD);
            else { p.r(3, hy + 3, 6, 1, capD); p.px(5, hy + 3, hair); p.px(6, hy + 3, hair); }
            p.px(5, hy, U.mix(cap, [255, 255, 255], 0.25));
          } else if (hat === "ranger") { p.r(1, hy + 2, 10, 1, "#7a6040"); p.r(3, hy, 6, 2, "#8a6e4a"); }
          else if (hat === "beanie") { p.r(3, hy, 6, 3, cap); p.r(3, hy + 2, 6, 1, capD); }
          else if (hat === "bun") { p.r(3, hy + 1, 6, 2, hair); p.r(4, hy - 0, 4, 2, hair); }
          else p.r(3, hy + 1, 6, 2, hair);
        }
        // neck and body
        p.r(4, ty - 1, 4, 1, skinS);
        if (o.dir === "side") {
          p.r(4, ty, 5, th, shirt); p.r(8, ty, 1, th, shirtD);
          if (o.pack !== "none") { p.r(2, ty, 2, th - 1, pack); p.r(2, ty + th - 2, 2, 1, packD); }
          var ax = 6 + step;
          p.r(ax, ty + 1, 1, th - 3, shirtD); p.px(ax, ty + th - 2, skin); p.px(ax, ty + th - 1, skin);
        } else {
          p.r(2, ty, 8, th, shirt); p.r(9, ty, 1, th, shirtD);
          var as = step;
          p.r(1, ty + 1 + (as > 0 ? 1 : 0), 1, th - 3, shirt); p.r(10, ty + 1 + (as < 0 ? 1 : 0), 1, th - 3, shirtD);
          p.px(1, ty + th - 2 + (as > 0 ? 1 : 0), skin); p.px(10, ty + th - 2 + (as < 0 ? 1 : 0), skin);
          if (o.pack !== "none") {
            if (o.dir === "back") {
              p.r(3, ty, 6, th - 1, pack); p.r(3, ty, 6, 2, packD); p.r(4, ty + 3, 4, 2, packD); p.px(5, ty + 1, pack); p.px(6, ty + 1, pack);
            } else { p.r(3, ty, 1, th - 2, packD); p.r(8, ty, 1, th - 2, packD); }
          }
        }
        // legs
        if (o.dir === "side") {
          if (step === 0) { p.r(5, ly, 3, lh, pants); p.r(5, ly + lh, 4, 1, shoe); }
          else {
            p.r(4, ly, 2, lh - 1, pantsD); p.px(3, ly + lh - 1, pantsD); p.r(2, ly + lh, 3, 1, shoe);
            p.r(7, ly, 2, lh - 1, pants); p.px(8, ly + lh - 1, pants); p.r(8, ly + lh, 3, 1, shoe);
          }
        } else {
          var lL = step > 0 ? 1 : 0, rL = step < 0 ? 1 : 0;
          p.r(3, ly, 3, lh - lL, pants); p.r(6, ly, 3, lh - rL, pantsD);
          p.r(3, ly + lh - lL, 3, 1, shoe); p.r(6, ly + lh - rL, 3, 1, shoe);
        }
        if (o.gray) { /* gray handled via hair colour */ }
      });
    });
  }

  // ---------- animals ----------
  function puppy(f, dir) {
    return memo("pup" + f + dir, function () {
      var c = U.col("#c98a4b"), cl = U.col("#e8c49a"), cd = U.dk(c, 0.75);
      if (dir === "front") return make(10, 9, function (p) {
        p.r(2, 0, 6, 5, c); p.px(1, 1, cd); p.px(8, 1, cd); p.r(1, 0, 1, 3, cd); p.r(8, 0, 1, 3, cd);
        p.r(3, 3, 4, 2, cl); p.px(3, 2, "#2a2026"); p.px(6, 2, "#2a2026"); p.px(4, 3, "#2a2026"); p.px(5, 3, "#2a2026");
        p.px(4, 5, "#d06070");
        p.r(2, 5, 6, 3, c); p.r(3, 5, 4, 3, cl); p.r(2, 8, 2, 1, cd); p.r(6, 8, 2, 1, cd);
      });
      return make(13, 9, function (p) {
        var s = f % 2;
        p.r(2, 3, 7, 3, c); p.r(3, 5, 5, 1, cl);
        p.r(8, 0, 4, 4, c); p.r(11, 2, 2, 2, cl); p.px(12, 2, "#2a2026"); p.px(10, 1, "#2a2026");
        p.r(8, 0, 2, 3, cd);
        p.px(1, 2 - s, c); p.px(0, 1 - s, c);
        p.r(2, 6, 1, 2 + s, cd); p.r(4, 6, 1, 2 - s, c); p.r(6, 6, 1, 2 + s, cd); p.r(8, 6, 1, 2 - s, c);
      });
    });
  }
  function dog(f) {
    return memo("dog" + f, function () {
      var c = U.col("#d9b36a"), cd = U.dk(c, 0.78);
      return make(18, 12, function (p) {
        var s = f % 2;
        p.r(3, 4, 11, 4, c); p.r(4, 7, 9, 1, cd);
        p.r(12, 0, 5, 5, c); p.r(15, 3, 3, 2, U.mix(c, [255, 255, 255], 0.3)); p.px(17, 3, "#2a2026"); p.px(14, 1, "#2a2026"); p.r(12, 1, 2, 4, cd);
        p.line(2, 4, 0, 1 + s, c);
        p.r(4, 8, 2, 3 + s, cd); p.r(7, 8, 2, 3 - s, c); p.r(10, 8, 2, 3 + s, cd); p.r(12, 8, 2, 3 - s, c);
      });
    });
  }
  function cat(f, sit) {
    return memo("cat" + f + sit, function () {
      var WALK = [
        ["k.k.........", "kkk......k..", "ekw.....k...", "wkkkkkkkk...", ".wkkkkkkk...", ".w.k..k.k...", ".w.k..w.w..."],
        ["k.k.........", "kkk.......k.", "ekw......k..", "wkkkkkkkk...", ".wkkkkkkk...", "..wk..kw....", "..w....w...."]
      ];
      var SIT = [".k.k.......", ".kkk.......", "kekk.......", ".kkw.......", "..kwk......", "..kwkk.....", "..kwkkk....", "..kwkkkk...", "..wwkkkk.kk", "..wwkkkkkk."];
      return art(sit ? SIT : WALK[f % 2], { k: "#18161b", w: "#ecebe6", e: "#e8c84a" }, { outline: false });
    });
  }
  function raccoon(f) {
    return memo("rac" + f, function () {
      var g = U.col("#7d7a80"), gd = U.dk(g, 0.7), m = U.col("#2a282e"), w = U.col("#d8d4d0");
      return make(16, 9, function (p) {
        var s = f % 2;
        p.r(4, 2, 8, 4, g); p.r(5, 5, 6, 1, gd);
        p.r(11, 1, 4, 4, g); p.r(12, 2, 3, 1, m); p.px(13, 2, w); p.px(15, 3, m); p.px(11, 0, gd); p.px(13, 0, gd);
        for (var i = 0; i < 4; i++) p.px(3 - i, 3 + (i % 2) - s, i % 2 ? m : g);
        p.r(4, 6, 1, 2 + s, m); p.r(6, 6, 1, 2 - s, m); p.r(9, 6, 1, 2 + s, m); p.r(11, 6, 1, 2 - s, m);
      });
    });
  }
  function lion(f, big) {
    return memo("lion" + f + big, function () {
      var c = U.col("#c49a62"), cd = U.dk(c, 0.75), cl = U.col("#e8d2a8");
      if (big) return make(34, 26, function (p) {
        // a crouched cat seen three-quarters, head low, tail curled
        p.blob(19, 15, 12, 6, function (x, y, d) { return d < 0.5 && y > 15 ? cl : (x > 26 ? cd : c); });
        p.blob(8, 12, 7, 6.5, function (x, y, d) { return y > 13 && Math.abs(x - 8) < 3 ? cl : c; });
        p.r(2, 6, 3, 3, cd); p.r(11, 6, 3, 3, cd); p.px(3, 7, "#8a5a4a"); p.px(12, 7, "#8a5a4a");
        p.r(4, 10, 2, 2, f ? "#2a2026" : "#e0c040"); p.r(10, 10, 2, 2, f ? "#2a2026" : "#e0c040");
        if (!f) { p.px(4, 10, "#2a2026"); p.px(10, 11, "#2a2026"); }
        p.r(7, 13, 3, 2, "#5a3a34"); p.r(6, 16, 5, 1, "#5a3a34");
        p.r(10, 19, 3, 5, c); p.r(23, 19, 3, 5, c); p.r(28, 18, 3, 6, cd); p.r(14, 20, 3, 4, cd);
        p.r(9, 24, 5, 1, cd); p.r(22, 24, 5, 1, cd);
        p.line(31, 15, 33, 8, cd); p.line(33, 8, 31, 5, cd); p.px(30, 5, U.dk(c, 0.5));
      });
      return make(24, 11, function (p) {
        var s = f % 2;
        p.r(5, 3, 13, 4, c); p.r(6, 6, 11, 1, cl);
        p.r(17, 1, 5, 5, c); p.r(20, 4, 2, 2, cl); p.px(21, 2, "#2a2026"); p.px(17, 0, cd); p.px(19, 0, cd);
        p.line(4, 4, 1, 3, c); p.line(1, 3, 0, 6, c); p.px(0, 7, U.dk(c, 0.5));
        p.r(6, 7, 2, 3 + s, cd); p.r(9, 7, 2, 3 - s, c); p.r(14, 7, 2, 3 + s, cd); p.r(17, 6, 2, 4 - s, c);
      });
    });
  }
  function deer(f) {
    return memo("deer" + f, function () {
      var c = U.col("#9a6e48"), cl = U.col("#e8dcc8"), cd = U.dk(c, 0.75);
      return make(16, 17, function (p) {
        var s = f % 2;
        p.r(3, 6, 9, 4, c); p.r(4, 9, 7, 1, cl); p.px(2, 6, cl); p.px(2, 7, cl);
        p.r(11, 2, 2, 5, c); p.r(11, 0, 4, 3, c); p.px(15, 1, "#2a2026"); p.px(12, 1, "#2a2026"); p.px(11, 0, cd); p.px(10, 0, cd);
        p.r(4, 10, 1, 6 + s, cd); p.r(6, 10, 1, 6 - s, c); p.r(9, 10, 1, 6 + s, cd); p.r(11, 10, 1, 6 - s, c);
      });
    });
  }
  function marmot() {
    return memo("marmot", function () {
      var c = U.col("#8a6a44"), cl = U.col("#c8a878");
      return make(7, 9, function (p) { p.r(1, 2, 5, 6, c); p.r(2, 4, 3, 4, cl); p.r(2, 0, 3, 3, c); p.px(2, 1, "#2a2026"); p.px(4, 1, "#2a2026"); p.r(1, 8, 2, 1, c); p.r(4, 8, 2, 1, c); });
    });
  }
  function owl(blink) {
    return memo("owl" + blink, function () {
      var c = U.col("#8a7458"), cl = U.col("#c8b494");
      return make(8, 10, function (p) {
        p.r(1, 1, 6, 8, c); p.px(1, 0, c); p.px(6, 0, c); p.r(2, 4, 4, 4, cl);
        if (blink) { p.r(2, 2, 2, 1, "#2a2026"); p.r(4, 2, 2, 1, "#2a2026"); }
        else { p.r(2, 2, 2, 2, "#f0d040"); p.r(4, 2, 2, 2, "#f0d040"); p.px(3, 3, "#2a2026"); p.px(4, 3, "#2a2026"); }
        p.r(0, 9, 8, 1, "#5a4636");
      }, { outline: OUT });
    });
  }
  function eagle(f) {
    return memo("eagle" + f, function () {
      return make(17, 7, function (p) {
        var up = f % 2;
        p.r(6, 2, 5, 2, "#4a3626"); p.r(11, 1, 2, 2, "#f2efe6"); p.px(13, 2, "#e0b030");
        if (up) { p.line(6, 2, 0, 0, "#4a3626"); p.line(10, 2, 16, 0, "#4a3626"); }
        else { p.line(6, 3, 0, 5, "#4a3626"); p.line(10, 3, 16, 5, "#4a3626"); }
        p.r(4, 3, 2, 1, "#f2efe6");
      });
    });
  }
  function bird(f) {
    return memo("bird" + f, function () {
      return make(6, 5, function (p) {
        if (f === 2) { p.r(1, 2, 4, 1, "#3a4a5a"); p.px(0, 1, "#3a4a5a"); p.px(5, 1, "#3a4a5a"); p.px(0, 0, "#3a4a5a"); p.px(5, 0, "#3a4a5a"); return; }
        p.r(1, 1, 3, 2, "#4a5a6e"); p.px(4, f ? 1 : 0, "#4a5a6e"); p.px(5, f ? 1 : 0, "#e0a030"); p.px(0, 2, "#4a5a6e"); p.r(1, 3, 3, 1, "#c8b8a0"); p.px(2, 4, "#2a2026");
      }, { outline: false });
    });
  }
  function bug(kind, f) {
    return memo("bug" + kind + f, function () {
      if (kind === "ladybug") return make(14, 10, function (p) {
        p.blob(7, 5, 6, 4.5, function (x, y) { return x === 7 ? "#2a2026" : "#d83a32"; });
        p.px(4, 4, "#2a2026"); p.px(10, 4, "#2a2026"); p.px(5, 7, "#2a2026"); p.px(9, 7, "#2a2026");
        p.r(11, 3, 3, 3, "#2a2026"); p.px(13, 3, "#ffffff");
        for (var i = 0; i < 3; i++) p.px(3 + i * 4, 9 + (f % 2 && i === 1 ? -1 : 0), "#2a2026");
      });
      if (kind === "snail") return make(16, 11, function (p) {
        p.r(1, 8, 14, 2, "#c8b8a0"); p.r(12, 4, 2, 5, "#c8b8a0"); p.px(12, 3, "#2a2026"); p.px(14, 3, "#2a2026"); p.px(12, 2, "#c8b8a0"); p.px(14, 2, "#c8b8a0");
        p.blob(6, 5, 5, 4.5, function (x, y, d) { return d < 0.25 ? "#8a5a34" : d < 0.6 ? "#c8864a" : "#a86a3a"; });
      });
      return make(16, 9, function (p) { // ant
        var s = f % 2;
        p.blob(3, 4, 3, 2.5, function () { return "#3a2a26"; });
        p.blob(8, 4, 2.2, 2, function () { return "#4a3430"; });
        p.blob(12.5, 3.5, 2.5, 2.5, function () { return "#3a2a26"; });
        p.px(13, 3, "#ffffff"); p.line(14, 1, 15, 0, "#3a2a26"); p.line(12, 1, 12, 0, "#3a2a26");
        for (var i = 0; i < 3; i++) { p.line(6 + i * 2, 6, 5 + i * 2 + (s ? 1 : -1) * (i % 2 ? 1 : -1), 8, "#3a2a26"); }
      });
    });
  }

  // ---------- plants & props ----------
  var LEAF = {
    spring: [["#6aa84f", "#86c060", "#4f8a3e"], "#f2b8c8"],
    summer: [["#4f7d3e", "#679950", "#3f6633"], null],
    autumn: [["#d0782a", "#e8a838", "#a85428"], "#c8402a"],
    winter: [null, null]
  };
  function tree(season, v, snow) {
    return memo("tree" + season + v + snow, function () {
      var pal = LEAF[season] || LEAF.summer, trunk = U.col("#5a4636"), r = U.rng(31 + v * 7);
      return make(26, 36, function (p) {
        p.r(11, 20, 4, 16, trunk); p.r(12, 20, 1, 16, U.dk(trunk, 0.8));
        p.line(13, 24, 6, 14, trunk); p.line(13, 22, 20, 12, trunk); p.line(12, 18, 12, 6, trunk);
        if (!pal[0]) { // bare branches
          p.line(6, 14, 3, 8, trunk); p.line(20, 12, 23, 6, trunk); p.line(12, 6, 9, 1, trunk); p.line(12, 8, 16, 2, trunk);
          if (snow) { p.px(3, 7, "#f4f6f8"); p.px(23, 5, "#f4f6f8"); p.r(8, 0, 2, 1, "#f4f6f8"); p.r(15, 1, 2, 1, "#f4f6f8"); }
          return;
        }
        var L = pal[0].map(U.col);
        [[13, 11, 10, 9], [6, 15, 6, 5], [20, 14, 6, 5], [9, 7, 6, 5], [17, 7, 6, 5]].forEach(function (b) {
          p.blob(b[0], b[1], b[2], b[3], function (x, y, d) {
            if (d > 0.82 && U.bay(x, y) > 0.6) return null;
            var rel = (y - b[1]) / b[3] + (x - b[0]) / b[2] * 0.4;
            var c = L[0];
            if (rel < -0.35 && U.bay(x, y) > 0.3) c = L[1];
            if (rel > 0.4 && U.bay(x, y) > 0.45) c = L[2];
            if (pal[1] && r() < 0.1) c = U.col(pal[1]);
            return c;
          });
        });
      });
    });
  }
  function pine(v, snow, dark) {
    return memo("pine" + v + snow + dark, function () {
      var c = U.col(dark ? "#2e4a34" : "#36553a"), hi = U.col("#446a46"), lo = U.col("#2b452f"), w = 18, h = 34 + (v % 3) * 3;
      return make(w, h, function (p) {
        p.r(8, h - 4, 2, 4, "#5a4636");
        for (var y = 0; y < h - 3; y++) {
          var t = y / (h - 3), tier = (y % 7) / 7, hw = Math.max(0.6, w / 2 * (0.2 + 0.8 * t) * (0.65 + 0.35 * tier));
          for (var x = Math.round(9 - hw); x <= Math.round(9 + hw - 1); x++) {
            var e = (x - 9) / hw, col = c;
            if (e < -0.4 && U.bay(x, y) > 0.4) col = hi;
            if (e > 0.45 || tier > 0.85) col = lo;
            if (snow && tier < 0.2 && U.bay(x, y) > 0.3) col = U.col("#eef2f4");
            p.px(x, y, col);
          }
        }
      });
    });
  }
  function bush(season, v) {
    return memo("bush" + season + v, function () {
      var base = season === "autumn" ? ["#8a6a2a", "#a8823a", "#6a4a24"] : season === "winter" ? ["#6a6a56", "#7e7e66", "#56564a"] : ["#46703f", "#5b8a4f", "#3a5c34"];
      var L = base.map(U.col), fl = season === "spring" || season === "summer";
      return make(16, 9, function (p) {
        p.blob(8, 5, 8, 5, function (x, y, d) {
          if (d > 0.85 && U.bay(x, y) > 0.55) return null;
          if (fl && v % 2 && U.bay(x, y) > 0.9 && d < 0.8) return "#d8423e";
          return y < 4 && U.bay(x, y) > 0.4 ? L[1] : y > 6 ? L[2] : L[0];
        });
      });
    });
  }
  function grassTuft(season) {
    return memo("tuft" + season, function () {
      var c = season === "winter" ? "#b8b49a" : season === "autumn" ? "#b89a5a" : "#7a9a4a";
      return make(7, 5, function (p) { p.line(1, 4, 0, 0, c); p.line(3, 4, 3, 1, c); p.line(5, 4, 6, 0, c); p.line(2, 4, 2, 2, U.dk(U.col(c), 0.8)); }, { outline: false });
    });
  }
  function blade(v) { // giant grass for the tiny world
    return memo("blade" + v, function () {
      var c = U.col(v % 3 === 0 ? "#5a8a3e" : v % 3 === 1 ? "#4a7a36" : "#6a9a48");
      return make(8, 44, function (p) {
        var lean = (v % 5) - 2;
        for (var y = 0; y < 44; y++) {
          var t = y / 44, wd = Math.max(1, Math.round(4 * Math.sqrt(t))), cx = 4 + lean * (1 - t) * (1 - t) * 1.5;
          for (var x = 0; x < wd; x++) p.px(Math.round(cx - wd / 2 + x), y, x === 0 ? U.mix(c, [255, 255, 220], 0.2) : c);
        }
      });
    });
  }
  function flower(kind) {
    return memo("fl" + kind, function () {
      var P = { columbine: ["#8a7ad0", "#f2f0f8"], aster: ["#b8a0e0", "#e8c040"], sunflower: ["#e8b830", "#6a4426"], paintbrush: ["#d84a32", "#e88a52"], snowdrop: ["#f4f4f0", "#8ab06a"], poppy: ["#e8442a", "#2a2026"] }[kind] || ["#e0e0f0", "#e8c040"];
      return make(7, 10, function (p) {
        p.line(3, 9, 3, 4, "#4f7d3e"); p.px(2, 7, "#5b8a4f"); p.px(4, 6, "#5b8a4f");
        p.r(1, 1, 5, 3, P[0]); p.r(2, 0, 3, 5, P[0]); p.px(3, 2, P[1]);
      });
    });
  }
  function pinecone() {
    return memo("cone", function () {
      return make(5, 7, function (p) { p.r(1, 0, 3, 6, "#8a5a34"); p.r(0, 2, 5, 3, "#7a4a2a"); p.px(1, 1, "#a8724a"); p.px(3, 3, "#a8724a"); p.px(1, 5, "#a8724a"); p.px(2, 6, "#6a4026"); });
    });
  }
  function rock(v, snow) {
    return memo("rock" + v + snow, function () {
      var c = U.col(v % 2 ? "#a89480" : "#8e8478");
      return make(16, 9, function (p) {
        p.blob(8, 5.5, 8, 4.5, function (x, y, d) {
          if (snow && y < 3) return "#eef2f4";
          return y < 4 && U.bay(x, y) > 0.3 ? U.mix(c, [255, 255, 255], 0.18) : y > 6 ? U.dk(c, 0.8) : c;
        });
      });
    });
  }
  function streetlight(on) {
    return memo("sl" + on, function () {
      return make(7, 40, function (p) {
        p.r(3, 3, 1, 37, "#4a4c52"); p.r(2, 38, 3, 2, "#3a3c40");
        p.r(1, 0, 5, 3, "#3a3c40"); p.r(2, 3, 3, 1, on ? "#ffe6a0" : "#c8c4b8", on);
      });
    });
  }
  function sign(kind) {
    return memo("sign" + kind, function () {
      if (kind === "trail") return make(12, 20, function (p) {
        p.r(5, 6, 2, 14, "#6a4a2c"); p.r(0, 0, 12, 7, "#7a5634"); p.r(1, 1, 10, 5, "#8a6640");
        p.r(2, 2, 8, 1, "#e8dcc0"); p.r(2, 4, 6, 1, "#e8dcc0"); p.px(9, 4, "#e8dcc0");
      });
      if (kind === "street") return make(14, 24, function (p) {
        p.r(6, 4, 2, 20, "#7a7e86"); p.r(0, 0, 14, 4, "#2f7a4a"); p.r(1, 1, 12, 2, "#3f8a5a"); p.r(2, 2, 9, 1, "#e8f0e8");
      });
      if (kind === "poster") return make(8, 30, function (p) {
        p.r(3, 0, 2, 30, "#7a5a3c"); p.r(0, 10, 8, 9, "#f2eee0"); p.r(1, 11, 6, 1, "#c8402a"); p.r(2, 13, 4, 3, "#c98a4b"); p.r(1, 17, 6, 1, "#8a8a8a");
      });
      if (kind === "kiosk") return make(22, 22, function (p) {
        p.r(2, 6, 2, 16, "#5a3e26"); p.r(18, 6, 2, 16, "#5a3e26");
        p.r(0, 0, 22, 4, "#6a4a2c"); p.r(3, 5, 16, 10, "#8a6640"); p.r(4, 6, 14, 8, "#e8e0c8");
        p.r(5, 7, 5, 4, "#8ab06a"); p.r(11, 7, 6, 1, "#5a5a5a"); p.r(11, 9, 5, 1, "#5a5a5a"); p.r(11, 11, 6, 1, "#5a5a5a"); p.r(6, 8, 2, 1, "#c8402a");
      });
      return make(4, 4, function (p) { p.r(0, 0, 4, 4, "#ffffff"); });
    });
  }
  function hydrant() { return memo("hyd", function () { return make(6, 9, function (p) { p.r(1, 2, 4, 6, "#c8402a"); p.r(0, 4, 6, 2, "#c8402a"); p.r(2, 0, 2, 2, "#a83228"); p.r(1, 8, 4, 1, "#8a2a22"); }); }); }
  function mailbox() { return memo("mail", function () { return make(7, 12, function (p) { p.r(3, 4, 1, 8, "#5a4636"); p.r(0, 0, 7, 4, "#3a5a8a"); p.r(1, 0, 5, 1, "#4a6a9a"); p.px(6, 1, "#c8402a"); }); }); }
  function cone() { return memo("traffic", function () { return make(7, 9, function (p) { p.r(0, 8, 7, 1, "#c85a2a"); for (var y = 0; y < 8; y++) { var w = 1 + Math.round(y * 0.6); p.r(3 - (w >> 1), y, w, 1, y === 3 || y === 4 ? "#f2f0e8" : "#e8742a"); } }); }); }
  function bench() { return memo("bench", function () { return make(18, 9, function (p) { p.r(0, 0, 18, 2, "#8a6040"); p.r(0, 4, 18, 2, "#9a7048"); p.r(1, 6, 1, 3, "#3a3a40"); p.r(16, 6, 1, 3, "#3a3a40"); p.r(1, 2, 1, 2, "#3a3a40"); p.r(16, 2, 1, 2, "#3a3a40"); }); }); }
  function cafeTable() { return memo("ctab", function () { return make(14, 20, function (p) { p.r(0, 0, 14, 3, "#c8402a"); p.r(2, 0, 2, 3, "#f2eee0"); p.r(10, 0, 2, 3, "#f2eee0"); p.r(6, 3, 1, 10, "#5a5a60"); p.r(2, 12, 10, 2, "#8a8a90"); p.r(6, 14, 1, 6, "#5a5a60"); p.r(4, 19, 5, 1, "#5a5a60"); }); }); }
  function stand(kind) {
    return memo("stand" + kind, function () {
      if (kind === "lemonade") return make(22, 18, function (p) {
        p.r(1, 0, 20, 4, "#f2d84a"); p.r(3, 0, 3, 4, "#f2f0e8"); p.r(9, 0, 3, 4, "#f2f0e8"); p.r(15, 0, 3, 4, "#f2f0e8");
        p.r(2, 4, 1, 8, "#8a6040"); p.r(19, 4, 1, 8, "#8a6040");
        p.r(0, 11, 22, 7, "#b8844e"); p.r(1, 12, 20, 2, "#f2eee0"); p.r(4, 8, 3, 3, "#f2e070"); p.r(13, 9, 2, 2, "#f2f0e8"); p.r(16, 9, 2, 2, "#f2f0e8");
      });
      return make(24, 12, function (p) { // garage-sale table
        p.r(0, 4, 24, 2, "#e8e2d4"); p.r(1, 6, 1, 6, "#6a6a70"); p.r(22, 6, 1, 6, "#6a6a70");
        p.r(2, 1, 4, 3, "#3f6fa3"); p.r(7, 0, 3, 4, "#c8a040"); p.r(11, 2, 5, 2, "#8a4a3a"); p.r(17, 1, 2, 3, "#5f7f5d"); p.r(20, 2, 3, 2, "#e8e8e8");
        p.r(3, 7, 6, 2, "#f2eee0"); p.r(4, 7, 4, 1, "#c8402a");
      });
    });
  }
  function hose() { return memo("hose", function () { return make(18, 16, function (p) { for (var a = 0; a < 40; a++) { var t = a / 40 * 6.283; p.px(Math.round(8 + Math.cos(t) * 6), Math.round(9 + Math.sin(t) * 5), a % 2 ? "#4f8a4a" : "#3f7a3a"); p.px(Math.round(8 + Math.cos(t) * 4), Math.round(9 + Math.sin(t) * 3), "#3f7a3a"); } p.r(13, 2, 4, 3, "#c8a040"); p.r(16, 3, 2, 1, "#a8a8b0"); }); }); }
  function crumb() { return memo("crumb", function () { return make(12, 9, function (p) { p.blob(6, 4.5, 6, 4.5, function (x, y, d) { return d < 0.4 ? "#e8c890" : y < 4 ? "#d8a860" : "#b8884a"; }); p.px(4, 3, "#f2dcb0"); p.px(8, 5, "#a8783a"); }); }); }
  function anthill() {
    return memo("hill", function () {
      return make(30, 12, function (p) {
        for (var y = 0; y < 12; y++) {
          var hw = 3 + y * 1.25;
          for (var x = Math.round(15 - hw); x < Math.round(15 + hw); x++) {
            var q = U.h2(x, y * 7);
            p.px(x, y, q > 0.8 ? "#c8a878" : q < 0.25 ? "#8a6a48" : (x > 15 + hw * 0.3 ? "#9a7a56" : "#b0906a"));
          }
        }
        p.r(13, 0, 4, 2, "#2a2018"); p.r(14, 2, 2, 1, "#3a2a20");
      });
    });
  }
  function sprinklerDrop() { return memo("drop", function () { return make(1, 2, function (p) { p.r(0, 0, 1, 2, "#cfe6f8"); }, { outline: false }); }); }

  // ---------- balls ----------
  function ball(kind) {
    return memo("ball" + kind, function () {
      return make(9, 9, function (p) {
        p.blob(4.5, 4.5, 4.5, 4.5, function (x, y, d) {
          if (kind === "soccer") return (Math.abs(x - 4) + Math.abs(y - 4) < 2 || ((x + y) % 4 === 0 && d > 0.5)) ? "#2a2a30" : "#f4f2ee";
          if (kind === "beach") return x < 3 ? "#e8442a" : x < 6 ? "#f4f2ee" : "#3a7ad0";
          if (kind === "tennis") return Math.abs(Math.sin((x - 4.5) * 0.7) * 2.5 - (y - 4.5)) < 0.8 ? "#f4f2ee" : "#cce04a";
          if (kind === "balloon") return d < 0.25 && x < 4 ? "#f8a0b0" : "#e84a6a";
          return "#e8742a";
        });
        if (kind === "balloon") p.px(4, 8, "#c83a5a");
      });
    });
  }

  // item icon from data art
  function icon(item) {
    return memo("icon" + item.id, function () { return art(item.art, item.pal); });
  }

  GG.spr = {
    make: make, art: art, person: person, puppy: puppy, dog: dog, cat: cat, raccoon: raccoon, lion: lion, deer: deer, marmot: marmot, owl: owl, eagle: eagle, bird: bird, bug: bug,
    tree: tree, pine: pine, bush: bush, tuft: grassTuft, blade: blade, flower: flower, pinecone: pinecone, rock: rock, streetlight: streetlight, sign: sign,
    hydrant: hydrant, mailbox: mailbox, cone: cone, bench: bench, cafeTable: cafeTable, stand: stand, hose: hose, crumb: crumb, anthill: anthill, drop: sprinklerDrop, ball: ball, icon: icon
  };
})();
