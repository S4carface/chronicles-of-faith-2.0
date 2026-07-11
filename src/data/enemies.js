// Genesis enemies — each with HP, attack variants, and narrated story context

export const ENEMIES = {
  serpent: {
    id: "serpent",
    name: "The Serpent",
    icon: "🐍",
    hp: 26,
    summary: "The serpent tempts Eve with doubt in the Garden of Eden.",
    narration: "Now the serpent was more crafty than any of the wild animals the Lord God had made. He said to the woman, 'Did God really say...?' — Genesis 3:1",
    attacks: [
      { name: "Venomous Bite", damage: 5, icon: "🦷" },
      { name: "Whisper of Doubt", damage: 3, icon: "💬", effect: "drain", description: "Lose 1 Faith next turn" },
      { name: "Temptation", damage: 4, icon: "🍎", effect: "discard", description: "Discard 1 card" },
    ],
  },
  cain_wrath: {
    id: "cain_wrath",
    name: "Cain's Wrath",
    icon: "😡",
    hp: 32,
    summary: "Cain's jealousy leads to the first murder.",
    narration: "Cain was very angry, and his face was downcast. The Lord said, 'Sin is crouching at your door.' — Genesis 4:5-7",
    attacks: [
      { name: "Brother's Strike", damage: 7, icon: "👊" },
      { name: "Jealous Rage", damage: 9, icon: "🔥", effect: "recoil", description: "Takes 3 recoil damage" },
      { name: "Mark of Cain", damage: 5, icon: "👁️", effect: "skip_draw", description: "Draw 1 fewer card next turn" },
    ],
  },
  pride_babel: {
    id: "pride_babel",
    name: "Pride of Babel",
    icon: "🏰",
    hp: 38,
    summary: "Humanity's pride drives them to build a tower to heaven.",
    narration: "They said, 'Come, let us build ourselves a city, with a tower that reaches to the heavens, so that we may make a name for ourselves.' — Genesis 11:4",
    attacks: [
      { name: "Boastful Pride", damage: 6, icon: "📢" },
      { name: "Scatter", damage: 8, icon: "💥" },
      { name: "Confused Tongues", damage: 5, icon: "🗣️", effect: "random_card", description: "Forces random card play" },
    ],
  },
  // ===== BOSSES =====
  the_flood: {
    id: "the_flood",
    name: "The Great Flood",
    icon: "🌊",
    hp: 55,
    isBoss: true,
    summary: "God cleanses the earth with a great flood, sparing only Noah.",
    narration: "On that day all the springs of the great deep burst forth, and the floodgates of the heavens were opened. — Genesis 7:11",
    attacks: [
      { name: "Rising Waters", damage: 9, icon: "💧" },
      { name: "Storm of Judgment", damage: 11, icon: "⛈️" },
      { name: "Destroy All Flesh", damage: 13, icon: "💀" },
      { name: "Cleansing Wave", damage: 7, icon: "🌀", effect: "heal_self", description: "Heals self 6 HP" },
    ],
  },
  babel_tower: {
    id: "babel_tower",
    name: "Tower of Babel",
    icon: "🏯",
    hp: 60,
    isBoss: true,
    summary: "God scatters the proud builders of Babel across the earth.",
    narration: "They built a tower to the heavens to make a name for themselves, but the Lord confused their language. — Genesis 11:4-7",
    attacks: [
      { name: "Prideful Build", damage: 8, icon: "🧱" },
      { name: "Reach for Heaven", damage: 10, icon: "⬆️" },
      { name: "Scatter Nations", damage: 9, icon: "🌪️", effect: "dot", description: "2 damage per turn for 3 turns" },
      { name: "Confusion", damage: 6, icon: "😵‍💫", effect: "block_scripture", description: "No scripture cards next turn" },
    ],
  },
};

export const ENEMY_POOL = [
  "serpent",
  "cain_wrath",
  "pride_babel"
];
export const BOSSES = ["the_flood", "babel_tower"];