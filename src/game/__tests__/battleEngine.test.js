import { describe, it, expect } from "vitest";
import {
  createBattleState,
  enemyTurn,
  getEnemyTurnSteps,
  checkBattleEnd,
  getMarkRule,
  getDrawDenialRule,
  getDrainRule,
  getDiscardRule,
  getCompelRule,
  isDrawDenialAction,
  startPlayerTurn,
  resolveForcedDiscard,
  resolveCompelled,
  selectCompelledCard,
  playCard,
  RIGHTEOUS_AIM_CAP,
} from "@/game/battleEngine";
import { getIntentExplanation } from "@/game/intentExplanations";
import { createRng } from "@/game/mapGenerator";
import { ENEMIES } from "@/data/enemies";
import { HERO_MAP } from "@/data/heroes";
import { getCardById } from "@/data/cards";

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

// ---------------------------------------------------------------------------
// Generic (non-Cain) draw-denial fairness.
// ---------------------------------------------------------------------------

const DENIAL = { name: "Blinding Darkness", damage: 5, icon: "🌑", effect: "skip_draw", cost: 1, description: "Draw 1 fewer card next turn" };
const CITY = { name: "City of Wickedness", damage: 8, icon: "🔥", cost: 1 };

function makeDenialEnemy(id = "sodom_corruption") {
  return { id, name: "Corruption of Sodom", icon: "🔥", hp: 38, attacks: [{ ...CITY }, { ...DENIAL }] };
}

// State where a non-Cain enemy is about to resolve Blinding Darkness (skip_draw),
// with a non-denial alternative available for the following intent.
function denialState(difficulty, handSize = 2, mode = "campaign", id = "sodom_corruption") {
  const s = createBattleState(makeDenialEnemy(id), 35, 35, deck, 0, 0, "adam", createRng("denial"), { mode, difficulty });
  if (difficulty === "easy") s.drawToFull = true;
  return {
    ...s,
    hand: s.hand.slice(0, handSize),
    enemyHand: [{ ...DENIAL }],
    enemyDeck: [{ ...DENIAL }, { ...CITY }],
    enemyEnergy: 3,
    enemyMaxEnergy: 3,
    markCooldown: 0,
  };
}

describe("Generic draw-denial rule", () => {
  it("applies to any campaign enemy, not just Cain", () => {
    expect(getDrawDenialRule({ enemy: { id: "sodom_corruption" }, mode: "campaign", difficulty: "normal" }))
      .toEqual({ cooldown: 3, allowZeroDraw: false });
    expect(getDrawDenialRule({ enemy: { id: "sodom_corruption" }, mode: "campaign", difficulty: "hard" }))
      .toEqual({ cooldown: 2, allowZeroDraw: true });
  });

  it("is disabled in the Daily Challenge (mode daily)", () => {
    expect(getDrawDenialRule({ enemy: { id: "sodom_corruption" }, mode: "daily", difficulty: "normal" })).toBeNull();
  });

  it("keeps Cain's signature 4/3/2 cooldowns intact", () => {
    expect(getMarkRule({ enemy: { id: "cain_wrath" }, mode: "campaign", difficulty: "easy" }).cooldown).toBe(4);
    expect(getMarkRule({ enemy: { id: "cain_wrath" }, mode: "campaign", difficulty: "normal" }).cooldown).toBe(3);
    expect(getMarkRule({ enemy: { id: "cain_wrath" }, mode: "campaign", difficulty: "hard" }).cooldown).toBe(2);
  });
});

describe("Non-Cain draw denial — floor and cooldown", () => {
  it("Normal never reduces the draw below 1", () => {
    const after = enemyTurn(denialState("normal", 2));
    expect(after.hand.length).toBe(3); // drew 1 despite skip (floored)
    expect(after.drawReduced).toBe(false); // no card actually lost
  });

  it("Hard may reduce Draw 1 to Draw 0", () => {
    const after = enemyTurn(denialState("hard", 2));
    expect(after.hand.length).toBe(2); // drew 0
    expect(after.drawReduced).toBe(true);
  });

  it("Normal cooldown is 3 turns", () => {
    expect(enemyTurn(denialState("normal")).markCooldown).toBe(3);
  });

  it("Hard cooldown is 2 turns", () => {
    expect(enemyTurn(denialState("hard")).markCooldown).toBe(2);
  });

  it("cannot occur on consecutive turns (next intent is not draw denial)", () => {
    const after = enemyTurn(denialState("normal"));
    expect(isDrawDenialAction(after.enemyIntent)).toBe(false);
    expect(after.enemyIntent.name).toBe("City of Wickedness");
  });

  it("respects cooldown for a boss-modifier-style source too", () => {
    // Simulate a boss carrying a spreading_chaos skip_draw ("Scattered Thoughts").
    const boss = { id: "babel_tower", name: "Tower of Babel", icon: "🏯", hp: 60, isBoss: true, attacks: [{ ...CITY }] };
    const scatter = { name: "Scattered Thoughts", damage: 6, icon: "🌪️", effect: "skip_draw", cost: 1, description: "Draw 1 fewer card next turn" };
    let s = createBattleState(boss, 40, 40, deck, 0, 0, "adam", createRng("boss-denial"), { mode: "campaign", difficulty: "normal" });
    s = { ...s, enemyHand: [{ ...scatter }], enemyDeck: [{ ...scatter }, { ...CITY }], enemyEnergy: 3, enemyMaxEnergy: 3, markCooldown: 0 };
    const after = enemyTurn(s);
    expect(after.markCooldown).toBe(3);
    expect(isDrawDenialAction(after.enemyIntent)).toBe(false);
  });

  it("cooldown persists through intermediate state updates", () => {
    const afterDenial = enemyTurn(denialState("normal")); // cooldown 3
    const afterPlayer = { ...afterDenial, playerHp: 20, energy: 3 };
    expect(enemyTurn(afterPlayer).markCooldown).toBe(2);
  });

  it("records applied and cooldown-started log lines", () => {
    const after = enemyTurn(denialState("normal"));
    expect(after.log.some((l) => /Blinding Darkness/.test(l) && /draw/i.test(l))).toBe(true);
    expect(after.log.some((l) => /Blinding Darkness recovers — unavailable for 3 turns/i.test(l))).toBe(true);
  });

  it("records a cooldown-expired log line and names the source", () => {
    let s = enemyTurn(denialState("normal")); // resolves, cooldown 3
    s = enemyTurn(s); // 2
    s = enemyTurn(s); // 1
    s = enemyTurn(s); // 0 — expires
    expect(s.markCooldown).toBe(0);
    expect(s.log.some((l) => /Blinding Darkness is ready again/i.test(l))).toBe(true);
  });

  it("is disabled in Daily (no floor, no cooldown — behavior unchanged)", () => {
    const after = enemyTurn(denialState("normal", 2, "daily"));
    expect(after.markCooldown).toBe(0);
    expect(after.hand.length).toBe(2); // 1 → 0, no floor applied
  });

  it("produces a deterministic sequence for the same seed", () => {
    let a = denialState("normal");
    let b = denialState("normal");
    for (let i = 0; i < 3; i++) { a = enemyTurn(a); b = enemyTurn(b); }
    expect(a.log).toEqual(b.log);
    expect(a.enemyIntent).toEqual(b.enemyIntent);
    expect(a.markCooldown).toBe(b.markCooldown);
  });
});

// ---------------------------------------------------------------------------
// Esau's Burning Grudge recoil (data fix).
// ---------------------------------------------------------------------------

describe("Esau — Burning Grudge recoil", () => {
  const grudge = () => ({ ...ENEMIES.esau_anger.attacks.find((a) => a.name === "Burning Grudge"), cost: 1 });

  it("data now carries recoil: 3", () => {
    expect(ENEMIES.esau_anger.attacks.find((a) => a.name === "Burning Grudge").recoil).toBe(3);
  });

  it("applies exactly 3 recoil to Esau (no double)", () => {
    const esau = { ...ENEMIES.esau_anger, hp: 20 };
    let s = createBattleState(esau, 35, 35, deck, 0, 0, "adam", createRng("esau"), { mode: "campaign", difficulty: "normal" });
    s = { ...s, enemyHand: [grudge()], enemyEnergy: 3, enemyMaxEnergy: 3 };
    const after = enemyTurn(s);
    expect(after.enemy.currentHp).toBe(17); // 20 - 3, once
    expect(after.log.filter((l) => /recoil/i.test(l)).length).toBe(1);
  });

  it("recoil can defeat Esau and end the battle in victory", () => {
    const esau = { ...ENEMIES.esau_anger, hp: 3 };
    let s = createBattleState(esau, 35, 35, deck, 0, 0, "adam", createRng("esau-lethal"), { mode: "campaign", difficulty: "normal" });
    s = { ...s, enemyHand: [grudge()], enemyEnergy: 3, enemyMaxEnergy: 3 };
    const after = enemyTurn(s);
    expect(after.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(after)).toBe("victory");
  });
});


// ---------------------------------------------------------------------------
// Righteous Aim (Epic) — bounded double-damage on the next Attack only.
// ---------------------------------------------------------------------------

const AIM = getCardById("righteous_aim");

// A battle state with a high-HP dummy enemy (no block) and ample Faith so we
// can chain card plays and read the damage dealt.
function aimState(heroId = null) {
  const dummy = { id: "dummy", name: "Dummy", icon: "🎯", hp: 300, attacks: [{ name: "Poke", damage: 1 }] };
  const s = createBattleState(dummy, 60, 60, deck, 0, 0, heroId, createRng("aim"));
  return { ...s, energy: 20, maxEnergy: 20, enemyBlock: 0 };
}

// Damage a single card deals from a given state (enemy HP delta).
function damageOf(before, after) {
  return before.enemy.currentHp - after.enemy.currentHp;
}

describe("Righteous Aim — bounded doubling", () => {
  it("has a cap constant of 12", () => {
    expect(RIGHTEOUS_AIM_CAP).toBe(12);
  });

  it("doubles a small Attack fully (6 → 12)", () => {
    const primed = playCard(aimState(), 0, AIM);
    const after = playCard(primed, 0, getCardById("sling_stone")); // 6
    expect(damageOf(primed, after)).toBe(12);
  });

  it("doubles a mid Attack fully (9 → 18)", () => {
    const primed = playCard(aimState(), 0, AIM);
    const after = playCard(primed, 0, getCardById("rams_horn")); // 9
    expect(damageOf(primed, after)).toBe(18);
  });

  it("caps the added bonus at +12 (14 → 26, not 28)", () => {
    const primed = playCard(aimState(), 0, AIM);
    const after = playCard(primed, 0, getCardById("pillar_fire")); // 14
    expect(damageOf(primed, after)).toBe(26);
  });

  it("applies Adam's +1 before the cap (12 +1 = 13 → 25)", () => {
    const primed = playCard(aimState("adam"), 0, AIM);
    const after = playCard(primed, 0, getCardById("sling_david")); // 12 (+1 Adam) = 13
    expect(damageOf(primed, after)).toBe(25);
  });

  it("does NOT apply to Miracle cards (Parting Waters stays 15)", () => {
    const primed = playCard(aimState(), 0, AIM);
    const after = playCard(primed, 0, getCardById("parting_waters")); // miracle 15
    expect(damageOf(primed, after)).toBe(15);
  });

  it("is consumed after one Attack (second Attack is normal)", () => {
    const primed = playCard(aimState(), 0, AIM);
    const first = playCard(primed, 0, getCardById("sling_stone"));
    expect(damageOf(primed, first)).toBe(12); // doubled
    const second = playCard(first, 0, getCardById("sling_stone"));
    expect(damageOf(first, second)).toBe(6); // normal
  });

  it("persists through a non-Attack card until an Attack consumes it", () => {
    const primed = playCard(aimState(), 0, AIM);
    // Play a defense card (Faith Shield) — should not consume the Aim.
    const afterDef = playCard(primed, 0, getCardById("faith_shield"));
    const afterAtk = playCard(afterDef, 0, getCardById("sling_stone"));
    expect(damageOf(afterDef, afterAtk)).toBe(12); // still doubled
  });
});

// ---------------------------------------------------------------------------
// Faith Drain (Phase 2A) — pending status resolved at player-turn start.
// ---------------------------------------------------------------------------

const DRAIN = { name: "Whisper of Doubt", damage: 3, icon: "💬", effect: "drain", cost: 1, description: "Lose 1 Faith next turn" };
const BITE = { name: "Venomous Bite", damage: 5, icon: "🦷", cost: 1 };

function makeDrainEnemy(id = "serpent") {
  return { id, name: "The Serpent", icon: "🐍", hp: 26, attacks: [{ ...BITE }, { ...DRAIN }] };
}

// State where a drain enemy is about to resolve Whisper of Doubt, with a
// non-drain alternative for the following intent. `maxEnergy` sets the Faith the
// player will begin next turn with (enemyTurn refills to maxEnergy).
function drainState(difficulty, mode = "campaign", maxEnergy = 3) {
  const s = createBattleState(makeDrainEnemy(), 35, 35, deck, 0, 0, "adam", createRng("drain"), { mode, difficulty });
  return {
    ...s,
    maxEnergy,
    energy: maxEnergy,
    enemyHand: [{ ...DRAIN }],
    enemyDeck: [{ ...DRAIN }, { ...BITE }],
    enemyEnergy: 3,
    enemyMaxEnergy: 3,
  };
}

describe("getDrainRule", () => {
  it("floors at 1 on Normal (cooldown 3) and allows 0 on Hard (cooldown 2)", () => {
    expect(getDrainRule({ difficulty: "normal" })).toEqual({ cooldown: 3, allowZero: false });
    expect(getDrainRule({ difficulty: "hard" })).toEqual({ cooldown: 2, allowZero: true });
  });
  it("uses the safe floor-1 rule for Daily (daily_standard)", () => {
    expect(getDrainRule({ mode: "daily", difficulty: "daily_standard" })).toEqual({ cooldown: 3, allowZero: false });
  });
});

describe("Faith Drain — application", () => {
  it("still deals the action's normal attack damage", () => {
    const after = enemyTurn(drainState("normal"));
    expect(after.playerHp).toBe(32); // 35 - 3
  });

  it("applies a pending drain (not resolved until player-turn start)", () => {
    const after = enemyTurn(drainState("normal"));
    expect(after.faithDrainPending).toBe(1);
    expect(after.energy).toBe(3); // full — not yet drained
  });

  it("logs the application telegraph", () => {
    const after = enemyTurn(drainState("normal"));
    expect(after.log.some((l) => /Faith Drain/.test(l) && /next turn/i.test(l))).toBe(true);
  });
});

describe("Faith Drain — resolution at player-turn start", () => {
  it("Normal reduces Faith by 1 but never below 1", () => {
    expect(startPlayerTurn(enemyTurn(drainState("normal", "campaign", 3))).energy).toBe(2);
    expect(startPlayerTurn(enemyTurn(drainState("normal", "campaign", 1))).energy).toBe(1); // retained
  });

  it("Hard may reduce Faith to 0", () => {
    expect(startPlayerTurn(enemyTurn(drainState("hard", "campaign", 1))).energy).toBe(0);
    expect(startPlayerTurn(enemyTurn(drainState("hard", "campaign", 3))).energy).toBe(2);
  });

  it("never produces negative Faith (0 Faith stays 0)", () => {
    expect(startPlayerTurn(enemyTurn(drainState("hard", "campaign", 0))).energy).toBe(0);
    expect(startPlayerTurn(enemyTurn(drainState("normal", "campaign", 0))).energy).toBe(0);
  });

  it("never modifies maximum Faith", () => {
    const resolved = startPlayerTurn(enemyTurn(drainState("normal", "campaign", 3)));
    expect(resolved.maxEnergy).toBe(3);
  });

  it("consumes the pending status once (idempotent)", () => {
    const once = startPlayerTurn(enemyTurn(drainState("normal", "campaign", 3)));
    expect(once.faithDrainPending).toBe(0);
    expect(once.energy).toBe(2);
    const twice = startPlayerTurn(once); // no-op
    expect(twice.energy).toBe(2);
    expect(twice.faithDrainPending).toBe(0);
  });

  it("logs the resolution honestly per outcome", () => {
    expect(startPlayerTurn(enemyTurn(drainState("normal", "campaign", 3))).log.some((l) => /Faith Drain activated\. 1 Faith lost/i.test(l))).toBe(true);
    expect(startPlayerTurn(enemyTurn(drainState("normal", "campaign", 1))).log.some((l) => /retained 1 Faith/i.test(l))).toBe(true);
    expect(startPlayerTurn(enemyTurn(drainState("hard", "campaign", 1))).log.some((l) => /reduced to 0/i.test(l))).toBe(true);
  });
});

describe("Faith Drain — cooldown", () => {
  it("Normal cooldown is 3, Hard cooldown is 2", () => {
    expect(enemyTurn(drainState("normal")).enemyEffectCooldowns.drain).toBe(3);
    expect(enemyTurn(drainState("hard")).enemyEffectCooldowns.drain).toBe(2);
  });

  it("cannot occur on consecutive turns (next intent is not drain)", () => {
    const after = enemyTurn(drainState("normal"));
    expect(after.enemyIntent.effect).not.toBe("drain");
    expect(after.enemyIntent.name).toBe("Venomous Bite");
  });

  it("cooldown persists through state updates and expires with a log", () => {
    let s = enemyTurn(drainState("normal")); // drain resolves, cd 3
    expect(s.enemyEffectCooldowns.drain).toBe(3);
    s = enemyTurn({ ...s, playerHp: 20 }); // 2
    s = enemyTurn(s); // 1
    expect(s.enemyEffectCooldowns.drain).toBe(1);
    s = enemyTurn(s); // 0 — expires
    expect(s.enemyEffectCooldowns.drain).toBe(0);
    expect(s.log.some((l) => /Whisper of Doubt is ready again/i.test(l))).toBe(true);
  });

  it("starts the cooldown with a named log line", () => {
    const after = enemyTurn(drainState("normal"));
    expect(after.log.some((l) => /Whisper of Doubt recovers — unavailable for 3 turns/i.test(l))).toBe(true);
  });
});

describe("Faith Drain — intent text", () => {
  const enemy = makeDrainEnemy();
  it("Normal telegraphs the floor and cooldown", () => {
    const text = getIntentExplanation(DRAIN, enemy, { mode: "campaign", difficulty: "normal" });
    expect(text).toMatch(/Lose 1 Faith/i);
    expect(text).toMatch(/keep at least 1 Faith/i);
    expect(text).toMatch(/3 turns/);
  });
  it("Hard warns Faith may fall to 0", () => {
    const text = getIntentExplanation(DRAIN, enemy, { mode: "campaign", difficulty: "hard" });
    expect(text).toMatch(/may fall to 0/i);
    expect(text).toMatch(/2 turns/);
  });
});

describe("Faith Drain — edge cases and coexistence", () => {
  it("survives a save/continue JSON round-trip and then resolves", () => {
    const after = enemyTurn(drainState("normal", "campaign", 3));
    const restored = JSON.parse(JSON.stringify(after));
    expect(restored.faithDrainPending).toBe(1);
    expect(restored.enemyEffectCooldowns.drain).toBe(3);
    const resolved = startPlayerTurn(restored);
    expect(resolved.energy).toBe(2);
    expect(resolved.faithDrainPending).toBe(0);
  });

  it("coexists with draw-denial cooldown without clobbering (independent fields)", () => {
    // Enemy with both a drain and a skip_draw action, forced to drain this turn.
    const enemy = { id: "corrupt_humanity", name: "Corrupt", icon: "x", hp: 34, attacks: [{ ...BITE }] };
    const skip = { name: "Blinding Darkness", damage: 5, effect: "skip_draw", cost: 1, description: "Draw 1 fewer card next turn" };
    let s = createBattleState(enemy, 35, 35, deck, 0, 0, "adam", createRng("coexist"), { mode: "campaign", difficulty: "normal" });
    // Pretend skip_draw already fired last turn (cooldown 2 remaining) and drain fires now.
    s = { ...s, enemyEffectCooldowns: { skip_draw: 2 }, enemyEffectNames: { skip_draw: "Blinding Darkness" }, markCooldown: 2, enemyHand: [{ ...DRAIN }], enemyDeck: [{ ...skip }, { ...BITE }], enemyEnergy: 3, enemyMaxEnergy: 3 };
    const after = enemyTurn(s);
    expect(after.enemyEffectCooldowns.drain).toBe(3); // drain cooldown started
    expect(after.enemyEffectCooldowns.skip_draw).toBe(1); // skip_draw ticked 2 → 1 independently
    expect(after.markCooldown).toBe(1); // mirror stays in sync with skip_draw
  });

  it("does not affect Cain's draw-denial behavior", () => {
    expect(getMarkRule({ enemy: { id: "cain_wrath" }, mode: "campaign", difficulty: "normal" }).cooldown).toBe(3);
  });

  it("remains deterministic in Daily and keeps the safe floor", () => {
    const a = startPlayerTurn(enemyTurn(drainState("normal", "daily", 3)));
    const b = startPlayerTurn(enemyTurn(drainState("normal", "daily", 3)));
    expect(a.log).toEqual(b.log);
    expect(a.energy).toBe(b.energy);
    expect(a.energy).toBe(2); // drained by 1
    expect(startPlayerTurn(enemyTurn(drainState("normal", "daily", 1))).energy).toBe(1); // floor 1 in Daily
  });
});

// ---------------------------------------------------------------------------
// Forced Discard (Phase 2B) — pending status resolved at player-turn start.
// ---------------------------------------------------------------------------

const DISCARD = { name: "Temptation", damage: 4, icon: "🍎", effect: "discard", cost: 1, description: "Discard 1 card" };
const VBITE = { name: "Venomous Bite", damage: 5, icon: "🦷", cost: 1 };

function makeDiscardEnemy(id = "serpent") {
  return { id, name: "The Serpent", icon: "🐍", hp: 26, attacks: [{ ...VBITE }, { ...DISCARD }] };
}

// State where a discard enemy is about to resolve Temptation, with a non-discard
// alternative for the following intent.
function discardEnemyTurnState(difficulty, mode = "campaign") {
  const s = createBattleState(makeDiscardEnemy(), 35, 35, deck, 0, 0, "adam", createRng("discard"), { mode, difficulty });
  return { ...s, enemyHand: [{ ...DISCARD }], enemyDeck: [{ ...DISCARD }, { ...VBITE }], enemyEnergy: 3, enemyMaxEnergy: 3 };
}

// A state with a pending discard and a controlled hand, for resolution tests.
function pendingDiscardState(difficulty, hand, mode = "campaign") {
  const s = createBattleState(makeDiscardEnemy(), 35, 35, deck, 0, 0, "adam", createRng("pd"), { mode, difficulty });
  return { ...s, hand, discardPending: 1, discardName: "Temptation" };
}

describe("getDiscardRule", () => {
  it("Normal lets the player choose (cooldown 3); Hard auto-selects (cooldown 2)", () => {
    expect(getDiscardRule({ difficulty: "normal" })).toEqual({ cooldown: 3, auto: false });
    expect(getDiscardRule({ difficulty: "hard" })).toEqual({ cooldown: 2, auto: true });
  });
  it("Daily uses seeded auto-selection", () => {
    expect(getDiscardRule({ mode: "daily", difficulty: "daily_standard" })).toEqual({ cooldown: 3, auto: true });
  });
});

describe("Forced Discard — application", () => {
  it("still deals the action's normal attack damage", () => {
    expect(enemyTurn(discardEnemyTurnState("hard")).playerHp).toBe(31); // 35 - 4
  });
  it("applies a pending discard with the source name", () => {
    const after = enemyTurn(discardEnemyTurnState("hard"));
    expect(after.discardPending).toBe(1);
    expect(after.discardName).toBe("Temptation");
  });
  it("logs the application telegraph", () => {
    const after = enemyTurn(discardEnemyTurnState("hard"));
    expect(after.log.some((l) => /Forced Discard/.test(l) && /next turn/i.test(l))).toBe(true);
  });
});

describe("Forced Discard — cooldown", () => {
  it("Normal cooldown 3, Hard cooldown 2", () => {
    expect(enemyTurn(discardEnemyTurnState("normal")).enemyEffectCooldowns.discard).toBe(3);
    expect(enemyTurn(discardEnemyTurnState("hard")).enemyEffectCooldowns.discard).toBe(2);
  });
  it("cannot occur on consecutive turns", () => {
    const after = enemyTurn(discardEnemyTurnState("hard"));
    expect(after.enemyIntent.effect).not.toBe("discard");
    expect(after.enemyIntent.name).toBe("Venomous Bite");
  });
});

describe("Forced Discard — Normal player choice", () => {
  it("prompts a choice without auto-removing a card", () => {
    const r = startPlayerTurn(pendingDiscardState("normal", ["sling_stone", "faith_shield", "prayer"]));
    expect(r.discardChoiceActive).toBe(true);
    expect(r.discardPending).toBe(1);
    expect(r.hand.length).toBe(3); // unchanged until the player picks
  });
  it("resolveForcedDiscard removes the chosen card and clears the status", () => {
    const r = startPlayerTurn(pendingDiscardState("normal", ["sling_stone", "faith_shield", "prayer"]));
    const done = resolveForcedDiscard(r, 0);
    expect(done.hand).toEqual(["faith_shield", "prayer"]);
    expect(done.discardChoiceActive).toBe(false);
    expect(done.discardPending).toBe(0);
    expect(done.discard).toContain("sling_stone");
    expect(done.log.some((l) => /You discarded Sling Stone/i.test(l))).toBe(true);
  });
});

describe("Forced Discard — Hard/Daily seeded auto-selection", () => {
  it("discards one card deterministically for the same seed", () => {
    const a = startPlayerTurn(pendingDiscardState("hard", ["sling_stone", "faith_shield", "prayer"]));
    const b = startPlayerTurn(pendingDiscardState("hard", ["sling_stone", "faith_shield", "prayer"]));
    expect(a.hand).toEqual(b.hand);
    expect(a.hand.length).toBe(2);
    expect(a.discardPending).toBe(0);
    expect(a.log.some((l) => /Temptation discarded/i.test(l))).toBe(true);
  });
  it("Daily selection is deterministic", () => {
    const a = startPlayerTurn(pendingDiscardState("daily_standard", ["sling_stone", "faith_shield", "prayer"], "daily"));
    const b = startPlayerTurn(pendingDiscardState("daily_standard", ["sling_stone", "faith_shield", "prayer"], "daily"));
    expect(a.hand).toEqual(b.hand);
    expect(a.hand.length).toBe(2);
  });
});

describe("Forced Discard — final-card protection and empty hand", () => {
  it("never discards the final card (1-card hand expires safely)", () => {
    const r = startPlayerTurn(pendingDiscardState("hard", ["sling_stone"]));
    expect(r.hand).toEqual(["sling_stone"]);
    expect(r.discardPending).toBe(0);
    expect(r.log.some((l) => /No card was discarded/i.test(l))).toBe(true);
  });
  it("empty hand expires safely", () => {
    const r = startPlayerTurn(pendingDiscardState("hard", []));
    expect(r.hand).toEqual([]);
    expect(r.discardPending).toBe(0);
    expect(r.log.some((l) => /No card was discarded/i.test(l))).toBe(true);
  });
  it("a 2-card hand keeps exactly one card after auto-discard", () => {
    const r = startPlayerTurn(pendingDiscardState("hard", ["sling_stone", "faith_shield"]));
    expect(r.hand.length).toBe(1);
  });
});

describe("Forced Discard — edge cases and coexistence", () => {
  it("survives a save/continue JSON round-trip and then resolves", () => {
    const after = enemyTurn(discardEnemyTurnState("hard"));
    const restored = JSON.parse(JSON.stringify(after));
    expect(restored.discardPending).toBe(1);
    expect(restored.enemyEffectCooldowns.discard).toBe(2);
    const resolved = startPlayerTurn(restored);
    expect(resolved.discardPending).toBe(0);
  });
  it("does not disturb Faith Drain or draw-denial rules", () => {
    expect(getDrainRule({ difficulty: "normal" })).toEqual({ cooldown: 3, allowZero: false });
    expect(getDrawDenialRule({ enemy: { id: "sodom_corruption" }, mode: "campaign", difficulty: "normal" }))
      .toEqual({ cooldown: 3, allowZeroDraw: false });
  });
  it("coexists with a Faith Drain cooldown via independent keys", () => {
    // Discard fires now while a drain cooldown is already ticking.
    let s = pendingDiscardState("hard", ["sling_stone", "faith_shield"]);
    s = { ...s, enemyEffectCooldowns: { drain: 2 }, enemyEffectNames: { drain: "Whisper of Doubt" },
          enemyHand: [{ ...DISCARD }], enemyDeck: [{ ...VBITE }], enemyEnergy: 3, enemyMaxEnergy: 3,
          discardPending: 0, discardName: null };
    const after = enemyTurn(s);
    expect(after.enemyEffectCooldowns.discard).toBe(2); // discard cooldown started
    expect(after.enemyEffectCooldowns.drain).toBe(1);   // drain ticked 2 → 1 independently
  });
});

// ---------------------------------------------------------------------------
// Compelled card play (Phase 2C) — one affordable card auto-played next turn.
// ---------------------------------------------------------------------------

const COMPEL = { name: "Deception", damage: 4, icon: "🎭", effect: "random_card", cost: 1 };

function makeCompelEnemy(id = "laban_deceit") {
  return { id, name: "Laban's Deceit", icon: "🐑", hp: 35, attacks: [{ ...VBITE }, { ...COMPEL }] };
}

function compelEnemyTurnState(difficulty, mode = "campaign") {
  const s = createBattleState(makeCompelEnemy(), 35, 35, deck, 0, 0, "adam", createRng("compel"), { mode, difficulty });
  return { ...s, enemyHand: [{ ...COMPEL }], enemyDeck: [{ ...COMPEL }, { ...VBITE }], enemyEnergy: 3, enemyMaxEnergy: 3 };
}

// A state with a pending Compelled and a controlled hand/energy/HP for resolution.
function pendingCompelState(difficulty, opts = {}, mode = "campaign") {
  const {
    hand = ["sling_stone"], energy = 3, playerHp = 35, maxPlayerHp = 35,
    blockScripture = false, freeCardsRemaining = 0, enemyHp = 30, enemyAttackMultiplier = 1,
  } = opts;
  const base = { id: "laban_deceit", name: "Laban's Deceit", icon: "🐑", hp: 40, attacks: [{ ...VBITE }] };
  const s = createBattleState(base, playerHp, maxPlayerHp, deck, 0, 0, "adam", createRng("pc"), { mode, difficulty });
  return {
    ...s,
    hand,
    energy,
    maxEnergy: Math.max(energy, 3),
    playerHp,
    maxPlayerHp,
    blockScripture,
    freeCardsRemaining,
    enemyAttackMultiplier,
    enemy: { ...s.enemy, currentHp: enemyHp },
    compelPending: 1,
    compelName: "Deception",
  };
}

describe("getCompelRule", () => {
  it("Normal previews (cooldown 3); Hard auto-plays (cooldown 2)", () => {
    expect(getCompelRule({ difficulty: "normal" })).toEqual({ cooldown: 3, preview: true });
    expect(getCompelRule({ difficulty: "hard" })).toEqual({ cooldown: 2, preview: false });
  });
  it("Daily auto-plays deterministically", () => {
    expect(getCompelRule({ mode: "daily", difficulty: "daily_standard" })).toEqual({ cooldown: 3, preview: false });
  });
});

describe("Compelled — application & cooldown", () => {
  it("applies once with the source name", () => {
    const after = enemyTurn(compelEnemyTurnState("hard"));
    expect(after.compelPending).toBe(1);
    expect(after.compelName).toBe("Deception");
  });
  it("Normal cooldown 3, Hard cooldown 2", () => {
    expect(enemyTurn(compelEnemyTurnState("normal")).enemyEffectCooldowns.random_card).toBe(3);
    expect(enemyTurn(compelEnemyTurnState("hard")).enemyEffectCooldowns.random_card).toBe(2);
  });
  it("cannot occur on consecutive turns", () => {
    expect(enemyTurn(compelEnemyTurnState("hard")).enemyIntent.effect).not.toBe("random_card");
  });
});

describe("Compelled — selection & resolution", () => {
  it("auto-plays one affordable card through the normal pipeline (Hard)", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["sling_stone", "righteous_strike"], energy: 1, enemyHp: 30 }));
    expect(r.compelledThisTurn).toBe("Sling Stone"); // righteous_strike (cost 2) unaffordable
    expect(r.hand).toEqual(["righteous_strike"]);
    expect(r.enemy.currentHp).toBe(23); // 30 - (6 + 1 Adam)
    expect(r.compelPending).toBe(0);
    expect(r.compelPreviewActive).toBe(false);
  });

  it("deducts the card's Faith cost exactly once and logs it", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["sling_stone"], energy: 3, enemyHp: 30 }));
    expect(r.energy).toBe(2); // 3 - 1
    expect(r.log.some((l) => /Compelled activated\. Sling Stone was played automatically\. 1 Faith spent/i.test(l))).toBe(true);
  });

  it("never drives Faith negative and expires when nothing is affordable", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["righteous_strike"], energy: 1, enemyHp: 30 }));
    expect(r.energy).toBe(1); // unchanged
    expect(r.compelPending).toBe(0);
    expect(r.log.some((l) => /Compelled faded\. No affordable card could be played/i.test(l))).toBe(true);
  });

  it("expires safely with an empty hand", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: [], energy: 3 }));
    expect(r.compelPending).toBe(0);
    expect(r.log.some((l) => /Compelled faded/i.test(l))).toBe(true);
  });

  it("avoids wasting a heal at full HP when another card exists", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["prayer", "sling_stone"], energy: 3, playerHp: 35, maxPlayerHp: 35 }));
    expect(r.compelledThisTurn).toBe("Sling Stone");
  });

  it("only forces a heal when below max HP and no non-healing card exists", () => {
    const belowHp = startPlayerTurn(pendingCompelState("hard", { hand: ["prayer"], energy: 3, playerHp: 20, maxPlayerHp: 35 }));
    expect(belowHp.compelledThisTurn).toBe("Prayer");
    const fullHp = startPlayerTurn(pendingCompelState("hard", { hand: ["prayer"], energy: 3, playerHp: 35, maxPlayerHp: 35 }));
    expect(fullHp.compelledThisTurn).toBeNull(); // faded — heal-only at full HP
    expect(fullHp.compelPending).toBe(0);
  });

  it("respects Silenced Scripture (won't force a blocked Scripture card)", () => {
    // Only a scripture card, silenced → nothing eligible → fade.
    const only = startPlayerTurn(pendingCompelState("hard", { hand: ["prayer"], energy: 3, playerHp: 20, blockScripture: true }));
    expect(only.compelPending).toBe(0);
    expect(only.compelledThisTurn).toBeNull();
    // Scripture blocked but an attack is available → play the attack.
    const withAtk = startPlayerTurn(pendingCompelState("hard", { hand: ["prayer", "sling_stone"], energy: 3, playerHp: 20, blockScripture: true }));
    expect(withAtk.compelledThisTurn).toBe("Sling Stone");
  });

  it("clears the pending status after resolution", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["sling_stone"], energy: 3 }));
    expect(r.compelPending).toBe(0);
    expect(r.compelPreviewActive).toBe(false);
  });
});

describe("Compelled — Normal preview + confirm", () => {
  it("stores a selection and raises a preview without playing yet", () => {
    const r = startPlayerTurn(pendingCompelState("normal", { hand: ["sling_stone", "faith_shield"], energy: 3, enemyHp: 30 }));
    expect(r.compelPreviewActive).toBe(true);
    expect(r.compelPending).toBe(1);
    expect(r.compelSelectedId).toBeTruthy();
    expect(r.enemy.currentHp).toBe(30); // not played yet
    expect(r.energy).toBe(3); // no Faith spent yet
  });
  it("resolveCompelled plays exactly the previewed card", () => {
    const preview = startPlayerTurn(pendingCompelState("normal", { hand: ["sling_stone", "faith_shield"], energy: 3, enemyHp: 30 }));
    const done = resolveCompelled(preview);
    expect(done.compelledThisTurn).toBeTruthy();
    expect(done.compelPending).toBe(0);
    expect(done.compelPreviewActive).toBe(false);
    expect(done.energy).toBeLessThan(3); // Faith spent now
  });
});

describe("Compelled — deterministic Daily & interactions", () => {
  it("selects the same card for the same seed/state (Daily)", () => {
    const a = startPlayerTurn(pendingCompelState("daily_standard", { hand: ["sling_stone", "faith_shield"], energy: 3 }, "daily"));
    const b = startPlayerTurn(pendingCompelState("daily_standard", { hand: ["sling_stone", "faith_shield"], energy: 3 }, "daily"));
    expect(a.compelledThisTurn).toBe(b.compelledThisTurn);
    expect(a.hand).toEqual(b.hand);
  });

  it("a forced attack can defeat the enemy (victory)", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["sling_stone"], energy: 3, enemyHp: 3 }));
    expect(r.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(r)).toBe("victory");
  });

  it("applies a pending Righteous Aim to the forced attack (capped)", () => {
    const r = startPlayerTurn(pendingCompelState("hard", { hand: ["sling_stone"], energy: 3, enemyHp: 30, enemyAttackMultiplier: 2 }));
    // 6 + 1 Adam = 7, Aim adds min(7,12) = 7 → 14 damage.
    expect(r.enemy.currentHp).toBe(16);
    expect(r.enemyAttackMultiplier).toBe(1); // Aim consumed
  });

  it("survives a save/continue JSON round-trip and then resolves", () => {
    const after = enemyTurn(compelEnemyTurnState("hard"));
    const restored = JSON.parse(JSON.stringify(after));
    expect(restored.compelPending).toBe(1);
    expect(restored.enemyEffectCooldowns.random_card).toBe(2);
    const resolved = startPlayerTurn(restored);
    expect(resolved.compelPending).toBe(0);
  });

  it("leaves drain, discard, and draw-denial rules untouched", () => {
    expect(getDrainRule({ difficulty: "normal" })).toEqual({ cooldown: 3, allowZero: false });
    expect(getDiscardRule({ difficulty: "normal" })).toEqual({ cooldown: 3, auto: false });
    expect(getDrawDenialRule({ enemy: { id: "sodom_corruption" }, mode: "campaign", difficulty: "normal" }))
      .toEqual({ cooldown: 3, allowZeroDraw: false });
  });
});
