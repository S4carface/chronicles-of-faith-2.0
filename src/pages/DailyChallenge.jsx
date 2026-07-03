import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { DAILY_THEMES } from "@/data/genesisRooms";
import * as Sound from "@/game/soundManager";

function getTodayTheme() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  return DAILY_THEMES[dayOfYear % DAILY_THEMES.length];
}

export default function DailyChallenge() {
  const { profile, startRun, Sound: Snd } = useGame();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const theme = getTodayTheme();
  const todayStr = new Date().toISOString().slice(0, 10);
  const completedToday = profile.lastDailyDate === todayStr;

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const handleStart = () => {
    setLoading(true);
    Sound.sfx.click();
    setTimeout(() => {
      startRun(profile.unlockedHeroes.includes("noah") ? "noah" : "adam", true);
      navigate("/play");
    }, 300);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      <div className="absolute top-6 left-6">
        <button onClick={() => { Sound.sfx.click(); navigate("/"); }} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</button>
      </div>

      <div className="text-center max-w-md">
        <div className="text-7xl mb-4">{theme.icon}</div>
        <p className="text-amber-300/60 text-sm uppercase tracking-widest mb-2">Today's Challenge</p>
        <h1 className="text-3xl font-serif text-amber-200 mb-4">{theme.theme}</h1>

        <div className="rounded-xl border-2 border-amber-500/20 p-6 mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <p className="text-amber-100/60 text-sm mb-4">
            Every player faces the same path today. Same rooms, same enemies, same choices.
            How will you fare compared to the community?
          </p>

          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-amber-200">{profile.dailyStreak}</p>
              <p className="text-amber-100/60 text-xs">Day Streak</p>
            </div>
            <div className="w-px h-8 bg-amber-500/20" />
            <div>
              <p className="text-2xl font-bold text-amber-200">{completedToday ? "✓" : "—"}</p>
              <p className="text-amber-100/60 text-xs">Today's Status</p>
            </div>
          </div>
        </div>

        {completedToday ? (
          <div className="text-center">
            <p className="text-emerald-300 mb-4">✓ You've completed today's challenge!</p>
            <p className="text-amber-100/60 text-xs mb-6">Come back tomorrow for a new adventure.</p>
            <button
              onClick={() => { Sound.sfx.click(); navigate("/leaderboard"); }}
              className="inline-block px-8 py-3 rounded-lg border-2 border-amber-400/40 bg-amber-900/20 text-amber-200 font-serif hover:bg-amber-800/30 transition"
            >
              View Leaderboard →
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-10 py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-xl hover:bg-amber-600/40 transition disabled:opacity-50 animate-pulse"
          >
            {loading ? "Starting..." : "⚔️ Begin Daily Run"}
          </button>
        )}

        <p className="text-amber-100/50 text-xs mt-8 font-serif italic">
          "His mercies are new every morning." — Lamentations 3:23
        </p>
      </div>
    </div>
  );
}