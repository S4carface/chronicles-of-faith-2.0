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
const START_JOURNEY_FRAME_ART = "/images/home/start-journey-frame.webp";

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
  // first. The trophy and Start Journey frame crop are lower-priority
  // decoration and intentionally left to load on their own.
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
      contentClassName="pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:pb-[7rem]"
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

      {/* 1. Full-width dark hero band — 2. crest, 3. title, 4. subtitle.
          The darkening gradient sits on this full-bleed wrapper (no side
          padding) so it spans edge to edge; the crest/title/subtitle
          content is centered inside its own padded inner div. */}
      <section className="relative w-full pt-3 pb-7 lg:pb-9 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 95% at 50% 15%, rgba(5,9,18,0.82) 0%, rgba(5,9,18,0.48) 55%, transparent 92%)",
          }}
          aria-hidden="true"
        />

        <div className="relative px-4 lg:px-8">
          <div className="flex justify-center mb-2">
            <div className="relative h-16 w-16 lg:h-20 lg:w-20">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(201,168,76,0.4)" }}
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
            className="font-serif text-amber-100 tracking-wide leading-tight"
            style={{
              fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
              textShadow: "0 0 34px rgba(201,168,76,0.4), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Chronicles of Faith
          </h1>
          <p
            className="text-amber-100/60 mt-1 font-serif italic tracking-wide"
            style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            A Biblical Roguelike Journey
          </p>
          <div className="w-24 h-px mx-auto mt-2 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </div>
      </section>

      {/* 5. Player identity row */}
      <div className="w-full px-4 lg:px-8 flex justify-center mb-6">
        <button
          onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
          className="flex items-center gap-1.5 text-amber-100/50 hover:text-amber-200 transition text-xs lg:text-sm"
        >
          {needsPlayerName(profile.playerName) ? (
            <span className="text-amber-100/40">Playing as Guest Pilgrim</span>
          ) : (
            <span>Playing as: {sanitizePlayerName(profile.playerName)}</span>
          )}
          <Pencil className="w-3 h-3" />
        </button>
      </div>

      {/* 6. "Take a Quiet Moment" — part of the full post-tutorial home menu,
          so it stays hidden for first-time players to keep their first
          impression focused on Start Journey. */}
      {profile.tutorialSeen && (
        <div className="w-full px-4 lg:px-8 flex justify-center mb-4">
          {devotionPrayedToday ? (
            <Link
              to="/daily-prayer"
              onClick={() => Sound.sfx.click()}
              className="relative flex w-full max-w-md items-center gap-2 rounded-lg border border-emerald-400/35 px-3 py-2 transition hover:border-emerald-300/50 lg:max-w-[600px]"
              style={{ background: "linear-gradient(135deg, rgba(6,45,36,0.55) 0%, rgba(8,12,24,0.78) 100%)" }}
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
                <span className="flex-shrink-0 whitespace-nowrap text-[10px] text-amber-300/70">
                  {profile.devotionStreak}-day streak
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/daily-prayer"
              onClick={() => Sound.sfx.click()}
              className="relative w-full max-w-md lg:max-w-[600px] overflow-hidden rounded-xl border-2 border-sky-300/45 bg-sky-900/15 px-4 py-3 lg:px-6 lg:py-5 shadow-lg shadow-sky-400/10 transition-all duration-300 hover:border-sky-200/70 hover:bg-sky-900/25 active:scale-[0.99]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-sky-300/35 bg-sky-900/25 lg:h-16 lg:w-16">
                  <Sun className="h-6 w-6 text-sky-200 lg:h-8 lg:w-8" />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Title and badge each get their own row on narrow
                      screens (flex-wrap) so the badge never squeezes the
                      title text into a clip — it simply wraps below. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-serif text-lg font-bold leading-snug text-sky-100 lg:text-xl">
                      Take a Quiet Moment
                    </p>
                    <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-sky-300/30 bg-sky-950/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-sky-200">
                      New Today
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-amber-100/55 lg:text-sm">
                    A short scripture, reflection, and prayer for today.
                  </p>

                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs font-semibold text-sky-200 lg:text-sm">
                      Pray Now →
                    </span>

                    {profile.devotionStreak > 0 && (
                      <span className="text-[10px] text-amber-300/60 lg:text-xs">
                        {profile.devotionStreak}-day prayer streak
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* 7. Leaderboard — also part of the full post-tutorial home menu. */}
      {profile.tutorialSeen && (
        <div className="w-full px-4 lg:px-8 flex justify-center mb-2">
          <Link
            to="/leaderboard"
            onClick={() => Sound.sfx.click()}
            className="relative flex min-h-[76px] w-full max-w-md items-center gap-3 rounded-lg border border-amber-500/25 px-3 py-2 transition hover:border-amber-400/40 lg:max-w-[600px]"
            style={{ background: "rgba(8,12,24,0.78)" }}
          >
            <div className="relative h-12 w-12 flex-shrink-0 sm:h-14 sm:w-14">
              <SafeImage src={HOME_TROPHY_ART} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-serif text-sm font-semibold text-amber-100">Leaderboard</p>
              <p className="text-[11px] text-amber-100/80">View current rankings</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-300/70" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* 8. Scripture / Genesis horizon — atmospheric centerpiece, always
          shown (including before the tutorial) so the first impression
          still carries the game's sacred tone, not just an empty gap. */}
      <HomeGenesisAtmosphere showJourneyHint={!profile.tutorialSeen} />

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
          {/* Decorative crest cropped from the top of start-journey-frame.webp —
              only the ornamental arch/shield band (roughly the top ~10% of the
              tall source image) is ever visible here. The source also contains
              a baked-in "Start your Journey" nameplate much further down; a
              short, fixed-height, overflow-hidden window with object-position:
              top keeps that text entirely outside the crop regardless of
              viewport width, so the live button text below is never duplicated. */}
          <div className="relative mx-auto h-10 w-full overflow-hidden rounded-t-xl sm:h-12" aria-hidden="true">
            <SafeImage
              src={START_JOURNEY_FRAME_ART}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: "top center" }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 35%, rgba(8,12,24,0.92) 100%)" }}
            />
          </div>
          <button
            onClick={handleBeginRun}
            className="relative w-full px-8 py-3.5 lg:py-5 rounded-xl border-2 border-amber-400/75 bg-amber-600/20 text-amber-50 font-serif font-bold text-center hover:bg-amber-600/40 transition-all duration-300 hover:scale-[1.02]"
            style={{
              fontSize: "clamp(1.1rem, 2vw, 1.75rem)",
              background: "linear-gradient(135deg, rgba(200,158,45,0.3) 0%, rgba(130,98,22,0.24) 100%)",
              boxShadow:
                "0 0 40px rgba(251,191,36,0.32), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.25), inset 0 0 24px rgba(251,191,36,0.1)",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Swords className="w-5 h-5" />
              {hasResumableRun ? "Continue Journey" : "Start Journey"}
            </span>
          </button>
        </div>
      </StickyActionDock>

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
