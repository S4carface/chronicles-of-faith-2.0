import { describe, it, expect } from "vitest";
import { SHOP_ITEMS, isShopItemUnlocked, getShopPurchasePool, purchaseCardPack } from "@/game/shopRules";
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

describe("getShopPurchasePool — Test 12: existing owned-card behavior unchanged", () => {
  it("excludes already-collected cards from the pool", () => {
    const allCommon = CARDS.filter((c) => c.rarity === "common");
    const ownedIds = allCommon.map((c) => c.id);
    const pool = getShopPurchasePool(commonPack, { collectedCards: ownedIds });
    expect(pool.length).toBe(0);
  });

  it("includes unowned cards of the pack's rarity", () => {
    const pool = getShopPurchasePool(commonPack, { collectedCards: [] });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((c) => c.rarity === "common")).toBe(true);
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
  it("blocks the purchase with an all_owned reason", () => {
    const allCommonIds = CARDS.filter((c) => c.rarity === "common").map((c) => c.id);
    const result = purchaseCardPack(commonPack, { gold: 10000, collectedCards: allCommonIds });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("all_owned");
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
