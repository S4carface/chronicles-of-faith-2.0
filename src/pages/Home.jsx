import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import ResumeModal from "@/components/game/ResumeModal";
import CinematicIntro from "@/components/game/CinematicIntro";
import FirstTimeHome from "@/components/home/FirstTimeHome";
import ReturningHome from "@/components/home/ReturningHome";
import { getSavedRoute } from "@/components/ScrollToTop";
import { validateDeck } from "@/game/deckRules";
import { sanitizePlayerName } from "@/game/nameValidator";
import { preloadImage } from "@/lib/imageAssets";
import { HOME_BACKGROUND_ART } from "@/lib/preloadHomeAssets";
import * as Sound from "@/game/soundManager";

// Home.jsx owns game state and handlers centrally — tutorial completion,
// saved/live run state, player name, Daily Prayer state, Start Journey /
// Continue / navigation behavior, and the cinematic intro state — then
// hands them to whichever of the two deliberate Home layouts actually
// applies: FirstTimeHome (before tutorial completion) or ReturningHome
// (after). The two layouts don't share a DOM shape or a pile of
// `profile.tutorialSeen ? ... : ...` Tailwind conditions — see their own
// files for why each is a dedicated composition instead.
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

  useEffect(() => {
    Snd.playMusic("menu");
    if (run && getSavedRoute() === "/play") {
      setShowResume(true);
    }
  }, []);

  // By the time Home mounts, App.jsx's own Home-critical preload race has
  // already awaited (or timed out on) this exact source — preloadImage's
  // module-level cache means this resolves immediately on a cache hit, or
  // picks up the still-in-flight load if the race hit its timeout first,
  // fading the CSS background from its gradient fallback once it lands.
  useEffect(() => {
    let isMounted = true;

    preloadImage(HOME_BACKGROUND_ART).then((loaded) => {
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

  const handleEditName = () => {
    Sound.sfx.click();
    setShowNamePrompt(true);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const devotionPrayedToday = profile.devotionReadDate === todayStr;
  // A run to resume — either live in memory or persisted as a story save.
  // Start Journey doubles as "continue" for it; the confirm dialog below
  // still offers a clean way to abandon it and start fresh.
  const hasResumableRun = Boolean(run || savedStoryExists);

  const sharedHomeProps = {
    playerName: profile.playerName,
    onEditName: handleEditName,
    devotionPrayedToday,
    devotionStreak: profile.devotionStreak,
    hasResumableRun,
    onBeginRun: handleBeginRun,
    storySaveError,
    savedStoryExists,
    homeBackgroundReady,
  };

  return (
    <>
      {profile.tutorialSeen ? (
        <ReturningHome {...sharedHomeProps} onContinueSaved={handleContinueSaved} />
      ) : (
        <FirstTimeHome {...sharedHomeProps} />
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
    </>
  );
}
