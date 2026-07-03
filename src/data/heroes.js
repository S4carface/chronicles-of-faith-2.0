export const HEROES = [
  {
    id: "adam",
    name: "Adam",
    title: "The First Man",
    icon: "👨",
    description: "Created in God's image, Adam walks with courage and balance. A sturdy all-round hero.",
    ability: "First Born — Start with 35 HP.",
    maxHp: 35,
    starterDeck: [
      "sling_stone", "sling_stone", "faith_shield", "faith_shield",
      "prayer", "prayer", "righteous_strike", "bread_life",
      "song_praise", "fig_leaf",
    ],
    unlocked: true,
  },
  {
    id: "noah",
    name: "Noah",
    title: "Builder of the Ark",
    icon: "🧓",
    description: "Righteous among his generation, Noah stands firm with unshakeable faith and a righteous strike.",
    ability: "Covenant Shield — Once per battle, negate ALL incoming damage for one turn.",
    maxHp: 40,
    starterDeck: [
      "sling_stone", "sling_stone", "faith_shield", "faith_shield",
      "rainbow_covenant", "prayer", "bread_life",
      "doves_peace", "righteous_strike", "rams_horn",
    ],
    unlocked: false,
  },
];

export const HERO_MAP = Object.fromEntries(HEROES.map(h => [h.id, h]));

export function getHeroById(id) {
  return HERO_MAP[id];
}