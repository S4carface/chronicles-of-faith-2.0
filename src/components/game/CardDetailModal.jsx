import React from "react";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";

const RARITY_INFO = {
  common: {
    label: "Common",
    color: "text-sky-200",
    border: "border-sky-400/60",
    borderColor: "rgba(56,189,248,0.4)",
  },
  uncommon: {
    label: "Uncommon",
    color: "text-purple-200",
    border: "border-purple-400/70",
    borderColor: "rgba(192,132,252,0.45)",
  },
  rare: {
    label: "Rare",
    color: "text-emerald-200",
    border: "border-emerald-400/70",
    borderColor: "rgba(52,211,153,0.4)",
  },
  legendary: {
    label: "Legendary",
    color: "text-amber-100",
    border: "border-amber-300/80",
    borderColor: "rgba(252,211,77,0.5)",
  },
};

export default function CardDetailModal({
  card,
  onClose,
  onSelect,
  selectLabel,
}) {
  if (!card) return null;

  const rarity = RARITY_INFO[card.rarity] || RARITY_INFO.common;
  const effectText = getCardEffectText(card);
  const artUrl = CARD_ART[card.id] || PLACEHOLDER_ART;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(8,12,24,0.95)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-2xl border-2 p-4"
        style={{
          background:
            "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
          borderColor: rarity.borderColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className={`text-xs uppercase tracking-widest font-bold ${rarity.color}`}
          >
            {rarity.label}
          </div>

          <button
            onClick={onClose}
            className="text-amber-100/40 hover:text-amber-200 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div
            className={`relative w-56 aspect-[3/4] rounded-xl border-2 ${rarity.border} overflow-hidden bg-slate-950`}
          >
            <img
              src={artUrl}
              alt={card.name}
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-slate-950/95" />

            <div className="absolute top-3 right-3 rounded-full border border-amber-400/50 bg-slate-950/85 px-3 py-1 text-sm font-bold text-amber-200">
              {card.cost} ✨
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
              <h2 className="font-serif text-2xl text-amber-100 leading-tight">
                {card.name}
              </h2>

              <p className={`mt-1 text-xs uppercase font-bold ${rarity.color}`}>
                {rarity.label}
              </p>

              {card.verse && (
                <p className="mt-2 text-[11px] italic text-amber-300/60">
                  {card.verse}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-slate-900/50 p-3 mb-3">
          <p className="text-xs text-amber-100/50 uppercase tracking-wide mb-1">
            Effect
          </p>

          <p className="text-base text-amber-100">
            {effectText}
          </p>
        </div>

        {card.scriptureText && (
          <div className="rounded-lg border border-amber-500/10 bg-slate-900/30 p-3 mb-4">
            <p className="text-xs text-amber-100/50 uppercase tracking-wide mb-1">
              Scripture
            </p>

            <p className="text-sm leading-6 text-amber-100/75 italic">
              “{card.scriptureText}”
            </p>
          </div>
        )}

        {onSelect ? (
          <button
            onClick={onSelect}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            {selectLabel || "Choose This Card"}
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
