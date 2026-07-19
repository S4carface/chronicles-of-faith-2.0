import React from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import * as Sound from "@/game/soundManager";

const STEPS = [
  {
    title: "Your Health",
    text: "This is your Health. If it reaches 0, you lose the battle. Tap Got it.",
    anchor: "bottom",
    actionable: false,
  },
  {
    title: "Faith",
    text: "Faith pays for cards and refills every turn. Tap Got it.",
    anchor: "bottom",
    actionable: false,
  },
  {
    title: "Enemy Intent",
    text: "This shows the serpent's next action. Tap Got it.",
    anchor: "bottom",
    actionable: false,
  },
  {
    title: "Attack",
    text: "Tap the Sling Stone card.",
    selectedText: "Tap Play Card. Attacks automatically target the serpent.",
    anchor: "top",
    actionable: true,
    requiredCardId: "sling_stone",
  },
  {
    title: "Defense",
    text: "Tap the Faith Shield card.",
    selectedText: "Tap Play Card to gain Block against the shown intent.",
    anchor: "top",
    actionable: true,
    requiredCardId: "faith_shield",
  },
  {
    title: "End Your Turn",
    text: "Tap End Turn. The serpent will perform the intent shown above.",
    anchor: "top",
    actionable: true,
  },
  {
    title: "Finish the Battle",
    text: "Tap Sling Stone for the final attack.",
    selectedText: "Tap Play Card to defeat the serpent.",
    anchor: "top",
    actionable: true,
    requiredCardId: "sling_stone",
  },
];

const ANCHOR_CLASSES = {
  top: "top-[calc(36%+env(safe-area-inset-top))]",
  bottom: "bottom-[calc(33%+env(safe-area-inset-bottom))]",
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
      className={`fixed left-1/2 z-[56] w-[86vw] max-w-[340px] -translate-x-1/2 animate-fade-in ${
        ANCHOR_CLASSES[current.anchor]
      }`}
    >
      <div
        className="relative rounded-xl border-2 border-amber-400/50 px-3 py-2.5 shadow-xl shadow-amber-400/20"
        style={{
          background:
            "linear-gradient(135deg, rgba(26,39,68,0.9) 0%, rgba(15,26,48,0.9) 100%)",
        }}
      >
        <button
          type="button"
          onClick={handleSkip}
          data-tutorial-action="skip"
          className="absolute right-1.5 top-1.5 text-amber-100/30 transition hover:text-amber-200"
          aria-label="Skip tutorial"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Progress */}
        <div className="mb-1.5 pr-5">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-amber-300/55">
            Step {step + 1} of {STEPS.length}
          </span>

          <div className="mt-1 flex gap-1">
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

        <h3 className="mb-0.5 font-serif text-sm text-amber-100">
          {current.title}
        </h3>

        <p className="mb-2 text-[11px] leading-snug text-amber-100/70">
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
            data-tutorial-action="acknowledge"
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-amber-400/50 bg-amber-600/20 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-600/40"
          >
            Got it
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          data-tutorial-action="skip"
          className="mt-2 w-full border-t border-amber-400/15 pt-1.5 text-center text-[9px] text-amber-100/45 transition hover:text-amber-100/70"
        >
          Continue Without Tips
        </button>
      </div>
    </div>
  );
}
