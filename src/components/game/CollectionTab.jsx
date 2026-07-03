import React, { useState, useMemo } from "react";
import { useGame } from "@/game/GameContext";
import { CARDS, getCardById } from "@/data/cards";
import Card from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import { canAddToDeck, getMaxCopies } from "@/game/deckRules";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const RARITY_BORDER = {
  common: "border-sky-400/60",
  rare: "border-emerald-400/70",
  legendary: "border-amber-300/80",
};

export default function CollectionTab() {
  const { profile, addToActiveDeck } = useGame();
  const [filter, setFilter] = useState("all");
  const [detailCard, setDetailCard] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const collection = profile.cardCollection || {};
  const activeDeck = profile.activeDeck || [];

  const ownedCards = useMemo(() => {
    return CARDS.filter(c => (collection[c.id] || 0) > 0);
  }, [collection]);

  const filtered = useMemo(() => {
    if (filter === "all") return ownedCards;
    return ownedCards.filter(c => c.rarity === filter);
  }, [ownedCards, filter]);

  const handleAdd = (cardId) => {
    const card = getCardById(cardId);
    const result = canAddToDeck(cardId, activeDeck, collection);
    if (result.canAdd) {
      Sound.sfx.cardPlay();
      addToActiveDeck(cardId);
      setFeedback({ cardId, text: "Added to deck!", type: "success" });
    } else {
      Sound.sfx.click();
      setFeedback({ cardId, text: result.reason, type: "error" });
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div>
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
          const addResult = canAddToDeck(card.id, activeDeck, collection);
          const showFeedback = feedback?.cardId === card.id;

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
              <div className="text-center mt-1 mb-1">
                <span className="text-amber-100/40 text-[9px]">In deck: {inDeck}/{maxCopies}</span>
              </div>
              <button
                onClick={() => handleAdd(card.id)}
                disabled={!addResult.canAdd}
                className={`w-full text-[10px] font-bold py-1 px-2 rounded border transition ${
                  addResult.canAdd
                    ? "border-amber-400/50 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
                    : "border-slate-700/30 bg-slate-900/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                {addResult.canAdd ? "+ Add to Deck" : "Limit Reached"}
              </button>
              {showFeedback && (
                <p className={`text-[9px] mt-0.5 text-center leading-tight ${feedback.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
                  {feedback.text}
                </p>
              )}
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