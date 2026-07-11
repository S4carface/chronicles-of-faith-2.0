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
  // ===== COMMON (Silver) =====
  { id: "sling_stone", name: "Sling Stone", type: CARD_TYPES.ATTACK, rarity: RARITIES.COMMON, cost: 1, value: 6, icon: "🪨", verse: "1 Samuel 17:40", description: "David chose five smooth stones from the stream." },
  {   id: "faith_shield",   name: "Faith Shield",   type: CARD_TYPES.DEFENSE,   rarity: RARITIES.COMMON,   cost: 1,   value: 5,   icon: "🛡️",   verse: "Ephesians 6:16",   scriptureText:     "Take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one.",   description: "Take up the shield of faith.", },
  {   id: "prayer",   name: "Prayer",   type: CARD_TYPES.SCRIPTURE,   rarity: RARITIES.COMMON,   cost: 1,   value: 4,   icon: "🙏",   verse: "1 Thessalonians 5:17",   scriptureText: "Pray without ceasing.",   description: "Pray without ceasing. Heal 4 HP.", },
  { id: "staff_moses", name: "Staff of Moses", type: CARD_TYPES.ATTACK, rarity: RARITIES.COMMON, cost: 1, value: 5, icon: "🪄", verse: "Exodus 14:21", description: "Moses stretched out his hand over the sea." },
  {   id: "bread_life",   name: "Bread of Life",   type: CARD_TYPES.SCRIPTURE,   rarity: RARITIES.COMMON,   cost: 1,   value: 5,   icon: "🍞",   verse: "John 6:35",   scriptureText:     "I am the bread of life. Whoever comes to me will never go hungry, and whoever believes in me will never be thirsty.",   description: "I am the bread of life. Heal 5 HP.", },
  {   id: "righteous_strike",   name: "Righteous Strike",   type: CARD_TYPES.ATTACK,   rarity: RARITIES.COMMON,   cost: 2,   value: 8,   icon: "⚔️",   verse: "Exodus 15:2",   scriptureText:     "The Lord is my strength and my defense; he has become my salvation.",   description: "The Lord is my strength.", },
  { id: "armor_god", name: "Armor of God", type: CARD_TYPES.DEFENSE, rarity: RARITIES.COMMON, cost: 2, value: 7, icon: "🛡️", verse: "Ephesians 6:11", description: "Put on the full armor of God." },
  { id: "song_praise", name: "Song of Praise", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.UNCOMMON, cost: 0, value: 0, icon: "🎵", verse: "Psalm 96:1", description: "Sing to the Lord a new song. Gain 2 Faith." },
  { id: "stone_tablet", name: "Stone Tablet", type: CARD_TYPES.DEFENSE, rarity: RARITIES.COMMON, cost: 1, value: 4, icon: "📜", verse: "Hebrews 9:4", description: "The tablets of the covenant." },
  { id: "wisdom", name: "Wisdom", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.UNCOMMON, cost: 1, value: 0, icon: "🦉", verse: "James 1:5", description: "If you lack wisdom, ask God. Draw 2 cards." },
  { id: "doves_peace", name: "Dove's Peace", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.UNCOMMON, cost: 1, value: 3, icon: "🕊️", verse: "Genesis 8:11", description: "The dove came back. Heal 3, draw 1." },
  { id: "rainbow_covenant", name: "Rainbow Covenant", type: CARD_TYPES.DEFENSE, rarity: RARITIES.COMMON, cost: 1, value: 5, icon: "🌈", verse: "Genesis 9:13", description: "I set my rainbow in the clouds." },
  {   id: "fig_leaf",   name: "Fig Leaf",   type: CARD_TYPES.DEFENSE,   rarity: RARITIES.COMMON,   cost: 0,   value: 3,   icon: "🌿",   verse: "Genesis 3:7",   scriptureText:     "Then the eyes of both of them were opened, and they realized they were naked; so they sewed fig leaves together and made coverings for themselves.",   description: "They sewed fig leaves together.", },
  { id: "rams_horn", name: "Ram's Horn", type: CARD_TYPES.ATTACK, rarity: RARITIES.UNCOMMON, cost: 2, value: 9, icon: "📯", verse: "Genesis 22:13", description: "Abraham saw a ram caught in the thicket." },
  { id: "living_water", name: "Living Water", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.UNCOMMON, cost: 1, value: 6, icon: "💧", verse: "John 4:10", description: "Living water. Heal 6 HP." },

  // ===== UNCOMMON (Violet) =====
  // Song of Praise, Wisdom, Dove's Peace, Ram's Horn, and Living Water are above.

  // ===== RARE (Emerald) =====
  { id: "sling_david", name: "Sling of David", type: CARD_TYPES.ATTACK, rarity: RARITIES.RARE, cost: 2, value: 12, icon: "🎯", verse: "1 Samuel 17:50", description: "David prevailed over Goliath. Combo: x2 with Righteous Aim." },
  { id: "righteous_aim", name: "Righteous Aim", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.RARE, cost: 1, value: 0, icon: "✝️", verse: "1 Samuel 17:47", description: "The battle is the Lord's. Next attack deals double." },
  { id: "parting_waters", name: "Parting Waters", type: CARD_TYPES.MIRACLE, rarity: RARITIES.RARE, cost: 3, value: 15, icon: "🌊", verse: "Exodus 14:21", description: "The waters were divided." },
  { id: "manna_heaven", name: "Manna from Heaven", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.RARE, cost: 2, value: 10, icon: "🌾", verse: "Exodus 16:4", description: "Bread from heaven. Heal 10, draw 2." },
  { id: "pillar_fire", name: "Pillar of Fire", type: CARD_TYPES.ATTACK, rarity: RARITIES.RARE, cost: 2, value: 14, icon: "🔥", verse: "Exodus 13:21", description: "By night in a pillar of fire." },
  { id: "ark_covenant", name: "Ark of the Covenant", type: CARD_TYPES.DEFENSE, rarity: RARITIES.RARE, cost: 2, value: 15, icon: "📦", verse: "Joshua 3:3", description: "The ark of the covenant of the Lord." },
  { id: "coat_colors", name: "Coat of Many Colors", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.RARE, cost: 1, value: 0, icon: "🧥", verse: "Genesis 37:3", description: "Gain 3 Faith energy." },
  { id: "jacobs_ladder", name: "Jacob's Ladder", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.RARE, cost: 1, value: 0, icon: "🪜", verse: "Genesis 28:12", description: "Draw 3 cards from your deck." },
  { id: "lions_den", name: "Lion's Den", type: CARD_TYPES.DEFENSE, rarity: RARITIES.RARE, cost: 2, value: 12, icon: "🦁", verse: "Daniel 6:16", description: "Block 12 and reflect 4 damage." },
  { id: "burning_bush", name: "Burning Bush", type: CARD_TYPES.SCRIPTURE, rarity: RARITIES.RARE, cost: 2, value: 5, icon: "🌿🔥", verse: "Exodus 3:2", description: "Deal 5, heal 5. The bush burned with fire." },

  // ===== LEGENDARY (Divine Glow) =====
  { id: "angel_lord", name: "Angel of the Lord", type: CARD_TYPES.MIRACLE, rarity: RARITIES.LEGENDARY, cost: 3, value: 20, icon: "👼", verse: "Exodus 3:2", description: "Deal 20 damage and heal 10 HP." },
  { id: "creation_light", name: "Creation's Light", type: CARD_TYPES.MIRACLE, rarity: RARITIES.LEGENDARY, cost: 4, value: 25, icon: "☀️", verse: "Genesis 1:3", description: "Let there be light. Devastating holy damage." },
  { id: "the_flood", name: "The Great Flood", type: CARD_TYPES.MIRACLE, rarity: RARITIES.LEGENDARY, cost: 3, value: 18, icon: "🌧️", verse: "Genesis 7:11", description: "The floodgates of heaven opened." },
  { id: "voice_god", name: "Voice of God", type: CARD_TYPES.MIRACLE, rarity: RARITIES.LEGENDARY, cost: 4, value: 30, icon: "✨", verse: "Genesis 1:26", description: "Let us make man in our image. Ultimate power." },
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