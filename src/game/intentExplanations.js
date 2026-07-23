import { getMarkRule, isMarkAction, getDrainRule } from "@/game/battleEngine";

// Returns a plain-language explanation for an enemy intent action.
// Explains both what will happen and how the player can respond.
//
// `context` carries the live battle mode/difficulty/cooldown so Cain's Mark of
// Cain can be explained honestly before it resolves (draw effect + cooldown).
export function getIntentExplanation(action, enemy, context = {}) {
  if (!action) return null;

  const parts = [];
  const isBoss = enemy?.isBoss;
  const ruleCtx = { mode: context.mode, difficulty: context.difficulty, enemy };
  const markRule = getMarkRule(ruleCtx);
  const drainRule = getDrainRule(ruleCtx);

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
    if (markRule && isMarkAction(action)) {
      // Cain campaign: explain the exact draw effect and the cooldown before it
      // happens, using live values rather than internal wording.
      if (markRule.allowZeroDraw) {
        parts.push(
          `May reduce your next draw to 0 — play key cards now. Cannot be used again for ${markRule.cooldown} turns.`
        );
      } else {
        parts.push(
          `Your next draw is reduced by 1, but you always keep at least 1 card. Cannot be used again for ${markRule.cooldown} turns.`
        );
      }
    } else {
      parts.push(
        "You will draw 1 fewer card next turn. Use important cards now rather than depending on your next hand."
      );
    }
  }

  if (action.effect === "block_scripture") {
    parts.push(
      "Scripture cards will be blocked next turn. Play any important Scripture cards now."
    );
  }

  // Faith Drain (Phase 2A) — telegraph the exact effect and cooldown honestly.
  if (action.effect === "drain") {
    if (drainRule) {
      const floorText = drainRule.allowZero
        ? "Your Faith may fall to 0."
        : "You will keep at least 1 Faith.";
      parts.push(
        `Lose 1 Faith at the start of your next turn. ${floorText} Cannot be used again for ${drainRule.cooldown} turns.`
      );
    } else {
      parts.push("A deceptive attack.");
    }
  }

  // NOTE: discard / random_card are not yet implemented (later phase). They
  // resolve as ordinary attacks, so the intent must not promise disruption.
  if (action.effect === "discard") {
    parts.push("A disruptive strike.");
  }

  if (action.effect === "random_card") {
    parts.push("A disruptive strike.");
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