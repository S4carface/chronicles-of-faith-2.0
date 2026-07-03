import React from "react";
import { useGame } from "@/game/GameContext";
import { DIFFICULTY_PRESETS } from "@/game/mapGenerator";
import { HOME_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function DifficultySelect() {
  const { profile, saveProfile } = useGame();
  const current = profile.difficulty || "normal";
  const currentPreset = DIFFICULTY_PRESETS[current];
  const artMap = {
    easy: HOME_ART.difficulty_easy,
    normal: HOME_ART.difficulty_normal,
    hard: HOME_ART.difficulty_hard,
  };

  const handleSelect = (key) => {
    if (key === current) return;
    Sound.sfx.click();
    const guidanceMap = { easy: "guided", normal: "normal", hard: "expert" };
    saveProfile({ difficulty: key, settings: { ...profile.settings, guidanceTips: key === "easy", guidanceLevel: guidanceMap[key] } });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Compact horizontal pill selector */}
      <div className="flex gap-2 justify-center">
        {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
          const isActive = current === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full border-2 transition-all duration-200 ${
                isActive
                  ? "border-amber-300 bg-amber-500/20 shadow-md shadow-amber-400/30 scale-[1.03]"
                  : "border-amber-500/15 bg-slate-900/40 opacity-70 hover:opacity-100 hover:border-amber-400/40"
              }`}
            >
              <img src={artMap[key]} alt={preset.label} className="w-6 h-6 object-cover rounded-full" />
              <span className={`font-serif text-sm font-semibold ${isActive ? "text-amber-100" : "text-amber-100/60"}`}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected difficulty info panel */}
      <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/15 bg-slate-900/40">
        <img src={artMap[current]} alt={currentPreset.label} className="w-7 h-7 object-cover rounded-full border border-amber-400/30 flex-shrink-0" />
        <div className="min-w-0">
          <span className="text-amber-200 font-serif text-sm font-bold">{currentPreset.label}</span>
          <span className="text-amber-100/50 text-xs ml-2">{currentPreset.desc}</span>
        </div>
      </div>
    </div>
  );
}