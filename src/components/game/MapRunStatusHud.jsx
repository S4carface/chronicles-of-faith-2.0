import React from "react";
import { Coins, Layers } from "lucide-react";
import { getHpPercent, getHpBand, getHpBandColor, HP_BAND_LABELS } from "@/game/hpStatus";

// Persistent, compact Run Status HUD for the Genesis map. Reads HP straight from
// the run context (no local caching), so it always reflects the canonical value.
// Rendered in normal flow above the scrollable map, so it stays visible without a
// fixed overlay and never covers or blocks map nodes.
export default function MapRunStatusHud({ hero, playerHp, maxHp, difficulty, gold, deckCount }) {
  const hp = Math.max(0, Number(playerHp) || 0);
  const max = Number(maxHp) || 0;
  const pct = getHpPercent(hp, max);
  const band = getHpBand(hp, max);
  const barColor = getHpBandColor(hp, max);
  const heroName = hero?.name || "Hero";
  const heroIcon = hero?.icon || "🧍";
  const difficultyLabel = difficulty
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    : "Normal";

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-amber-500/10 bg-[#0F1A30]/80 px-4 py-2 lg:px-8"
      role="group"
      aria-label={`Run status: ${heroName}, ${hp} of ${max} HP (${HP_BAND_LABELS[band]}), ${difficultyLabel} difficulty, ${gold || 0} gold`}
    >
      {/* Hero */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/40 bg-slate-900/60 text-base lg:h-8 lg:w-8 lg:text-lg"
          aria-hidden="true"
        >
          {heroIcon}
        </span>
        <span className="font-serif text-sm text-amber-200 lg:text-base">{heroName}</span>
      </div>

      {/* HP bar + numbers */}
      <div className="flex min-w-[8.5rem] flex-1 items-center gap-2">
        <div
          className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-slate-700/50 bg-slate-950/70"
          role="img"
          aria-label={`Health: ${hp} of ${max}, ${HP_BAND_LABELS[band]}`}
        >
          <div
            className="h-full rounded-full motion-safe:transition-all motion-safe:duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <span className="flex-shrink-0 text-xs font-bold text-amber-100 lg:text-sm tabular-nums">
          {hp}<span className="text-amber-100/50"> / {max}</span>
          <span className="ml-1 text-amber-100/40">HP</span>
        </span>
      </div>

      {/* Difficulty */}
      <span
        className="flex-shrink-0 rounded-full border border-amber-500/25 bg-amber-900/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80 lg:text-xs"
        aria-label={`Difficulty: ${difficultyLabel}`}
      >
        {difficultyLabel}
      </span>

      {/* Gold */}
      <span
        className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-amber-200/90 lg:text-sm"
        aria-label={`${gold || 0} gold`}
      >
        <Coins className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
        {gold || 0}
      </span>

      {/* Deck count — only shown when there's room (hidden on the narrowest phones) */}
      {typeof deckCount === "number" && (
        <span
          className="hidden flex-shrink-0 items-center gap-1 text-xs text-amber-100/60 sm:flex lg:text-sm"
          aria-label={`${deckCount} cards in deck`}
        >
          <Layers className="h-3.5 w-3.5 text-amber-300/70" aria-hidden="true" />
          {deckCount}
        </span>
      )}
    </div>
  );
}
