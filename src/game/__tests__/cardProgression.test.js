import { describe, it, expect, beforeEach } from "vitest";
import {
  generateRewardCards,
  generateTreasureCard,
  resolveRewardOdds,
  getAbrahamsTestReward,
  cardsOfTier,
  REWARD_ODDS,
} from "@/game/deckRules";
import { applyStoryEffect } from "@/game/runEffects";
import { getCardById } from "@/data/cards";
import { createRng } from "@/game/mapGenerator";
import { TREASURE_REWARDS } from "@/data/genesisRooms";

// localStorage polyfill for the save/continue round-trip (node test env).
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const rarityOf = (id) => getCardById(id)?.rarity;
const RARE_OR_BETTER = new Set(["rare", "epic", "legendary"]);

describe("nextCardRare reward upgrade", () => {
  it("guarantees every reward is Rare or better when rareOrBetter is set", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const cards = generateRewardCards(createRng(seed), "normal", { rareOrBetter: true });
      expect(cards.length).toBe(3);
      for (const id of cards) expect(RARE_OR_BETTER.has(rarityOf(id))).toBe(true);
    }
  });

  it("without the flag, normal rewards can be Common (flag actually does something)", () => {
    // Aggregate a spread of seeds; at least one common should appear normally.
    let sawCommon = false;
    for (let i = 0; i < 40; i++) {
      const cards = generateRewardCards(createRng(`plain-${i}`), "normal");
      if (cards.some((id) => rarityOf(id) === "common")) sawCommon = true;
    }
    expect(sawCommon).toBe(true);
  });

  it("treasure honors rareOrBetter too", () => {
    for (const seed of ["t1", "t2", "t3"]) {
      const id = generateTreasureCard(createRng(seed), { rareOrBetter: true });
      expect(RARE_OR_BETTER.has(rarityOf(id))).toBe(true);
    }
  });
});

describe("story effect mapping (Faith/Block no longer buff attack)", () => {
  const run = { playerHp: 20, maxHp: 35, buffAttack: 0, gold: 10, startFaithNext: 0, startBlockNext: 0 };

  it("Faith reward modifies only Faith state, not attack", () => {
    const u = applyStoryEffect(run, { type: "faith", value: 2 });
    expect(u.startFaithNext).toBe(2);
    expect(u.buffAttack).toBeUndefined();
  });

  it("Block reward modifies only Block state, not attack", () => {
    const u = applyStoryEffect(run, { type: "block", value: 10 });
    expect(u.startBlockNext).toBe(10);
    expect(u.buffAttack).toBeUndefined();
  });

  it("attack-buff reward still buffs attack", () => {
    const u = applyStoryEffect(run, { type: "buff_attack", value: 10 });
    expect(u.buffAttack).toBe(10);
    expect(u.startFaithNext).toBeUndefined();
    expect(u.startBlockNext).toBeUndefined();
  });

  it("heal/damage/gold still map correctly", () => {
    expect(applyStoryEffect(run, { type: "heal", value: 8 }).playerHp).toBe(28);
    expect(applyStoryEffect(run, { type: "damage", value: -100 }).playerHp).toBe(1); // floored
    expect(applyStoryEffect(run, { type: "damage", value: -4, gold: 20 })).toEqual({ playerHp: 16, gold: 30 });
  });
});

describe("Righteous Aim rarity", () => {
  it("is Epic", () => {
    expect(getCardById("righteous_aim").rarity).toBe("epic");
  });

  it("no longer rides along with the Rare tier (Epic has no approved reward path yet)", () => {
    expect(cardsOfTier("rare").some((c) => c.id === "righteous_aim")).toBe(false);
  });

  it("cardsOfTier('epic') still resolves it directly (for a future approved milestone)", () => {
    expect(cardsOfTier("epic").map((c) => c.id)).toEqual(["righteous_aim"]);
  });
});

describe("Abraham's Test progression gating", () => {
  it("cannot grant a Legendary before first Genesis completion", () => {
    const id = getAbrahamsTestReward(false);
    expect(rarityOf(id)).toBe("rare");
    expect(rarityOf(id)).not.toBe("legendary");
  });

  it("restores the Legendary (Angel of the Lord) after completion", () => {
    const id = getAbrahamsTestReward(true);
    expect(id).toBe("angel_lord");
    expect(rarityOf(id)).toBe("legendary");
  });

  it("is deterministic (same input → same reward)", () => {
    expect(getAbrahamsTestReward(false)).toBe(getAbrahamsTestReward(false));
    expect(getAbrahamsTestReward(true)).toBe(getAbrahamsTestReward(true));
  });
});

describe("first-run random Legendary gating", () => {
  it("removes random Legendary and lowers Rare for normal/treasure in the first run", () => {
    const normal = resolveRewardOdds("normal", { firstRun: true });
    expect(normal.legendary).toBe(0);
    expect(normal.rare).toBeGreaterThanOrEqual(0.03);
    expect(normal.rare).toBeLessThanOrEqual(0.05);

    const treasure = resolveRewardOdds("treasure", { firstRun: true });
    expect(treasure.legendary).toBe(0);
    expect(treasure.rare).toBeGreaterThanOrEqual(0.08);
    expect(treasure.rare).toBeLessThanOrEqual(0.10);
  });

  it("never produces a Legendary from random normal/treasure rewards in the first run", () => {
    const rng = createRng("first-run-sweep");
    for (let i = 0; i < 200; i++) {
      const normal = generateRewardCards(rng, "normal", { firstRun: true });
      for (const id of normal) expect(rarityOf(id)).not.toBe("legendary");
      const treasure = generateTreasureCard(rng, { firstRun: true });
      expect(rarityOf(treasure)).not.toBe("legendary");
    }
  });

  it("restores the intended odds after first completion (firstRun false)", () => {
    expect(resolveRewardOdds("normal", { firstRun: false })).toEqual(REWARD_ODDS.normal);
    expect(resolveRewardOdds("treasure", { firstRun: false })).toEqual(REWARD_ODDS.treasure);
  });

  it("never gates boss rewards (boss keeps its Legendary chance)", () => {
    expect(resolveRewardOdds("boss", { firstRun: true })).toEqual(REWARD_ODDS.boss);
    expect(resolveRewardOdds("boss", { firstRun: true }).legendary).toBe(0.05);
  });
});

// Emergency progression brake — Easy and ordinary Normal rewards must never
// surface Epic/Legendary/Mythic, across every reward source and both a
// player's first Genesis completion and repeat runs.
describe("early-progression rarity cap (Easy)", () => {
  const HIGH_RARITY = new Set(["epic", "legendary", "mythic"]);

  it("first Easy completion (boss room, ungated firstRun path) never offers Epic/Legendary/Mythic", () => {
    for (const seed of ["easy1", "easy2", "easy3", "easy4", "easy5"]) {
      // Mirrors RewardScreen's isFirstCompletion branch: boss odds, no firstRun gating, difficulty cap only.
      const cards = generateRewardCards(createRng(seed), "boss", { difficulty: "easy" });
      for (const id of cards) expect(HIGH_RARITY.has(rarityOf(id))).toBe(false);
    }
  });

  it("Righteous Aim (Epic) cannot appear in a first Easy completion", () => {
    for (let i = 0; i < 100; i++) {
      const cards = generateRewardCards(createRng(`ra-${i}`), "boss", { difficulty: "easy" });
      expect(cards).not.toContain("righteous_aim");
    }
  });

  it("repeat Easy ordinary and treasure rewards never offer Epic/Legendary/Mythic", () => {
    const rng = createRng("repeat-easy-sweep");
    for (let i = 0; i < 200; i++) {
      const battle = generateRewardCards(rng, "normal", { difficulty: "easy" });
      for (const id of battle) expect(HIGH_RARITY.has(rarityOf(id))).toBe(false);
      const treasure = generateTreasureCard(rng, { difficulty: "easy" });
      expect(HIGH_RARITY.has(rarityOf(treasure))).toBe(false);
    }
  });

  it("repeat Easy final (boss) reward stays capped at Rare", () => {
    for (const seed of ["repeat1", "repeat2", "repeat3"]) {
      const cards = generateRewardCards(createRng(seed), "boss", { difficulty: "easy" });
      for (const id of cards) expect(HIGH_RARITY.has(rarityOf(id))).toBe(false);
    }
  });

  it("Easy boss/treasure/battle rewards are capped even when a random roll would have produced Legendary", () => {
    // A roll just under the boss odds' legendary threshold (0.05) would normally
    // produce Legendary; on Easy it must clamp down to Rare instead.
    const rng = () => 0.01;
    const cards = generateRewardCards(rng, "boss", { difficulty: "easy" });
    for (const id of cards) expect(rarityOf(id)).not.toBe("legendary");
    expect(rarityOf(generateTreasureCard(rng, { difficulty: "easy" }))).not.toBe("legendary");
  });
});

describe("ordinary Normal reward rarity cap", () => {
  it("ordinary Normal rewards (non-boss) never offer Epic or Legendary", () => {
    const rng = createRng("normal-ordinary-sweep");
    for (let i = 0; i < 200; i++) {
      const battle = generateRewardCards(rng, "normal", { difficulty: "normal" });
      for (const id of battle) expect(["epic", "legendary", "mythic"]).not.toContain(rarityOf(id));
      const treasure = generateTreasureCard(rng, { difficulty: "normal" });
      expect(["epic", "legendary", "mythic"]).not.toContain(rarityOf(treasure));
    }
  });

  it("a roll that would produce Legendary clamps to Rare for ordinary Normal rewards", () => {
    const rng = () => 0.005; // under treasure's 0.01 legendary threshold
    expect(rarityOf(generateTreasureCard(rng, { difficulty: "normal" }))).not.toBe("legendary");
  });

  it("Normal boss/final rewards are not capped by this brake (no approved Epic milestone changes this)", () => {
    // Epic is still impossible (cardsOfTier no longer folds it into Rare), but
    // Legendary keeps its existing boss odds on Normal — unchanged behavior.
    const rng = createRng("normal-boss-sweep");
    let sawLegendary = false;
    for (let i = 0; i < 300; i++) {
      const cards = generateRewardCards(rng, "boss", { difficulty: "normal" });
      if (cards.some((id) => rarityOf(id) === "legendary")) sawLegendary = true;
      for (const id of cards) expect(rarityOf(id)).not.toBe("epic");
    }
    expect(sawLegendary).toBe(true);
  });
});

describe("Hard difficulty rewards are unaffected by the rarity cap", () => {
  it("Hard keeps its existing Legendary odds on every room type", () => {
    const rng = createRng("hard-sweep");
    let sawLegendary = false;
    for (let i = 0; i < 300; i++) {
      const cards = generateRewardCards(rng, "boss", { difficulty: "hard" });
      if (cards.some((id) => rarityOf(id) === "legendary")) sawLegendary = true;
    }
    expect(sawLegendary).toBe(true);
  });

  it("omitting difficulty entirely preserves the old uncapped behavior", () => {
    const rng = createRng("no-difficulty-sweep");
    let sawLegendary = false;
    for (let i = 0; i < 300; i++) {
      const cards = generateRewardCards(rng, "boss", {});
      if (cards.some((id) => rarityOf(id) === "legendary")) sawLegendary = true;
    }
    expect(sawLegendary).toBe(true);
  });
});

describe("Mythic is unavailable everywhere", () => {
  it("no card in the game currently has Mythic rarity", () => {
    expect(cardsOfTier("mythic")).toEqual([]);
  });

  it("no reward odds table can roll Mythic", () => {
    for (const tier of Object.values(REWARD_ODDS)) {
      expect(tier.mythic).toBeUndefined();
    }
  });
});

describe("Babel 'Rare or better' does not leak Epic/Legendary into Easy", () => {
  it("rareOrBetter on Easy never exceeds Rare", () => {
    for (const seed of ["babel1", "babel2", "babel3", "babel4"]) {
      const cards = generateRewardCards(createRng(seed), "normal", { rareOrBetter: true, difficulty: "easy" });
      for (const id of cards) expect(rarityOf(id)).toBe("rare");
      const treasure = generateTreasureCard(createRng(seed), { rareOrBetter: true, difficulty: "easy" });
      expect(rarityOf(treasure)).toBe("rare");
    }
  });
});

describe("TREASURE_REWARDS fallback pool no longer contains Righteous Aim", () => {
  it("every fallback treasure reward is Rare (no Epic outlier)", () => {
    for (const id of TREASURE_REWARDS) {
      expect(rarityOf(id)).toBe("rare");
    }
    expect(TREASURE_REWARDS).not.toContain("righteous_aim");
  });
});

describe("reward determinism", () => {
  it("same seed → same reward set", () => {
    const a = generateRewardCards(createRng("det-seed"), "boss");
    const b = generateRewardCards(createRng("det-seed"), "boss");
    expect(a).toEqual(b);
  });

  it("same seed → same first-run gated set", () => {
    const a = generateRewardCards(createRng("det2"), "treasure", { firstRun: true });
    const b = generateRewardCards(createRng("det2"), "treasure", { firstRun: true });
    expect(a).toEqual(b);
  });
});

describe("save/continue preserves progression flags", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips nextCardRare and story start-of-battle rewards", async () => {
    const { saveStoryRun, loadStoryRun } = await import("@/game/storyRunSave");
    const run = {
      hero: { id: "adam" },
      phase: "map",
      playerHp: 20,
      deck: ["sling_stone"],
      isDaily: false,
      difficulty: "normal",
      nextCardRare: true,
      startFaithNext: 3,
      startBlockNext: 10,
    };
    saveStoryRun(run);
    const restored = loadStoryRun();
    expect(restored.nextCardRare).toBe(true);
    expect(restored.startFaithNext).toBe(3);
    expect(restored.startBlockNext).toBe(10);
  });
});
