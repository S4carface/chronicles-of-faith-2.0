import React from "react";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";

const RARITY_INFO = {
  common: { label: "Common", color: "text-sky-200", dropRate: "Common", border: "border-sky-400/60" },
  rare: { label: "Rare", color: "text-emerald-200", dropRate: "Uncommon", border: "border-emerald-400/70" },
  legendary: { label: "Legendary", color: "text-amber-100", dropRate: "Very Rare", border: "border-amber-300/80" },
};

export default function CardDetailModal({ card, owned, onClose, onSelect, selectLabel, justCollected }) {
  if (!card) return null;
  const rarity = RARITY_INFO[card.rarity] || RARITY_INFO.common;
  const effectText = getCardEffectText(card);
  const artUrl = CARD_ART[card.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }} onClick={onClose}>
      <div
        className="max-w-md w-full rounded-2xl border-2 p-6"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)", borderColor: rarity.border.replace("border-", "").includes("sky") ? "rgba(56,189,248,0.4)" : rarity.border.includes("emerald") ? "rgba(52,211,153,0.4)" : "rgba(252,211,77,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`text-xs uppercase tracking-widest font-bold ${rarity.color}`}>
            {rarity.label}
          </div>
          <button onClick={onClose} className="text-amber-100/40 hover:text-amber-200 text-xl">✕</button>
        </div>

        {/* Card visual */}
        <div className="flex justify-center mb-4">
          <div className={`w-32 h-48 rounded-lg border-2 ${rarity.border} bg-gradient-to-b from-slate-800 to-slate-900 p-3 flex flex-col items-center justify-between`}>
            <div className="text-xs text-amber-300/60 w-full text-right">{card.cost} ✨</div>
            <div className="w-20 h-20 rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
              <img src={artUrl || PLACEHOLDER_ART} alt={card.name} className="art-portrait" />
            </div>
            <div className="text-xs font-serif text-amber-100 text-center">{card.name}</div>
            <div className="text-[8px] text-amber-300/40 italic text-center">{card.verse}</div>
          </div>
        </div>

        {/* Name & type */}
        <h2 className="text-xl font-serif text-amber-200 text-center mb-1">{card.name}</h2>
        <p className="text-center text-amber-100/40 text-xs uppercase tracking-wide mb-4">
          {card.type} — Cost: {card.cost} ✨
        </p>

        {/* Effect */}
        <div className="rounded-lg border border-amber-500/20 bg-slate-900/50 p-3 mb-4">
          <p className="text-xs text-amber-100/50 uppercase tracking-wide mb-1">Effect</p>
          <p className="text-sm text-amber-100">{effectText}</p>
        </div>

        {/* Description */}
        <div className="rounded-lg border border-amber-500/10 bg-slate-900/30 p-3 mb-4">
          <p className="text-xs text-amber-100/50 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-amber-100/70 italic">{card.description}</p>
        </div>

        {/* Drop rate info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-slate-600/20 bg-slate-800/40 p-2 text-center">
            <p className="text-xs text-amber-100/40">Drop Rate</p>
            <p className={`text-lg font-bold ${rarity.color}`}>{rarity.dropRate}</p>
          </div>
          <div className="rounded-lg border border-slate-600/20 bg-slate-800/40 p-2 text-center">
            <p className="text-xs text-amber-100/40">Status</p>
            <p className="text-sm font-bold text-amber-100">{justCollected ? "Added to Collection" : owned ? "Already Owned" : "New Card"}</p>
          </div>
        </div>

        {/* Actions */}
        {onSelect ? (
          <button
            onClick={onSelect}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            {selectLabel || "Select This Card"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/40 bg-amber-900/20 text-amber-200 font-bold hover:bg-amber-800/30 transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}