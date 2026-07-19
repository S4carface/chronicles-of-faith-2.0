import React, { useRef } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/utils";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import SafeImage from "@/components/ui/SafeImage";

const RARITY_STYLES = {
  common: {
    border: "border-sky-400/60",
    glow: "shadow-md shadow-sky-500/10",
    bg: "from-sky-800/50 to-slate-800",
    label: "text-sky-200",
    badge: "bg-sky-600/40",
  },
    uncommon: {
    border: "border-purple-400/70",
    glow: "shadow-lg shadow-purple-500/20",
    bg: "from-purple-800/40 to-slate-800",
    label: "text-purple-200",
    badge: "bg-purple-600/40",
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
      if (card.id === "lions_den") return `🛡️ Gain ${card.value} Block. Gain 4 Counter (stacks, cap 12).`;
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

export default function Card({ card, onClick, onLongPress, playable, selected, small, inHand, blocked }) {
  const artUrl = CARD_ART[card.id];
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  if (!card) return null;
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common;

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (onLongPress) onLongPress();
    }, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  const handleClick = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    if (onClick) onClick();
  };
  const typeInfo = TYPE_LABELS[card.type] || TYPE_LABELS.attack;
  const effectText = getCardEffectText(card);

  return (
    <div
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      className={cn(
        "relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-300 select-none",
        style.border,
        style.glow,
        style.bg,
        "bg-gradient-to-b",
        playable && "hover:-translate-y-2 hover:scale-[1.03] active:scale-95",
        selected && playable && "-translate-y-3 ring-4 ring-amber-300 scale-[1.05] shadow-2xl shadow-amber-400/60 z-20 brightness-110",
        selected && !playable && "-translate-y-2 ring-4 ring-amber-400/40 scale-[1.03] z-10",
        !playable && onClick && "opacity-60",
inHand
  ? "mx-auto h-40 w-full max-w-[8rem] min-w-0"
  : small
    ? "w-28 h-44 landscape:w-24 landscape:h-36"
    : "w-44 h-64 landscape:w-36 landscape:h-52",
inHand && "flex-shrink-0"
      )}
    >
      {/* Cost badge */}
      <div className={cn("absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm z-10", small ? "w-7 h-7 text-sm" : "w-8 h-8 text-base", style.badge, "border", style.border)}>
        <span className="text-white">{card.cost}</span>
      </div>

      {/* Rarity badge */}
      <div className={cn("absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide z-10", small ? "text-[8px]" : "text-[9px]", style.badge)}>
        {card.rarity}
      </div>

      {/* Card artwork */}
      <div
  className={cn(
    "mt-0 mb-1 overflow-hidden relative",
inHand
  ? "h-28"
  : small
    ? "h-28 landscape:h-20"
    : "h-36 landscape:h-28"
  )}
  style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
>
  <SafeImage
    src={artUrl || PLACEHOLDER_ART}
    alt={card.name}
    className="absolute inset-0 w-full h-full object-cover"
  />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-slate-950/70" />
        {blocked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(15,26,48,0.55)" }}>
            <Lock className={cn("text-red-300/80", small ? "w-4 h-4" : "w-6 h-6")} />
          </div>
        )}
      </div>

      {/* Card name */}
      <div className={cn("text-center font-bold px-1 leading-tight font-serif", small ? "text-[9px]" : "text-sm", style.label)}>
        {card.name}
      </div>

      {/* Type */}
      <div className={cn("text-center mt-0.5 font-semibold", small ? "text-[8px]" : "text-[10px]", typeInfo.color)}>
        {typeInfo.text}
      </div>

      {/* Effect text */}
      {!small && (
        <div className="px-2 mt-1 text-[11px] text-slate-200 text-center leading-tight h-12 overflow-hidden">
          {effectText}
        </div>
      )}

      {/* Verse */}
      <div className={cn("text-center text-[8px] mt-auto py-1 border-t border-white/10 italic", small ? "text-[7px]" : "text-[9px]", style.label)}>
        {card.verse}
      </div>
    </div>
  );
}
