// Layer 2: the ball, at ant scale. A whole small planet that is exactly the ball that rolled out of the cars.
// All the words live here; js/ballworld.js does the walking and the physics.
// Positions are [latitude, longitude] in degrees on the ball. The pole (lat 90) is where the valve or knot is.
GG.data.ballworld = {
  R: 36, // ball radius in world units (you are 1.8 tall)

  help: [
    "Phone: drag anywhere to walk that way. Tap to talk or do things.",
    "Keyboard: arrows or WASD to turn and walk. Space to talk.",
    "The gold arrow points at whatever you're after. The world is round: keep walking and you'll come back."
  ],

  // the steps of the errand, shown in the goal pill
  goals: {
    hiss: "Follow the hiss",
    keeper: "Ask {keeper} at {pole}",
    fetch: "Get {patch}",
    fix: "Patch the leak",
    home: "Stand on {pole} to grow back"
  },

  // things everyone shares
  common: {
    shrinkFall: ["You shrink. And shrink. The {ball} rushes up to meet you like a planet."],
    arriveNight: "It's night up here. The street lamps are moons.",
    arriveRain: "It's raining. Each drop lands like a dropped bucket.",
    lapped: "You've walked all the way round. The {ball} is exactly as big as it was. Reassuring.",
    chasm: ["That's a long way down. Into the ball. There'll be a bridge somewhere.", "You peer over the edge. Warm air breathes up at you. Find a bridge."],
    farFromHome: "The gold arrow is patient. It will wait.",
    hissNear: "The hiss is louder here. Like the whole world is saying 'shhh'.",
    leakWind: "Air pours out of the leak with a sound like a very long sigh.",
    party: [
      "Word spreads the way it does on a ball: fast, and in every direction at once.",
      "Somebody starts a conga line. It goes all the way round the world and bumps into itself."
    ],
    exit: [
      "{pole} breathes out. A warm puff of air lifts you off your feet.",
      "You rise like a dandelion seed. The {ball} shrinks beneath you to the size of a {ball}.",
      "You land on the pavement, full size, next to it. It looks very slightly smug."
    ],
    exitEarly: [
      "{talker} helps you find a spot where the air puffs up.",
      "Whoosh. You're big again, on the pavement, blinking."
    ],
    after: "The {ball} rolls gently back toward its owner. It's holding its air beautifully.",
    afterEarly: "Somewhere very small, the {ball} is still hissing. Maybe next time.",
    companion: {
      choices: ["▶ What now?", "▶ Tell me something", "▶ Take me home"],
      confirm: { prompt: "Grow back now? The leak will still be there.", choices: ["▶ Not yet", "▶ Yes, grow back"] }
    },
    // things the world says to you as you wander
    ambient: [
      "Somewhere, a giant dog barks. The ground trembles politely.",
      "A shadow slides over the world. A pigeon, the size of weather.",
      "Far off, a car door slams. The whole {ball} hums like a gong.",
      "The horizon is so close you could almost lean on it.",
      "A breeze rolls the world one inch. Everybody leans.",
      "The sky is mostly a parked car.",
      "You hear the street the way a shell hears the sea.",
      "A crumb drifts past overhead like a slow brown moon. Not your problem today."
    ],
    ambientNight: [
      "A moth the size of a kite circles the street lamp. It looks very happy.",
      "The street lamps hum. Up here, it sounds like a choir.",
      "Somebody on the far side of the world is snoring. You can feel it in your feet."
    ],
    ambientRain: [
      "A raindrop the size of a paddling pool lands nearby. SPLOT.",
      "Everything smells of wet rubber and adventure."
    ],
    seam: "You climb over a seam. It's a weld, warm from the sun, like a long glass wall lying down.",
    ink: "The ink is flatter than flat. It feels like walking on a thought.",
    sticky: "Your shoes go 'schlup'. And again: 'schlup'. Sun cream. Coconut, specifically.",
    bridge: "You cross carefully. Below: the dark inside of the world."
  },

  // ----- each ball is its own world -----
  kinds: {
    beach: {
      world: "the beach ball",
      arrive: [
        "You land on a red plain that curves away in every direction.",
        "It smells like summer, and swimming pools, and a little bit like the inside of a car."
      ],
      pole: "the Valve",
      keeper: { kind: "woodlouse", name: "Old Rolf", title: "the Valvekeeper",
        intro: ["Old Rolf, the Valvekeeper, is polishing the Valve with his own back.", "'A leak, you say? On my seam? In my summer?'", "'Seams want something flat and sticky. There's a price sticker on the blue side. Nobody ever peels those off properly.'", "'Peel it. Carry it. Press it. In that order. People always try it the other way round.'"],
        again: ["'The sticker. Blue side. It says a price. Ignore the price, it's not for you.'"],
        thanks: ["Old Rolf wipes a tear with his twelfth leg. 'Good seam. Good seam.'"] },
      leak: { name: "the Split Seam", at: [25, 62],
        found: ["The seam between red and white has split open like a zip.", "Air roars out of it. Somewhere deep inside, the ball is sighing."],
        fixed: ["You slap the sticker over the split and stamp it flat. The roar becomes a whistle, then a squeak, then nothing.", "€2.99 well spent."] },
      patch: { name: "the price sticker", item: "sticker", at: [-30, 205], sprite: "curl",
        see: "A sticker lies on the blue plain like a white field. One corner is curling up.",
        prompt: "The corner of the sticker curls up over your head.", pull: "▶ Pull",
        pulls: ["You grab the corner and pull. It peels back a hand-width with a sound like a zip.", "You pull again. The sticker says €2.99. It is, apparently, a lot of sticker.", "One last heave! It comes away all at once and you sit down hard."],
        got: ["You fold the sticker over your head like a tent you're carrying. It's still sticky. Everything is now sticky."] },
      print: { name: "the printed sun", at: [-14, 318], r: 7.5, look: "sun",
        prompt: "You're standing on the printed sun's left eye. The ink looks... very flat. Comfortable, almost.", choices: ["▶ Lie down in the ink", "▶ Not now"],
        back: ["You peel yourself off the print. You have a front and a back again. It's a lot."] },
      places: [
        { at: [-8, 250], r: 7, name: "the Smear", line: "A lake of sun cream. It glistens. It smells of coconut and good decisions.", sticky: true },
        { at: [40, 280], r: 6, name: "the Dunes", line: "Sand grains, each the size of a car. They came from a real beach, and they never let you forget it." },
        { at: [-45, 120], r: 5, name: "the Dewdrop", line: "A dewdrop sits on the plain like a glass hill. The sky is inside it, upside down." }
      ],
      chasms: [
        { name: "the Split Seam", pts: [[6, 60], [44, 60]], w: 2.6, bridges: [] },
        { name: "the Scuff", pts: [[22, 148], [14, 205], [22, 262]], w: 3.2,
          bridges: [{ at: [17, 182], name: "a hair", line: "A single hair lies across the Scuff like a fallen tree. Brown. Probably the kid's." }, { at: [17, 232], name: "a pine needle", line: "A dry pine needle bridges the Scuff. It creaks like an old jetty." }] },
        { name: "the Crease", pts: [[-56, 30], [-40, 80]], w: 2.4, bridges: [{ at: [-48, 55], name: "a twig", line: "Somebody laid a twig across the Crease. Somebody thoughtful." }] }
      ],
      grains: 26, ambient: ["The plain is so red it hums.", "A sun-cream fume drifts by. Coconut. Unmistakable."]
    },

    soccer: {
      world: "the soccer ball",
      arrive: [
        "You land on a white hexagon the size of a car park. The next one over is black and warm.",
        "Somewhere, a stitched seam runs off toward the horizon like a little canyon."
      ],
      pole: "the Navel",
      keeper: { kind: "beetle", name: "Captain Studs", title: "keeper of the Navel",
        intro: ["Captain Studs stands at the rim of the Navel like it's a penalty box.", "'A rip? On MY ball? Before the final?'", "'You'll want a thread. A long loose one. Somebody's shoelace left one snagged on the south side.'", "'Bring it back and lace that rip like it owes you money.'"],
        again: ["'Thread! South side! Go go go!'"],
        thanks: ["Captain Studs pumps a fist. 'CLEAN SHEET!'"] },
      leak: { name: "the Rip", at: [25, 62],
        found: ["A stitch has popped and the seam has opened into a ravine.", "Air whistles out of it like a referee who won't stop."],
        fixed: ["You lace the thread through the stitch holes, back and forth, back and forth, and pull it tight.", "The whistle stops. Full time."] },
      patch: { name: "a loose thread", item: "thread", at: [-30, 205], sprite: "thread",
        see: "A white thread lies in a heap like a coil of rope on a dock.",
        prompt: "One end of a loose thread is snagged on the stitching.", pull: "▶ Pull",
        pulls: ["You pull. The thread pulls back. You pull harder.", "It comes loose in long lazy loops, like you're starting a lawnmower made of string.", "There. Enough thread to lace a canyon."],
        got: ["You coil it over your shoulder. Proper adventurer stuff."] },
      print: { name: "the printed stars", at: [-14, 318], r: 7.5, look: "stars",
        prompt: "You're standing in the middle of a printed star. The ink looks... very flat. Comfortable, almost.", choices: ["▶ Lie down in the ink", "▶ Not now"],
        back: ["You peel yourself off the star. You have a front and a back again. It's a lot."] },
      places: [
        { at: [-8, 250], r: 6, name: "the Grass Stain", line: "A green smear where the ball once met a lawn at speed. It smells of a Saturday." },
        { at: [40, 280], r: 6, name: "the Mud Clod", line: "A clod of dried mud as big as a hill. Somebody has carved steps into it." },
        { at: [-45, 120], r: 5, name: "the Dewdrop", line: "A dewdrop sits on a hexagon like a glass hill. The sky is inside it, upside down." }
      ],
      chasms: [
        { name: "the Rip", pts: [[6, 60], [44, 60]], w: 2.6, bridges: [] },
        { name: "the Stud Gash", pts: [[22, 148], [14, 205], [22, 262]], w: 3.2,
          bridges: [{ at: [17, 182], name: "a blade of grass", line: "A blade of grass lies across the Gash. Still green. Still a bit springy." }, { at: [17, 232], name: "a lace tag", line: "A plastic lace tag bridges the Gash like a little pier." }] },
        { name: "the Scrape", pts: [[-56, 30], [-40, 80]], w: 2.4, bridges: [{ at: [-48, 55], name: "a twig", line: "A twig across the Scrape. Somebody thoughtful." }] }
      ],
      grains: 18, ambient: ["The black hexagons are warm underfoot, like a car roof.", "A seam runs past, stitched with thread as thick as a hose."]
    },

    tennis: {
      world: "the tennis ball",
      arrive: [
        "You land in a forest. The trees are fuzz. The fuzz is yellow. Everything is very, very soft.",
        "Through the fibres you can see a white canyon winding round the world."
      ],
      pole: "the Bald Spot",
      keeper: { kind: "mite", name: "Granny Fluff", title: "keeper of the Bald Spot",
        intro: ["Granny Fluff sits in the middle of the Bald Spot, where the fuzz wore off years ago.", "'The Bite? A dog's tooth went right through. The air's been leaking ever since.'", "'You'll need felt. Comb a wad of it from the Fuzz Forest and roll it tight as a sock.'", "'Stuff it in the holes. Fuzz to fuzz. That's the old way.'"],
        again: ["'Felt. From the Fuzz Forest. Rolled tight.'"],
        thanks: ["Granny Fluff pats the ground. 'There. Good as new. Good as used, anyway.'"] },
      leak: { name: "the Bite", at: [25, 62],
        found: ["Two round pits punch down through the felt. Tooth marks. A big dog, a happy one.", "Air puffs out of them in little sighs, like the ball is still a bit surprised."],
        fixed: ["You stuff the felt wad into the tooth holes and pat it flat.", "The sighing stops. The fuzz all around stands up a little straighter."] },
      patch: { name: "a wad of felt", item: "felt", at: [-30, 205], sprite: null,
        see: "The Fuzz Forest is thickest here. Some of it is lying about loose, like hay.",
        prompt: "Loose fuzz drifts round your ankles.", pull: "▶ Gather",
        pulls: ["You gather an armful of fuzz. It's like picking up a cloud.", "You roll it, and roll it. It gets smaller and denser and surprisingly heavy.", "A wad of felt, tight as a sock. Perfect."],
        got: ["You carry it over your head like a cushion. Which it basically is."] },
      print: { name: "the printed logo", at: [-14, 318], r: 5.5, look: "logo",
        prompt: "You're standing on the printed logo. The ink looks... very flat. Comfortable, almost.", choices: ["▶ Lie down in the ink", "▶ Not now"],
        back: ["You peel yourself off the logo. You have a front and a back again. It's a lot."] },
      places: [
        { at: [-30, 205], r: 9, name: "the Fuzz Forest", line: "The fuzz grows thick here. It's like walking through a very polite haystack." },
        { at: [40, 280], r: 6, name: "the Drool Marsh", line: "A dried patch where a dog held the ball in its mouth. It's stiff and shiny. It smells like love." },
        { at: [-45, 120], r: 5, name: "the Dewdrop", line: "A dewdrop sits in the fuzz like a glass hill. The sky is inside it, upside down." }
      ],
      seam: { w: 2.6, bridges: 6, name: "the White Canyon", bridgeName: "a fallen fibre", line: "A long fibre has fallen across the White Canyon. You walk it like a beam." },
      chasms: [], pits: true,
      grains: 8, fuzz: 260, ambient: ["The fuzz sways although there is no wind. It's just like that.", "Something rustles in the fuzz. It's the fuzz."]
    },

    balloon: {
      world: "the water balloon",
      arrive: [
        "You land on something warm and pink and wobbly. It wobbles back.",
        "Under your feet, through the skin, water sloshes like a sea in a bag."
      ],
      pole: "the Knot",
      keeper: { kind: "snail", name: "Auntie Glub", title: "keeper of the Knot",
        intro: ["Auntie Glub has wrapped herself round the base of the Knot, the way you'd hug a lighthouse.", "'A drip? A pinprick? Oh, my nerves. Oh, my poor knot.'", "'There's tape. The child patched this balloon once already. A strip of it's peeling on the south side.'", "'Peel it gently, dear. Tape remembers.'"],
        again: ["'The tape. South side. Gently.'"],
        thanks: ["Auntie Glub weeps a single happy bubble. 'Watertight. Watertight!'"] },
      leak: { name: "the Pinprick", at: [25, 62],
        found: ["A tiny hole, and a bead of water swelling out of it, the size of a house.", "Every few seconds it lets go: bloop. The ground sags a little each time."],
        fixed: ["You press the tape over the Pinprick and smooth out every wrinkle.", "The last bead of water wobbles, thinks about it, and stays where it is."] },
      patch: { name: "a strip of tape", item: "tape", at: [-30, 205], sprite: "curl",
        see: "A strip of old tape lies on the skin, one end lifting like a page.",
        prompt: "The loose end of the tape flaps gently over your head.", pull: "▶ Peel",
        pulls: ["You peel gently. Tape remembers.", "It comes away with a sound like someone unsticking their leg from a car seat.", "One long strip of tape, a bit fuzzy, still sticky enough."],
        got: ["You carry it over your head like a banner nobody asked for."] },
      print: { name: "the printed smiley", at: [-14, 318], r: 7.5, look: "smiley",
        prompt: "You're standing in the printed smiley's eye. It's stretched very wide. The ink looks... very flat.", choices: ["▶ Lie down in the ink", "▶ Not now"],
        back: ["You peel yourself off the smiley. You have a front and a back again. It's a lot."] },
      places: [
        { at: [-8, 250], r: 6, name: "the Shine", line: "The skin is so glossy here you can see yourself. You look small. You are small." },
        { at: [40, 280], r: 6, name: "the Puddle Window", line: "The skin is thin here. Underneath, the water rocks like a sleepy sea." },
        { at: [-45, 120], r: 5, name: "the Dewdrop", line: "A dewdrop sits on the skin like a glass hill. It's a drop of water on a bag of water. It feels very at home." }
      ],
      chasms: [
        { name: "the Crease", pts: [[22, 148], [14, 205], [22, 262]], w: 3.2,
          bridges: [{ at: [17, 182], name: "a hair", line: "A long hair lies across the Crease. You walk it like a tightrope, but wider." }, { at: [17, 232], name: "a rubber band", line: "A snapped rubber band bridges the Crease. It's bouncy. Unsettlingly bouncy." }] },
        { name: "the Pinch", pts: [[-56, 30], [-40, 80]], w: 2.4, bridges: [{ at: [-48, 55], name: "a twig", line: "Somebody laid a twig across the Pinch. Somebody thoughtful." }] }
      ],
      grains: 10, wobble: true, ambient: ["The ground wobbles. You wobble. It's fine. Everyone wobbles.", "Somewhere below, the water goes 'glonk'."]
    }
  },

  // ----- who called you down: one of these, at random. ask: what they say on the ball (one variant at random)
  talkers: {
    ant: { name: "Pim", short: "an ant", sprite: "ant",
      ask: [
        ["'Psst. Down here. On the {ball}.'", "'Name's Pim. I'm on day shift. And night shift. There's only one of me on this {ball}.'", "'Something's leaking. If it goes flat, so do we. Could you help? You'd have to be... smaller.'"],
        ["'Oi! Big one! Down here!'", "'This {ball} has a hiss in it. A HISS. Do you know what that means for an ant?'", "'Neither do I. That's why I need someone with longer legs. Shrink a bit?'"]
      ],
      curb: ["'Hey! Big one! Before they take it back!'", "'The {ball}'s leaking and there's nobody big enough to help. Well. Small enough.'"],
      yes: "'Brilliant. Hold still. This bit tickles.'", no: "'Fair. I'll ask a beetle. Beetles never say no. That's the problem with beetles.'",
      arrive: ["Pim lands next to you, brushes off a leg, and salutes.", "'Welcome to the {ball}. Population: me, plus whoever's on it today. Listen... hear that hiss?'"],
      quips: ["'I've walked round this {ball} forty times. It's still round. I checked.'", "'My mum said I'd see the world. She didn't say it'd be this one.'", "'Never trust a horizon you can see both ends of.'", "'I carry ten times my weight. Mostly worries.'"]
    },
    ladybug: { name: "Lou", short: "a ladybird", sprite: "ladybug",
      ask: [
        ["'Hi! Hi! Down here! The red one!'", "'I'm Lou. I land on this {ball} every summer and this year it's... soft.'", "'Something's leaking. Will you come and look? You'd have to be tiny. It's nice being tiny!'"],
        ["'Excuse me! Sorry! Hello!'", "'I promised everybody I'd find someone strong and kind. You look like both.'", "'Our {ball} is going flat. Could you shrink for a little while?'"]
      ],
      curb: ["'Wait! Wait! Down here! By your shoe!'", "'Please don't go. The {ball} is going flat and you're the first person who's looked down all day.'"],
      yes: "'Yay! Okay. Close your eyes. Actually, keep them open, it's lovely.'", no: "'That's okay! I'll keep asking. Somebody always looks down eventually.'",
      arrive: ["Lou flutters down beside you and folds her wings like a tidy umbrella.", "'You're here! Okay, so. Listen. Hear that?'"],
      quips: ["'I've got seven spots. Or six. It depends who's asking.'", "'Everybody thinks ladybirds are lucky. I think I'm just red.'", "'When I fly up high, the {ball} looks like a {ball}. Down here it looks like home.'", "'You're doing so well. I mean it. You're doing very well at walking.'"]
    },
    snail: { name: "Basil", short: "a snail", sprite: "snail",
      ask: [
        ["'Hello... up there...'", "'I'm Basil... I've been crossing this {ball}... since Tuesday...'", "'It's getting... squishier... Something's leaking... Could you... be small for a while...'"],
        ["'Excuse me... you... with the face...'", "'There's a hiss... on the {ball}... It's very rude... It never stops talking...'", "'Would you help... You'd need to shrink... It's not so bad down here... It's quite... slow...'"]
      ],
      curb: ["'Excuse me... you...'", "'The {ball}... is going flat... I'd go myself... but it's a long way... it's a very long way...'"],
      yes: "'Oh... lovely... Mind the slime...'", no: "'That's all right... I'll ask again... next week...'",
      arrive: ["Basil is somehow already here when you land. Nobody saw him arrive. Nobody ever does.", "'Welcome... Listen... can you hear it... the hiss...'"],
      quips: ["'I like to take... the scenic route... all routes are scenic... at this speed...'", "'My house... goes where I go... it's very convenient... for the house...'", "'Don't wait for me... I'll catch up... eventually... I always do...'"]
    },
    waterbear: { name: "Professor Moss", short: "a water bear", sprite: "waterbear",
      ask: [
        ["'Ah. A large person. Excellent. Down here. The one who looks like a sock.'", "'Professor Moss. Tardigrade. I have survived boiling, freezing and outer space.'", "'I would rather not survive deflation. Philosophically. Would you shrink and assist?'"],
        ["'Ahem. Below you. The microscopic genius.'", "'This {ball} is losing pressure at a rate I can only describe as \"rude\".'", "'Your help would be welcome. You'd need to be about my size. It's a very good size.'"]
      ],
      curb: ["'You there. Large person. Down here.'", "'The {ball} is leaking and you just walked past it. Statistically, you're our best hope. Shrink?'"],
      yes: "'Splendid. You will feel a slight sense of perspective.'", no: "'Very well. I'll survive. I always do. It's my one trick.'",
      arrive: ["Professor Moss trundles up on eight stubby legs and adjusts a monocle he doesn't have.", "'Welcome to the {ball}. Observe the curvature. Now: listen. That hiss is our problem.'"],
      quips: ["'I once survived ten days in space. The {ball} is nicer. Better snacks.'", "'If things get bad, I simply dry up and wait. I don't recommend it for you.'", "'Every horizon is just the edge of a ball you haven't walked round yet.'", "'I am the toughest animal on Earth. I am also, technically, a sock.'"]
    },
    flea: { name: "Fizz", short: "a flea in a tiny top hat", sprite: "flea",
      ask: [
        ["'LADIES AND GENTLEMEN! And you! Down here!'", "'Fizz the flea, ringmaster of the Greatest Show on the {ball}!'", "'Our stage is sagging! There's a leak! Opening night is in an hour! We need a strongman. Shrink?'"],
        ["'Hey! HEY! Big top! Down here!'", "'The circus needs you! Well, the {ball} needs you. The circus is on the {ball}. It's complicated!'", "'Shrink down and save the show?'"]
      ],
      curb: ["'Psst! You! The tall act!'", "'The {ball}'s leaking and the show must go on! Shrink down before they take it?'"],
      yes: "'MARVELLOUS! Drumroll, please!' Nobody does the drumroll.", no: "'The show will go on! Somehow! Probably! Possibly!'",
      arrive: ["Fizz lands next to you in a spray of tiny sequins and takes a bow to nobody.", "'Welcome to the {ball}! First, the bad news. Listen... that hiss is not part of the act.'"],
      quips: ["'I can jump a hundred times my height. I mostly use it to get away from dogs.'", "'Our trapeze artist is a gnat. Our lion is also a gnat. We're short on staff.'", "'Applause! Even a little! Fleas run on applause.'", "'Did you see that? No? I'll do it again. You'll miss it again. That's showbiz.'"]
    },
    mite: { name: "Mayor Dot", short: "a velvet mite with a sash", sprite: "mite",
      ask: [
        ["'Ahem! Citizen! Down here!'", "'Mayor Dot, velvet mite. Elected unopposed. I elected myself.'", "'The {ball} has a leak, and I've formed a committee: you. Would you shrink to attend?'"],
        ["'Excuse me! Mayor speaking! Down here!'", "'I'm declaring a state of emergency. The {ball} is going flat.'", "'You're hereby deputised. All you have to do is shrink. Paperwork to follow.'"]
      ],
      curb: ["'Citizen! Halt! Down here!'", "'There's a leak on the {ball} and you're the only one big enough to be small enough. Shrink, by order of the Mayor?'"],
      yes: "'Motion carried! Shrink at will!'", no: "'Noted in the minutes. Disappointed in the minutes.'",
      arrive: ["Mayor Dot waddles up, adjusting a sash that says MAYOR in very small letters.", "'Welcome, deputy. Item one on the agenda: that hiss.'"],
      quips: ["'I've cut forty ribbons this year. Most were hairs. Nobody complained.'", "'My approval rating is a hundred percent. Of me.'", "'If you see anyone littering, tell them the Mayor is disappointed. In red.'", "'Under my leadership, the {ball} has remained round. I take full credit.'"]
    }
  },
  // the companion's hints, by step. {keeper}, {pole}, {patch}, {leak} are filled in
  hints: {
    hiss: "'Follow the hiss. The gold arrow knows. Arrows always know.'",
    keeper: "'{keeper} lives up at {pole}. Top of the world. Can't miss it, unless you can.'",
    fetch: "'We need {patch}. The arrow's pointing. I'd follow it.'",
    fix: "'Back to {leak}! Before {patch} stops being sticky. Or useful. Or ours.'",
    home: "'Stand on {pole}. It'll puff you home.'",
    done: "'You can stay as long as you like. The {ball} is holding its breath for you. In a good way.'"
  },

  // ----- the people you meet: six of these are on the ball each time, at random -----
  // teaser: a caption when you come near. talk: what they say. ask: an optional little choice. again: if you talk twice
  encounters: [
    { id: "funeral", sprite: "mite", name: "two dust mites in tiny hats", teaser: "Two dust mites in tiny black hats are standing very still.",
      talk: ["'We are gathered here to remember a flake of skin.'", "'It was with us for a whole afternoon. It never complained once.'"],
      ask: { prompt: "'Would you like to say a few words?'", choices: ["▶ 'It was a good flake.'", "▶ Bow your head"],
        replies: [["'It was. It really was.' They both cry a little, which, for a mite, is about a sixth of a tear."], ["You bow. They bow. Somebody has to stop bowing first. Nobody does, for a while."]] },
      again: ["'Thank you for coming. There's a buffet. It's also skin.'"] },
    { id: "pip", sprite: "springtail", name: "Pip, a springtail", teaser: "Something lavender is boinging up and down on the spot.", bounce: true,
      talk: ["'Hi! Hi! I can't stop! It's a spring! In my tail! It's in the name!'", "'I've been jumping since Tuesday. I've seen so much. Mostly up.'"],
      ask: { prompt: "'Want to see my biggest one?'", choices: ["▶ Yes!", "▶ Please don't"],
        replies: [["Pip crouches, quivers, and is gone. A long time later, a faint 'wheeee' from the far side of the world."], ["'Too late!' Pip is gone. A long time later, a faint 'sorry' from the sky."]] },
      again: ["'I'm back! I landed on a pigeon! Don't tell anyone!'"] },
    { id: "invest", sprite: "aphid", name: "an aphid with a business plan", teaser: "A small green someone is holding a sign that says INVEST.",
      talk: ["'Picture this. Honeydew. But on a ball.'", "'Ants have been farming us for years. I'm cutting out the middleman. I'm going to farm myself.'"],
      ask: { prompt: "'Are you in?'", choices: ["▶ I'm in", "▶ I'm out"],
        replies: [["'Fantastic. You now own one percent of me. That's my left leg. Treat it well.'"], ["'Your loss. Honeydew futures are about to go absolutely sideways.'"]] },
      again: ["'Quarterly update: I'm still an aphid. Very bullish.'"] },
    { id: "agnes", sprite: "spider", name: "Agnes, a spider", teaser: "A spider is knitting something enormous and lumpy.",
      talk: ["'It's a jumper. For the ball. For when it gets cold.'", "'Balls get ever so cold. Nobody knits for them. Nobody thinks.'"],
      ask: { prompt: "'Be honest. Does this look like a jumper to you?'", choices: ["▶ It's beautiful", "▶ Agnes, it's a web"],
        replies: [["'I KNEW it.' She knits faster, glowing."], ["'It's a web WITH SLEEVES.' She's not wrong. There are sleeves."]] },
      again: ["'Nearly done. Just the neck hole. Balls don't have necks. That's the hard part.'"] },
    { id: "gerald", sprite: "woodlouse", name: "Gerald, a woodlouse", teaser: "A grey armoured someone is muttering 'don't say it, don't say it'.",
      talk: ["'Whatever you do, don't say the word for a round thing that bounces.'"],
      ask: { prompt: "Gerald is watching your mouth very closely.", choices: ["▶ Say 'ball'", "▶ Don't say it"],
        replies: [["You say it. Gerald rolls into a ball instantly. 'Every TIME,' says the ball, muffled."], ["'Thank you. You have no idea what this place is like for me.' He gestures at the entire world."]] },
      again: ["'Living on a... on a... on one of these. It's exposure therapy. It isn't working.'"] },
    { id: "gnat", sprite: "gnat", name: "a gnat", teaser: "A gnat is flying in a tight, determined circle.", fly: true,
      talk: ["'I'm not lost. I'm exploring the same spot. Thoroughly.'", "'Do you know the way to the kitchen? There's always a kitchen. With a bowl of fruit in it.'"],
      again: ["'Still not lost. Just very, very local.'"] },
    { id: "doug", sprite: "beetle", name: "Big Doug, a beetle", teaser: "A beetle is doing push-ups. Loudly.",
      talk: ["'NINETY-EIGHT. NINETY-NINE. NINETY... what was I on.'", "'One day I'm going to lift this whole ball. Not today. Today is legs.'"],
      ask: { prompt: "'Spot me?'", choices: ["▶ Spot him", "▶ Cheer from a distance"],
        replies: [["You hover your hands near his shell. He does one more push-up and declares it a personal best."], ["'YEAH! I CAN HEAR YOU! THAT HELPS!' It does seem to."]] },
      again: ["'Rest day. I'm resting. Look at me rest. LOOK AT IT.'"] },
    { id: "prue", sprite: "ladybug", name: "Prue, a ladybird", teaser: "A ladybird is counting under her breath.",
      talk: ["'Seven. No, six. Eight? I keep getting a different number of spots.'"],
      ask: { prompt: "'Could you count them for me?'", choices: ["▶ Count carefully", "▶ Say 'seven' confidently"],
        replies: [["You count. You get nine. She gets five. You agree it's a personal matter."], ["'Seven! Thank you. That's what I'll tell people.'"]] },
      again: ["'I've decided I have a lot of spots. That's the number. A lot.'"] },
    { id: "poet", sprite: "aphid", name: "a greenfly poet", teaser: "Someone small is reciting to nobody.",
      talk: ["'A haiku. Ahem.'", "'The horizon bends / I walked toward it all day / it was here all along.'", "'I'm still working on it. The ball keeps proving me right.'"],
      again: ["'New one. Ahem. \"Round.\" That's it. That's the whole poem. I'm going through something.'"] },
    { id: "moira", sprite: "snail", name: "Moira, a snail", teaser: "A snail is hurrying. Visibly. Slightly.",
      talk: ["'Can't stop! I'm late for something!'", "'It was in March. I'm hoping they waited.'"],
      again: ["'Still late! Making excellent time, though.'"] },
    { id: "lena", sprite: "ant", name: "Lena, a cartographer", teaser: "An ant is unrolling a map the size of a stamp.",
      talk: ["'I'm mapping the world. Every time I finish, I end up back where I started.'", "'I'm starting to suspect it's round. Don't tell the others. They're very invested in edges.'"],
      ask: { prompt: "'Where would you put the edge?'", choices: ["▶ 'There isn't one'", "▶ Point somewhere at random"],
        replies: [["She stares at you for a long time. Then she rolls up the map, very slowly. 'I need to sit down.'"], ["'There? Really?' She draws a dotted line. 'Here Be Dragons.' She looks thrilled."]] },
      again: ["'I've drawn the edge in pencil. Just in case.'"] },
    { id: "standup", sprite: "flea", name: "a flea doing stand-up", teaser: "A flea is holding a microphone made of a seed.",
      talk: ["'So I said to the dog, you're my whole world. And he said, I KNOW, get OFF.'", "'Thank you, thank you, I'm here all week. Possibly forever. I can't find the way off.'"],
      again: ["'Tough crowd. Tiny, tough crowd.'"] },
    { id: "prophet", sprite: "mite", name: "an old mite on a sand grain", teaser: "Someone is sitting on a sand grain, looking out to sea. There is no sea.", onGrain: true,
      talk: ["'This grain came from a beach. A real one. With an ocean, and gulls, and a man selling ice creams.'", "'Nobody believes me. But listen.' You listen. You hear the street. 'Exactly like the sea,' they whisper."],
      again: ["'The tide's out. It's always out. It's been out for a very long time.'"] },
    { id: "elaine", sprite: "beetle", name: "Elaine, who knows everything", teaser: "Somebody is whispering loudly enough to hear from here.",
      talk: ["'Did you hear? The ball is LEAKING. Don't tell anyone I told you.'", "'I've told everyone. Twice. Some of them three times, because they looked like they'd forgotten.'"],
      again: ["'I heard YOU'RE fixing it. I heard it from me. I'm a very reliable source.'"] },
    { id: "moth", sprite: "gnat", name: "a moth", teaser: "A moth is flying at the sun, very determinedly.", fly: true, when: "day",
      talk: ["'I've been flying toward that lamp all day. It's further away than it looks.'", "'When I get there, I'm going to have the best time.'"],
      again: ["'Nearly there. Any minute now.'"] },
    { id: "fireflies", sprite: "gnat", name: "a firefly on a date", teaser: "A small light is blinking nervously.", fly: true, when: "night",
      talk: ["'Shh. I'm blinking at someone. Three long, one short. It means \"nice antennae\".'", "Somewhere far off, a light blinks back: long, long, long. 'What does THAT mean?!'"],
      again: ["'We're going to the street lamp on Friday. It's very romantic. Everyone will be there.'"] }
  ],

  // the hint-giver who sits by the print (the way into layer 3)
  sage: { sprite: "waterbear", name: "Ommm, a water bear", teaser: "A water bear is sitting cross-legged. All eight legs crossed.",
    talk: ["'I've survived boiling, freezing and outer space. I'm meditating now. It's much harder.'", "'You see the {print}? Ink is a country with no up.'", "'If you lie down in it, you might visit. Bring your edges.'"],
    again: ["'Lie in the ink. Or don't. Either way the ink will be very flat about it.'"] }
};
