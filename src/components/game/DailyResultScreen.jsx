import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Skull, Heart, Clock, Swords, BookOpen, Coins, Flame, BarChart3 } from "lucide-react";
import { useGame } from "@/game/GameContext";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import { submitBestScore, getDailyRank } from "@/game/scoreManager";
import * as Sound from "@/game/soundManager";

function calculateScore(result, playerHp, maxPlayerHp, turns, cardsPlayed, triviaCorrect) {
  if (result !== "victory") return 0;
  let score = 500;
  score += playerHp * 10;
  score -= turns * 20;
  score += cardsPlayed * 5;
  if (triviaCorrect) score += 100;
  return Math.max(0, score);
}

export default function DailyResultScreen() {
  const { run, profile, saveProfile, endRun } = useGame();
  const navigate = useNavigate();
  const submitted = useRef(false);
  const [finalScore, setFinalScore] = useState(0);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [rank, setRank] = useState(null);
  const [submitError, setSubmitError] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const calculatedScore = useRef(0);

  const result = run?.dailyResult;
  const dailyConfig = run?.dailyConfig;

  useEffect(() => {
    if (submitted.current || !result) return;

    const triviaCorrect = run.dailyTriviaCorrect;
    const score = calculateScore(result.result, result.playerHp, result.maxPlayerHp, result.turnNumber, result.cardsPlayed, triviaCorrect);
    setFinalScore(score);
    calculatedScore.current = score;

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const isFirstToday = profile.lastDailyDate !== todayStr;

    if (result.result === "victory" && isFirstToday) {
      const newStreak = profile.lastDailyDate === yesterday ? (profile.dailyStreak || 0) + 1 : 1;
      saveProfile({
        dailyStreak: newStreak,
        lastDailyDate: todayStr,
        gold: (profile.gold || 0) + (dailyConfig?.reward?.gold || 0),
      });
      setStreakUpdated(true);
    }

    const playerName = profile.playerName;
    if (!playerName) {
      setShowNamePrompt(true);
      return;
    }

    submitted.current = true;
    submitLeaderboard(playerName, score, result, triviaCorrect, todayStr, run.hero?.id || "adam");
  }, []);

  const handleNameSaved = (name) => {
    setShowNamePrompt(false);
    submitted.current = true;
    const todayStr = new Date().toISOString().slice(0, 10);
    submitLeaderboard(name, calculatedScore.current, result, run.dailyTriviaCorrect, todayStr, run.hero?.id || "adam");
  };

  const submitLeaderboard = async (playerName, score, result, triviaCorrect, todayStr, heroId) => {
    const submitResult = await submitBestScore({
      playerName: playerName,
      score: score,
      mode: "daily",
      dailyChallengeId: todayStr,
      hero: run.hero?.name || "Adam",
      chapter: dailyConfig?.theme?.title || "Daily Challenge",
      roomsCleared: result.result === "victory" ? 1 : 0,
      battlesWon: result.result === "victory" ? 1 : 0,
      triviaCorrect: triviaCorrect ? 1 : 0,
      difficulty: dailyConfig?.difficulty || "normal",
      result: result.result,
    });

    if (submitResult.success) {
      setScoreSubmitted(true);
      try {
        const playerRank = await getDailyRank(todayStr);
        setRank(playerRank);
      } catch {}
    } else {
      setSubmitError(true);
    }
  };

  const handleRetry = () => {
    setSubmitError(false);
    const todayStr = new Date().toISOString().slice(0, 10);
    submitLeaderboard(
      profile.playerName || "Anonymous Warrior",
      calculatedScore.current,
      result,
      run.dailyTriviaCorrect,
      todayStr,
      run.hero?.id || "adam"
    );
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => { endRun(); navigate("/"); }} className="px-6 py-3 border border-amber-400/40 rounded-lg text-amber-200">
          Return to Menu
        </button>
      </div>
    );
  }

  const isVictory = result.result === "victory";
  const triviaCorrect = run.dailyTriviaCorrect;
  const goldEarned = isVictory && streakUpdated ? (dailyConfig?.reward?.gold || 0) : 0;
  const playerNameDisplay = profile.playerName || "Anonymous Warrior";

  const handleReturn = () => {
    Sound.sfx.click();
    endRun();
    navigate("/");
  };

  const handleLeaderboard = () => {
    Sound.sfx.click();
    endRun();
    navigate("/leaderboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6" style={{ background: isVictory ? "radial-gradient(ellipse at center, #1A2A1A 0%, #0A0F1E 80%)" : "radial-gradient(ellipse at center, #2A1A1A 0%, #0A0F1E 80%)" }}>
      <div className="w-full max-w-md lg:max-w-lg text-center">
        <div className="mb-4 flex justify-center">
          {isVictory ? (
            <Trophy className="w-16 h-16 lg:w-20 lg:h-20 text-amber-300 animate-bounce" />
          ) : (
            <Skull className="w-16 h-16 lg:w-20 lg:h-20 text-red-400/60" />
          )}
        </div>

        <h1 className="font-serif text-4xl lg:text-5xl mb-2" style={{ color: isVictory ? "#fcd34d" : "#fca5a5" }}>
          {isVictory ? "Victory!" : "Defeated"}
        </h1>
        <p className="text-amber-100/50 text-xs lg:text-sm mb-2 italic">{dailyConfig?.theme?.title}</p>
        <p className="text-amber-100/40 text-[10px] lg:text-xs mb-6">Player: {playerNameDisplay}</p>

        <div className="rounded-xl border-2 border-amber-500/20 p-4 lg:p-6 mb-4 lg:mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide mb-1">Score</p>
          <p className="font-serif text-4xl lg:text-5xl text-amber-200 mb-4 lg:mb-6">{finalScore}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 lg:p-3 rounded-lg bg-slate-900/40">
              <Clock className="w-4 h-4 text-amber-300/60 flex-shrink-0" />
              <div className="text-left">
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Turns</p>
                <p className="text-amber-100 text-sm lg:text-base font-bold">{result.turnNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 lg:p-3 rounded-lg bg-slate-900/40">
              <Heart className="w-4 h-4 text-red-400/60 flex-shrink-0" />
              <div className="text-left">
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">HP Left</p>
                <p className="text-amber-100 text-sm lg:text-base font-bold">{result.playerHp}/{result.maxPlayerHp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 lg:p-3 rounded-lg bg-slate-900/40">
              <Swords className="w-4 h-4 text-orange-300/60 flex-shrink-0" />
              <div className="text-left">
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Cards</p>
                <p className="text-amber-100 text-sm lg:text-base font-bold">{result.cardsPlayed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 lg:p-3 rounded-lg bg-slate-900/40">
              <BookOpen className="w-4 h-4 text-emerald-300/60 flex-shrink-0" />
              <div className="text-left">
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Trivia</p>
                <p className={`text-sm lg:text-base font-bold ${triviaCorrect ? "text-emerald-300" : "text-amber-100/50"}`}>
                  {triviaCorrect ? "✓ Correct" : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-around mb-6">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-300" />
            <div className="text-left">
              <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Gold</p>
              <p className="text-amber-100 text-sm lg:text-base font-bold">+{goldEarned}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <div className="text-left">
              <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Streak</p>
              <p className="text-amber-100 text-sm lg:text-base font-bold">
                {profile.dailyStreak} {streakUpdated && <span className="text-emerald-300 text-xs">↑</span>}
              </p>
            </div>
          </div>
          {rank && (
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300/60" />
              <div className="text-left">
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase">Rank</p>
                <p className="text-amber-100 text-sm lg:text-base font-bold">#{rank}</p>
              </div>
            </div>
          )}
        </div>

        {submitError && (
          <div className="mb-4 p-4 rounded-lg border border-red-400/40 bg-red-900/20 text-center">
            <p className="text-red-300 text-sm mb-2">Score could not be saved. Check your connection and try again.</p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 text-sm font-bold hover:bg-amber-600/40 transition"
            >
              Retry Submission
            </button>
          </div>
        )}

        {scoreSubmitted && !submitError && (
          <p className="text-emerald-300 text-sm mb-4 text-center">Score saved to leaderboard.</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleReturn}
            className="w-full px-6 py-3 lg:py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-base lg:text-lg hover:bg-amber-600/40 transition"
          >
            Return to Menu
          </button>
          <button
            onClick={handleLeaderboard}
            className="w-full px-6 py-2.5 lg:py-3 rounded-lg border border-amber-400/30 bg-slate-900/40 text-amber-100/80 text-sm lg:text-base hover:bg-slate-800/60 transition flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            View Daily Leaderboard
          </button>
        </div>
      </div>

      {showNamePrompt && (
        <PlayerNamePrompt
          onSave={handleNameSaved}
          forceName
        />
      )}
    </div>
  );
}