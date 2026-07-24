import React, { useEffect, useState } from "react";

import { useGame } from "@/game/GameContext";
import { CARDS } from "@/data/cards";
import CollectionTab from "@/components/game/CollectionTab";
import DeckBuilderTab from "@/components/game/DeckBuilderTab";
import * as Sound from "@/game/soundManager";

// Use the exact same file name/case that exists in your repo.
// If you uploaded lowercase .png instead, change .PNG to .png here.
const CARDS_BACKGROUND = "/images/backgrounds/cards-bg-sacred-archive.PNG";

export default function Collection() {
  const { profile, Sound: Snd } = useGame();
  const [tab, setTab] = useState("collection");

  useEffect(() => {
    Snd.playMusic("menu");
  }, []);

  const collection = profile.cardCollection || {};
  const ownedCount = Object.values(collection).filter((v) => v > 0).length;
  const totalCount = CARDS.length;
  const percent = Math.round((ownedCount / totalCount) * 100);
  const activeDeck = profile.activeDeck || [];

  return (
    <div
      className="relative min-h-screen overflow-hidden p-4 lg:p-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28"
      style={{
        backgroundColor: "#050B16",
        backgroundImage: `linear-gradient(180deg, rgba(4,9,20,0.42) 0%, rgba(5,11,26,0.66) 42%, rgba(3,8,18,0.88) 100%), url("${CARDS_BACKGROUND}")`,
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(218,179,72,0.16) 0%, rgba(218,179,72,0.06) 18%, transparent 38%), radial-gradient(circle at 50% 32%, rgba(39,74,139,0.18) 0%, transparent 42%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,11,22,0.12) 0%, rgba(5,11,22,0.40) 58%, transparent 100%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <h1 className="text-2xl lg:text-3xl font-serif text-amber-200">
              My Cards & Deck
            </h1>
            <p className="text-amber-100/50 text-xs mt-1">
              Collection: {ownedCount} / {totalCount} · Active Deck:{" "}
              {activeDeck.length} / 10
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="max-w-md mx-auto mb-4">
          <div className="w-full h-2.5 bg-slate-900/80 rounded-full border border-amber-500/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Rule explanation */}
        <div className="max-w-md mx-auto mb-4 px-4 py-2 rounded-lg border border-amber-500/15 bg-slate-950/35 backdrop-blur-[1px] text-center">
          <p className="text-amber-100/60 text-xs lg:text-sm">
            Build a 10-card deck. You can bring up to 2 copies of the same
            card.
          </p>
        </div>

        {/* Segmented control */}
        <div
          className="mx-auto mb-6 flex max-w-xs rounded-xl border border-amber-500/15 bg-slate-950/35 backdrop-blur-[1px] p-1"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={tab === "collection"}
            onClick={() => {
              setTab("collection");
              Sound.sfx.click();
            }}
            className={`min-h-11 flex-1 rounded-lg text-sm font-medium transition ${
              tab === "collection"
                ? "bg-amber-500/20 text-amber-200 shadow-sm"
                : "text-amber-100/60 hover:text-amber-100/80"
            }`}
          >
            Collection
          </button>
          <button
            role="tab"
            aria-selected={tab === "deck"}
            onClick={() => {
              setTab("deck");
              Sound.sfx.click();
            }}
            className={`min-h-11 flex-1 rounded-lg text-sm font-medium transition ${
              tab === "deck"
                ? "bg-amber-500/20 text-amber-200 shadow-sm"
                : "text-amber-100/60 hover:text-amber-100/80"
            }`}
          >
            Active Deck
          </button>
        </div>

        {tab === "collection" ? <CollectionTab /> : <DeckBuilderTab />}
      </div>
    </div>
  );
}
