// Battle engine logic — turn-based card combat

export const COUNTER_CAP = 12;
export const HAND_LIMIT = 5;

function pickEnemyAttack(enemy) {
  return enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
}

function isCardObject(card) {
  return card && typeof card === "object" && card.id;
}

function buildEnemyDeck(enemy) {
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
  ]);
}

export function createBattleState(
  enemy,
  playerHp,
  maxPlayerHp,
  deck,
  startingBlock = 0,
  extraDraw = 0,
  heroId = null
) {
  const shuffled = shuffle([...deck]);
  const enemyDeck = buildEnemyDeck(enemy);
  const enemyHand = enemyDeck.splice(0, 3);
  const intent = enemyHand[0] || pickEnemyAttack(enemy);
  const openingHandSize = Math.min(HAND_LIMIT, 5 + extraDraw);

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
    error: null,
  };
}

export function shuffle(arr) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function drawCards(state, count) {
  const newHand = [...(state.hand || [])];
  const newDeck = [...(state.deck || [])];
  const newDiscard = [...(state.discard || [])];
  let reshuffled = false;

  const roomInHand = Math.max(0, HAND_LIMIT - newHand.length);
  const cardsToDraw = Math.max(0, Math.min(count, roomInHand));

  for (let i = 0; i < cardsToDraw; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break;

      const recycledCards = newDiscard.splice(0).filter(isCardObject);
      if (recycledCards.length === 0) break;

      newDeck.push(...shuffle(recycledCards));
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

function drawUpToHandLimit(state, skipDraw = 0) {
  const targetHandSize = Math.max(0, HAND_LIMIT - (skipDraw || 0));
  const currentHandSize = state.hand?.length || 0;
  const drawCount = Math.max(0, targetHandSize - currentHandSize);

  return drawCards(state, drawCount);
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
    `Enemy acts next. Draw back up to ${HAND_LIMIT} after the enemy turn.`,
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

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const newDeck = shuffle(allCards);
    const newHand = newDeck.splice(0, 3);
    const newIntent = newHand[0] || pickEnemyAttack(state.enemy);

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
      counter,
      error: null,
    };

    const withDraw = drawUpToHandLimit(newState, skipDraw);

    return { ...withDraw, skipDraw: 0 };
  }

  let energy = state.enemyMaxEnergy || 3;
  const hand = [...(state.enemyHand || [])];
  let deck = [...(state.enemyDeck || [])];
  const discard = [];

  while (energy > 0 && hand.length > 0) {
    const action = hand.shift();
    const cost = action.cost || 1;

    if (cost > energy) {
      discard.push(action);
      continue;
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
      log.push(`⚠️ ${action.description || "Draw 1 fewer next turn"}`);
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

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const newDeck = shuffle(allCards);
  const newHand = newDeck.splice(0, 3);
  const newIntent = newHand[0] || pickEnemyAttack(state.enemy);

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
    error: null,
  };

  const withDraw = drawUpToHandLimit(newState, skipDraw);

  return { ...withDraw, skipDraw: 0 };
}

export function checkBattleEnd(state) {
  if (state.enemy.currentHp <= 0) return "victory";
  if (state.playerHp <= 0) return "defeat";
  return null;
}

export function getEnemyTurnSteps(state) {
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

    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];

    if (allCards.length === 0) {
      allCards = [...state.enemy.attacks];
    }

    const newDeck = shuffle(allCards);
    const newHand = newDeck.splice(0, 3);
    const newIntent = newHand[0] || pickEnemyAttack(state.enemy);

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
      counter,
      error: null,
    };

    const withDraw = drawUpToHandLimit(newState, skipDraw);

    steps.push({ type: "shield", state: { ...withDraw, skipDraw: 0 } });

    return steps;
  }

  let energy = state.enemyMaxEnergy || 3;
  const hand = [...(state.enemyHand || [])];
  let deck = [...(state.enemyDeck || [])];
  const discard = [];
  let handIdx = 0;

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
      stepLog.push(`⚠️ ${action.description || "Draw 1 fewer next turn"}`);
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

  let allCards = [...deck, ...discard, ...hand];

  if (allCards.length === 0) {
    allCards = [...state.enemy.attacks];
  }

  const newDeck = shuffle(allCards);
  const newHand = newDeck.splice(0, 3);
  const newIntent = newHand[0] || pickEnemyAttack(state.enemy);
  const endLog = [...log];

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
    error: null,
  };

  const withDraw = drawUpToHandLimit(newState, skipDraw);

  steps.push({ type: "end", state: { ...withDraw, skipDraw: 0 } });

  return steps;
}
