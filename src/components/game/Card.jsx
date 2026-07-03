import React from "react";
import { cn } from "@/utils";

const RARITY_STYLES = {
  common: {
    border: "border-sky-400/60",
    glow: "shadow-md shadow-sky-500/10",
    bg: "from-sky-800/50 to-slate-800",
    label: "text-sky-200",
    badge: "bg-sky-600/40",
    accent: "sky",
  },
  rare: {
    border: "border-emerald-400/70",
    glow: "shadow-lg shadow-emerald-500/25",
    bg: "from-emerald-800/40 to-slate-800",
    label: "text-emerald-200",
    badge: "bg-emerald-600/40",
    accent: "emerald",
  },
  legendary: {
    border: "border-amber-300/80",
    glow: "shadow-xl shadow-amber-400/40",
    bg: "from-amber-700/30 via-yellow-700/20 to-slate-800",
    label: "text-amber-100",
    badge: "bg-amber-500/30",
    accent: "amber",
  },
};

const TYPE_LABELS = {
  attack: { text: "Attack", color: "text-red-300" },
  defense: { text: "Defense", color: "text-blue-300" },
  scripture: { text: "Scripture", color: "text-emerald-300" },
  miracle: { text: "Miracle", color: "text-yellow-200" },
};

export default function Card({ card, onClick, playable, selected, small, inHand }) {
  if (!card) return null;
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common;
  const typeInfo = TYPE_LABELS[card.type] || TYPE_LABELS.attack;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-300 select-none",
        style.border,
        style.glow,
        style.bg,
        "bg-gradient-to-b",
        playable && "hover:scale-105 hover:-translate-y-2 active:scale-95",
        selected && "ring-2 ring-yellow-300 -translate-y-3",
        !playable && onClick && "opacity-60",
        small ? "w-24 h-36" : "w-36 h-52",
        inHand && "flex-shrink-0"
      )}
    >
      {/* Cost badge */}
      <div className={cn("absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm z-10", style.badge, "border", style.border)}>
        <span className="text-white">{card.cost}</span>
      </div>

      {/* Rarity badge */}
      <div className={cn("absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wide z-10", style.badge)}>
        {card.rarity}
      </div>

      {/* Card icon */}
      <div className={cn("flex items-center justify-center mt-7 mb-1", small ? "text-2xl" : "text-4xl")}>
        {card.icon}
      </div>

      {/* Card name */}
      <div className={cn("text-center font-bold px-1 leading-tight font-serif", small ? "text-[8px]" : "text-xs", style.label)}>
        {card.name}
      </div>

      {/* Type */}
      <div className={cn("text-center text-[8px] mt-0.5 font-semibold", typeInfo.color)}>
        {typeInfo.text}
      </div>

      {/* Effect */}
      {!small && (
        <div className="px-2 mt-1 text-[9px] text-slate-300 text-center leading-tight h-10 overflow-hidden">
          {card.description}
        </div>
      )}

      {/* Verse */}
      <div className={cn("text-center text-[7px] mt-auto py-1 border-t border-white/10 italic", style.label)}>
        {card.verse}
      </div>
    </div>
  );
}