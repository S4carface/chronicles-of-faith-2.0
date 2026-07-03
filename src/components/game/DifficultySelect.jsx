import React from "react";
import { useGame } from "@/game/GameContext";
import { DIFFICULTY_PRESETS } from "@/game/mapGenerator";
import * as Sound from "@/game/soundManager";

export default function DifficultySelect() {
  const { profile, saveProfile } = useGame();

  const difficulties = Object.entries(DIFFICULTY_PRESETS);

  const handleSelect = (key) => {
    Sound.sfx.click();
    saveProfile({ difficulty: key });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-md w-full mb-6">
      {difficulties.map(([key, preset]) => {
        const isActive = (profile.difficulty || "normal") === key;
        return (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`p-4 rounded-xl border-2 text-center transition-all ${
              isActive
                ? "border-amber-300 bg-amber-500/20 scale-105"
                : "border-amber-500/15 hover:border-amber-400/50 hover:bg-amber-500/10"
            }`}
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.6) 0%, rgba(15,26,48,0.6) 100%)" }}
          >
            <div className="text-3xl mb-2">{preset.icon}</div>
            <h3 className="font-serif text-amber-100 text-lg">{preset.label}</h3>
            <p className="text-amber-100/40 text-xs mt-1">{preset.desc}</p>
            {isActive && (
              <p className="text-amber-300 text-xs mt-2 font-bold">✓ Selected</p>
            )}
          </button>
        );
      })}
    </div>
  );
}