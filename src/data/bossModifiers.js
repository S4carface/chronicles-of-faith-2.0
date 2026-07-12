// Universal Genesis boss modifiers.
// These can apply to The Great Flood, Sodom & Gomorrah, or Tower of Babel.

export const BOSS_MODIFIERS = {
  divine_confusion: {
    id: "divine_confusion",
    name: "Divine Confusion",
    icon: "🗣️",
    description: "Disruption interferes with your Scripture cards.",
    hpBonus: 5,
    startBlock: 0,
    extraAttacks: [
      {
        name: "Confounding Voice",
        damage: 5,
        icon: "🗣️",
        effect: "block_scripture",
        description: "No Scripture cards next turn",
      },
      {
        name: "Disrupted Faith",
        damage: 4,
        icon: "😵‍💫",
        effect: "block_scripture",
        description: "No Scripture cards next turn",
      },
    ],
  },

  fortified_judgment: {
    id: "fortified_judgment",
    name: "Fortified Judgment",
    icon: "🛡️",
    description: "The boss begins protected and gains stronger defenses.",
    hpBonus: 12,
    startBlock: 8,
    extraAttacks: [
      {
        name: "Rising Defense",
        damage: 0,
        icon: "🛡️",
        effect: "block",
        blockValue: 12,
        description: "Gains 12 Block",
      },
      {
        name: "Unyielding Barrier",
        damage: 0,
        icon: "🏰",
        effect: "block",
        blockValue: 10,
        description: "Gains 10 Block",
      },
    ],
  },

  spreading_chaos: {
    id: "spreading_chaos",
    name: "Spreading Chaos",
    icon: "🌪️",
    description: "Chaos disrupts your hand and weakens your next turn.",
    hpBonus: 5,
    startBlock: 0,
    extraAttacks: [
      {
        name: "Scattered Thoughts",
        damage: 6,
        icon: "🌪️",
        effect: "skip_draw",
        description: "Draw 1 fewer card next turn",
      },
      {
        name: "Disrupted Plans",
        damage: 5,
        icon: "💬",
        effect: "skip_draw",
        description: "Draw 1 fewer card next turn",
      },
      {
        name: "Lingering Judgment",
        damage: 4,
        icon: "☠️",
        effect: "dot",
        description: "2 damage per turn for 3 turns",
      },
    ],
  },
};

export const BOSS_MODIFIER_IDS = Object.keys(BOSS_MODIFIERS);

export function applyBossModifier(enemy, modifierId) {
  const mod = BOSS_MODIFIERS[modifierId];

  if (!mod) return enemy;

  return {
    ...enemy,
    hp: enemy.hp + (mod.hpBonus || 0),
    attacks: [...enemy.attacks, ...(mod.extraAttacks || [])],
    bossModifier: mod,
    startBlock: mod.startBlock || 0,
  };
}