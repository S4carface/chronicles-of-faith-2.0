import { CARDS, getCardById } from "@/data/cards";

export const DECK_SIZE = 10;
export const RUN_DECK_MAX = 15;

export const MAX_COPIES = {
  common: 2,
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
  normal: { common: 0.88, rare: 0.12, legendary: 0 },
  treasure: { common: 0.72, rare: 0.27, legendary: 0.01 },
  boss: { common: 0.50, rare: 0.45, legendary: 0.05 },
  daily: { common: 0.82, rare: 0.18, legendary: 0 },
};

// Gold bonus when claiming a duplicate reward card
export const DUPLICATE_GOLD_BONUS = {
  common: 5,
  rare: 15,
  legendary: 40,
};

export const STARTER_DECK = [
  "sling_stone", "sling_stone",
  "prayer", "prayer",
  "faith_shield", "faith_shield",
  "fig_leaf",
  "bread_life",
  "song_praise",
  "righteous_strike",
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
 * Generate 3 reward card IDs based on room type drop rates.
 * Never more than 1 legendary in a single reward set.
 */
export function generateRewardCards(rng, roomType) {
  const odds = REWARD_ODDS[roomType] || REWARD_ODDS.normal;
  const results = [];
  let legendaryUsed = false;
  const used = new Set();

  for (let i = 0; i < 3; i++) {
    const roll = rng();
    let rarity;
    if (!legendaryUsed && roll < odds.legendary) {
      rarity = "legendary";
      legendaryUsed = true;
    } else if (roll < odds.legendary + odds.rare) {
      rarity = "rare";
    } else {
      rarity = "common";
    }

    let pool = CARDS.filter(c => c.rarity === rarity && !used.has(c.id));
    if (pool.length === 0) {
      pool = CARDS.filter(c => c.rarity === rarity);
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
 */
export function generateTreasureCard(rng) {
  const odds = REWARD_ODDS.treasure;
  const roll = rng();
  let rarity;
  if (roll < odds.legendary) {
    rarity = "legendary";
  } else if (roll < odds.legendary + odds.rare) {
    rarity = "rare";
  } else {
    rarity = "common";
  }
  const pool = CARDS.filter(c => c.rarity === rarity);
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