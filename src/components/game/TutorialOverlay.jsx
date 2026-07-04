import React, { useState } from "react";
import { Sparkles, Swords, Shield, BookOpen, Eye, Check, Lightbulb } from "lucide-react";

const STEPS = [
  { icon: Sparkles, title: "Faith", text: "Faith is your energy. It refills each turn." },
  { icon: Sparkles, title: "Card Cost", text: "Cards cost Faith to play." },
  { icon: Swords, title: "Attack Cards", text: "Attack cards damage the enemy." },
  { icon: Shield, title: "Defense Cards", text: "Defense cards protect you from the next enemy attack." },
  { icon: BookOpen, title: "Scripture Cards", text: "Scripture cards heal, draw, or give special help." },
  { icon: Eye, title: "Enemy Intent", text: "The enemy's next moves are shown above. Plan around them." },
  { icon: Check, title: "End Turn", text: "When you are done, press End Turn." },
];

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.97)" }}>
      <div className="max-w-md w-full rounded-2xl border-2 border-amber-500/30 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? "bg-amber-300 w-6" : i < step ? "bg-amber-500/50 w-2" : "bg-slate-600/40 w-2"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="mb-3 flex justify-center animate-fade-in" key={step}>
            <div className="w-14 h-14 rounded-xl border-2 border-amber-400/40 bg-amber-500/10 flex items-center justify-center">
              <Icon className="w-7 h-7 text-amber-300" />
            </div>
          </div>
          <h2 className="text-xl font-serif text-amber-200 mb-2">{current.title}</h2>
          <p className="text-amber-100/70 text-sm leading-relaxed">{current.text}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-lg border border-amber-500/20 text-amber-100/60 text-sm hover:text-amber-200 transition"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            {isLast ? "Start Battle!" : "Next →"}
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