import React from "react";
import { Link } from "react-router-dom";
import { Sun, ChevronRight, Flame } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { HOME_PRAYER_ART } from "@/lib/preloadHomeAssets";
import * as Sound from "@/game/soundManager";

const SMALL_CAPS = { fontVariant: "small-caps" };

const PRAYER_FALLBACK = (
  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
    <Sun className="h-1/2 w-1/2 text-amber-200/80" strokeWidth={1.75} />
  </div>
);

// Ornate double-border frame — a thin outer ring plus an inset gold hairline
// echo the approved mockup's engraved card frame without needing custom
// corner-flourish artwork.
const FRAME_SHADOW = "inset 0 0 0 1px rgba(251,191,36,0.14), inset 0 1px 0 rgba(251,191,36,0.16)";

// "Take a Quiet Moment" / Daily Prayer — a standing daily feature shown on
// both Home layouts, not part of the post-tutorial menu specifically.
// compact=false (pre-tutorial): a large, self-contained ornate card with a
// dedicated "Play Now" action. compact=true (post-tutorial): a full-width
// dashboard row meant to sit inside ReturningHome's own stack of secondary
// actions, mirroring the mockup's "Daily Prayer Completed" strip.
export default function HomePrayerCard({ compact = false, devotionPrayedToday, devotionStreak }) {
  if (compact) {
    return devotionPrayedToday ? (
      <Link
        to="/daily-prayer"
        onClick={() => Sound.sfx.click()}
        className="relative flex min-h-[52px] w-full items-center gap-2.5 rounded-xl border border-emerald-400/40 px-3.5 py-2 transition hover:border-emerald-300/55"
        style={{
          background: "linear-gradient(135deg, rgba(6,50,40,0.55) 0%, rgba(8,12,24,0.9) 100%)",
          boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.12)",
        }}
      >
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-emerald-400/50">
          <SafeImage src={HOME_PRAYER_ART} alt="" fallback={null} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-emerald-950/45" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center text-emerald-300 text-sm leading-none">✓</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xs font-bold text-emerald-200" style={SMALL_CAPS}>
            Daily Prayer Completed
          </p>
          <p className="truncate text-[10px] italic text-emerald-100/60">
            Keep your faith strong. Your journey is blessed.
          </p>
        </div>
        {devotionStreak > 0 && (
          // Hidden in ReturningHome's short-viewport 2-column fallback (see
          // that file) — the title needs the row's full width to truncate
          // legibly there instead of being crowded into a couple of letters.
          <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-amber-300/80 [@media(max-height:700px)]:hidden">
            {devotionStreak}-day
            <Flame className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </Link>
    ) : (
      <Link
        to="/daily-prayer"
        onClick={() => Sound.sfx.click()}
        className="flex min-h-[52px] w-full items-center gap-2.5 rounded-xl border border-amber-400/30 px-3.5 py-2 transition hover:border-amber-300/45"
        style={{
          background: "linear-gradient(135deg, rgba(14,20,38,0.92) 0%, rgba(6,10,20,0.96) 100%)",
          boxShadow: FRAME_SHADOW,
        }}
      >
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-amber-400/45">
          <SafeImage src={HOME_PRAYER_ART} alt="" fallback={PRAYER_FALLBACK} className="h-full w-full object-cover object-center" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xs font-bold text-amber-100" style={SMALL_CAPS}>Daily Prayer</p>
          <p className="truncate text-[10px] text-amber-100/55">A short scripture &amp; reflection for today.</p>
        </div>
        {/* Full action pill when this row has its own full width; a plain
            gold arrow when ReturningHome's short-viewport fallback packs it
            into a narrow half-width grid column instead (see that file) —
            keyed off the same max-height breakpoint that fallback uses, so
            it never forces the row wider or overlaps the title. */}
        <span className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-semibold text-amber-300 [@media(max-height:700px)]:hidden">
          Pray Now
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </span>
        <ChevronRight className="hidden h-4 w-4 flex-shrink-0 text-amber-300/70 [@media(max-height:700px)]:block" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 flex justify-center mb-2.5 [@media(max-height:760px)]:mb-1">
      {devotionPrayedToday ? (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative flex w-full max-w-md items-center gap-3 rounded-2xl border border-emerald-400/40 px-4 py-3 transition hover:border-emerald-300/55 lg:max-w-[600px]"
          style={{
            background: "linear-gradient(135deg, rgba(6,50,40,0.55) 0%, rgba(8,12,24,0.9) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.12)",
          }}
        >
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-emerald-400/50">
            <SafeImage src={HOME_PRAYER_ART} alt="" fallback={null} className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-emerald-950/45" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center text-emerald-300 text-lg leading-none">✓</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base font-bold text-emerald-200" style={SMALL_CAPS}>
              Daily Prayer Completed
            </p>
            <p className="text-xs italic text-emerald-100/65">
              Keep your faith strong. Your journey is blessed.
            </p>
          </div>
          {devotionStreak > 0 && (
            <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-amber-300/80">
              {devotionStreak}-day
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
        </Link>
      ) : (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative flex w-full max-w-md flex-col rounded-2xl border border-amber-400/35 px-4 pb-3 pt-4 transition-all duration-300 hover:border-amber-300/55 active:scale-[0.99] motion-reduce:transition-none lg:max-w-[600px] [@media(max-height:760px)]:pb-2 [@media(max-height:760px)]:pt-2.5"
          style={{
            background: "linear-gradient(135deg, rgba(14,20,38,0.92) 0%, rgba(6,10,20,0.96) 100%)",
            boxShadow: `${FRAME_SHADOW}, 0 6px 18px rgba(0,0,0,0.35)`,
          }}
        >
          {/* Badge pinned to its own top-right corner, with the title row
              reserving space via pr-16 below — it never competes with the
              title for width, so the title can never clip. */}
          <span className="absolute top-3 right-3 whitespace-nowrap rounded-full border border-amber-300/35 bg-amber-950/70 px-2 py-1 text-[9px] font-bold text-amber-200" style={SMALL_CAPS}>
            New Today
          </span>

          <div className="flex items-center gap-3 pr-16">
            {/* Lantern medallion on the card's left side — the home-prayer
                artwork inside a gold-ringed circle with a soft glow behind
                it, falling back to the Sun icon if the image never loads. */}
            <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center [@media(max-height:760px)]:h-10 [@media(max-height:760px)]:w-10">
              <div
                className="absolute inset-0 rounded-full blur-md"
                style={{ background: "rgba(251,191,36,0.35)" }}
                aria-hidden="true"
              />
              <div className="relative h-full w-full overflow-hidden rounded-full border border-amber-400/50">
                <SafeImage src={HOME_PRAYER_ART} alt="" fallback={PRAYER_FALLBACK} className="h-full w-full object-cover object-center" />
              </div>
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="font-serif font-bold leading-snug text-amber-100 text-base [@media(max-height:760px)]:text-sm" style={SMALL_CAPS}>
                Take a Quiet Moment
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-100/60 [@media(max-height:760px)]:hidden">
                A short scripture, reflection, and prayer for today.
              </p>
            </div>
          </div>

          <span
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-amber-400/50 py-2 text-xs font-bold text-amber-200 transition group-hover:border-amber-300 [@media(max-height:760px)]:mt-1.5 [@media(max-height:760px)]:py-1"
            style={{ ...SMALL_CAPS, background: "rgba(8,12,24,0.55)" }}
          >
            Play Now
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>

          {devotionStreak > 0 && (
            <p className="mt-1.5 text-center text-[10px] text-amber-300/50 [@media(max-height:760px)]:hidden">
              {devotionStreak}-day prayer streak
            </p>
          )}
        </Link>
      )}
    </div>
  );
}
