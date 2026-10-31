// Branch B: the wander. Each block rolls a few lots from this deck (skipping the
// last few you saw). Lot "kind" picks the scenery builder; the rest is content.
GG.data.wander = {
  pick: { prompt: "Another corner. Which way?", choices: ["▶ Left", "▶ Straight", "▶ Right", "▶ Head home"] },
  lots: [
    { id: "park", kind: "park", name: "a little park", day: "A little park. Somebody is reading under a tree.", night: "The park is dark and smells like cut grass." },
    { id: "cafe", kind: "cafe", name: "the corner café", day: "The corner café smells like cinnamon and burnt toast. A good combo.", night: "The café is closed. A sign in the window: 'Back at 6. The muffins know.'", gift: "sugar", giftLine: "A barista on a smoke break hands you a sugar packet. 'For emergencies.'" },
    { id: "diner", kind: "cafe", name: "a late diner", nightOnly: true, night: "A late diner, all chrome and humming neon. A cook waves a spatula at you." },
    { id: "shop", kind: "shop", name: "a corner shop", day: "A corner shop with a bell over the door and a cat in the window.", night: "The corner shop is shut. Taped in the window: 'LOST: one (1) mitten. Left.'" },
    { id: "build", kind: "construction", name: "a construction site", day: "A construction site. A digger sits very still, like it's thinking.", night: "The construction site is quiet. Someone left a hard hat on a cone, like a little guard." },
    { id: "library", kind: "library", name: "the library", day: "The library. A kid walks out carrying more books than a kid should.", night: "The library's book drop says THANK YOU in faded letters. You feel thanked.", gift: "bookmark", giftLine: "There's a free bookmark on the step. It says READ. You will." },
    { id: "play", kind: "playground", name: "a playground", day: "A playground. One swing is still swinging, all by itself.", night: "The playground at night. The slide is cold. You go down it anyway." },
    { id: "garden", kind: "park", name: "a community garden", day: "A community garden. Tomatoes, sunflowers, and one huge zucchini nobody will claim.", night: "The garden is asleep under the streetlight." }
  ],
  // the second face-off: a park goose that will not let you by. Same shape as the trail lion.
  goose: {
    spot: ["A goose plants itself in the middle of the path.", "It looks at you. It has decided you are the problem."],
    start: "The goose spreads its wings.",
    prompt: "What do you do?",
    pick: 4,
    pool: [
      { id: "bow", label: "Bow politely", anim: "bow", lines: ["You bow. Deeply. The goose considers this."], calm: [1, 3] },
      { id: "snack", label: "Offer a snack", anim: "toss", lines: ["You offer the {item}. The goose snatches it without saying thank you."], calm: [2, 4], needs: "snack",
        none: ["You hold out an empty hand. The goose is insulted on your behalf."] },
      { id: "honk", label: "Honk back", anim: "honk", lines: ["You honk. It's a good honk. The goose blinks."], calm: [1, 3],
        flop: ["You honk. It comes out as a squeak."], flopChance: 0.45 },
      { id: "moonwalk", label: "Moonwalk past", anim: "slide", lines: ["You moonwalk. Smoothly. The goose has never seen anything like it."], calm: [1, 4],
        flop: ["You moonwalk into a bench. The goose is delighted."], flopChance: 0.5 },
      { id: "flap", label: "Flap your arms", anim: "tall", lines: ["You flap. You are now also a goose, as far as anyone can tell."], calm: [0, 4] },
      { id: "compliment", label: "Compliment its neck", anim: "bow", lines: ["'That is a very long, very good neck.' The goose preens. It knows."], calm: [2, 3] },
      { id: "sing", label: "Sing a lullaby", anim: "notes", lines: ["You sing softly. The goose's eyelids droop. Then snap open. Then droop."], calm: [1, 3] },
      { id: "spin", label: "Spin around", anim: "dance", lines: ["You spin. The goose spins. Nobody wins. Everybody's dizzy."], calm: [0, 3] }
    ],
    twists: [
      { lines: ["A kid throws bread somewhere else. The goose is torn."], calm: 2 },
      { lines: ["Another goose honks from the pond. Yours looks embarrassed."], calm: 1 },
      { lines: ["A sprinkler turns on. Nobody is ready for that."], calm: -1 }
    ],
    twistChance: 0.25,
    finish: { win: ["The goose suddenly remembers something it left at the pond.", "The goose loses interest. Geese do that."], lose: ["The goose unfolds to its full, terrible size.", "The goose has seen enough."] },
    react: ["The goose hisses, but quieter.", "The goose tilts its head. It's thinking.", "The goose takes a step back and fluffs up."],
    need: 5, turns: 4,
    win: ["The goose turns and waddles off, very slowly, so it looks like its own idea.", "It leaves a feather behind. A peace offering, maybe."],
    lose: ["HONK. The goose charges. You take the long way round the park.", "It watches you the whole way. Next time, goose."]
  },
  gooseChance: 0.45,

  // what you might pass in the middle of the block
  extras: ["A cat watches you from a porch rail, unimpressed.", "Someone is practicing the trumpet. Badly. Beautifully.", "A wind chime somewhere goes tink.", "Chalk on the sidewalk: an arrow and the word 'THIS WAY'.", "A mailbox shaped like a fish. Sure."]
};
