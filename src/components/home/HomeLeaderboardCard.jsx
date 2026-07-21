import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { HOME_TROPHY_ART } from "@/lib/preloadHomeAssets";
import * as Sound from "@/game/soundManager";

const TROPHY_FALLBACK = (
  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
    <Trophy className="h-1/2 w-1/2 text-amber-300/70" strokeWidth={1.75} />
  </div>
);

// Leaderboard entry point — shown on both Home layouts, also a standing
// feature rather than part of the post-tutorial menu specifically.
// compact=false (pre-tutorial): a large, self-contained card with its own
// outer padding/centering. compact=true (post-tutorial): a bare grid item
// meant to sit inside ReturningHome's own Daily Prayer / Leaderboard grid.
export default function HomeLeaderboardCard({ compact = false }) {
  if (compact) {
    return (
      <Link
        to="/leaderboard"
        onClick={() => Sound.sfx.click()}
        className="flex min-h-[44px] min-[361px]:min-h-[56px] items-center gap-1.5 rounded-xl border border-amber-400/30 px-3 py-1.5 transition hover:border-amber-300/45"
        style={{
          background: "linear-gradient(135deg, rgba(10,16,32,0.85) 0%, rgba(6,10,20,0.9) 100%)",
          boxShadow: "inset 0 1px 0 rgba(251,191,36,0.1)",
        }}
      >
        <div className="relative h-6 w-6 flex-shrink-0">
          <SafeImage src={HOME_TROPHY_ART} alt="" fallback={TROPHY_FALLBACK} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xs font-bold text-amber-100">Leaderboard</p>
          <p className="text-[10px] text-amber-300">View Rankings →</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 flex justify-center mb-2 [@media(max-height:760px)]:mb-1">
      <Link
        to="/leaderboard"
        onClick={() => Sound.sfx.click()}
        className="relative flex w-full max-w-md items-center gap-3 rounded-xl border border-amber-400/30 px-4 transition hover:border-amber-300/45 lg:max-w-[600px] min-h-[76px] py-2 [@media(max-height:760px)]:min-h-[72px] [@media(max-height:760px)]:py-1.5"
        style={{
          background: "linear-gradient(135deg, rgba(10,16,32,0.85) 0%, rgba(6,10,20,0.9) 100%)",
          boxShadow: "inset 0 1px 0 rgba(251,191,36,0.12)",
        }}
      >
        <div className="relative flex-shrink-0 sm:h-14 sm:w-14 h-10 w-10">
          <SafeImage src={HOME_TROPHY_ART} alt="" fallback={TROPHY_FALLBACK} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-serif text-sm font-semibold text-amber-100">Leaderboard</p>
          <p className="text-[11px] text-amber-100/70">See how you rank among faithful warriors.</p>
        </div>
        {/* Full action text on wider screens; a plain gold arrow on narrow
            phones so it never forces the card wider or clips. */}
        <span className="hidden flex-shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-amber-300/80 sm:flex">
          View Top Players
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-300/70 sm:hidden" aria-hidden="true" />
      </Link>
    </div>
  );
}
