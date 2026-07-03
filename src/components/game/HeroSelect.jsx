import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { HEROES } from "@/data/heroes";
import { getCardById } from "@/data/cards";
import * as Sound from "@/game/soundManager";

export default function HeroSelect() {
  const { profile, startRun } = useGame();
  const navigate = useNavigate();
  const [selectedHero, setSelectedHero] = useState("adam");

  const hero = HEROES.find(h => h.id === selectedHero);

  const handleStart = () => {
    Sound.sfx.click();
    startRun(selectedHero);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="absolute top-6 left-6">
        <button onClick={() => { Sound.sfx.click(); navigate("/"); }} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif text-amber-200 mb-2">Choose Your Hero</h1>
        <p className="text-amber-100/50 text-sm">Each hero walks a different path of faith</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mb-8">
        {HEROES.map((h) => {
          const unlocked = profile.unlockedHeroes.includes(h.id);
          const hasAttackCards = h.starterDeck.some(id => getCardById(id)?.type === "attack");
          return (
            <button
              key={h.id}
              onClick={() => unlocked && (Sound.sfx.click(), setSelectedHero(h.id))}
              disabled={!unlocked}
              className={`p-6 rounded-xl border-2 text-center transition-all duration-300 ${
                selectedHero === h.id
                  ? "border-amber-300 bg-amber-500/15 scale-105"
                  : unlocked
                  ? "border-amber-500/20 bg-amber-900/10 hover:border-amber-400/50 hover:bg-amber-500/10 cursor-pointer"
                  : "border-slate-700/30 bg-slate-900/40 opacity-40 cursor-not-allowed"
              }`}
              style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
            >
              <div className="text-6xl mb-3">{unlocked ? h.icon : "🔒"}</div>
              <h3 className="text-xl font-serif text-amber-100">{h.name}</h3>
              <p className="text-amber-300/60 text-xs mb-3">{h.title}</p>
              {!unlocked ? (
                <p className="text-amber-100/40 text-xs">Complete Genesis to unlock</p>
              ) : (
                <>
                  <p className="text-amber-100/60 text-xs mb-3">{h.description}</p>
                  <div className="text-xs text-emerald-300/70 bg-emerald-900/20 rounded-lg p-2">
                    ⚡ {h.ability}
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                    <span className="text-amber-100/40">❤️ {h.maxHp} HP</span>
                    <span className="text-amber-100/40">🃏 {h.starterDeck.length} cards</span>
                    {hasAttackCards ? (
                      <span className="text-red-300/50">⚔️ Has attacks</span>
                    ) : (
                      <span className="text-red-400/80">⚠️ No attack cards!</span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {hero && profile.unlockedHeroes.includes(selectedHero) && !hero.starterDeck.some(id => getCardById(id)?.type === "attack") && (
        <div className="mb-4 px-4 py-2 rounded-lg border border-red-400/40 bg-red-900/20 text-red-200 text-sm text-center max-w-md">
          ⚠️ Warning: This hero's deck has no attack cards. You won't be able to damage enemies in battle!
        </div>
      )}

      {hero && profile.unlockedHeroes.includes(selectedHero) && (
        <button
          onClick={handleStart}
          className="px-10 py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-xl hover:bg-amber-600/40 transition animate-pulse"
        >
          ⚔️ Begin Genesis Run
        </button>
      )}
    </div>
  );
}