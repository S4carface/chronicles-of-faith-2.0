import React from "react";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART } from "@/data/art";
import { getCardPlayabilityReason } from "@/game/statusExplanations";
import { cn } from "@/utils";
import { Sparkles, X, Swords, Shield, BookOpen, Wand2 } from "lucide-react";
import TutorialGuidingLight from "@/components/game/TutorialGuidingLight";

const TYPE_INFO = {
  attack: { text: "Attack", color: "text-red-300", icon: Swords, border: "border-red-400/30" },
  defense: { text: "Defense", color: "text-blue-300", icon: Shield, border: "border-blue-400/30" },
  scripture: { text: "Scripture", color: "text-emerald-300", icon: BookOpen, border: "border-emerald-400/30" },
  miracle: { text: "Miracle", color: "text-yellow-200", icon: Wand2, border: "border-yellow-400/30" },
};

const RARITY_BORDER = {
  common: "border-sky-400/60",
  uncommon: "border-purple-400/70",
  rare: "border-emerald-400/70",
  legendary: "border-amber-300/80",
};

export default function CardPreviewPanel({   card,   playable,   blocked,   battleState,   onPlay,   onCancel,   showTutorialPlayGuide = false, }) {
  if (!card) return null;
  const typeInfo = TYPE_INFO[card.type] || TYPE_INFO.attack;
  const effectText = getCardEffectText(card);
  const artUrl = CARD_ART[card.id];
  const rarityBorder = RARITY_BORDER[card.rarity] || RARITY_BORDER.common;
  const TypeIcon = typeInfo.icon;

  // Derive the exact reason this card can't be played (silence vs. faith)
  // Shows for ANY unplayable card — blocked Scripture OR not enough Faith
  const canPlay = playable && !blocked;
  const blockReason = canPlay ? null : getCardPlayabilityReason(card, battleState);

return (
  <>
    {/* Block taps from reaching the battle screen behind this preview */}
    <div
      className="fixed inset-0 z-[39]"
      onClick={onCancel}
      aria-hidden="true"
    />

    {/* Mobile: bottom sheet */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 animate-fade-in" style={{ background: "rgba(8,12,24,0.98)", borderTop: "2px solid rgba(201,168,76,0.3)" }}>
        <div className="px-3 pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          
{card.verse && card.scriptureText && (
  <div className="mb-2 rounded-md border border-amber-500/20 bg-slate-900/45 px-3 py-2">
    <div className="mb-1 flex items-center justify-center gap-1.5">
      <BookOpen className="h-3 w-3 text-amber-300/70" />

      <p className="text-[9px] uppercase tracking-[0.16em] text-amber-300/70">
        {card.verse}
      </p>
    </div>

    <p className="line-clamp-3 text-center font-serif text-[11px] italic leading-4 text-amber-100/80">
      “{card.scriptureText}”
    </p>
  </div>
)}

          <div className="flex gap-2.5">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/60 font-medium text-sm active:scale-95">Cancel</button>
            <div className="relative flex-[2]">
  {showTutorialPlayGuide && canPlay && (
    <TutorialGuidingLight
  direction="down"
  size="normal"
  className="-top-14 left-1/2 -translate-x-1/2"
/>
  )}

  <button
    onClick={onPlay}
    disabled={!canPlay}
    className={`w-full rounded-lg border-2 py-3 text-base font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
      showTutorialPlayGuide
        ? "border-amber-300 bg-gradient-to-r from-emerald-600/50 to-emerald-500/40 text-emerald-50 ring-4 ring-amber-300/70 shadow-xl shadow-amber-400/40"
        : "border-emerald-400/70 bg-gradient-to-r from-emerald-600/40 to-emerald-500/30 text-emerald-50 shadow-lg shadow-emerald-500/20 hover:from-emerald-600/50 hover:to-emerald-500/40"
    }`}
  >
    Play Card
  </button>
</div>          </div>
          {blockReason && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-md border border-red-500/30 bg-red-900/20 text-center">
              <p className="text-red-300 text-[10px] font-bold uppercase tracking-wide">🔒 {blockReason.label}</p>
              <p className="text-red-200/70 text-[9px] mt-0.5 leading-snug">{blockReason.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: right-side inspector panel */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 w-96 animate-fade-in">
        <div className="w-full rounded-xl border-2 border-amber-500/30 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.95) 0%, rgba(15,26,48,0.95) 100%)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/15">
            <span className="text-amber-300/60 text-[10px] uppercase tracking-wide font-bold">Selected Card</span>
            <button onClick={onCancel} className="w-7 h-7 rounded-full border border-amber-500/20 bg-slate-800/40 flex items-center justify-center text-amber-100/60 hover:text-amber-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={cn("flex-shrink-0 rounded-md border-2 overflow-hidden", rarityBorder)}>
              <div className="relative w-16 h-16 overflow-hidden" style={{ background: "linear-gradient(160deg, #1a2744, #0f1a30)" }}>
                <span className="absolute top-0 left-0 w-5 h-5 rounded-full bg-amber-500/30 border border-amber-300/60 flex items-center justify-center text-white text-[10px] font-bold z-10">{card.cost}</span>
                {artUrl ? <img src={artUrl} alt={card.name} className="art-portrait" /> : <span className="text-2xl flex items-center justify-center w-full h-full">{card.icon}</span>}
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="font-serif text-amber-100 text-lg leading-tight">{card.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs font-semibold uppercase flex items-center gap-0.5", typeInfo.color)}>
                  <TypeIcon className="w-3.5 h-3.5" />{typeInfo.text}
                </span>
                <span className="text-amber-300/40 text-xs">·</span>
                <span className="flex items-center gap-0.5 text-amber-300/60 text-xs"><Sparkles className="w-3 h-3" />{card.cost} Faith</span>
              </div>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="rounded-lg border border-amber-500/15 bg-slate-900/40 px-3 py-2 mb-2">
              <p className="text-amber-100/40 text-[10px] uppercase tracking-wide mb-1">Effect</p>
              <p className="text-amber-100 text-sm leading-snug">{effectText}</p>
            </div>
          </div>
             <div className="px-4 pb-4 flex gap-3">
             <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/60 font-medium text-sm">Cancel</button>
             <button onClick={onPlay} disabled={!canPlay} className="flex-[2] py-3.5 rounded-lg border-2 border-emerald-400/70 bg-gradient-to-r from-emerald-600/40 to-emerald-500/30 text-emerald-50 font-bold text-base hover:from-emerald-600/50 hover:to-emerald-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">Play Card</button>
            </div>
          {blockReason && (
            <div className="px-4 pb-4">
              <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-900/20 text-center">
                <p className="text-red-300 text-xs font-bold uppercase tracking-wide">🔒 {blockReason.label}</p>
                <p className="text-red-200/70 text-[11px] mt-0.5 leading-snug">{blockReason.text}</p>
              </div>
            </div>
          )}
          </div>
      </div>
    </>
  );
}