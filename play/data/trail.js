// Branch C: the trail. Pickups, little mistakes, the standoff, repeat-visit
// encounters, the summit. All content.
GG.data.trail = {
  trailhead: ["The road ends. A dirt trail starts uphill, toward the rocks."],
  // flowers and things beside the path, by season
  pickups: {
    spring: ["columbine", "paintbrush", "pinecone", "pinecone", "aster"],
    summer: ["columbine", "sunflower", "paintbrush", "pinecone", "aster"],
    autumn: ["aster", "pinecone", "pinecone", "leaf", "acorn"],
    winter: ["pinecone", "pinecone", "rock", "pinecone"]
  },
  got: "Into the backpack: {item}.",
  // C1: every so often, not what you thought
  oops: [
    "That's not a pinecone. That's a very committed deer dropping. You put it back. Gently.",
    "That's not a flower. It's a candy wrapper having a nice day. You leave it be... no, you pocket it for the trash. Good job, you.",
    "That's not a pinecone. It's a sleepy beetle. It would like to be put down. Done.",
    "That's not a rock. That's a toad who is FURIOUS. Sorry, sir."
  ],
  oopsChance: 0.18,
  // C2: the standoff
  lion: {
    spot: ["Up ahead, a puppy is backed against a rock.", "And on the ledge above it: a mountain lion. Very still. Very big."],
    start: "The mountain lion won't budge.",
    prompt: "What do you do?",
    actions: [
      { id: "tall", label: "Stand tall", lines: ["You stand up tall and spread your arms. You are, briefly, a coat rack of great authority."], calm: 2 },
      { id: "snack", label: "Toss a snack", lines: ["You toss the {item}. The lion sniffs it... and eats it. Huh. Okay."], calm: 3, needs: "snack",
        none: ["You pat your pockets. Lint. You toss the lint. The lion watches it float."] },
      { id: "whistle", label: "Whistle", lines: ["A long, clear whistle. The lion's ears go flat. It does not care for that."], calm: 2,
        flop: ["You whistle. It comes out as a sad little wheeze. The lion tilts its head."], flopChance: 0.4 },
      { id: "tongues", label: "Whisper in tongues", lines: ["You whisper: 'Blorp vesh ala-kanoo, mimsy toast.' The lion looks deeply unsettled."], calm: 3,
        flop: ["You whisper something. Even you don't know what it was. The lion leans in, curious."], flopChance: 0.5 }
    ],
    // shown after each turn, by how calm the lion is so far
    react: ["The lion's tail twitches.", "The lion shifts its weight. It's thinking it over.", "The lion takes one step back."],
    need: 5, turns: 4,
    win: ["The lion huffs, turns, and pours itself off the ledge into the scrub. Gone.", "The puppy wobbles over and sits on your foot.", "Looks like you have a friend now."],
    lose: ["The lion ROARS. The puppy bolts into the rocks.", "Then the lion is gone, too. Just like that.", "That puppy's still out here somewhere. Maybe next time."]
  },
  // C6 and the rest of the trail: random encounters (weather, wildlife, side paths, people)
  encounters: [
    { id: "deer", type: "deer", when: "day", w: 3, lines: ["A deer steps out onto the trail, looks at you, and decides you're boring.", "It wanders off. Rude, but fair."] },
    { id: "eagle", type: "eagle", when: "day", w: 2, lines: ["An eagle circles overhead, wide and slow.", "Something drifts down and lands at your feet: a feather."], item: "feather" },
    { id: "marmot", type: "marmot", when: "day", w: 3, seasons: ["spring", "summer", "autumn"], lines: ["A marmot pops up on a rock and whistles at you, scandalized.", "You apologize. It accepts."] },
    { id: "owl", type: "owl", when: "night", w: 4, lines: ["Hoo. Hoo-hoo.", "Two yellow eyes in a pine, watching your headlamp bob by."] },
    { id: "creek", type: "creek", when: "any", w: 2, seasons: ["spring", "summer", "autumn"], lines: ["A side path drops down to a creek, chattering over the rocks.", "You stand there a while. Nothing happens. It's great."] },
    { id: "cave", type: "cave", when: "any", w: 1, lines: ["A shallow cave in the rock, just big enough to sit in.", "Someone has scratched a tiny sun on the wall."] },
    { id: "meadow", type: "meadow", when: "day", w: 2, seasons: ["spring", "summer"], lines: ["The trees open into a meadow full of flowers and bees doing their jobs."] },
    { id: "hiker", type: "npc", role: "hiker", when: "any", w: 3, look: { shirt: "#c8402a", pants: "#5a5a4a", hair: "#8a5a34", hat: "beanie", cap: "#e8b830", pack: "#3a6aa0" },
      lines: ["A hiker comes down the trail, poles clicking.", "'Great view up top,' they say. 'If the clouds behave.'"] },
    { id: "ranger", type: "npc", role: "ranger", when: "day", w: 2, look: { shirt: "#8a7a4a", pants: "#4a5a3a", hair: "#3a2418", hat: "ranger", pack: "none" },
      lines: ["A ranger tips their hat. 'Stay on the trail. And if you see a lion, look big.'"], item: "map", itemLine: "They hand you a trail map with the summit circled." },
    { id: "birder", type: "npc", role: "birdwatcher", when: "day", w: 2, look: { shirt: "#6a8a5a", pants: "#7a6a4a", hair: "#c8c0b0", hat: "bun", pack: "none", glasses: true },
      lines: ["A birdwatcher with enormous binoculars shushes you, kindly.", "'Western tanager,' they whisper. You both look. It's a leaf."] }
  ],
  // C3: a passing hiker when your pack is full, and what they'll tell you for a gift
  gift: {
    prompt: "Your backpack is full. What now?",
    choices: ["▶ Drop something", "▶ Gift something to a hiker", "▶ Leave it"],
    hikerIntro: "A hiker stops. 'That's a nice {item}. Trade you a tip for it?'",
    hints: [
      "'The kid on the street has a real arm. Throw it back sometime, they'll want to play.'",
      "'Fog lifts by afternoon, mostly. The view's worth a second try.'",
      "'Lions hate whistling. And, weirdly, poetry.'",
      "'There's an ant colony by the garden hose. Be nice to them. They remember.'",
      "'Ever punt a ball so hard it doesn't come down? Look up at night.'",
      "'The corner café's barista is a soft touch for a sad face.'"
    ],
    drop: "You leave the {item} by the trail for someone else to find."
  },
  // C5
  summit: {
    arrive: ["The trail tops out on a slab of warm rock.", "Nobody else is up here. Just wind."],
    turn: "You turn around.",
    view: { day: ["There's the whole town, laid out like a quilt.", "Somewhere down there is your garage."], dusk: ["The town is going gold, then pink, then blue.", "Porch lights are starting to come on."], night: ["The town is a bowl of tiny lights.", "One of them is your porch light. Probably."] },
    fog: ["Fog fills the whole valley like milk in a bowl.", "You can't see a thing. Come back another day."],
    snow: ["Snow hushes everything. The town is a soft grey blur down there."],
    choices: ["▶ Head home", "▶ Stay a little longer"]
  }
};
