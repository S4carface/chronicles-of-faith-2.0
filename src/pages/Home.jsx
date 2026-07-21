import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { Swords, Pencil, Sun, ChevronRight } from "lucide-react";
import { useGame } from "@/game/GameContext";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import ResumeModal from "@/components/game/ResumeModal";
import DifficultySelect from "@/components/game/DifficultySelect";
import CinematicIntro from "@/components/game/CinematicIntro";
import HomeGenesisAtmosphere, { GENESIS_HORIZON_ART } from "@/components/game/HomeGenesisAtmosphere";
import FixedViewportPage from "@/components/FixedViewportPage";
import StickyActionDock from "@/components/StickyActionDock";
import SafeImage from "@/components/ui/SafeImage";
import { getSavedRoute } from "@/components/ScrollToTop";
import { validateDeck } from "@/game/deckRules";
import { sanitizePlayerName, needsPlayerName } from "@/game/nameValidator";
import { preloadImage, preloadImages } from "@/lib/imageAssets";
import * as Sound from "@/game/soundManager";

const HOME_BACKGROUND = "/images/home/home-celestial.png";
const HOME_CREST_ART = "/images/home/home-crest.webp";
const HOME_TROPHY_ART = "/images/home/home-trophy.webp";

// Fixed, deterministic particle field — declared once at module scope so
// positions never change on re-render (Math.random() directly inside JSX
// would regenerate every particle on every profile/run state change).
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

// Sparse gold dust for the atmospheric space below Start Journey on the
// first-time screen (bottom nav — and its own reserved spacer — is hidden
// pre-tutorial, so this small fixed set gives that leftover space a
// deliberate, sacred feel instead of a flat empty gap).
const TAIL_PARTICLES = [
  { left: 18, top: 30, size: 2, duration: 8, delay: 0.4 },
  { left: 46, top: 60, size: 2.5, duration: 9.5, delay: 1.6 },
  { left: 72, top: 22, size: 2, duration: 7.5, delay: 2.8 },
  { left: 88, top: 55, size: 2.5, duration: 10, delay: 0.8 },
];

export default function Home() {
  const {
    profile,
    run,
    endRun,
    startTutorialRun,
    saveProfile,
    Sound: Snd,
    savedStoryExists,
    resumeStoryRun,
    storySaveError,
    showIntro,
    introPurpose,
    triggerIntroReplay,
    handleIntroComplete,
  } = useGame();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [homeBackgroundReady, setHomeBackgroundReady] = useState(false);

  useEffect(() => {
    Snd.playMusic("menu");
    if (run && getSavedRoute() === "/play") {
      setShowResume(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    preloadImage(HOME_BACKGROUND).then((loaded) => {
      if (isMounted && loaded) setHomeBackgroundReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fire-and-forget: warms the two most visually prominent pieces of new
  // Home artwork (the crest and the Genesis horizon) ahead of when
  // SafeImage actually mounts them, so they're more likely to be ready to
  // fade in immediately rather than showing their loading placeholder
  // first. The trophy is lower-priority decoration and intentionally left
  // to load on its own.
  useEffect(() => {
    preloadImages([HOME_CREST_ART, GENESIS_HORIZON_ART]);
  }, []);

  const launchFirstTutorialBattle = () => {
    startTutorialRun();
    navigate("/play");
  };

  const handleIntroFinished = () => {
    const shouldStartTutorial =
      introPurpose === "onboarding" && !profile.tutorialSeen;

    handleIntroComplete();

    if (shouldStartTutorial) {
      launchFirstTutorialBattle();
    }
  };

  const handleBeginRun = () => {
    Sound.sfx.click();

    if (run || savedStoryExists) {
      setShowConfirm(true);
      return;
    }

    // First-time onboarding begins only after the player presses Play.
    if (!profile.tutorialSeen) {
      triggerIntroReplay("onboarding");
      return;
    }

    const deckCheck = validateDeck(profile.activeDeck);

    if (!deckCheck.valid) {
      navigate("/collection");
      return;
    }

    // Returning player: use selected difficulty and normal run flow
    navigate("/play");
  };

  const handleContinueSaved = () => {
    Sound.sfx.click();
    setShowConfirm(false);
    if (run) {
      navigate("/play");
    } else if (resumeStoryRun()) {
      navigate("/play");
    }
  };

  const handleConfirmNew = () => {
    endRun();
    setShowConfirm(false);

    setTimeout(() => {
      if (!profile.tutorialSeen) {
        triggerIntroReplay("onboarding");
        return;
      }

      navigate("/play");
    }, 0);
  };

  const handleNameSaved = (name) => {
    saveProfile({
      playerName: sanitizePlayerName(name),
    });

    setShowNamePrompt(false);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const devotionPrayedToday = profile.devotionReadDate === todayStr;
  // A run to resume — either live in memory or persisted as a story save.
  // Start Journey doubles as "continue" for it; the confirm dialog below
  // still offers a clean way to abandon it and start fresh.
  const hasResumableRun = Boolean(run || savedStoryExists);
  // Pre-tutorial is the approved cinematic first-time Home (unchanged).
  // Post-tutorial is a completely different, compact fixed-dashboard
  // hierarchy — see the two branches in the JSX below. Each has its own
  // sizing/spacing tuned to actually fit FixedViewportPage's 100dvh box:
  // pre-tutorial keeps a scroll fallback for the rare device it doesn't
  // quite fit; post-tutorial is compact enough to render with scrolling
  // turned off entirely (see the `scrollable` prop just below).
  const isPreTutorial = !profile.tutorialSeen;

  // BottomNavigation renders reserveSpace={false} for this route (see
  // App.jsx) specifically so this padding is the SOLE bottom-clearance
  // reservation — both used to reserve the same ~6.5rem independently,
  // silently doubling the space taken out of an already-tight post-tutorial
  // layout. Pre-tutorial doesn't need this at all (bottom nav is hidden
  // until the tutorial completes); a small safe-area pad is enough there,
  // with the leftover space filled deliberately below (see TAIL_PARTICLES).
  const contentBottomPadding = profile.tutorialSeen
    ? "pb-[calc(6.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:pb-[7rem]"
    : "pb-[calc(0.75rem+env(safe-area-inset-bottom))] [@media(max-height:760px)]:pb-[calc(0.25rem+env(safe-area-inset-bottom))] lg:pb-8";
  const contentTopPadding = isPreTutorial
    ? "pt-[calc(0.5rem+env(safe-area-inset-top))] [@media(max-height:760px)]:pt-[calc(0.125rem+env(safe-area-inset-top))]"
    : "pt-[calc(0.5rem+env(safe-area-inset-top))]";

  return (
    <FixedViewportPage
      style={{
        backgroundColor: "#050B16",
        backgroundImage: homeBackgroundReady
          ? `linear-gradient(180deg, rgba(4,9,20,0.42) 0%, rgba(5,11,26,0.6) 42%, rgba(3,8,18,0.84) 100%), url("${HOME_BACKGROUND}")`
          : "radial-gradient(ellipse at center, #131d34 0%, #050B16 80%)",
        backgroundPosition: "center 18%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
      contentClassName={`${contentTopPadding} ${contentBottomPadding}`}
      scrollable={isPreTutorial}
    >
      {/* Floating particles — drift across the whole screen, behind every section */}
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

      {/* Pre-tutorial: the approved cinematic first-time Home, unchanged
          (see the isPreTutorial ternaries throughout this block — they
          always resolve to their pre-tutorial branch here now, but are
          left as-is rather than hardcoded, so this JSX stays byte-for-byte
          identical to the pre-tutorial screen this task must not alter). */}
      {isPreTutorial && (
      <>
      {/* 1. Full-width dark hero band — 2. crest, 3. title, 4. subtitle.
          The darkening gradient sits on this full-bleed wrapper (no side
          padding) so it spans edge to edge; the crest/title/subtitle
          content is centered inside its own padded inner div. */}
      {/* shrink-0: this is a flex item of FixedViewportPage's flex column.
          Combined with overflow-hidden, a flex item's automatic minimum
          size resolves to 0 instead of its content size — on a short
          viewport with enough content below to exceed the container's
          height, that lets the flex algorithm collapse this section down
          to just its own padding and CLIP the crest/title/subtitle
          entirely, even though scrolling was available and preferred.
          shrink-0 keeps it pinned to its natural content height instead. */}
      <section
        className={`relative w-full shrink-0 text-center overflow-hidden ${
          isPreTutorial
            ? "pt-2 pb-3 [@media(max-height:760px)]:pt-0 [@media(max-height:760px)]:pb-0.5 lg:pt-3 lg:pb-9"
            : "pt-3 pb-7 lg:pb-9"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 95% at 50% 15%, rgba(5,9,18,0.82) 0%, rgba(5,9,18,0.48) 55%, transparent 92%)",
          }}
          aria-hidden="true"
        />

        <div className="relative px-4 lg:px-8">
          <div className={`flex justify-center ${isPreTutorial ? "mb-1 [@media(max-height:760px)]:mb-0.5" : "mb-2"}`}>
            <div
              className={
                isPreTutorial
                  ? "relative h-16 w-16 [@media(max-height:760px)]:h-11 [@media(max-height:760px)]:w-11 lg:h-24 lg:w-24"
                  : "relative h-20 w-20 lg:h-24 lg:w-24"
              }
            >
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(251,191,36,0.5)" }}
                aria-hidden="true"
              />
              {/* home-crest.webp is a fully opaque square (no alpha channel) —
                  object-contain alone can't make its dark background
                  transparent, so it's clipped to a circle instead. The
                  crest's own artwork (spike, ring, wings) sits well within
                  the inscribed circle, so this only trims background/corners. */}
              <div className="h-full w-full overflow-hidden rounded-full">
                <SafeImage
                  src={HOME_CREST_ART}
                  alt="Chronicles of Faith"
                  className="h-full w-full object-contain"
                  style={{ filter: "brightness(1.15) saturate(1.08)" }}
                />
              </div>
            </div>
          </div>

          <h1
            className="font-serif text-amber-50 tracking-wide leading-tight"
            style={{
              fontSize: isPreTutorial ? "clamp(1.5rem, 4.5vw, 3.5rem)" : "clamp(1.75rem, 5vw, 3.5rem)",
              textShadow: "0 0 40px rgba(251,191,36,0.5), 0 2px 10px rgba(0,0,0,0.55)",
            }}
          >
            Chronicles of Faith
          </h1>
          <p
            className="text-amber-100/70 mt-1 font-serif italic tracking-wide"
            style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            A Biblical Roguelike Journey
          </p>
          <div
            className={`w-24 h-px mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${
              isPreTutorial ? "mt-1" : "mt-2"
            }`}
          />
        </div>
      </section>

      {/* 5. Player identity row — a small dark pill so the name reads
          clearly against the bright celestial background, without a large
          rectangle behind the whole header. */}
      <div className={`w-full px-4 lg:px-8 flex justify-center ${isPreTutorial ? "mb-2 [@media(max-height:760px)]:mb-1" : "mb-6"}`}>
        <button
          onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
          className="flex items-center gap-2 rounded-full border border-amber-400/20 px-3.5 py-1.5 hover:border-amber-300/35 transition text-xs lg:text-sm"
          style={{ background: "rgba(5,9,18,0.55)" }}
        >
          {needsPlayerName(profile.playerName) ? (
            <span className="text-amber-100/55">Playing as Guest Pilgrim</span>
          ) : (
            <span className="text-amber-100/85">Playing as: {sanitizePlayerName(profile.playerName)}</span>
          )}
          <Pencil className="w-3 h-3 flex-shrink-0 text-amber-100/60" />
        </button>
      </div>

      {/* 6. "Take a Quiet Moment" — shown both before AND after the tutorial;
          it's a standing daily feature, not part of the post-tutorial menu. */}
      <div className={`w-full px-4 lg:px-8 flex justify-center ${isPreTutorial ? "mb-2 [@media(max-height:760px)]:mb-1" : "mb-4"}`}>
        {devotionPrayedToday ? (
          <Link
            to="/daily-prayer"
            onClick={() => Sound.sfx.click()}
            className={`relative flex w-full max-w-md items-center gap-2 rounded-xl border border-emerald-400/35 px-4 transition hover:border-emerald-300/50 lg:max-w-[600px] ${
              isPreTutorial ? "py-2" : "py-3"
            }`}
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
            {profile.devotionStreak > 0 && (
              <span className="flex-shrink-0 whitespace-nowrap text-[10px] font-semibold text-amber-300/80">
                {profile.devotionStreak}-day streak
              </span>
            )}
          </Link>
        ) : (
          <Link
            to="/daily-prayer"
            onClick={() => Sound.sfx.click()}
            className={`relative flex w-full max-w-md items-center rounded-2xl border border-amber-400/35 transition-all duration-300 hover:border-amber-300/55 active:scale-[0.99] motion-reduce:transition-none lg:max-w-[600px] lg:min-h-[140px] lg:gap-4 lg:px-6 lg:py-4 ${
              isPreTutorial
                ? "min-h-[112px] gap-3 px-3 py-2.5 [@media(max-height:760px)]:min-h-[104px] [@media(max-height:760px)]:py-2"
                : "min-h-[132px] gap-4 px-4 py-4"
            }`}
            style={{
              background: "linear-gradient(135deg, rgba(14,20,38,0.92) 0%, rgba(6,10,20,0.96) 100%)",
              boxShadow: "inset 0 1px 0 rgba(251,191,36,0.18), inset 0 0 0 1px rgba(251,191,36,0.06), 0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            {/* Badge pinned to its own top-right corner, with the text
                column reserving space via pr-14 below — it never competes
                with the title for width, so the title can never clip. */}
            <span className="absolute top-2.5 right-2.5 whitespace-nowrap rounded-full border border-amber-300/35 bg-amber-950/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">
              New Today
            </span>

            {/* Compact icon medallion — no dedicated lantern/prayer artwork
                exists locally yet, so the Sun icon is presented inside a
                gold/navy medallion with a soft glow behind it. */}
            <div
              className={`relative flex flex-shrink-0 items-center justify-center lg:h-16 lg:w-16 ${
                isPreTutorial ? "h-11 w-11" : "h-14 w-14"
              }`}
            >
              <div
                className="absolute inset-0 rounded-full blur-md"
                style={{ background: "rgba(251,191,36,0.35)" }}
                aria-hidden="true"
              />
              <div
                className="relative flex h-full w-full items-center justify-center rounded-full border border-amber-400/50"
                style={{ background: "radial-gradient(circle at 50% 35%, rgba(58,45,16,0.9) 0%, rgba(10,14,26,0.96) 100%)" }}
              >
                <Sun className={`text-amber-200 lg:h-7 lg:w-7 ${isPreTutorial ? "h-5 w-5" : "h-6 w-6"}`} />
              </div>
            </div>

            <div className={`min-w-0 flex-1 text-left ${isPreTutorial ? "pr-12" : "pr-14"}`}>
              <p
                className={`font-serif font-bold leading-snug text-amber-100 lg:text-xl ${
                  isPreTutorial ? "text-sm" : "text-lg"
                }`}
              >
                Take a Quiet Moment
              </p>

              <p
                className={`leading-relaxed text-amber-100/60 lg:text-sm ${
                  isPreTutorial ? "mt-0.5 text-[11px]" : "mt-1.5 text-xs"
                }`}
              >
                A short scripture, reflection, and prayer for today.
              </p>

              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${isPreTutorial ? "mt-1" : "mt-2"}`}>
                <span className="text-xs font-semibold text-amber-300 lg:text-sm">
                  Pray Now →
                </span>

                {profile.devotionStreak > 0 && (
                  <span className="text-[10px] text-amber-300/50 lg:text-xs">
                    {profile.devotionStreak}-day prayer streak
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* 7. Leaderboard — also shown both before AND after the tutorial. */}
      <div className={`w-full px-4 lg:px-8 flex justify-center ${isPreTutorial ? "mb-2 [@media(max-height:760px)]:mb-1" : "mb-2"}`}>
        <Link
          to="/leaderboard"
          onClick={() => Sound.sfx.click()}
          className={`relative flex w-full max-w-md items-center gap-3 rounded-xl border border-amber-400/30 px-4 transition hover:border-amber-300/45 lg:max-w-[600px] ${
            isPreTutorial
              ? "min-h-[76px] py-2 [@media(max-height:760px)]:min-h-[72px] [@media(max-height:760px)]:py-1.5"
              : "min-h-[88px] py-3"
          }`}
          style={{
            background: "linear-gradient(135deg, rgba(10,16,32,0.85) 0%, rgba(6,10,20,0.9) 100%)",
            boxShadow: "inset 0 1px 0 rgba(251,191,36,0.12)",
          }}
        >
          <div
            className={`relative flex-shrink-0 sm:h-14 sm:w-14 ${
              isPreTutorial ? "h-10 w-10" : "h-12 w-12"
            }`}
          >
            <SafeImage src={HOME_TROPHY_ART} alt="" className="h-full w-full object-contain" />
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

      {/* 8. Scripture / Genesis horizon — atmospheric centerpiece, always
          shown (including before the tutorial) so the first impression
          still carries the game's sacred tone, not just an empty gap. */}
      <HomeGenesisAtmosphere showJourneyHint={isPreTutorial} compact={isPreTutorial} />

      {/* Difficulty — tucked directly above Start Journey, right where a
          player would want to check it before launching a run. Unchanged
          tutorial gate: only returning players (post-tutorial) see it. */}
      {profile.tutorialSeen && (
        <div className="w-full px-4 lg:px-8 flex justify-center mt-3">
          <DifficultySelect />
        </div>
      )}

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

      {/* 9. Start Journey — the single, strongest action on the screen.
          Resuming a run/save goes through this same button + the confirm
          dialog below (Continue Saved Run vs. Start New Run), so all the
          underlying resume/new-run logic stays wired exactly as before. */}
      <StickyActionDock className="w-full px-4 lg:px-8">
        <div className="relative mx-auto w-full max-w-md lg:max-w-[600px]">
          {/* CSS-only ornament in place of the old start-journey-frame.webp
              crop — no image asset, so there's no risk of the source's
              baked-in "Start your Journey" nameplate ever duplicating the
              live button text below. */}
          <div className={`flex items-center justify-center gap-2 ${isPreTutorial ? "mb-1 [@media(max-height:760px)]:mb-0" : "mb-2"}`} aria-hidden="true">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-400/60 sm:w-20" />
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rotate-45 bg-amber-300/80"
              style={{ boxShadow: "0 0 8px rgba(251,191,36,0.6)" }}
            />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-400/60 sm:w-20" />
          </div>

          {/* Soft flare behind the button — reuses the existing sacredGlow
              keyframe/utility, which already has its own reduced-motion
              override (a static glow instead of pulsing) in index.css. */}
          <div
            className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] animate-sacred-glow"
            aria-hidden="true"
          />

          <button
            onClick={handleBeginRun}
            className={`relative w-full rounded-2xl border-2 border-amber-400/85 text-amber-50 font-serif font-bold text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 lg:min-h-[92px] lg:py-5 ${
              isPreTutorial
                ? "min-h-[72px] px-6 py-3 [@media(max-height:760px)]:min-h-[68px] [@media(max-height:760px)]:py-2"
                : "min-h-[78px] px-8 py-4"
            }`}
            style={{
              fontSize: isPreTutorial ? "clamp(1.05rem, 2vw, 1.85rem)" : "clamp(1.2rem, 2.2vw, 1.85rem)",
              background: "linear-gradient(135deg, rgba(216,168,52,0.42) 0%, rgba(122,90,18,0.32) 100%)",
              boxShadow:
                "0 0 55px rgba(251,191,36,0.42), 0 0 90px rgba(251,191,36,0.14), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.32), inset 0 0 28px rgba(251,191,36,0.14)",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            <span className="flex items-center justify-center gap-2.5">
              <Swords className={isPreTutorial ? "w-5 h-5 lg:w-7 lg:h-7" : "w-6 h-6 lg:w-7 lg:h-7"} />
              {hasResumableRun ? "Continue Journey" : "Start Journey"}
            </span>
          </button>
        </div>
      </StickyActionDock>

      {/* The atmospheric space below Start Journey on the first-time screen
          (bottom nav — and its own reserved spacer — is hidden pre-tutorial,
          so this space would otherwise just be flat empty padding). Only
          rendered when there's actually room to spare: the compact
          pre-tutorial layout is sized to fit one screen with no scrolling,
          so this stays out of the way rather than competing with Start
          Journey for the last bit of vertical space on short viewports. */}
      {isPreTutorial && (
        <div
          className="relative hidden h-16 w-full shrink-0 overflow-hidden [@media(min-height:761px)]:block lg:h-20"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(8,12,24,0.35) 0%, rgba(4,7,15,0.75) 100%)" }}
          />
          {TAIL_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: "rgba(201,168,76,0.3)",
                animation: prefersReducedMotion
                  ? "none"
                  : `float ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                opacity: prefersReducedMotion ? 0.3 : undefined,
              }}
            />
          ))}
        </div>
      )}
      </>
      )}

      {/* Post-tutorial: compact fixed dashboard — see the numbered hierarchy
          comments below. FixedViewportPage renders with scrollable={false}
          for this branch (see the JSX prop below), so every section here is
          sized to actually fit within one 100dvh screen rather than relying
          on scroll as a fallback. */}
      {!isPreTutorial && (
      <>
      {/* 1. Compact header — crest, title, and player name in one tight
          row instead of the pre-tutorial hero band's own full section. */}
      <div className="w-full shrink-0 px-4 pt-1 pb-0.5 lg:px-8">
        <div className="flex items-center justify-center gap-2.5">
          <div className="relative h-10 w-10 flex-shrink-0 lg:h-14 lg:w-14">
            <div
              className="absolute inset-0 rounded-full blur-lg"
              style={{ background: "rgba(251,191,36,0.45)" }}
              aria-hidden="true"
            />
            <div className="h-full w-full overflow-hidden rounded-full">
              <SafeImage
                src={HOME_CREST_ART}
                alt="Chronicles of Faith"
                className="h-full w-full object-contain"
                style={{ filter: "brightness(1.15) saturate(1.08)" }}
              />
            </div>
          </div>

          <div className="min-w-0 text-left">
            <h1
              className="font-serif text-amber-50 tracking-wide leading-tight truncate"
              style={{
                fontSize: "clamp(1.05rem, 3.2vw, 1.4rem)",
                textShadow: "0 0 20px rgba(251,191,36,0.4), 0 1px 5px rgba(0,0,0,0.5)",
              }}
            >
              Chronicles of Faith
            </h1>
            <button
              onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
              className="mt-0.5 flex max-w-full items-center gap-1 text-[11px] text-amber-100/60 transition hover:text-amber-200"
            >
              {needsPlayerName(profile.playerName) ? (
                <span className="truncate">Playing as Guest Pilgrim</span>
              ) : (
                <span className="truncate">Playing as: {sanitizePlayerName(profile.playerName)}</span>
              )}
              <Pencil className="h-2.5 w-2.5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Continue — a quick, one-tap resume, shown only when there's
          actually a run to resume. Reuses handleContinueSaved exactly as
          the confirm dialog below does, so this is a shortcut to the same
          existing resume path, not a new one. Start Journey further down
          still goes through handleBeginRun + the confirm dialog, so a
          player can also choose to abandon this run and start fresh. */}
      {hasResumableRun && (
        <div className="w-full shrink-0 px-4 pb-1 lg:px-8">
          <button
            onClick={handleContinueSaved}
            className="mx-auto flex min-h-[44px] w-full max-w-md items-center justify-center gap-2 rounded-xl border-2 border-emerald-400/50 bg-emerald-900/25 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-900/40 active:scale-[0.99] motion-reduce:transition-none lg:max-w-[600px]"
          >
            <Swords className="h-4 w-4" />
            Continue Journey
          </button>
        </div>
      )}

      {/* 3-4. Easy/Normal/Hard selector + one compact selected-difficulty
          rule row (DifficultySelect's own compact mode). Unchanged gate:
          only returning players (post-tutorial) ever reach this branch. */}
      <div className="w-full shrink-0 px-4 pb-1 lg:px-8">
        <DifficultySelect compact />
      </div>

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

      {/* 5. Daily Prayer + Leaderboard — compact secondary tiles, side by
          side once there's room (361px+) and stacked as slim rows below
          that so neither tile gets cramped. Rows are shorter while stacked
          (44px, the touch-target floor) than while side by side (56px) —
          the narrowest phones need every pixel this can give back. */}
      <div className="w-full shrink-0 px-4 pb-1 lg:px-8">
        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-1 min-[361px]:grid-cols-2 min-[361px]:gap-2 lg:max-w-[600px]">
          {devotionPrayedToday ? (
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
                {profile.devotionStreak > 0 && (
                  <p className="text-[10px] text-amber-300/70">{profile.devotionStreak}-day streak</p>
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
          )}

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
              <SafeImage src={HOME_TROPHY_ART} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-xs font-bold text-amber-100">Leaderboard</p>
              <p className="text-[10px] text-amber-300">View Rankings →</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 6. Genesis horizon with scripture layered inside it — the
          flexible middle visual area, capped to the ~90-130px target so it
          can't grow past a compact dashboard's budget. */}
      <HomeGenesisAtmosphere overlayScripture />

      {/* 7. Start Journey — kept visually dominant (gold border, glow,
          large icon+text) despite the shorter target height. Sits in
          normal document flow directly above the bottom-nav clearance
          Home's own padding reserves — no sticky/absolute overlap.
          handleBeginRun is unchanged: it still opens the confirm dialog
          when a run/save exists, offering "Start New Run" as an explicit
          alternative to the quick Continue button above. */}
      <StickyActionDock className="w-full px-4 lg:px-8">
        <div className="relative mx-auto w-full max-w-md lg:max-w-[600px]">
          <div
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] animate-sacred-glow"
            aria-hidden="true"
          />
          <button
            onClick={handleBeginRun}
            className="relative min-h-[64px] w-full rounded-2xl border-2 border-amber-400/85 px-6 py-2 text-center font-serif font-bold text-amber-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 lg:min-h-[80px] lg:py-4"
            style={{
              fontSize: "clamp(1.1rem, 2vw, 1.6rem)",
              background: "linear-gradient(135deg, rgba(216,168,52,0.42) 0%, rgba(122,90,18,0.32) 100%)",
              boxShadow:
                "0 0 45px rgba(251,191,36,0.4), 0 0 75px rgba(251,191,36,0.12), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.3), inset 0 0 24px rgba(251,191,36,0.12)",
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
      </>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }} onClick={() => setShowConfirm(false)}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-serif text-amber-200 text-center mb-3">Start a New Run?</h2>
            <p className="text-amber-100/60 text-sm text-center mb-6">This will replace your saved Genesis run.</p>
            <div className="space-y-3">
              <button
                onClick={handleContinueSaved}
                className="w-full px-4 py-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-900/30 text-emerald-100 text-sm font-bold hover:bg-emerald-800/40 transition"
              >
                Continue Saved Run
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-800/60 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmNew}
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-red-100 text-sm font-bold hover:bg-red-800/40 transition"
                >
                  Start New Run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNamePrompt && (
        <PlayerNamePrompt onSave={handleNameSaved} onCancel={() => setShowNamePrompt(false)} />
      )}

      {showIntro && (
        <CinematicIntro onComplete={handleIntroFinished} />
      )}

      {showResume && (
        <ResumeModal
          onResume={() => { setShowResume(false); navigate("/play"); }}
          onAbandon={() => { setShowResume(false); endRun(); }}
        />
      )}
    </FixedViewportPage>
  );
}
