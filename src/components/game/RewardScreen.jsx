import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import { ENEMIES } from "@/data/enemies";
import { pickN } from "@/game/mapGenerator";
import { CARD_ART, PLACEHOLDER_ART, VICTORY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import StoryNarration from "@/components/game/StoryNarration";
import TriviaModal from "@/components/game/TriviaModal";
import CardDetailModal from "@/components/game/CardDetailModal";

export default function RewardScreen() {
  const { run, completeRoom, updateRun, profile } = useGame();
  const [showNarration, setShowNarration] = useState(true);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [detailCard, setDetailCard] = useState(null);
  const guidanceLevel = profile.settings.guidanceLevel || "normal";
  const isGuided = guidanceLevel === "guided" || profile.settings.guidanceTips;

  const enemy = run.currentNode ? ENEMIES[run.pendingEnemyId] : null;
  const narrationText = enemy?.narration || "Your faith has carried you through another trial.";

  // Generate 3 reward cards
  const allCards = CARDS.filter(c => c.rarity === "common" || c.rarity === "rare");
  const [rewards] = useState(() => pickN(Math.random, allCards.map(c => c.id), 3));

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
        updateRun({ deck: [...run.deck, result.cardId] });
      }
      setShowRewards(true);
    } else {
      // Trivia wrong — no rewards, move to next room
      completeRoom(run.currentNode.id);
    }
  };

  const handleSelectReward = (cardId) => {
    Sound.sfx.reward();
    updateRun({ deck: [...run.deck, cardId] });
    setDetailCard(null);
    completeRoom(run.currentNode.id, { cardId });
  };

  const handleSkip = () => {
    Sound.sfx.click();
    completeRoom(run.currentNode.id);
  };

  if (showNarration) {
    return <StoryNarration text={narrationText} onComplete={handleNarrationComplete} />;
  }

  if (showTrivia) {
    return <TriviaModal onComplete={handleTriviaComplete} />;
  }

  if (!showRewards) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "linear-gradient(180deg, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="text-center mb-8">
        <div className="mb-3 flex justify-center">
          <img src={VICTORY_ART.crest} alt="Reward" className="w-12 h-12 object-cover rounded-full border border-amber-400/40 animate-icon-float" />
        </div>
        <h2 className="text-3xl font-serif text-amber-200">Choose Your Reward</h2>
        <p className="text-amber-100/50 text-sm mt-2">Tap a card to read its details, then confirm your choice</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center mb-8">
        {rewards.map((cardId) => {
          const card = getCardById(cardId);
          if (!card) return null;
          const alreadyOwned = profile.collectedCards.includes(cardId);
          return (
            <div
              key={cardId}
              onClick={() => { Sound.sfx.click(); setDetailCard(card); }}
              className="transform hover:scale-105 transition cursor-pointer"
            >
              <RewardCardMini card={card} alreadyOwned={alreadyOwned} />
              {isGuided && (
                <p className="text-amber-300/50 text-[9px] text-center mt-1 max-w-[9rem] italic">
                  {card.type === "attack" && "Recommended: good damage"}
                  {card.type === "defense" && "Recommended: helps you survive"}
                  {card.type === "scripture" && "Recommended: restores faith or heals"}
                  {card.type === "miracle" && "Recommended: powerful divine strike"}
                </p>
              )}
            </div>
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
          owned={false}
          onClose={() => setDetailCard(null)}
          onSelect={() => handleSelectReward(detailCard.id)}
          selectLabel="Choose This Card"
        />
      )}
    </div>
  );
}

function RewardCardMini({ card, alreadyOwned }) {
  const rarityBorder = card.rarity === "legendary" ? "border-amber-300/80" : card.rarity === "rare" ? "border-emerald-400/70" : "border-sky-400/60";
  const rarityGlow = card.rarity === "legendary" ? "shadow-xl shadow-amber-400/40" : card.rarity === "rare" ? "shadow-lg shadow-emerald-500/25" : "shadow-md shadow-sky-500/10";

  return (
    <div className={`w-36 h-52 rounded-lg border-2 ${rarityBorder} ${rarityGlow} overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 p-2 flex flex-col items-center justify-between transition-all`}>
      <div className="flex items-center justify-between w-full">
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${alreadyOwned ? "text-emerald-300 bg-emerald-900/30" : "text-amber-200 bg-amber-900/30"}`}>
          {alreadyOwned ? "Already Owned" : "New Card"}
        </span>
        <span className="text-xs text-amber-300/60">{card.cost} ✨</span>
      </div>
      <img src={CARD_ART[card.id] || PLACEHOLDER_ART} alt={card.name} className="w-14 h-14 object-cover rounded-lg animate-fade-in" />
      <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
      <div className="text-[9px] text-amber-300/50 uppercase font-bold">{card.rarity}</div>
      <div className="text-[8px] text-amber-300/40 italic text-center">{card.verse}</div>
    </div>
  );
}