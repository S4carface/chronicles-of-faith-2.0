import React, { useState } from "react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { HOME_ART } from "@/data/art";
import { validatePlayerName, generateSafeName } from "@/game/nameValidator";

export default function PlayerNamePrompt({ onSave, onCancel, forceName, endOfRun }) {
  const { profile, saveProfile } = useGame();
  const [name, setName] = useState(profile.playerName && profile.playerName !== "Anonymous Warrior" ? profile.playerName : "");
  const [error, setError] = useState("");

  const handleSave = () => {
    const result = validatePlayerName(name);
    if (!result.valid) {
      setError(result.error);
      Sound.sfx.click();
      return;
    }
    saveProfile({ playerName: result.name });
    Sound.sfx.click();
    if (onSave) onSave(result.name);
  };

  const handleGenerate = () => {
    const generated = generateSafeName();
    setName(generated);
    setError("");
    Sound.sfx.click();
  };

  const handleContinueWithout = () => {
    Sound.sfx.click();
    if (onSave) onSave(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex justify-center mb-4">
          <img src={HOME_ART.cross} alt="" className="w-10 h-10 object-cover rounded-full border-2 border-amber-400/30" />
        </div>
        <h2 className="text-xl font-serif text-amber-200 text-center mb-2">Choose Your Player Name</h2>
        <p className="text-amber-100/50 text-sm text-center mb-6">
          {endOfRun
            ? "Pick a respectful display name so your score can appear on the leaderboard."
            : "This name will appear on the leaderboard."}
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="Enter name"
          maxLength={18}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleSave(); }}
          className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-amber-500/20 text-amber-100 text-center text-base mb-2 outline-none focus:border-amber-400/50"
        />
        {error && (
          <p className="text-amber-300 text-xs text-center mb-3 font-medium animate-fade-in">{error}</p>
        )}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition disabled:opacity-40"
          >
            Save Name
          </button>
          <button
            onClick={handleGenerate}
            className="w-full px-6 py-2.5 rounded-lg border border-emerald-400/40 bg-emerald-900/20 text-emerald-200 text-sm font-medium hover:bg-emerald-800/30 transition"
          >
            Generate Safe Name
          </button>
          {endOfRun ? (
            <button
              onClick={handleContinueWithout}
              className="w-full px-6 py-2 rounded-lg border border-amber-400/20 bg-slate-800/40 text-amber-100/60 text-sm hover:bg-slate-800/60 transition"
            >
              Continue Without Leaderboard
            </button>
          ) : (
            !forceName && (
              <button
                onClick={() => { Sound.sfx.click(); if (onCancel) onCancel(); }}
                className="w-full px-6 py-2 rounded-lg border border-amber-400/20 bg-slate-800/40 text-amber-100/60 text-sm hover:bg-slate-800/60 transition"
              >
                Cancel
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}