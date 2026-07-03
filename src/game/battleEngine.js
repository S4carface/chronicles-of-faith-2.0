// Battle engine logic — turn-based card combat

export const COUNTER_CAP = 12;

function pickEnemyAttack(enemy) {
  return enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
}

function buildEnemyDeck(enemy) {
  const blockAction = { name: "Raise Shield", damage: 0, icon: "🛡️", effect: "block", blockValue: 5, cost: 1, description: "Gains 5 Block" };
  return shuffle([
    ...enemy.attacks.map(a => ({ ...a, cost: a.cost || (a.damage >= 8 ? 2 : 1) })),
    blockAction,
  ]);
}

export function createBattleState(enemy, playerHp, maxPlayerHp, deck, startingBlock = 0, extraDraw = 0, heroId = null) {
  const shuffled = shuffle([...deck]);
  const enemyDeck = buildEnemyDeck(enemy);
  const enemyHand = enemyDeck.splice(0, 3);
  const intent = enemyHand[0] || pickEnemyAttack(enemy);

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
    hand: shuffled.splice(0, 5 + extraDraw),
    discard: [],
    turn: "player",
    turnNumber: 1,
    log: [`Battle with ${enemy.name} begins!`, `⚠️ ${enemy.name} prepares: ${intent.name}${intent.damage ? ` (${intent.damage} DMG)` : ""}`],
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
  };
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCards(state, count) {
  const newHand = [...state.hand];
  const newDeck = [...state.deck];
  const newDiscard = [...state.discard];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break;
      newDeck.push(...shuffle(newDiscard.splice(0)));
    }
    newHand.push(newDeck.shift());
  }

  return { ...state, hand: newHand, deck: newDeck, discard: newDiscard };
}

export function playCard(state, handIndex, card) {
  let newEnergy = state.energy;
  if (state.freeCardsRemaining > 0) {
    state = { ...state, freeCardsRemaining: state.freeCardsRemaining - 1 };
  } else {
    if (newEnergy < card.cost) return { ...state, error: "Not enough Faith!" };
    newEnergy -= card.cost;
  }

  const newHand = state.hand.filter((_, i) => i !== handIndex);
  const newDiscard = [...state.discard, card.id];
  const log = [...state.log];

  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let buffAttack = state.buffAttack;
  let freeCards = state.freeCardsRemaining;
  let blockScripture = state.blockScripture;
  let counter = state.counter || 0;

  const isScripture = card.type === "scripture";
  if (state.blockScripture && isScripture) {
    return { ...state, error: "Scripture cards are blocked this turn!" };
  }

  switch (card.type) {
    case "attack": {
      const passiveBonus = state.heroId === "adam" ? 1 : 0;
      let dmg = card.value + buffAttack + passiveBonus;
      if (state.enemyAttackMultiplier > 1) dmg = Math.floor(dmg * 2);
      if (enemyBlock > 0) {
        const absorbed = Math.min(enemyBlock, dmg);
        enemyBlock -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) log.push(`🛡️ Enemy blocked ${absorbed} damage`);
      }
      enemyHp = Math.max(0, enemyHp - dmg);
      log.push(`You played ${card.name} — ${dmg} damage!${passiveBonus ? " (+1 First Born Fury)" : ""}`);
      if (buffAttack > 0) { buffAttack = 0; }
      break;
    }
    case "defense": {
      const blockBonus = state.heroId === "noah" ? 2 : 0;
      const totalBlock = card.value + blockBonus;
      playerBlock += totalBlock;
      log.push(`You played ${card.name} — ${totalBlock} block!${blockBonus ? " (+2 Covenant Protection)" : ""}`);
      if (card.id === "lions_den") {
        counter = Math.min(COUNTER_CAP, counter + 4);
        log.push(`🦁 Counter surged — now ${counter} (cap ${COUNTER_CAP}).`);
      }
      break;
    }
    case "scripture": {
      if (card.id === "prayer" || card.id === "bread_life" || card.id === "living_water" || card.id === "burning_bush") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`You played ${card.name} — healed ${card.value}!`);
        if (card.id === "burning_bush") {
          enemyHp = Math.max(0, enemyHp - 5);
          log.push("Burning Bush deals 5 damage!");
        }
      } else if (card.id === "song_praise") {
        newEnergy += 2;
        log.push("You played Song of Praise — gained 2 Faith!");
      } else if (card.id === "wisdom") {
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 2);
        log.push("You played Wisdom — drew 2 cards!");
        return { ...drawn, energy: newEnergy, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, counter, enemyBlock };
      } else if (card.id === "doves_peace") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`You played Dove's Peace — healed ${card.value}!`);
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 1);
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, counter, enemyBlock };
      } else if (card.id === "manna_heaven") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`You played Manna from Heaven — healed ${card.value}!`);
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 2);
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, counter, enemyBlock };
      } else if (card.id === "coat_colors") {
        newEnergy += 3;
        log.push("You played Coat of Many Colors — gained 3 Faith!");
      } else if (card.id === "jacobs_ladder") {
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 3);
        log.push("You played Jacob's Ladder — drew 3 cards!");
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, counter, enemyBlock };
      } else if (card.id === "righteous_aim") {
        log.push("You played Righteous Aim — next attack deals DOUBLE!");
        return { ...state, hand: newHand, energy: newEnergy, enemyAttackMultiplier: 2, discard: newDiscard, log, buffAttack, freeCardsRemaining: freeCards, blockScripture, counter, enemyBlock };
      }
      break;
    }
    case "miracle": {
      let dmg = card.value;
      if (state.enemyAttackMultiplier > 1) dmg = Math.floor(dmg * 2);
      if (enemyBlock > 0) {
        const absorbed = Math.min(enemyBlock, dmg);
        enemyBlock -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) log.push(`🛡️ Enemy blocked ${absorbed} damage`);
      }
      enemyHp = Math.max(0, enemyHp - dmg);
      log.push(`You played ${card.name} — ${dmg} holy damage!`);
      if (card.id === "angel_lord") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + 10);
        log.push("Angel of the Lord heals you 10 HP!");
      }
      if (buffAttack > 0) buffAttack = 0;
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
  };
}

// Block carries into enemy turn, resets after enemy attacks
export function endPlayerTurn(state) {
  const log = [...state.log, "— Your turn ends —"];
  return { ...state, turn: "enemy", enemyAttackMultiplier: 1, log };
}

// Apply Counter retaliation to the enemy on an attack move.
// Counter triggers once per enemy attack, persists across turns, caps at COUNTER_CAP.
function applyCounter(state, enemyHp, log, counter) {
  if (!counter || counter <= 0) return { enemyHp, log, counterHit: 0 };
  const dmg = counter;
  enemyHp = Math.max(0, enemyHp - dmg);
  log.push(`Counter struck back — enemy took ${dmg} damage.`);
  return { enemyHp, log, counterHit: dmg };
}

export function enemyTurn(state) {
  const log = [...state.log];
  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let counter = state.counter || 0;
  let skipDraw = state.skipDraw;
  let blockScripture = false;
  let dots = state.dots;

  // Noah's Covenant Shield — negate ALL incoming damage for one turn
  if (state.shieldActive) {
    log.push(`🌈 Your Covenant Shield negated the enemy's turn!`);
    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];
    if (allCards.length === 0) allCards = [...state.enemy.attacks];
    const newDeck = shuffle(allCards);
    const newHand = newDeck.splice(0, 3);
    const newIntent = newHand[0] || pickEnemyAttack(state.enemy);
    if (newIntent) {
      log.push(`⚠️ ${state.enemy.name} prepares: ${newIntent.name}${newIntent.damage ? ` (${newIntent.damage} DMG)` : ""}`);
    }
    const newState = {
      ...state,
      enemyIntent: newIntent,
      enemyHand: newHand,
      enemyDeck: newDeck,
      enemyBlock: state.enemyBlock || 0,
      enemyEnergy: state.enemyMaxEnergy || 3,
      playerHp,
      playerBlock: state.playerBlock,
      enemy: { ...state.enemy, currentHp: enemyHp },
      log,
      turn: "player",
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      shieldActive: false,
      counter,
    };
    const drawCount = Math.max(0, 5 - skipDraw);
    const withDraw = drawCards(newState, drawCount);
    return { ...withDraw, skipDraw: 0 };
  }

  // Enemy plays actions using energy — can attack, block, or heal
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
      // Attack action
      let damage = action.damage;
      if (playerBlock > 0) {
        const absorbed = Math.min(playerBlock, damage);
        playerBlock -= absorbed;
        damage -= absorbed;
        if (absorbed > 0) log.push(`🛡️ Blocked ${absorbed} damage`);
      }
      if (damage > 0) {
        playerHp = Math.max(0, playerHp - damage);
      }
      log.push(`💥 ${state.enemy.name} used ${action.name} — ${action.damage} damage!`);
      // Counter — triggers on every enemy attack move, even if fully blocked
      const ctr = applyCounter(state, enemyHp, log, counter);
      enemyHp = ctr.enemyHp;
      // Heal effect on attack+heal combos
      if (action.effect === "heal_self") {
        const healAmt = state.enemy.isBoss ? 6 : 4;
        enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
        log.push(`✨ ${state.enemy.name} healed ${healAmt} HP!`);
      }
    } else if (action.effect === "block") {
      const blockVal = action.blockValue || 5;
      enemyBlock += blockVal;
      log.push(`🛡️ ${state.enemy.name} used ${action.name} — gained ${blockVal} Block!`);
    } else if (action.effect === "heal_self") {
      const healAmt = state.enemy.isBoss ? 6 : 4;
      enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
      log.push(`✨ ${state.enemy.name} used ${action.name} — healed ${healAmt} HP!`);
    } else {
      log.push(`${state.enemy.name} used ${action.name}!`);
    }

    // Apply non-damage effects (can be on any action)
    if (action.effect === "skip_draw") {
      skipDraw = 1;
      log.push(`⚠️ ${action.description}`);
    }
    if (action.effect === "block_scripture") {
      blockScripture = true;
      log.push("⚠️ Scripture cards are blocked next turn!");
    }
    if (action.effect === "dot") {
      dots = 3;
      log.push("☠️ You are cursed — taking 2 damage per turn!");
    }

    discard.push(action);
  }

  // DOT damage to player at start of their turn
  if (dots > 0) {
    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;
    log.push(`☠️ Curse — 2 damage! (${dots} turns left)`);
  }

  // Build new enemy hand from remaining deck + discard
  let allCards = [...deck, ...discard];
  if (allCards.length === 0) allCards = [...state.enemy.attacks];
  const newDeck = shuffle(allCards);
  const newHand = newDeck.splice(0, 3);
  const newIntent = newHand[0] || pickEnemyAttack(state.enemy);
  if (newIntent) {
    const label = newIntent.damage ? ` (${newIntent.damage} DMG)` : newIntent.effect === "block" ? " (Block)" : newIntent.effect === "heal_self" ? " (Heal)" : "";
    log.push(`⚠️ ${state.enemy.name} prepares: ${newIntent.name}${label}`);
  }

  const newState = {
    ...state,
    enemyIntent: newIntent,
    enemyHand: newHand,
    enemyDeck: newDeck,
    enemyBlock,
    enemyEnergy: state.enemyMaxEnergy || 3,
    playerHp,
    playerBlock,
    enemy: { ...state.enemy, currentHp: enemyHp },
    turn: "player",
    turnNumber: state.turnNumber + 1,
    energy: state.maxEnergy,
    skipDraw,
    blockScripture,
    dots,
    log,
    counter,
  };

  // Draw cards for player's new turn
  const drawCount = Math.max(0, 5 - skipDraw);
  const withDraw = drawCards(newState, drawCount);
  return { ...withDraw, skipDraw: 0 };
}

export function checkBattleEnd(state) {
  if (state.enemy.currentHp <= 0) return "victory";
  if (state.playerHp <= 0) return "defeat";
  return null;
}

// Break enemy turn into individual steps for step-by-step animation
export function getEnemyTurnSteps(state) {
  const steps = [];
  const log = [...state.log];
  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let enemyBlock = state.enemyBlock || 0;
  let counter = state.counter || 0;
  let skipDraw = state.skipDraw;
  let blockScripture = false;
  let dots = state.dots;

  // Covenant Shield — negate entire turn
  if (state.shieldActive) {
    log.push(`Your Covenant Shield negated the enemy's turn!`);
    let allCards = [...(state.enemyHand || []), ...(state.enemyDeck || [])];
    if (allCards.length === 0) allCards = [...state.enemy.attacks];
    const newDeck = shuffle(allCards);
    const newHand = newDeck.splice(0, 3);
    const newIntent = newHand[0] || pickEnemyAttack(state.enemy);
    if (newIntent) {
      log.push(`${state.enemy.name} prepares: ${newIntent.name}${newIntent.damage ? ` (${newIntent.damage} DMG)` : ""}`);
    }
    const newState = {
      ...state,
      enemyIntent: newIntent,
      enemyHand: newHand,
      enemyDeck: newDeck,
      enemyBlock: state.enemyBlock || 0,
      enemyEnergy: state.enemyMaxEnergy || 3,
      playerHp,
      playerBlock: state.playerBlock,
      enemy: { ...state.enemy, currentHp: enemyHp },
      log,
      turn: "player",
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      shieldActive: false,
      counter,
    };
    const drawCount = Math.max(0, 5 - skipDraw);
    const withDraw = drawCards(newState, drawCount);
    steps.push({ type: "shield", state: { ...withDraw, skipDraw: 0 } });
    return steps;
  }

  // Normal enemy turn — collect intermediate states
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
        if (absorbed > 0) stepLog.push(`Blocked ${absorbed} damage`);
      }
      if (damage > 0) {
        playerHp = Math.max(0, playerHp - damage);
      }
      stepLog.push(`${state.enemy.name} used ${action.name} — ${action.damage} damage!`);
      // Counter — triggers on every enemy attack move, even if fully blocked
      const ctr = applyCounter(state, enemyHp, stepLog, counter);
      enemyHp = ctr.enemyHp;
      counterHit = ctr.counterHit;
      if (action.effect === "heal_self") {
        const healAmt = state.enemy.isBoss ? 6 : 4;
        enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
        stepLog.push(`${state.enemy.name} healed ${healAmt} HP!`);
      }
    } else if (action.effect === "block") {
      const blockVal = action.blockValue || 5;
      enemyBlock += blockVal;
      stepLog.push(`${state.enemy.name} used ${action.name} — gained ${blockVal} Block!`);
    } else if (action.effect === "heal_self") {
      const healAmt = state.enemy.isBoss ? 6 : 4;
      enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
      stepLog.push(`${state.enemy.name} used ${action.name} — healed ${healAmt} HP!`);
    } else {
      stepLog.push(`${state.enemy.name} used ${action.name}!`);
    }

    if (action.effect === "skip_draw") {
      skipDraw = 1;
      stepLog.push(action.description || "Draw 1 fewer card next turn");
    }
    if (action.effect === "block_scripture") {
      blockScripture = true;
      stepLog.push("Scripture cards are blocked next turn!");
    }
    if (action.effect === "dot") {
      dots = 3;
      stepLog.push("You are cursed — taking 2 damage per turn!");
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
      },
    });

    log.length = 0;
    log.push(...stepLog);
  }

  // DOT step
  if (dots > 0) {
    const dotLog = [...log];
    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;
    dotLog.push(`Curse — 2 damage! (${dots} turns left)`);

    steps.push({
      type: "dot",
      state: {
        ...state,
        playerHp,
        dots,
        log: dotLog,
      },
    });

    log.length = 0;
    log.push(...dotLog);
  }

  // End step — build new hand, draw player cards
  let allCards = [...deck, ...discard];
  if (allCards.length === 0) allCards = [...state.enemy.attacks];
  const newDeck = shuffle(allCards);
  const newHand = newDeck.splice(0, 3);
  const newIntent = newHand[0] || pickEnemyAttack(state.enemy);
  const endLog = [...log];
  if (newIntent) {
    const label = newIntent.damage ? ` (${newIntent.damage} DMG)` : newIntent.effect === "block" ? " (Block)" : newIntent.effect === "heal_self" ? " (Heal)" : "";
    endLog.push(`${state.enemy.name} prepares: ${newIntent.name}${label}`);
  }

  const newState = {
    ...state,
    enemyIntent: newIntent,
    enemyHand: newHand,
    enemyDeck: newDeck,
    enemyBlock,
    enemyEnergy: state.enemyMaxEnergy || 3,
    playerHp,
    playerBlock,
    enemy: { ...state.enemy, currentHp: enemyHp },
    turn: "player",
    turnNumber: state.turnNumber + 1,
    energy: state.maxEnergy,
    skipDraw,
    blockScripture,
    dots,
    log: endLog,
    counter,
  };

  const drawCount = Math.max(0, 5 - skipDraw);
  const withDraw = drawCards(newState, drawCount);
  steps.push({ type: "end", state: { ...withDraw, skipDraw: 0 } });

  return steps;
}