import React, { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { getCardById } from "@/data/cards";

const HEAL_CARD_IDS = [
  "prayer",
  "bread_life",
  "living_water",
  "burning_bush",
  "doves_peace",
  "manna_heaven",
];

function resolveCard(cardOrId) {
  return typeof cardOrId === "string"
    ? getCardById(cardOrId)
    : cardOrId;
}

function canPlayCard(card, battleState) {
  if (!card || !battleState) return false;

  const scriptureBlocked =
    battleState.blockScripture &&
    card.type === "scripture";

  if (scriptureBlocked) return false;

  if (battleState.freeCardsRemaining > 0) return true;

  return battleState.energy >= card.cost;
}

export default function BattleHelper({
  battleState,
  selectedCard,
  enemy,
}) {
  const helperText = useMemo(() => {
    if (!battleState || battleState.turn !== "player") {
      return null;
    }

    const handCards = (battleState.hand || [])
      .map(resolveCard)
      .filter(Boolean);

    const playableCards = handCards.filter((card) =>
      canPlayCard(card, battleState)
    );

    const selectedCardData =
      selectedCard !== null &&
      selectedCard !== undefined
        ? resolveCard(battleState.hand?.[selectedCard])
        : null;

    const selectedCardPlayable =
      selectedCardData &&
      canPlayCard(selectedCardData, battleState);

    /*
     * Selection guidance comes first.
     * This prevents the helper from saying "End Turn"
     * while the player has already selected a valid card.
     */
    if (selectedCardPlayable) {
      return "Card selected — press Play Card.";
    }

    /*
     * Never say the turn is over while any playable card remains.
     * This correctly recognizes zero-cost cards such as Fig Leaf.
     */
    if (playableCards.length === 0) {
      if (
        battleState.energy === 0 &&
        battleState.freeCardsRemaining === 0
      ) {
        return "No playable cards remain. End your turn.";
      }

      if (handCards.length === 0) {
        return "No cards in hand. End your turn to draw.";
      }
    }

    /*
     * If Faith is empty but a free card remains,
     * explicitly tell the player it can still be used.
     */
    if (
      battleState.energy === 0 &&
      battleState.freeCardsRemaining === 0 &&
      playableCards.length > 0
    ) {
      const freeDefense = playableCards.find(
        (card) =>
          card.cost === 0 &&
          card.type === "defense"
      );

      if (freeDefense) {
        return `${freeDefense.name} costs 0 Faith and can still be played.`;
      }

      const freeCard = playableCards.find(
        (card) => card.cost === 0
      );

      if (freeCard) {
        return `${freeCard.name} costs 0 Faith and can still be played.`;
      }
    }

    const nextEnemyAction =
      battleState.enemyHand?.[0] || null;

    const enemyWillAttack =
      Boolean(nextEnemyAction?.damage > 0);

    const enemyWillBlock =
      nextEnemyAction?.effect === "block" ||
      Boolean(nextEnemyAction?.blockValue > 0);

    const hasPlayableDefense = playableCards.some(
      (card) => card.type === "defense"
    );

    const hasPlayableAttack = playableCards.some(
      (card) =>
        card.type === "attack" ||
        card.type === "miracle"
    );

    const hasPlayableHealing = playableCards.some(
      (card) =>
        card.type === "scripture" &&
        HEAL_CARD_IDS.includes(card.id)
    );

    const lowHp =
      battleState.playerHp <=
      Math.floor(battleState.maxPlayerHp * 0.35);

    /*
     * Damage is more urgent than enemy Block.
     * When the move does both, describe both effects.
     */
    if (enemyWillAttack && enemyWillBlock) {
      if (hasPlayableDefense) {
        return "Enemy will attack and gain Block. Defend before ending your turn.";
      }

      if (hasPlayableAttack) {
        return "Enemy will attack and gain Block. Strike now if you can.";
      }

      return "Enemy will attack and gain Block this turn.";
    }

    if (enemyWillAttack && hasPlayableDefense) {
      return "Enemy will attack next. Consider using Defense.";
    }

    if (lowHp && hasPlayableHealing) {
      return "Your HP is low. Consider healing.";
    }

    if (enemyWillBlock && hasPlayableAttack) {
      return "Enemy will gain Block. Attack before the shield rises.";
    }

    return null;
  }, [battleState, selectedCard, enemy]);

  if (!helperText) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 animate-fade-in">
      <Lightbulb className="h-3 w-3 flex-shrink-0 text-amber-300/50" />

      <span className="text-[10px] italic leading-tight text-amber-100/50 lg:text-xs">
        {helperText}
      </span>
    </div>
  );
}