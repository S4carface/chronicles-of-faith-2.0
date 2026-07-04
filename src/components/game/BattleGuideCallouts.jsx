import React, { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import * as Sound from "@/game/soundManager";

const CALLOUTS = [
  {
    id: "intent",
    title: "Enemy Moves",
    text: "Enemy moves are shown here. Plan your turn around them.",
    position: "top",
  },
  {
    id: "faith",
    title: "Faith Energy",
    text: "Faith is your energy. It refills each turn.",
    position: "bottom-right",
  },
  {
    id: "cards",
    title: "Play Cards",
    text: "Tap a card, then press Play Card.",
    position: "bottom",
  },
  {
    id: "endturn",
    title: "End Your Turn",
    text: "End Turn draws your next hand.",
    position: "bottom-right",
  },
];

export default function BattleGuideCallouts({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = CALLOUTS[step];

  const handleNext = () => {
    Sound.sfx.click();
    if (step >= CALLOUTS.length - 1) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    Sound.sfx.click();
    onComplete();
  };

  // Position classes for the callout bubble
  const positionClasses = {
    "top": "top-[14%] left-1/2 -translate-x-1/2",
    "bottom": "bottom-[30%] left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-[14%] right-3 lg:right-8",
  };

  return (
    <>
      {/* Semi-transparent backdrop that doesn't block interaction */}
      <div className="fixed inset-0 z-[55] pointer-events-auto" onClick={handleNext} />

      {/* Callout bubble */}
      <div
        className={`fixed z-[56] max-w-[280px] animate-fade-in ${positionClasses[current.position]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-xl border-2 border-amber-400/50 p-4 shadow-xl shadow-amber-400/20"
          style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
        >
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-serif text-amber-200 text-sm">{current.title}</h4>
            <button onClick={handleSkip} className="text-amber-100/30 hover:text-amber-200 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-amber-100/70 text-xs leading-relaxed mb-3">{current.text}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {CALLOUTS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "bg-amber-300 w-4" : i < step ? "bg-amber-500/50 w-1.5" : "bg-slate-600/40 w-1.5"}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-400/50 bg-amber-600/20 text-amber-100 text-xs font-bold hover:bg-amber-600/40 transition"
            >
              {step >= CALLOUTS.length - 1 ? "Got it!" : "Next"}
              {step < CALLOUTS.length - 1 && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}