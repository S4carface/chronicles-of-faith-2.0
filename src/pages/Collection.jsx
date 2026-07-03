import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { CARDS } from "@/data/cards";
import Card from "@/components/game/Card";
import * as Sound from "@/game/soundManager";

export default function Collection() {
  const { profile, Sound: Snd } = useGame();
  const [filter, setFilter] = useState("all");

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const collected = new Set(profile.collectedCards);
  const filtered = CARDS.filter(c => {
    if (filter === "all") return true;
    return c.rarity === filter;
  });

  const stats = {
    total: CARDS.length,
    owned: collected.size,
    common: CARDS.filter(c => c.rarity === "common" && collected.has(c.id)).length,
    rare: CARDS.filter(c => c.rarity === "rare" && collected.has(c.id)).length,
    legendary: CARDS.filter(c => c.rarity === "legendary" && collected.has(c.id)).length,
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">My Collection</h1>
          <p className="text-amber-100/40 text-xs mt-1">{stats.owned} / {stats.total} cards discovered</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
        <div className="text-center p-3 rounded-lg border border-slate-400/20 bg-slate-700/20">
          <p className="text-2xl font-bold text-slate-300">{stats.common}</p>
          <p className="text-slate-400 text-xs">Common</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-amber-400/20 bg-amber-700/10">
          <p className="text-2xl font-bold text-amber-300">{stats.rare}</p>
          <p className="text-amber-400/60 text-xs">Rare</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-yellow-400/20 bg-yellow-700/10">
          <p className="text-2xl font-bold text-yellow-200">{stats.legendary}</p>
          <p className="text-yellow-400/60 text-xs">Legendary</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex justify-center gap-2 mb-6">
        {["all", "common", "rare", "legendary"].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); Sound.sfx.click(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              filter === f
                ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
                : "border border-amber-500/10 text-amber-100/40 hover:text-amber-100/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-w-4xl mx-auto pb-12">
        {filtered.map(card => {
          const owned = collected.has(card.id);
          return (
            <div key={card.id} className="relative">
              {owned ? (
                <Card card={card} small />
              ) : (
                <div className="w-24 h-36 rounded-lg border-2 border-slate-700/30 bg-slate-900/60 flex flex-col items-center justify-center">
                  <div className="text-3xl opacity-20">❓</div>
                  <p className="text-slate-600 text-[8px] mt-2 text-center px-1">Not yet discovered</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}