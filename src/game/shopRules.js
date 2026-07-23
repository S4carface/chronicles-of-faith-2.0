// Shop economy — single source of truth for shop items, unlock rules, and the
// purchase calculation. Extracted from the Shop page so the purchase math is
// pure and testable, and so there is exactly one place that defines prices,
// odds, and unlock requirements (no duplicated logic if the Shop is rendered
// from more than one place, e.g. embedded inside the Cards hub).
//
// Prices, rarities, and unlock requirements are UNCHANGED from the original
// Shop implementation — this is a refactor for testability, not an economy change.
import { cardsOfTier } from "@/game/deckRules";

export const SHOP_ITEMS = [
  {
    id: "shop_common_card",
    name: "Common Card Pack",
    icon: "common",
    cost: 50,
    desc: "Receive one random Common card you do not own.",
    type: "card_pack",
    rarity: "common",
    unlockRequirement: "always",
  },
  {
    id: "shop_uncommon_card",
    name: "Uncommon Card Pack",
    icon: "uncommon",
    cost: 150,
    desc: "Receive one random Uncommon card you do not own.",
    type: "card_pack",
    rarity: "uncommon",
    unlockRequirement: "always",
  },
  {
    id: "shop_rare_card",
    name: "Rare Card Pack",
    icon: "rare",
    cost: 500,
    desc: "Receive one random Rare card you do not own.",
    type: "card_pack",
    rarity: "rare",
    unlockRequirement: "genesis",
    lockedText: "Complete Genesis to unlock",
  },
  {
    id: "shop_legendary_card",
    name: "Legendary Card Pack",
    icon: "legendary",
    cost: 2000,
    desc: "Receive one random Legendary card you do not own.",
    type: "card_pack",
    rarity: "legendary",
    unlockRequirement: "genesis_normal",
    lockedText: "Complete Genesis on Normal to unlock",
  },
];

// Whether a shop item's unlock requirement is currently satisfied by the
// player's profile. Uses the actual existing progression flags — no invented
// unlock condition.
export function isShopItemUnlocked(item, profile = {}) {
  switch (item.unlockRequirement) {
    case "genesis":
      return profile.genesisCompleted === true;
    case "genesis_normal":
      return profile.genesisNormalCompleted === true;
    case "always":
    default:
      return true;
  }
}

// Pool of cards a given pack could grant: the item's rarity tier, minus cards
// the player already owns. (cardsOfTier folds Epic into the Rare tier, same as
// the reward system — see deckRules.js.)
export function getShopPurchasePool(item, profile = {}) {
  const collected = profile.collectedCards || [];
  return cardsOfTier(item.rarity).filter((c) => !collected.includes(c.id));
}

// Pure purchase calculation — decides the outcome of buying a pack without
// touching any component/profile state. The caller (Shop.jsx) applies the
// single resulting gold deduction and single card grant. Returns one of:
//   { ok: false, reason: "locked" | "insufficient_gold" | "all_owned", message }
//   { ok: true, cardId, cardName, cost, newGold, message }
export function purchaseCardPack(item, profile, rng = Math.random) {
  const gold = profile.gold || 0;

  if (!isShopItemUnlocked(item, profile)) {
    return {
      ok: false,
      reason: "locked",
      message: item.lockedText || "This card pack is still locked.",
    };
  }

  if (gold < item.cost) {
    return {
      ok: false,
      reason: "insufficient_gold",
      message: `Not enough Gold. You need ${item.cost - gold} more.`,
    };
  }

  const pool = getShopPurchasePool(item, profile);
  if (pool.length === 0) {
    return {
      ok: false,
      reason: "all_owned",
      message: "You already own all cards of this rarity!",
    };
  }

  const card = pool[Math.floor(rng() * pool.length)];
  return {
    ok: true,
    cardId: card.id,
    cardName: card.name,
    cost: item.cost,
    newGold: gold - item.cost,
    message: `You received: ${card.name}!`,
  };
}
