import React, { useState, useMemo } from "react";
import { useGame } from "@/game/GameContext";
import { CARDS, getCardById } from "@/data/cards";
import Card from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import { canAddToDeck, getMaxCopies, DECK_SIZE } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";

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

  const filtered = useMemo(() => {
    if (filter === "all") return ownedCards;
    return ownedCards.filter(c => c.rarity === filter);
  }, [ownedCards, filter]);

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

      {/* Filter */}
      <div className="flex justify-center gap-2 mb-4">
        {["all", "common", "rare", "legendary"].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); Sound.sfx.click(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
                : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {ownedCards.length === 0 && (
        <p className="text-amber-100/50 text-center text-sm py-8">No cards collected yet. Win battles to earn cards!</p>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-3xl mx-auto pb-12">
        {filtered.map(card => {
          const ownedCount = collection[card.id] || 0;
          const inDeck = activeDeck.filter(id => id === card.id).length;
          const maxCopies = getMaxCopies(card.rarity);

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

              {/* Owned / In deck stats */}
              <div className="flex justify-center gap-2 w-full mt-1 mb-1 text-[9px]">
                <span className="text-amber-100/50">Owned: <span className="text-amber-200 font-bold">{ownedCount}</span></span>
                <span className="text-amber-100/30">·</span>
                <span className="text-amber-100/50">In deck: <span className={`font-bold ${inDeck >= maxCopies ? "text-amber-300" : "text-amber-200"}`}>{inDeck}</span>/{maxCopies}</span>
              </div>

              {/* Add / Remove buttons — large enough for mobile */}
              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => handleRemove(card.id)}
                  disabled={inDeck === 0}
                  className="flex-1 min-h-[36px] text-sm font-bold py-1.5 px-2 rounded-lg border border-red-400/30 bg-red-900/20 text-red-200 hover:bg-red-800/30 transition active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
                  aria-label={`Remove ${card.name} from deck`}
                >
                  −
                </button>
                <button
                  onClick={() => handleAdd(card.id)}
                  className="flex-1 min-h-[36px] text-sm font-bold py-1.5 px-2 rounded-lg border border-amber-400/50 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40 transition active:scale-95"
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