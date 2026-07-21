import React from "react";
import { Link } from "react-router-dom";
import { Sun } from "lucide-react";
import * as Sound from "@/game/soundManager";

// "Take a Quiet Moment" / Daily Prayer — a standing daily feature shown on
// both Home layouts, not part of the post-tutorial menu specifically.
// compact=false (pre-tutorial): a large, self-contained card with its own
// outer padding/centering. compact=true (post-tutorial): a bare grid item
// meant to sit inside ReturningHome's own Daily Prayer / Leaderboard grid,
// so it renders just the tile — no wrapping section of its own.
export default function HomePrayerCard({ compact = false, devotionPrayedToday, devotionStreak }) {
  if (compact) {
    return devotionPrayedToday ? (
      <Link
        to="/daily-prayer"
        onClick={() => Sound.sfx.click()}
        className="flex min-h-[44px] min-[361px]:min-h-[56px] items-center gap-1.5 rounded-xl border border-emerald-400/35 px-3 py-1.5 transition hover:border-emerald-300/50"
        style={{
          background: "linear-gradient(135deg, rgba(6,45,36,0.55) 0%, rgba(8,12,24,0.85) 100%)",
          boxShadow: "inset 0 1px 0 rgba(251,191,36,0.14)",
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xs font-bold text-emerald-200">✓ Prayer Complete</p>
          {devotionStreak > 0 && (
            <p className="text-[10px] text-amber-300/70">{devotionStreak}-day streak</p>
          )}
        </div>
      </Link>
    ) : (
      <Link
        to="/daily-prayer"
        onClick={() => Sound.sfx.click()}
        className="flex min-h-[44px] min-[361px]:min-h-[56px] items-center gap-1.5 rounded-xl border border-amber-400/30 px-3 py-1.5 transition hover:border-amber-300/45"
        style={{
          background: "linear-gradient(135deg, rgba(14,20,38,0.92) 0%, rgba(6,10,20,0.96) 100%)",
          boxShadow: "inset 0 1px 0 rgba(251,191,36,0.1)",
        }}
      >
        <div
          className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/40"
          style={{ background: "radial-gradient(circle at 50% 35%, rgba(58,45,16,0.9) 0%, rgba(10,14,26,0.96) 100%)" }}
        >
          <Sun className="h-3.5 w-3.5 text-amber-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xs font-bold text-amber-100">Daily Prayer</p>
          <p className="text-[10px] text-amber-300">Pray Now →</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 flex justify-center mb-2 [@media(max-height:760px)]:mb-1">
      {devotionPrayedToday ? (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative flex w-full max-w-md items-center gap-2 rounded-xl border border-emerald-400/35 px-4 transition hover:border-emerald-300/50 lg:max-w-[600px] py-2"
          style={{
            background: "linear-gradient(135deg, rgba(6,45,36,0.55) 0%, rgba(8,12,24,0.85) 100%)",
            boxShadow: "inset 0 1px 0 rgba(251,191,36,0.14)",
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="font-serif text-sm font-semibold text-emerald-200">
              ✓ Daily Prayer Completed
            </p>
            <p className="text-[11px] text-emerald-100/65">
              Return to today&rsquo;s reflection
            </p>
          </div>
          {devotionStreak > 0 && (
            <span className="flex-shrink-0 whitespace-nowrap text-[10px] font-semibold text-amber-300/80">
              {devotionStreak}-day streak
            </span>
          )}
        </Link>
      ) : (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative flex w-full max-w-md items-center rounded-2xl border border-amber-400/35 transition-all duration-300 hover:border-amber-300/55 active:scale-[0.99] motion-reduce:transition-none lg:max-w-[600px] lg:min-h-[140px] lg:gap-4 lg:px-6 lg:py-4 min-h-[112px] gap-3 px-3 py-2.5 [@media(max-height:760px)]:min-h-[104px] [@media(max-height:760px)]:py-2"
          style={{
            background: "linear-gradient(135deg, rgba(14,20,38,0.92) 0%, rgba(6,10,20,0.96) 100%)",
            boxShadow: "inset 0 1px 0 rgba(251,191,36,0.18), inset 0 0 0 1px rgba(251,191,36,0.06), 0 6px 18px rgba(0,0,0,0.35)",
          }}
        >
          {/* Badge pinned to its own top-right corner, with the text column
              reserving space via pr-12 below — it never competes with the
              title for width, so the title can never clip. */}
          <span className="absolute top-2.5 right-2.5 whitespace-nowrap rounded-full border border-amber-300/35 bg-amber-950/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">
            New Today
          </span>

          {/* Compact icon medallion — no dedicated lantern/prayer artwork
              exists locally yet, so the Sun icon is presented inside a
              gold/navy medallion with a soft glow behind it. */}
          <div className="relative flex flex-shrink-0 items-center justify-center lg:h-16 lg:w-16 h-11 w-11">
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{ background: "rgba(251,191,36,0.35)" }}
              aria-hidden="true"
            />
            <div
              className="relative flex h-full w-full items-center justify-center rounded-full border border-amber-400/50"
              style={{ background: "radial-gradient(circle at 50% 35%, rgba(58,45,16,0.9) 0%, rgba(10,14,26,0.96) 100%)" }}
            >
              <Sun className="text-amber-200 lg:h-7 lg:w-7 h-5 w-5" />
            </div>
          </div>

          <div className="min-w-0 flex-1 text-left pr-12">
            <p className="font-serif font-bold leading-snug text-amber-100 lg:text-xl text-sm">
              Take a Quiet Moment
            </p>

            <p className="leading-relaxed text-amber-100/60 lg:text-sm mt-0.5 text-[11px]">
              A short scripture, reflection, and prayer for today.
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-xs font-semibold text-amber-300 lg:text-sm">
                Pray Now →
              </span>

              {devotionStreak > 0 && (
                <span className="text-[10px] text-amber-300/50 lg:text-xs">
                  {devotionStreak}-day prayer streak
                </span>
              )}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
