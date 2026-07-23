import { describe, it, expect } from "vitest";
import {
  getCardFragmentBalance,
  addCardFragments,
  getDuplicateFragmentAmount,
  grantCardOrFragments,
  shouldAwardDuplicateGoldBonus,
  sanitizeCardFragments,
  DUPLICATE_FRAGMENT_AMOUNTS,
  DUPLICATE_GOLD_BONUS,
  getMaxCopies,
  resolveMaxRewardRarity,
  cardsOfTier,
} from "@/game/deckRules";
import { getCardById } from "@/data/cards";

// localStorage polyfill for loadProfile's migration round-trip (node test env).
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const STORAGE_KEY = "chronicles_of_faith_v1";

describe("sanitizeCardFragments", () => {
  it("normalizes a missing/undefined value to {}", () => {
    expect(sanitizeCardFragments(undefined)).toEqual({});
    expect(sanitizeCardFragments(null)).toEqual({});
  });

  it("normalizes a non-object or array value to {}", () => {
    expect(sanitizeCardFragments("nope")).toEqual({});
    expect(sanitizeCardFragments(42)).toEqual({});
    expect(sanitizeCardFragments(["a", "b"])).toEqual({});
  });

  it("preserves valid nonnegative integer entries", () => {
    expect(sanitizeCardFragments({ sling_stone: 10, righteous_aim: 20 })).toEqual({
      sling_stone: 10,
      righteous_aim: 20,
    });
  });

  it("normalizes negative, non-integer, and non-numeric values to 0 without crashing", () => {
    expect(sanitizeCardFragments({ a: -5, b: 3.7, c: "not a number", d: NaN, e: undefined })).toEqual({
      a: 0,
      b: 3,
      c: 0,
      d: 0,
      e: 0,
    });
  });

  it("does not crash on unknown/removed card IDs", () => {
    expect(() => sanitizeCardFragments({ some_removed_card_id: 5 })).not.toThrow();
    expect(sanitizeCardFragments({ some_removed_card_id: 5 })).toEqual({ some_removed_card_id: 5 });
  });
});

// GameContext.jsx pulls in browser-only modules (window-dependent app params)
// that can't load under the node test environment (no jsdom), so migration
// is exercised the same way GameContext's loadProfile applies it to a parsed
// profile — `{ ...parsed, cardFragments: sanitizeCardFragments(parsed.cardFragments) }`
// — without importing the module itself. This is the exact expression
// GameContext.jsx runs for this field; every other field is untouched by
// this task's migration (verified here by pass-through, not re-derived).
function migrateCardFragmentsField(parsedProfile) {
  return { ...parsedProfile, cardFragments: sanitizeCardFragments(parsedProfile.cardFragments) };
}

describe("profile migration preserves everything else", () => {
  it("an existing profile without cardFragments migrates to {}", () => {
    const parsed = { cardCollection: { sling_stone: 2, prayer: 1 }, gold: 250 };
    expect(migrateCardFragmentsField(parsed).cardFragments).toEqual({});
  });

  it("preserves existing owned cards and duplicate counts", () => {
    const parsed = { cardCollection: { sling_stone: 2, prayer: 3, righteous_strike: 1 }, gold: 100 };
    expect(migrateCardFragmentsField(parsed).cardCollection).toEqual({ sling_stone: 2, prayer: 3, righteous_strike: 1 });
  });

  it("preserves Gold, difficulty progress, and Noah unlock progress", () => {
    const parsed = {
      cardCollection: { sling_stone: 1 },
      gold: 777,
      genesisEasyCompleted: true,
      genesisNormalCompleted: true,
      unlockedHeroes: ["adam", "noah"],
    };
    const migrated = migrateCardFragmentsField(parsed);
    expect(migrated.gold).toBe(777);
    expect(migrated.genesisEasyCompleted).toBe(true);
    expect(migrated.genesisNormalCompleted).toBe(true);
    expect(migrated.unlockedHeroes).toContain("noah");
  });

  it("keeps valid pre-existing Fragment data instead of resetting it", () => {
    const parsed = { cardCollection: { sling_stone: 2 }, cardFragments: { sling_stone: 10 } };
    expect(migrateCardFragmentsField(parsed).cardFragments).toEqual({ sling_stone: 10 });
  });

  it("does not crash migration when cardFragments references an unknown card ID", () => {
    const parsed = { cardCollection: { sling_stone: 1 }, cardFragments: { not_a_real_card: 5 } };
    expect(() => migrateCardFragmentsField(parsed)).not.toThrow();
    expect(migrateCardFragmentsField(parsed).cardFragments.not_a_real_card).toBe(5);
  });

  it("a brand-new profile starts at 0 Fragments for every card", () => {
    const parsed = { cardCollection: {} };
    expect(migrateCardFragmentsField(parsed).cardFragments).toEqual({});
  });

  it("round-trips through JSON (localStorage persistence) without losing data", () => {
    const parsed = { cardCollection: { sling_stone: 2 }, cardFragments: { sling_stone: 10 }, gold: 50 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrateCardFragmentsField(parsed)));
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(restored.cardFragments).toEqual({ sling_stone: 10 });
    expect(restored.cardCollection).toEqual({ sling_stone: 2 });
    expect(restored.gold).toBe(50);
  });
});

describe("getCardFragmentBalance", () => {
  it("defaults to 0 for a missing profile or cardFragments map", () => {
    expect(getCardFragmentBalance(undefined, "sling_stone")).toBe(0);
    expect(getCardFragmentBalance({}, "sling_stone")).toBe(0);
  });

  it("defaults to 0 for an unrecognized cardId", () => {
    expect(getCardFragmentBalance({ cardFragments: { sling_stone: 10 } }, "unknown_card")).toBe(0);
  });

  it("normalizes a negative or non-finite stored value to 0", () => {
    expect(getCardFragmentBalance({ cardFragments: { sling_stone: -5 } }, "sling_stone")).toBe(0);
    expect(getCardFragmentBalance({ cardFragments: { sling_stone: NaN } }, "sling_stone")).toBe(0);
  });

  it("returns the floored stored value", () => {
    expect(getCardFragmentBalance({ cardFragments: { sling_stone: 12.9 } }, "sling_stone")).toBe(12);
  });
});

describe("addCardFragments (pure reducer)", () => {
  it("adds to an existing balance", () => {
    const profile = { cardFragments: { sling_stone: 5 } };
    expect(addCardFragments(profile, "sling_stone", 5)).toEqual({ sling_stone: 10 });
  });

  it("creates a new entry starting from 0", () => {
    const profile = { cardFragments: {} };
    expect(addCardFragments(profile, "parting_waters", 12)).toEqual({ parting_waters: 12 });
  });

  it("floors a non-integer amount", () => {
    const profile = { cardFragments: {} };
    expect(addCardFragments(profile, "sling_stone", 5.9)).toEqual({ sling_stone: 5 });
  });

  it("never goes negative", () => {
    const profile = { cardFragments: { sling_stone: 3 } };
    expect(addCardFragments(profile, "sling_stone", -100)).toEqual({ sling_stone: 0 });
  });

  it("does not mutate the input profile", () => {
    const profile = { cardFragments: { sling_stone: 5 } };
    addCardFragments(profile, "sling_stone", 5);
    expect(profile.cardFragments).toEqual({ sling_stone: 5 });
  });

  it("preserves other cards' Fragment balances", () => {
    const profile = { cardFragments: { sling_stone: 5, righteous_aim: 20 } };
    const next = addCardFragments(profile, "sling_stone", 5);
    expect(next).toEqual({ sling_stone: 10, righteous_aim: 20 });
  });

  it("two sequential grants for the same card both persist (chained functional updates)", () => {
    let profile = { cardFragments: {} };
    profile = { ...profile, cardFragments: addCardFragments(profile, "sling_stone", 5) };
    profile = { ...profile, cardFragments: addCardFragments(profile, "sling_stone", 5) };
    expect(profile.cardFragments.sling_stone).toBe(10);
  });
});

describe("getDuplicateFragmentAmount", () => {
  it("returns the recommended starting values per rarity", () => {
    expect(DUPLICATE_FRAGMENT_AMOUNTS).toEqual({
      common: 5,
      uncommon: 8,
      rare: 12,
      epic: 20,
      legendary: 35,
    });
  });

  it("Common duplicate converts to 5 Fragments", () => {
    expect(getDuplicateFragmentAmount(getCardById("sling_stone"))).toBe(5);
  });

  it("Uncommon duplicate converts to 8 Fragments", () => {
    expect(getDuplicateFragmentAmount(getCardById("wisdom"))).toBe(8);
  });

  it("Rare duplicate converts to 12 Fragments", () => {
    expect(getDuplicateFragmentAmount(getCardById("ark_covenant"))).toBe(12);
  });

  it("Epic duplicate converts to 20 Fragments", () => {
    expect(getDuplicateFragmentAmount(getCardById("righteous_aim"))).toBe(20);
  });

  it("Legendary duplicate converts to 35 Fragments", () => {
    expect(getDuplicateFragmentAmount(getCardById("angel_lord"))).toBe(35);
  });

  it("no Mythic behavior is exposed (no Mythic amount defined)", () => {
    expect(DUPLICATE_FRAGMENT_AMOUNTS.mythic).toBeUndefined();
    expect(getDuplicateFragmentAmount({ rarity: "mythic" })).toBe(0);
  });

  it("returns 0 for a missing card", () => {
    expect(getDuplicateFragmentAmount(null)).toBe(0);
    expect(getDuplicateFragmentAmount(undefined)).toBe(0);
  });
});

describe("grantCardOrFragments (canonical card-grant pipeline)", () => {
  it("grants a complete card for a new, unowned card", () => {
    const profile = { cardCollection: {} };
    expect(grantCardOrFragments(profile, "sling_stone")).toEqual({ type: "card", cardId: "sling_stone" });
  });

  it("grants the allowed second copy normally when the game allows two owned copies", () => {
    // sling_stone is Common — getMaxCopies("common") === 2
    expect(getMaxCopies("common")).toBe(2);
    const profile = { cardCollection: { sling_stone: 1 } };
    expect(grantCardOrFragments(profile, "sling_stone")).toEqual({ type: "card", cardId: "sling_stone" });
  });

  it("converts to Fragments once the actual ownership limit is reached (Common, 2 copies)", () => {
    const profile = { cardCollection: { sling_stone: 2 } };
    const result = grantCardOrFragments(profile, "sling_stone");
    expect(result).toEqual({ type: "fragments", cardId: "sling_stone", amount: 5 });
  });

  it("converts a Rare duplicate at its 1-copy limit", () => {
    expect(getMaxCopies("rare")).toBe(1);
    const profile = { cardCollection: { ark_covenant: 1 } };
    expect(grantCardOrFragments(profile, "ark_covenant")).toEqual({ type: "fragments", cardId: "ark_covenant", amount: 12 });
  });

  it("converts a Legendary duplicate at its 1-copy limit", () => {
    expect(getMaxCopies("legendary")).toBe(1);
    const profile = { cardCollection: { angel_lord: 1 } };
    expect(grantCardOrFragments(profile, "angel_lord")).toEqual({ type: "fragments", cardId: "angel_lord", amount: 35 });
  });

  it("converts an Epic duplicate at its (default) 1-copy limit", () => {
    const profile = { cardCollection: { righteous_aim: 1 } };
    expect(grantCardOrFragments(profile, "righteous_aim")).toEqual({ type: "fragments", cardId: "righteous_aim", amount: 20 });
  });

  it("does not alter deck-copy limits (getMaxCopies is untouched)", () => {
    expect(getMaxCopies("common")).toBe(2);
    expect(getMaxCopies("uncommon")).toBe(2);
    expect(getMaxCopies("rare")).toBe(1);
    expect(getMaxCopies("legendary")).toBe(1);
  });

  it("never returns both a card grant and Fragments for the same call", () => {
    const underCap = grantCardOrFragments({ cardCollection: { sling_stone: 0 } }, "sling_stone");
    const atCap = grantCardOrFragments({ cardCollection: { sling_stone: 2 } }, "sling_stone");
    expect(underCap.type === "card" && underCap.amount === undefined).toBe(true);
    expect(atCap.type === "fragments" && atCap.cardId === "sling_stone").toBe(true);
    expect(underCap.type).not.toBe(atCap.type);
  });

  it("falls back to a card grant for an unknown cardId rather than crashing", () => {
    expect(() => grantCardOrFragments({ cardCollection: {} }, "totally_unknown_card")).not.toThrow();
    expect(grantCardOrFragments({ cardCollection: {} }, "totally_unknown_card")).toEqual({ type: "card", cardId: "totally_unknown_card" });
  });

  it("Fragment amount is never negative for any rarity", () => {
    for (const rarity of Object.keys(DUPLICATE_FRAGMENT_AMOUNTS)) {
      expect(DUPLICATE_FRAGMENT_AMOUNTS[rarity]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Fragments do not award Faith Shards or expose crafting", () => {
  it("grantCardOrFragments's result shape has no Faith Shard or crafting fields", () => {
    const result = grantCardOrFragments({ cardCollection: { sling_stone: 2 } }, "sling_stone");
    expect(result.faithShards).toBeUndefined();
    expect(result.crafted).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(["amount", "cardId", "type"]);
  });
});

describe("existing rarity caps remain unchanged (no regression from the prior task)", () => {
  it("Easy rewards are still capped at Rare", () => {
    expect(resolveMaxRewardRarity("easy", "boss")).toBe("rare");
    expect(resolveMaxRewardRarity("easy", "normal")).toBe("rare");
  });

  it("Normal ordinary rewards are still capped at Rare, boss/milestone unchanged", () => {
    expect(resolveMaxRewardRarity("normal", "normal")).toBe("rare");
    expect(resolveMaxRewardRarity("normal", "boss")).toBe("legendary");
  });

  it("Hard is still uncapped", () => {
    expect(resolveMaxRewardRarity("hard", "boss")).toBe("legendary");
  });

  it("Epic still does not ride along with the Rare tier", () => {
    expect(cardsOfTier("rare").some((c) => c.id === "righteous_aim")).toBe(false);
  });
});

describe("shouldAwardDuplicateGoldBonus — legacy Gold bonus removed on conversion", () => {
  it("Duplicate Common at the ownership limit grants 5 Fragments and 0 bonus Gold", () => {
    const profile = { cardCollection: { sling_stone: 2 } };
    const grant = grantCardOrFragments(profile, "sling_stone");
    expect(grant).toEqual({ type: "fragments", cardId: "sling_stone", amount: 5 });
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(false);
  });

  it("Duplicate Uncommon at the ownership limit grants 8 Fragments and 0 bonus Gold", () => {
    const profile = { cardCollection: { wisdom: 2 } };
    const grant = grantCardOrFragments(profile, "wisdom");
    expect(grant).toEqual({ type: "fragments", cardId: "wisdom", amount: 8 });
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(false);
  });

  it("Duplicate Rare at the ownership limit grants 12 Fragments and 0 bonus Gold", () => {
    const profile = { cardCollection: { ark_covenant: 1 } };
    const grant = grantCardOrFragments(profile, "ark_covenant");
    expect(grant).toEqual({ type: "fragments", cardId: "ark_covenant", amount: 12 });
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(false);
  });

  it("Duplicate Epic at the ownership limit grants 20 Fragments and 0 bonus Gold", () => {
    const profile = { cardCollection: { righteous_aim: 1 } };
    const grant = grantCardOrFragments(profile, "righteous_aim");
    expect(grant).toEqual({ type: "fragments", cardId: "righteous_aim", amount: 20 });
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(false);
  });

  it("Duplicate Legendary at the ownership limit grants 35 Fragments and 0 bonus Gold", () => {
    const profile = { cardCollection: { angel_lord: 1 } };
    const grant = grantCardOrFragments(profile, "angel_lord");
    expect(grant).toEqual({ type: "fragments", cardId: "angel_lord", amount: 35 });
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(false);
  });

  it("a new (never-owned) card grant is a card, not Fragments, and never triggers the bonus check", () => {
    const grant = grantCardOrFragments({ cardCollection: {} }, "sling_stone");
    expect(grant.type).toBe("card");
    expect(shouldAwardDuplicateGoldBonus(false, grant)).toBe(false);
  });

  it("the allowed 2nd Common copy still grants normally and keeps the Gold bonus", () => {
    const profile = { cardCollection: { sling_stone: 1 } };
    const grant = grantCardOrFragments(profile, "sling_stone");
    expect(grant.type).toBe("card");
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(true);
  });

  it("the allowed 2nd Uncommon copy still grants normally and keeps the Gold bonus", () => {
    const profile = { cardCollection: { wisdom: 1 } };
    const grant = grantCardOrFragments(profile, "wisdom");
    expect(grant.type).toBe("card");
    expect(shouldAwardDuplicateGoldBonus(true, grant)).toBe(true);
  });

  it("never awards the bonus for a false/undefined alreadyOwned flag regardless of grant type", () => {
    expect(shouldAwardDuplicateGoldBonus(false, { type: "card" })).toBe(false);
    expect(shouldAwardDuplicateGoldBonus(undefined, { type: "card" })).toBe(false);
  });

  it("ordinary battle/reward Gold values (DUPLICATE_GOLD_BONUS) are unchanged", () => {
    expect(DUPLICATE_GOLD_BONUS).toEqual({
      common: 5,
      uncommon: 10,
      rare: 15,
      legendary: 40,
    });
  });
});
