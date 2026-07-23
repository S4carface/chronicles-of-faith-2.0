import { describe, it, expect } from "vitest";
import {
  createBattleState,
  enemyTurn,
  getEnemyTurnSteps,
  checkBattleEnd,
  getMarkRule,
  getDrawDenialRule,
  isDrawDenialAction,
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
// Deferred inert effects no longer promise player-facing disruption.
// ---------------------------------------------------------------------------

describe("Deferred effects (drain/discard/random_card) — honest text", () => {
  const enemy = ENEMIES.serpent;

  it("drain intent no longer claims Faith loss", () => {
    const text = getIntentExplanation({ name: "Whisper of Doubt", damage: 3, effect: "drain" }, enemy);
    expect(text).not.toMatch(/lose 1 faith/i);
    expect(text).toMatch(/deceptive attack/i);
  });

  it("discard intent no longer claims a forced discard", () => {
    const text = getIntentExplanation({ name: "Temptation", damage: 4, effect: "discard" }, enemy);
    expect(text).not.toMatch(/discard 1 card/i);
    expect(text).toMatch(/disruptive strike/i);
  });

  it("random_card intent no longer claims a forced card play", () => {
    const text = getIntentExplanation({ name: "Deception", damage: 4, effect: "random_card" }, enemy);
    expect(text).not.toMatch(/force/i);
    expect(text).toMatch(/disruptive strike/i);
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
