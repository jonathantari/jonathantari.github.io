// World tables: weather odds by season, captions, home lines.
// Edit freely: this file is content, not code.
(window.GG = window.GG || {}).data = window.GG.data || {};
GG.data.world = {
  // weights per season; the roll happens each time you step onto the street (1.0)
  weather: {
    winter: [{ id: "clear", w: 4 }, { id: "snow", w: 3 }, { id: "fog", w: 1 }, { id: "wind", w: 2 }],
    spring: [{ id: "clear", w: 5 }, { id: "rain", w: 3 }, { id: "fog", w: 1 }, { id: "wind", w: 2 }, { id: "snow", w: 0.5 }],
    summer: [{ id: "clear", w: 7 }, { id: "rain", w: 2 }, { id: "wind", w: 1 }, { id: "fog", w: 0.3 }],
    autumn: [{ id: "clear", w: 5 }, { id: "rain", w: 2 }, { id: "fog", w: 2 }, { id: "wind", w: 3 }, { id: "snow", w: 0.4 }]
  },
  // the little caption when you step onto the street
  todWord: { day: ["morning", "afternoon"], dusk: ["evening"], night: ["night"] },
  weatherWord: {
    clear: ["Clear skies.", "Not a cloud.", "Blue all the way up."],
    wind: ["A breezy one.", "The trees are talking."],
    rain: ["A soft rain.", "Drizzly and grey."],
    fog: ["Fog rolling in.", "Soupy out."],
    snow: ["Snow falling.", "Big slow flakes."]
  },
  // the first beat: 0.3
  ready: {
    first: ["Huh. Where'd you come from?"],
    again: ["Ready for another wander?"],
    choices: ["▶ Head to the street", "▶ Just hang out"]
  },
  // 0.5: walking back up the driveway
  home: {
    prompt: "Home's right here. Head in?",
    choices: ["▶ Head home", "▶ Keep wandering"],
    arrive: ["Home again.", "The garage light is still on.", "Back where you started. Feels good."],
    puppy: ["The puppy flops down on the cool garage floor."],
    saved: "(Your backpack is just where you left it.)"
  },
  ui: {
    photo: "Snap! Saved to the album in your backpack.",
    packFull: "Your backpack is full.",
    noPhotos: "No photos yet. Tap the camera to take one.",
    emptyPack: "Nothing in here but crumbs."
  }
};
