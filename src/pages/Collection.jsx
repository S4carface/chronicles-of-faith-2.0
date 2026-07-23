import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins } from "lucide-react";

import { useGame } from "@/game/GameContext";
import { CARDS } from "@/data/cards";
import CollectionTab from "@/components/game/CollectionTab";
import DeckBuilderTab from "@/components/game/DeckBuilderTab";
import Shop from "@/pages/Shop";
import {
  resolveInitialCardsTab,
  loadStoredCardsTab,
  saveStoredCardsTab,
  isValidCardsTab,
} from "@/game/cardsHubTabs";
import * as Sound from "@/game/soundManager";

// The Cards hub — Deck | Collection | Shop. Three persistent tabs over the
// existing Deck and Collection behavior plus the existing Shop (reused as-is,
// see shopRules.js / Shop.jsx `embedded` mode — no duplicate Shop page or
// purchase logic). The active tab lives in the URL's ?tab= query param, so a
// direct link or a page refresh always restores the exact tab; a local
// preference additionally lets a returning visitor (no ?tab= present) reopen
// whichever tab they left on. A first-time visitor with neither opens Deck.
export default function Collection() {
  const { profile, Sound: Snd } = useGame();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState(() =>
    resolveInitialCardsTab({
      tabParam: searchParams.get("tab"),
      storedTab: loadStoredCardsTab(),
    })
  );

  // A ?tab= param changing under us (e.g. the legacy /shop redirect landing
  // here, or the browser back/forward button) re-syncs the active tab.
  useEffect(() => {
    const param = searchParams.get("tab");
    if (isValidCardsTab(param) && param !== tab) setTab(param);
  }, [searchParams]);

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const selectTab = (next) => {
    if (next === tab) return;
    Sound.sfx.click();
    setTab(next);
    saveStoredCardsTab(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const collection = profile.cardCollection || {};
  const ownedCount = Object.values(collection).filter(v => v > 0).length;
  const totalCount = CARDS.length;
  const percent = Math.round((ownedCount / totalCount) * 100);
  const activeDeck = profile.activeDeck || [];
  const gold = profile.gold || 0;

  const TABS = [
    { key: "deck", label: "Deck" },
    { key: "collection", label: "Collection" },
    { key: "shop", label: "Shop" },
  ];

  return (
    <div className="min-h-screen p-4 lg:p-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="text-center">
          <h1 className="text-2xl lg:text-3xl font-serif text-amber-200">Cards</h1>
          <p className="text-amber-100/50 text-xs mt-1">Collection: {ownedCount} / {totalCount} · Active Deck: {activeDeck.length} / 10</p>
        </div>
      </div>

      {/* Gold — always visible across all three Cards tabs (mandatory on Shop). */}
      <div className="flex justify-center mb-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-900/20 px-3 py-1"
          aria-label={`${gold} gold`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
          <span className="text-amber-200 text-sm font-bold">{gold}</span>
          <span className="text-amber-100/50 text-xs">Gold</span>
        </span>
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

      {/* Three-tab hub — Deck | Collection | Shop. One shared segmented track,
          compact and mobile-sized (44px min tap target), muted inactive state,
          obvious active state. Text-first labels — no colorful icons. */}
      <div className="mx-auto mb-6 flex max-w-sm rounded-xl border border-amber-500/15 bg-slate-900/30 p-1" role="tablist" aria-label="Cards section">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            id={`cards-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`cards-panel-${key}`}
            onClick={() => selectTab(key)}
            className={`min-h-11 flex-1 rounded-lg text-sm font-medium transition truncate px-1 ${
              tab === key
                ? "bg-amber-500/20 text-amber-200 shadow-sm"
                : "text-amber-100/60 hover:text-amber-100/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div id={`cards-panel-${tab}`} role="tabpanel" aria-labelledby={`cards-tab-${tab}`}>
        {tab === "deck" && <DeckBuilderTab />}
        {tab === "collection" && <CollectionTab />}
        {tab === "shop" && <Shop embedded />}
      </div>
    </div>
  );
}