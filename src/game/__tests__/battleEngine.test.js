import { describe, it, expect } from "vitest";
import {
  createBattleState,
  enemyTurn,
  getEnemyTurnSteps,
  checkBattleEnd,
} from "@/game/battleEngine";
import { createRng } from "@/game/mapGenerator";
import { ENEMIES } from "@/data/enemies";
import { HERO_MAP } from "@/data/heroes";

const enemy = ENEMIES.serpent;
const deck = HERO_MAP.adam.starterDeck;

// A minimal enemy whose only action is a recoil attack, so the forced-first
// enemy action is always that attack — lets us test recoil deterministically.
function makeRecoilEnemy(hp) {
  return {
    id: "test_ragebeast",
    name: "Ragebeast",
    icon: "🔥",
    hp,
    attacks: [{ name: "Rage", damage: 5, icon: "🔥", effect: "recoil", recoil: 3 }],
  };
}

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

describe("Recoil (e.g. Jealous Rage)", () => {
  it("applies the declared recoil to the attacker exactly once", () => {
    const recoiler = makeRecoilEnemy(20);
    const state = createBattleState(recoiler, 35, 35, deck, 0, 0, "adam", createRng("recoil-seed"));
    expect(state.enemyIntent.effect).toBe("recoil");

    const after = enemyTurn(state);
    // Enemy started at 20, takes exactly 3 recoil (once) -> 17.
    expect(after.enemy.currentHp).toBe(17);
    // Player took the 5 attack damage.
    expect(after.playerHp).toBe(30);
    // Log mentions the recoil exactly once.
    const recoilLines = after.log.filter((l) => /recoil/i.test(l));
    expect(recoilLines.length).toBe(1);
  });

  it("does not reduce recoil (no design flag says to)", () => {
    const recoiler = makeRecoilEnemy(50);
    const state = createBattleState(recoiler, 35, 35, deck, 0, 0, "adam", createRng("recoil-seed-2"));
    const after = enemyTurn(state);
    expect(after.enemy.currentHp).toBe(47); // full 3 recoil
  });

  it("can defeat the enemy and the battle ends in victory", () => {
    const recoiler = makeRecoilEnemy(3); // exactly lethal to recoil
    const state = createBattleState(recoiler, 35, 35, deck, 0, 0, "adam", createRng("recoil-lethal"));
    const after = enemyTurn(state);
    expect(after.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(after)).toBe("victory");
  });

  it("surfaces recoil once in the animated enemy-turn steps and reflects it in state", () => {
    const recoiler = makeRecoilEnemy(20);
    const state = createBattleState(recoiler, 35, 35, deck, 0, 0, "adam", createRng("recoil-steps"));
    const steps = getEnemyTurnSteps(state);
    const actionStep = steps.find((s) => s.type === "action");
    expect(actionStep).toBeTruthy();
    expect(actionStep.recoilHit).toBe(3);
    expect(actionStep.state.enemy.currentHp).toBe(17);
    // Only one action step (enemy performs one action/turn) -> recoil once.
    expect(steps.filter((s) => s.type === "action").length).toBe(1);
  });

  it("recoil-lethal enemy-turn step ends the battle in victory", () => {
    const recoiler = makeRecoilEnemy(3);
    const state = createBattleState(recoiler, 35, 35, deck, 0, 0, "adam", createRng("recoil-steps-lethal"));
    const steps = getEnemyTurnSteps(state);
    const actionStep = steps.find((s) => s.type === "action");
    expect(actionStep.state.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(actionStep.state)).toBe("victory");
  });
});
