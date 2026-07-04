// Boss modifiers for the final Genesis boss (Tower of Babel).
// Each modifier changes the boss's attack patterns, HP, and defenses
// to provide run-to-run variation without changing the boss identity.
// Effects used: block, block_scripture, skip_draw, dot — all already
// processed by the battle engine's enemy turn logic.

export const BOSS_MODIFIERS = {
  prideful_tongues: {
    id: "prideful_tongues",
    name: "Prideful Tongues",
    icon: "🗣️",
    description: "Confused languages disrupt your strategy.",
    hpBonus: 5,
    startBlock: 0,
    extraAttacks: [
      { name: "Babbling Tongues", damage: 5, icon: "🗣️", effect: "block_scripture", description: "No scripture cards next turn" },
      { name: "Confounding Speech", damage: 4, icon: "😵‍💫", effect: "block_scripture", description: "No scripture cards next turn" },
    ],
  },
  tower_of_ambition: {
    id: "tower_of_ambition",
    name: "Tower of Ambition",
    icon: "🧱",
    description: "Fortified walls and stronger shields.",
    hpBonus: 12,
    startBlock: 8,
    extraAttacks: [
      { name: "Fortified Walls", damage: 0, icon: "🧱", effect: "block", blockValue: 12, description: "Gains 12 Block" },
      { name: "Proud Bastion", damage: 0, icon: "🏰", effect: "block", blockValue: 10, description: "Gains 10 Block" },
    ],
  },
  scattered_nations: {
    id: "scattered_nations",
    name: "Scattered Nations",
    icon: "🌪️",
    description: "Scattered peoples disrupt your hand.",
    hpBonus: 5,
    startBlock: 0,
    extraAttacks: [
      { name: "Scatter to the Winds", damage: 6, icon: "🌪️", effect: "skip_draw", description: "Draw 1 fewer card next turn" },
      { name: "Divided Tongues", damage: 5, icon: "💬", effect: "skip_draw", description: "Draw 1 fewer card next turn" },
      { name: "Wandering Curse", damage: 4, icon: "☠️", effect: "dot", description: "2 damage per turn for 3 turns" },
    ],
  },
};

export const BOSS_MODIFIER_IDS = Object.keys(BOSS_MODIFIERS);

/**
 * Apply a boss modifier to an enemy object, returning a new modified enemy.
 * Does not mutate the original enemy definition.
 */
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