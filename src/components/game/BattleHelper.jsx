import React, { useMemo } from "react";
import { Lightbulb } from "lucide-react";

export default function BattleHelper({ battleState, selectedCard }) {
  const helperText = useMemo(() => {
    if (!battleState || battleState.turn !== "player") return null;

    if (battleState.energy === 0 && battleState.freeCardsRemaining === 0) {
      return "No Faith left. End your turn.";
    }

    if (selectedCard !== null) {
      return "Card selected — press Play Card.";
    }

    if (battleState.hand.length === 0) {
      return "No cards in hand. End turn to draw.";
    }

    const nextEnemyAction = battleState.enemyHand?.[0];

    if (!nextEnemyAction) return null;

    if (nextEnemyAction.effect === "block") {
      return `Enemy gains ${nextEnemyAction.blockValue || 5} Block.`;
    }

    if (nextEnemyAction.effect === "heal_self") {
      return "Enemy will heal.";
    }

    if (nextEnemyAction.effect === "skip_draw") {
      return "Enemy will reduce your next draw.";
    }

    if (nextEnemyAction.effect === "block_scripture") {
      return "Enemy will block Scripture cards.";
    }

    if (nextEnemyAction.effect === "drain") {
      return "Enemy will drain Faith.";
    }

    if (nextEnemyAction.effect === "discard") {
      return "Enemy will force a discard.";
    }

    if (nextEnemyAction.effect === "random_card") {
      return "Enemy will cause confusion.";
    }

    if (nextEnemyAction.effect === "dot") {
      return `Enemy attacks for ${nextEnemyAction.damage} and applies a curse.`;
    }

    if (nextEnemyAction.damage > 0) {
      return `Enemy attacks for ${nextEnemyAction.damage}.`;
    }

    return null;
  }, [battleState, selectedCard]);

  if (!helperText) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 animate-fade-in">
      <Lightbulb className="w-3 h-3 text-amber-300/50 flex-shrink-0" />

      <span className="truncate text-amber-100/55 text-[10px] lg:text-xs italic leading-tight">
        {helperText}
      </span>
    </div>
  );
}