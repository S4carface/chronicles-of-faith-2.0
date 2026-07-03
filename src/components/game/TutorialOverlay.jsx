import React, { useState } from "react";

const STEPS = [
  {
    icon: "⚔️",
    title: "Battle Basics",
    text: "Play cards from your hand to attack the enemy or defend yourself. Each card costs ✨ Faith energy. You start with 3 Faith each turn.",
  },
  {
    icon: "🛡️",
    title: "Block & Defense",
    text: "Defense cards add Block, which absorbs incoming damage. Block is consumed during the enemy's turn — play defense BEFORE ending your turn!",
  },
  {
    icon: "👁️",
    title: "Enemy Intent",
    text: "The badge above the enemy shows what they'll do next turn. Plan your moves: defend against big attacks, strike when they're weak!",
  },
  {
    icon: "🗡️",
    title: "Counter Attack",
    text: "Some defense cards like Lion's Den reflect damage back at the enemy when they attack you. Stack these to punish aggressive enemies!",
  },
  {
    icon: "💚",
    title: "Healing & Scripture",
    text: "Scripture cards heal you and provide utility like drawing cards or gaining energy. Your max HP stays the same across battles, so heal wisely!",
  },
  {
    icon: "💰",
    title: "Gold & Rewards",
    text: "Win battles to earn gold and new cards. Gold can be spent at the Shop for powerful upgrades. Your HP carries over between fights — don't let it drop too low!",
  },
];

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.97)" }}>
      <div className="max-w-md w-full rounded-2xl border-2 border-amber-500/30 p-8" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-amber-300 w-6" : i < step ? "bg-amber-500/50" : "bg-slate-600/40"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-fade-in" key={step}>{current.icon}</div>
          <h2 className="text-2xl font-serif text-amber-200 mb-3">{current.title}</h2>
          <p className="text-amber-100/70 text-sm leading-relaxed">{current.text}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg border border-amber-500/20 text-amber-100/60 text-sm hover:text-amber-200 transition"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            {isLast ? "Start Battle! ⚔️" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full text-center text-amber-100/30 text-xs mt-4 hover:text-amber-100/50 transition"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}