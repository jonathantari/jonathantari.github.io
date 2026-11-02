// The flatland: the ant game (A2.1, now flat). All the words live here.
GG.data.flat = {
  // how it plays, shown as a tooltip on arrival (and again if you stand still)
  help: {
    touch: ["Hold anywhere. You glide toward your finger."],
    keys: ["Arrows or WASD to glide."]
  },
  // tooltips that point at the way in
  hints: {
    street: ["The ball seems to be... ticking?", "Something on the ball is waving at you."],
    closeup: ["Psst. Look closer at the ball.", "Something is tickling your thumb. Tap it."],
    walkPast: ["From the pavement, a very small voice: 'Hey! Hey, big one!'"]
  },
  // walking past the ball (A4): whoever was on it is left on the curb. {short}, {name}, {ball}
  walkPast: {
    noticed: ["Behind you, the ball is gone. A tiny voice is not.", "'Psst! Down here! On the curb!'"],
    prompt: "{short} is waving at your shoe with everything it's got.",
    choices: ["▶ Look down", "▶ Keep walking"],
    keep: ["You keep walking. Behind you, a tiny voice says 'Rude,' warmly.", "You keep walking. A very small voice shouts 'NEXT TIME, THEN!'"]
  },
  arrive: [
    "The world goes flat. Not sad flat. Plane flat.",
    "You're a pentagon now. It suits you."
  ],
  // when you come in through a ball's print (layer 3)
  arriveInk: "You lie down in the ink of {print}. It's so flat it's barely there. Then you're in it.",
  // and when the Sphere sets you back on the ball
  toBall: ["The Sphere sets you down on the print. You have a front and a back again. It's a lot.", "Somewhere under your feet, a pentagon is telling everyone about you."],
  // the goal line at the bottom of the screen, one per step
  goals: {
    elder: "Say hi to the Elder",
    find: "Find the lost grain",
    catch: "Catch it when it glows green",
    home: "Bring it home",
    sphere: "Step into the circle"
  },
  // the Elder gives the errand
  quest: [
    "Elder Octagon: 'A pentagon! Excellent. We need someone with corners.'",
    "'A grain of sand fell into the plane. It's from Up, where the big ones live. It bobs about out east, half here and half not.'",
    "'Bring it home to the circle. Follow the arrow. Gaps are the polite way through.'"
  ],
  // the people of the plane. at: [x, y]; n: sides (0 = a line, -1 = a circle). Glide close to chat.
  folk: [
    { id: "elder", n: 8, at: [100, 205], c: "#f2d890", name: "Elder Octagon", stay: true, lines: ["'Off you go. East is the one with the grain in it.'", "'Gaps are the polite way through.'"] },
    { id: "tri", n: 3, at: [190, 430], c: "#8ad8c0", name: "Little Triangle", lines: ["'I'm sharp, but nice.'", "'My cousin is a line. You can't see her from the front.'"] },
    { id: "sq", n: 4, at: [290, 200], c: "#e8a0b8", name: "Square", lines: ["'We tried counting our sides. We keep getting different answers.'"] },
    { id: "hex", n: 6, at: [480, 120], c: "#a8b8f0", name: "Hexagon", lines: ["'The crack isn't a line. It's a mood.'"] },
    { id: "pen", n: 5, at: [560, 440], c: "#d8c0f0", name: "Fellow Pentagon", lines: ["'We should start a club. It would be very small. And pentagonal.'"] },
    { id: "tri2", n: 3, at: [650, 150], c: "#8ad8c0", name: "Other Triangle", lines: ["'I walk the long way around. Nobody has told me why.'"] },
    { id: "ring", n: -1, at: [700, 320], c: "#f0b8a0", name: "Circle Priest", lines: ["'The grain is a visitor from above. It only touches our world a little at a time.'", "'Catch it when it's shy.'"] },
    { id: "hept", n: 7, at: [895, 225], c: "#c8e8a0", name: "Heptagon", lines: ["'Seven sides. Nobody likes seven. I like seven.'"] },
    { id: "sq2", n: 4, at: [1010, 350], c: "#e8a0b8", name: "Sleepy Square", lines: ["'Mmm. Is it morning? It's always the same shade here.'"] }
  ],
  // the shy line that blocks the last gap: from the front she is a single point
  shy: {
    name: "Madam Line",
    seen: ["Madam Line: 'Oh! You bumped into me! Most people think I'm a dot.'", "'Edge-on I'm very hard to see. Let me slide aside.'"],
    thanks: "'The grain's just past here. It bobs.'"
  },
  crumb: {
    far: ["There it is. It's breathing through the floor.", "Big, then small, then big. Catch it when it's small and green."],
    big: ["Too big to hold right now. Wait for it to shrink and glow."],
    grab: ["Got it! It settles beside you, a circle, trying to behave. It's a sphere really. Don't tell it."],
    carry: "Everyone you pass will want to come along."
  },
  parade: {
    join: "{name} joins the parade.",
    first: "A parade! That's how you know it's important."
  },
  home: {
    deliver: ["The colony cheers. In lines.", "Everyone gets an extra side. It's a whole thing."],
    elder: ["Elder Octagon: 'You carried a visitor through the plane. Without a single hand.'", "'Now. The way back is up. Step into the circle.'"],
    sphere: "A circle is opening in the floor."
  },
  sphere: {
    lift: ["The circle swells. It's a Sphere, and you're riding it.", "'Up,' says the Sphere, which is the only word it knows.", "Up. There is an up. You never knew."],
    hose: ["Drip. Drip. SPLOOSH.", "You're big again, standing on the lawn, slightly damp."],
    after: "On the curb, a line of ants marches past. One of them waves."
  },
  // leaving early from the corner button
  leave: { prompt: "Stay flat a little longer?", choices: ["▶ Keep exploring", "▶ Go home"], back: ["You walk off the edge of the page, and land on the lawn."] }
};
