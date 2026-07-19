import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import { ENEMIES } from "@/data/enemies";
import { ROOM_TYPES } from "@/data/genesisRooms";
import { CARD_ART, PLACEHOLDER_ART, VICTORY_ART, getNodeArt } from "@/data/art";
import { generateRewardCards, generateFirstCompletionReward, RUN_DECK_MAX, canAddToDeck, getMaxCopies, DUPLICATE_GOLD_BONUS } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import StoryNarration from "@/components/game/StoryNarration";
import TriviaModal from "@/components/game/TriviaModal";
import CardDetailModal from "@/components/game/CardDetailModal";
import DeckFullModal from "@/components/game/DeckFullModal";
import { getCardEffectText } from "@/components/game/Card";
import { preloadImages } from "@/lib/imageAssets";
import SafeImage from "@/components/ui/SafeImage";

const RARITY_BORDER = {
  common: "border-sky-400/60",
  uncommon: "border-purple-400/70",
  rare: "border-emerald-400/70",
  legendary: "border-amber-300/80",
};

const RARITY_GLOW = {
  common: "shadow-md shadow-sky-500/10",
  uncommon: "shadow-lg shadow-purple-500/20",
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
    if (isBoss) Sound.prepareGenesisCompletionAudio();
    else if (showNarration) Sound.playMusic("victory");
    preloadImages([
      ...rewards.map((cardId) => CARD_ART[cardId] || PLACEHOLDER_ART),
      ...run.map.flat().map(getNodeArt),
    ]);
  }, []);

  const prepareMap = () => preloadImages(run.map.flat().map(getNodeArt));

  const handleNarrationComplete = () => {
    setShowNarration(false);
    setShowTrivia(true);
  };

  const handleTriviaComplete = async (result) => {
    setShowTrivia(false);
    if (result && result.correct) {
      if (result.cardId) {
        addCardToCollection(result.cardId);
        if (run.deck.length < RUN_DECK_MAX) {
          addCardToRunDeck(result.cardId);
        }
      }
      await preloadImages(rewards.map((cardId) => CARD_ART[cardId] || PLACEHOLDER_ART));
      setShowRewards(true);
    } else {
      await prepareMap();
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
      prepareMap().then(() => completeRoom(run.currentNode.id));
    } else {
      setDeckFullCard(cardId);
      setDetailCard(null);
    }
  };

  const handleDeckFullReplace = async (index) => {
    replaceCardInRun(index, deckFullCard);
    setDeckFullCard(null);
    await prepareMap();
    completeRoom(run.currentNode.id);
  };

  const handleDeckFullSendToCollection = async () => {
    setDeckFullCard(null);
    await prepareMap();
    completeRoom(run.currentNode.id);
  };

  const handleDeckFullSkip = async () => {
    setDeckFullCard(null);
    await prepareMap();
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
    <div className="min-h-screen flex flex-col items-center justify-center px-3 py-6 sm:px-8" style={{ background: "linear-gradient(180deg, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="text-center mb-6">
        <div className="mb-3 flex justify-center">
          <div className="w-12 h-12 rounded-full border border-amber-400/40 overflow-hidden animate-icon-float" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <SafeImage src={VICTORY_ART.crest} alt="Reward" className="art-portrait" />
          </div>
        </div>
        <h2 className="text-3xl font-serif text-amber-200">Choose Your Reward</h2>
        <p className="text-amber-100/50 text-sm mt-2">
  Choose one card to add to your deck
</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5 w-full max-w-5xl mb-8">
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
  const rarityLabel =
    card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);

  return (
    <div
      onClick={onClick}
      className="min-w-0 cursor-pointer transition active:scale-95 hover:scale-[1.02]"
    >
      <div
        className={`relative w-full aspect-[3/4] rounded-xl border-2 ${
          RARITY_BORDER[card.rarity]
        } ${RARITY_GLOW[card.rarity]} overflow-hidden bg-slate-950`}
      >
        <SafeImage
          src={CARD_ART[card.id] || PLACEHOLDER_ART}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-slate-950/95" />

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <span
            className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-1 rounded uppercase leading-tight ${
              alreadyOwned
                ? "text-amber-100 bg-amber-950/85"
                : "text-emerald-100 bg-emerald-950/85"
            }`}
          >
            {alreadyOwned ? "Owned" : "New"}
          </span>

          <span className="rounded-full bg-slate-950/85 border border-amber-400/50 px-2 py-1 text-[10px] sm:text-sm font-bold text-amber-200">
            {card.cost} ✨
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 text-center">
          <h3 className="font-serif text-sm sm:text-xl text-amber-100 leading-tight">
            {card.name}
          </h3>

          <p
            className={`mt-1 text-[8px] sm:text-[10px] uppercase font-bold tracking-wide ${
              card.rarity === "legendary"
                ? "text-amber-300"
                : card.rarity === "rare"
                  ? "text-emerald-300"
                  : card.rarity === "uncommon"
                    ? "text-purple-300"
                    : "text-sky-300"
            }`}
          >
            {rarityLabel}
          </p>

          <div className="mt-2 border-t border-amber-500/20 pt-2">
            <p className="text-[9px] sm:text-sm text-amber-50/75 leading-tight line-clamp-2">
              {getCardEffectText(card)}
            </p>
          </div>
        </div>
      </div>

      {alreadyOwned && (
        <div className="text-center mt-1">
          <p className="text-amber-200/70 text-[9px] sm:text-xs font-semibold">
            +{goldBonus} gold
          </p>
        </div>
      )}
    </div>
  );
}
