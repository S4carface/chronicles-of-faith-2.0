import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

export default function Settings() {
  const { profile, saveProfile, Sound: Snd } = useGame();

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const toggleMusic = () => {
    const newVal = !profile.settings.music;
    saveProfile({ settings: { ...profile.settings, music: newVal } });
    if (newVal) Sound.playMusic("menu");
    Sound.sfx.click();
  };

  const toggleSfx = () => {
    const newVal = !profile.settings.sfx;
    saveProfile({ settings: { ...profile.settings, sfx: newVal } });
    if (newVal) Sound.sfx.click();
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8 w-full max-w-md">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <h1 className="text-3xl font-serif text-amber-200">Settings</h1>
        <div className="w-16" />
      </div>

      <div className="max-w-md w-full space-y-4">
        {/* Music toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <p className="font-serif text-amber-100">Music</p>
              <p className="text-amber-100/60 text-xs">Ambient biblical soundtracks</p>
            </div>
          </div>
          <button
            onClick={toggleMusic}
            className={`w-14 h-7 rounded-full transition relative ${profile.settings.music ? "bg-amber-500/40" : "bg-slate-700"}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${profile.settings.music ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* SFX toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊</span>
            <div>
              <p className="font-serif text-amber-100">Sound Effects</p>
              <p className="text-amber-100/60 text-xs">Card plays, attacks, victory</p>
            </div>
          </div>
          <button
            onClick={toggleSfx}
            className={`w-14 h-7 rounded-full transition relative ${profile.settings.sfx ? "bg-amber-500/40" : "bg-slate-700"}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${profile.settings.sfx ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Player name */}
        <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✍️</span>
            <div>
              <p className="font-serif text-amber-100">Player Name</p>
              <p className="text-amber-100/60 text-xs">Shown on the leaderboard</p>
            </div>
          </div>
          <input
            type="text"
            value={profile.playerName || ""}
            onChange={(e) => saveProfile({ playerName: e.target.value })}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full px-4 py-2 rounded-lg bg-slate-900/60 border border-amber-500/20 text-amber-100 outline-none focus:border-amber-400/50"
          />
        </div>

        {/* About */}
        <div className="p-4 rounded-xl border-2 border-amber-500/10" style={{ background: "rgba(15,26,48,0.4)" }}>
          <p className="text-amber-100/60 text-xs text-center font-serif italic">
            Chronicles of Faith — A Biblical Roguelike<br/>
            Teaching the Bible through gameplay, one chapter at a time.<br/>
            Version 1.0 — Genesis
          </p>
        </div>
      </div>
    </div>
  );
}