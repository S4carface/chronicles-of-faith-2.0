import React, { useState, useMemo } from "react";
import { useGame } from "@/game/GameContext";
import { TRIVIA_QUESTIONS } from "@/data/trivia";
import * as Sound from "@/game/soundManager";

export default function TriviaModal({ onComplete }) {
  const { run, updateRun } = useGame();
  // Fix glitch: compute question ONCE via useMemo, not from live run.triviaTotal on every render
  const question = useMemo(
    () => TRIVIA_QUESTIONS[run.triviaTotal % TRIVIA_QUESTIONS.length],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleAnswer = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const correct = idx === question.answer;
    if (correct) {
      Sound.sfx.trivia_correct();
      updateRun({ triviaCorrect: run.triviaCorrect + 1, triviaTotal: run.triviaTotal + 1 });
    } else {
      Sound.sfx.trivia_wrong();
      updateRun({ triviaTotal: run.triviaTotal + 1 });
    }
  };

  const handleContinue = () => {
    const correct = selected === question.answer;
    if (correct) {
      const bonusCards = ["prayer", "faith_shield", "sling_stone", "bread_life", "wisdom", "doves_peace", "living_water"];
      const reward = bonusCards[Math.floor(Math.random() * bonusCards.length)];
      onComplete({ cardId: reward, correct: true });
    } else {
      onComplete({ correct: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-lg w-full rounded-2xl border-2 border-amber-500/30 p-8" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📖</div>
          <h2 className="text-2xl font-serif text-amber-200">Test Your Knowledge</h2>
          <p className="text-amber-100/50 text-sm mt-1">Answer correctly for a bonus reward!</p>
        </div>

        <p className="text-lg text-amber-50 font-serif mb-6 text-center">{question.q}</p>

        <div className="grid grid-cols-1 gap-3">
          {question.options.map((opt, idx) => {
            const isCorrect = idx === question.answer;
            const isSelected = selected === idx;
            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                className={`px-4 py-3 rounded-lg border-2 text-left transition-all font-medium ${
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
            <p className={`text-lg font-serif ${selected === question.answer ? "text-emerald-300" : "text-red-300"}`}>
              {selected === question.answer ? "✓ Correct!" : "✗ Not quite..."}
            </p>
            <p className="text-amber-100/40 text-sm mt-1 italic">{question.verse}</p>
            <button
              onClick={handleContinue}
              className="mt-4 px-8 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}