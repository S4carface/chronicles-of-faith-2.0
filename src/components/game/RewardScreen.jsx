import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import { ENEMIES } from "@/data/enemies";
import { pickN } from "@/game/mapGenerator";
import * as Sound from "@/game/soundManager";
import StoryNarration from "@/components/game/StoryNarration";
import TriviaModal from "@/components/game/TriviaModal";

export default function RewardScreen() {
  const { run, completeRoom, updateRun, setPhase } = useGame();
  const [showNarration, setShowNarration] = useState(true);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

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
    setSelectedReward(cardId);
    updateRun({ deck: [...run.deck, cardId] });
  };

  const handleContinue = () => {
    Sound.sfx.click();
    completeRoom(run.currentNode.id);
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
        <p className="text-amber-100/50 text-sm mt-2">Select a card to add to your deck</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center mb-8">
        {rewards.map((cardId) => {
          const card = getCardById(cardId);
          if (!card) return null;
          return (
            <div key={cardId} onClick={() => !selectedReward && handleSelectReward(cardId)} className={selectedReward && selectedReward !== cardId ? "opacity-30" : ""}>
              <div className="transform hover:scale-110 transition cursor-pointer">
                <CardSmall card={card} selected={selectedReward === cardId} />
              </div>
            </div>
          );
        })}
      </div>

      {selectedReward ? (
        <button
          onClick={handleContinue}
          className="px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg hover:bg-amber-600/40 transition animate-fade-in"
        >
          Continue →
        </button>
      ) : (
        <button
          onClick={handleSkip}
          className="text-amber-100/40 hover:text-amber-200/70 text-sm transition"
        >
          Skip reward →
        </button>
      )}
    </div>
  );
}

function CardSmall({ card, selected }) {
  return (
    <div className={`w-36 h-52 rounded-lg border-2 ${selected ? "border-yellow-300 ring-2 ring-yellow-300" : "border-amber-500/30"} overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 p-2 flex flex-col items-center justify-between cursor-pointer transition-all hover:scale-105`}>
      <div className="text-xs text-amber-300/60 w-full text-right">{card.cost} ✨</div>
      <div className="text-4xl">{card.icon}</div>
      <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
      <div className="text-[9px] text-amber-100/60 text-center px-1">{card.description}</div>
      <div className="text-[8px] text-amber-300/40 italic text-center">{card.verse}</div>
    </div>
  );
}