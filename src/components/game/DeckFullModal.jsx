import React, { useState } from "react";
import { getCardById } from "@/data/cards";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import { getCardEffectText } from "@/components/game/Card";
import { RUN_DECK_MAX } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import RarityCardFrame from "@/components/ui/RarityCardFrame";
import { getCardRarity } from "@/data/cardRarity";

export default function DeckFullModal({ rewardCardId, runDeck, onReplace, onSendToCollection, onSkip }) {
  const [mode, setMode] = useState("choose"); // "choose" | "replace"
  const card = getCardById(rewardCardId);
  if (!card) return null;

  const handleSelectReplace = (index) => {
    Sound.sfx.click();
    onReplace(index);
  };

  if (mode === "replace") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
        <div className="max-w-lg w-full">
          <h2 className="text-xl font-serif text-amber-200 text-center mb-2">Replace a Card</h2>
          <p className="text-amber-100/50 text-sm text-center mb-4">
            Select a card to remove from your run deck. The reward card will take its place.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto mb-4">
            {runDeck.map((cardId, idx) => {
              const dc = getCardById(cardId);
              if (!dc) return null;
              const rarity = getCardRarity(dc.rarity);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectReplace(idx)}
                  className="p-2 rounded-lg border bg-slate-800/60 hover:bg-slate-700/60 transition text-center"
                  style={{ borderColor: rarity.borderColor, boxShadow: `0 0 10px ${rarity.glowColor}` }}
                >
                  <div className="w-12 h-12 rounded overflow-hidden mx-auto mb-1" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
                    <img src={CARD_ART[dc.id] || PLACEHOLDER_ART} alt={dc.name} className="art-portrait" />
                  </div>
                  <p className="text-amber-100 text-[10px] font-serif leading-tight">{dc.name}</p>
                  <p className="text-[8px] font-bold uppercase" style={{ color: rarity.labelColor }}>{rarity.displayName}</p>
                  <p className="text-amber-300/40 text-[8px]">{dc.cost} ✨</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { Sound.sfx.click(); setMode("choose"); }}
            className="text-amber-100/60 hover:text-amber-200 text-sm transition"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const rarity = getCardRarity(card.rarity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <h2 className="text-xl font-serif text-amber-200 text-center mb-2">Run Deck Full</h2>
        <p className="text-amber-100/60 text-sm text-center mb-4">
          Your run deck is full ({RUN_DECK_MAX} cards). Replace a card or send this card to your collection.
        </p>

        <RarityCardFrame rarity={rarity.key} className="mx-auto w-28 h-44 rounded-lg border-2 bg-gradient-to-b from-slate-800 to-slate-900 p-2 flex flex-col items-center justify-between mb-4">
          <div className="text-xs text-amber-300/60 w-full text-right">{card.cost} ✨</div>
          <div className="w-14 h-14 rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <img src={CARD_ART[card.id] || PLACEHOLDER_ART} alt={card.name} className="art-portrait" />
          </div>
          <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
          <div className="text-[8px] font-bold uppercase" style={{ color: rarity.labelColor }}>{rarity.displayName}</div>
          <div className="text-[8px] text-amber-300/40 text-center">{getCardEffectText(card)}</div>
        </RarityCardFrame>

        <div className="space-y-2">
          <button
            onClick={() => { Sound.sfx.click(); setMode("replace"); }}
            className="w-full px-4 py-2.5 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition"
          >
            Replace a Card
          </button>
          <button
            onClick={() => { Sound.sfx.click(); onSendToCollection(); }}
            className="w-full px-4 py-2.5 rounded-lg border border-emerald-400/40 bg-emerald-900/20 text-emerald-100 font-bold text-sm hover:bg-emerald-800/30 transition"
          >
            Send to Collection
          </button>
          <button
            onClick={() => { Sound.sfx.click(); onSkip(); }}
            className="w-full px-4 py-2 rounded-lg border border-amber-400/20 bg-slate-800/40 text-amber-100/60 text-sm hover:bg-slate-800/60 transition"
          >
            Skip Reward
          </button>
        </div>
      </div>
    </div>
  );
}
