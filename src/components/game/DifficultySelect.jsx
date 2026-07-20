import React from "react";
import { useGame } from "@/game/GameContext";
import { DIFFICULTY_PRESETS } from "@/game/mapGenerator";
import { HOME_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const DIFFICULTY_RULES = {
  easy: {
    text: "Retry: 75% HP. −5% score per retry.",
    panelClass: "border-emerald-400/25 bg-emerald-950/20",
    textClass: "text-emerald-100/80",
  },

  normal: {
    text: "Checkpoint: 50% HP. −15% score per retry.",
    panelClass: "border-amber-400/25 bg-amber-950/20",
    textClass: "text-amber-100/80",
  },

  hard: {
    text: "One life: Defeat ends the run.",
    panelClass: "border-red-400/40 bg-red-950/25",
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

      {/* Selected difficulty — description and retry rule combined in one compact panel */}
      <div className={`mt-3 rounded-xl border px-4 py-2.5 ${currentRule.panelClass}`}>
        <div className="flex items-center gap-3">
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

        <p className={`mt-1.5 pl-10 text-xs font-medium ${currentRule.textClass}`}>
          {currentRule.text}
        </p>
      </div>
    </div>
  );
}
