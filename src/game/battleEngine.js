// Battle engine logic — turn-based card combat

export const COUNTER_CAP = 12;
export const HAND_LIMIT = 4;

function pickEnemyAttack(enemy, rng = Math.random) {
  return enemy.attacks[Math.floor(rng() * enemy.attacks.length)];
}

// Identifies Cain's signature draw-denial action (Mark of Cain).
export function isMarkAction(action) {
  return !!action && action.effect === "skip_draw" && action.name === "Mark of Cain";
}

// Cain campaign rebalance rules for Mark of Cain. Returns null for anything
// that must stay untouched: the Daily Challenge (mode "daily"), any enemy other
// than Cain, or when there is no battle state. When it returns a rule, the
// engine applies a per-difficulty cooldown so Mark can't be used on consecutive
// turns, plus a draw-reduction floor so campaign players (who draw only 1 card
// per turn) don't repeatedly lose their entire card income.
//
//   easy   → 4-turn cooldown, draw never falls below 1
//   normal → 3-turn cooldown, draw never falls below 1
//   hard   → 2-turn cooldown, draw may fall to 0 (but only once, then cooldown)
export function getMarkRule(state) {
  if (!state || state.mode === "daily") return null;
  if (state.enemy?.id !== "cain_wrath") return null;

  const difficulty = state.difficulty || "normal";

  if (difficulty === "easy") return { cooldown: 4, allowZeroDraw: false };
  if (difficulty === "hard") return { cooldown: 2, allowZeroDraw: true };
  return { cooldown: 3, allowZeroDraw: false };
}

// Picks the enemy's next intent from the given card pool. When Mark of Cain is
// on cooldown (excludeMark), the top non-Mark card is chosen instead so Cain
// keeps pressuring with ordinary attacks while his draw-denial recovers. With
// excludeMark false this is identical to the previous shuffle+take-top behavior,
// preserving Daily Challenge determinism (same rng draw count and ordering).
function selectEnemyIntent(cards, rng, enemy, excludeMark = false) {
  const pool = cards.length > 0 ? cards : [...enemy.attacks];
  const shuffled = shuffle(pool, rng);

  let idx = 0;
  if (excludeMark) {
    const nonMark = shuffled.findIndex((c) => !isMarkAction(c));
    if (nonMark >= 0) idx = nonMark;
  }

  const chosen = shuffled.splice(idx, 1)[0] || pickEnemyAttack(enemy, rng);
  return { intent: chosen, deck: shuffled };
}

// Honest battle-log line for a resolving draw-denial action. Under the Cain
// campaign rule the wording matches what actually happens: Easy/Normal keep at
// least 1 card, Hard may be cut to 0. Any other case keeps the generic wording.
function markResolutionLog(state, action) {
  const rule = getMarkRule(state);

  if (rule && isMarkAction(action)) {
    return rule.allowZeroDraw
      ? "⚠️ Mark of Cain — your next draw may be cut to 0."
      : "⚠️ Mark of Cain — your next draw is contested (you keep at least 1 card).";
  }

  return `⚠️ ${action.description || "Draw 1 fewer next turn"}`;
}

// Advances Mark of Cain's cooldown for one elapsed enemy turn. If Mark resolved
// this turn it enters cooldown; otherwise an active cooldown ticks down by one.
// Returns the new cooldown plus any battle-log lines (cooldown started/expired).
function advanceMarkCooldown(state, markResolvedThisTurn) {
  const rule = getMarkRule(state);
  let cooldown = state.markCooldown || 0;
  const logs = [];

  if (!rule) return { cooldown, logs };

  if (markResolvedThisTurn) {
    cooldown = rule.cooldown;
    logs.push(`⏳ Mark of Cain recovers — unavailable for ${rule.cooldown} turns.`);
  } else if (cooldown > 0) {
    cooldown -= 1;
    if (cooldown === 0) {
      logs.push("👁️ Mark of Cain is ready again.");
    }
  }

  return { cooldown, logs };
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
    markCooldown: 0,
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

  // Cain campaign draw-reduction floor. Mark of Cain reduces the next draw by
  // 1, but campaign players draw only 1 card/turn, so an unfloored reduction
  // wipes their entire card income. On Easy/Normal the draw never falls below 1
  // (when the player would otherwise draw ≥ 1). Hard (allowZeroDraw) may reach 0
  // — but Mark then goes on cooldown, so it can't repeat the shutdown.
  const rule = getMarkRule(state);
  if (
    rule &&
    !rule.allowZeroDraw &&
    (skipDraw || 0) > 0 &&
    baseDrawCount >= 1 &&
    cardsToDraw < 1
  ) {
    cardsToDraw = 1;
  }

  return drawCards(state, cardsToDraw);
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

  switch (card.type) {
    case "attack": {
      const passiveBonus = state.heroId === "adam" ? 1 : 0;
      let dmg = card.value + buffAttack + passiveBonus;

      if (state.enemyAttackMultiplier > 1) {
        dmg = Math.floor(dmg * 2);
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
        log.push("🎯 Righteous Aim — next attack ×2");

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
      let dmg = card.value;

      if (state.enemyAttackMultiplier > 1) {
        dmg = Math.floor(dmg * 2);
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
    enemyAttackMultiplier: card.id === "righteous_aim" ? state.enemyAttackMultiplier : 1,
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

    // Mark did not resolve (turn negated), so its cooldown simply ticks down.
    const cd = advanceMarkCooldown(state, false);
    log.push(...cd.logs);

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const picked = selectEnemyIntent(allCards, rng, state.enemy, cd.cooldown > 0);
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
      markCooldown: cd.cooldown,
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
  let markResolved = false;

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
      if (isMarkAction(action)) markResolved = true;
      log.push(markResolutionLog(state, action));
    }

    if (action.effect === "block_scripture") {
      blockScripture = true;
      log.push("⚠️ Confused Tongues — Scripture blocked next turn");
    }

    if (action.effect === "dot") {
      dots = 3;
      log.push("☠️ Curse — 2 dmg/turn");
    }

    discard.push(action);
  }

  if (dots > 0) {
    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;
    log.push(`☠️ Curse — 2 dmg (${dots} turn${dots === 1 ? "" : "s"} left)`);
  }

  // Advance Mark of Cain's cooldown for this elapsed enemy turn, then keep Mark
  // out of the next intent while it recovers so Cain can't shut down draws on
  // consecutive turns.
  const cd = advanceMarkCooldown(state, markResolved);
  log.push(...cd.logs);

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const picked = selectEnemyIntent(allCards, rng, state.enemy, cd.cooldown > 0);
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
    markCooldown: cd.cooldown,
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

    // Mark did not resolve (turn negated), so its cooldown simply ticks down.
    const cd = advanceMarkCooldown(state, false);
    log.push(...cd.logs);

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const picked = selectEnemyIntent(allCards, rng, state.enemy, cd.cooldown > 0);
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
      markCooldown: cd.cooldown,
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
  let markResolved = false;

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
      if (isMarkAction(action)) markResolved = true;
      stepLog.push(markResolutionLog(state, action));
    }

    if (action.effect === "block_scripture") {
      blockScripture = true;
      stepLog.push("⚠️ Confused Tongues — Scripture blocked next turn");
    }

    if (action.effect === "dot") {
      dots = 3;
      stepLog.push("☠️ Curse — 2 dmg/turn");
    }

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

  // Advance Mark of Cain's cooldown for this elapsed enemy turn, then keep Mark
  // out of the next intent while it recovers.
  const cd = advanceMarkCooldown(state, markResolved);
  endLog.push(...cd.logs);

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const picked = selectEnemyIntent(allCards, rng, state.enemy, cd.cooldown > 0);
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
    markCooldown: cd.cooldown,
    error: null,
  };

  const withDraw = drawNextTurnCard(newState, skipDraw);

  steps.push({ type: "end", state: { ...withDraw, skipDraw: 0 } });

  return steps;
}