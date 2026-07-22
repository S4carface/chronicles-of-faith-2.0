import React from "react";
import { useReducedMotion } from "framer-motion";
import { Swords, ChevronRight } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import HomePrayerCard from "@/components/home/HomePrayerCard";
import HomeLeaderboardCard from "@/components/home/HomeLeaderboardCard";
import HomeDifficultySection from "@/components/home/HomeDifficultySection";
import HomeGenesisAtmosphere, { GENESIS_HORIZON_ART } from "@/components/game/HomeGenesisAtmosphere";
import FixedViewportPage from "@/components/FixedViewportPage";
import StickyActionDock from "@/components/StickyActionDock";
import SafeImage from "@/components/ui/SafeImage";
import { HOME_BACKGROUND_ART } from "@/lib/preloadHomeAssets";

const SMALL_CAPS = { fontVariant: "small-caps" };

// Floating particles — drift across the whole screen, behind every section.
// Declared once at module scope so positions never change on re-render.
// Identical to FirstTimeHome's field: the two layouts share this one
// visual touch deliberately, but nothing else about their composition —
// see the file-level comment below for why they don't share JSX.
const HOME_PARTICLES = [
  { left: 8, top: 12, size: 3, duration: 7, delay: 0 },
  { left: 22, top: 68, size: 4, duration: 9, delay: 1.2 },
  { left: 36, top: 30, size: 2.5, duration: 6.5, delay: 2.6 },
  { left: 50, top: 80, size: 3.5, duration: 8.5, delay: 0.8 },
  { left: 64, top: 20, size: 3, duration: 7.5, delay: 3.4 },
  { left: 78, top: 55, size: 4, duration: 9.5, delay: 1.8 },
  { left: 90, top: 10, size: 2.5, duration: 6, delay: 2.2 },
  { left: 95, top: 75, size: 3, duration: 8, delay: 3.8 },
];

// The compact, fixed (non-scrollable) post-tutorial dashboard — a
// completely different hierarchy from FirstTimeHome's tall cinematic hero,
// not the same layout wearing conditional Tailwind classes. Composition
// mirrors the approved mockup's order: compact header, a Continue card
// (only when a run exists), difficulty near the top, Daily Prayer and
// Leaderboard as full-width rows, the Genesis horizon filling whatever
// flexible space remains, and a dominant Start Journey action directly
// above the fixed bottom navigation. Every section is sized to actually
// fit within one 100dvh screen (see `scrollable` below), which is why this
// and FirstTimeHome are two dedicated compositions rather than one
// component branching internally.
export default function ReturningHome({
  playerName,
  onEditName,
  devotionPrayedToday,
  devotionStreak,
  hasResumableRun,
  onBeginRun,
  onContinueSaved,
  storySaveError,
  savedStoryExists,
  homeBackgroundReady,
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <FixedViewportPage
      style={{
        backgroundColor: "#050B16",
        backgroundImage: homeBackgroundReady
          ? `linear-gradient(180deg, rgba(4,9,20,0.42) 0%, rgba(5,11,26,0.6) 42%, rgba(3,8,18,0.84) 100%), url("${HOME_BACKGROUND_ART}")`
          : "radial-gradient(ellipse at center, #131d34 0%, #050B16 80%)",
        backgroundPosition: "center 18%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
      // BottomNavigation renders reserveSpace={false} for this route (see
      // App.jsx) specifically so this padding is the SOLE bottom-clearance
      // reservation — both used to reserve the same ~6.5rem independently,
      // silently doubling the space taken out of an already-tight layout.
      contentClassName="pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:pb-[7rem]"
      scrollable={false}
    >
      {HOME_PARTICLES.map((particle, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          aria-hidden="true"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            background: "rgba(201,168,76,0.35)",
            animation: prefersReducedMotion
              ? "none"
              : `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            opacity: prefersReducedMotion ? 0.35 : undefined,
          }}
        />
      ))}

      <HomeHeader variant="compact" playerName={playerName} onEditName={onEditName} />

      {/* Continue — shown only when there's actually a run to resume, one
          tap from the dashboard rather than needing to open the confirm
          dialog first. Reuses the same resume handler as that dialog (which
          Home.jsx still owns), so this is a shortcut to the existing resume
          path, not a new one. Start Journey further down still opens that
          dialog, so a player can also choose to abandon this run and start
          fresh — that behavior is unchanged. */}
      {hasResumableRun && (
        <div className="w-full shrink-0 px-4 pb-2 [@media(max-height:700px)]:pb-1 lg:px-8">
          <button
            onClick={onContinueSaved}
            className="relative mx-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border-2 border-amber-400/50 text-left transition hover:border-amber-300/70 active:scale-[0.99] motion-reduce:transition-none lg:max-w-[600px]"
            style={{
              background: "linear-gradient(135deg, rgba(20,28,50,0.92) 0%, rgba(8,12,22,0.96) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(251,191,36,0.16), 0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16">
              <SafeImage
                src={GENESIS_HORIZON_ART}
                alt=""
                fallback={null}
                className="h-full w-full object-cover"
                style={{ objectPosition: "center 50%", filter: "brightness(0.85) saturate(1.1)" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(6,10,20,0.1) 0%, rgba(6,10,20,0.6) 100%)" }}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1 py-2.5">
              <p className="font-serif text-base font-bold text-amber-100" style={SMALL_CAPS}>Continue</p>
              <p className="truncate text-[11px] text-amber-200/60">Resume your saved journey</p>
            </div>
            <ChevronRight className="mr-3 h-5 w-5 flex-shrink-0 text-amber-300/70" aria-hidden="true" />
          </button>
        </div>
      )}

      <HomeDifficultySection />

      {/* Story save corruption notice */}
      {storySaveError && !savedStoryExists && (
        <div className="w-full shrink-0 px-4 pb-1.5 lg:px-8">
          <div className="mx-auto max-w-md rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-center animate-fade-in lg:max-w-[600px]">
            <p className="text-[11px] text-red-200/80">
              Saved run could not be restored. Please start a new run.
            </p>
          </div>
        </div>
      )}

      {/* Daily Prayer + Leaderboard — full-width rows by default, mirroring
          the approved mockup's stacked strips (each with room for a streak
          badge / action pill instead of being squeezed into a half-width
          tile). A short viewport can't spare that much vertical room for
          two full rows, so it falls back to the previous compact side-by-
          side grid instead of ever scrolling or clipping. */}
      <div className="w-full shrink-0 px-4 pb-2 [@media(max-height:700px)]:pb-1 lg:px-8">
        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-1.5 [@media(max-height:700px)]:grid-cols-2 [@media(max-height:700px)]:gap-1.5 lg:max-w-[600px]">
          <HomePrayerCard compact devotionPrayedToday={devotionPrayedToday} devotionStreak={devotionStreak} />
          <HomeLeaderboardCard compact />
        </div>
      </div>

      {/* Genesis horizon with scripture layered inside it — the flexible
          middle visual area, now owning whatever vertical space the rest
          of the dashboard leaves unclaimed. */}
      <HomeGenesisAtmosphere overlayScripture />

      {/* Start Journey — kept visually dominant (gold border, glow, large
          icon+text) despite the shorter target height. Sits in normal
          document flow directly above the bottom-nav clearance this
          layout's own padding reserves — no sticky/absolute overlap.
          onBeginRun is unchanged: it still opens the confirm dialog when a
          run/save exists, offering "Start New Run" as an explicit
          alternative to the Continue card above. */}
      <StickyActionDock className="w-full px-4 lg:px-8">
        <div className="relative mx-auto w-full max-w-md lg:max-w-[600px]">
          <div
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] animate-sacred-glow"
            aria-hidden="true"
          />
          <button
            onClick={onBeginRun}
            className="relative min-h-[64px] w-full rounded-2xl border-2 border-amber-400/85 px-6 py-2 text-center font-serif font-bold text-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 lg:min-h-[80px] lg:py-4"
            style={{
              fontVariant: "small-caps",
              fontSize: "clamp(1.1rem, 2vw, 1.6rem)",
              background: "linear-gradient(135deg, rgba(216,168,52,0.42) 0%, rgba(122,90,18,0.32) 100%)",
              boxShadow:
                "0 0 45px rgba(251,191,36,0.4), 0 0 75px rgba(251,191,36,0.12), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.3), inset 0 0 24px rgba(251,191,36,0.12), inset 0 0 0 1px rgba(251,191,36,0.25)",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Swords className="h-5 w-5" />
              {hasResumableRun ? "Continue Journey" : "Start Journey"}
            </span>
          </button>
        </div>
      </StickyActionDock>
    </FixedViewportPage>
  );
}
