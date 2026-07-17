import React, { useEffect, useState } from "react";

import { useGame } from "@/game/GameContext";
import { CARDS } from "@/data/cards";
import CollectionTab from "@/components/game/CollectionTab";
import DeckBuilderTab from "@/components/game/DeckBuilderTab";
import * as Sound from "@/game/soundManager";

export default function Collection() {
  const { profile, Sound: Snd } = useGame();
  const [tab, setTab] = useState("collection");

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const collection = profile.cardCollection || {};
  const ownedCount = Object.values(collection).filter(v => v > 0).length;
  const totalCount = CARDS.length;
  const percent = Math.round((ownedCount / totalCount) * 100);
  const activeDeck = profile.activeDeck || [];

  return (
    <div className="min-h-screen p-4 lg:p-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex justify-center mb-6">

        <div className="text-center">
          <h1 className="text-2xl lg:text-3xl font-serif text-amber-200">My Cards & Deck</h1>
          <p className="text-amber-100/50 text-xs mt-1">Collection: {ownedCount} / {totalCount} · Active Deck: {activeDeck.length} / 10</p>
        </div>
        
      </div>

      {/* Overall progress bar */}
      <div className="max-w-md mx-auto mb-4">
        <div className="w-full h-2.5 bg-slate-900 rounded-full border border-amber-500/20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Rule explanation */}
      <div className="max-w-md mx-auto mb-4 px-4 py-2 rounded-lg border border-amber-500/15 bg-slate-900/30 text-center">
        <p className="text-amber-100/50 text-xs lg:text-sm">
          Build a 10-card deck. You can bring up to 2 copies of the same card.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => { setTab("collection"); Sound.sfx.click(); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
            tab === "collection"
              ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
              : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
          }`}
        >
          Collection
        </button>
        <button
          onClick={() => { setTab("deck"); Sound.sfx.click(); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
            tab === "deck"
              ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
              : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
          }`}
        >
          Active Deck
        </button>
      </div>

      {tab === "collection" ? <CollectionTab /> : <DeckBuilderTab />}
    </div>
  );
}