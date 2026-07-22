import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { HOME_TROPHY_ART } from "@/lib/preloadHomeAssets";
import * as Sound from "@/game/soundManager";

const SMALL_CAPS = { fontVariant: "small-caps" };
const FRAME_SHADOW = "inset 0 0 0 1px rgba(251,191,36,0.14), inset 0 1px 0 rgba(251,191,36,0.16)";

const TROPHY_FALLBACK = (
  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
    <Trophy className="h-1/2 w-1/2 text-amber-300/70" strokeWidth={1.75} />
  </div>
);

// Leaderboard entry point — shown on both Home layouts, also a standing
// feature rather than part of the post-tutorial menu specifically.
// compact=false (pre-tutorial): a large, self-contained ornate card.
// compact=true (post-tutorial): a full-width dashboard row with its own
// "View Top Players" action pill, mirroring the mockup's leaderboard strip.
export default function HomeLeaderboardCard({ compact = false }) {
  if (compact) {
    return (
      <Link
        to="/leaderboard"
        onClick={() => Sound.sfx.click()}
        className="flex min-h-[52px] w-full items-center gap-2.5 rounded-xl border border-amber-400/30 px-3.5 py-2 transition hover:border-amber-300/45 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:px-3"
        style={{
          background: "linear-gradient(135deg, rgba(10,16,32,0.85) 0%, rgba(6,10,20,0.9) 100%)",
          boxShadow: FRAME_SHADOW,
        }}
      >
        <div className="relative h-[2.875rem] w-[2.875rem] flex-shrink-0 overflow-hidden rounded-full [@media(max-height:700px)]:h-9 [@media(max-height:700px)]:w-9">
          <SafeImage src={HOME_TROPHY_ART} alt="" fallback={TROPHY_FALLBACK} className="h-full w-full object-cover object-center" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xs font-bold text-amber-100" style={SMALL_CAPS}>Leaderboard</p>
          <p className="truncate text-[10px] text-amber-100/55">See how you rank among faithful warriors.</p>
        </div>
        {/* Full action pill when this row has its own full width; a plain
            gold arrow when ReturningHome's short-viewport fallback packs it
            into a narrow half-width grid column instead (see that file) —
            keyed off the same max-height breakpoint that fallback uses, so
            it never forces the row wider or overlaps the title. */}
        <span className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-semibold text-amber-300 [@media(max-height:700px)]:hidden">
          View Top Players
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </span>
        <ChevronRight className="hidden h-4 w-4 flex-shrink-0 text-amber-300/70 [@media(max-height:700px)]:block" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 flex justify-center mb-2.5 [@media(max-height:760px)]:mb-1">
      <Link
        to="/leaderboard"
        onClick={() => Sound.sfx.click()}
        className="relative flex w-full max-w-md items-center gap-3 rounded-2xl border border-amber-400/30 px-4 py-3 transition hover:border-amber-300/45 lg:max-w-[600px] [@media(max-height:760px)]:py-1.5"
        style={{
          background: "linear-gradient(135deg, rgba(10,16,32,0.85) 0%, rgba(6,10,20,0.9) 100%)",
          boxShadow: FRAME_SHADOW,
        }}
      >
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full [@media(max-height:760px)]:h-12 [@media(max-height:760px)]:w-12">
          <SafeImage src={HOME_TROPHY_ART} alt="" fallback={TROPHY_FALLBACK} className="h-full w-full object-cover object-center" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-serif text-sm font-bold text-amber-100 [@media(max-height:760px)]:text-xs" style={SMALL_CAPS}>Leaderboard</p>
          <p className="text-[11px] text-amber-100/70 [@media(max-height:760px)]:hidden">See how you rank among faithful warriors.</p>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-amber-300/70" aria-hidden="true" />
      </Link>
    </div>
  );
}
