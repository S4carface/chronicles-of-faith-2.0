// Genesis v1 Card Data — 30+ Biblical cards
// Each card: id, name, type, rarity, cost, value, effect, verse, icon, description

export const CARD_TYPES = {
  ATTACK: "attack",
  DEFENSE: "defense",
  SCRIPTURE: "scripture",
  MIRACLE: "miracle",
};

export const RARITIES = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  LEGENDARY: "legendary",
};

export const CARDS = [
  // ===== COMMON =====
  {
    id: "sling_stone",
    name: "Sling Stone",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 6,
    icon: "🪨",
    verse: "1 Samuel 17:40",
    scriptureText:
      "And he chose him five smooth stones out of the brook, and put them in a shepherd's bag which he had.",
    description: "David chose five smooth stones from the stream.",
  },
  {
    id: "faith_shield",
    name: "Faith Shield",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 5,
    icon: "🛡️",
    verse: "Ephesians 6:16",
    scriptureText:
      "Above all, taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked.",
    description: "Take up the shield of faith.",
  },
  {
    id: "prayer",
    name: "Prayer",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 4,
    icon: "🙏",
    verse: "1 Thessalonians 5:17",
    scriptureText: "Pray without ceasing.",
    description: "Pray without ceasing. Heal 4 HP.",
  },
  {
    id: "staff_moses",
    name: "Staff of Moses",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 5,
    icon: "🪄",
    verse: "Exodus 14:21",
    scriptureText:
      "And Moses stretched out his hand over the sea; and the Lord caused the sea to go back by a strong east wind.",
    description: "Moses stretched out his hand over the sea.",
  },
  {
    id: "bread_life",
    name: "Bread of Life",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 5,
    icon: "🍞",
    verse: "John 6:35",
    scriptureText:
      "And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger.",
    description: "I am the bread of life. Heal 5 HP.",
  },
  {
    id: "righteous_strike",
    name: "Righteous Strike",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.COMMON,
    cost: 2,
    value: 8,
    icon: "⚔️",
    verse: "Exodus 15:2",
    scriptureText:
      "The Lord is my strength and song, and he is become my salvation.",
    description: "The Lord is my strength.",
  },
  {
    id: "armor_god",
    name: "Armor of God",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.COMMON,
    cost: 2,
    value: 7,
    icon: "🛡️",
    verse: "Ephesians 6:11",
    scriptureText:
      "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
    description: "Put on the full armor of God.",
  },
  {
    id: "song_praise",
    name: "Song of Praise",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.UNCOMMON,
    cost: 0,
    value: 0,
    icon: "🎵",
    verse: "Psalm 96:1",
    scriptureText:
      "O sing unto the Lord a new song: sing unto the Lord, all the earth.",
    description: "Sing to the Lord a new song. Gain 2 Faith.",
  },
  {
    id: "stone_tablet",
    name: "Stone Tablet",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 4,
    icon: "📜",
    verse: "Hebrews 9:4",
    scriptureText:
      "And the tables of the covenant.",
    description: "The tablets of the covenant.",
  },
  {
    id: "wisdom",
    name: "Wisdom",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.UNCOMMON,
    cost: 1,
    value: 0,
    icon: "🦉",
    verse: "James 1:5",
    scriptureText:
      "If any of you lack wisdom, let him ask of God, that giveth to all men liberally.",
    description: "If you lack wisdom, ask God. Draw 2 cards.",
  },
  {
    id: "doves_peace",
    name: "Dove's Peace",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.UNCOMMON,
    cost: 1,
    value: 3,
    icon: "🕊️",
    verse: "Genesis 8:11",
    scriptureText:
      "And the dove came in to him in the evening; and, lo, in her mouth was an olive leaf pluckt off.",
    description: "The dove came back. Heal 3, draw 1.",
  },
  {
    id: "rainbow_covenant",
    name: "Rainbow Covenant",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.COMMON,
    cost: 1,
    value: 5,
    icon: "🌈",
    verse: "Genesis 9:13",
    scriptureText:
      "I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.",
    description: "I set my rainbow in the clouds.",
  },
  {
    id: "fig_leaf",
    name: "Fig Leaf",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.COMMON,
    cost: 0,
    value: 3,
    icon: "🌿",
    verse: "Genesis 3:7",
    scriptureText:
      "And they sewed fig leaves together, and made themselves aprons.",
    description: "They sewed fig leaves together.",
  },
  {
    id: "rams_horn",
    name: "Ram's Horn",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.UNCOMMON,
    cost: 2,
    value: 9,
    icon: "📯",
    verse: "Genesis 22:13",
    scriptureText:
      "And behold behind him a ram caught in a thicket by his horns.",
    description: "Abraham saw a ram caught in the thicket.",
  },
  {
    id: "living_water",
    name: "Living Water",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.UNCOMMON,
    cost: 1,
    value: 6,
    icon: "💧",
    verse: "John 4:10",
    scriptureText:
      "If thou knewest the gift of God, and who it is that saith to thee, Give me to drink; thou wouldest have asked of him.",
    description: "Living water. Heal 6 HP.",
  },

  // ===== RARE =====
  {
    id: "sling_david",
    name: "Sling of David",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 12,
    icon: "🎯",
    verse: "1 Samuel 17:50",
    scriptureText:
      "So David prevailed over the Philistine with a sling and with a stone.",
    description: "David prevailed over Goliath. Combo: x2 with Righteous Aim.",
  },
  {
    id: "righteous_aim",
    name: "Righteous Aim",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.RARE,
    cost: 1,
    value: 0,
    icon: "✝️",
    verse: "1 Samuel 17:47",
    scriptureText:
      "For the battle is the Lord's, and he will give you into our hands.",
    description: "The battle is the Lord's. Next attack deals double.",
  },
  {
    id: "parting_waters",
    name: "Parting Waters",
    type: CARD_TYPES.MIRACLE,
    rarity: RARITIES.RARE,
    cost: 3,
    value: 15,
    icon: "🌊",
    verse: "Exodus 14:21",
    scriptureText:
      "And the Lord caused the sea to go back by a strong east wind all that night.",
    description: "The waters were divided.",
  },
  {
    id: "manna_heaven",
    name: "Manna from Heaven",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 10,
    icon: "🌾",
    verse: "Exodus 16:4",
    scriptureText:
      "Then said the Lord unto Moses, Behold, I will rain bread from heaven for you.",
    description: "Bread from heaven. Heal 10, draw 2.",
  },
  {
    id: "pillar_fire",
    name: "Pillar of Fire",
    type: CARD_TYPES.ATTACK,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 14,
    icon: "🔥",
    verse: "Exodus 13:21",
    scriptureText:
      "And by night in a pillar of fire, to give them light; to go by day and night.",
    description: "By night in a pillar of fire.",
  },
  {
    id: "ark_covenant",
    name: "Ark of the Covenant",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 15,
    icon: "📦",
    verse: "Joshua 3:3",
    scriptureText:
      "When ye see the ark of the covenant of the Lord your God, and the priests the Levites bearing it.",
    description: "The ark of the covenant of the Lord.",
  },
  {
    id: "coat_colors",
    name: "Coat of Many Colors",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.RARE,
    cost: 1,
    value: 0,
    icon: "🧥",
    verse: "Genesis 37:3",
    scriptureText:
      "Now Israel loved Joseph more than all his children, and he made him a coat of many colours.",
    description: "Gain 3 Faith energy.",
  },
  {
    id: "jacobs_ladder",
    name: "Jacob's Ladder",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.RARE,
    cost: 1,
    value: 0,
    icon: "🪜",
    verse: "Genesis 28:12",
    scriptureText:
      "And behold a ladder set up on the earth, and the top of it reached to heaven.",
    description: "Draw 3 cards from your deck.",
  },
  {
    id: "lions_den",
    name: "Lion's Den",
    type: CARD_TYPES.DEFENSE,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 12,
    icon: "🦁",
    verse: "Daniel 6:16",
    scriptureText:
      "Then the king commanded, and they brought Daniel, and cast him into the den of lions.",
    description: "Block 12 and reflect 4 damage.",
  },
  {
    id: "burning_bush",
    name: "Burning Bush",
    type: CARD_TYPES.SCRIPTURE,
    rarity: RARITIES.RARE,
    cost: 2,
    value: 5,
    icon: "🌿🔥",
    verse: "Exodus 3:2",
    scriptureText:
      "And the bush burned with fire, and the bush was not consumed.",
    description: "Deal 5, heal 5. The bush burned with fire.",
  },

  // ===== LEGENDARY =====
  {
    id: "angel_lord",
    name: "Angel of the Lord",
    type: CARD_TYPES.MIRACLE,
    rarity: RARITIES.LEGENDARY,
    cost: 3,
    value: 20,
    icon: "👼",
    verse: "Exodus 3:2",
    scriptureText:
      "And the angel of the Lord appeared unto him in a flame of fire out of the midst of a bush.",
    description: "Deal 20 damage and heal 10 HP.",
  },
  {
    id: "creation_light",
    name: "Creation's Light",
    type: CARD_TYPES.MIRACLE,
    rarity: RARITIES.LEGENDARY,
    cost: 4,
    value: 25,
    icon: "☀️",
    verse: "Genesis 1:3",
    scriptureText:
      "And God said, Let there be light: and there was light.",
    description: "Let there be light. Devastating holy damage.",
  },
  {
    id: "the_flood",
    name: "The Great Flood",
    type: CARD_TYPES.MIRACLE,
    rarity: RARITIES.LEGENDARY,
    cost: 3,
    value: 18,
    icon: "🌧️",
    verse: "Genesis 7:11",
    scriptureText:
      "The same day were all the fountains of the great deep broken up, and the windows of heaven were opened.",
    description: "The floodgates of heaven opened.",
  },
  {
    id: "voice_god",
    name: "Voice of God",
    type: CARD_TYPES.MIRACLE,
    rarity: RARITIES.LEGENDARY,
    cost: 4,
    value: 30,
    icon: "✨",
    verse: "Genesis 1:26",
    scriptureText:
      "And God said, Let us make man in our image, after our likeness.",
    description: "Let us make man in our image. Ultimate power.",
  },
];

export const CARD_MAP = Object.fromEntries(CARDS.map(c => [c.id, c]));

export function getCardById(id) {
  return CARD_MAP[id];
}

export const STARTER_DECK_ADAM = [
  "sling_stone", "sling_stone", "faith_shield", "faith_shield",
  "prayer", "prayer", "righteous_strike", "bread_life",
  "song_praise", "fig_leaf",
];

export const STARTER_DECK_NOAH = [
  "sling_stone", "sling_stone", "faith_shield", "faith_shield",
  "rainbow_covenant", "prayer", "bread_life",
  "doves_peace", "righteous_strike", "rams_horn",
];