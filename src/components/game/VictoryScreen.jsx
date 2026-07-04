import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/lib/AuthContext";
import * as Sound from "@/game/soundManager";
import { VICTORY_ART } from "@/data/art";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import AccountPrompt from "@/components/game/AccountPrompt";
import { submitBestScore } from "@/game/scoreManager";
import { recordRunWon, syncStatsToCloud } from "@/game/playerStats";
import { needsPlayerName } from "@/game/nameValidator";
import { getCurrentUser } from "@/game/cloudSync";
import { generateFirstCompletionReward } from "@/game/deckRules";
import { getCardById } from "@/data/cards";
import GenesisCompletionCelebration from "@/components/game/GenesisCompletionCelebration";

export default function VictoryScreen() {
  const { run, endRun, profile, saveProfile, unlockAchievement, addCardToCollection, queueUnlock } = useGame();
  const { navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [firstCompletionCard, setFirstCompletionCard] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const difficultyMultipliers = { easy: 1.0, normal: 1.5, hard: 2.0 };
  const multiplier = difficultyMultipliers[run.difficulty] || 1.0;

  useEffect(() => {
    Sound.playMusic("victory");
    Sound.sfx.victory();
    // Debug-safe check: read trivia stats directly from the active run state
    const triviaCorrect = run.triviaCorrect || 0;
    const triviaAttempted = run.triviaAttempted || 0;
    if (triviaAttempted > 0 || triviaCorrect > 0) {
      console.log("[Trivia Debug] Final run stats — correct:", triviaCorrect, "attempted:", triviaAttempted, "wrong:", run.triviaWrong || 0);
    }
    // Scoring: 50 bonus points per correct trivia answer (no points for unanswered)
    const baseScore = Math.max(0,
      run.roomsCleared * 100 +
      triviaCorrect * 50 +
      run.playerHp * 5 +
      run.gold * 2 +
      (run.hero.id === "noah" ? 100 : 0)
    );
    const finalScore = Math.floor(baseScore * multiplier);
    setScore(finalScore);

    if (finalScore >= 500) unlockAchievement("low_score_champion");

    if (run.gold > 0) {
      saveProfile({ gold: (profile.gold || 0) + run.gold });
    }

    if (run.isDaily) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = profile.lastDailyDate === yesterdayStr ? profile.dailyStreak + 1 : 1;
      saveProfile({ lastDailyDate: todayStr, dailyStreak: newStreak });
      if (newStreak >= 3) unlockAchievement("daily_devotion");
    }

    // Record lifetime stats (story run won)
    recordRunWon(finalScore, run.gold || 0, run.difficulty || "normal", run.roomsCleared || 0);
    syncStatsToCloud();

    // First Genesis completion: guarantee a strong rare card (never legendary)
    if (!profile.genesisCompleted) {
      const rewardId = generateFirstCompletionReward(Math.random);
      if (rewardId) {
        addCardToCollection(rewardId);
        setFirstCompletionCard(rewardId);
      }
      saveProfile({ genesisCompleted: true });
      queueUnlock({ type: 'chapter', name: 'Genesis' });
      setShowCelebration(true);
    }

    // Always submit the score (as Anonymous Pilgrim if no name set).
    // If the player has no name, offer to add one after submission.
    const submitName = needsPlayerName(profile.playerName) ? "Anonymous Pilgrim" : profile.playerName;
    submitScoreToCloud(submitName, finalScore);
    if (needsPlayerName(profile.playerName)) {
      setShowNamePrompt(true);
    }

    // Gentle account prompt for guests (after a delay)
    if (!profile.accountPromptSeen) {
      getCurrentUser().then((u) => {
        if (!u) setTimeout(() => setShowAccountPrompt(true), 2000);
      });
    }
  }, []);

  const submitScoreToCloud = async (name, scoreToSubmit) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    const result = await submitBestScore({
      playerName: name || "Anonymous Pilgrim",
      score: scoreToSubmit,
      mode: "story",
      hero: run.hero?.name || "Adam",
      chapter: "Genesis",
      roomsCleared: run.roomsCleared,
      battlesWon: run.roomsCleared,
      triviaCorrect: run.triviaCorrect,
      difficulty: run.difficulty || "normal",
      result: "victory",
    });
    if (result.success) {
      setSubmitted(true);
    } else {
      setSubmitError(true);
    }
    setSubmitting(false);
  };

  const handleRetry = () => {
    submitScoreToCloud(profile.playerName, score);
  };

  const handleNameSaved = (name) => {
    setShowNamePrompt(false);
    if (name) {
      // Re-submit with the new name to update the existing record
      submitScoreToCloud(name, score);
    }
    // If name is null, score already saved as Anonymous Pilgrim
  };

  const handleAccountDismiss = () => {
    setShowAccountPrompt(false);
    saveProfile({ accountPromptSeen: true });
  };

  const handleAccountSignIn = () => {
    setShowAccountPrompt(false);
    saveProfile({ accountPromptSeen: true });
    navigateToLogin();
  };

  const handleReturnToMenu = () => {
    Sound.sfx.click();
    endRun();
    navigate("/");
  };

  const nextUnlockLabel = firstCompletionCard
    ? `${getCardById(firstCompletionCard)?.name || "Rare Card"} — First Completion Reward`
    : (run.hero.id !== "noah" ? "Noah — Covenant Shield Hero" : null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, rgba(26,39,68,0.98) 50%, rgba(8,12,24,1) 100%)" }}>
      {/* Celebration particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${3 + Math.random() * 4}px`,
          height: `${3 + Math.random() * 4}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(201,168,76,${0.3 + Math.random() * 0.4})`,
          boxShadow: `0 0 ${4 + Math.random() * 6}px rgba(201,168,76,0.4)`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }} />
      ))}

      <div className="relative text-center max-w-lg">
        {/* Victory crest */}
        <div className="mb-4 flex justify-center">
          <img src={VICTORY_ART.crest} alt="Victory" className="w-24 h-24 object-cover rounded-full border-2 border-amber-400/50 shadow-xl shadow-amber-400/30 animate-icon-float" />
        </div>
        <h1 className="text-5xl font-serif text-amber-200 mb-3">Genesis Complete!</h1>
        <p className="text-amber-100/70 text-lg mb-6 font-serif italic">
          "Thus the heavens and the earth were completed in all their vast array." — Genesis 2:1
        </p>

        <div className="rounded-xl border-2 border-amber-500/20 p-6 mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <h2 className="text-2xl font-serif text-amber-300 mb-4">Final Score</h2>
          <p className="text-5xl font-bold text-amber-200 mb-4">{score}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-amber-100/60">Rooms Cleared: <span className="text-amber-200 font-bold">{run.roomsCleared}</span></div>
            <div className="text-amber-100/60">Trivia Correct: <span className="text-amber-200 font-bold">{run.triviaCorrect || 0} / {run.triviaAttempted || 0}</span></div>
            <div className="text-amber-100/60">HP Remaining: <span className="text-amber-200 font-bold">{run.playerHp}/{run.maxHp}</span></div>
            <div className="text-amber-100/60">Gold: <span className="text-amber-200 font-bold">{run.gold}</span></div>
            <div className="text-amber-100/60">Difficulty: <span className="text-amber-200 font-bold capitalize">{run.difficulty || "normal"}</span></div>
            <div className="text-amber-100/60">Multiplier: <span className="text-amber-200 font-bold">{multiplier}x</span></div>
          </div>
        </div>

        {/* Lesson Learned */}
        <div className="rounded-xl border-2 border-amber-500/20 p-5 mb-6 text-center" style={{ background: "rgba(15,26,48,0.6)" }}>
          <h3 className="text-lg font-serif text-amber-300 mb-3">Lesson Learned</h3>
          <p className="text-amber-100/80 text-sm mb-3 leading-relaxed">
            From Creation to the Flood, from Abraham's faith to Joseph's forgiveness,
            Genesis reveals God's faithfulness through every trial and promise.
          </p>
          <p className="text-amber-100/70 text-sm italic mb-2">
            "You meant evil against me, but God meant it for good." — Genesis 50:20
          </p>
          <p className="text-amber-300/80 text-xs">
            Lesson: God works through ordinary people and difficult circumstances to fulfill His promises.
          </p>
        </div>

        {run.hero.id !== "noah" && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 mb-6">
            <p className="text-amber-200 font-serif">Noah Unlocked!</p>
            <p className="text-amber-100/50 text-xs mt-1">Play as Noah in your next run with the Covenant Shield ability.</p>
          </div>
        )}

        {firstCompletionCard && (
          <div className="rounded-xl border-2 border-emerald-400/50 bg-emerald-900/20 p-5 mb-6 text-center animate-fade-in">
            <h3 className="text-lg font-serif text-emerald-300 mb-2">First Completion Reward!</h3>
            <p className="text-amber-100/70 text-sm mb-3">You earned a guaranteed Rare card for your first Genesis victory:</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/40 bg-emerald-900/30">
              <span className="text-2xl">{getCardById(firstCompletionCard)?.icon}</span>
              <span className="font-serif text-emerald-200">{getCardById(firstCompletionCard)?.name}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-300/70 px-1.5 py-0.5 rounded bg-emerald-900/40">Rare</span>
            </div>
            <p className="text-amber-100/50 text-xs mt-2">Added to your collection.</p>
          </div>
        )}

        <div className="rounded-lg border border-emerald-400/30 bg-emerald-900/15 p-3 mb-6">
          <p className="text-emerald-300/80 text-sm">Run complete — {run.deck.length} cards in your run deck</p>
        </div>

        {showNamePrompt && (
          <PlayerNamePrompt
            onSave={handleNameSaved}
            endOfRun
            title="Add Your Name"
            subtitle="Add your name to this score so it appears on the leaderboard."
          />
        )}

        {!showNamePrompt && (
          submitError ? (
            <div className="mb-6">
              <p className="text-red-300 text-sm mb-3">Score could not be saved. Check your connection and try again.</p>
              <button
                onClick={handleRetry}
                disabled={submitting}
                className="px-6 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 text-sm font-bold hover:bg-amber-600/40 transition disabled:opacity-40"
              >
                {submitting ? "Retrying..." : "Retry Submission"}
              </button>
            </div>
          ) : submitted
            ? <p className="text-emerald-300 text-sm mb-6">Score saved to leaderboard.</p>
            : <p className="text-amber-100/60 text-sm mb-6">Saving score to leaderboard...</p>
        )}

        <button
          onClick={handleReturnToMenu}
          className="px-8 py-3 rounded-lg border-2 border-amber-400/40 bg-amber-900/20 text-amber-200 font-serif text-lg hover:bg-amber-800/30 transition"
        >
          Return to Menu
        </button>
      </div>

      {showAccountPrompt && (
        <AccountPrompt
          onDismiss={handleAccountDismiss}
          onSignIn={handleAccountSignIn}
        />
      )}

      {showCelebration && (
        <GenesisCompletionCelebration
          score={score}
          stats={{
            roomsCleared: run.roomsCleared,
            triviaCorrect: run.triviaCorrect || 0,
            triviaAttempted: run.triviaAttempted || 0,
            playerHp: run.playerHp,
            maxHp: run.maxHp,
            gold: run.gold,
            difficulty: (run.difficulty || "normal"),
          }}
          nextUnlock={nextUnlockLabel}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}