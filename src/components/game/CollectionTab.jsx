import React, { useState, useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { CARDS, getCardById } from "@/data/cards";
import Card from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import { canAddToDeck, getMaxCopies, getCardFragmentBalance, DECK_SIZE } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import { ACTIVE_CARD_RARITIES, getCardRarity } from "@/data/cardRarity";

export default function CollectionTab() {
  const { profile, addToActiveDeck, removeCardFromDeck } = useGame();
  const [filter, setFilter] = useState("all");
  const [detailCard, setDetailCard] = useState(null);
  const [toast, setToast] = useState(null);

  const collection = profile.cardCollection || {};
  const activeDeck = profile.activeDeck || [];

  const ownedCards = useMemo(() => {
    return CARDS.filter(c => (collection[c.id] || 0) > 0);
  }, [collection]);

  // Fragment progress can exist for a card the player doesn't own a complete
  // copy of yet — no reward path grants that today (Fragments only start once
  // a card is already owned), but the display supports it going forward.
  const visibleCards = useMemo(() => {
    return CARDS.filter(c => (collection[c.id] || 0) > 0 || getCardFragmentBalance(profile, c.id) > 0);
  }, [collection, profile]);

  const filtered = useMemo(() => {
    if (filter === "all") return visibleCards;
    return visibleCards.filter(c => c.rarity === filter);
  }, [visibleCards, filter]);

  const showToast = (text, type = "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = (cardId) => {
    const card = getCardById(cardId);
    const result = canAddToDeck(cardId, activeDeck, collection);
    if (result.canAdd) {
      Sound.sfx.cardPlay();
      addToActiveDeck(cardId);
    } else {
      Sound.sfx.click();
      // Override reason when deck is full
      if (activeDeck.length >= DECK_SIZE) {
        showToast("Deck is full. Remove a card first.", "error");
      } else {
        showToast(result.reason, "error");
      }
    }
  };

  const handleRemove = (cardId) => {
    const inDeck = activeDeck.filter(id => id === cardId).length;
    if (inDeck > 0) {
      Sound.sfx.click();
      removeCardFromDeck(cardId);
    }
  };

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 py-2 rounded-lg border-2 border-red-400/40 bg-red-900/80 backdrop-blur-sm shadow-lg">
          <p className={`text-sm font-medium ${toast.type === "success" ? "text-emerald-200" : "text-red-200"}`}>
            {toast.text}
          </p>
        </div>
      )}

      {/* Card Fragments explanation — shown once near the heading, not per-card */}
      <div className="max-w-md mx-auto mb-4 rounded-lg border border-amber-500/15 bg-slate-900/30 px-3 py-2">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-300/60 flex-shrink-0 mt-0.5" />
          <p className="text-amber-100/50 text-xs text-left">
            Card Fragments will be used to unlock and craft cards in a future update.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {["all", ...ACTIVE_CARD_RARITIES].map(f => {
          const rarity = f === "all" ? null : getCardRarity(f);
          return (
          <button
            key={f}
            onClick={() => { setFilter(f); Sound.sfx.click(); }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-slate-900/65"
                : "border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
            }`}
            style={filter === f && rarity ? { borderColor: rarity.borderColor, color: rarity.labelColor, backgroundColor: `${rarity.collectionFilterColor}1f` } : undefined}
          >
            {rarity?.displayName || "All"}
          </button>
        );})}
      </div>

      {ownedCards.length === 0 && (
        <p className="text-amber-100/50 text-center text-sm py-8">Cards you discover will appear here.</p>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-3xl mx-auto pb-12">
        {filtered.map(card => {
          const ownedCount = collection[card.id] || 0;
          const owned = ownedCount > 0;
          const fragments = getCardFragmentBalance(profile, card.id);
          const inDeck = activeDeck.filter(id => id === card.id).length;
          const maxCopies = getMaxCopies(card.rarity);

          if (!owned) {
            // Not discovered yet, but Fragment progress exists for it.
            const rarity = getCardRarity(card.rarity);
            return (
              <div key={card.id} className="flex flex-col items-center">
                <div
                  className="w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center px-1 text-center bg-slate-950/40"
                  style={{ borderColor: rarity.borderColor }}
                >
                  <span className="text-lg">🔒</span>
                  <p className="mt-1 font-serif text-[10px] text-amber-100/70 leading-tight">{card.name}</p>
                </div>
                <div className="mt-1 mb-1 text-[9px] text-center">
                  <p className="text-amber-100/40">Not Discovered</p>
                  <p className="text-amber-200/70">Fragments: <span className="font-bold">{fragments}</span></p>
                </div>
              </div>
            );
          }

          return (
            <div key={card.id} className="flex flex-col items-center">
              <div
                onClick={() => { Sound.sfx.click(); setDetailCard(card); }}
                className="relative cursor-pointer hover:scale-105 transition-transform"
              >
                <Card card={card} small />
                <div className="absolute top-1 right-1 bg-slate-900/80 border border-amber-400/30 rounded-full px-1.5 py-0.5">
                  <span className="text-amber-200 text-[8px] font-bold">{ownedCount}</span>
                </div>
              </div>

              {/* Owned / In deck / Fragments stats */}
              <div className="flex flex-wrap justify-center gap-x-2 w-full mt-1 mb-1 text-[9px]">
                <span className="text-amber-100/50">Owned: <span className="text-amber-200 font-bold">{ownedCount}</span></span>
                <span className="text-amber-100/30">·</span>
                <span className="text-amber-100/50">In deck: <span className={`font-bold ${inDeck >= maxCopies ? "text-amber-300" : "text-amber-200"}`}>{inDeck}</span>/{maxCopies}</span>
                <span className="text-amber-100/30 w-full sm:w-auto">·</span>
                <span className="text-amber-100/50">Fragments: <span className="text-amber-200 font-bold">{fragments}</span></span>
              </div>

              {/* Add / Remove buttons — 44px minimum tap target for mobile */}
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => handleRemove(card.id)}
                  disabled={inDeck === 0}
                  className="flex-1 min-h-11 text-base font-bold py-1.5 px-2 rounded-lg border border-red-400/30 bg-red-900/20 text-red-200 hover:bg-red-800/30 transition active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                  aria-label={`Remove ${card.name} from deck`}
                >
                  −
                </button>
                <button
                  onClick={() => handleAdd(card.id)}
                  className="flex-1 min-h-11 text-base font-bold py-1.5 px-2 rounded-lg border border-amber-400/50 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40 transition active:scale-95"
                  aria-label={`Add ${card.name} to deck`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          owned={(collection[detailCard.id] || 0) > 0}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
