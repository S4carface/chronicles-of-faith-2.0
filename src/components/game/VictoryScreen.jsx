import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";
import { CARD_ART, GENESIS_COMPLETION_ART, PLACEHOLDER_ART, VICTORY_ART } from "@/data/art";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import AccountPrompt from "@/components/game/AccountPrompt";
import SafeImage from "@/components/ui/SafeImage";
import { preloadImages } from "@/lib/imageAssets";
import { submitBestScore } from "@/game/scoreManager";
import { recordRunWon, syncStatsToCloud } from "@/game/playerStats";
import { needsPlayerName } from "@/game/nameValidator";
import { generateFirstCompletionReward } from "@/game/deckRules";
import { getCardById } from "@/data/cards";

const STAGE_FADE_MS = 300;

export default function VictoryScreen() {
  const { run, endRun, profile, saveProfile, unlockAchievement, addCardToCollection, queueUnlock } = useGame();
  const navigate = useNavigate();
  const firstCompletion = useRef(!profile.genesisCompleted).current;
  const audioStarted = useRef(false);
  const [stage, setStage] = useState(1);
  const [stageVisible, setStageVisible] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [firstCompletionCard, setFirstCompletionCard] = useState(null);

  const completedDifficulty = run.difficulty || "easy";
  const difficultyMultipliers = { easy: 1, normal: 1.5, hard: 2 };
  const multiplier = difficultyMultipliers[completedDifficulty] || 1;
  const checkpointRetries = run.checkpointRetries || 0;
  const battleRetries = run.battleRetries || 0;
  const totalRetries = checkpointRetries + battleRetries;
  const penaltyPercent = Math.min(0.95, checkpointRetries * 0.15 + battleRetries * 0.05);
  const roomsPoints = run.roomsCleared * 100;
  const triviaPoints = (run.triviaCorrect || 0) * 50;
  const hpPoints = run.playerHp * 5;
  const goldPoints = run.gold * 2;
  const heroBonus = run.hero.id === "noah" ? 100 : 0;
  const baseScore = Math.max(0, roomsPoints + triviaPoints + hpPoints + goldPoints + heroBonus);

  useEffect(() => {
    let active = true;
    preloadImages([GENESIS_COMPLETION_ART.background, VICTORY_ART.crest]).finally(() => {
      if (active) setBackgroundReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!backgroundReady) return;
    const frame = requestAnimationFrame(() => setStageVisible(true));
    if (!audioStarted.current) {
      audioStarted.current = true;
      Sound.playGenesisCompletionCue("/audio/genesis_victory.mp3");
    }
    return () => {
      cancelAnimationFrame(frame);
      Sound.stopGenesisCompletionCue();
    };
  }, [backgroundReady]);

  useEffect(() => {
    const finalScore = Math.floor(baseScore * multiplier * (1 - penaltyPercent));
    setScore(finalScore);

    if (finalScore >= 500) unlockAchievement("low_score_champion");
    if (run.gold > 0) saveProfile({ gold: (profile.gold || 0) + run.gold });

    recordRunWon(finalScore, run.gold || 0, completedDifficulty, run.roomsCleared || 0);
    syncStatsToCloud();

    const progressionUpdates = {};
    if (firstCompletion) {
      progressionUpdates.genesisCompleted = true;
      const rewardId = generateFirstCompletionReward(Math.random);
      if (rewardId) {
        addCardToCollection(rewardId);
        setFirstCompletionCard(rewardId);
      }
      queueUnlock({ type: "chapter", name: "Genesis" });
    }
    if (["normal", "hard"].includes(completedDifficulty) && !profile.genesisNormalCompleted) {
      progressionUpdates.genesisNormalCompleted = true;
    }
    if (Object.keys(progressionUpdates).length) saveProfile(progressionUpdates);

    const submitName = needsPlayerName(profile.playerName) ? "Anonymous Pilgrim" : profile.playerName;
    submitScoreToCloud(submitName, finalScore);
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
      difficulty: completedDifficulty,
      result: "victory",
      retriesUsed: totalRetries,
      scorePenalty: penaltyPercent,
    });
    setSubmitted(result.success);
    setSubmitError(!result.success);
    setSubmitting(false);
  };

  const advanceStage = () => {
    if (!stageVisible || stage >= 3) return;
    Sound.sfx.click();
    setStageVisible(false);
    window.setTimeout(() => {
      setStage((current) => current + 1);
      requestAnimationFrame(() => setStageVisible(true));
    }, STAGE_FADE_MS);
  };

  const finishReturn = () => {
    Sound.sfx.click();
    endRun();
    navigate("/progress");
  };

  const handleReturn = () => {
    if (needsPlayerName(profile.playerName)) {
      setShowNamePrompt(true);
      return;
    }
    if (!profile.accountPromptSeen) {
      setShowAccountPrompt(true);
      return;
    }
    finishReturn();
  };

  const handleNameSaved = (name) => {
    setShowNamePrompt(false);
    if (name) submitScoreToCloud(name, score);
    if (!profile.accountPromptSeen) setShowAccountPrompt(true);
    else finishReturn();
  };

  const handleAccountDismiss = () => {
    setShowAccountPrompt(false);
    saveProfile({ accountPromptSeen: true });
    finishReturn();
  };

  if (!backgroundReady) {
    return <CompletionFallback label="Preparing your Genesis legacy…" />;
  }

  const rewardCard = firstCompletionCard ? getCardById(firstCompletionCard) : null;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#08101f] text-amber-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,.32),rgba(15,26,48,.78)_42%,#08101f_100%)]" />
      <img src={GENESIS_COMPLETION_ART.background} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08101f]/10 via-[#08101f]/45 to-[#08101f]/90" />
      <GoldParticles />

      <section
        className={`relative flex h-[100dvh] items-center justify-center px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-[calc(.75rem+env(safe-area-inset-top))] transition-opacity duration-300 ${stageVisible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex max-h-full w-full max-w-sm flex-col rounded-2xl border border-amber-300/45 bg-[#0f1a30]/88 p-4 text-center shadow-[0_0_38px_rgba(251,191,36,.2)] backdrop-blur-md">
          {stage === 1 && (
            <StageOne difficulty={completedDifficulty} score={score} onContinue={advanceStage} enabled={stageVisible} />
          )}
          {stage === 2 && (
            <StageTwo run={run} multiplier={multiplier} baseScore={baseScore} penaltyPercent={penaltyPercent} onContinue={advanceStage} enabled={stageVisible} />
          )}
          {stage === 3 && (
            <StageThree firstCompletion={firstCompletion} rewardCard={rewardCard} submitted={submitted} submitting={submitting} submitError={submitError} onRetry={() => submitScoreToCloud(profile.playerName, score)} onReturn={handleReturn} />
          )}
        </div>
      </section>

      {showNamePrompt && <PlayerNamePrompt onSave={handleNameSaved} endOfRun title="Save Your Name" subtitle="Add your name to this score so it appears on the leaderboard." />}
      {showAccountPrompt && <AccountPrompt onDismiss={handleAccountDismiss} />}
    </main>
  );
}

function CompletionFallback({ label }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,.22),#1A2744_42%,#08101f_100%)] px-5 text-amber-200">
      <div className="rounded-xl border border-amber-400/35 bg-[#0F1A30]/90 px-6 py-4 text-center shadow-[0_0_26px_rgba(251,191,36,.16)]">
        <span className="text-2xl text-amber-300/60">✦</span>
        <p className="mt-2 font-serif">{label}</p>
      </div>
    </div>
  );
}

function StageOne({ difficulty, score, onContinue, enabled }) {
  return (
    <>
      <p className="text-[9px] font-bold uppercase tracking-[.26em] text-amber-300/65">Book Complete</p>
      <div className="relative mx-auto my-3 h-28 w-28 overflow-hidden rounded-full border-2 border-amber-300/65 shadow-[0_0_38px_rgba(251,191,36,.42)]">
        <SafeImage src={VICTORY_ART.crest} alt="Genesis completion emblem" className="art-portrait" />
      </div>
      <h1 className="font-serif text-3xl leading-none text-amber-100">Genesis Complete</h1>
      <p className="mt-2 text-[10px] uppercase tracking-[.18em] text-amber-200/70">{difficulty} difficulty</p>
      <div className="my-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2">
        <p className="text-[9px] uppercase tracking-[.16em] text-amber-200/55">Final Score</p>
        <p className="font-serif text-4xl font-bold leading-none text-amber-200">{score}</p>
      </div>
      <blockquote className="mx-auto max-w-xs text-xs italic leading-snug text-amber-50/78">
        “Thus the heavens and the earth were completed in all their vast array.”
        <cite className="mt-1 block not-italic text-[10px] text-amber-300/65">Genesis 2:1</cite>
      </blockquote>
      <StageButton onClick={onContinue} disabled={!enabled}>Continue</StageButton>
    </>
  );
}

function StageTwo({ run, multiplier, baseScore, penaltyPercent, onContinue, enabled }) {
  const stats = [
    ["Rooms Cleared", run.roomsCleared],
    ["Trivia Correct", `${run.triviaCorrect || 0}/${run.triviaAttempted || 0}`],
    ["HP Remaining", `${run.playerHp}/${run.maxHp}`],
    ["Gold", run.gold],
    ["Difficulty", run.difficulty || "easy"],
    ["Multiplier", `${multiplier}×`],
  ];
  return (
    <>
      <p className="text-[9px] font-bold uppercase tracking-[.24em] text-amber-300/60">Stage 2 of 3</p>
      <h2 className="mt-1 font-serif text-2xl text-amber-100">Run Results</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-amber-400/20 bg-[#08101f]/55 px-2 py-2">
            <p className="text-xl font-bold leading-none capitalize text-amber-100">{value}</p>
            <p className="mt-1 text-[8px] uppercase tracking-[.12em] text-amber-200/55">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-left text-[10px] leading-relaxed text-amber-100/65">
        <p><span className="text-amber-200">Base score:</span> {baseScore}</p>
        <p><span className="text-amber-200">Difficulty:</span> ×{multiplier}{penaltyPercent > 0 ? ` • Retry penalty: −${Math.round(penaltyPercent * 100)}%` : " • No retry penalty"}</p>
      </div>
      <StageButton onClick={onContinue} disabled={!enabled}>Continue</StageButton>
    </>
  );
}

function StageThree({ firstCompletion, rewardCard, submitted, submitting, submitError, onRetry, onReturn }) {
  return (
    <>
      <p className="text-[9px] font-bold uppercase tracking-[.24em] text-amber-300/60">Stage 3 of 3</p>
      <h2 className="mt-1 font-serif text-2xl text-amber-100">Your Genesis Legacy</h2>
      <div className="mt-2 rounded-lg border border-amber-400/20 bg-[#08101f]/55 p-2.5">
        <h3 className="font-serif text-sm text-amber-200">Lesson Learned</h3>
        <p className="mt-1 text-[10px] text-amber-50/75">Genesis reveals God’s faithfulness through every trial and promise.</p>
        <p className="mt-1 text-[10px] italic text-amber-100/65">“You meant evil against me, but God meant it for good.” — Genesis 50:20</p>
        <p className="mt-1 text-[10px] text-amber-300/70">God can work through hardship to fulfill His promises.</p>
      </div>

      {firstCompletion && (
        <div className="mt-2 grid grid-cols-[1fr_1.25fr] gap-2">
          <div className="flex flex-col justify-center rounded-lg border border-amber-400/30 bg-amber-500/10 p-2">
            <p className="font-serif text-sm text-amber-200">Noah Unlocked</p>
            <p className="mt-1 text-[9px] leading-snug text-amber-100/55">Covenant Shield hero available.</p>
          </div>
          {rewardCard && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-900/20 p-2 text-left">
              <div className="relative h-14 w-11 flex-none overflow-hidden rounded border border-emerald-300/40 bg-[#0F1A30]">
                <SafeImage src={CARD_ART[rewardCard.id] || PLACEHOLDER_ART} alt={rewardCard.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-serif text-xs text-emerald-200">{rewardCard.name}</p>
                <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-300/70">Rare Reward</p>
                <p className="mt-1 text-[8px] text-amber-100/50">Added to collection</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 min-h-5 text-[9px]">
        {submitError ? <button onClick={onRetry} className="text-red-200 underline">Score save failed — retry</button> : submitted ? <span className="text-emerald-300/75">Score saved to leaderboard</span> : <span className="text-amber-100/50">{submitting ? "Saving score…" : "Score queued"}</span>}
      </div>
      <StageButton onClick={onReturn}>Return to World Map</StageButton>
    </>
  );
}

function StageButton({ children, ...props }) {
  return <button {...props} className="mt-3 min-h-11 w-full rounded-lg border-2 border-amber-400/55 bg-amber-600/20 px-5 py-2 font-serif text-sm text-amber-100 transition hover:bg-amber-600/35 disabled:pointer-events-none disabled:opacity-45">{children}</button>;
}

function GoldParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} className="absolute h-1 w-1 rounded-full bg-amber-300/45 shadow-[0_0_8px_rgba(251,191,36,.45)]" style={{ left: `${7 + ((index * 29) % 88)}%`, top: `${8 + ((index * 37) % 84)}%`, animation: `float ${4 + (index % 4)}s ease-in-out infinite`, animationDelay: `${(index % 6) * .35}s` }} />
      ))}
    </div>
  );
}
