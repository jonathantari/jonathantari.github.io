// Progress: what's in the backpack, the puppy, story beats already seen,
// recent deck draws (so events don't repeat back to back), photos.
(function () {
  "use strict";
  var GG = window.GG;
  var KEY = "garage.game.v1", PKEY = "garage.game.photos.v1", SLOTS = 6, MAXPH = 12;
  function fresh() {
    return { v: 1, outings: 0, pack: ["granola", "pencil"], puppy: false, ballDone: false, ballOrbit: false, lionTries: 0, recent: {}, seenIntro: false };
  }
  var data = fresh();
  function load() {
    if (/[?&]reset/.test(location.search)) { try { localStorage.removeItem(KEY); localStorage.removeItem(PKEY); } catch (e) {} }
    try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.v === 1) data = Object.assign(fresh(), d); } catch (e) {}
    S.data = data;
  }
  function write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function add(id) { if (data.pack.length >= SLOTS) return false; data.pack.push(id); write(); return true; }
  function removeAt(i) { var id = data.pack.splice(i, 1)[0]; write(); return id; }
  function findSnack() { for (var i = 0; i < data.pack.length; i++) { var it = GG.data.items[data.pack[i]]; if (it && it.snack) return i; } return -1; }
  // draw from a deck, skipping the last few seen
  function draw(deck, cards, r, keep) {
    var rec = data.recent[deck] || [];
    var pool = cards.filter(function (c) { return rec.indexOf(c.id) < 0; });
    if (!pool.length) pool = cards;
    // rarity: most common, some uncommon, very few rare
    var weighted = pool.map(function (c) { var k = c.rarity === "rare" ? 0.15 : c.rarity === "uncommon" ? 0.5 : 1; return { c: c, w: (c.w == null ? 1 : c.w) * k }; });
    var got = GG.util.weighted(r, weighted).c;
    rec.push(got.id); while (rec.length > (keep || 3)) rec.shift();
    data.recent[deck] = rec; write();
    return got;
  }
  function photos() { try { return JSON.parse(localStorage.getItem(PKEY) || "[]"); } catch (e) { return []; } }
  function addPhoto(src) {
    var p = photos(); p.push(src); while (p.length > MAXPH) p.shift();
    try { localStorage.setItem(PKEY, JSON.stringify(p)); return true; } catch (e) {
      // storage full: keep the newest few
      try { localStorage.setItem(PKEY, JSON.stringify(p.slice(-4))); return true; } catch (e2) { return false; }
    }
  }
  var S = GG.save = { SLOTS: SLOTS, data: data, load: load, write: write, add: add, removeAt: removeAt, findSnack: findSnack, draw: draw, photos: photos, addPhoto: addPhoto, full: function () { return data.pack.length >= SLOTS; } };
})();
