import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import { ENEMIES } from "@/data/enemies";
import { ROOM_TYPES } from "@/data/genesisRooms";
import { CARD_ART, PLACEHOLDER_ART, VICTORY_ART } from "@/data/art";
import { generateRewardCards, generateFirstCompletionReward, RUN_DECK_MAX, canAddToDeck, getMaxCopies, DUPLICATE_GOLD_BONUS } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import StoryNarration from "@/components/game/StoryNarration";
import TriviaModal from "@/components/game/TriviaModal";
import CardDetailModal from "@/components/game/CardDetailModal";
import DeckFullModal from "@/components/game/DeckFullModal";
import { getCardEffectText } from "@/components/game/Card";

const RARITY_BORDER = {
  common: "border-sky-400/60",
  rare: "border-emerald-400/70",
  legendary: "border-amber-300/80",
};

const RARITY_GLOW = {
  common: "shadow-md shadow-sky-500/10",
  rare: "shadow-lg shadow-emerald-500/25",
  legendary: "shadow-xl shadow-amber-400/40",
};

export default function RewardScreen() {
  const { run, completeRoom, updateRun, profile, addCardToCollection, addCardToRunDeck, replaceCardInRun } = useGame();
  const [showNarration, setShowNarration] = useState(true);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [detailCard, setDetailCard] = useState(null);
  const [deckFullCard, setDeckFullCard] = useState(null);
  const guidanceLevel = profile.settings.guidanceLevel || "normal";
  const isGuided = guidanceLevel === "guided" || profile.settings.guidanceTips;

  const enemy = run.currentNode ? ENEMIES[run.pendingEnemyId] : null;
  const narrationText = enemy?.narration || "Your faith has carried you through another trial.";
  const narrationSummary = enemy?.summary || "Your faith has carried you through another trial.";

  const isBoss = run.currentNode?.type === ROOM_TYPES.BOSS;
  const roomType = isBoss ? "boss" : "normal";

  const collection = profile.cardCollection || {};

  // First Genesis completion guarantees a strong rare card
  const isFirstCompletion = isBoss && !profile.genesisCompleted;
  const [rewards] = useState(() => {
    if (isFirstCompletion) {
      const guaranteed = generateFirstCompletionReward(Math.random);
      const others = generateRewardCards(Math.random, "boss");
      // Replace first slot with guaranteed rare, no duplicates
      const set = new Set([guaranteed, ...others]);
      return [...set].slice(0, 3);
    }
    return generateRewardCards(Math.random, roomType);
  });

  useEffect(() => {
    if (showNarration) Sound.playMusic("victory");
  }, []);

  const handleNarrationComplete = () => {
    setShowNarration(false);
    setShowTrivia(true);
  };

  const handleTriviaComplete = (result) => {
    setShowTrivia(false);
    if (result && result.correct) {
      if (result.cardId) {
        addCardToCollection(result.cardId);
        if (run.deck.length < RUN_DECK_MAX) {
          addCardToRunDeck(result.cardId);
        }
      }
      setShowRewards(true);
    } else {
      completeRoom(run.currentNode.id);
    }
  };

  const handleSelectReward = (cardId) => {
    Sound.sfx.reward();
    const card = getCardById(cardId);
    const alreadyOwned = (collection[cardId] || 0) > 0;
    // Duplicate reward: grant gold bonus instead of another copy
    if (alreadyOwned) {
      const goldBonus = DUPLICATE_GOLD_BONUS[card?.rarity] || 5;
      updateRun({ gold: (run.gold || 0) + goldBonus });
    }
    addCardToCollection(cardId);
    if (run.deck.length < RUN_DECK_MAX) {
      addCardToRunDeck(cardId);
      setDetailCard(null);
      completeRoom(run.currentNode.id);
    } else {
      setDeckFullCard(cardId);
      setDetailCard(null);
    }
  };

  const handleDeckFullReplace = (index) => {
    replaceCardInRun(index, deckFullCard);
    setDeckFullCard(null);
    completeRoom(run.currentNode.id);
  };

  const handleDeckFullSendToCollection = () => {
    setDeckFullCard(null);
    completeRoom(run.currentNode.id);
  };

  const handleDeckFullSkip = () => {
    setDeckFullCard(null);
    completeRoom(run.currentNode.id);
  };

  const handleSkip = () => {
    Sound.sfx.click();
    completeRoom(run.currentNode.id);
  };

  if (showNarration) {
    return <StoryNarration text={narrationText} summary={narrationSummary} onComplete={handleNarrationComplete} />;
  }

  if (showTrivia) {
    return <TriviaModal onComplete={handleTriviaComplete} />;
  }

  if (!showRewards) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "linear-gradient(180deg, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="text-center mb-6">
        <div className="mb-3 flex justify-center">
          <img src={VICTORY_ART.crest} alt="Reward" className="w-12 h-12 object-cover rounded-full border border-amber-400/40 animate-icon-float" />
        </div>
        <h2 className="text-3xl font-serif text-amber-200">Choose Your Reward</h2>
        <p className="text-amber-100/50 text-sm mt-2">Tap a card to read details, then confirm your choice</p>
        {run.deck.length >= RUN_DECK_MAX - 2 && (
          <p className="text-amber-300/60 text-xs mt-1">Run deck: {run.deck.length}/{RUN_DECK_MAX} cards</p>
        )}
      </div>

      <div className="flex gap-3 sm:gap-4 flex-wrap justify-center mb-8">
        {rewards.map((cardId) => {
          const card = getCardById(cardId);
          if (!card) return null;
          return (
            <RewardCardDisplay
              key={cardId}
              card={card}
              ownedCount={collection[cardId] || 0}
              onClick={() => { Sound.sfx.click(); setDetailCard(card); }}
            />
          );
        })}
      </div>

      <button
        onClick={handleSkip}
        className="text-amber-100/40 hover:text-amber-200/70 text-sm transition"
      >
        Skip reward →
      </button>

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          owned={(collection[detailCard.id] || 0) > 0}
          onClose={() => setDetailCard(null)}
          onSelect={() => handleSelectReward(detailCard.id)}
          selectLabel="Choose This Card"
        />
      )}

      {deckFullCard && (
        <DeckFullModal
          rewardCardId={deckFullCard}
          runDeck={run.deck}
          onReplace={handleDeckFullReplace}
          onSendToCollection={handleDeckFullSendToCollection}
          onSkip={handleDeckFullSkip}
        />
      )}
    </div>
  );
}

function RewardCardDisplay({ card, ownedCount, onClick }) {
  const alreadyOwned = ownedCount > 0;
  const goldBonus = DUPLICATE_GOLD_BONUS[card.rarity] || 5;
  const rarityLabel = card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);

  return (
    <div onClick={onClick} className="transform hover:scale-105 transition cursor-pointer">
      <div className={`w-32 h-48 sm:w-36 sm:h-52 rounded-lg border-2 ${RARITY_BORDER[card.rarity]} ${RARITY_GLOW[card.rarity]} overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 p-2 flex flex-col items-center justify-between`}>
        <div className="flex items-center justify-between w-full">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${alreadyOwned ? "text-amber-200 bg-amber-900/40" : "text-emerald-300 bg-emerald-900/30"}`}>
            {alreadyOwned ? `Already Owned` : "New Card"}
          </span>
          <span className="text-xs text-amber-300/60">{card.cost} ✨</span>
        </div>
        <div className="w-14 h-14 rounded-lg overflow-hidden animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
          <img src={CARD_ART[card.id] || PLACEHOLDER_ART} alt={card.name} className="w-full h-full object-cover" style={{ transform: "scale(1.03)" }} />
        </div>
        <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
        <div className={`text-[8px] uppercase font-bold tracking-wide ${
          card.rarity === "legendary" ? "text-amber-300" : card.rarity === "rare" ? "text-emerald-300" : "text-sky-300"
        }`}>{rarityLabel}</div>
        <div className="text-[7px] text-amber-100/50 text-center leading-tight">{getCardEffectText(card)}</div>
      </div>
      {alreadyOwned && (
        <div className="text-center mt-1">
          <p className="text-amber-200/70 text-[9px] font-semibold">+{goldBonus} gold bonus</p>
          <p className="text-amber-100/40 text-[8px]">Duplicate reward</p>
        </div>
      )}
    </div>
  );
}