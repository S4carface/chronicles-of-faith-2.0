import React, { useState } from "react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { HOME_ART } from "@/data/art";

export default function PlayerNamePrompt({ onSave, onCancel, title, subtitle }) {
  const { profile, saveProfile } = useGame();
  const [name, setName] = useState(profile.playerName && profile.playerName !== "Anonymous Warrior" ? profile.playerName : "");

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed) {
      saveProfile({ playerName: trimmed });
      Sound.sfx.click();
      if (onSave) onSave(trimmed);
    }
  };

  const handleAnonymous = () => {
    saveProfile({ playerName: "Anonymous Warrior" });
    Sound.sfx.click();
    if (onSave) onSave("Anonymous Warrior");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex justify-center mb-4">
          <img src={HOME_ART.cross} alt="" className="w-10 h-10 object-cover rounded-full border-2 border-amber-400/30" />
        </div>
        <h2 className="text-xl font-serif text-amber-200 text-center mb-2">{title || "Choose Your Name"}</h2>
        <p className="text-amber-100/50 text-sm text-center mb-6">{subtitle || "This is the name that will appear on the leaderboard."}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleSave(); }}
          className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-amber-500/20 text-amber-100 text-center text-base mb-4 outline-none focus:border-amber-400/50"
        />
        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition disabled:opacity-40"
          >
            Save Name
          </button>
          <button
            onClick={handleAnonymous}
            className="w-full px-6 py-2 rounded-lg border border-amber-400/20 bg-slate-800/40 text-amber-100/60 text-sm hover:bg-slate-800/60 transition"
          >
            Play as Anonymous
          </button>
        </div>
      </div>
    </div>
  );
}