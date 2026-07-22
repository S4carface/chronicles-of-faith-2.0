import { describe, it, expect } from "vitest";
import {
  createBattleState,
  enemyTurn,
  getEnemyTurnSteps,
  checkBattleEnd,
  getMarkRule,
} from "@/game/battleEngine";
import { getIntentExplanation } from "@/game/intentExplanations";
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

// ---------------------------------------------------------------------------
// Cain campaign rebalance — Mark of Cain cooldown + draw-reduction floor.
// ---------------------------------------------------------------------------

const MARK = {
  name: "Mark of Cain",
  damage: 5,
  icon: "👁️",
  effect: "skip_draw",
  cost: 1,
  description: "Draw 1 fewer card next turn",
};
const STRIKE = { name: "Brother's Strike", damage: 7, icon: "👊", cost: 1 };

function makeCainEnemy() {
  return {
    id: "cain_wrath",
    name: "Cain's Wrath",
    icon: "😡",
    hp: 32,
    attacks: [{ ...STRIKE }, { ...MARK }],
  };
}

// A battle state where Cain is about to resolve Mark of Cain, with a non-Mark
// alternative available for the following intent. `handSize` controls how much
// room the player has to draw on the coming enemy turn.
function cainMarkState(difficulty, handSize = 2, mode = "campaign") {
  const state = createBattleState(
    makeCainEnemy(),
    35,
    35,
    deck,
    0,
    0,
    "adam",
    createRng("cain-seed"),
    { mode, difficulty }
  );
  if (difficulty === "easy") state.drawToFull = true;
  return {
    ...state,
    hand: state.hand.slice(0, handSize),
    enemyHand: [{ ...MARK }],
    enemyDeck: [{ ...MARK }, { ...STRIKE }],
    enemyEnergy: 3,
    enemyMaxEnergy: 3,
    markCooldown: 0,
  };
}

const isMark = (a) => !!a && a.effect === "skip_draw" && a.name === "Mark of Cain";

describe("Cain rebalance — getMarkRule scope", () => {
  it("returns per-difficulty cooldowns for Cain in the campaign", () => {
    const base = { enemy: { id: "cain_wrath" }, mode: "campaign" };
    expect(getMarkRule({ ...base, difficulty: "easy" })).toEqual({ cooldown: 4, allowZeroDraw: false });
    expect(getMarkRule({ ...base, difficulty: "normal" })).toEqual({ cooldown: 3, allowZeroDraw: false });
    expect(getMarkRule({ ...base, difficulty: "hard" })).toEqual({ cooldown: 2, allowZeroDraw: true });
  });

  it("never applies to the Daily Challenge or to non-Cain enemies", () => {
    expect(getMarkRule({ enemy: { id: "cain_wrath" }, mode: "daily", difficulty: "normal" })).toBeNull();
    expect(getMarkRule({ enemy: { id: "serpent" }, mode: "campaign", difficulty: "normal" })).toBeNull();
  });
});

describe("Cain rebalance — Mark of Cain cooldown", () => {
  it("cannot occur on two consecutive turns (next intent is not Mark)", () => {
    const after = enemyTurn(cainMarkState("normal"));
    expect(isMark(after.enemyIntent)).toBe(false);
  });

  it("uses a 4-turn cooldown on Easy", () => {
    expect(enemyTurn(cainMarkState("easy", 3)).markCooldown).toBe(4);
  });

  it("uses a 3-turn cooldown on Normal", () => {
    expect(enemyTurn(cainMarkState("normal")).markCooldown).toBe(3);
  });

  it("uses a 2-turn cooldown on Hard", () => {
    expect(enemyTurn(cainMarkState("hard")).markCooldown).toBe(2);
  });

  it("keeps attacking with ordinary attacks while Mark recovers", () => {
    const after = enemyTurn(cainMarkState("normal"));
    expect(after.enemyIntent.name).toBe("Brother's Strike");
    expect(after.enemyIntent.damage).toBeGreaterThan(0);
  });

  it("survives intermediate state updates (spread) between turns", () => {
    const afterMark = enemyTurn(cainMarkState("normal")); // cooldown 3
    // Simulate a player action spreading over the state before the next turn.
    const afterPlayer = { ...afterMark, playerHp: 20, energy: 3 };
    const afterNext = enemyTurn(afterPlayer);
    expect(afterNext.markCooldown).toBe(2); // ticked down, not reset/lost
  });

  it("expires after the correct number of turns and frees Mark again", () => {
    let s = enemyTurn(cainMarkState("normal")); // Mark resolves, cooldown 3
    expect(s.markCooldown).toBe(3);
    s = enemyTurn(s); // 2
    s = enemyTurn(s); // 1
    expect(s.markCooldown).toBe(1);
    expect(isMark(s.enemyIntent)).toBe(false); // still unavailable
    s = enemyTurn(s); // 0 — expires
    expect(s.markCooldown).toBe(0);
    expect(s.log.some((l) => /ready again/i.test(l))).toBe(true);
  });
});

describe("Cain rebalance — draw-reduction floor", () => {
  it("Easy never reduces the draw below 1 card", () => {
    // Hand of 3 → base draw 1 (drawToFull), skip would make it 0 → floored to 1.
    const after = enemyTurn(cainMarkState("easy", 3));
    expect(after.hand.length).toBe(4);
  });

  it("Normal never reduces the draw below 1 card", () => {
    // Hand of 2 → base draw 1, skip would make it 0 → floored to 1.
    const after = enemyTurn(cainMarkState("normal", 2));
    expect(after.hand.length).toBe(3);
  });

  it("Hard may reduce the draw to 0, but only once before cooldown", () => {
    const afterMark = enemyTurn(cainMarkState("hard", 2));
    // 1 → 0 this turn: hand did not grow.
    expect(afterMark.hand.length).toBe(2);
    // And Mark is now on cooldown, so it cannot shut down the draw again next turn.
    expect(afterMark.markCooldown).toBe(2);
    expect(isMark(afterMark.enemyIntent)).toBe(false);
  });
});

describe("Cain rebalance — battle log", () => {
  it("records the draw reduction and the cooldown start when Mark resolves", () => {
    const after = enemyTurn(cainMarkState("normal"));
    expect(after.log.some((l) => /Mark of Cain/.test(l) && /draw/i.test(l))).toBe(true);
    expect(after.log.some((l) => /unavailable for 3 turns/i.test(l))).toBe(true);
  });

  it("records when the cooldown expires", () => {
    let s = enemyTurn(cainMarkState("normal"));
    s = enemyTurn(s);
    s = enemyTurn(s);
    s = enemyTurn(s); // expiry turn
    expect(s.log.some((l) => /ready again/i.test(l))).toBe(true);
  });
});

describe("Cain rebalance — intent explanation", () => {
  const cain = makeCainEnemy();

  it("shows the draw effect and cooldown on Easy/Normal", () => {
    const normalText = getIntentExplanation(MARK, cain, { mode: "campaign", difficulty: "normal" });
    expect(normalText).toMatch(/at least 1 card/i);
    expect(normalText).toMatch(/3 turns/);

    const easyText = getIntentExplanation(MARK, cain, { mode: "campaign", difficulty: "easy" });
    expect(easyText).toMatch(/4 turns/);
  });

  it("warns that Hard may reduce the draw to 0 and shows its cooldown", () => {
    const hardText = getIntentExplanation(MARK, cain, { mode: "campaign", difficulty: "hard" });
    expect(hardText).toMatch(/to 0/);
    expect(hardText).toMatch(/2 turns/);
  });

  it("keeps the generic wording for the Daily Challenge (unchanged)", () => {
    const dailyText = getIntentExplanation(MARK, cain, { mode: "daily", difficulty: "normal" });
    expect(dailyText).toMatch(/1 fewer card/i);
  });
});

describe("Cain rebalance — no regressions", () => {
  it("does not add a cooldown or floor in the Daily Challenge (Mark still zeroes the draw)", () => {
    const after = enemyTurn(cainMarkState("normal", 2, "daily"));
    expect(after.markCooldown).toBe(0); // untouched
    expect(after.hand.length).toBe(2); // 1 → 0, no floor applied
  });

  it("leaves Jealous Rage recoil intact on Cain", () => {
    const cain = {
      id: "cain_wrath",
      name: "Cain's Wrath",
      icon: "😡",
      hp: 20,
      attacks: [{ name: "Jealous Rage", damage: 9, icon: "🔥", effect: "recoil", recoil: 3, cost: 1 }],
    };
    let state = createBattleState(cain, 35, 35, deck, 0, 0, "adam", createRng("cain-recoil"), {
      mode: "campaign",
      difficulty: "normal",
    });
    state = { ...state, enemyHand: [{ ...cain.attacks[0] }], enemyEnergy: 3, enemyMaxEnergy: 3 };
    const after = enemyTurn(state);
    expect(after.enemy.currentHp).toBe(17); // 20 - 3 recoil, exactly once
    expect(after.log.filter((l) => /recoil/i.test(l)).length).toBe(1);
  });
});
