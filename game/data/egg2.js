// The second secret. Words, the course and its set pieces live here; the code is js/egg2.js.
// Edit freely: this file is content, not code. (Spoilers: docs/egg-2-spoilers.md)
(window.GG = window.GG || {}).data = window.GG.data || {};
GG.data.egg2 = {
  title: ["THE LONG", "WAY HOME"],
  push: { touch: "TAP TO PUSH OFF", keys: "PRESS A KEY TO PUSH OFF" },
  tips: {
    touch: "Hold a thumb to one side of yourself to turn. Let go to point downhill.",
    keys: "← → to turn. ↓ to tuck, ↑ to slow down. Esc to walk home."
  },
  // the run, top to bottom. len: pixels of slope; pitch: how fast it is; hw: half the width of the open way;
  // wind: how much it meanders; per 100 px of slope: trees, rocks; kickers: how many jumps
  sections: [
    { id: "summit", len: 800, pitch: 0.8, hw: 84, wind: 12, wall: "open", trees: 0, rocks: 0.5, kickers: 0,
      cap: { day: "Sunrise. The top. Nobody else is up yet.", night: "Moonlight. The top. Nobody else is up at all." },
      set: [{ t: "cairn", at: 0.07, dx: 26 }] },
    { id: "bowl", len: 1300, pitch: 1, hw: 80, wind: 46, wall: "forest", trees: 0.8, rocks: 0.25, kickers: 3,
      cap: { day: "The snow hasn't been told about anybody yet.", night: "The snow is blue. So is everything." },
      set: [{ t: "deer", at: 0.5 }] },
    { id: "glade", len: 1700, pitch: 1, hw: 64, wind: 70, wall: "forest", trees: 2.1, rocks: 0.25, kickers: 2,
      cap: { day: "The trees get ideas about where you should go.", night: "The trees are closer at night. Everyone knows that." },
      set: [{ t: "marmot", at: 0.22 }, { t: "lion", at: 0.6 }] },
    { id: "bells", len: 1250, pitch: 1.05, hw: 72, wind: 30, wall: "forest", trees: 0.35, rocks: 0, kickers: 0,
      cap: { day: "Somebody left gates out. With bells on.", night: "Lanterns. Somebody left gates out, with bells on." },
      set: [{ t: "gates", at: 0.14, n: 8, gap: 118 }] },
    { id: "creek", len: 1500, pitch: 1.3, hw: 48, wind: 80, wall: "forest", ground: "ice", trees: 0.5, rocks: 0.12, kickers: 3,
      cap: { day: "The creek, frozen. Quick and not very steerable.", night: "The creek, frozen. It creaks. That's fine." },
      set: [{ t: "hiker", at: 0.72 }] },
    { id: "trailhead", len: 800, pitch: 0.85, hw: 58, wind: 0, wall: "forest", trees: 0.2, rocks: 0, kickers: 0,
      cap: { day: "The trailhead. Technically, the trail ends here.", night: "The trailhead. Technically, the trail ends here." },
      set: [{ t: "sign", at: 0.3, dx: -40, text: ["TRAIL", "HEAD"] }, { t: "funnel", at: 0.55 }] },
    { id: "street", len: 1900, pitch: 1, hw: 44, wind: 0, wall: "houses", ground: "road", trees: 0, rocks: 0, kickers: 1,
      cap: { day: "Nobody's shovelled. Good.", night: "Porch lights. Nobody's shovelled. Good." },
      set: [{ t: "street" }, { t: "snowman", at: 0.17, dx: 10 }, { t: "kid", at: 0.36, dx: -62 }, { t: "ball", at: 0.56 },
        { t: "sign", at: 0.7, dx: 50, text: ["ROAD", "ENDS"] }, { t: "sign", at: 0.8, dx: -50, text: ["REALLY"] }, { t: "sign", at: 0.9, dx: 50, text: ["OK", "THEN"] }] },
    { id: "bank", len: 300, pitch: 1.2, hw: 44, wind: 0, wall: "houses", ground: "road", trees: 0, rocks: 0, kickers: 0,
      cap: { day: "The plough left a present.", night: "The plough left a present." },
      set: [{ t: "cat", at: 0.42, dx: -54 }, { t: "bank", at: 0.72 }] }
  ],
  // passing remarks
  say: {
    hiker: { day: "MORNING!", night: "EVENING!" },
    kidHit: "GOT YOU!", kidMiss: "AW.",
    lion: "The mountain lion. Asleep. Let's keep it that way.",
    lionPup: "The puppy and the mountain lion pretend not to know each other.",
    marmot: "A marmot whistles. Roughly: 'show-off.'",
    deer: "Deer. They have right of way. They always have right of way.",
    bellsAll: "Every bell. The mountain hums along.",
    bellsSome: "{n} of {of} bells. The rest will keep.",
    ball: "It went up. It did not come down.",
    snowman: "Sorry, Kevin.",
    car: "Sorry, Subaru.",
    spin: ["360!", "WHEE!", "OH YES!"],
    air: ["Air.", "Briefly a bird."],
    cat: "The cat is watching. The cat is always watching.",
    pup: "The puppy thinks this is the best idea you've ever had."
  },
  crash: ["Tree: 1. You: 0.", "You hugged a tree. It didn't hug back.", "Snow down the collar. Classic.", "The tree accepts your apology.", "A soft landing, as landings go.", "That one came out of nowhere. It has been there eighty years."],
  rock: ["Rock. Still a rock.", "The rock didn't move. They rarely do."],
  abort: "You took the skis off and walked. Also a fine way home.",
  // back in the garage
  end: {
    time: "Top of the mountain to the garage: {time}.",
    hugs: { 0: "Trees hugged on the way: none. They're a little hurt.", 1: "Trees hugged on the way: one. It needed it.", n: "Things hugged on the way: {hugs}. Friendly." },
    best: "That's your quickest way home yet.",
    last: ["Skis back in the corner, still cold. Nobody saw.", "(The cat saw.)"]
  }
};
