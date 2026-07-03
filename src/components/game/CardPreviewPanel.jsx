import React from "react";
import { getCardEffectText } from "@/components/game/Card";

const TYPE_LABELS = {
  attack: { text: "Attack", color: "text-red-300" },
  defense: { text: "Defense", color: "text-blue-300" },
  scripture: { text: "Scripture", color: "text-emerald-300" },
  miracle: { text: "Miracle", color: "text-yellow-200" },
};

export default function CardPreviewPanel({ card, playable, blocked, onPlay, onCancel }) {
  if (!card) return null;
  const typeInfo = TYPE_LABELS[card.type] || TYPE_LABELS.attack;
  const effectText = getCardEffectText(card);
  const canPlay = playable && !blocked;

  return (
    <div className="flex-shrink-0 px-3 py-2 border-t border-amber-500/30" style={{ background: "rgba(15,10,5,0.9)" }}>
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0 mt-0.5">{card.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-serif text-amber-100 text-sm">{card.name}</h4>
            <span className="text-amber-300 text-xs flex-shrink-0">{card.cost} ✨</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${typeInfo.color} flex-shrink-0`}>{typeInfo.text}</span>
          </div>
          <p className="text-amber-100/85 text-[11px] leading-tight mt-0.5">{effectText}</p>
          <p className="text-amber-300/60 text-[9px] italic mt-0.5">{card.verse}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="flex-1 px-3 py-1.5 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-xs hover:bg-amber-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▶ Play Card
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-1.5 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/70 text-xs hover:bg-slate-700/40 transition"
        >
          Cancel
        </button>
      </div>
      {blocked && <p className="text-red-300 text-[9px] mt-1 text-center">⚠ Scripture cards are blocked this turn</p>}
    </div>
  );
}