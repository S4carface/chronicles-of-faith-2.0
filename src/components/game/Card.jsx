import React from "react";
import { cn } from "@/utils";

const RARITY_STYLES = {
  common: {
    border: "border-sky-400/60",
    glow: "shadow-md shadow-sky-500/10",
    bg: "from-sky-800/50 to-slate-800",
    label: "text-sky-200",
    badge: "bg-sky-600/40",
  },
  rare: {
    border: "border-emerald-400/70",
    glow: "shadow-lg shadow-emerald-500/25",
    bg: "from-emerald-800/40 to-slate-800",
    label: "text-emerald-200",
    badge: "bg-emerald-600/40",
  },
  legendary: {
    border: "border-amber-300/80",
    glow: "shadow-xl shadow-amber-400/40",
    bg: "from-amber-700/30 via-yellow-700/20 to-slate-800",
    label: "text-amber-100",
    badge: "bg-amber-500/30",
  },
};

const TYPE_LABELS = {
  attack: { text: "Attack", color: "text-red-300" },
  defense: { text: "Defense", color: "text-blue-300" },
  scripture: { text: "Scripture", color: "text-emerald-300" },
  miracle: { text: "Miracle", color: "text-yellow-200" },
};

// Build a clear effect summary from card data
export function getCardEffectText(card) {
  if (!card) return "";
  switch (card.type) {
    case "attack":
      return `⚔️ Deals ${card.value} damage`;
    case "defense":
      if (card.id === "lions_den") return `🛡️ Gain ${card.value} Block. Counter: enemy takes 4 damage when attacking.`;
      return `🛡️ Gain ${card.value} Block`;
    case "miracle":
      if (card.id === "angel_lord") return `✨ Deals ${card.value} damage. Heal 10 HP.`;
      return `✨ Deals ${card.value} holy damage`;
    case "scripture":
      switch (card.id) {
        case "prayer": return "💚 Heal 4 HP";
        case "bread_life": return "💚 Heal 5 HP";
        case "living_water": return "💚 Heal 6 HP";
        case "burning_bush": return "💚 Heal 5 HP. Deal 5 damage.";
        case "song_praise": return "✨ Gain 2 Faith energy";
        case "wisdom": return "🃏 Draw 2 cards";
        case "doves_peace": return "💚 Heal 3 HP. Draw 1 card.";
        case "manna_heaven": return "💚 Heal 10 HP. Draw 2 cards.";
        case "coat_colors": return "✨ Gain 3 Faith energy";
        case "jacobs_ladder": return "🃏 Draw 3 cards";
        case "righteous_aim": return "⚔️ Next attack deals DOUBLE damage";
        default: return card.description || "";
      }
    default:
      return card.description || "";
  }
}

export default function Card({ card, onClick, playable, selected, small, inHand }) {
  if (!card) return null;
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common;
  const typeInfo = TYPE_LABELS[card.type] || TYPE_LABELS.attack;
  const effectText = getCardEffectText(card);

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
      <div className={cn("flex items-center justify-center mt-7 mb-1 animate-icon-float", small ? "text-2xl" : "text-4xl")}>
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

      {/* Effect text */}
      {!small && (
        <div className="px-2 mt-1 text-[9px] text-slate-200 text-center leading-tight h-10 overflow-hidden">
          {effectText}
        </div>
      )}

      {/* Verse */}
      <div className={cn("text-center text-[7px] mt-auto py-1 border-t border-white/10 italic", style.label)}>
        {card.verse}
      </div>
    </div>
  );
}