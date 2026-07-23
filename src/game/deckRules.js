import { CARDS, getCardById } from "@/data/cards";

export const DECK_SIZE = 10;
export const RUN_DECK_MAX = 15;

export const MAX_COPIES = {
  common: 2,
  uncommon: 2,
  rare: 1,
  legendary: 1,
};

export const DECK_LIMITS = {
  attack: 4,
  defense: 4,
  healing: 3,
};

export const HEALING_CARD_IDS = new Set([
  "prayer", "bread_life", "living_water", "doves_peace",
  "manna_heaven", "burning_bush", "angel_lord",
]);

export const REWARD_ODDS = {
  normal: {
    common: 0.68,
    uncommon: 0.25,
    rare: 0.07,
    legendary: 0,
  },

  treasure: {
    common: 0.48,
    uncommon: 0.35,
    rare: 0.16,
    legendary: 0.01,
  },

  boss: {
    common: 0.25,
    uncommon: 0.40,
    rare: 0.30,
    legendary: 0.05,
  },

  daily: {
    common: 0.65,
    uncommon: 0.30,
    rare: 0.05,
    legendary: 0,
  },
};

// First-run reward gating (before the player's first Genesis completion).
// Random Legendary drops are removed and Rare chance is modestly reduced for the
// two random room types so a brand-new player can't receive end-game power in
// run 1. Boss rewards keep their intended first-clear rules and are not gated.
export const FIRST_RUN_REWARD_ODDS = {
  normal: { common: 0.72, uncommon: 0.24, rare: 0.04, legendary: 0 },
  treasure: { common: 0.56, uncommon: 0.35, rare: 0.09, legendary: 0 },
};

// Deterministic Rare granted by Abraham's Test before Genesis is completed once.
// After the first completion the story may restore its Legendary reward.
export const ABRAHAM_FIRST_RUN_REWARD = "ark_covenant"; // Rare — God's provision
export const ABRAHAM_COMPLETED_REWARD = "angel_lord"; // Legendary

// Resolve which card Abraham's Test grants. Legendary is only eligible once the
// player has completed Genesis at least once; otherwise a fixed Rare is granted.
export function getAbrahamsTestReward(genesisCompleted) {
  return genesisCompleted ? ABRAHAM_COMPLETED_REWARD : ABRAHAM_FIRST_RUN_REWARD;
}

// Gold bonus when claiming a duplicate reward card
export const DUPLICATE_GOLD_BONUS = {
  common: 5,
  uncommon: 10,
  rare: 15,
  legendary: 40,
};

export const STARTER_DECK = [
  "sling_stone", "sling_stone",
  "prayer", "prayer",
  "faith_shield", "faith_shield",
  "fig_leaf",
  "bread_life",
  "righteous_strike", "righteous_strike",
];

export const STARTER_COLLECTION = STARTER_DECK.reduce((acc, id) => {
  acc[id] = (acc[id] || 0) + 1;
  return acc;
}, {});

export function getMaxCopies(rarity) {
  return MAX_COPIES[rarity] || 1;
}

export function isHealingCard(cardId) {
  return HEALING_CARD_IDS.has(cardId);
}

export function getDeckStats(deck) {
  let attack = 0, defense = 0, scripture = 0, healing = 0;
  for (const id of deck) {
    const card = getCardById(id);
    if (!card) continue;
    if (card.type === "attack") attack++;
    if (card.type === "defense") defense++;
    if (card.type === "scripture" || card.type === "miracle") scripture++;
    if (isHealingCard(id)) healing++;
  }
  return { attack, defense, scripture, healing, total: deck.length };
}

export function validateDeck(deck) {
  const errors = [];
  const stats = getDeckStats(deck || []);

  if (!deck || deck.length !== DECK_SIZE) {
    errors.push(`Deck needs exactly ${DECK_SIZE} cards (currently ${deck ? deck.length : 0}).`);
  }
  if (stats.attack > DECK_LIMITS.attack) {
    errors.push(`Too many attack cards (${stats.attack}/${DECK_LIMITS.attack} max).`);
  }
  if (stats.defense > DECK_LIMITS.defense) {
    errors.push(`Too many defense cards (${stats.defense}/${DECK_LIMITS.defense} max).`);
  }
  if (stats.healing > DECK_LIMITS.healing) {
    errors.push(`Too many healing cards (${stats.healing}/${DECK_LIMITS.healing} max).`);
  }
  if (stats.attack < 1) {
    errors.push("At least 1 attack card required.");
  }
  if (stats.defense < 1) {
    errors.push("At least 1 defense card required.");
  }
  if (stats.scripture < 1) {
    errors.push("At least 1 scripture/support card required.");
  }
  return { valid: errors.length === 0, errors, stats };
}

export function canAddToDeck(cardId, deck, collection) {
  const card = getCardById(cardId);
  if (!card) return { canAdd: false, reason: "Invalid card." };
  if (!deck || deck.length >= DECK_SIZE) {
    return { canAdd: false, reason: "Deck is full." };
  }
  const copies = deck.filter(id => id === cardId).length;
  const maxCopies = getMaxCopies(card.rarity);
  if (copies >= maxCopies) {
    const rarityLabel = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);
    return { canAdd: false, reason: `${rarityLabel} limit reached: max ${maxCopies} cop${maxCopies > 1 ? 'ies' : 'y'}.` };
  }
  const stats = getDeckStats(deck);
  if (card.type === "attack" && stats.attack >= DECK_LIMITS.attack) {
    return { canAdd: false, reason: `Attack limit reached: max ${DECK_LIMITS.attack}.` };
  }
  if (card.type === "defense" && stats.defense >= DECK_LIMITS.defense) {
    return { canAdd: false, reason: `Defense limit reached: max ${DECK_LIMITS.defense}.` };
  }
  if (isHealingCard(cardId) && stats.healing >= DECK_LIMITS.healing) {
    return { canAdd: false, reason: `Healing limit reached: max ${DECK_LIMITS.healing}.` };
  }
  return { canAdd: true, reason: null };
}

/**
 * Resolve the rarity odds for a reward roll, applying first-run gating.
 * `firstRun` (player has not yet completed Genesis) removes random Legendary
 * drops and lowers Rare chance for normal/treasure rooms; boss keeps its odds.
 */
export function resolveRewardOdds(roomType, { firstRun = false } = {}) {
  const base = REWARD_ODDS[roomType] || REWARD_ODDS.normal;
  if (firstRun && FIRST_RUN_REWARD_ODDS[roomType]) {
    return FIRST_RUN_REWARD_ODDS[roomType];
  }
  return base;
}

/**
 * Cards eligible for a given reward tier. Epic no longer rides along with the
 * Rare tier: until an explicit Epic milestone/boss reward is approved, Epic
 * cards (e.g. Righteous Aim) have no reward path and can only be obtained by
 * a player who already owns one from before this change.
 */
export function cardsOfTier(tier) {
  return CARDS.filter(c => c.rarity === tier);
}

// Rank order used to clamp a rolled rarity down to a reward source's cap.
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

/**
 * Maximum rarity a random reward roll may produce, based on campaign
 * difficulty and room type. This is the early-progression rarity brake:
 * Easy (first completion or repeat) never grants above Rare, and ordinary
 * Normal rewards (anything but the boss/final room) never grant above Rare.
 * Normal boss/milestone rewards and Hard keep their existing odds — Epic has
 * no approved reward path anywhere yet (see cardsOfTier), and Mythic has no
 * reward path at all, so neither can exceed this cap regardless.
 * `difficulty` defaults to the uncapped behavior when omitted, so existing
 * callers that don't pass it are unaffected.
 */
export function resolveMaxRewardRarity(difficulty, roomType) {
  if (difficulty === "easy") return "rare";
  if (difficulty === "normal" && roomType !== "boss") return "rare";
  return "legendary";
}

function clampRarity(rarity, cap) {
  return RARITY_RANK[rarity] > RARITY_RANK[cap] ? cap : rarity;
}

/**
 * Generate 3 reward card IDs based on room type drop rates.
 * Never more than 1 legendary in a single reward set.
 *
 * options.rareOrBetter — every card is guaranteed Rare or better (used by the
 *   Babel "nextCardRare" reward). Legendary only appears if the resolved odds
 *   still allow it (e.g. not during a gated first run or above the difficulty cap).
 * options.firstRun — apply first-run gating (no random Legendary, lower Rare).
 * options.difficulty — clamp the result to resolveMaxRewardRarity's cap for
 *   this difficulty/roomType (see there for the early-progression rarity brake).
 */
export function generateRewardCards(rng, roomType, options = {}) {
  const { rareOrBetter = false, firstRun = false, difficulty } = options;
  const odds = resolveRewardOdds(roomType, { firstRun });
  const cap = resolveMaxRewardRarity(difficulty, roomType);
  const results = [];
  let legendaryUsed = false;
  const used = new Set();

  for (let i = 0; i < 3; i++) {
    const roll = rng();
    let rarity;
    if (rareOrBetter) {
      // Guaranteed Rare or better: Legendary only when odds permit, else Rare.
      if (!legendaryUsed && odds.legendary > 0 && roll < odds.legendary) {
        rarity = "legendary";
        legendaryUsed = true;
      } else {
        rarity = "rare";
      }
    } else if (!legendaryUsed && roll < odds.legendary) {
      rarity = "legendary";
      legendaryUsed = true;
    } else if (roll < odds.legendary + odds.rare) {
      rarity = "rare";
    } else if (roll < odds.legendary + odds.rare + odds.uncommon) {
      rarity = "uncommon";
    } else {
      rarity = "common";
    }

    rarity = clampRarity(rarity, cap);

    let pool = cardsOfTier(rarity).filter(c => !used.has(c.id));
    if (pool.length === 0) {
      pool = cardsOfTier(rarity);
    }
    if (pool.length === 0) continue;

    const card = pool[Math.floor(rng() * pool.length)];
    used.add(card.id);
    results.push(card.id);
  }
  return results;
}

/**
 * Generate a single treasure reward card ID.
 * Honors rareOrBetter (nextCardRare), firstRun gating, and the difficulty
 * rarity cap (see resolveMaxRewardRarity), like generateRewardCards.
 */
export function generateTreasureCard(rng, options = {}) {
  const { rareOrBetter = false, firstRun = false, difficulty } = options;
  const odds = resolveRewardOdds("treasure", { firstRun });
  const cap = resolveMaxRewardRarity(difficulty, "treasure");
  const roll = rng();
  let rarity;
  if (rareOrBetter) {
    rarity = (odds.legendary > 0 && roll < odds.legendary) ? "legendary" : "rare";
  } else if (roll < odds.legendary) {
    rarity = "legendary";
  } else if (roll < odds.legendary + odds.rare) {
    rarity = "rare";
  } else if (roll < odds.legendary + odds.rare + odds.uncommon) {
    rarity = "uncommon";
  } else {
    rarity = "common";
  }
  rarity = clampRarity(rarity, cap);
  const pool = cardsOfTier(rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)].id;
}

/**
 * Generate a guaranteed rare card for first Genesis completion.
 * Never returns a legendary — only strong rares.
 */
export function generateFirstCompletionReward(rng) {
  const rarePool = CARDS.filter(c => c.rarity === "rare");
  if (rarePool.length === 0) return null;
  return rarePool[Math.floor(rng() * rarePool.length)].id;
}