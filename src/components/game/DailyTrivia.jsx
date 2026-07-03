import React, { useState, useEffect } from "react";
import { BookOpen, Check, X } from "lucide-react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { recordTriviaAnswered } from "@/game/playerStats";

export default function DailyTrivia() {
  const { run, updateRun, setPhase } = useGame();
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const trivia = run?.dailyConfig?.trivia;

  useEffect(() => {
    if (!trivia) setPhase("dailyResult");
  }, [trivia]);

  if (!trivia) return null;

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const correct = idx === trivia.answer;
    if (correct) Sound.sfx.reward();
    else Sound.sfx.click();
    updateRun({ dailyTriviaCorrect: correct });
    recordTriviaAnswered(correct);
    setTimeout(() => setPhase("dailyResult"), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at center, rgba(26,39,68,0.95) 0%, rgba(8,12,24,0.98) 100%)" }}>
      <div className="max-w-md lg:max-w-lg w-full rounded-2xl border-2 border-amber-500/30 p-6 lg:p-8 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-amber-300" />
          <h2 className="font-serif text-amber-200 text-lg lg:text-xl">Bonus Question</h2>
        </div>
        <p className="text-amber-100 text-sm lg:text-base mb-4 lg:mb-6">{trivia.q}</p>

        <div className="space-y-2 lg:space-y-3">
          {trivia.options.map((opt, idx) => {
            const isCorrect = idx === trivia.answer;
            const isSelected = idx === selected;
            let cls = "border-amber-500/20 bg-slate-900/40 text-amber-100 hover:border-amber-400/40 hover:bg-slate-800/50";
            if (answered) {
              if (isCorrect) cls = "border-emerald-400/50 bg-emerald-900/30 text-emerald-200";
              else if (isSelected) cls = "border-red-400/50 bg-red-900/30 text-red-200";
              else cls = "border-slate-700/20 bg-slate-900/20 text-amber-100/40";
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left text-sm lg:text-base transition flex items-center justify-between ${cls}`}
              >
                <span>{opt}</span>
                {answered && isCorrect && <Check className="w-4 h-4 flex-shrink-0" />}
                {answered && isSelected && !isCorrect && <X className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-4 lg:mt-6 text-center animate-fade-in">
            <p className={`text-sm lg:text-base font-serif ${selected === trivia.answer ? "text-emerald-300" : "text-red-300"}`}>
              {selected === trivia.answer ? "Correct! +100 bonus" : "Incorrect"}
            </p>
            <p className="text-amber-100/50 text-xs mt-2 italic">{trivia.verse}</p>
          </div>
        )}
      </div>
    </div>
  );
}