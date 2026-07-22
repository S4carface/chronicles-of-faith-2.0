import React from "react";
import { useReducedMotion } from "framer-motion";
import { Swords } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import HomePrayerCard from "@/components/home/HomePrayerCard";
import HomeLeaderboardCard from "@/components/home/HomeLeaderboardCard";
import HomeGenesisAtmosphere from "@/components/game/HomeGenesisAtmosphere";
import FixedViewportPage from "@/components/FixedViewportPage";
import StickyActionDock from "@/components/StickyActionDock";
import { HOME_BACKGROUND_ART } from "@/lib/preloadHomeAssets";

// Floating particles — drift across the whole screen, behind every section.
// Declared once at module scope so positions never change on re-render
// (computing Math.random() directly in JSX would regenerate every
// particle's position on every render, e.g. whenever profile/run state
// changes).
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

// The approved cinematic first-time Home — the player's very first
// impression, before the tutorial has been completed. A tall composition
// mirroring the approved mockup: crest and title, an elegant identity
// line, ornate Daily Prayer and Leaderboard cards, the Genesis horizon
// with its scripture, and a single dominant Start Journey action. No
// difficulty selector and no bottom navigation here — both belong only to
// ReturningHome, the completely different fixed dashboard the player sees
// after finishing the tutorial (see that file for why they don't share
// JSX).
export default function FirstTimeHome({
  playerName,
  onEditName,
  devotionPrayedToday,
  devotionStreak,
  hasResumableRun,
  onBeginRun,
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
      contentClassName="pt-[calc(0.5rem+env(safe-area-inset-top))] [@media(max-height:760px)]:pt-[calc(0.125rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] [@media(max-height:760px)]:pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:pb-8"
      scrollable
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

      <HomeHeader variant="hero" playerName={playerName} onEditName={onEditName} />

      {/* "Take a Quiet Moment" — shown both before AND after the tutorial;
          it's a standing daily feature, not part of the post-tutorial menu. */}
      <HomePrayerCard devotionPrayedToday={devotionPrayedToday} devotionStreak={devotionStreak} />

      {/* Leaderboard — also shown both before AND after the tutorial. */}
      <HomeLeaderboardCard />

      {/* Scripture / Genesis horizon — atmospheric centerpiece, always
          shown (including before the tutorial) so the first impression
          still carries the game's sacred tone. flex-1: this now owns the
          hero layout's leftover vertical space directly (instead of a
          separate empty filler strip below Start Journey absorbing it),
          so a tall phone reads as one deliberate, continuous scene. */}
      <HomeGenesisAtmosphere showJourneyHint compact />

      {/* Story save corruption notice */}
      {storySaveError && !savedStoryExists && (
        <div className="w-full px-4 lg:px-8 flex justify-center mt-3">
          <div className="w-full max-w-md p-3 rounded-lg border border-red-500/30 bg-red-900/20 text-center animate-fade-in">
            <p className="text-red-200/80 text-xs">
              Saved run could not be restored. Please start a new run.
            </p>
          </div>
        </div>
      )}

      {/* Start Journey — the single, strongest action on the screen.
          Resuming a run/save goes through this same button + the confirm
          dialog Home.jsx owns (Continue Saved Run vs. Start New Run), so
          all the underlying resume/new-run logic stays wired exactly as
          before. */}
      <StickyActionDock className="w-full px-4 lg:px-8">
        <div className="relative mx-auto w-full max-w-md lg:max-w-[600px]">
          {/* CSS-only ornament in place of the old start-journey-frame.webp
              crop — no image asset, so there's no risk of the source's
              baked-in "Start your Journey" nameplate ever duplicating the
              live button text below. */}
          <div className="flex items-center justify-center gap-2 mb-1.5 [@media(max-height:760px)]:mb-0.5" aria-hidden="true">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-400/60 sm:w-20" />
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rotate-45 bg-amber-300/80"
              style={{ boxShadow: "0 0 8px rgba(251,191,36,0.6)" }}
            />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-400/60 sm:w-20" />
          </div>

          {/* Soft flare behind the button — reuses the existing sacredGlow
              keyframe/utility, which already has its own reduced-motion
              override (a static glow instead of pulsing) in index.css.
              -inset-2 (not a larger bleed): this sits as the LAST element
              in the flex column, right against the bottom padding, so a
              wider negative inset here pushes past the scroll container's
              own bottom edge — real, measurable overflow (scrollHeight >
              clientHeight) even though the glow itself is purely
              decorative and pointer-events-none. */}
          <div
            className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] animate-sacred-glow"
            aria-hidden="true"
          />

          <button
            onClick={onBeginRun}
            className="relative w-full rounded-2xl border-2 border-amber-400/85 text-amber-50 font-serif font-bold text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 lg:min-h-[92px] lg:py-5 min-h-[72px] px-6 py-3 [@media(max-height:760px)]:min-h-[64px] [@media(max-height:760px)]:py-2"
            style={{
              fontVariant: "small-caps",
              fontSize: "clamp(1.05rem, 2vw, 1.85rem)",
              background: "linear-gradient(135deg, rgba(216,168,52,0.42) 0%, rgba(122,90,18,0.32) 100%)",
              boxShadow:
                "0 0 55px rgba(251,191,36,0.42), 0 0 90px rgba(251,191,36,0.14), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.32), inset 0 0 28px rgba(251,191,36,0.14), inset 0 0 0 1px rgba(251,191,36,0.25)",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            <span className="flex items-center justify-center gap-2.5">
              <Swords className="w-5 h-5 lg:w-7 lg:h-7" />
              {hasResumableRun ? "Continue Journey" : "Start Journey"}
            </span>
          </button>
        </div>
      </StickyActionDock>
    </FixedViewportPage>
  );
}
