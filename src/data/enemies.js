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
    corrupt_humanity: {
    id: "corrupt_humanity",
    name: "Corrupt Humanity",
    icon: "🌑",
    hp: 34,
    summary: "Violence and corruption spread across the earth before the Flood.",
    narration:
      "The earth was corrupt in God's sight and was full of violence. — Genesis 6:11",
    attacks: [
      { name: "Spreading Violence", damage: 7, icon: "⚔️" },
      {
        name: "Corrupting Influence",
        damage: 4,
        icon: "🌑",
        effect: "discard",
        description: "Discard 1 card",
      },
      {
        name: "Hardened Heart",
        damage: 5,
        icon: "🪨",
        effect: "block",
        blockValue: 6,
        description: "Gains 6 Block",
      },
    ],
  },

  nephilim: {
    id: "nephilim",
    name: "The Nephilim",
    icon: "🗿",
    hp: 42,
    summary: "Ancient mighty warriors walk the earth before the Flood.",
    narration:
      "The Nephilim were on the earth in those days—the mighty men who were of old, men of renown. — Genesis 6:4",
    attacks: [
      { name: "Mighty Blow", damage: 10, icon: "💥" },
      {
        name: "Ancient Strength",
        damage: 6,
        icon: "🗿",
        effect: "block",
        blockValue: 8,
        description: "Gains 8 Block",
      },
      {
        name: "Terrifying Presence",
        damage: 5,
        icon: "👁️",
        effect: "drain",
        description: "Lose 1 Faith next turn",
      },
    ],
  },

  sodom_corruption: {
    id: "sodom_corruption",
    name: "Corruption of Sodom",
    icon: "🔥",
    hp: 38,
    summary: "The wickedness of Sodom brings judgment upon the city.",
    narration:
      "The outcry against Sodom and Gomorrah is so great and their sin so grievous. — Genesis 18:20",
    attacks: [
      { name: "City of Wickedness", damage: 8, icon: "🔥" },
      {
        name: "Blinding Darkness",
        damage: 5,
        icon: "🌫️",
        effect: "skip_draw",
        description: "Draw 1 fewer card next turn",
      },
      {
        name: "Burning Judgment",
        damage: 6,
        icon: "☄️",
        effect: "dot",
        description: "2 damage per turn for 3 turns",
      },
    ],
  },

  famine_canaan: {
    id: "famine_canaan",
    name: "Famine in Canaan",
    icon: "🌾",
    hp: 30,
    summary: "Severe famine forces families to search for food and survival.",
    narration:
      "Now the famine was severe in the land. — Genesis 43:1",
    attacks: [
      { name: "Empty Harvest", damage: 6, icon: "🌾" },
      {
        name: "Hunger",
        damage: 4,
        icon: "🥀",
        effect: "drain",
        description: "Lose 1 Faith next turn",
      },
      {
        name: "Scarcity",
        damage: 3,
        icon: "🪹",
        effect: "skip_draw",
        description: "Draw 1 fewer card next turn",
      },
    ],
  },

  esau_anger: {
    id: "esau_anger",
    name: "Esau's Anger",
    icon: "🏹",
    hp: 36,
    summary: "Esau burns with anger after Jacob receives Isaac's blessing.",
    narration:
      "Esau held a grudge against Jacob because of the blessing his father had given him. — Genesis 27:41",
    attacks: [
      { name: "Hunter's Strike", damage: 8, icon: "🏹" },
      {
        name: "Burning Grudge",
        damage: 7,
        icon: "🔥",
        effect: "recoil",
        description: "Takes 3 recoil damage",
      },
      {
        name: "Threat of Revenge",
        damage: 5,
        icon: "⚠️",
        effect: "discard",
        description: "Discard 1 card",
      },
    ],
  },

  joseph_betrayal: {
    id: "joseph_betrayal",
    name: "Joseph's Betrayal",
    icon: "🕳️",
    hp: 40,
    summary: "Joseph's brothers betray him and sell him into slavery.",
    narration:
      "They took him and threw him into the cistern. The cistern was empty; there was no water in it. — Genesis 37:24",
    attacks: [
      { name: "Cast into the Pit", damage: 8, icon: "🕳️" },
      {
        name: "Brotherly Jealousy",
        damage: 6,
        icon: "👥",
        effect: "discard",
        description: "Discard 1 card",
      },
      {
        name: "Sold Away",
        damage: 5,
        icon: "⛓️",
        effect: "random_card",
        description: "Forces a random card play",
      },
    ],
  },

  laban_deceit: {
    id: "laban_deceit",
    name: "Laban's Deceit",
    icon: "🐑",
    hp: 35,
    summary: "Laban repeatedly deceives Jacob during his years of service.",
    narration:
      "What is this you have done to me? I served you for Rachel, didn't I? Why have you deceived me? — Genesis 29:25",
    attacks: [
      { name: "Broken Promise", damage: 6, icon: "📜" },
      {
        name: "Changed Wages",
        damage: 5,
        icon: "🪙",
        effect: "drain",
        description: "Lose 1 Faith next turn",
      },
      {
        name: "Deception",
        damage: 4,
        icon: "🎭",
        effect: "random_card",
        description: "Forces a random card play",
      },
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
  "pride_babel",
  "corrupt_humanity",
  "nephilim",
  "sodom_corruption",
  "famine_canaan",
  "esau_anger",
  "joseph_betrayal",
  "laban_deceit",
];
export const BOSSES = ["the_flood", "babel_tower"];