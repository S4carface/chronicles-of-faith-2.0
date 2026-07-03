// Battle engine logic — turn-based card combat

function pickEnemyAttack(enemy) {
  return enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
}

export function createBattleState(enemy, playerHp, maxPlayerHp, deck, startingBlock = 0, extraDraw = 0) {
  const shuffled = shuffle([...deck]);
  const intent = pickEnemyAttack(enemy);
  return {
    enemy: { ...enemy, currentHp: enemy.hp, maxHp: enemy.hp },
    enemyIntent: intent,
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
    log: [`Battle with ${enemy.name} begins!`, `⚠️ ${enemy.name} prepares: ${intent.name} (${intent.damage} DMG)`],
    enemyAttackMultiplier: 1,
    blockScripture: false,
    buffAttack: 0,
    shieldActive: false,
    covenantShieldUsed: false,
    freeCardsRemaining: 0,
    dots: 0,
    skipDraw: 0,
    thorns: 0,
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
  let buffAttack = state.buffAttack;
  let freeCards = state.freeCardsRemaining;
  let blockScripture = state.blockScripture;
  let thorns = state.thorns;

  const isScripture = card.type === "scripture";
  if (state.blockScripture && isScripture) {
    return { ...state, error: "Scripture cards are blocked this turn!" };
  }

  switch (card.type) {
    case "attack": {
      let dmg = card.value + buffAttack;
      if (state.enemyAttackMultiplier > 1) dmg = Math.floor(dmg * 2);
      enemyHp = Math.max(0, enemyHp - dmg);
      log.push(`You played ${card.name} — ${dmg} damage!`);
      if (buffAttack > 0) { buffAttack = 0; }
      break;
    }
    case "defense": {
      playerBlock += card.value;
      log.push(`You played ${card.name} — ${card.value} block!`);
      // Lion's Den: counter attack
      if (card.id === "lions_den") {
        thorns = 4;
        log.push(`Counter Attack active — enemy will take 4 damage when it attacks!`);
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
        return { ...drawn, energy: newEnergy, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, thorns };
      } else if (card.id === "doves_peace") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`You played Dove's Peace — healed ${card.value}!`);
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 1);
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, thorns };
      } else if (card.id === "manna_heaven") {
        playerHp = Math.min(state.maxPlayerHp, playerHp + card.value);
        log.push(`You played Manna from Heaven — healed ${card.value}!`);
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 2);
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, thorns };
      } else if (card.id === "coat_colors") {
        newEnergy += 3;
        log.push("You played Coat of Many Colors — gained 3 Faith!");
      } else if (card.id === "jacobs_ladder") {
        const drawn = drawCards({ ...state, hand: newHand, deck: state.deck, discard: newDiscard }, 3);
        log.push("You played Jacob's Ladder — drew 3 cards!");
        return { ...drawn, energy: newEnergy, playerHp, playerBlock, enemyHp, discard: [...drawn.discard, card.id], log, buffAttack, freeCardsRemaining: freeCards, blockScripture, thorns };
      } else if (card.id === "righteous_aim") {
        log.push("You played Righteous Aim — next attack deals DOUBLE!");
        return { ...state, hand: newHand, energy: newEnergy, enemyAttackMultiplier: 2, discard: newDiscard, log, buffAttack, freeCardsRemaining: freeCards, blockScripture, thorns };
      }
      break;
    }
    case "miracle": {
      let dmg = card.value;
      if (state.enemyAttackMultiplier > 1) dmg = Math.floor(dmg * 2);
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
    log,
    enemyAttackMultiplier: card.id === "righteous_aim" ? state.enemyAttackMultiplier : 1,
    buffAttack,
    freeCardsRemaining: freeCards,
    blockScripture,
    thorns,
  };
}

// Block carries into enemy turn, resets after enemy attacks
export function endPlayerTurn(state) {
  const log = [...state.log, "— Your turn ends —"];
  return { ...state, turn: "enemy", enemyAttackMultiplier: 1, log };
}

export function enemyTurn(state) {
  const log = [...state.log];
  let playerHp = state.playerHp;
  let playerBlock = state.playerBlock;
  let enemyHp = state.enemy.currentHp;
  let thorns = state.thorns;
  const attack = state.enemyIntent || pickEnemyAttack(state.enemy);

  // Noah's Covenant Shield — negate all damage, still draw cards for next turn
  if (state.shieldActive) {
    log.push(`🌈 Your Covenant Shield negated ${attack.name}!`);
    const newIntent = pickEnemyAttack(state.enemy);
    log.push(`⚠️ ${state.enemy.name} prepares: ${newIntent.name} (${newIntent.damage} DMG)`);
    const newState = {
      ...state,
      enemyIntent: newIntent,
      playerHp,
      playerBlock: 0,
      enemy: { ...state.enemy, currentHp: enemyHp },
      log,
      turn: "player",
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      shieldActive: false,
      thorns: 0,
    };
    const drawCount = Math.max(0, 5 - state.skipDraw);
    const withDraw = drawCards(newState, drawCount);
    return { ...withDraw, skipDraw: 0 };
  }

  let damage = attack.damage;

  // Apply block absorption
  if (playerBlock > 0) {
    const absorbed = Math.min(playerBlock, damage);
    playerBlock -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) log.push(`🛡️ Blocked ${absorbed} damage`);
  }
  if (damage > 0) {
    playerHp = Math.max(0, playerHp - damage);
  }
  log.push(`💥 ${state.enemy.name} used ${attack.name} — ${attack.damage} damage!`);

  // Counter / Thorns damage — enemy takes damage when attacking
  if (thorns > 0) {
    enemyHp = Math.max(0, enemyHp - thorns);
    log.push(`🗡️ Counter Attack — ${state.enemy.name} took ${thorns} damage!`);
    thorns = 0;
  }

  // Block resets after enemy attacks
  playerBlock = 0;

  if (attack.effect === "heal_self") {
    const healAmt = state.enemy.isBoss ? 6 : 4;
    enemyHp = Math.min(state.enemy.maxHp, enemyHp + healAmt);
    log.push(`${state.enemy.name} healed ${healAmt} HP!`);
  }

  let skipDraw = state.skipDraw;
  if (attack.effect === "skip_draw") {
    skipDraw = 1;
    log.push(`⚠️ ${attack.description}`);
  }

  let blockScripture = false;
  if (attack.effect === "block_scripture") {
    blockScripture = true;
    log.push("⚠️ Scripture cards are blocked next turn!");
  }

  let dots = state.dots;
  if (attack.effect === "dot") {
    dots = 3;
    log.push("☠️ You are cursed — taking 2 damage per turn!");
  }

  // DOT damage to player at start of their turn
  if (dots > 0) {
    playerHp = Math.max(0, playerHp - 2);
    dots -= 1;
    log.push(`☠️ Curse — 2 damage! (${dots} turns left)`);
  }

  // Compute next enemy intent for telegraphing
  const newIntent = pickEnemyAttack(state.enemy);
  log.push(`⚠️ ${state.enemy.name} prepares: ${newIntent.name} (${newIntent.damage} DMG)`);

  const newState = {
    ...state,
    enemyIntent: newIntent,
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
    thorns,
  };

  // Draw cards for new turn
  const drawCount = Math.max(0, 5 - skipDraw);
  const withDraw = drawCards(newState, drawCount);
  return { ...withDraw, skipDraw: 0 };
}

export function checkBattleEnd(state) {
  if (state.enemy.currentHp <= 0) return "victory";
  if (state.playerHp <= 0) return "defeat";
  return null;
}