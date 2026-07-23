import { describe, it, expect } from "vitest";
import {
  CARD_CRAFT_COSTS,
  getCardCraftCost,
  getCardCraftEligibility,
  craftCardWithFragments,
  getCraftButtonLabel,
  getCardFragmentBalance,
  getMaxCopies,
  resolveMaxRewardRarity,
  cardsOfTier,
} from "@/game/deckRules";
import { getShopPurchasePool, purchaseCardPack, SHOP_ITEMS } from "@/game/shopRules";
import { getCardById } from "@/data/cards";

// localStorage polyfill for the save/reload round-trip (node test env).
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const COMMON_CARD = "sling_stone";
const UNCOMMON_CARD = "wisdom";
const RARE_CARD = "ark_covenant";

function profileFor({ cardCollection = {}, cardFragments = {}, gold = 0 } = {}) {
  return { cardCollection, cardFragments, gold };
}

describe("CARD_CRAFT_COSTS — crafting-cost model", () => {
  it("Common costs 20 Fragments and 50 Gold", () => {
    expect(CARD_CRAFT_COSTS.common).toEqual({ fragments: 20, gold: 50 });
  });

  it("Uncommon costs 40 Fragments and 150 Gold", () => {
    expect(CARD_CRAFT_COSTS.uncommon).toEqual({ fragments: 40, gold: 150 });
  });

  it("Rare costs 80 Fragments and 400 Gold", () => {
    expect(CARD_CRAFT_COSTS.rare).toEqual({ fragments: 80, gold: 400 });
  });

  it("Epic has no crafting cost (unavailable)", () => {
    expect(CARD_CRAFT_COSTS.epic).toBeUndefined();
    expect(getCardCraftCost(getCardById("righteous_aim"))).toBeNull();
  });

  it("Legendary has no crafting cost (unavailable)", () => {
    expect(CARD_CRAFT_COSTS.legendary).toBeUndefined();
    expect(getCardCraftCost(getCardById("angel_lord"))).toBeNull();
  });

  it("Mythic has no crafting cost and no cards exist for it", () => {
    expect(CARD_CRAFT_COSTS.mythic).toBeUndefined();
    expect(cardsOfTier("mythic")).toEqual([]);
  });

  it("getCardCraftCost matches the exact rarity costs for the sample cards", () => {
    expect(getCardCraftCost(getCardById(COMMON_CARD))).toEqual({ fragments: 20, gold: 50 });
    expect(getCardCraftCost(getCardById(UNCOMMON_CARD))).toEqual({ fragments: 40, gold: 150 });
    expect(getCardCraftCost(getCardById(RARE_CARD))).toEqual({ fragments: 80, gold: 400 });
  });
});

describe("getCardCraftEligibility — unknown/unsupported cards fail safely", () => {
  it("an unknown card ID fails with unknown_card", () => {
    const result = getCardCraftEligibility(profileFor(), "not_a_real_card");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("unknown_card");
  });

  it("Righteous Aim (Epic) cannot be crafted", () => {
    const result = getCardCraftEligibility(profileFor(), "righteous_aim");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("unsupported_rarity");
  });

  it("a Legendary card cannot be crafted", () => {
    const result = getCardCraftEligibility(profileFor(), "angel_lord");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("unsupported_rarity");
  });

  it("no card in the game is Mythic, so none can ever resolve a craft cost", () => {
    expect(cardsOfTier("mythic").length).toBe(0);
  });

  it("no progression lock is invented for Common/Uncommon/Rare cards", () => {
    // No existing per-card unlock requirement exists for these rarities
    // (verified against cards.js) — eligibility should never report
    // progression_locked for a normal, affordable, under-limit craft.
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(true);
    expect(result.reason).not.toBe("progression_locked");
  });
});

describe("getCardCraftEligibility — ownership limit checked before spending", () => {
  it("Common: first copy (owned 0) is craft-eligible with enough currency", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(true);
    expect(result.owned).toBe(0);
    expect(result.maxCopies).toBe(2);
  });

  it("Common: second copy (owned 1) is craft-eligible", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 1 }, cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(true);
  });

  it("Common: third copy (owned 2, at the 2-copy limit) is blocked regardless of currency", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 999 }, gold: 999999 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("ownership_limit");
  });

  it("Uncommon: second copy (owned 1) is craft-eligible", () => {
    const profile = profileFor({ cardCollection: { [UNCOMMON_CARD]: 1 }, cardFragments: { [UNCOMMON_CARD]: 40 }, gold: 150 });
    const result = getCardCraftEligibility(profile, UNCOMMON_CARD);
    expect(result.eligible).toBe(true);
  });

  it("Rare: second copy is blocked (1-copy limit) even with ample currency", () => {
    const profile = profileFor({ cardCollection: { [RARE_CARD]: 1 }, cardFragments: { [RARE_CARD]: 999 }, gold: 999999 });
    const result = getCardCraftEligibility(profile, RARE_CARD);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("ownership_limit");
  });

  it("ownership_limit is reported even when Fragments/Gold would otherwise be insufficient too — the limit check runs first", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: {}, gold: 0 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.reason).toBe("ownership_limit");
  });
});

describe("getCardCraftEligibility — currency checks", () => {
  it("insufficient Fragments is reported when Gold is sufficient", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 14 }, gold: 50 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("insufficient_fragments");
  });

  it("insufficient Gold is reported when Fragments are sufficient", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 10 });
    const result = getCardCraftEligibility(profile, COMMON_CARD);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("insufficient_gold");
  });
});

describe("craftCardWithFragments — successful craft", () => {
  it("deducts exact Fragments, exact Gold, and grants exactly one copy", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(20);
    expect(result.goldSpent).toBe(50);
    expect(result.newOwnedCount).toBe(1);
    expect(result.newProfile.cardCollection[COMMON_CARD]).toBe(1);
    expect(result.newProfile.cardFragments[COMMON_CARD]).toBe(0);
    expect(result.newProfile.gold).toBe(0);
  });

  it("leaves surplus Fragments/Gold after crafting (only the exact cost is spent)", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 35 }, gold: 200 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.success).toBe(true);
    expect(result.newProfile.cardFragments[COMMON_CARD]).toBe(15); // 35 - 20
    expect(result.newProfile.gold).toBe(150); // 200 - 50
  });

  it("crafting Uncommon deducts 40 Fragments and 150 Gold", () => {
    const profile = profileFor({ cardFragments: { [UNCOMMON_CARD]: 40 }, gold: 150 });
    const result = craftCardWithFragments(profile, UNCOMMON_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(40);
    expect(result.goldSpent).toBe(150);
  });

  it("crafting Rare deducts 80 Fragments and 400 Gold", () => {
    const profile = profileFor({ cardFragments: { [RARE_CARD]: 80 }, gold: 400 });
    const result = craftCardWithFragments(profile, RARE_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(80);
    expect(result.goldSpent).toBe(400);
  });

  it("does not mutate the input profile", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    craftCardWithFragments(profile, COMMON_CARD);
    expect(profile.cardCollection[COMMON_CARD]).toBeUndefined();
    expect(profile.cardFragments[COMMON_CARD]).toBe(20);
    expect(profile.gold).toBe(50);
  });

  it("preserves other cards' Fragment balances", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20, righteous_aim: 20 }, gold: 50 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.newProfile.cardFragments.righteous_aim).toBe(20);
  });

  it("preserves other cards' owned counts", () => {
    const profile = profileFor({ cardCollection: { prayer: 2 }, cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.newProfile.cardCollection.prayer).toBe(2);
  });
});

describe("craftCardWithFragments — failure spends nothing (atomic)", () => {
  it("unknown card fails and returns no newProfile", () => {
    const profile = profileFor({ gold: 100000 });
    const result = craftCardWithFragments(profile, "not_a_real_card");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("unknown_card");
    expect(result.newProfile).toBeUndefined();
  });

  it("insufficient Fragments spends nothing", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 5 }, gold: 50 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("insufficient_fragments");
    expect(result.newProfile).toBeUndefined();
  });

  it("insufficient Gold spends nothing", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 0 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("insufficient_gold");
    expect(result.newProfile).toBeUndefined();
  });

  it("ownership_limit spends nothing even with excess currency", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 999 }, gold: 999999 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("ownership_limit");
    expect(result.newProfile).toBeUndefined();
  });

  it("Epic (Righteous Aim) fails and spends nothing regardless of Fragments/Gold", () => {
    const profile = profileFor({ cardFragments: { righteous_aim: 9999 }, gold: 999999 });
    const result = craftCardWithFragments(profile, "righteous_aim");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("unsupported_rarity");
    expect(result.newProfile).toBeUndefined();
  });
});

describe("rapid/sequential craft attempts cannot double-grant", () => {
  it("two sequential crafts of the same Common card each apply against the true prior result", () => {
    let profile = profileFor({ cardFragments: { [COMMON_CARD]: 40 }, gold: 100 });

    const first = craftCardWithFragments(profile, COMMON_CARD);
    expect(first.success).toBe(true);
    profile = first.newProfile;
    expect(profile.cardCollection[COMMON_CARD]).toBe(1);
    expect(profile.cardFragments[COMMON_CARD]).toBe(20);
    expect(profile.gold).toBe(50);

    const second = craftCardWithFragments(profile, COMMON_CARD);
    expect(second.success).toBe(true);
    profile = second.newProfile;
    expect(profile.cardCollection[COMMON_CARD]).toBe(2); // exactly at the 2-copy limit, not beyond
    expect(profile.cardFragments[COMMON_CARD]).toBe(0);
    expect(profile.gold).toBe(0);

    // A third attempt (simulating a rapid extra tap) is correctly blocked —
    // both by the ownership limit and by insufficient Fragments/Gold.
    const third = craftCardWithFragments(profile, COMMON_CARD);
    expect(third.success).toBe(false);
    expect(third.reason).toBe("ownership_limit");
  });

  it("a second attempt against the same stale (pre-first-craft) profile object still cannot exceed the limit once chained correctly", () => {
    // Mirrors GameContext.craftCard's revalidation: even if two calls are
    // dispatched off the same starting snapshot, only applying the SECOND
    // one against the result of the FIRST (never both against the same
    // stale snapshot) is what makes this safe — this is exactly what the
    // functional setState updater in GameContext.jsx guarantees.
    const staleSnapshot = profileFor({ cardCollection: { [RARE_CARD]: 0 }, cardFragments: { [RARE_CARD]: 80 }, gold: 400 });
    const applied = craftCardWithFragments(staleSnapshot, RARE_CARD);
    expect(applied.success).toBe(true);
    const second = craftCardWithFragments(applied.newProfile, RARE_CARD);
    expect(second.success).toBe(false);
    expect(second.reason).toBe("ownership_limit");
  });
});

describe("getCraftButtonLabel — Collection disabled reasons", () => {
  it("shows 'Craft' when eligible", () => {
    const eligibility = getCardCraftEligibility(profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 }), COMMON_CARD);
    expect(getCraftButtonLabel(eligibility)).toBe("Craft");
  });

  it("shows the exact Fragment deficit when insufficient", () => {
    const eligibility = getCardCraftEligibility(profileFor({ cardFragments: { [COMMON_CARD]: 14 }, gold: 50 }), COMMON_CARD);
    expect(getCraftButtonLabel(eligibility)).toBe("Need 6 Fragments");
  });

  it("shows the exact Gold deficit when insufficient", () => {
    const eligibility = getCardCraftEligibility(profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 0 }), COMMON_CARD);
    expect(getCraftButtonLabel(eligibility)).toBe("Need 50 Gold");
  });

  it("shows 'Maximum Copies Owned' at the ownership limit", () => {
    const eligibility = getCardCraftEligibility(profileFor({ cardCollection: { [COMMON_CARD]: 2 } }), COMMON_CARD);
    expect(getCraftButtonLabel(eligibility)).toBe("Maximum Copies Owned");
  });
});

describe("crafting persists after save/reload", () => {
  it("round-trips a crafted card's collection, Fragments, and Gold through JSON", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const result = craftCardWithFragments(profile, COMMON_CARD);
    localStorage.setItem("craft-test", JSON.stringify(result.newProfile));
    const restored = JSON.parse(localStorage.getItem("craft-test"));
    expect(restored.cardCollection[COMMON_CARD]).toBe(1);
    expect(restored.cardFragments[COMMON_CARD]).toBe(0);
    expect(restored.gold).toBe(0);
  });
});

describe("no active crafting for Epic/Legendary/Mythic (Collection UI precondition)", () => {
  it("getCardCraftCost is null for every Epic and Legendary card", () => {
    const epicAndLegendary = [getCardById("righteous_aim"), getCardById("angel_lord")];
    for (const card of epicAndLegendary) {
      expect(getCardCraftCost(card)).toBeNull();
    }
  });
});

describe("existing reward rarity caps remain unchanged", () => {
  it("Easy rewards are still capped at Rare", () => {
    expect(resolveMaxRewardRarity("easy", "boss")).toBe("rare");
  });

  it("Hard is still uncapped", () => {
    expect(resolveMaxRewardRarity("hard", "boss")).toBe("legendary");
  });
});

describe("existing Shop duplicate behavior remains unchanged", () => {
  const commonPack = SHOP_ITEMS.find((i) => i.id === "shop_common_card");

  it("Shop pool still includes owned cards (Phase 1 cleanup behavior intact)", () => {
    const pool = getShopPurchasePool(commonPack, { collectedCards: [COMMON_CARD] });
    expect(pool.some((c) => c.id === COMMON_CARD)).toBe(true);
  });

  it("Shop still deducts Gold exactly once per purchase", () => {
    const result = purchaseCardPack(commonPack, { gold: 200 }, () => 0);
    expect(result.ok).toBe(true);
    expect(result.newGold).toBe(150);
  });
});

describe("getCardFragmentBalance sanity (shared with Collection display)", () => {
  it("reflects the exact stored balance used for crafting eligibility", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 17 } });
    expect(getCardFragmentBalance(profile, COMMON_CARD)).toBe(17);
    expect(getCardCraftEligibility(profile, COMMON_CARD).fragments).toBe(17);
  });
});

describe("getMaxCopies is untouched by crafting", () => {
  it("keeps the existing per-rarity copy limits", () => {
    expect(getMaxCopies("common")).toBe(2);
    expect(getMaxCopies("uncommon")).toBe(2);
    expect(getMaxCopies("rare")).toBe(1);
    expect(getMaxCopies("legendary")).toBe(1);
  });
});
