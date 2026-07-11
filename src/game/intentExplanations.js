// Returns a plain-language explanation for an enemy intent action.
// Explains both what will happen and how the player can respond.
export function getIntentExplanation(action, enemy) {
  if (!action) return null;

  const parts = [];
  const isBoss = enemy?.isBoss;

  if (action.damage > 0) {
    parts.push(
      `Enemy will deal ${action.damage} damage. Consider defending, healing, or defeating it first.`
    );
  }

  if (action.effect === "block") {
    const blockAmount = action.blockValue || 5;

    parts.push(
      `Enemy will gain ${blockAmount} Block. Attack now before the shield rises. Once Block is active, prepare, defend, heal, or save Faith until you have a better opening.`
    );
  }

  if (action.effect === "heal_self") {
    const healAmount = isBoss ? 6 : 4;

    parts.push(
      `Enemy will heal ${healAmount} HP. Apply pressure now so the fight does not become longer.`
    );
  }

  if (action.effect === "dot") {
    parts.push(
      "Enemy will curse you for 2 damage per turn for 3 turns. Finish the battle quickly or prepare to recover HP."
    );
  }

  if (action.effect === "skip_draw") {
    parts.push(
      "You will draw 1 fewer card next turn. Use important cards now rather than depending on your next hand."
    );
  }

  if (action.effect === "block_scripture") {
    parts.push(
      "Scripture cards will be blocked next turn. Play any important Scripture cards now."
    );
  }

  if (action.effect === "drain") {
    parts.push(
      "You will lose 1 Faith next turn. Spend Faith now if you have a useful card to play."
    );
  }

  if (action.effect === "discard") {
    parts.push(
      "You will be forced to discard 1 card. Avoid holding an essential card for too long."
    );
  }

  if (action.effect === "random_card") {
    parts.push(
      "The enemy may force a random card to be played. Prepare for an unpredictable result."
    );
  }

  if (action.effect === "recoil") {
    parts.push(
      "The enemy will take 3 recoil damage after acting. Survive the turn and let it hurt itself."
    );
  }

  if (parts.length === 0) {
    parts.push(`${action.name}: No additional effect information is available.`);
  }

  return parts.join(" ");
}