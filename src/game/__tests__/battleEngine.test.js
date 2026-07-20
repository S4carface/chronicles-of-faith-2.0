import { describe, it, expect } from "vitest";
import { createBattleState, enemyTurn } from "@/game/battleEngine";
import { createRng } from "@/game/mapGenerator";
import { ENEMIES } from "@/data/enemies";
import { HERO_MAP } from "@/data/heroes";

const enemy = ENEMIES.serpent;
const deck = HERO_MAP.adam.starterDeck;

describe("Deterministic battle RNG (Daily Challenge)", () => {
  it("gives the same card draw order for the same seed", () => {
    const seed = "daily_challenge_2026_07_20";

    const stateA = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng(seed));
    const stateB = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng(seed));

    expect(stateA.hand).toEqual(stateB.hand);
    expect(stateA.deck).toEqual(stateB.deck);
    expect(stateA.enemyIntent).toEqual(stateB.enemyIntent);
  });

  it("gives the same enemy behavior sequence for the same seed across multiple turns", () => {
    const seed = "daily_challenge_2026_07_20";

    let a = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng(seed));
    let b = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng(seed));

    for (let i = 0; i < 3; i++) {
      a = enemyTurn(a);
      b = enemyTurn(b);
    }

    expect(a.log).toEqual(b.log);
    expect(a.playerHp).toBe(b.playerHp);
    expect(a.enemyIntent).toEqual(b.enemyIntent);
  });

  it("a different seed can produce a different draw order", () => {
    const stateA = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng("daily_challenge_2026_07_20"));
    const stateB = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng("daily_challenge_2026_07_21"));

    // Not guaranteed for every possible seed pair, but true for this sample —
    // demonstrates the seed actually drives the outcome rather than being ignored.
    expect(stateA.hand).not.toEqual(stateB.hand);
  });

  it("falls back to non-deterministic Math.random when no rng is supplied (regular runs)", () => {
    const state = createBattleState(enemy, 35, 35, deck, 0, 0, "adam");
    expect(typeof state.rng).toBe("function");
    expect(state.hand.length).toBeGreaterThan(0);
  });
});
