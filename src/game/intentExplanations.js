// Returns a plain-language explanation for an enemy intent action.
export function getIntentExplanation(action, enemy) {
  if (!action) return null;

  const parts = [];
  const isBoss = enemy?.isBoss;

  if (action.damage > 0) {
    parts.push(`Enemy deals ${action.damage} damage.`);
  }

  if (action.effect === "block") {
    parts.push(`Enemy gains +${action.blockValue || 5} Block.`);
  }

  if (action.effect === "heal_self") {
    parts.push(`Enemy heals ${isBoss ? 6 : 4} HP.`);
  }

  if (action.effect === "dot") {
    parts.push("Curses you — 2 damage per turn for 3 turns.");
  }
  if (action.effect === "skip_draw") {
    parts.push("You draw 1 fewer card next turn.");
  }
  if (action.effect === "block_scripture") {
    parts.push("You cannot play Scripture cards next turn.");
  }
  if (action.effect === "drain") {
    parts.push("You lose 1 Faith next turn.");
  }
  if (action.effect === "discard") {
    parts.push("Forces you to discard 1 card.");
  }
  if (action.effect === "random_card") {
    parts.push("Forces you to play a random card.");
  }
  if (action.effect === "recoil") {
    parts.push("Enemy takes 3 recoil damage.");
  }

  if (parts.length === 0) {
    parts.push(`${action.name}: unknown effect.`);
  }

  return parts.join(" ");
}