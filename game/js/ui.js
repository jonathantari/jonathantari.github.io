// DOM overlay: the 8-bit text box with choices, captions, the HUD buttons,
// the backpack (items + photo album), and fades.
(function () {
  "use strict";
  var GG = window.GG, U = GG.util;
  var $ = function (id) { return document.getElementById(id); };
  var box, txt, list, cap, fade, pack, hud;
  var state = { open: false, typing: false, full: "", shown: 0, resolve: null, choices: null, sel: 0, mode: null };
  var capT = null;

  function init() {
    box = $("box"); txt = $("boxText"); list = $("boxChoices"); cap = $("cap"); fade = $("fade"); pack = $("pack"); hud = $("hud");
    box.addEventListener("pointerdown", function (e) {
      if (e.target.closest("li")) return;
      e.preventDefault(); advance();
    });
    $("btnPack").addEventListener("click", function (e) { e.stopPropagation(); GG.game.togglePack(); });
    $("btnInfo").addEventListener("click", function (e) { e.stopPropagation(); GG.game.help(); });
    $("packClose").addEventListener("click", function () { closePack(); });
    $("tabItems").addEventListener("click", function () { renderPack("items"); });
    $("tabAlbum").addEventListener("click", function () { renderPack("album"); });
  }

  var tick = null;
  function typeLine(s, done) {
    state.full = s; state.shown = 0; state.typing = true; txt.textContent = "";
    clearInterval(tick);
    var speed = GG.reducedMotion ? 0 : 28;
    if (!speed) { txt.textContent = s; state.typing = false; done && done(); return; }
    tick = setInterval(function () {
      state.shown += 1;
      txt.textContent = s.slice(0, state.shown);
      if (state.shown % 3 === 1 && s[state.shown - 1] !== " ") GG.sfx && GG.sfx.blip();
      if (state.shown >= s.length) { clearInterval(tick); state.typing = false; done && done(); }
    }, 1000 / speed);
  }
  function finishTyping() { clearInterval(tick); txt.textContent = state.full; state.typing = false; if (state.afterType) { var f = state.afterType; state.afterType = null; f(); } }

  function show() { box.hidden = false; state.open = true; box.classList.add("on"); }
  function hide() { box.hidden = true; state.open = false; box.classList.remove("on"); list.innerHTML = ""; state.choices = null; }

  // show lines one after another; resolves when the last is dismissed
  function say(lines, vars) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.filter(Boolean).map(function (l) { return U.fmt(l, vars); });
    return new Promise(function (res) {
      var i = 0;
      show(); list.innerHTML = ""; box.classList.add("more");
      function next() {
        if (i >= lines.length) { hide(); res(); return; }
        state.mode = "say";
        state.afterType = null;
        typeLine(lines[i++]);
        state.resolve = next;
      }
      next();
    });
  }
  // a prompt with options; resolves with the chosen index
  function choose(prompt, options, vars) {
    return new Promise(function (res) {
      show(); box.classList.remove("more");
      list.innerHTML = "";
      state.mode = "choose"; state.choices = options; state.sel = 0; state.resolve = null;
      function build() {
        list.innerHTML = "";
        list.className = options.length === 4 && options.every(function (o) { return String(o).length < 24; }) ? "grid" : "";
        options.forEach(function (o, i) {
          var li = document.createElement("li");
          li.textContent = U.fmt(o, vars).replace(/^▶\s*/, "");
          li.className = i === state.sel ? "sel" : "";
          li.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); pickIt(i); });
          li.addEventListener("pointerenter", function () { state.sel = i; mark(); });
          list.appendChild(li);
        });
      }
      function mark() { Array.prototype.forEach.call(list.children, function (li, i) { li.className = i === state.sel ? "sel" : ""; }); }
      function pickIt(i) { if (state.typing) finishTyping(); GG.sfx && GG.sfx.ok(); hide(); res(i); }
      state.cancelChoice = function () { hide(); res(-1); };
      state.pick = pickIt; state.mark = mark;
      if (prompt) { typeLine(U.fmt(prompt, vars)); state.afterType = null; build(); }
      else { txt.textContent = ""; build(); }
    });
  }
  // drop whatever the box is showing; a pending choice resolves with -1
  function cancel() {
    if (!state.open) return;
    if (state.mode === "choose" && state.cancelChoice) { var c = state.cancelChoice; state.cancelChoice = null; c(); return; }
    hide();
  }
  function advance() {
    if (!state.open) return false;
    if (state.typing) { finishTyping(); return true; }
    if (state.mode === "choose") { state.pick(state.sel); return true; }
    if (state.resolve) { GG.sfx && GG.sfx.tick(); var r = state.resolve; state.resolve = null; r(); }
    return true;
  }
  function key(k) {
    if (pack && !pack.hidden) { if (k === "esc" || k === "pack") closePack(); return true; }
    if (!state.open) return false;
    if (k === "ok") { advance(); return true; }
    if (state.mode === "choose" && (k === "up" || k === "down" || k === "left" || k === "right")) {
      var n = state.choices.length, d = k === "up" || k === "left" ? -1 : 1;
      state.sel = (state.sel + d + n) % n; state.mark(); GG.sfx && GG.sfx.tick(); return true;
    }
    return true;
  }

  // a caption marked "hold" (the controls tip) can't be pushed off early; others wait their turn
  var capHold = 0, capQ = [];
  function caption(s, secs, hold) {
    if (Date.now() < capHold && !hold) { capQ.push([s, secs]); return; }
    cap.textContent = s; cap.classList.add("on");
    var ms = (secs || 3.5) * 1000;
    capHold = hold ? Date.now() + ms : 0;
    clearTimeout(capT); capT = setTimeout(function () {
      cap.classList.remove("on"); capHold = 0;
      var n = capQ.shift(); if (n) setTimeout(function () { caption(n[0], n[1]); }, 400);
      capQ = capQ.slice(-1); // only the latest of anything else that piled up
    }, ms);
  }
  function fadeTo(on, secs) {
    return new Promise(function (res) {
      fade.style.transitionDuration = (secs == null ? 0.5 : secs) + "s";
      fade.classList.toggle("on", on);
      setTimeout(res, (secs == null ? 0.5 : secs) * 1000 + 30);
    });
  }
  function flash() { fade.classList.add("flash"); setTimeout(function () { fade.classList.remove("flash"); }, 120); }
  function setHud(on) { hud.hidden = !on; }

  // ---------- backpack ----------
  var packRes = null;
  function openPack(tab, opts) {
    pack.hidden = false; GG.sfx && GG.sfx.pack();
    state.packOpts = opts || null;
    renderPack(tab || "items");
    return new Promise(function (res) { packRes = res; });
  }
  function closePack(val) { pack.hidden = true; var r = packRes; packRes = null; state.packOpts = null; if (r) r(val == null ? null : val); }
  function iconCanvas(id) {
    var it = GG.data.items[id]; if (!it) return document.createElement("span");
    var spr = GG.spr.icon(Object.assign({ id: id }, it)), c = document.createElement("canvas");
    c.width = spr.w; c.height = spr.h; c.getContext("2d").drawImage(spr.cv, 0, 0); c.className = "ico";
    return c;
  }
  function renderPack(tab) {
    var body = $("packBody"), save = GG.save, opts = state.packOpts;
    $("tabItems").classList.toggle("on", tab === "items"); $("tabAlbum").classList.toggle("on", tab === "album");
    $("tabAlbum").hidden = !save.photos().length; // the album only shows once there's a photo in it
    $("packHint").textContent = opts && opts.hint ? opts.hint : "";
    body.innerHTML = "";
    if (tab === "items") {
      var items = save.data.pack, slots = save.SLOTS;
      var grid = document.createElement("div"); grid.className = "slots";
      for (var i = 0; i < slots; i++) {
        var s = document.createElement("button"); s.className = "slot";
        var id = items[i];
        if (id) {
          s.appendChild(iconCanvas(id));
          var nm = document.createElement("span"); nm.textContent = GG.data.items[id].name; s.appendChild(nm);
          (function (idx, iid) {
            s.addEventListener("click", function () {
              if (opts && opts.pick) { closePack(idx); return; }
              $("packHint").textContent = GG.data.items[iid].name + ": " + GG.data.items[iid].desc;
            });
          })(i, id);
        } else { s.classList.add("empty"); s.disabled = true; }
        grid.appendChild(s);
      }
      if (save.data.puppy) {
        var pup = document.createElement("div"); pup.className = "pup";
        var pc = GG.spr.puppy(0, "front"), cv = document.createElement("canvas"); cv.width = pc.w; cv.height = pc.h; cv.getContext("2d").drawImage(pc.cv, 0, 0); cv.className = "ico big";
        pup.appendChild(cv); var t = document.createElement("span"); t.textContent = "The puppy is riding along. Not in the backpack. Next to it."; pup.appendChild(t);
        body.appendChild(pup);
      }
      body.appendChild(grid);
      if (!items.length && !(opts && opts.hint)) $("packHint").textContent = GG.data.world.ui.emptyPack;
    } else {
      var ph = save.photos();
      if (!ph.length) { var e = document.createElement("p"); e.className = "none"; e.textContent = GG.data.world.ui.noPhotos; body.appendChild(e); return; }
      var al = document.createElement("div"); al.className = "album";
      ph.slice().reverse().forEach(function (src) {
        var im = document.createElement("img"); im.src = src; im.alt = "A photo from an outing";
        im.addEventListener("click", function () { im.classList.toggle("zoom"); });
        al.appendChild(im);
      });
      body.appendChild(al);
    }
  }

  GG.ui = { init: init, say: say, choose: choose, advance: advance, cancel: cancel, key: key, caption: caption, fadeTo: fadeTo, flash: flash, setHud: setHud, openPack: openPack, closePack: closePack, isOpen: function () { return state.open || (pack && !pack.hidden); }, boxOpen: function () { return state.open; } };
})();
