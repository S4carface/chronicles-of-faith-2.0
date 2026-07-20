import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swords, Pencil, Sun, Trophy } from "lucide-react";
import { useGame } from "@/game/GameContext";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import ResumeModal from "@/components/game/ResumeModal";
import DifficultySelect from "@/components/game/DifficultySelect";
import CinematicIntro from "@/components/game/CinematicIntro";
import FixedViewportPage from "@/components/FixedViewportPage";
import StickyActionDock from "@/components/StickyActionDock";
import { HOME_ART, MENU_ART } from "@/data/art";
import { getSavedRoute } from "@/components/ScrollToTop";
import { validateDeck } from "@/game/deckRules";
import { sanitizePlayerName, needsPlayerName } from "@/game/nameValidator";
import { loadStoryRun } from "@/game/storyRunSave";
import { preloadImage } from "@/lib/imageAssets";
import * as Sound from "@/game/soundManager";

const HOME_BACKGROUND = "/images/home/home-celestial.png";

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [homeBackgroundReady, setHomeBackgroundReady] = useState(false);
  const savedRunInfo = useMemo(() => {
    if (!savedStoryExists) return null;
    const saved = loadStoryRun();
    if (!saved) return null;
    const nodeType = saved.currentNode?.type;
    const roomType = nodeType === "mystery" ? saved.currentNode?.mysteryType : nodeType;
    const roomLabels = { battle: "Battle", treasure: "Treasure", divine: "Divine Encounter", story: "Story Choice", mystery: "Mystery", boss: "Boss Battle", rest: "Campfire" };
    return {
      stage: (saved.roomsCleared || 0) + 1,
      difficulty: saved.difficulty || "normal",
      playerHp: saved.playerHp || 0,
      maxHp: saved.maxHp || 0,
      heroName: saved.hero?.name || "Adam",
      roomLabel: roomLabels[roomType] || "Exploring",
    };
  }, [savedStoryExists]);

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

  const handleResumeSavedRun = () => {
    Sound.sfx.click();
    if (resumeStoryRun()) {
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

  const TOTAL_CARDS = 29;
  const TOTAL_ACHIEVEMENTS = 17;
  const todayStr = new Date().toISOString().slice(0, 10);
  const devotionPrayedToday = profile.devotionReadDate === todayStr;
  const battleDoneToday = profile.lastDailyDate === todayStr;
  const battleStatus = battleDoneToday ? "✓ Done" : (profile.dailyStreak > 0 ? `${profile.dailyStreak}-day streak` : "New today");
  const prayerStatus = devotionPrayedToday ? "✓ Prayed" : (profile.devotionStreak > 0 ? `${profile.devotionStreak}-day streak` : null);
  const primaryItems = [
    { label: "Daily Battle", art: MENU_ART.daily, path: "/daily", desc: "One shared battle. Compete for the best score.", status: battleStatus },
    { label: "My Cards & Deck", art: MENU_ART.collection, path: "/collection", desc: "Build your deck and view collected cards", status: `${profile.collectedCards.length}/${TOTAL_CARDS}` },
    { label: "Leaderboard", art: MENU_ART.leaderboard, path: "/leaderboard", desc: "Compare scores with other players", status: null },
    { label: "Faith Progress", art: MENU_ART.progress, path: "/faith-progress", desc: "Track your Bible learning progress", status: null },
    { label: "My Progress", art: MENU_ART.progress, path: "/journey", desc: "Stats, streaks, and Bible learning", status: null },
  ];
  const secondaryItems = [
  {
    label: "Codex",
    art: MENU_ART.collection,
    path: "/codex",
    desc: "View every enemy you've discovered",
    status: `${profile.encounteredEnemies?.length || 0} found`,
  },
  {
    label: "Marketplace",
    art: MENU_ART.shop,
    path: "/shop",
    desc: "Buy card packs with earned gold.",
    status: `${profile.gold || 0} gold`,
  },
  {
    label: "Progress Map",
    art: MENU_ART.progress,
    path: "/progress",
    desc: "Genesis to Revelation",
    status: "Genesis active",
  },
  {
    label: "Achievements",
    art: MENU_ART.achievements,
    path: "/achievements",
    desc: "Sacred milestones",
    status: `${profile.achievements.length}/${TOTAL_ACHIEVEMENTS}`,
  },
  {
    label: "Settings",
    art: MENU_ART.settings,
    path: "/settings",
    desc: "Audio & player options",
    status: null,
  },
];
  return (
    <FixedViewportPage
      style={{
        backgroundColor: "#0A0F1E",
        backgroundImage: homeBackgroundReady
          ? `linear-gradient(180deg, rgba(5, 12, 29, 0.28) 0%, rgba(7, 15, 34, 0.48) 42%, rgba(4, 10, 24, 0.7) 100%), url("${HOME_BACKGROUND}")`
          : "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)",
        backgroundPosition: "center 18%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
      contentClassName="px-4 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(5.75rem+env(safe-area-inset-bottom)+0.5rem)] lg:pb-16"
    >
      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
          animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}

      {/* Hero / Title — compact */}
      <div className="relative text-center mb-3">
        <div className="flex justify-center mb-1.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/30 shadow-lg shadow-amber-400/20 animate-icon-float" style={{ background: "#0F1A30" }}>
            <img src={HOME_ART.cross} alt="Chronicles of Faith" className="art-portrait" />
          </div>
        </div>
        <h1 className="font-serif text-amber-200 tracking-wide leading-tight" style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          Chronicles of Faith
        </h1>
        <p className="text-amber-100/45 mt-1 font-serif italic tracking-wide" style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)" }}>
          A Biblical Roguelike Journey
        </p>
        <div className="w-24 h-px mx-auto mt-1.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* Player name row — subtle guest-mode indicator or name display */}
      <button
        onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
        className="flex items-center gap-1.5 text-amber-100/50 hover:text-amber-200 transition text-xs lg:text-sm mb-2"
      >
        {needsPlayerName(profile.playerName) ? (
          <>
            <span className="text-amber-100/40">Playing as Guest Pilgrim</span>
          </>
        ) : (
          <>
            <span>Playing as: {sanitizePlayerName(profile.playerName)}</span>
          </>
        )}
        <Pencil className="w-3 h-3" />
      </button>

      {/* Resume prompt */}
      {run && (
        <div className="relative w-full max-w-md lg:max-w-2xl mb-4 p-4 rounded-xl border-2 border-emerald-400/40 bg-emerald-900/20 animate-fade-in">
          <p className="text-emerald-200 font-serif text-sm text-center mb-3">Continue your Genesis run?</p>
          <div className="flex gap-3">
            <button
              onClick={() => { Sound.sfx.click(); navigate("/play"); }}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-600/20 text-emerald-100 font-bold text-sm hover:bg-emerald-600/40 transition"
            >
              Continue
            </button>
            <button
              onClick={() => { Sound.sfx.click(); setShowConfirm(true); }}
              className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-amber-900/20 text-amber-100/80 text-sm hover:bg-amber-800/30 transition"
            >
              Start New Run
            </button>
          </div>
        </div>
      )}

      {/* Continue Saved Run — shown when no active run in memory but a story save exists */}
      {!run && savedStoryExists && savedRunInfo && (
        <div className="relative w-full max-w-md lg:max-w-[600px] mb-3 animate-fade-in">
          <button
            onClick={handleResumeSavedRun}
            className="relative w-full px-8 py-4 lg:py-5 rounded-xl border-2 border-emerald-400/60 text-emerald-100 font-serif font-bold text-center hover:bg-emerald-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
            style={{ background: "linear-gradient(135deg, rgba(20,80,40,0.25) 0%, rgba(10,60,30,0.2) 100%)" }}
          >
            <span className="flex items-center justify-center gap-2">
              <Swords className="w-5 h-5" />
              Continue
            </span>
          </button>
          <button
            onClick={() => { Sound.sfx.click(); setShowConfirm(true); }}
            className="relative w-full mt-2 px-8 py-2.5 rounded-xl border border-amber-400/30 text-amber-100/70 font-serif text-sm text-center hover:bg-amber-900/20 transition"
          >
            Start New Run
          </button>
        </div>
      )}

{/* Difficulty appears only after the first tutorial is completed */}
{profile.tutorialSeen && (
  <div className="relative w-full max-w-md lg:max-w-[600px] mb-2 lg:mb-3">
    <DifficultySelect />
  </div>
)}

      {/* Story save corruption notice */}
      {storySaveError && !savedStoryExists && (
        <div className="w-full max-w-md mb-3 p-3 rounded-lg border border-red-500/30 bg-red-900/20 text-center animate-fade-in">
          <p className="text-red-200/80 text-xs">
            Saved run could not be restored. Please start a new run.
          </p>
        </div>
      )}

      {/* Daily Prayer — compact status strip once completed, full invite otherwise */}
      {devotionPrayedToday ? (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative flex w-full max-w-md items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-900/15 px-3 py-2 mb-3 transition hover:bg-emerald-900/25 lg:max-w-[600px]"
        >
          <span className="font-serif text-sm font-semibold text-emerald-300">
            ✓ Daily Prayer Completed
          </span>
          {profile.devotionStreak > 0 && (
            <span className="ml-auto flex-shrink-0 text-[10px] text-amber-300/60">
              {profile.devotionStreak}-day streak
            </span>
          )}
        </Link>
      ) : (
        <Link
          to="/daily-prayer"
          onClick={() => Sound.sfx.click()}
          className="relative w-full max-w-md lg:max-w-[600px] mb-3 overflow-hidden rounded-xl border-2 border-sky-300/45 bg-sky-900/15 px-4 py-3 lg:px-6 lg:py-5 shadow-lg shadow-sky-400/10 transition-all duration-300 hover:border-sky-200/70 hover:bg-sky-900/25 active:scale-[0.99]"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-sky-300/35 bg-sky-900/25 lg:h-16 lg:w-16">
              <Sun className="h-6 w-6 text-sky-200 lg:h-8 lg:w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <p className="min-w-[9rem] flex-1 font-serif text-lg font-bold leading-snug text-sky-100 lg:text-xl">
                  Take a Quiet Moment
                </p>

                <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-sky-300/30 bg-sky-950/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-sky-200">
                  New Today
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-amber-100/55 lg:text-sm">
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


{/* Compact secondary action */}
<Link
  to="/leaderboard"
  onClick={() => Sound.sfx.click()}
  className="relative flex w-full max-w-md items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-slate-900/30 px-4 py-2.5 transition hover:border-amber-400/40 hover:bg-amber-500/5 lg:max-w-[600px]"
>
  <Trophy className="h-4 w-4 text-amber-300/70" />
  <span className="font-serif text-sm text-amber-100">Leaderboard</span>
</Link>

<p className="relative text-amber-100/40 text-[10px] mt-3 font-serif italic text-center max-w-md">
  "In the beginning, God created the heavens and the earth." — Genesis 1:1
</p>

      {/* Flexible filler — keeps the sticky action pinned to the bottom of the
          viewport even when the content above doesn't fill it */}
      <div className="flex-1" aria-hidden="true" />

      <StickyActionDock className="mx-auto w-full max-w-md lg:max-w-[600px]">
        <button
          onClick={handleBeginRun}
          className="relative w-full px-8 py-3.5 lg:py-5 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif font-bold text-center hover:bg-amber-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-500/20"
          style={{
            fontSize: "clamp(1.1rem, 2vw, 1.75rem)",
            background: "linear-gradient(135deg, rgba(180,140,40,0.25) 0%, rgba(120,90,20,0.2) 100%)",
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Swords className="w-5 h-5" />
            Start Journey
          </span>
        </button>
      </StickyActionDock>

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
