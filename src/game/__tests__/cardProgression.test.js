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

  it("still rides along with the Rare tier so it stays obtainable", () => {
    expect(cardsOfTier("rare").some((c) => c.id === "righteous_aim")).toBe(true);
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
