import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { CARDS, getCardById } from "@/data/cards";
import Card, { getCardEffectText } from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import * as Sound from "@/game/soundManager";

export default function Collection() {
  const { profile, Sound: Snd } = useGame();
  const [filter, setFilter] = useState("all");
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const collected = useMemo(() => new Set(profile.collectedCards), [profile.collectedCards]);

  const filtered = CARDS.filter(c => {
    if (filter === "all") return true;
    return c.rarity === filter;
  });

  const stats = useMemo(() => {
    const commonTotal = CARDS.filter(c => c.rarity === "common").length;
    const rareTotal = CARDS.filter(c => c.rarity === "rare").length;
    const legendaryTotal = CARDS.filter(c => c.rarity === "legendary").length;
    const commonOwned = CARDS.filter(c => c.rarity === "common" && collected.has(c.id)).length;
    const rareOwned = CARDS.filter(c => c.rarity === "rare" && collected.has(c.id)).length;
    const legendaryOwned = CARDS.filter(c => c.rarity === "legendary" && collected.has(c.id)).length;
    return {
      total: CARDS.length,
      owned: collected.size,
      commonOwned, rareOwned, legendaryOwned,
      commonTotal, rareTotal, legendaryTotal,
      percent: Math.round((collected.size / CARDS.length) * 100),
      commonPercent: Math.round((commonOwned / commonTotal) * 100),
      rarePercent: Math.round((rareOwned / rareTotal) * 100),
      legendaryPercent: Math.round((legendaryOwned / legendaryTotal) * 100),
    };
  }, [collected]);

  const rarityDropRates = {
    common: "70% drop rate",
    rare: "25% drop rate",
    legendary: "5% drop rate",
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">My Collection</h1>
          <p className="text-amber-100/60 text-xs mt-1">{stats.owned} / {stats.total} cards — {stats.percent}% complete</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Overall progress bar */}
      <div className="max-w-md mx-auto mb-6">
        <div className="w-full h-3 bg-slate-900 rounded-full border border-amber-500/20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-500" style={{ width: `${stats.percent}%` }} />
        </div>
      </div>

      {/* Rarity stats with percentages and drop rates */}
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
        <div className="text-center p-3 rounded-lg border border-sky-400/20 bg-sky-900/10">
          <p className="text-2xl font-bold text-sky-300">{stats.commonOwned}/{stats.commonTotal}</p>
          <p className="text-sky-400/60 text-xs">Common</p>
          <p className="text-sky-300/40 text-[10px] mt-1">{stats.commonPercent}% owned</p>
          <p className="text-sky-300/30 text-[9px]">{rarityDropRates.common}</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-emerald-400/20 bg-emerald-900/10">
          <p className="text-2xl font-bold text-emerald-300">{stats.rareOwned}/{stats.rareTotal}</p>
          <p className="text-emerald-400/60 text-xs">Rare</p>
          <p className="text-emerald-300/40 text-[10px] mt-1">{stats.rarePercent}% owned</p>
          <p className="text-emerald-300/30 text-[9px]">{rarityDropRates.rare}</p>
        </div>
        <div className="text-center p-3 rounded-lg border border-amber-400/20 bg-amber-900/10">
          <p className="text-2xl font-bold text-amber-200">{stats.legendaryOwned}/{stats.legendaryTotal}</p>
          <p className="text-amber-400/60 text-xs">Legendary</p>
          <p className="text-amber-300/40 text-[10px] mt-1">{stats.legendaryPercent}% owned</p>
          <p className="text-amber-300/30 text-[9px]">{rarityDropRates.legendary}</p>
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
                : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid — click any card for details */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-w-4xl mx-auto pb-12">
        {filtered.map(card => {
          const owned = collected.has(card.id);
          return (
            <div
              key={card.id}
              onClick={() => { Sound.sfx.click(); setSelectedCard(card); }}
              className="relative cursor-pointer hover:scale-105 transition-transform"
            >
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

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          owned={collected.has(selectedCard.id)}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}