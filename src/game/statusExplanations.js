// Centralized status effect explanations — single source of truth for all
// player-facing debuff names and descriptions used in battle.

// Consistent debuff names used everywhere (tooltips, logs, UI)
export const STATUS_NAMES = {
  curse: "Curse",
  // Renamed from "Confused Tongues" to avoid colliding with Pride of Babel's
  // action of the same name (two different mechanics must not share a label).
  silence: "Silenced Scripture",
  faithDrain: "Faith Drain",
  discard: "Discard",
  counter: "Counter",
  block: "Block",
};

// Tap-to-explain descriptions for each player status icon.
// `value` is the current stack/turn count shown in the battle UI.
export function getStatusExplanation(statusKey, value) {
  switch (statusKey) {
    case "curse":
      return {
        name: STATUS_NAMES.curse,
        text: `Curse: You take ${value > 0 ? "2 damage" : "damage"} from this effect. The number shows how many turns remain.`,
      };
    case "silence":
      return {
        name: STATUS_NAMES.silence,
        text: "Silenced Scripture: Scripture cards are blocked this turn. Attack, Defense, and Miracle cards are still playable if you have enough Faith.",
      };
    case "drawReduced":
      return {
        name: "Draw Reduced",
        text: "An enemy's draw denial shrank your hand this turn. Make the most of the cards you have — it cannot be used again until its cooldown ends.",
      };
    case "faithDrain":
      return {
        name: STATUS_NAMES.faithDrain,
        text: "Faith Drain: at the start of your next turn you lose 1 Faith. On Normal you always keep at least 1; on Hard your Faith may fall to 0. It cannot be used again until its cooldown ends.",
      };
    case "discard":
      return {
        name: STATUS_NAMES.discard,
        text: "Forced Discard: at the start of your next turn you discard 1 card. On Normal you choose which; on Hard it is chosen for you. Your final card is never discarded.",
      };
    case "compelled":
      return {
        name: "Compelled",
        text: "Compelled: at the start of your next turn, one affordable card is played automatically at its normal Faith cost. On Normal you confirm the forced card first. It never wastes a heal at full HP, and never spends Faith you don't have.",
      };
    case "counter":
      return {
        name: STATUS_NAMES.counter,
        text: `Counter: When the enemy attacks you, they take ${value} damage in retaliation. Stacks up to 12.`,
      };
    case "block":
      return {
        name: STATUS_NAMES.block,
        text: `Block: Absorbs ${value} incoming damage before your HP is reduced. Resets each turn.`,
      };
    default:
      return null;
  }
}

// Returns the exact reason a card cannot be played, or null if playable.
// `card` — the card object
// `battleState` — current battle state
export function getCardPlayabilityReason(card, battleState) {
  if (!card || !battleState) return null;

  const isSilenced = !!battleState.blockScripture;

  // Scripture blocked by Confused Tongues
  if (isSilenced && card.type === "scripture") {
    return {
      reason: "silence",
      label: "Blocked by Silenced Scripture",
      text: "Scripture cards are blocked this turn. Attack, Defense, and Miracle cards are still playable if you have enough Faith.",
    };
  }

  // Not enough Faith energy
  const hasFreePlay = battleState.freeCardsRemaining > 0;
  const canAfford = hasFreePlay || battleState.energy >= card.cost;
  if (!canAfford) {
    if (battleState.energy === 0) {
      return {
        reason: "faith",
        label: "No Faith left",
        text: "No Faith left. End your turn to refill.",
      };
    }
    return {
      reason: "faith",
      label: "Not enough Faith",
      text: `This card costs ${card.cost} Faith. You have ${battleState.energy} Faith remaining.`,
    };
  }

  return null; // playable
}