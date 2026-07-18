import React from "react";
import { useGame } from "@/game/GameContext";
import { DIFFICULTY_PRESETS } from "@/game/mapGenerator";
import { HOME_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const DIFFICULTY_RULES = {
  easy: {
    label: "Retry Rule",
    text: "Retry the same battle with 75% HP. Each retry reduces your score by 5%.",
    panelClass: "border-emerald-400/25 bg-emerald-950/20",
    labelClass: "text-emerald-300/75",
    textClass: "text-emerald-100/70",
  },

  normal: {
    label: "Checkpoint Rule",
    text: "Retry from the room checkpoint with 50% HP. Each retry reduces your score by 15%.",
    panelClass: "border-amber-400/25 bg-amber-950/20",
    labelClass: "text-amber-300/75",
    textClass: "text-amber-100/70",
  },

  hard: {
    label: "One-Life Rule",
    text: "No retries. Any defeat ends the entire run.",
    panelClass:
      "border-red-400/40 bg-red-950/25 shadow-sm shadow-red-950/40",
    labelClass: "text-red-300",
    textClass: "text-red-100/90",
  },
};

export default function DifficultySelect() {
  const { profile, saveProfile } = useGame();

  const current = DIFFICULTY_PRESETS[profile.difficulty]
    ? profile.difficulty
    : "normal";

  const currentPreset = DIFFICULTY_PRESETS[current];
  const currentRule = DIFFICULTY_RULES[current];

  const artMap = {
    easy: HOME_ART.difficulty_easy,
    normal: HOME_ART.difficulty_normal,
    hard: HOME_ART.difficulty_hard,
  };

  const handleSelect = (key) => {
    if (key === current) return;

    Sound.sfx.click();

    const guidanceMap = {
      easy: "guided",
      normal: "normal",
      hard: "expert",
    };

    saveProfile({
      difficulty: key,

      settings: {
        ...profile.settings,
        guidanceTips: key === "easy",
        guidanceLevel: guidanceMap[key],
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Difficulty buttons */}
      <div className="flex justify-center gap-2">
        {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
          const isActive = current === key;

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleSelect(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border-2 px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? "scale-[1.03] border-amber-300 bg-amber-500/20 shadow-md shadow-amber-400/30"
                  : "border-amber-500/15 bg-slate-900/40 opacity-70 hover:border-amber-400/40 hover:opacity-100"
              }`}
            >
              <div
                className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                style={{ background: "#0F1A30" }}
              >
                <img
                  src={artMap[key]}
                  alt=""
                  className="art-portrait"
                />
              </div>

              <span
                className={`font-serif text-sm font-semibold ${
                  isActive
                    ? "text-amber-100"
                    : "text-amber-100/60"
                }`}
              >
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected difficulty description */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-500/15 bg-slate-900/40 px-4 py-2.5">
        <div
          className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-amber-400/30"
          style={{ background: "#0F1A30" }}
        >
          <img
            src={artMap[current]}
            alt={currentPreset.label}
            className="art-portrait"
          />
        </div>

        <div className="min-w-0">
          <span className="font-serif text-sm font-bold text-amber-200">
            {currentPreset.label}
          </span>

          <span className="ml-2 text-xs text-amber-100/50">
            {currentPreset.desc}
          </span>
        </div>
      </div>

      {/* Retry rule */}
      <div
        className={`mt-2 rounded-lg border px-3 py-2.5 text-center ${currentRule.panelClass}`}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.18em] ${currentRule.labelClass}`}
        >
          {currentRule.label}
        </p>

        <p
          className={`mt-1 text-xs font-semibold ${currentRule.textClass}`}
        >
          {currentRule.text}
        </p>
      </div>
    </div>
  );
}
