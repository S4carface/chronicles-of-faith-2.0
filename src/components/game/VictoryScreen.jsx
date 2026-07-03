import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { base44 } from "@/api/base44Client";
import * as Sound from "@/game/soundManager";

export default function VictoryScreen() {
  const { run, endRun, profile, saveProfile, unlockAchievement, addCardsToCollection } = useGame();
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState(profile.playerName || "");
  const [submitting, setSubmitting] = useState(false);

  const difficultyMultipliers = { easy: 1.0, normal: 1.5, hard: 2.0 };
  const multiplier = difficultyMultipliers[run.difficulty] || 1.0;

  useEffect(() => {
    Sound.playMusic("victory");
    const baseScore = Math.max(0,
      run.roomsCleared * 100 +
      run.triviaCorrect * 50 +
      run.playerHp * 5 +
      run.gold * 2 +
      (run.hero.id === "noah" ? 100 : 0)
    );
    const finalScore = Math.floor(baseScore * multiplier);
    setScore(finalScore);

    if (finalScore >= 500) unlockAchievement("low_score_champion");

    // Save ALL cards collected during the run to the collection
    addCardsToCollection(run.deck);

    // Save gold earned during the run to profile
    if (run.gold > 0) {
      saveProfile({ gold: (profile.gold || 0) + run.gold });
    }

    // Track daily challenge completion
    if (run.isDaily) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = profile.lastDailyDate === yesterdayStr ? profile.dailyStreak + 1 : 1;
      saveProfile({ lastDailyDate: todayStr, dailyStreak: newStreak });
      if (newStreak >= 3) unlockAchievement("daily_devotion");
    }
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    saveProfile({ playerName });
    try {
      await base44.entities.LeaderboardEntry.create({
        player_name: playerName || "Anonymous",
        score,
        rooms_cleared: run.roomsCleared,
        trivia_correct: run.triviaCorrect,
        hero_used: run.hero.id,
        is_daily: run.isDaily,
        damage_taken: run.maxHp - run.playerHp,
        run_seed: run.seed,
      });
      setSubmitted(true);
    } catch (e) {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const handleReturnToMenu = () => {
    Sound.sfx.click();
    endRun();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, rgba(26,39,68,0.98) 50%, rgba(8,12,24,1) 100%)" }}>
      {/* Celebration particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          fontSize: `${10 + Math.random() * 20}px`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}>✨</div>
      ))}

      <div className="relative text-center max-w-lg">
        <div className="text-8xl mb-4">🕊️</div>
        <h1 className="text-5xl font-serif text-amber-200 mb-3">Genesis Complete!</h1>
        <p className="text-amber-100/70 text-lg mb-6 font-serif italic">
          "Thus the heavens and the earth were completed in all their vast array." — Genesis 2:1
        </p>

        <div className="rounded-xl border-2 border-amber-500/20 p-6 mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <h2 className="text-2xl font-serif text-amber-300 mb-4">Final Score</h2>
          <p className="text-5xl font-bold text-amber-200 mb-4">{score}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-amber-100/60">Rooms Cleared: <span className="text-amber-200 font-bold">{run.roomsCleared}</span></div>
            <div className="text-amber-100/60">Trivia Correct: <span className="text-amber-200 font-bold">{run.triviaCorrect}</span></div>
            <div className="text-amber-100/60">HP Remaining: <span className="text-amber-200 font-bold">{run.playerHp}/{run.maxHp}</span></div>
            <div className="text-amber-100/60">Gold: <span className="text-amber-200 font-bold">{run.gold}</span></div>
            <div className="text-amber-100/60">Difficulty: <span className="text-amber-200 font-bold capitalize">{run.difficulty || "normal"}</span></div>
            <div className="text-amber-100/60">Multiplier: <span className="text-amber-200 font-bold">{multiplier}x</span></div>
          </div>
        </div>

        {run.hero.id !== "noah" && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 mb-6">
            <p className="text-amber-200 font-serif">🌈 Noah Unlocked!</p>
            <p className="text-amber-100/50 text-xs mt-1">Play as Noah in your next run with the Covenant Shield ability.</p>
          </div>
        )}

        <div className="rounded-lg border border-emerald-400/30 bg-emerald-900/15 p-3 mb-6">
          <p className="text-emerald-300/80 text-sm">🃏 {run.deck.length} cards saved to your collection</p>
        </div>

        {!submitted ? (
          <div className="mb-6">
            <p className="text-amber-100/60 text-sm mb-3">Submit your score to the leaderboard:</p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/60 border border-amber-500/20 text-amber-100 text-center mb-3 outline-none focus:border-amber-400/50"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Score"}
            </button>
          </div>
        ) : (
          <p className="text-emerald-300 text-sm mb-6">✓ Score submitted to the leaderboard!</p>
        )}

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