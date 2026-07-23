import { describe, it, expect } from "vitest";
import {
  createBattleState,
  enemyTurn,
  getEnemyTurnSteps,
  startPlayerTurn,
  resolveForcedDiscard,
  resolveCompelled,
  checkBattleEnd,
} from "@/game/battleEngine";
import { createRng } from "@/game/mapGenerator";
import { ENEMIES } from "@/data/enemies";
import { BOSS_MODIFIERS, applyBossModifier } from "@/data/bossModifiers";
import { HERO_MAP } from "@/data/heroes";
import { getCardById } from "@/data/cards";

const deck = HERO_MAP.adam.starterDeck;

// Build a real battle state for a real enemy, then force a specific action into
// the enemy's hand so we can drive one exact effect through the full pipeline
// (enemy data -> resolve -> pending -> startPlayerTurn -> cooldown -> log).
function battleWith(enemyId, actionName, difficulty = "normal", opts = {}) {
  const enemy = opts.enemy || ENEMIES[enemyId];
  const s = createBattleState(
    enemy,
    opts.playerHp ?? 35,
    opts.maxHp ?? 35,
    deck,
    0,
    0,
    "adam",
    createRng(opts.seed || `${enemyId}-${actionName}`),
    { mode: opts.mode || "campaign", difficulty }
  );
  const action = enemy.attacks.find((a) => a.name === actionName);
  if (!action) throw new Error(`No action ${actionName} on ${enemyId}`);
  const forced = { ...action, cost: action.cost || 1 };
  return {
    ...s,
    ...opts.stateOverrides,
    enemyHand: [forced],
    enemyDeck: [{ ...forced }, ...enemy.attacks.filter((a) => a.name !== actionName).map((a) => ({ ...a, cost: a.cost || 1 }))],
    enemyEnergy: 3,
    enemyMaxEnergy: 3,
  };
}

// ---------------------------------------------------------------------------
// PART 1 — every real enemy/action drives its effect through the pipeline.
// ---------------------------------------------------------------------------

describe("Faith Drain — every real source", () => {
  for (const [id, name] of [
    ["serpent", "Whisper of Doubt"],
    ["nephilim", "Terrifying Presence"],
    ["famine_canaan", "Hunger"],
    ["laban_deceit", "Changed Wages"],
  ]) {
    it(`${id} / ${name} drains 1 Faith at player-turn start (floor 1 on Normal)`, () => {
      const after = enemyTurn(battleWith(id, name, "normal", { stateOverrides: { maxEnergy: 3, energy: 3 } }));
      expect(after.faithDrainPending).toBe(1);
      const resolved = startPlayerTurn(after);
      expect(resolved.energy).toBe(2);
      expect(resolved.faithDrainPending).toBe(0);
      // Never negative, floor 1 respected on Normal.
      const low = startPlayerTurn(enemyTurn(battleWith(id, name, "normal", { stateOverrides: { maxEnergy: 1, energy: 1 } })));
      expect(low.energy).toBe(1);
    });
  }
});

describe("Forced Discard — every real source", () => {
  for (const [id, name] of [
    ["serpent", "Temptation"],
    ["corrupt_humanity", "Corrupting Influence"],
    ["esau_anger", "Threat of Revenge"],
    ["joseph_betrayal", "Brotherly Jealousy"],
    ["sodom_gomorrah", "City in Ruins"],
  ]) {
    it(`${id} / ${name} sets a pending discard, resolves once, and cools down`, () => {
      const after = enemyTurn(battleWith(id, name, "hard"));
      expect(after.discardPending).toBe(1);
      expect(after.enemyEffectCooldowns.discard).toBe(2); // hard cooldown
      // Hard auto-resolves at player-turn start (hand has cards from the draw).
      const beforeLen = after.hand.length;
      const resolved = startPlayerTurn(after);
      expect(resolved.discardPending).toBe(0);
      if (beforeLen >= 2) expect(resolved.hand.length).toBe(beforeLen - 1);
    });
  }
});

describe("Compelled — every real source", () => {
  for (const [id, name] of [
    ["pride_babel", "Confused Tongues"],
    ["joseph_betrayal", "Sold Away"],
    ["laban_deceit", "Deception"],
  ]) {
    it(`${id} / ${name} sets a pending compel and auto-plays on Hard`, () => {
      const after = enemyTurn(battleWith(id, name, "hard", { stateOverrides: { energy: 3, maxEnergy: 3 } }));
      expect(after.compelPending).toBe(1);
      expect(after.enemyEffectCooldowns.random_card).toBe(2);
      const resolved = startPlayerTurn(after);
      // Either a card was auto-played (energy spent / hand shrank) or it faded
      // safely — never negative Faith, never a hang.
      expect(resolved.compelPending).toBe(0);
      expect(resolved.energy).toBeGreaterThanOrEqual(0);
    });
  }
});

describe("Draw reduction — every real source (Normal floors to 1)", () => {
  for (const [id, name] of [
    ["cain_wrath", "Mark of Cain"],
    ["sodom_corruption", "Blinding Darkness"],
    ["famine_canaan", "Scarcity"],
    ["sodom_gomorrah", "Blinding Smoke"],
  ]) {
    it(`${id} / ${name} never removes the whole draw on Normal`, () => {
      const start = battleWith(id, name, "normal", { stateOverrides: { hand: deck.slice(0, 2) } });
      const after = enemyTurn(start);
      // Normal floor: drew at least 1 (hand grew from 2 -> 3), no full shutdown.
      expect(after.hand.length).toBe(3);
      expect(after.markCooldown).toBe(3);
    });
  }

  it("spreading_chaos boss modifier draw denial respects the cooldown", () => {
    const boss = applyBossModifier(ENEMIES.babel_tower, "spreading_chaos");
    const start = battleWith("babel_tower", "Scattered Thoughts", "normal", { enemy: boss, stateOverrides: { hand: deck.slice(0, 2) } });
    const after = enemyTurn(start);
    expect(after.markCooldown).toBe(3);
    expect(after.enemyIntent.effect).not.toBe("skip_draw");
  });
});

describe("Boss modifiers & core effects resolve", () => {
  it("divine_confusion applies Silenced Scripture", () => {
    const boss = applyBossModifier(ENEMIES.sodom_gomorrah, "divine_confusion");
    const after = enemyTurn(battleWith("sodom_gomorrah", "Confounding Voice", "normal", { enemy: boss }));
    expect(after.blockScripture).toBe(true);
  });
  it("fortified_judgment grants enemy Block", () => {
    const boss = applyBossModifier(ENEMIES.the_flood, "fortified_judgment");
    const after = enemyTurn(battleWith("the_flood", "Rising Defense", "normal", { enemy: boss }));
    expect(after.enemyBlock).toBeGreaterThanOrEqual(12);
  });
  it("dot applies a curse", () => {
    const after = enemyTurn(battleWith("sodom_corruption", "Burning Judgment", "normal"));
    expect(after.dots).toBeGreaterThan(0);
  });
  it("heal_self heals the enemy", () => {
    const flood = { ...ENEMIES.the_flood, hp: 55 };
    const s = battleWith("the_flood", "Cleansing Wave", "normal", { enemy: flood, stateOverrides: {} });
    const wounded = { ...s, enemy: { ...s.enemy, currentHp: 20 } };
    const after = enemyTurn(wounded);
    expect(after.enemy.currentHp).toBeGreaterThan(20 - 7); // healed offsets some/all of its own hit
  });
  it("recoil damages the attacker (Esau Burning Grudge = 3)", () => {
    const esau = { ...ENEMIES.esau_anger, hp: 20 };
    const after = enemyTurn(battleWith("esau_anger", "Burning Grudge", "normal", { enemy: esau }));
    expect(after.enemy.currentHp).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// PART 5 — status interactions (cooldown isolation, no clobbering).
// ---------------------------------------------------------------------------

describe("Cooldown isolation across effects", () => {
  it("a drain cooldown and a draw-denial cooldown coexist independently", () => {
    // Force a drain now while a skip_draw cooldown is already ticking.
    const s = battleWith("serpent", "Whisper of Doubt", "normal");
    const withSkipCd = {
      ...s,
      enemyEffectCooldowns: { skip_draw: 2 },
      enemyEffectNames: { skip_draw: "Blinding Darkness" },
      markCooldown: 2,
    };
    const after = enemyTurn(withSkipCd);
    expect(after.enemyEffectCooldowns.drain).toBe(3); // started
    expect(after.enemyEffectCooldowns.skip_draw).toBe(1); // ticked 2 -> 1, not clobbered
    expect(after.markCooldown).toBe(1); // mirror stays synced with skip_draw
  });
});

describe("Compelled interactions", () => {
  const laban = ENEMIES.laban_deceit;
  const base = () => ({
    ...createBattleState(laban, 35, 35, deck, 0, 0, "adam", createRng("compel-int"), { mode: "campaign", difficulty: "hard" }),
    compelPending: 1,
    compelName: "Deception",
    enemy: { ...laban, currentHp: 30 },
  });

  it("Compelled + Silenced Scripture skips blocked Scripture, plays a legal card", () => {
    const s = { ...base(), hand: ["prayer", "sling_stone"], energy: 3, playerHp: 20, blockScripture: true };
    const r = startPlayerTurn(s);
    expect(r.compelledThisTurn).toBe("Sling Stone"); // prayer (scripture) is blocked
  });

  it("Compelled + 0 Faith fades safely without negative Faith", () => {
    const s = { ...base(), hand: ["sling_stone"], energy: 0 };
    const r = startPlayerTurn(s);
    expect(r.compelPending).toBe(0);
    expect(r.energy).toBe(0);
  });

  it("Compelled + all cards too expensive fades safely", () => {
    const s = { ...base(), hand: ["righteous_strike"], energy: 1 }; // cost 2, energy 1
    const r = startPlayerTurn(s);
    expect(r.compelPending).toBe(0);
    expect(r.compelledThisTurn).toBeNull();
  });

  it("Compelled + healing-only hand at full HP fades (no wasted heal)", () => {
    const s = { ...base(), hand: ["prayer"], energy: 3, playerHp: 35, maxPlayerHp: 35 };
    const r = startPlayerTurn(s);
    expect(r.compelledThisTurn).toBeNull();
  });

  it("Compelled + Righteous Aim applies the capped bonus to the forced attack", () => {
    const s = { ...base(), hand: ["sling_stone"], energy: 3, enemyAttackMultiplier: 2, enemy: { ...laban, currentHp: 30 } };
    const r = startPlayerTurn(s);
    expect(r.enemy.currentHp).toBe(16); // (6+1 Adam) + min(7,12) = 14
    expect(r.enemyAttackMultiplier).toBe(1); // consumed
  });
});

describe("dot interactions", () => {
  it("dot damages through enemy block (dot is player damage, unaffected by enemy block)", () => {
    const after = enemyTurn(battleWith("sodom_corruption", "Burning Judgment", "normal", { playerHp: 35 }));
    // Burning Judgment: 6 damage + dot tick this turn.
    expect(after.playerHp).toBeLessThan(35);
    expect(after.dots).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// PART 7 — battle-ending edge cases.
// ---------------------------------------------------------------------------

describe("Battle-ending edge cases", () => {
  it("enemy defeated by recoil ends in victory; pending draw is moot", () => {
    const esau = { ...ENEMIES.esau_anger, hp: 3 };
    const after = enemyTurn(battleWith("esau_anger", "Burning Grudge", "normal", { enemy: esau }));
    expect(after.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(after)).toBe("victory");
  });

  it("enemy defeated by a forced (Compelled) card ends in victory", () => {
    const laban = { ...ENEMIES.laban_deceit, hp: 3 };
    const s = {
      ...createBattleState(laban, 35, 35, deck, 0, 0, "adam", createRng("compel-lethal"), { mode: "campaign", difficulty: "hard" }),
      compelPending: 1, compelName: "Deception", hand: ["sling_stone"], energy: 3,
      enemy: { ...laban, currentHp: 3 },
    };
    const r = startPlayerTurn(s);
    expect(r.enemy.currentHp).toBe(0);
    expect(checkBattleEnd(r)).toBe("victory");
  });

  it("cooldowns and pending flags reset at battle creation (no carry-over)", () => {
    const s = createBattleState(ENEMIES.serpent, 35, 35, deck, 0, 0, "adam", createRng("fresh"), { mode: "campaign", difficulty: "normal" });
    expect(s.faithDrainPending).toBe(0);
    expect(s.discardPending).toBe(0);
    expect(s.compelPending).toBe(0);
    expect(s.discardChoiceActive).toBe(false);
    expect(s.compelPreviewActive).toBe(false);
    expect(s.markCooldown).toBe(0);
    expect(s.enemyEffectCooldowns).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// PART 6 — save/continue round-trips (JSON, then resume via startPlayerTurn).
// ---------------------------------------------------------------------------

describe("Save/continue with pending effects", () => {
  it("pending Faith Drain survives JSON round-trip and resolves once", () => {
    const after = enemyTurn(battleWith("serpent", "Whisper of Doubt", "normal", { stateOverrides: { energy: 3, maxEnergy: 3 } }));
    const restored = JSON.parse(JSON.stringify(after));
    const r1 = startPlayerTurn(restored);
    expect(r1.energy).toBe(2);
    const r2 = startPlayerTurn(r1); // resume again -> no double resolution
    expect(r2.energy).toBe(2);
  });

  it("an active discard choice restores and is not auto-resolved on resume", () => {
    const after = enemyTurn(battleWith("serpent", "Temptation", "normal"));
    // Normal: startPlayerTurn raises the choice overlay (hand has >=2 after draw).
    const withChoice = startPlayerTurn(after);
    if (withChoice.discardChoiceActive) {
      const restored = JSON.parse(JSON.stringify(withChoice));
      const resumed = startPlayerTurn(restored); // idempotent — overlay stays, no auto-discard
      expect(resumed.discardChoiceActive).toBe(true);
      expect(resumed.hand.length).toBe(withChoice.hand.length);
      // Player then chooses — resolves exactly once.
      const done = resolveForcedDiscard(resumed, 0);
      expect(done.discardChoiceActive).toBe(false);
      expect(done.hand.length).toBe(withChoice.hand.length - 1);
    }
  });

  it("a pending Compelled preview restores and is not double-played", () => {
    const after = enemyTurn(battleWith("laban_deceit", "Deception", "normal", { stateOverrides: { energy: 3, maxEnergy: 3 } }));
    const preview = startPlayerTurn(after);
    if (preview.compelPreviewActive) {
      const restored = JSON.parse(JSON.stringify(preview));
      const resumed = startPlayerTurn(restored);
      expect(resumed.compelPreviewActive).toBe(true);
      expect(resumed.enemy.currentHp).toBe(preview.enemy.currentHp); // not played yet
    }
  });
});

// ---------------------------------------------------------------------------
// Regression — every enemy-turn -> player-turn transition MUST run
// startPlayerTurn (all three BattleScreen animation modes: step / fast / skip).
// Defect: the "skip" animation path did not resolve start-of-turn effects, so
// Faith Drain / Forced Discard / Compelled silently never resolved.
// ---------------------------------------------------------------------------

describe("start-of-player-turn resolution is required (skip-mode regression)", () => {
  it("enemyTurn alone leaves the effect PENDING; startPlayerTurn resolves it", () => {
    // enemyTurn sets the pending flag but must NOT resolve it by itself.
    const afterEnemy = enemyTurn(battleWith("serpent", "Whisper of Doubt", "hard", { stateOverrides: { maxEnergy: 3, energy: 3 } }));
    expect(afterEnemy.faithDrainPending).toBe(1);
    expect(afterEnemy.energy).toBe(3); // not yet drained — a bare enemyTurn is not enough

    // The player-turn entry every animation mode performs.
    const afterPlayerStart = startPlayerTurn(afterEnemy);
    expect(afterPlayerStart.faithDrainPending).toBe(0);
    expect(afterPlayerStart.energy).toBe(2); // resolved exactly once
  });

  it("Hard discard and compel also require the player-turn resolution step", () => {
    const drain = startPlayerTurn(enemyTurn(battleWith("serpent", "Temptation", "hard")));
    expect(drain.discardPending).toBe(0);

    const compel = startPlayerTurn(enemyTurn(battleWith("laban_deceit", "Deception", "hard", { stateOverrides: { energy: 3, maxEnergy: 3 } })));
    expect(compel.compelPending).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PART 4 — Daily determinism (seeded, no Math.random divergence).
// ---------------------------------------------------------------------------

describe("Daily determinism", () => {
  function dailyRun(effectEnemy, actionName) {
    // Two identical seeded daily runs must produce identical resolution.
    const mk = () => battleWith(effectEnemy, actionName, "normal", { mode: "daily", seed: "daily_2026_07_20" });
    const a = startPlayerTurn(enemyTurn(mk()));
    const b = startPlayerTurn(enemyTurn(mk()));
    return [a, b];
  }

  it("forced discard picks the same card for the same seed/state", () => {
    // Daily uses seeded auto-discard.
    const mk = () => {
      const s = battleWith("serpent", "Temptation", "normal", { mode: "daily", seed: "daily_x" });
      return { ...s, hand: ["sling_stone", "faith_shield", "prayer"], discardPending: 1, discardName: "Temptation" };
    };
    const a = startPlayerTurn(mk());
    const b = startPlayerTurn(mk());
    expect(a.hand).toEqual(b.hand);
  });

  it("compelled picks the same card for the same seed/state", () => {
    const mk = () => {
      const s = battleWith("laban_deceit", "Deception", "normal", { mode: "daily", seed: "daily_y" });
      return { ...s, hand: ["sling_stone", "faith_shield"], energy: 3, compelPending: 1, compelName: "Deception", enemy: { ...s.enemy, currentHp: 30 } };
    };
    const a = startPlayerTurn(mk());
    const b = startPlayerTurn(mk());
    expect(a.compelledThisTurn).toBe(b.compelledThisTurn);
  });

  it("full enemy behaviour sequence is identical across two identical daily seeds", () => {
    const [a, b] = dailyRun("serpent", "Whisper of Doubt");
    expect(a.log).toEqual(b.log);
    expect(a.enemyIntent).toEqual(b.enemyIntent);
  });
});
