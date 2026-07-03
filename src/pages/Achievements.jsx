import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { ACHIEVEMENTS } from "@/data/achievements";
import * as Sound from "@/game/soundManager";

export default function Achievements() {
  const { profile, Sound: Snd } = useGame();
  useEffect(() => { Snd.playMusic("menu"); }, []);

  const unlocked = new Set(profile.achievements);
  const unlockedCount = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length;

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">Achievements</h1>
          <p className="text-amber-100/60 text-xs mt-1">{unlockedCount} / {ACHIEVEMENTS.length} unlocked</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = unlocked.has(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                isUnlocked
                  ? "border-amber-400/30 bg-amber-500/5"
                  : "border-slate-700/20 bg-slate-900/30 opacity-60"
              }`}
            >
              <div className={`text-4xl ${isUnlocked ? "" : "grayscale opacity-40"}`}>
                {isUnlocked ? achievement.icon : "🔒"}
              </div>
              <div className="flex-1">
                <h3 className={`font-serif ${isUnlocked ? "text-amber-200" : "text-slate-500"}`}>
                  {achievement.name}
                </h3>
                <p className={`text-xs ${isUnlocked ? "text-amber-100/50" : "text-slate-600"}`}>
                  {achievement.description}
                </p>
                {isUnlocked && (
                  <p className="text-amber-300/40 text-[10px] italic mt-1">"{achievement.verse}"</p>
                )}
              </div>
              {isUnlocked && <div className="text-emerald-400 text-xl">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}