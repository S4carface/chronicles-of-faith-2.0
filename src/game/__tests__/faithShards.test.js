import { describe, it, expect } from "vitest";
import {
  sanitizeFaithShards,
  getFaithShardBalance,
  addFaithShards,
  spendFaithShards,
  FRAGMENT_RESERVES,
  FRAGMENT_TO_SHARD_RATES,
  getFragmentReserve,
  getFragmentToShardRate,
  getConvertibleFragmentAmount,
  getFaithShardConversionPreview,
  convertExcessFragmentsToFaithShards,
  getConversionButtonLabel,
  CARD_CRAFT_COSTS,
  getCardCraftEligibility,
  getCardFragmentBalance,
  addCardFragments,
  DUPLICATE_FRAGMENT_AMOUNTS,
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
const EPIC_CARD = "righteous_aim";
const LEGENDARY_CARD = "angel_lord";

function profileFor({ cardCollection = {}, cardFragments = {}, gold = 0, faithShards = 0 } = {}) {
  return { cardCollection, cardFragments, gold, faithShards };
}

// VictoryScreen.jsx cannot be imported directly in this node test env (no
// jsdom; it pulls in browser-only modules via GameContext.jsx). This mirrors
// the exact Faith Shards completion-reward decision from its mount effect —
// see the comment there — so the decision logic is directly unit-testable.
function simulateVictoryFaithShards(profile, completedDifficulty) {
  if (completedDifficulty === "normal" && !profile.genesisNormalCompleted) return 25;
  if (completedDifficulty === "hard") return profile.genesisHardCompleted ? 15 : 75;
  return 0;
}

describe("sanitizeFaithShards — profile schema", () => {
  it("missing value defaults to 0", () => {
    expect(sanitizeFaithShards(undefined)).toBe(0);
    expect(sanitizeFaithShards(null)).toBe(0);
  });

  it("negative value normalizes to 0", () => {
    expect(sanitizeFaithShards(-10)).toBe(0);
  });

  it("decimal value floors safely", () => {
    expect(sanitizeFaithShards(12.9)).toBe(12);
  });

  it("invalid string normalizes safely", () => {
    expect(sanitizeFaithShards("not a number")).toBe(0);
    expect(sanitizeFaithShards("25")).toBe(25);
  });

  it("NaN and Infinity normalize to 0", () => {
    expect(sanitizeFaithShards(NaN)).toBe(0);
    expect(sanitizeFaithShards(Infinity)).toBe(0);
  });

  it("migration is idempotent", () => {
    const once = sanitizeFaithShards(sanitizeFaithShards(17));
    expect(once).toBe(17);
    expect(sanitizeFaithShards(sanitizeFaithShards(sanitizeFaithShards(-5)))).toBe(0);
  });
});

describe("getFaithShardBalance / addFaithShards / spendFaithShards", () => {
  it("reads a sanitized balance from the profile", () => {
    expect(getFaithShardBalance(profileFor({ faithShards: 25 }))).toBe(25);
    expect(getFaithShardBalance(profileFor({ faithShards: -5 }))).toBe(0);
    expect(getFaithShardBalance({})).toBe(0);
  });

  it("addFaithShards adds to the existing balance", () => {
    expect(addFaithShards(profileFor({ faithShards: 25 }), 75)).toBe(100);
  });

  it("addFaithShards never goes negative even with a negative delta", () => {
    expect(addFaithShards(profileFor({ faithShards: 5 }), -100)).toBe(0);
  });

  it("spendFaithShards subtracts and never goes negative", () => {
    expect(spendFaithShards(profileFor({ faithShards: 10 }), 4)).toBe(6);
    expect(spendFaithShards(profileFor({ faithShards: 10 }), 100)).toBe(0);
  });

  it("existing cards/Fragments/Gold remain unchanged by these pure balance helpers", () => {
    const profile = profileFor({ cardCollection: { sling_stone: 2 }, cardFragments: { sling_stone: 5 }, gold: 300, faithShards: 10 });
    addFaithShards(profile, 25);
    expect(profile.cardCollection).toEqual({ sling_stone: 2 });
    expect(profile.cardFragments).toEqual({ sling_stone: 5 });
    expect(profile.gold).toBe(300);
  });
});

describe("Faith Shard completion rewards", () => {
  it("first Normal victory grants 25", () => {
    expect(simulateVictoryFaithShards({ genesisNormalCompleted: false }, "normal")).toBe(25);
  });

  it("second (repeat) Normal victory grants 0", () => {
    expect(simulateVictoryFaithShards({ genesisNormalCompleted: true }, "normal")).toBe(0);
  });

  it("Easy victory grants 0", () => {
    expect(simulateVictoryFaithShards({}, "easy")).toBe(0);
  });

  it("first Hard victory grants 75", () => {
    expect(simulateVictoryFaithShards({ genesisHardCompleted: false }, "hard")).toBe(75);
  });

  it("repeat Hard victory grants 15", () => {
    expect(simulateVictoryFaithShards({ genesisHardCompleted: true }, "hard")).toBe(15);
  });

  it("Daily victory grants 0 (Daily's difficulty value never matches normal/hard)", () => {
    expect(simulateVictoryFaithShards({}, "daily_standard")).toBe(0);
  });

  it("Tutorial grants 0 (tutorial runs never reach the victory-reward path)", () => {
    // Tutorial completion is a structurally separate flow that never sets a
    // campaign difficulty of normal/hard, so it can never satisfy either
    // branch of the reward decision.
    expect(simulateVictoryFaithShards({}, undefined)).toBe(0);
  });

  it("Loss/abandonment grants 0 (this decision only ever runs on a real victory)", () => {
    // DefeatScreen never invokes the victory reward path at all; there is no
    // difficulty value for which a loss could reach this function.
    expect(simulateVictoryFaithShards({ genesisNormalCompleted: false }, undefined)).toBe(0);
  });

  it("the completion reward cannot double-trigger on a rerender/re-application", () => {
    // Simulates the mount-effect firing twice in a row, applying its own
    // output profile update before the second "run" — the durable
    // genesisNormalCompleted flag prevents a second Normal reward.
    let profile = { genesisNormalCompleted: false, faithShards: 0 };
    const firstAward = simulateVictoryFaithShards(profile, "normal");
    expect(firstAward).toBe(25);
    profile = { ...profile, genesisNormalCompleted: true, faithShards: addFaithShards(profile, firstAward) };
    const secondAward = simulateVictoryFaithShards(profile, "normal");
    expect(secondAward).toBe(0);
    expect(profile.faithShards).toBe(25);
  });

  it("an existing pre-update Normal completion does not retroactively grant Shards", () => {
    // A player who already completed Normal before this update shipped has
    // genesisNormalCompleted already true, so their next Normal victory
    // (a *new* one) correctly gets 0 from this decision — never a retroactive
    // grant for the completion that already happened before Faith Shards existed.
    expect(simulateVictoryFaithShards({ genesisNormalCompleted: true }, "normal")).toBe(0);
  });

  it("an existing pre-update Hard completion does not retroactively grant the first-Hard bonus", () => {
    expect(simulateVictoryFaithShards({ genesisHardCompleted: true }, "hard")).toBe(15);
    expect(simulateVictoryFaithShards({ genesisHardCompleted: true }, "hard")).not.toBe(75);
  });
});

describe("Fragment reserves (Part 4)", () => {
  it("Common reserve is 20", () => {
    expect(FRAGMENT_RESERVES.common).toBe(20);
    expect(getFragmentReserve(getCardById(COMMON_CARD))).toBe(20);
  });
  it("Uncommon reserve is 40", () => {
    expect(FRAGMENT_RESERVES.uncommon).toBe(40);
    expect(getFragmentReserve(getCardById(UNCOMMON_CARD))).toBe(40);
  });
  it("Rare reserve is 80", () => {
    expect(FRAGMENT_RESERVES.rare).toBe(80);
    expect(getFragmentReserve(getCardById(RARE_CARD))).toBe(80);
  });
  it("Epic reserve is 140", () => {
    expect(FRAGMENT_RESERVES.epic).toBe(140);
    expect(getFragmentReserve(getCardById(EPIC_CARD))).toBe(140);
  });
  it("Legendary reserve is 250", () => {
    expect(FRAGMENT_RESERVES.legendary).toBe(250);
    expect(getFragmentReserve(getCardById(LEGENDARY_CARD))).toBe(250);
  });
  it("Mythic conversion is unavailable (no reserve/rate entry, no cards)", () => {
    expect(FRAGMENT_RESERVES.mythic).toBeUndefined();
    expect(FRAGMENT_TO_SHARD_RATES.mythic).toBeUndefined();
    expect(cardsOfTier("mythic")).toEqual([]);
  });
});

describe("Fragment-to-Shard conversion rates (Part 4)", () => {
  it("Common rate is 10:1", () => {
    expect(FRAGMENT_TO_SHARD_RATES.common).toBe(10);
    expect(getFragmentToShardRate(getCardById(COMMON_CARD))).toBe(10);
  });
  it("Uncommon rate is 8:1", () => {
    expect(FRAGMENT_TO_SHARD_RATES.uncommon).toBe(8);
  });
  it("Rare rate is 5:1", () => {
    expect(FRAGMENT_TO_SHARD_RATES.rare).toBe(5);
  });
  it("Epic rate is 3:1", () => {
    expect(FRAGMENT_TO_SHARD_RATES.epic).toBe(3);
  });
  it("Legendary rate is 2:1", () => {
    expect(FRAGMENT_TO_SHARD_RATES.legendary).toBe(2);
  });
});

describe("getConvertibleFragmentAmount", () => {
  it("is 0 for a card below max ownership regardless of Fragments", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 1 }, cardFragments: { [COMMON_CARD]: 999 } });
    expect(getConvertibleFragmentAmount(profile, COMMON_CARD)).toBe(0);
  });

  it("is the exact excess above the reserve at max ownership", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 } });
    expect(getConvertibleFragmentAmount(profile, COMMON_CARD)).toBe(15); // 35 - 20
  });

  it("is 0 (never negative) when Fragments are at or below the reserve", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 20 } });
    expect(getConvertibleFragmentAmount(profile, COMMON_CARD)).toBe(0);
  });

  it("is 0 for an unknown card", () => {
    expect(getConvertibleFragmentAmount(profileFor(), "not_a_real_card")).toBe(0);
  });
});

describe("getFaithShardConversionPreview — the worked example from the spec", () => {
  it("35 Fragments, reserve 20, rate 10:1 → spend 10, gain 1, retain 25 (5 excess left unconverted)", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 } });
    const preview = getFaithShardConversionPreview(profile, COMMON_CARD);
    expect(preview.eligible).toBe(true);
    expect(preview.excess).toBe(15);
    expect(preview.fragmentsSpent).toBe(10);
    expect(preview.shardsGained).toBe(1);
    expect(preview.remainingFragments).toBe(25);
  });
});

describe("getFaithShardConversionPreview — eligibility failures", () => {
  it("card below max ownership cannot convert (not_max_owned)", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 1 }, cardFragments: { [COMMON_CARD]: 999 } });
    const preview = getFaithShardConversionPreview(profile, COMMON_CARD);
    expect(preview.eligible).toBe(false);
    expect(preview.reason).toBe("not_max_owned");
  });

  it("no excess Fragments cannot convert (no_excess_fragments)", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 20 } });
    const preview = getFaithShardConversionPreview(profile, COMMON_CARD);
    expect(preview.eligible).toBe(false);
    expect(preview.reason).toBe("no_excess_fragments");
  });

  it("excess below one full rate unit cannot convert (insufficient_convertible_amount)", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 25 } }); // excess = 5, rate = 10
    const preview = getFaithShardConversionPreview(profile, COMMON_CARD);
    expect(preview.eligible).toBe(false);
    expect(preview.reason).toBe("insufficient_convertible_amount");
    expect(preview.excess).toBe(5);
  });

  it("unknown card fails safely", () => {
    const preview = getFaithShardConversionPreview(profileFor(), "not_a_real_card");
    expect(preview.eligible).toBe(false);
    expect(preview.reason).toBe("unknown_card");
  });

  it("unsupported rarity (Mythic, hypothetically) fails safely — no game card currently has one", () => {
    // No card is Mythic, so this documents the structural guarantee: any
    // rarity absent from FRAGMENT_RESERVES/FRAGMENT_TO_SHARD_RATES resolves
    // to unsupported_rarity rather than crashing.
    expect(getFragmentReserve({ rarity: "mythic" })).toBeNull();
    expect(getFaithShardConversionPreview(profileFor(), COMMON_CARD).eligible).toBe(false); // 0 fragments, not max owned
  });
});

describe("convertExcessFragmentsToFaithShards — atomic conversion", () => {
  it("spends exact Fragments and adds exact Faith Shards", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 }, faithShards: 0 });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(10);
    expect(result.faithShardsGained).toBe(1);
    expect(result.remainingFragments).toBe(25);
    expect(result.newProfile.cardFragments[COMMON_CARD]).toBe(25);
    expect(result.newProfile.faithShards).toBe(1);
  });

  it("never consumes the protected reserve", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 } });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.newProfile.cardFragments[COMMON_CARD]).toBeGreaterThanOrEqual(FRAGMENT_RESERVES.common);
  });

  it("preserves a partial remainder as Fragments (does not force-convert below the reserve)", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 } }); // 15 excess, only 10 converts
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.newProfile.cardFragments[COMMON_CARD]).toBe(25); // 5 excess remains unconverted
  });

  it("preserves other cards' Fragment balances", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35, righteous_aim: 100 } });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.newProfile.cardFragments.righteous_aim).toBe(100);
  });

  it("preserves Gold", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 }, gold: 777 });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.newProfile.gold).toBe(777);
  });

  it("preserves existing owned card counts", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2, prayer: 2 }, cardFragments: { [COMMON_CARD]: 35 } });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(result.newProfile.cardCollection).toEqual({ [COMMON_CARD]: 2, prayer: 2 });
  });

  it("does not mutate the input profile", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 35 } });
    convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(profile.cardFragments[COMMON_CARD]).toBe(35);
    expect(profile.faithShards).toBe(0);
  });

  it("unknown card fails safely and spends nothing", () => {
    const result = convertExcessFragmentsToFaithShards(profileFor({ gold: 100 }), "not_a_real_card");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("unknown_card");
    expect(result.newProfile).toBeUndefined();
  });

  it("unsupported rarity / not-max-owned / no-excess all fail and spend nothing", () => {
    const notMaxed = convertExcessFragmentsToFaithShards(profileFor({ cardCollection: { [COMMON_CARD]: 1 }, cardFragments: { [COMMON_CARD]: 999 } }), COMMON_CARD);
    expect(notMaxed.success).toBe(false);
    expect(notMaxed.reason).toBe("not_max_owned");
    expect(notMaxed.newProfile).toBeUndefined();

    const noExcess = convertExcessFragmentsToFaithShards(profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 20 } }), COMMON_CARD);
    expect(noExcess.success).toBe(false);
    expect(noExcess.reason).toBe("no_excess_fragments");
  });

  it("Uncommon conversion at rate 8:1", () => {
    const profile = profileFor({ cardCollection: { [UNCOMMON_CARD]: 2 }, cardFragments: { [UNCOMMON_CARD]: 48 } }); // reserve 40, excess 8
    const result = convertExcessFragmentsToFaithShards(profile, UNCOMMON_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(8);
    expect(result.faithShardsGained).toBe(1);
  });

  it("Rare conversion at rate 5:1", () => {
    const profile = profileFor({ cardCollection: { [RARE_CARD]: 1 }, cardFragments: { [RARE_CARD]: 85 } }); // reserve 80, excess 5
    const result = convertExcessFragmentsToFaithShards(profile, RARE_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(5);
    expect(result.faithShardsGained).toBe(1);
  });

  it("Epic conversion at rate 3:1", () => {
    const profile = profileFor({ cardCollection: { [EPIC_CARD]: 1 }, cardFragments: { [EPIC_CARD]: 143 } }); // reserve 140, excess 3
    const result = convertExcessFragmentsToFaithShards(profile, EPIC_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(3);
    expect(result.faithShardsGained).toBe(1);
  });

  it("Legendary conversion at rate 2:1", () => {
    const profile = profileFor({ cardCollection: { [LEGENDARY_CARD]: 1 }, cardFragments: { [LEGENDARY_CARD]: 252 } }); // reserve 250, excess 2
    const result = convertExcessFragmentsToFaithShards(profile, LEGENDARY_CARD);
    expect(result.success).toBe(true);
    expect(result.fragmentsSpent).toBe(2);
    expect(result.faithShardsGained).toBe(1);
  });
});

describe("sequential and rapid conversions", () => {
  it("two sequential conversions of the same card accumulate Faith Shards correctly", () => {
    let profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 45 }, faithShards: 0 }); // excess 25 -> 2 shards, 5 left over

    const first = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(first.success).toBe(true);
    profile = first.newProfile;
    expect(profile.cardFragments[COMMON_CARD]).toBe(25); // 45 - 20 (2 units of 10)
    expect(profile.faithShards).toBe(2);

    // A second attempt now only has 5 excess (25-20), below one rate unit.
    const second = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(second.success).toBe(false);
    expect(second.reason).toBe("insufficient_convertible_amount");
  });

  it("rapid double conversion cannot overspend — the second call revalidates against the first's true result", () => {
    let profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 30 }, faithShards: 0 }); // excess 10 -> exactly 1 shard

    const first = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(first.success).toBe(true);
    profile = first.newProfile;
    expect(profile.cardFragments[COMMON_CARD]).toBe(20); // fully back to reserve, no excess left

    const second = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    expect(second.success).toBe(false);
    expect(second.reason).toBe("no_excess_fragments");
    expect(profile.cardFragments[COMMON_CARD]).toBe(20); // unchanged — no overspend
  });
});

describe("getConversionButtonLabel — Collection disabled reasons", () => {
  it("shows 'Convert' when eligible", () => {
    const preview = getFaithShardConversionPreview(profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 30 } }), COMMON_CARD);
    expect(getConversionButtonLabel(preview)).toBe("Convert");
  });

  it("shows the exact excess deficit toward the next rate unit", () => {
    const preview = getFaithShardConversionPreview(profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 25 } }), COMMON_CARD); // excess 5, rate 10
    expect(getConversionButtonLabel(preview)).toBe("Need 5 more excess Fragments");
  });

  it("shows a deficit of the full rate when there is no excess at all", () => {
    const preview = getFaithShardConversionPreview(profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 20 } }), COMMON_CARD);
    expect(getConversionButtonLabel(preview)).toBe("Need 10 more excess Fragments");
  });

  it("shows a message when below max ownership", () => {
    const preview = getFaithShardConversionPreview(profileFor({ cardCollection: { [COMMON_CARD]: 1 } }), COMMON_CARD);
    expect(getConversionButtonLabel(preview)).toBe("Reach Maximum Copies First");
  });
});

describe("Faith Shards persist after save/reload", () => {
  it("round-trips a converted balance through JSON", () => {
    const profile = profileFor({ cardCollection: { [COMMON_CARD]: 2 }, cardFragments: { [COMMON_CARD]: 30 }, faithShards: 5 });
    const result = convertExcessFragmentsToFaithShards(profile, COMMON_CARD);
    localStorage.setItem("faith-shards-test", JSON.stringify(result.newProfile));
    const restored = JSON.parse(localStorage.getItem("faith-shards-test"));
    expect(restored.faithShards).toBe(6);
    expect(restored.cardFragments[COMMON_CARD]).toBe(20);
  });
});

describe("regression — unrelated systems unchanged", () => {
  it("Common/Uncommon/Rare crafting costs remain unchanged", () => {
    expect(CARD_CRAFT_COSTS.common).toEqual({ fragments: 20, gold: 50 });
    expect(CARD_CRAFT_COSTS.uncommon).toEqual({ fragments: 40, gold: 150 });
    expect(CARD_CRAFT_COSTS.rare).toEqual({ fragments: 80, gold: 400 });
  });

  it("crafting still works exactly as before Faith Shards existed", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 20 }, gold: 50 });
    const eligibility = getCardCraftEligibility(profile, COMMON_CARD);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.cost).toEqual({ fragments: 20, gold: 50 });
  });

  it("duplicate Fragment reward values remain unchanged", () => {
    expect(DUPLICATE_FRAGMENT_AMOUNTS).toEqual({
      common: 5,
      uncommon: 8,
      rare: 12,
      epic: 20,
      legendary: 35,
    });
  });

  it("existing reward rarity caps remain unchanged", () => {
    expect(resolveMaxRewardRarity("easy", "boss")).toBe("rare");
    expect(resolveMaxRewardRarity("hard", "boss")).toBe("legendary");
  });

  it("Shop pool/duplicate behavior remains unchanged", () => {
    const commonPack = SHOP_ITEMS.find((i) => i.id === "shop_common_card");
    const pool = getShopPurchasePool(commonPack, { collectedCards: [COMMON_CARD] });
    expect(pool.some((c) => c.id === COMMON_CARD)).toBe(true);
    const result = purchaseCardPack(commonPack, { gold: 200 }, () => 0);
    expect(result.ok).toBe(true);
    expect(result.newGold).toBe(150);
  });

  it("getCardFragmentBalance/addCardFragments are unaffected by Faith Shard helpers", () => {
    const profile = profileFor({ cardFragments: { [COMMON_CARD]: 10 } });
    expect(getCardFragmentBalance(profile, COMMON_CARD)).toBe(10);
    expect(addCardFragments(profile, COMMON_CARD, 5)).toEqual({ [COMMON_CARD]: 15 });
  });
});
