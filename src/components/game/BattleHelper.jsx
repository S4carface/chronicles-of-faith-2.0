import React, { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { getCardById } from "@/data/cards";

const HEAL_CARD_IDS = ["prayer", "bread_life", "living_water", "burning_bush", "doves_peace", "manna_heaven"];

export default function BattleHelper({ battleState, selectedCard, enemy }) {
  const helperText = useMemo(() => {
    if (!battleState || battleState.turn !== "player") return null;

    if (battleState.energy === 0 && battleState.freeCardsRemaining === 0)
      return "No Faith left. End your turn to refill.";
    if (battleState.deck.length === 0 && battleState.hand.length > 0)
      return "Your deck is empty. End your turn to reshuffle if possible.";
    if (battleState.deck.length === 0 && battleState.hand.length === 0)
      return "Your deck is empty. End your turn to reshuffle if possible.";
    if (selectedCard !== null) return "Card selected — press Play to use it.";
    if (battleState.hand.length === 0) return "No cards in hand. End turn to draw.";

    const nextEnemyAction = battleState.enemyHand?.[0];

const willShield = nextEnemyAction?.effect === "block";

const willAttack =
  nextEnemyAction &&
  nextEnemyAction.damage > 0 &&
  nextEnemyAction.effect !== "block";    const hasDefense = battleState.hand.some(id => getCardById(id)?.type === "defense");
    const hasHealing = battleState.hand.some(id => {
      const c = getCardById(id);
      return c?.type === "scripture" && HEAL_CARD_IDS.includes(c.id);
    });
    const lowHP = battleState.playerHp <= Math.floor(battleState.maxPlayerHp * 0.35);

    if (willShield) return "Enemy will shield next. Attack now if you can.";
    if (willAttack && hasDefense) return "Enemy is attacking. Consider using Defense.";
    if (lowHP && hasHealing) return "You are low on HP. Healing may help.";

    return null;
  }, [battleState, selectedCard]);

  if (!helperText) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 animate-fade-in">
      <Lightbulb className="w-3 h-3 text-amber-300/50 flex-shrink-0" />
      <span className="text-amber-100/50 text-[10px] lg:text-xs italic leading-tight">{helperText}</span>
    </div>
  );
}