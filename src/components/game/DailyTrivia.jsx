import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Check, X } from "lucide-react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { recordTriviaAnswered } from "@/game/playerStats";

const ANSWER_BUTTON_STYLE = {
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
};

export default function DailyTrivia() {
  const { run, updateRun, setPhase } = useGame();
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const trivia = run?.dailyConfig?.trivia;
  const guardRef = useRef(true);

  useEffect(() => {
    if (!trivia) setPhase("dailyResult");
  }, [trivia]);

  // Clear any lingering focus from the previous screen and ignore the
  // opening tap for 250ms so the carryover click cannot register as an answer.
  useEffect(() => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    const timer = setTimeout(() => { guardRef.current = false; }, 250);
    return () => clearTimeout(timer);
  }, []);

  if (!trivia) return null;

  const handleSelect = (e, idx) => {
    if (answered || guardRef.current) return;
    if (e?.currentTarget?.blur) e.currentTarget.blur();
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
                onClick={(e) => handleSelect(e, idx)}
                disabled={answered || guardRef.current}
                style={ANSWER_BUTTON_STYLE}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left text-sm lg:text-base transition flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${cls}`}
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