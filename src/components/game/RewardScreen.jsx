import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import { ENEMIES } from "@/data/enemies";
import { pickN } from "@/game/mapGenerator";
import * as Sound from "@/game/soundManager";
import StoryNarration from "@/components/game/StoryNarration";
import TriviaModal from "@/components/game/TriviaModal";
import CardDetailModal from "@/components/game/CardDetailModal";

export default function RewardScreen() {
  const { run, completeRoom, updateRun } = useGame();
  const [showNarration, setShowNarration] = useState(true);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [detailCard, setDetailCard] = useState(null);

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
    if (result && result.cardId) {
      updateRun({ deck: [...run.deck, result.cardId] });
    }
    setShowRewards(true);
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
        <div className="text-6xl mb-3">🎁</div>
        <h2 className="text-3xl font-serif text-amber-200">Choose Your Reward</h2>
        <p className="text-amber-100/50 text-sm mt-2">Tap a card to read its details, then confirm your choice</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center mb-8">
        {rewards.map((cardId) => {
          const card = getCardById(cardId);
          if (!card) return null;
          return (
            <div
              key={cardId}
              onClick={() => { Sound.sfx.click(); setDetailCard(card); }}
              className="transform hover:scale-105 transition cursor-pointer"
            >
              <RewardCardMini card={card} />
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

function RewardCardMini({ card }) {
  const rarityBorder = card.rarity === "legendary" ? "border-amber-300/80" : card.rarity === "rare" ? "border-emerald-400/70" : "border-sky-400/60";
  const rarityGlow = card.rarity === "legendary" ? "shadow-xl shadow-amber-400/40" : card.rarity === "rare" ? "shadow-lg shadow-emerald-500/25" : "shadow-md shadow-sky-500/10";

  return (
    <div className={`w-36 h-52 rounded-lg border-2 ${rarityBorder} ${rarityGlow} overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 p-2 flex flex-col items-center justify-between transition-all`}>
      <div className="text-xs text-amber-300/60 w-full text-right">{card.cost} ✨</div>
      <div className="text-4xl animate-fade-in">{card.icon}</div>
      <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
      <div className="text-[9px] text-amber-300/50 uppercase font-bold">{card.rarity}</div>
      <div className="text-[8px] text-amber-300/40 italic text-center">{card.verse}</div>
    </div>
  );
}