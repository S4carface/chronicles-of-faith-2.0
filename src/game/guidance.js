import { getCardById } from "@/data/cards";

const HEALING_CARD_IDS = ["prayer", "bread_life", "living_water", "burning_bush", "doves_peace", "manna_heaven"];

// Returns a single short tactical hint based on the current battle state,
// or null if no hint is appropriate.
export function getGuidanceHint(battleState) {
  if (!battleState || battleState.turn !== "player") return null;

  const handCards = battleState.hand.map(id => getCardById(id)).filter(Boolean);
  if (handCards.length === 0) return null;

  const enemy = analyzeEnemyTurn(battleState);

  // 1. Lethal — a playable card can defeat the enemy this turn
  const lethal = findLethalCard(battleState, handCards);
  if (lethal) {
    return `"${lethal.name}" can defeat the enemy this turn.`;
  }

  // 2. Incoming lethal — enemy attack will drop you to 0 without defense
  if (enemy.totalDamage > 0 && !battleState.shieldActive) {
    const net = Math.max(0, enemy.totalDamage - battleState.playerBlock);
    if (net >= battleState.playerHp) {
      const def = findDefenseCard(battleState, handCards);
      if (def) {
        return `Enemy attacks for ${enemy.totalDamage} next. Play a Defense card before ending your turn.`;
      }
      return `Enemy attacks for ${enemy.totalDamage} next — that is lethal. Defeat it or find a way to survive.`;
    }
  }

  // 3. Wasted heal — a heal card is playable but HP is already full
  if (battleState.playerHp >= battleState.maxPlayerHp) {
    const wasted = handCards.find(c =>
      (HEALING_CARD_IDS.includes(c.id) || c.id === "angel_lord") &&
      (battleState.freeCardsRemaining > 0 || battleState.energy >= c.cost)
    );
    if (wasted) {
      return `"${wasted.name}" heals you, but your HP is already full.`;
    }
  }

  // 4. Enemy will gain Block
  if (enemy.willBlock) {
  return `Enemy will gain Block next. Attack now before the shield rises. If you cannot attack, prepare, defend, heal, or save Faith.`;
}

  // 5. Enemy will heal
  if (enemy.willHeal) {
    return `Enemy will heal next. Attack now to pressure it.`;
  }

  // 6. Enough Faith for two cards
  if (canPlayTwoCards(battleState, handCards)) {
    return `You have enough Faith to play two cards.`;
  }

  // 7. Calm fallback — just describe what's coming
  if (enemy.totalDamage > 0) {
    return `Enemy attacks for ${enemy.totalDamage} next turn.`;
  }
  return `Review your hand and plan your turn.`;
}

// Simulate the enemy's energy spending to figure out what it will actually do.
function analyzeEnemyTurn(state) {
  const hand = [...(state.enemyHand || [])];
  let energy = state.enemyMaxEnergy || 3;
  let totalDamage = 0;
  let willBlock = false;
  let willHeal = false;

  for (const action of hand) {
    const cost = action.cost || 1;
    if (cost > energy) continue;
    energy -= cost;
    if (action.damage > 0) totalDamage += action.damage;
    if (action.effect === "block") willBlock = true;
    if (action.effect === "heal_self") willHeal = true;
  }

  return { totalDamage, willBlock, willHeal };
}

function findLethalCard(state, handCards) {
  const passiveBonus = state.heroId === "adam" ? 1 : 0;
  for (const card of handCards) {
    if (card.type !== "attack" && card.type !== "miracle") continue;
    const playable = state.freeCardsRemaining > 0 || state.energy >= card.cost;
    if (!playable) continue;
    let dmg = card.value + (state.buffAttack || 0) + passiveBonus;
    if (state.enemyAttackMultiplier > 1) dmg = Math.floor(dmg * 2);
    const effective = state.enemyBlock > 0 ? Math.max(0, dmg - state.enemyBlock) : dmg;
    if (effective >= state.enemy.currentHp) return card;
  }
  return null;
}

function findDefenseCard(state, handCards) {
  return handCards.find(c =>
    c.type === "defense" &&
    (state.freeCardsRemaining > 0 || state.energy >= c.cost)
  );
}

function canPlayTwoCards(state, handCards) {
  const playable = handCards.filter(c => state.freeCardsRemaining > 0 || state.energy >= c.cost);
  if (playable.length < 2) return false;
  const sorted = [...playable].sort((a, b) => a.cost - b.cost);
  let energy = state.energy;
  let free = state.freeCardsRemaining;
  let count = 0;
  for (const card of sorted) {
    if (free > 0) { free--; count++; }
    else if (energy >= card.cost) { energy -= card.cost; count++; }
    else break;
  }
  return count >= 2;
}