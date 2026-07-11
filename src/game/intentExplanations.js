// Returns a plain-language explanation for an enemy intent action.
// Uses consistent debuff names matching statusExplanations.js.
export function getIntentExplanation(action, enemy) {
  if (!action) return null;

  const isBoss = enemy?.isBoss;

  switch (action.effect) {
    case "block":
      return `Enemy will gain ${action.blockValue || 5} Block next turn. Attack now before the shield goes up.`;

    case "heal_self":
      return `Enemy will heal ${isBoss ? 6 : 4} HP. Finish the fight quickly or expect a longer battle.`;

    case "dot":
      return "Enemy will curse you. Prepare to lose 2 HP each turn for 3 turns.";

    case "skip_draw":
      return "Enemy will reduce your next draw. Consider saving strong cards.";

    case "block_scripture":
      return "Enemy will block Scripture cards next turn. Play Scripture cards now if needed.";

    case "drain":
      return "Enemy will drain 1 Faith. Spend Faith wisely before your next turn.";

    case "discard":
      return "Enemy will force you to discard a card. Don't hold key cards for too long.";

    case "random_card":
      return "Enemy may force a random card to be played. Plan for some chaos.";

    case "recoil":
      return "Enemy will hurt itself after attacking. Survive and let it take damage.";

    default:
      if (action.damage > 0) {
        return `Enemy will deal ${action.damage} damage next turn. Consider defending or healing.`;
      }

      return action.name;
  }
}