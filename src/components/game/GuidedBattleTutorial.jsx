import React from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import * as Sound from "@/game/soundManager";

const STEPS = [
  {
    text: "This is your health.",
    subtext: "If it reaches 0, the run ends.",
    position: "bottom-left",
    arrow: "down",
    actionable: false,
  },
  {
    text: "This is Faith.",
    subtext: "Cards cost Faith to play. It refills each turn.",
    position: "bottom-right",
    arrow: "down",
    actionable: false,
  },
  {
    text: "The enemy plans to attack next.",
    subtext: "These icons show the enemy's next moves.",
    position: "top-center",
    arrow: "up",
    actionable: false,
  },
    {
    text: "Tap Sling Stone.",
    subtext: "Then press Play Card to attack the enemy.",
    position: "bottom-center",
    arrow: "down",
    actionable: true,
  },
    {
    text: "Now tap Faith Shield.",
    subtext: "Then press Play Card to block incoming damage.",
    position: "bottom-center",
    arrow: "down",
    actionable: true,
  },
    {
    text: "Now press End Turn.",
    subtext: "The enemy will take its turn.",
    position: "bottom-right",
    arrow: "down",
    actionable: true,
  },
];

const POSITION_CLASSES = {
  "bottom-left": "bottom-[15%] left-3 lg:left-8",
  "bottom-right": "bottom-[15%] right-3 lg:right-8",
  "bottom-center": "bottom-[28%] left-1/2 -translate-x-1/2",
  "top-center": "top-[17%] left-1/2 -translate-x-1/2",
};

export const TUTORIAL_TOTAL_STEPS = STEPS.length;

export default function GuidedBattleTutorial({ step, onAcknowledge, onSkip }) {
  const current = STEPS[step];
  if (!current) return null;

  const isArrowUp = current.arrow === "up";

  return (
    <div className={`fixed z-[56] max-w-[230px] animate-fade-in ${POSITION_CLASSES[current.position]}`}>
      <div
        className="relative rounded-xl border-2 border-amber-400/50 p-3.5 shadow-xl shadow-amber-400/20"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
      >
        {/* Arrow pointing toward target */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${isArrowUp ? "-top-2" : "-bottom-2"}`}
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            [isArrowUp ? "borderBottom" : "borderTop"]: "8px solid rgba(201,168,76,0.5)",
          }}
        />

        {/* Skip (X) button */}
        <button
          onClick={onSkip}
          className="absolute top-1.5 right-1.5 text-amber-100/30 hover:text-amber-200 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Step indicator */}
        <span className="text-amber-300/50 text-[9px] uppercase tracking-widest font-bold block mb-1.5 pr-5">
          Step {step + 1} of {STEPS.length}
        </span>

        {/* Instruction text */}
        <p className="text-amber-100 text-sm font-medium leading-snug mb-1">{current.text}</p>
        <p className="text-amber-100/50 text-[11px] leading-relaxed mb-3">{current.subtext}</p>

        {/* Action or Acknowledge */}
        {current.actionable ? (
          <div className="flex items-center gap-1.5 text-amber-300/60 text-[10px] italic">
            <Loader2 className="w-3 h-3 animate-spin" />
            Waiting for your action...
          </div>
        ) : (
          <button
            onClick={onAcknowledge}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-amber-400/50 bg-amber-600/20 text-amber-100 text-xs font-bold hover:bg-amber-600/40 transition"
          >
            Got it
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Skip Tutorial link */}
      <button
        onClick={onSkip}
        className="w-full text-center text-amber-100/30 text-[9px] mt-1.5 hover:text-amber-100/50 transition"
      >
        Skip Tutorial
      </button>
    </div>
  );
}