import React from "react";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART } from "@/data/art";
import { cn } from "@/utils";

const TYPE_LABELS = {
  attack: { text: "Attack", color: "text-red-300" },
  defense: { text: "Defense", color: "text-blue-300" },
  scripture: { text: "Scripture", color: "text-emerald-300" },
  miracle: { text: "Miracle", color: "text-yellow-200" },
};

const RARITY_BORDER = {
  common: "border-sky-400/60",
  rare: "border-emerald-400/70",
  legendary: "border-amber-300/80",
};

export default function CardPreviewPanel({ card, playable, blocked, onPlay, onCancel }) {
  if (!card) return null;
  const typeInfo = TYPE_LABELS[card.type] || TYPE_LABELS.attack;
  const effectText = getCardEffectText(card);
  const canPlay = playable && !blocked;
  const artUrl = CARD_ART[card.id];
  const rarityBorder = RARITY_BORDER[card.rarity] || RARITY_BORDER.common;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom))] animate-fade-in" style={{ background: "rgba(8,12,24,0.97)" }}>
      {/* Dimmer over hand area only — does not cover player stats / End Turn */}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(0deg, rgba(8,12,24,0.97) 70%, rgba(8,12,24,0) 100%)" }} />
      <div className="max-w-md mx-auto px-3 pt-2.5">
        <div className="flex items-start gap-3 rounded-xl border-2 border-amber-500/30 p-3" style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.9), rgba(15,26,48,0.9))" }}>
          {/* Large card artwork */}
          <div className={cn("flex-shrink-0 rounded-lg border-2 overflow-hidden", rarityBorder)}>
            <div className="relative w-24 h-24 flex items-center justify-center" style={{ background: "linear-gradient(160deg, #1a2744, #0f1a30)" }}>
              <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-amber-500/30 border border-amber-300/60 flex items-center justify-center text-white text-[11px] font-bold z-10">{card.cost}</span>
              {artUrl ? (
                <img src={artUrl} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{card.icon}</span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-serif text-amber-100 text-sm leading-tight">{card.name}</h4>
              <span className="text-amber-300 text-xs flex-shrink-0">{card.cost} ✨</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide", typeInfo.color)}>{typeInfo.text}</span>
              <span className="text-amber-300/40 text-[9px]">•</span>
              <span className="text-amber-100/40 text-[9px] uppercase">{card.rarity}</span>
            </div>
            <p className="text-amber-100/90 text-[11px] leading-snug mt-1">{effectText}</p>
            <p className="text-amber-300/60 text-[9px] italic mt-0.5">{card.verse}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onPlay}
            disabled={!canPlay}
            className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ▶ Play Card
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-700/40 transition"
          >
            Cancel
          </button>
        </div>
        {blocked && <p className="text-red-300 text-[9px] mt-1 text-center">⚠ Scripture cards are blocked this turn</p>}
      </div>
    </div>
  );
}