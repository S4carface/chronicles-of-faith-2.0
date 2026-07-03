import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

export default function DefeatScreen() {
  const { run, endRun, addCardsToCollection, saveProfile, profile } = useGame();
  const navigate = useNavigate();

  // Save cards collected during the run even on defeat
  useEffect(() => {
    if (run.deck) {
      addCardsToCollection(run.deck);
    }
    // Save half the gold on defeat (consolation)
    if (run.gold > 0) {
      saveProfile({ gold: Math.floor((profile.gold || 0) + run.gold / 2) });
    }
  }, []);

  const handleReturnToMenu = () => {
    Sound.sfx.click();
    endRun();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, rgba(139,26,26,0.2) 0%, rgba(8,12,24,0.98) 50%)" }}>
      <div className="text-center max-w-lg">
        <div className="text-8xl mb-4 opacity-60">💀</div>
        <h1 className="text-4xl font-serif text-red-300 mb-4">You Have Fallen</h1>
        <p className="text-amber-100/70 text-lg mb-8 font-serif italic">
          "For all have sinned and fall short of the glory of God." — Romans 3:23
        </p>

        <div className="rounded-xl border border-red-500/20 p-4 mb-8" style={{ background: "rgba(15,10,5,0.4)" }}>
          <p className="text-amber-100/60 text-sm">Rooms Cleared: <span className="text-amber-200 font-bold">{run.roomsCleared}</span></p>
          <p className="text-amber-100/60 text-sm mt-1">Trivia Correct: <span className="text-amber-200 font-bold">{run.triviaCorrect}</span></p>
        </div>

        <div className="rounded-lg border border-emerald-400/20 bg-emerald-900/10 p-3 mb-6">
          <p className="text-emerald-300/60 text-xs">🃏 Cards found during this run have been saved to your collection</p>
        </div>

        <p className="text-amber-100/60 text-sm mb-6">
          Every run is different. The path branches, enemies vary, and blessings await those who persevere. Rise again and walk the path of faith.
        </p>

        <button
          onClick={handleReturnToMenu}
          className="px-8 py-3 rounded-lg border-2 border-amber-400/40 bg-amber-900/20 text-amber-200 font-serif text-lg hover:bg-amber-800/30 transition"
        >
          Return to Menu
        </button>
      </div>
    </div>
  );
}