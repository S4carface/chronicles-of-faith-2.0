import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skull } from "lucide-react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { recordGoldEarned, recordRunProgress, syncStatsToCloud } from "@/game/playerStats";
import AccountPrompt from "@/components/game/AccountPrompt";

const DEFEAT_MESSAGING = {
  easy: "Learn the path. Try again.",
  normal: "You may continue from your checkpoint, but your final score will be reduced.",
  hard: "Hard Mode is unforgiving. Begin again and walk the path of faith.",
};

export default function DefeatScreen() {
  const { run, endRun, retryBattle, retryFromCheckpoint, addCardsToCollection, saveProfile, profile } = useGame();
  const navigate = useNavigate();
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const difficulty = run.difficulty || "normal";

  // Save cards collected during the run — but only when the run truly ends.
  // Hard: ends immediately on defeat. Easy/Normal: deferred until player chooses to end.
  const finalizeDefeatConsolation = () => {
    if (run.deck) {
      addCardsToCollection(run.deck);
    }
    if (run.gold > 0) {
      const consolation = Math.floor(run.gold / 2);
      saveProfile({ gold: Math.floor((profile.gold || 0) + consolation) });
      recordGoldEarned(consolation);
    }
  };

  useEffect(() => {
    Sound.playMusic("defeat");
    Sound.sfx.defeat();
    // Hard mode: run is over — save consolation immediately.
    if (difficulty === "hard") {
      finalizeDefeatConsolation();
    }
    recordRunProgress(run.roomsCleared || 0);
    syncStatsToCloud();

    if (!profile.accountPromptSeen) {
      setTimeout(() => setShowAccountPrompt(true), 1500);
    }
  }, []);

  const handleRetry = () => {
    Sound.sfx.click();
    if (difficulty === "easy") {
      retryBattle();
    } else if (difficulty === "normal") {
      retryFromCheckpoint();
    }
  };

  const handleEndRun = () => {
    Sound.sfx.click();
    // Easy/Normal: save consolation now (Hard already saved on mount)
    if (difficulty !== "hard") {
      finalizeDefeatConsolation();
    }
    endRun();
    navigate("/");
  };

  const handleReturnToMenuClick = () => {
    // Easy/Normal: confirm before ending the run (checkpoint will be lost)
    if (difficulty !== "hard") {
      setShowEndConfirm(true);
      Sound.sfx.click();
    } else {
      handleEndRun();
    }
  };

  const handleAccountDismiss = () => {
    setShowAccountPrompt(false);
    saveProfile({ accountPromptSeen: true });
  };

  const retryLabel = difficulty === "easy" ? "Retry Battle" : "Retry From Checkpoint";
  const endLabel = difficulty === "hard" ? "Return to Menu" : "End Run & Return to Menu";
  const retriesUsed = (run.checkpointRetries || 0) + (run.battleRetries || 0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, rgba(139,26,26,0.2) 0%, rgba(8,12,24,0.98) 50%)" }}>
      <div className="text-center max-w-lg">
        <div className="mb-4 flex justify-center">
          <Skull className="w-20 h-20 text-red-400/60" />
        </div>
        <h1 className="text-4xl font-serif text-red-300 mb-4">You Have Fallen</h1>
        <p className="text-amber-100/70 text-lg mb-8 font-serif italic">
          "For all have sinned and fall short of the glory of God." — Romans 3:23
        </p>

        <div className="rounded-xl border border-red-500/20 p-4 mb-6" style={{ background: "rgba(15,10,5,0.4)" }}>
          <p className="text-amber-100/60 text-sm">Rooms Cleared: <span className="text-amber-200 font-bold">{run.roomsCleared}</span></p>
          <p className="text-amber-100/60 text-sm mt-1">Trivia Correct: <span className="text-amber-200 font-bold">{run.triviaCorrect}</span></p>
          {retriesUsed > 0 && (
            <p className="text-amber-100/60 text-sm mt-1">
              {run.checkpointRetries > 0 ? "Checkpoints" : "Retries"} Used: <span className="text-amber-200 font-bold">{retriesUsed}</span>
            </p>
          )}
        </div>

        {difficulty === "hard" && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-900/10 p-3 mb-6">
            <p className="text-emerald-300/60 text-xs">Cards found during this run have been saved to your collection</p>
          </div>
        )}

        <p className="text-amber-100/70 text-base mb-8 font-serif">
          {DEFEAT_MESSAGING[difficulty]}
        </p>

        <div className="space-y-3">
          {difficulty !== "hard" && (
            <button
              onClick={handleRetry}
              className="w-full px-8 py-3 rounded-lg border-2 border-emerald-400/60 bg-emerald-700/30 text-emerald-100 font-serif text-lg hover:bg-emerald-700/50 transition active:scale-95"
            >
              {retryLabel}
            </button>
          )}
          <button
            onClick={handleReturnToMenuClick}
            className="w-full px-8 py-3 rounded-lg border-2 border-amber-400/40 bg-amber-900/20 text-amber-200 font-serif text-lg hover:bg-amber-800/30 transition active:scale-95"
          >
            {endLabel}
          </button>
        </div>

        {difficulty === "hard" && (
          <p className="text-amber-100/40 text-xs mt-6">Hard Mode has no checkpoints.</p>
        )}
      </div>

      {/* End run confirmation — Easy/Normal only */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-red-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <h2 className="text-lg font-serif text-red-200 text-center mb-3">End this run?</h2>
            <p className="text-amber-100/60 text-sm text-center mb-6">Your checkpoint will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEndConfirm(false); Sound.sfx.click(); }}
                className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-800/60 transition"
              >
                Keep Playing
              </button>
              <button
                onClick={handleEndRun}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-red-100 text-sm font-bold hover:bg-red-800/40 transition"
              >
                End Run
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountPrompt && (
        <AccountPrompt onDismiss={handleAccountDismiss} />
      )}
    </div>
  );
}