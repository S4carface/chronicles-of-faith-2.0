// Battle engine logic — turn-based card combat

export const COUNTER_CAP = 12;
export const HAND_LIMIT = 4;

// Righteous Aim (Epic): the next Attack deals double damage, but the added
// bonus is capped at +12 so it can no longer create uncapped 50–60 burst turns.
export const RIGHTEOUS_AIM_CAP = 12;

function pickEnemyAttack(enemy, rng = Math.random) {
  return enemy.attacks[Math.floor(rng() * enemy.attacks.length)];
}

// Identifies Cain's signature draw-denial action (Mark of Cain).
export function isMarkAction(action) {
  return !!action && action.effect === "skip_draw" && action.name === "Mark of Cain";
}

// Identifies any draw-denial action (Mark of Cain and all other skip_draw
// sources: Blinding Darkness, Scarcity, Blinding Smoke, boss modifiers, …).
export function isDrawDenialAction(action) {
  return !!action && action.effect === "skip_draw";
}

// Effects declared in enemy data but NOT yet implemented in the engine. They
// resolve as ordinary attacks (their damage still lands); a later phase will
// wire up real disruption. Player-facing text/labels no longer promise them.
// (drain was implemented in Phase 2A and removed from this set.)
export const DEFERRED_EFFECTS = new Set(["discard", "random_card"]);

// Dev-only console warning so the team knows a deferred effect was encountered
// and still needs Phase 2 work. Silenced in production and during tests; never
// shown to players.
function warnDeferredEffect(action) {
  if (!action || !DEFERRED_EFFECTS.has(action.effect)) return;
  let dev = false;
  try {
    dev = !!(import.meta && import.meta.env && import.meta.env.DEV);
  } catch (e) {
    dev = false;
  }
  const isTest =
    typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test";
  if (dev && !isTest && typeof console !== "undefined") {
    console.warn(
      `[deferred-effect] "${action.name}" declares effect "${action.effect}", which is not implemented yet (Phase 2). It resolves as a plain attack; no disruption is applied.`
    );
  }
}

// Generic campaign draw-denial rule, shared by every enemy that uses skip_draw.
// Returns null for anything that must stay untouched: the Daily Challenge
// (mode "daily", which keeps its own deterministic compensation such as Hard
// draw-2) or when there is no battle state.
//
// When it returns a rule the engine applies (a) a per-difficulty cooldown so a
// draw-denial action can't be used on consecutive turns, and (b) a draw floor
// so campaign players (who draw only 1 card/turn) don't repeatedly lose their
// entire card income:
//
//   easy   → draw never falls below 1 (special effects are stripped on Easy, so
//            this is a safety net only). Cooldown 4 for Cain, 3 otherwise.
//   normal → draw never falls below 1. Cooldown 3.
//   hard   → draw may fall to 0, then cooldown. Cooldown 2.
//
// Cain keeps his signature longer Easy cooldown (4); all other campaign enemies
// use the generic values. Floor/allowZeroDraw are identical across sources.
export function getDrawDenialRule(state) {
  if (!state || state.mode === "daily") return null;

  const difficulty = state.difficulty || "normal";
  const isCain = state.enemy?.id === "cain_wrath";

  if (difficulty === "hard") return { cooldown: 2, allowZeroDraw: true };
  if (difficulty === "easy") return { cooldown: isCain ? 4 : 3, allowZeroDraw: false };
  return { cooldown: 3, allowZeroDraw: false };
}

// Cain-only view of the draw-denial rule, preserved for the existing Cain tests
// and for Mark-specific wording. Non-Cain enemies get their rule straight from
// getDrawDenialRule.
export function getMarkRule(state) {
  if (!state || state.mode === "daily") return null;
  if (state.enemy?.id !== "cain_wrath") return null;
  return getDrawDenialRule(state);
}

// Faith Drain rule (Phase 2A). Drives the per-difficulty Faith floor and the
// drain cooldown. Unlike draw denial, drain resolves at the START of the
// player's next turn (see startPlayerTurn) and is deterministic (no RNG).
//
//   easy   → floor 1 (effects are stripped on Easy, so this is a safety net).
//   normal → floor 1 (available Faith never drops below 1). Cooldown 3.
//   hard   → may reach 0 (allowZero). Cooldown 2.
//
// Daily: the run difficulty is "daily_standard", which is not "hard", so Daily
// uses the safe floor-1 / cooldown-3 rule. Drain therefore never reduces Daily
// Faith to 0 and never touches Daily starting-Faith compensation; it is fully
// deterministic. maxEnergy (maximum Faith) is never modified by drain.
export function getDrainRule(state) {
  if (!state) return null;
  const difficulty = state.difficulty || "normal";
  if (difficulty === "hard") return { cooldown: 2, allowZero: true };
  return { cooldown: 3, allowZero: false };
}

// Picks the enemy's next intent from the given card pool. Any action whose
// effect is currently on cooldown (excludedEffects, a Set of effect keys) is
// skipped so the enemy keeps pressuring with ordinary actions while its
// disruption recovers. With an empty/omitted set this is identical to the
// previous shuffle+take-top behavior, preserving Daily determinism (same rng
// draw count and ordering).
function selectEnemyIntent(cards, rng, enemy, excludedEffects = null) {
  const pool = cards.length > 0 ? cards : [...enemy.attacks];
  const shuffled = shuffle(pool, rng);

  let idx = 0;
  if (excludedEffects && excludedEffects.size > 0) {
    const ok = shuffled.findIndex((c) => !(c && excludedEffects.has(c.effect)));
    if (ok >= 0) idx = ok;
  }

  const chosen = shuffled.splice(idx, 1)[0] || pickEnemyAttack(enemy, rng);
  return { intent: chosen, deck: shuffled };
}

// The disruption effects that are cooldown-gated, and how to fetch each rule.
const COOLDOWN_EFFECTS = ["skip_draw", "drain"];
function getEffectRule(state, effectKey) {
  if (effectKey === "skip_draw") return getDrawDenialRule(state);
  if (effectKey === "drain") return getDrainRule(state);
  return null;
}

// Honest battle-log line for a resolving draw-denial action. The wording matches
// what actually happens: Easy/Normal keep at least 1 card, Hard may be cut to 0.
// Cain keeps his signature "Mark of Cain" phrasing; other enemies use the action
// name so the log stays accurate per source.
function drawDenialResolutionLog(state, action) {
  const rule = getDrawDenialRule(state);
  const label = isMarkAction(action) ? "Mark of Cain" : action.name;

  if (rule) {
    return rule.allowZeroDraw
      ? `⚠️ ${label} — your next draw may be cut to 0.`
      : `⚠️ ${label} — your next draw is contested (you keep at least 1 card).`;
  }

  return `⚠️ ${action.description || "Draw 1 fewer next turn"}`;
}

// Effect-keyed enemy-disruption cooldown system. Each disruption (skip_draw,
// drain, and future effects) has an independent cooldown in the
// `enemyEffectCooldowns` map and a remembered source name in `enemyEffectNames`,
// so two different effects can coexist without clobbering each other.
//
// `resolved` maps an effect key → the action name that fired this turn (only for
// effects that actually resolved). For each cooldown-gated effect: if it fired,
// it enters cooldown; otherwise an active cooldown ticks down by one. Returns the
// new maps plus battle-log lines (cooldown started/expired).
function advanceDisruptionCooldowns(state, resolved = {}) {
  const cooldowns = { ...(state.enemyEffectCooldowns || {}) };
  const names = { ...(state.enemyEffectNames || {}) };
  const logs = [];

  for (const key of COOLDOWN_EFFECTS) {
    const rule = getEffectRule(state, key);
    if (!rule) continue;

    if (resolved[key]) {
      cooldowns[key] = rule.cooldown;
      names[key] = resolved[key];
      logs.push(`⏳ ${resolved[key]} recovers — unavailable for ${rule.cooldown} turns.`);
    } else if ((cooldowns[key] || 0) > 0) {
      cooldowns[key] = cooldowns[key] - 1;
      if (cooldowns[key] === 0) {
        logs.push(`✨ ${names[key] || "The enemy's disruption"} is ready again.`);
      }
    }
  }

  return { cooldowns, names, logs };
}

// The set of effect keys currently on cooldown (excluded from the next intent).
function cooldownExcludedEffects(cooldowns) {
  const set = new Set();
  for (const key of COOLDOWN_EFFECTS) {
    if ((cooldowns[key] || 0) > 0) set.add(key);
  }
  return set;
}

// Legacy mirror fields spread into every returned player-turn state so the
// battle UI badge and existing tests keep reading markCooldown / drawDenialName
// for the draw-denial (skip_draw) cooldown specifically.
function cooldownStateFields(cooldowns, names) {
  return {
    enemyEffectCooldowns: cooldowns,
    enemyEffectNames: names,
    markCooldown: cooldowns.skip_draw || 0,
    drawDenialName: names.skip_draw || null,
  };
}

// Resolves pending Faith Drain at the START of the player's turn. Reduces the
// player's available Faith by 1, floored per difficulty (Normal keeps ≥1, Hard
// may reach 0), never below 0, and never touches maximum Faith. Idempotent: it
// consumes faithDrainPending, so calling it again is a no-op.
export function startPlayerTurn(state) {
  if (!state || !(state.faithDrainPending > 0)) {
    return state ? { ...state, faithDrainedThisTurn: false } : state;
  }

  const rule = getDrainRule(state);
  const minFaith = rule && rule.allowZero ? 0 : 1;
  const before = state.energy || 0;
  const after = Math.min(before, Math.max(minFaith, before - 1));
  const log = [...state.log];

  if (before === 0) {
    log.push("🕯️ Faith Drain activated, but you had no Faith to lose.");
  } else if (after === before) {
    log.push("🕯️ Faith Drain weakened your resolve, but you retained 1 Faith.");
  } else if (after === 0) {
    log.push("🕯️ Faith Drain activated. Faith reduced to 0.");
  } else {
    log.push("🕯️ Faith Drain activated. 1 Faith lost.");
  }

  return {
    ...state,
    energy: after,
    faithDrainPending: 0,
    faithDrainedThisTurn: after < before,
    log,
  };
}

function isCardObject(card) {
  return card && typeof card === "object" && card.id;
}

function buildEnemyDeck(enemy, rng = Math.random) {
  const blockAction = {
    name: "Raise Block",
    damage: 0,
    icon: "🛡️",
    effect: "block",
    blockValue: 5,
    cost: 1,
    description: "Gains 5 Block this turn",
  };

  return shuffle([
    ...enemy.attacks.map((a) => ({
      ...a,
      cost: a.cost || (a.damage >= 8 ? 2 : 1),
    })),
    blockAction,
  ], rng);
}

// `rng` is a seeded generator (see mapGenerator.createRng) for deterministic
// battles (Daily Challenge). Defaults to Math.random for regular runs. The
// generator is carried on the returned state so every downstream shuffle /
// enemy-behavior decision for this battle continues the same sequence.
export function createBattleState(
  enemy,
  playerHp,
  maxPlayerHp,
  deck,
  startingBlock = 0,
  extraDraw = 0,
  heroId = null,
  rng = Math.random,
  options = {}
) {
  const shuffled = shuffle([...deck], rng);
  const enemyDeck = buildEnemyDeck(enemy, rng);

// Force the first enemy action to be an attack.
const firstAttackIndex = enemyDeck.findIndex(card => card.damage > 0);

if (firstAttackIndex > 0) {
  [enemyDeck[0], enemyDeck[firstAttackIndex]] = [
    enemyDeck[firstAttackIndex],
    enemyDeck[0],
  ];
}

const enemyHand = enemyDeck.splice(0, 1);
const intent = enemyHand[0] || pickEnemyAttack(enemy, rng);
  const openingHandSize = HAND_LIMIT;

  return {
    enemy: { ...enemy, currentHp: enemy.hp, maxHp: enemy.hp },
    enemyIntent: intent,
    enemyHand,
    enemyDeck,
    enemyEnergy: 3,
    enemyMaxEnergy: 3,
    enemyBlock: 0,

    playerHp,
    maxPlayerHp: maxPlayerHp || playerHp,
    playerBlock: startingBlock,

    energy: 3,
    maxEnergy: 3,

    deck: shuffled,
    hand: shuffled.splice(0, openingHandSize),
    discard: [],

    turn: "player",
    turnNumber: 1,
    log: [
      `Battle with ${enemy.name} begins!`,
      `⚠️ ${enemy.name} prepares: ${intent.name}${intent.damage ? ` (${intent.damage} DMG)` : ""}`,
    ],

    enemyAttackMultiplier: 1,
    blockScripture: false,
    buffAttack: 0,
    shieldActive: false,
    covenantShieldUsed: false,
    freeCardsRemaining: 0,
    dots: 0,
    skipDraw: 0,
    counter: 0,
    heroId,
    // Battle mode ("campaign" | "daily") and difficulty drive Cain's Mark of
    // Cain rebalance (see getMarkRule). markCooldown gates the special so it
    // can't be used on consecutive turns. Daily Challenge passes mode "daily"
    // and is therefore never affected.
    mode: options.mode || "campaign",
    difficulty: options.difficulty || "normal",
    // Effect-keyed enemy-disruption cooldowns (skip_draw, drain, …) and the
    // source name per effect. markCooldown / drawDenialName are legacy mirrors of
    // the skip_draw entry, kept for the battle UI badge and save/continue compat.
    enemyEffectCooldowns: {},
    enemyEffectNames: {},
    markCooldown: 0,
    drawDenialName: null,
    drawReduced: false,
    // Faith Drain (Phase 2A): faithDrainPending is set when a drain action fires
    // and consumed at the start of the player's next turn (see startPlayerTurn).
    // faithDrainedThisTurn drives the resolution animation. Maximum Faith is
    // never modified by drain.
    faithDrainPending: 0,
    faithDrainedThisTurn: false,
    rng,
    error: null,
  };
}

export function shuffle(arr, rng = Math.random) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function drawCards(state, count) {
  const rng = state.rng || Math.random;
  const newHand = [...(state.hand || [])];
  const newDeck = [...(state.deck || [])];
  const newDiscard = [...(state.discard || [])];
  let reshuffled = false;

  const roomInHand = Math.max(0, HAND_LIMIT - newHand.length);
  const cardsToDraw = Math.max(0, Math.min(count, roomInHand));

  for (let i = 0; i < cardsToDraw; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break;

      newDeck.push(...shuffle(newDiscard.splice(0), rng));
      reshuffled = true;
    }

    const nextCard = newDeck.shift();
    if (!nextCard) break;

    newHand.push(nextCard);
  }

  return {
    ...state,
    hand: newHand,
    deck: newDeck,
    discard: newDiscard,
    reshuffled,
  };
}

function drawNextTurnCard(state, skipDraw = 0) {
  const handSize = state.hand?.length || 0;

  // Per-turn draw count. Regular runs draw 1; easy draws back to a full hand;
  // Daily can set drawPerTurn (e.g. Hard Daily draws 2) so the small fixed deck
  // isn't starved by disruptive enemies (skip-draw) — see dailyChallenge.
  const normalDrawCount = state.drawPerTurn || 1;
  const easyDrawCount = Math.max(0, HAND_LIMIT - handSize);

  const baseDrawCount = state.drawToFull
    ? easyDrawCount
    : normalDrawCount;

  let cardsToDraw = Math.max(
    0,
    baseDrawCount - (skipDraw || 0)
  );

  // Campaign draw-reduction floor, shared by every draw-denial source. A
  // campaign player draws only 1 card/turn, so an unfloored reduction wipes
  // their entire card income. On Easy/Normal the draw never falls below 1 (when
  // the player would otherwise draw ≥ 1). Hard (allowZeroDraw) may reach 0 — but
  // the source then goes on cooldown, so it can't repeat the shutdown.
  const rule = getDrawDenialRule(state);
  if (
    rule &&
    !rule.allowZeroDraw &&
    (skipDraw || 0) > 0 &&
    baseDrawCount >= 1 &&
    cardsToDraw < 1
  ) {
    cardsToDraw = 1;
  }

  const drawn = drawCards(state, cardsToDraw);

  // Flag whether the player's incoming hand was actually shrunk by draw denial
  // (drives the "Draw Reduced" status). On Easy/Normal the floor usually keeps
  // this false; on Hard a 1 → 0 reduction sets it true.
  const drawReduced = (skipDraw || 0) > 0 && cardsToDraw < baseDrawCount;

  return { ...drawn, drawReduced };
}

export function playCard(state, handIndex, card) {
  if (!card) return { ...state, error: "No card selected." };

  const isScripture = card.type === "scripture";

  if (state.blockScripture && isScripture) {
    return { ...state, error: "Scripture cards are blocked this turn!" };
  }

  let newEnergy = state.energy;
  let freeCards = state.freeCardsRemaining || 0;

  if (freeCards > 0) {
    freeCards -= 1;
  } else {
    if (newEnergy < card.cost) {
      return { ...state, error: "Not enough Faith!" };
    }

    newEnergy -= card.cost;
  }

  const newHand = state.hand.filter((_, i) => i !== handIndex);
  const newDiscard = [...state.discard, card];
  const log = [...state.log];

  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let buffAttack = state.buffAttack;
  let blockScripture = state.blockScripture;
  let counter = state.counter || 0;

  // Righteous Aim is active while enemyAttackMultiplier > 1 (set to 2 when the
  // card is played). It is consumed only by an Attack card; other card types
  // neither benefit from nor consume it (it clears at end of the player turn).
  const aimActive = (state.enemyAttackMultiplier || 1) > 1;
  let nextAimMultiplier = state.enemyAttackMultiplier || 1;

  switch (card.type) {
    case "attack": {
      const passiveBonus = state.heroId === "adam" ? 1 : 0;

      // Order of operations:
      //   1. base card value
      //   2. + temporary attack buff (buffAttack, e.g. Divine Strength)
      //   3. + Adam's First Born Fury passive (+1)  → "normal final damage" (N)
      //   4. Righteous Aim (if active): + min(N, RIGHTEOUS_AIM_CAP), then consume
      //   5. enemy Block absorption (below)
      let dmg = card.value + buffAttack + passiveBonus;

      if (aimActive) {
        dmg = dmg + Math.min(dmg, RIGHTEOUS_AIM_CAP);
        nextAimMultiplier = 1; // consumed by this Attack
      }

      if (enemyBlock > 0) {
        const absorbed = Math.min(enemyBlock, dmg);
        enemyBlock -= absorbed;
        dmg -= absorbed;

        if (absorbed > 0) {
          log.push(`🛡️ Enemy blocked ${absorbed}`);
        }
      }

      enemyHp = Math.max(0, enemyHp - dmg);
      log.push(`⚔️ ${card.name} — ${dmg} dmg${passiveBonus ? " (+1)" : ""}`);

      if (buffAttack > 0) {
        buffAttack = 0;
      }

      break;
    }

    case "defense": {
      const blockBonus = state.heroId === "noah" ? 2 : 0;
      const totalBlock = card.value + blockBonus;

      playerBlock += totalBlock;
      log.push(`🛡️ ${card.name} — ${totalBlock} block${blockBonus ? " (+2)" : ""}`);

      if (card.id === "lions_den") {
        counter = Math.min(COUNTER_CAP, counter + 4);
        log.push(`🦁 Counter +4 (now ${counter})`);
      }

      break;
    }

    case "scripture": {
      if (
        card.id === "prayer" ||
        card.id === "bread_life" ||
        card.id === "living_water" ||
        card.id === "burning_bush"
      ) {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`💚 ${card.name} — +${card.value} HP`);

        if (card.id === "burning_bush") {
          enemyHp = Math.max(0, enemyHp - 5);
          log.push("🔥 Burning Bush — 5 dmg");
        }
      } else if (card.id === "song_praise") {
        newEnergy += 2;
        log.push("🎵 Song of Praise — +2 Faith");
      } else if (card.id === "wisdom") {
        const drawn = drawCards(
          {
            ...state,
            hand: newHand,
            deck: state.deck,
            discard: newDiscard,
          },
          2
        );

        log.push("📖 Wisdom — drew up to 2 cards");

        return {
          ...drawn,
          energy: newEnergy,
          playerHp,
          playerBlock,
          enemy: { ...state.enemy, currentHp: enemyHp },
          enemyBlock,
          log,
          buffAttack,
          freeCardsRemaining: freeCards,
          blockScripture,
          counter,
          error: null,
        };
      } else if (card.id === "doves_peace") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`💚 Dove's Peace — +${card.value} HP`);

        const drawn = drawCards(
          {
            ...state,
            hand: newHand,
            deck: state.deck,
            discard: newDiscard,
          },
          1
        );

        return {
          ...drawn,
          energy: newEnergy,
          playerHp,
          playerBlock,
          enemy: { ...state.enemy, currentHp: enemyHp },
          enemyBlock,
          log,
          buffAttack,
          freeCardsRemaining: freeCards,
          blockScripture,
          counter,
          error: null,
        };
      } else if (card.id === "manna_heaven") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`💚 Manna from Heaven — +${card.value} HP`);

        const drawn = drawCards(
          {
            ...state,
            hand: newHand,
            deck: state.deck,
            discard: newDiscard,
          },
          2
        );

        return {
          ...drawn,
          energy: newEnergy,
          playerHp,
          playerBlock,
          enemy: { ...state.enemy, currentHp: enemyHp },
          enemyBlock,
          log,
          buffAttack,
          freeCardsRemaining: freeCards,
          blockScripture,
          counter,
          error: null,
        };
      } else if (card.id === "coat_colors") {
        newEnergy += 3;
        log.push("🌈 Coat of Many Colors — +3 Faith");
      } else if (card.id === "jacobs_ladder") {
        const drawn = drawCards(
          {
            ...state,
            hand: newHand,
            deck: state.deck,
            discard: newDiscard,
          },
          3
        );

        log.push("🪜 Jacob's Ladder — drew up to 3 cards");

        return {
          ...drawn,
          energy: newEnergy,
          playerHp,
          playerBlock,
          enemy: { ...state.enemy, currentHp: enemyHp },
          enemyBlock,
          log,
          buffAttack,
          freeCardsRemaining: freeCards,
          blockScripture,
          counter,
          error: null,
        };
      } else if (card.id === "righteous_aim") {
        log.push("🎯 Righteous Aim — next attack doubled (up to +12)");

        return {
          ...state,
          hand: newHand,
          energy: newEnergy,
          enemyAttackMultiplier: 2,
          discard: newDiscard,
          log,
          buffAttack,
          freeCardsRemaining: freeCards,
          blockScripture,
          counter,
          enemyBlock,
          error: null,
        };
      }

      break;
    }

    case "miracle": {
      // Righteous Aim does not apply to Miracles (attack cards only).
      let dmg = card.value;

      if (enemyBlock > 0) {
        const absorbed = Math.min(enemyBlock, dmg);
        enemyBlock -= absorbed;
        dmg -= absorbed;

        if (absorbed > 0) {
          log.push(`🛡️ Enemy blocked ${absorbed}`);
        }
      }

      enemyHp = Math.max(0, enemyHp - dmg);
      log.push(`✨ ${card.name} — ${dmg} holy dmg`);

      if (card.id === "angel_lord") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + 10);
        log.push("👼 Angel of the Lord — +10 HP");
      }

      if (buffAttack > 0) {
        buffAttack = 0;
      }

      break;
    }

    default: {
      log.push(`${card.name} was played.`);
      break;
    }
  }

  return {
    ...state,
    hand: newHand,
    deck: state.deck,
    discard: newDiscard,
    energy: newEnergy,
    playerHp,
    playerBlock,
    enemy: { ...state.enemy, currentHp: enemyHp },
    enemyBlock,
    log,
    // Attack consumes Righteous Aim (nextAimMultiplier → 1); other non-Aim cards
    // preserve it so a later Attack this turn still benefits. (righteous_aim
    // itself returns earlier, setting the multiplier to 2.)
    enemyAttackMultiplier: nextAimMultiplier,
    buffAttack,
    freeCardsRemaining: freeCards,
    blockScripture,
    counter,
    error: null,
  };
}

export function endPlayerTurn(state) {
  const handCount = state.hand?.length || 0;
  const unusedEnemyBlock = state.enemyBlock || 0;

  const log = [
    ...state.log,
    "— Turn ends —",
    handCount > 0
      ? `You kept ${handCount} card${handCount === 1 ? "" : "s"} in hand.`
      : "No cards in hand.",
    unusedEnemyBlock > 0
      ? `Enemy Block faded — ${unusedEnemyBlock} unused Block removed.`
      : "Enemy has no unused Block.",
state.drawToFull
  ? "Enemy performs one action, then your hand refills up to 4 cards."
  : "Enemy performs one action, then you draw 1 card.",
    ];

  return {
    ...state,
    turn: "enemy",
    enemyBlock: 0,
    enemyAttackMultiplier: 1,
    log,
    error: null,
  };
}

function applyCounter(state, enemyHp, log, counter) {
  if (!counter || counter <= 0) {
    return { enemyHp, log, counterHit: 0 };
  }

  const dmg = counter;
  enemyHp = Math.max(0, enemyHp - dmg);
  log.push(`🦁 Counter — ${dmg} dmg`);

  return { enemyHp, log, counterHit: dmg };
}

function fadeBlock(playerBlock, log) {
  const unusedBlock = playerBlock || 0;

  if (unusedBlock > 0) {
    log.push(`  Block faded — ${unusedBlock} unused Block removed.`);
  }
}

export function enemyTurn(state) {
  const rng = state.rng || Math.random;
  const log = [...state.log];

  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let counter = state.counter || 0;
  let skipDraw = state.skipDraw || 0;
  let blockScripture = false;
  let dots = state.dots || 0;

  if (state.shieldActive) {
    log.push("🌈 Covenant Shield — enemy turn negated!");

    // No disruption resolved (turn negated), so cooldowns simply tick down.
    const cd = advanceDisruptionCooldowns(state, {});
    log.push(...cd.logs);

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const picked = selectEnemyIntent(allCards, rng, state.enemy, cooldownExcludedEffects(cd.cooldowns));
    const newIntent = picked.intent;
    const newDeck = picked.deck;
    const newHand = newIntent ? [newIntent] : [];

    if (newIntent) {
      log.push(
        `⚠️ ${state.enemy.name} prepares ${newIntent.name}${newIntent.damage ? ` (${newIntent.damage} dmg)` : ""}`
      );
    }

    fadeBlock(playerBlock, log);

    const newState = {
      ...state,
      enemyIntent: newIntent,
      enemyHand: newHand,
      enemyDeck: newDeck,
      enemyBlock: state.enemyBlock || 0,
      enemyEnergy: state.enemyMaxEnergy || 3,
      playerHp,
      playerBlock: 0,
      enemy: { ...state.enemy, currentHp: enemyHp },
      log,
      turn: "player",
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      shieldActive: false,
      ...cooldownStateFields(cd.cooldowns, cd.names),
      counter,
      error: null,
    };

    const withDraw = drawNextTurnCard(newState, skipDraw);

    return { ...withDraw, skipDraw: 0 };
  }

  let energy = state.enemyMaxEnergy || 3;
  const hand = [...(state.enemyHand || [])];
  let deck = [...(state.enemyDeck || [])];
  const discard = [];
  let drawDenialResolvedName = null;
  let drainResolvedName = null;
  let faithDrainPending = state.faithDrainPending || 0;

  while (energy > 0 && hand.length > 0) {
    const action = hand.shift();
    const cost = action.cost || 1;

    if (cost > energy) {
      discard.push(action);

      // Enemies perform only one playable action per turn.
      break;
    }

    energy -= cost;

    if (action.damage > 0) {
      let damage = action.damage;

      if (playerBlock > 0) {
        const absorbed = Math.min(playerBlock, damage);
        playerBlock -= absorbed;
        damage -= absorbed;

        if (absorbed > 0) {
          log.push(`🛡️ Blocked ${absorbed}`);
        }
      }

      if (damage > 0) {
        playerHp = Math.max(0, playerHp - damage);
      }

      log.push(`💥 ${action.name} — ${damage} dmg`);

      const ctr = applyCounter(state, enemyHp, log, counter);
      enemyHp = ctr.enemyHp;

      // Recoil — the attacker also takes its declared self-damage (once).
      if (action.effect === "recoil" && action.recoil > 0) {
        enemyHp = Math.max(0, enemyHp - action.recoil);
        log.push(`💥 ${state.enemy.name} takes ${action.recoil} recoil`);
      }

      if (action.effect === "heal_self") {
        const healAmt = state.enemy.isBoss ? 6 : 4;
        enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
        log.push(`✨ ${state.enemy.name} healed ${healAmt}`);
      }
    } else if (action.effect === "block") {
      const blockVal = action.blockValue || 5;
      enemyBlock += blockVal;
      log.push(`🛡️ ${action.name} — +${blockVal} block`);
    } else if (action.effect === "heal_self") {
      const healAmt = state.enemy.isBoss ? 6 : 4;
      enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
      log.push(`✨ ${action.name} — +${healAmt} HP`);
    } else {
      log.push(`${action.name}`);
    }

    if (action.effect === "skip_draw") {
      skipDraw = 1;
      drawDenialResolvedName = isMarkAction(action) ? "Mark of Cain" : action.name;
      log.push(drawDenialResolutionLog(state, action));
    }

    if (action.effect === "drain") {
      const drainRule = getDrainRule(state);
      if (drainRule) {
        faithDrainPending = 1;
        drainResolvedName = action.name;
        log.push("⚠️ Faith Drain — you will lose 1 Faith at the start of your next turn.");
      }
    }

    if (action.effect === "block_scripture") {
      blockScripture = true;
      log.push("⚠️ Silenced Scripture — no Scripture cards next turn");
    }

    if (action.effect === "dot") {
      dots = 3;
      log.push("☠️ Curse — 2 dmg/turn");
    }

    warnDeferredEffect(action);

    discard.push(action);
  }

  if (dots > 0) {
    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;
    log.push(`☠️ Curse — 2 dmg (${dots} turn${dots === 1 ? "" : "s"} left)`);
  }

  // Advance every disruption cooldown for this elapsed enemy turn, then keep any
  // effect that's on cooldown out of the next intent so no enemy can repeat a
  // disruption on consecutive turns.
  const cd = advanceDisruptionCooldowns(state, {
    skip_draw: drawDenialResolvedName,
    drain: drainResolvedName,
  });
  log.push(...cd.logs);

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const picked = selectEnemyIntent(allCards, rng, state.enemy, cooldownExcludedEffects(cd.cooldowns));
  const newIntent = picked.intent;
  const newDeck = picked.deck;
  const newHand = newIntent ? [newIntent] : [];

  if (newIntent) {
    const label = newIntent.damage
      ? ` (${newIntent.damage} dmg)`
      : newIntent.effect === "block"
        ? " (Block)"
        : newIntent.effect === "heal_self"
          ? " (Heal)"
          : "";

    log.push(`⚠️ ${state.enemy.name} readies ${newIntent.name}${label}`);
  }

  fadeBlock(playerBlock, log);

  const newState = {
    ...state,
    enemyIntent: newIntent,
    enemyHand: newHand,
    enemyDeck: newDeck,
    enemyBlock,
    enemyEnergy: state.enemyMaxEnergy || 3,
    playerHp,
    playerBlock: 0,
    enemy: { ...state.enemy, currentHp: enemyHp },
    turn: "player",
    turnNumber: state.turnNumber + 1,
    energy: state.maxEnergy,
    skipDraw,
    blockScripture,
    dots,
    log,
    counter,
    faithDrainPending,
    ...cooldownStateFields(cd.cooldowns, cd.names),
    error: null,
  };

  const withDraw = drawNextTurnCard(newState, skipDraw);

  return { ...withDraw, skipDraw: 0 };
}

export function checkBattleEnd(state) {
  if (state.enemy.currentHp <= 0) return "victory";
  if (state.playerHp <= 0) return "defeat";
  return null;
}

export function getEnemyTurnSteps(state) {
  const rng = state.rng || Math.random;
  const steps = [];
  const log = [...state.log];

  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let counter = state.counter || 0;
  let skipDraw = state.skipDraw || 0;
  let blockScripture = false;
  let dots = state.dots || 0;

  if (state.shieldActive) {
    log.push("🌈 Covenant Shield — enemy turn negated!");

    // No disruption resolved (turn negated), so cooldowns simply tick down.
    const cd = advanceDisruptionCooldowns(state, {});
    log.push(...cd.logs);

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const picked = selectEnemyIntent(allCards, rng, state.enemy, cooldownExcludedEffects(cd.cooldowns));
    const newIntent = picked.intent;
    const newDeck = picked.deck;
    const newHand = newIntent ? [newIntent] : [];

    if (newIntent) {
      log.push(`${state.enemy.name} readies ${newIntent.name}${newIntent.damage ? ` (${newIntent.damage})` : ""}`);
    }

    fadeBlock(playerBlock, log);

    const newState = {
      ...state,
      enemyIntent: newIntent,
      enemyHand: newHand,
      enemyDeck: newDeck,
      enemyBlock: state.enemyBlock || 0,
      enemyEnergy: state.enemyMaxEnergy || 3,
      playerHp,
      playerBlock: 0,
      enemy: { ...state.enemy, currentHp: enemyHp },
      log,
      turn: "player",
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      shieldActive: false,
      ...cooldownStateFields(cd.cooldowns, cd.names),
      counter,
      error: null,
    };

    const withDraw = drawNextTurnCard(newState, skipDraw);

    steps.push({ type: "shield", state: { ...withDraw, skipDraw: 0 } });

    return steps;
  }

  let energy = state.enemyMaxEnergy || 3;
  const hand = [...(state.enemyHand || [])];
  let deck = [...(state.enemyDeck || [])];
  const discard = [];
  let handIdx = 0;
  let drawDenialResolvedName = null;
  let drainResolvedName = null;
  let faithDrainPending = state.faithDrainPending || 0;

  while (energy > 0 && hand.length > 0) {
    const action = hand.shift();
    const originalHandIdx = handIdx;
    handIdx++;

    const cost = action.cost || 1;

    if (cost > energy) {
      discard.push(action);
      continue;
    }

    energy -= cost;

    const stepLog = [...log];
    let counterHit = 0;
    let recoilHit = 0;

    if (action.damage > 0) {
      let damage = action.damage;

      if (playerBlock > 0) {
        const absorbed = Math.min(playerBlock, damage);
        playerBlock -= absorbed;
        damage -= absorbed;

        if (absorbed > 0) {
          stepLog.push(`🛡️ Blocked ${absorbed}`);
        }
      }

      if (damage > 0) {
        playerHp = Math.max(0, playerHp - damage);
      }

      stepLog.push(`💥 ${action.name} — ${damage} dmg`);

      const ctr = applyCounter(state, enemyHp, stepLog, counter);
      enemyHp = ctr.enemyHp;
      counterHit = ctr.counterHit;

      // Recoil — the attacker also takes its declared self-damage (once). May
      // reduce the enemy to 0, ending the battle in victory.
      if (action.effect === "recoil" && action.recoil > 0) {
        recoilHit = action.recoil;
        enemyHp = Math.max(0, enemyHp - recoilHit);
        stepLog.push(`💥 ${state.enemy.name} takes ${recoilHit} recoil`);
      }

      if (action.effect === "heal_self") {
        const healAmt = state.enemy.isBoss ? 6 : 4;
        enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
        stepLog.push(`✨ +${healAmt} HP`);
      }
    } else if (action.effect === "block") {
      const blockVal = action.blockValue || 5;
      enemyBlock += blockVal;
      stepLog.push(`🛡️ ${action.name} — +${blockVal} block`);
    } else if (action.effect === "heal_self") {
      const healAmt = state.enemy.isBoss ? 6 : 4;
      enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
      stepLog.push(`✨ ${action.name} — +${healAmt} HP`);
    } else {
      stepLog.push(`${action.name}`);
    }

    if (action.effect === "skip_draw") {
      skipDraw = 1;
      drawDenialResolvedName = isMarkAction(action) ? "Mark of Cain" : action.name;
      stepLog.push(drawDenialResolutionLog(state, action));
    }

    if (action.effect === "drain") {
      const drainRule = getDrainRule(state);
      if (drainRule) {
        faithDrainPending = 1;
        drainResolvedName = action.name;
        stepLog.push("⚠️ Faith Drain — you will lose 1 Faith at the start of your next turn.");
      }
    }

    if (action.effect === "block_scripture") {
      blockScripture = true;
      stepLog.push("⚠️ Silenced Scripture — no Scripture cards next turn");
    }

    if (action.effect === "dot") {
      dots = 3;
      stepLog.push("☠️ Curse — 2 dmg/turn");
    }

    warnDeferredEffect(action);

    discard.push(action);

    steps.push({
      type: "action",
      action,
      handIndex: originalHandIdx,
      counterHit,
      recoilHit,
      state: {
        ...state,
        enemyBlock,
        enemyEnergy: energy,
        playerHp,
        playerBlock,
        enemy: { ...state.enemy, currentHp: enemyHp },
        log: stepLog,
        counter,
        skipDraw,
        blockScripture,
        dots,
        faithDrainPending,
        error: null,
      },
    });
    
    // Stop after animating one playable enemy action.
    break;

    log.length = 0;
    log.push(...stepLog);
  }

  if (dots > 0) {
    const dotLog = [...log];

    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;

    dotLog.push(`☠️ Curse — 2 dmg (${dots} turn${dots === 1 ? "" : "s"} left)`);

    steps.push({
      type: "dot",
      state: {
        ...state,
        playerHp,
        dots,
        log: dotLog,
        error: null,
      },
    });

    log.length = 0;
    log.push(...dotLog);
  }

  const endLog = [...log];

  // Advance every disruption cooldown for this elapsed enemy turn, then keep any
  // effect that's on cooldown out of the next intent while it recovers.
  const cd = advanceDisruptionCooldowns(state, {
    skip_draw: drawDenialResolvedName,
    drain: drainResolvedName,
  });
  endLog.push(...cd.logs);

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const picked = selectEnemyIntent(allCards, rng, state.enemy, cooldownExcludedEffects(cd.cooldowns));
  const newIntent = picked.intent;
  const newDeck = picked.deck;
  const newHand = newIntent ? [newIntent] : [];

  if (newIntent) {
    const label = newIntent.damage
      ? ` (${newIntent.damage} dmg)`
      : newIntent.effect === "block"
        ? " (Block)"
        : newIntent.effect === "heal_self"
          ? " (Heal)"
          : "";

    endLog.push(`⚠️ ${state.enemy.name} readies ${newIntent.name}${label}`);
  }

  fadeBlock(playerBlock, endLog);

  const newState = {
    ...state,
    enemyIntent: newIntent,
    enemyHand: newHand,
    enemyDeck: newDeck,
    enemyBlock,
    enemyEnergy: state.enemyMaxEnergy || 3,
    playerHp,
    playerBlock: 0,
    enemy: { ...state.enemy, currentHp: enemyHp },
    turn: "player",
    turnNumber: state.turnNumber + 1,
    energy: state.maxEnergy,
    skipDraw,
    blockScripture,
    dots,
    log: endLog,
    counter,
    faithDrainPending,
    ...cooldownStateFields(cd.cooldowns, cd.names),
    error: null,
  };

  const withDraw = drawNextTurnCard(newState, skipDraw);

  steps.push({ type: "end", state: { ...withDraw, skipDraw: 0 } });

  return steps;
}