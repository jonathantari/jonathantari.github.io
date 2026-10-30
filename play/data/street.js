// Node 1 (the street) and Branch A (the ball). All content; the game rolls from these lists.
// Card fields: id, type (which kind of moment it is), when (day|night|any), seasons, w (weight),
// rarity (common|uncommon|rare), lines (shown when you get close), plus type-specific bits.
GG.data.street = {
  quiet: {
    bird: ["A bird on the wire watches you go by.", "You get the feeling it has opinions."],
    birdFly: "The bird decides it has somewhere to be."
  },

  // 1.1 on later visits (the first visit always rolls the ball)
  events: [
    { id: "icecream", type: "truck", when: "day", seasons: ["spring", "summer", "autumn"], w: 3,
      lines: ["♪ Dee-dee-da-dee... the ice-cream truck crawls by, slow as a parade."],
      offer: { prompt: "Wave it down?", yes: ["The driver leans out with a popsicle. 'Last cherry one. Don't tell.'"], item: "popsicle", no: ["You wave anyway. The driver waves back. Everyone's having a nice time."] } },
    { id: "sale", type: "sale", when: "day", w: 3,
      lines: ["A garage sale! A table of treasures and a hand-lettered sign: EVERYTHING 10¢."],
      offer: { prompt: "Take something?", pick: ["kazoo", "marble", "postcard"], yes: ["'Oh, that's a good one,' says the seller. 'Keep it.'"], no: ["You admire a lamp shaped like a duck and move on."] } },
    { id: "poster", type: "poster", when: "any", w: 2,
      lines: ["A poster on the pole: LOST — BISCUIT. Small, loud, extremely good. Answers to 'snack'.", "You wish Biscuit well."] },
    { id: "bike", type: "bike", when: "day", w: 3,
      lines: ["Ding ding! A kid on a bike rings at you and zooms past.", "They're clearly late for something important. Probably snacks."] },
    { id: "van", type: "van", when: "day", w: 2,
      lines: ["A delivery van idles at the curb.", "The driver jogs past with a box marked FRAGILE: HOT SAUCE."] },
    { id: "sprinkler", type: "sprinkler", when: "day", seasons: ["spring", "summer"], w: 3,
      lines: ["A sprinkler tick-tick-ticks back and forth across a lawn."],
      touch: ["You walk right through it. A little wet. Worth it."] },
    { id: "raccoon", type: "raccoon", when: "night", w: 4,
      lines: ["A raccoon freezes in the middle of the street, holding something shiny.", "You lock eyes. It decides you're fine, and waddles off."],
      leaves: { item: "bottlecap", line: "It dropped the shiny thing. A bottle cap! Finders keepers." } },
    { id: "porch", type: "porch", when: "night", w: 3,
      lines: ["A porch light clicks on as you pass.", "Someone waves from behind a curtain. You wave back."] },
    { id: "stargazer", type: "npc", when: "night", w: 2, look: { shirt: "#8a6aa8", pants: "#5a5a6a", hair: "#d8d4cc", hat: "none" },
      lines: ["A neighbor in a bathrobe is aiming a little telescope at the sky.", "'Saturn,' they whisper. 'Probably.'"] },
    { id: "fireflies", type: "fireflies", when: "night", seasons: ["summer", "spring"], w: 3,
      lines: ["Fireflies, all over the lawns. Blink. Blink."] },
    { id: "balloon", type: "balloon", when: "day", rarity: "rare", w: 1,
      lines: ["A single red balloon drifts down the middle of the street, all by itself.", "It bonks your nose, very gently, and keeps going."] },
    { id: "walker", type: "npc", when: "any", w: 2, look: { shirt: "#c8a040", pants: "#4a4a5a", hair: "#2a2026", hat: "beanie", cap: "#3a6aa0" }, dog: true,
      lines: ["A neighbor walks a dog that is mostly fluff.", "'He's friendly,' they say. The fluff agrees."] }
  ],

  // Branch A
  ball: {
    kinds: [
      { id: "soccer", name: "soccer ball", w: 3 },
      { id: "beach", name: "beach ball", w: 2 },
      { id: "tennis", name: "tennis ball", w: 2 },
      { id: "balloon", name: "water balloon", w: 1, seasons: ["summer"] }
    ],
    // who is waiting for it
    waiters: [
      { id: "kid", w: 3, look: { shirt: "#e8742a", pants: "#3a5a8a", hair: "#3a2418", cap: "#3f8a5a", kid: true },
        call: ["Hey! Little help?"], good: ["Whoa! Nice arm!"], bad: ["Ha! Close enough, I got it!"], ignore: ["That's okay! I'll get it!"], invites: true,
        punted: ["The kid stares at the sky for a long time.", "'...That's okay. I have like nine.'"] },
      { id: "dog", w: 2,
        call: ["A dog is staring at the ball. Then at you. Then at the ball."], good: ["The dog snatches it out of the air and does a victory lap."], bad: ["The ball bounces off a hedge. The dog thinks that was the best part."], ignore: ["The dog trots after it, tail going like a propeller."],
        punted: ["The dog stares straight up, then at you, then up again.", "It decides to wait. Forever, possibly."] },
      { id: "grandparent", w: 2, look: { shirt: "#8a5a7a", pants: "#6a6a6a", hair: "#e0dcd4", hat: "none", glasses: true },
        call: ["'Oh! Would you mind, dear? My knees retired years ago.'"], good: ["'Well! Look at that. Have a butterscotch.'"], gift: "butterscotch", bad: ["'Close enough. I'll send the grandkids.'"], ignore: ["'That's all right. It'll keep.'"],
        punted: ["'Well,' says the grandparent, squinting up. 'Our Harold had a leg like that.'"] }
    ],
    rolls: ["A {ball} rolls out from between two parked cars and stops a few steps ahead of you."],
    closeup: { prompt: "The {ball} sits in your hands.", choices: ["▶ Throw it back", "▶ Punt it"] },
    throwHelp: "Press when the marker's in the green.",
    punt: ["You wind up and BOOT it.", "The {ball} goes up... and up... and keeps going.", "Huh. You don't see it come down."],
    puntNight: "Later that night, a new star twinkles just above the mountains.",
    orbitStar: "That new star again. Is it... spinning?",
    // A1.1 the kid's games
    invite: { prompt: "'Wanna play {game}?'", choices: ["▶ Sure!", "▶ Maybe next time"], decline: ["'Okay! See ya!'"] },
    games: [
      { id: "catch", name: "catch", w: 2, intro: ["'Three throws. Ready?'"], done: ["'You're pretty good! Okay, my mom's calling.'"] },
      { id: "hide", name: "hide and seek", w: 2, intro: ["'You count! No peeking!'"], hint: ["You hear a giggle somewhere nearby.", "A sneaker sticks out from somewhere..."], found: ["'Aww! You found me!'"] },
      { id: "chalk", name: "chalk art", w: 2, intro: ["'Draw anything! I'm doing a dragon.'"], done: ["'Is that a horse? It's a great horse.'", "'Whoa. Can I keep it? I mean it's the sidewalk, so, yes.'"], gift: "chalk" },
      { id: "lemonade", name: "lemonade stand", w: 2, intro: ["'You pour, I'll do money. Fill it to the line!'"], done: ["'We made forty cents! Take a lemon.'"], gift: "lemon" }
    ],
    // A2: the tiny talker on the ball
    talkers: [
      { id: "ant", name: "ant", w: 3, ask: ["'Psst. Down here. On the ball.'", "'Our colony's crumb is stuck past the big crack. It's a whole thing.'", "'Could you help? You'd have to be... smaller.'"] },
      { id: "ladybug", name: "ladybug", w: 2, ask: ["'Excuse me! Hi! Down here!'", "'The ants need their crumb carried home, and I promised I'd find somebody strong.'", "'You look strong. Could you shrink a little?'"] },
      { id: "snail", name: "snail", w: 1, ask: ["'Hello... up there...'", "'I've been trying to get a crumb home to the ants... since Tuesday...'", "'Could you... maybe... be small for a while...'"] }
    ],
    shrinkChoices: ["▶ Sure, I'll help", "▶ Sorry, little one"],
    shrink: ["Everything gets very big, very fast."],
    tiny: {
      arrive: ["The sidewalk cracks are canyons. The lawn is a jungle.", "Somewhere ahead, a crumb the size of a boulder."],
      grab: ["You hoist the crumb. It smells like toast."],
      home: ["The colony cheers. Tinily.", "'The garden hose will make you big again. Just drip under it.'"],
      hose: ["Drip. Drip. SPLOOSH.", "You're big again, standing on the lawn, slightly damp."],
      canyon: "That crack is a canyon. There's a twig bridge somewhere."
    },
    after: ["The street goes on. There's a corner up ahead."]
  },

  // 1.2 the first intersection
  corner: {
    prompt: "A corner. Which way?",
    choices: [
      { id: "B", label: "▶ On to the next block" },
      { id: "C", label: "▶ Uphill to the trailhead" },
      { id: "home", label: "▶ Head home" }
    ]
  }
};
