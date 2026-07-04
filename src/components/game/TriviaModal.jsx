import React, { useState, useMemo, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getQuestionForRoomDepth } from "@/data/trivia";
import { UI_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import { recordTriviaAnswered } from "@/game/playerStats";

// Reward types for correct trivia answers — keeps the game moving
const REWARD_TYPES = [
  { type: "gold", amount: 8, label: "+8 Gold", icon: "🪙", desc: "Bonus gold earned!" },
  { type: "gold", amount: 12, label: "+12 Gold", icon: "🪙", desc: "Bonus gold earned!" },
  { type: "heal", amount: 5, label: "+5 HP", icon: "💚", desc: "A small heal for your hero!" },
  { type: "draw", amount: 1, label: "+1 Card Draw", icon: "🃏", desc: "Draw an extra card next battle!" },
  { type: "faith", amount: 3, label: "+3 Bonus Gold", icon: "✨", desc: "Faith rewards diligence!" },
];

function pickReward() {
  return REWARD_TYPES[Math.floor(Math.random() * REWARD_TYPES.length)];
}

export default function TriviaModal({ onComplete }) {
  const { run, updateRun } = useGame();
  // Compute question ONCE based on room depth (difficulty scaling)
  const question = useMemo(
    () => getQuestionForRoomDepth(run.roomsCleared),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [reward, setReward] = useState(null);

  // Clear any lingering focus from the previous screen's Continue button
  // so the trivia opens completely neutral — no pre-highlighted answer.
  useEffect(() => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  }, []);

  const difficultyLabels = { 1: "Easy", 2: "Medium", 3: "Hard" };
  const difficultyColors = { 1: "text-emerald-300", 2: "text-amber-300", 3: "text-red-300" };

  const handleAnswer = (e, idx) => {
    if (answered) return;
    if (e?.currentTarget?.blur) e.currentTarget.blur();
    setSelected(idx);
    setAnswered(true);
    const correct = idx === question.answer;
    if (correct) {
      Sound.sfx.trivia_correct();
      setReward(pickReward());
    } else {
      Sound.sfx.trivia_wrong();
    }
  };

  const handleContinue = () => {
    const correct = selected === question.answer;
    recordTriviaAnswered(correct);
    // Record trivia stats in the run state — functional update prevents stale closure issues
    updateRun(prev => ({
      triviaAttempted: (prev.triviaAttempted || 0) + 1,
      triviaCorrect: (prev.triviaCorrect || 0) + (correct ? 1 : 0),
      triviaWrong: (prev.triviaWrong || 0) + (correct ? 0 : 1),
    }));

    if (correct) {
      // Apply gameplay reward to run state
      if (reward) {
        updateRun(prev => {
          if (reward.type === "gold" || reward.type === "faith") {
            return { gold: (prev.gold || 0) + reward.amount };
          }
          if (reward.type === "heal") {
            return { playerHp: Math.min(prev.maxHp, (prev.playerHp || 0) + reward.amount) };
          }
          if (reward.type === "draw") {
            return { extraDraw: (prev.extraDraw || 0) + reward.amount };
          }
          return prev;
        });
      }
      const bonusCards = ["prayer", "faith_shield", "sling_stone", "bread_life", "wisdom", "doves_peace", "living_water"];
      const cardReward = bonusCards[Math.floor(Math.random() * bonusCards.length)];
      onComplete({ cardId: cardReward, correct: true });
    } else {
      onComplete({ correct: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-lg w-full rounded-2xl border-2 border-amber-500/30 p-6 lg:p-8" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={UI_ART.trivia} alt="Test Your Knowledge" className="w-16 h-16 object-cover rounded-xl border-2 border-amber-400/40 shadow-lg shadow-amber-500/20 animate-icon-float" />
          </div>
          <h2 className="text-2xl font-serif text-amber-200">Test Your Knowledge</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-amber-100/50 text-sm">Difficulty:</span>
            <span className={`text-sm font-bold ${difficultyColors[question.difficulty]}`}>
              {difficultyLabels[question.difficulty]}
            </span>
          </div>
          <p className="text-amber-100/50 text-xs mt-1">Answer correctly for a bonus reward!</p>
        </div>

        <p className="text-lg text-amber-50 font-serif mb-6 text-center">{question.q}</p>

        <div className="grid grid-cols-1 gap-3">
          {question.options.map((opt, idx) => {
            const isCorrect = idx === question.answer;
            const isSelected = selected === idx;
            return (
              <button
                key={idx}
                onClick={(e) => handleAnswer(e, idx)}
                disabled={answered}
                className={`px-4 py-3 rounded-lg border-2 text-left transition-all font-medium focus:outline-none ${
                  !answered
                    ? "border-amber-500/20 hover:border-amber-400/60 hover:bg-amber-500/10 text-amber-50"
                    : isCorrect
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                    : isSelected
                    ? "border-red-400 bg-red-500/20 text-red-200"
                    : "border-slate-600/30 text-slate-400 opacity-50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-6 text-center">
            <p className={`text-lg font-serif ${selected === question.answer ? "text-emerald-300" : "text-amber-300"}`}>
              {selected === question.answer ? "✓ Correct! Well done." : "Not quite — let's learn!"}
            </p>
            {selected === question.answer ? (
              <p className="text-amber-100/80 text-sm mt-2 leading-relaxed">{question.explanation}</p>
            ) : (
              <p className="text-amber-100/80 text-sm mt-2 leading-relaxed">
                The correct answer is{" "}
                <span className="text-emerald-300 font-semibold">{question.options[question.answer]}</span>.{" "}
                {question.explanation}
              </p>
            )}
            {question.whyItMatters && (
              <p className="text-amber-300/70 text-xs mt-2 italic font-serif">💡 Why it matters: {question.whyItMatters}</p>
            )}
            <p className="text-amber-100/60 text-xs mt-2 italic">📖 {question.verse}</p>

            {/* Reward banner for correct answers */}
            {selected === question.answer && reward && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-500/15 animate-fade-in">
                <span className="text-2xl">{reward.icon}</span>
                <div className="text-left">
                  <p className="text-amber-200 font-bold font-serif text-sm">{reward.label}</p>
                  <p className="text-amber-100/60 text-[10px]">{reward.desc}</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={(e) => { e.currentTarget.blur(); handleContinue(); }}
                className="px-8 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition focus:outline-none"
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}