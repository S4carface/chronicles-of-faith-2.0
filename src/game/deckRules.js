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

// Card Fragments — Phase 1 foundation (storage + duplicate conversion only;
// no crafting, spending, or Faith Shards yet). A duplicate-card grant converts
// into Fragments for that exact card once the player already owns the actual
// usable limit for it (getMaxCopies — the same cap deck-building enforces),
// instead of adding a copy the collection can never use.
export const DUPLICATE_FRAGMENT_AMOUNTS = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 20,
  legendary: 35,
};

export function getDuplicateFragmentAmount(card) {
  if (!card) return 0;
  return DUPLICATE_FRAGMENT_AMOUNTS[card.rarity] || 0;
}

// Card-specific Fragment balance. Defaults safely to 0 for a missing profile,
// a missing/malformed cardFragments map, or an unrecognized cardId.
export function getCardFragmentBalance(profile, cardId) {
  const value = profile?.cardFragments?.[cardId];
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

// Pure reducer — returns a new cardFragments map with `amount` added to
// cardId's balance (floored, never negative). Does not mutate profile; the
// caller merges the result into profile state.
export function addCardFragments(profile, cardId, amount) {
  const current = getCardFragmentBalance(profile, cardId);
  const delta = Number.isFinite(amount) ? amount : 0;
  const next = Math.max(0, Math.floor(current + delta));
  return { ...(profile?.cardFragments || {}), [cardId]: next };
}

/**
 * Canonical card-grant decision — the single place every complete-card
 * reward source should route through. Returns:
 *   { type: "card", cardId }                 — grant a complete card as usual
 *   { type: "fragments", cardId, amount }     — convert into Card Fragments instead
 * Converts once the player already owns getMaxCopies(card.rarity) copies —
 * the first copy, and a second copy for common/uncommon, are still granted
 * normally, matching the game's existing per-rarity copy limits.
 */
export function grantCardOrFragments(profile, cardId) {
  const card = getCardById(cardId);
  if (!card) return { type: "card", cardId };
  const owned = (profile?.cardCollection || {})[cardId] || 0;
  if (owned < getMaxCopies(card.rarity)) {
    return { type: "card", cardId };
  }
  return { type: "fragments", cardId, amount: getDuplicateFragmentAmount(card) };
}

// Whether a duplicate-card grant should still receive the legacy small Gold
// bonus. An allowed duplicate copy (still under the ownership limit, e.g. the
// 2nd Common/Uncommon copy) keeps it; a grant that converted into Card
// Fragments (already at the ownership limit) does not — Fragments are the
// sole reward for that duplicate, never Gold plus Fragments together.
export function shouldAwardDuplicateGoldBonus(alreadyOwnedBefore, grantResult) {
  return alreadyOwnedBefore === true && grantResult?.type !== "fragments";
}

// Card Fragments Phase 2 — crafting. Costs are fixed per rarity; only
// Common/Uncommon/Rare are craftable. Epic/Legendary/Mythic have no crafting
// path — they await a future Faith Shards system (see CollectionTab.jsx).
export const CARD_CRAFT_COSTS = {
  common: { fragments: 20, gold: 50 },
  uncommon: { fragments: 40, gold: 150 },
  rare: { fragments: 80, gold: 400 },
};

export function getCardCraftCost(card) {
  if (!card) return null;
  return CARD_CRAFT_COSTS[card.rarity] || null;
}

// Reserved for a future per-card progression gate on crafting. Empty today —
// Common/Uncommon/Rare cards have no existing unlock requirement (verified
// against cards.js), so no restriction is invented here. Each entry, if ever
// added, would be `cardId: (profile) => boolean` (true = unlocked).
const CRAFT_PROGRESSION_LOCKS = {};

/**
 * Pure crafting eligibility check — the single source of truth for whether a
 * card can be crafted right now, and why not if it can't. Checks run in
 * order (existence/category first, then ownership, then affordability) so
 * the ownership limit is always verified before any currency check, and no
 * currency is ever considered "spendable" once the limit is reached.
 * Returns { eligible: true, cost, owned, maxCopies, fragments, gold } or
 * { eligible: false, reason, ...same context fields where computable }.
 */
export function getCardCraftEligibility(profile, cardId) {
  const card = getCardById(cardId);
  if (!card) return { eligible: false, reason: "unknown_card" };

  const cost = getCardCraftCost(card);
  if (!cost) return { eligible: false, reason: "unsupported_rarity" };

  const isUnlocked = CRAFT_PROGRESSION_LOCKS[cardId];
  if (isUnlocked && !isUnlocked(profile)) {
    return { eligible: false, reason: "progression_locked", cost };
  }

  const owned = (profile?.cardCollection || {})[cardId] || 0;
  const maxCopies = getMaxCopies(card.rarity);
  if (owned >= maxCopies) {
    return { eligible: false, reason: "ownership_limit", cost, owned, maxCopies };
  }

  const fragments = getCardFragmentBalance(profile, cardId);
  if (fragments < cost.fragments) {
    return { eligible: false, reason: "insufficient_fragments", cost, owned, maxCopies, fragments };
  }

  const gold = profile?.gold || 0;
  if (gold < cost.gold) {
    return { eligible: false, reason: "insufficient_gold", cost, owned, maxCopies, fragments, gold };
  }

  return { eligible: true, cost, owned, maxCopies, fragments, gold };
}

/**
 * Pure atomic craft calculation. Never touches React/profile state itself —
 * the caller (GameContext.craftCard) applies the returned newProfile via a
 * single functional setState so Fragments, Gold, and the granted card copy
 * change together or not at all. Re-derives eligibility itself (rather than
 * trusting a caller-supplied check), so calling this directly against the
 * latest state is always a safe, self-contained revalidation.
 */
export function craftCardWithFragments(profile, cardId) {
  const eligibility = getCardCraftEligibility(profile, cardId);
  if (!eligibility.eligible) {
    return { success: false, cardId, reason: eligibility.reason };
  }
  const { cost, maxCopies } = eligibility;
  const newCollection = { ...(profile.cardCollection || {}) };
  newCollection[cardId] = (newCollection[cardId] || 0) + 1;
  const newProfile = {
    ...profile,
    cardCollection: newCollection,
    collectedCards: Object.keys(newCollection),
    cardFragments: addCardFragments(profile, cardId, -cost.fragments),
    gold: (profile.gold || 0) - cost.gold,
  };
  return {
    success: true,
    cardId,
    fragmentsSpent: cost.fragments,
    goldSpent: cost.gold,
    newOwnedCount: newCollection[cardId],
    maxCopies,
    newProfile,
  };
}

// Player-facing Craft button label for a given eligibility result (see
// getCardCraftEligibility). Fragment/Gold deficits are shown rather than the
// flat cost, so the player knows exactly how much more they need.
export function getCraftButtonLabel(eligibility) {
  if (!eligibility) return "Unavailable";
  if (eligibility.eligible) return "Craft";
  switch (eligibility.reason) {
    case "ownership_limit":
      return "Maximum Copies Owned";
    case "insufficient_fragments":
      return `Need ${eligibility.cost.fragments - eligibility.fragments} Fragments`;
    case "insufficient_gold":
      return `Need ${eligibility.cost.gold - eligibility.gold} Gold`;
    case "progression_locked":
      return "Locked";
    default:
      return "Unavailable";
  }
}

// Sanitizes a raw (possibly missing/malformed) cardFragments value from a
// loaded profile into a safe { [cardId]: nonnegative integer } map. Used by
// GameContext's profile migration; exported so migration behavior is directly
// testable without driving the full profile-load path.
export function sanitizeCardFragments(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const sanitized = {};
  for (const [id, value] of Object.entries(raw)) {
    const n = Math.floor(Number(value));
    sanitized[id] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return sanitized;
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