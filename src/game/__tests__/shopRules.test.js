import { describe, it, expect } from "vitest";
import { SHOP_ITEMS, isShopItemUnlocked, getShopPurchasePool, purchaseCardPack } from "@/game/shopRules";
import { grantCardOrFragments, addCardFragments, getMaxCopies } from "@/game/deckRules";
import { CARDS } from "@/data/cards";

const commonPack = SHOP_ITEMS.find((i) => i.id === "shop_common_card");
const rarePack = SHOP_ITEMS.find((i) => i.id === "shop_rare_card");
const legendaryPack = SHOP_ITEMS.find((i) => i.id === "shop_legendary_card");

describe("Shop prices and rarities are unchanged", () => {
  it("keeps the original four packs at their original costs", () => {
    expect(SHOP_ITEMS.map((i) => [i.id, i.cost])).toEqual([
      ["shop_common_card", 50],
      ["shop_uncommon_card", 150],
      ["shop_rare_card", 500],
      ["shop_legendary_card", 2000],
    ]);
  });
});

describe("isShopItemUnlocked — uses the actual current unlock rule", () => {
  it("Common/Uncommon are always unlocked", () => {
    expect(isShopItemUnlocked(commonPack, {})).toBe(true);
  });

  it("Rare requires genesisCompleted", () => {
    expect(isShopItemUnlocked(rarePack, {})).toBe(false);
    expect(isShopItemUnlocked(rarePack, { genesisCompleted: true })).toBe(true);
  });

  it("Legendary requires genesisNormalCompleted", () => {
    expect(isShopItemUnlocked(legendaryPack, { genesisCompleted: true })).toBe(false);
    expect(isShopItemUnlocked(legendaryPack, { genesisNormalCompleted: true })).toBe(true);
  });
});

describe("getShopPurchasePool — owned cards remain eligible (duplicate cleanup)", () => {
  it("includes already-collected cards in the pool", () => {
    const allCommon = CARDS.filter((c) => c.rarity === "common");
    const ownedIds = allCommon.map((c) => c.id);
    const pool = getShopPurchasePool(commonPack, { collectedCards: ownedIds });
    expect(pool.length).toBe(allCommon.length);
  });

  it("includes unowned cards of the pack's rarity", () => {
    const pool = getShopPurchasePool(commonPack, { collectedCards: [] });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((c) => c.rarity === "common")).toBe(true);
  });

  it("is the full rarity tier regardless of ownership (no reroll-to-unowned bias)", () => {
    const allCommon = CARDS.filter((c) => c.rarity === "common");
    const someOwned = getShopPurchasePool(commonPack, { collectedCards: [allCommon[0].id] });
    const noneOwned = getShopPurchasePool(commonPack, { collectedCards: [] });
    expect(someOwned.length).toBe(noneOwned.length);
  });
});

describe("purchaseCardPack — locked pack (Test: locked blocks purchase)", () => {
  it("blocks a locked pack and reports the real unlock requirement", () => {
    const result = purchaseCardPack(rarePack, { gold: 10000, collectedCards: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("locked");
    expect(result.message).toMatch(/Complete Genesis to unlock/i);
  });
});

describe("purchaseCardPack — Test 11: insufficient Gold blocks purchase", () => {
  it("blocks the purchase and does not report a gold delta", () => {
    const result = purchaseCardPack(commonPack, { gold: 10, collectedCards: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_gold");
    expect(result.newGold).toBeUndefined();
  });
});

describe("purchaseCardPack — all cards of the rarity already owned", () => {
  it("no longer blocks the purchase (a duplicate roll converts to Fragments instead)", () => {
    const allCommonIds = CARDS.filter((c) => c.rarity === "common").map((c) => c.id);
    const result = purchaseCardPack(commonPack, { gold: 10000, collectedCards: allCommonIds }, () => 0);
    expect(result.ok).toBe(true);
    expect(result.newGold).toBe(9950);
    expect(CARDS.find((c) => c.id === result.cardId).rarity).toBe("common");
  });
});

describe("purchaseCardPack — Tests 9/10: successful purchase deducts Gold once and grants ownership once", () => {
  it("returns exactly one card grant and the exact post-purchase Gold", () => {
    const profile = { gold: 200, collectedCards: [] };
    const result = purchaseCardPack(commonPack, profile, () => 0); // deterministic: picks pool[0]
    expect(result.ok).toBe(true);
    expect(result.newGold).toBe(150); // 200 - 50, deducted exactly once
    expect(typeof result.cardId).toBe("string");
    expect(CARDS.find((c) => c.id === result.cardId).rarity).toBe("common");
  });

  it("is deterministic for a fixed rng (Daily-style reproducibility)", () => {
    const profile = { gold: 200, collectedCards: [] };
    const a = purchaseCardPack(commonPack, profile, () => 0.5);
    const b = purchaseCardPack(commonPack, profile, () => 0.5);
    expect(a.cardId).toBe(b.cardId);
  });

  it("does not mutate the input profile (caller applies the single update)", () => {
    const profile = { gold: 200, collectedCards: [] };
    purchaseCardPack(commonPack, profile, () => 0);
    expect(profile.gold).toBe(200); // untouched — purchaseCardPack is pure
  });
});

// Simulates Shop.jsx's handleBuy: purchaseCardPack (Gold + card selection)
// followed by the canonical grantCardOrFragments/addCardFragments pipeline,
// since Shop.jsx itself can't be rendered in this no-jsdom test environment.
function simulatePurchase(item, profile, rng) {
  const result = purchaseCardPack(item, profile, rng);
  if (!result.ok) return { result, grant: null, profile };
  const grant = grantCardOrFragments(profile, result.cardId);
  const nextProfile = { ...profile, gold: result.newGold };
  if (grant.type === "fragments") {
    nextProfile.cardFragments = addCardFragments(profile, result.cardId, grant.amount);
  } else {
    nextProfile.cardCollection = {
      ...(profile.cardCollection || {}),
      [result.cardId]: ((profile.cardCollection || {})[result.cardId] || 0) + 1,
    };
  }
  return { result, grant, profile: nextProfile };
}

describe("Shop duplicate rolls convert through the canonical grant pipeline", () => {
  it("Shop can roll a maxed duplicate (Common at its 2-copy limit)", () => {
    const maxedCard = CARDS.find((c) => c.rarity === "common");
    const profile = { gold: 200, collectedCards: [maxedCard.id], cardCollection: { [maxedCard.id]: getMaxCopies("common") } };
    // Force the roll onto the maxed card by making it the only eligible pool entry via rng=0 is not guaranteed;
    // instead verify directly that a roll landing on it converts, using the real pool with a targeted rng.
    const pool = getShopPurchasePool(commonPack, profile);
    const index = pool.findIndex((c) => c.id === maxedCard.id);
    const rng = () => index / pool.length;
    const { result, grant } = simulatePurchase(commonPack, profile, rng);
    expect(result.ok).toBe(true);
    expect(result.cardId).toBe(maxedCard.id);
    expect(grant.type).toBe("fragments");
    expect(grant.amount).toBe(5);
  });

  it("Shop duplicate converts exactly once (single Fragment credit, no card grant)", () => {
    const maxedCard = CARDS.find((c) => c.rarity === "common");
    const profile = { gold: 200, cardCollection: { [maxedCard.id]: getMaxCopies("common") }, cardFragments: {} };
    const pool = getShopPurchasePool(commonPack, profile);
    const index = pool.findIndex((c) => c.id === maxedCard.id);
    const { result, profile: next } = simulatePurchase(commonPack, profile, () => index / pool.length);
    expect(result.ok).toBe(true);
    expect(next.cardCollection[maxedCard.id]).toBe(getMaxCopies("common")); // unchanged — no redundant copy
    expect(next.cardFragments[maxedCard.id]).toBe(5); // credited exactly once
  });

  it("Shop deducts Gold exactly once whether the roll is new, allowed, or a duplicate conversion", () => {
    const maxedCard = CARDS.find((c) => c.rarity === "common");
    const profile = { gold: 200, cardCollection: { [maxedCard.id]: getMaxCopies("common") } };
    const pool = getShopPurchasePool(commonPack, profile);
    const index = pool.findIndex((c) => c.id === maxedCard.id);
    const { result } = simulatePurchase(commonPack, profile, () => index / pool.length);
    expect(result.newGold).toBe(150); // 200 - 50, exactly once regardless of card vs Fragments
  });

  it("does not reroll toward an unowned card — the resolved cardId is whatever the pool index selected", () => {
    const allCommon = CARDS.filter((c) => c.rarity === "common");
    const ownedId = allCommon[0].id;
    const profile = { gold: 200, cardCollection: { [ownedId]: getMaxCopies("common") } };
    const pool = getShopPurchasePool(commonPack, profile);
    const result = purchaseCardPack(commonPack, profile, () => 0); // always picks pool[0]
    expect(result.cardId).toBe(pool[0].id); // no reroll logic swapped it for something else
  });

  it("back-to-back purchases of the same maxed card both credit Fragments (functional-update safety)", () => {
    const maxedCard = CARDS.find((c) => c.rarity === "common");
    let profile = { gold: 200, cardCollection: { [maxedCard.id]: getMaxCopies("common") }, cardFragments: {} };
    const pool = getShopPurchasePool(commonPack, profile);
    const index = pool.findIndex((c) => c.id === maxedCard.id);
    const rng = () => index / pool.length;

    const first = simulatePurchase(commonPack, profile, rng);
    profile = first.profile;
    const second = simulatePurchase(commonPack, profile, rng);
    profile = second.profile;

    expect(profile.gold).toBe(100); // 200 - 50 - 50
    expect(profile.cardFragments[maxedCard.id]).toBe(10); // 5 + 5, both purchases persisted
  });

  it("Fragment balances for unrelated cards are untouched by a purchase", () => {
    const maxedCard = CARDS.find((c) => c.rarity === "common");
    const profile = {
      gold: 200,
      cardCollection: { [maxedCard.id]: getMaxCopies("common") },
      cardFragments: { righteous_aim: 20 },
    };
    const pool = getShopPurchasePool(commonPack, profile);
    const index = pool.findIndex((c) => c.id === maxedCard.id);
    const { profile: next } = simulatePurchase(commonPack, profile, () => index / pool.length);
    expect(next.cardFragments.righteous_aim).toBe(20);
  });

  it("insufficient Gold still blocks the purchase before any grant decision runs", () => {
    const profile = { gold: 10, cardCollection: {} };
    const result = purchaseCardPack(commonPack, profile, () => 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_gold");
  });

  it("a locked pack remains locked regardless of the duplicate-roll change", () => {
    const result = purchaseCardPack(rarePack, { gold: 10000, cardCollection: {} }, () => 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("locked");
  });
});
