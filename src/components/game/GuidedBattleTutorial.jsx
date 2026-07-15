import React from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import * as Sound from "@/game/soundManager";

const STEPS = [
  {
    title: "Your Health",
    text: "Protect this. If your Health reaches 0, you lose the battle.",
    position: "health",
    arrow: "up",
    actionable: false,
  },
  {
    title: "Faith",
    text: "Faith is your energy. Cards spend Faith, and it refills every turn.",
    position: "faith",
    arrow: "up",
    actionable: false,
  },
  {
    title: "Enemy Intent",
    text: "Enemies reveal what they will do next. Plan your turn around it.",
    position: "intent",
    arrow: "up",
    actionable: false,
  },
  {
    title: "Attack",
    text: "Select Sling Stone.",
    selectedText: "Now press Play Card to attack.",
    position: "card-action",
    arrow: "down",
    actionable: true,
    requiredCardId: "sling_stone",
  },
  {
    title: "Defense",
    text: "Select Faith Shield.",
    selectedText: "Now press Play Card to gain Block.",
    position: "card-action",
    arrow: "down",
    actionable: true,
    requiredCardId: "faith_shield",
  },
  {
    title: "End Your Turn",
    text: "Press End Turn. The enemy will then perform its action.",
    position: "end-turn",
    arrow: "up",
    actionable: true,
  },
];

const POSITION_CLASSES = {
  health:
    "top-[38%] left-3 lg:left-8",

  faith:
    "top-[47%] right-3 lg:right-8",

  intent:
    "top-[26%] right-3 lg:right-8",

  "card-action":
    "bottom-[25%] right-3 lg:right-8",

  "end-turn":
    "top-[47%] right-3 lg:right-8",
};

export const TUTORIAL_TOTAL_STEPS = STEPS.length;

export default function GuidedBattleTutorial({
  step,
  onAcknowledge,
  onSkip,
  selectedCardId = null,
}) {
  const current = STEPS[step];

  if (!current) return null;

  const requiredCardSelected =
    current.requiredCardId &&
    selectedCardId === current.requiredCardId;

  const instructionText =
    requiredCardSelected && current.selectedText
      ? current.selectedText
      : current.text;

  const isArrowUp = current.arrow === "up";

  const handleAcknowledge = () => {
    Sound.sfx.click();
    onAcknowledge();
  };

  const handleSkip = () => {
    Sound.sfx.click();
    onSkip();
  };

  return (
    <div
      className={`fixed z-[56] w-[220px] max-w-[calc(100vw-1.5rem)] animate-fade-in ${
        POSITION_CLASSES[current.position]
      }`}
    >
      <div
        className="relative rounded-xl border-2 border-amber-400/50 p-3.5 shadow-xl shadow-amber-400/20"
        style={{
          background:
            "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
        }}
      >
        {/* Arrow toward the control being explained */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${
            isArrowUp ? "-top-2" : "-bottom-2"
          }`}
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            [isArrowUp ? "borderBottom" : "borderTop"]:
              "8px solid rgba(201,168,76,0.65)",
          }}
        />

        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-1.5 top-1.5 text-amber-100/30 transition hover:text-amber-200"
          aria-label="Skip tutorial"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Progress */}
        <div className="mb-2 pr-5">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-amber-300/55">
            Step {step + 1} of {STEPS.length}
          </span>

          <div className="mt-1.5 flex gap-1">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index <= step
                    ? "bg-amber-400/80"
                    : "bg-amber-100/15"
                }`}
              />
            ))}
          </div>
        </div>

        <h3 className="mb-1 font-serif text-sm text-amber-100">
          {current.title}
        </h3>

        <p className="mb-3 text-[11px] leading-relaxed text-amber-100/60">
          {instructionText}
        </p>

        {current.actionable ? (
          <div className="flex items-center gap-1.5 text-[10px] italic text-amber-300/60">
            <Loader2 className="h-3 w-3 animate-spin" />

            <span>
              {requiredCardSelected
                ? "Waiting for Play Card..."
                : "Waiting for your action..."}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAcknowledge}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-amber-400/50 bg-amber-600/20 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-600/40"
          >
            Got it
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="mt-1.5 w-full text-center text-[9px] text-amber-100/30 transition hover:text-amber-100/50"
      >
        Skip Tutorial
      </button>
    </div>
  );
}