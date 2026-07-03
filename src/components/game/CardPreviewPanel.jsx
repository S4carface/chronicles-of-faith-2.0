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
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:max-w-sm lg:rounded-xl lg:border-2 lg:border-amber-500/30 animate-fade-in" style={{ background: "rgba(8,12,24,0.97)", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
      <div className="max-w-md lg:max-w-none mx-auto px-3 py-2 lg:px-4 lg:py-3">
        <div className="flex items-center gap-2.5 lg:gap-3">
          {/* Compact card thumbnail */}
          <div className={cn("flex-shrink-0 rounded-md border-2 overflow-hidden", rarityBorder)}>
            <div className="relative w-11 h-11 lg:w-14 lg:h-14" style={{ background: "linear-gradient(160deg, #1a2744, #0f1a30)" }}>
              <span className="absolute top-0 left-0 w-4 h-4 rounded-full bg-amber-500/30 border border-amber-300/60 flex items-center justify-center text-white text-[8px] font-bold z-10">{card.cost}</span>
              {artUrl ? (
                <img src={artUrl} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl flex items-center justify-center w-full h-full">{card.icon}</span>
              )}
            </div>
          </div>

          {/* Compact info — single-line effect */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif text-amber-100 text-xs lg:text-sm leading-tight truncate">{card.name}</h4>
              <span className={cn("text-[9px] lg:text-[10px] font-semibold uppercase flex-shrink-0", typeInfo.color)}>{typeInfo.text}</span>
            </div>
            <p className="text-amber-100/70 text-[10px] lg:text-[11px] leading-tight truncate">{effectText}</p>
            <p className="text-amber-300/40 text-[8px] lg:text-[9px] italic truncate">{card.verse}</p>
          </div>

          {/* Inline actions */}
          <button
            onClick={onPlay}
            disabled={!canPlay}
            className="flex-shrink-0 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-xs lg:text-sm hover:bg-amber-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Play
          </button>
          <button
            onClick={onCancel}
            className="flex-shrink-0 px-3 py-1.5 lg:px-3 lg:py-2 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/70 text-xs lg:text-sm hover:bg-slate-700/40 transition"
          >
            Cancel
          </button>
        </div>
        {blocked && <p className="text-red-300 text-[9px] mt-0.5 text-center">Scripture cards are blocked this turn</p>}
      </div>
    </div>
  );
}