import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Headphones, CheckCircle2, Target, Layers, Users,
  Trophy, Flame, Compass, Sparkles,
} from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getStats, syncStatsToCloud } from "@/game/playerStats";
import { HEROES } from "@/data/heroes";
import { CARDS } from "@/data/cards";
import { HOME_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const TOTAL_GENESIS_STAGES = 8;
const TOTAL_CARDS = CARDS.length;
const TOTAL_HEROES = HEROES.length;

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
      <div className={`flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-md flex items-center justify-center ${accent || "bg-amber-900/30"}`}>
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-200/80" />
      </div>
      <div className="min-w-0">
        <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-amber-100 text-sm lg:text-lg font-bold font-serif leading-none">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, barClass }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2.5 lg:h-3 bg-slate-900/60 rounded-full border border-amber-500/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barClass || "bg-gradient-to-r from-amber-600 to-amber-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function getGenesisMessage(pct) {
  if (pct === 0) return "Begin your journey through Genesis!";
  if (pct <= 25) return "You're taking your first steps of faith.";
  if (pct <= 50) return "Keep going — the path unfolds before you.";
  if (pct <= 75) return "You're well on your way through Genesis.";
  if (pct < 100) return "Almost there — finish strong!";
  return "Genesis complete! You walked with God.";
}

export default function ScriptureMastery() {
  const { profile } = useGame();
  const navigate = useNavigate();
  const [stats, setStats] = useState(() => getStats());

  useEffect(() => {
    Sound.playMusic("menu");
    setStats(getStats());
    syncStatsToCloud();
  }, []);

  const cardsCollected = Object.keys(profile.cardCollection || {}).length;
  const heroesUnlocked = 1 + (profile.genesisCompleted ? 1 : 0);
  const triviaAccuracy = stats.triviaAnswered > 0
    ? Math.round((stats.triviaCorrect / stats.triviaAnswered) * 100)
    : 0;
  const bestRoomsCleared = stats.bestRoomsCleared || 0;
  const genesisPct = Math.min(100, Math.round((bestRoomsCleared / TOTAL_GENESIS_STAGES) * 100));
  const bestScores = stats.bestScoreByDifficulty || { easy: 0, normal: 0, hard: 0 };

  const difficulties = [
    { key: "easy", label: "Easy", icon: "🌱", accent: "bg-emerald-900/30" },
    { key: "normal", label: "Normal", icon: "⚔️", accent: "bg-amber-700/30" },
    { key: "hard", label: "Hard", icon: "🔥", accent: "bg-red-900/30" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          onClick={() => { Sound.sfx.click(); navigate("/"); }}
          className="flex items-center gap-1.5 text-amber-100/60 hover:text-amber-200 transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Menu
        </button>
      </div>

      <div className="w-full max-w-2xl text-center mb-5">
        <div className="flex justify-center mb-2">
          <img src={HOME_ART.cross} alt="Scripture Mastery" className="w-14 h-14 object-cover rounded-full border-2 border-amber-400/30 shadow-lg shadow-amber-400/20 animate-icon-float" />
        </div>
        <h1 className="font-serif text-amber-200 tracking-wide" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          Scripture Mastery
        </h1>
        <p className="text-amber-100/45 mt-1 font-serif italic text-sm lg:text-base">Your Bible learning journey through Genesis</p>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        {/* Genesis Progress — hero card */}
        <div className="rounded-xl border-2 border-amber-400/25 p-4 lg:p-5" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.6) 0%, rgba(15,26,48,0.6) 100%)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
              <h3 className="font-serif text-amber-200 text-sm lg:text-lg uppercase tracking-wide">Genesis Journey</h3>
            </div>
            <span className="text-amber-200 text-lg lg:text-2xl font-bold font-serif">{genesisPct}%</span>
          </div>

          {/* Stage markers */}
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: TOTAL_GENESIS_STAGES }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-6 rounded-sm flex items-center justify-center text-[8px] lg:text-[10px] font-bold transition-all ${
                  i < bestRoomsCleared
                    ? "bg-amber-500/40 text-amber-100 border border-amber-400/50"
                    : i === bestRoomsCleared
                    ? "bg-amber-500/20 text-amber-200/60 border border-amber-400/30 animate-pulse"
                    : "bg-slate-900/40 text-amber-100/20 border border-amber-500/10"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <p className="text-amber-100/50 text-xs lg:text-sm text-center">
            Stage {Math.min(bestRoomsCleared, TOTAL_GENESIS_STAGES)} of {TOTAL_GENESIS_STAGES}
          </p>
          <p className="text-amber-300/60 text-[10px] lg:text-xs text-center mt-1 font-serif italic">
            {getGenesisMessage(genesisPct)}
          </p>
        </div>

        {/* Bible Learning */}
        <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
            <h3 className="font-serif text-amber-200 text-sm lg:text-lg uppercase tracking-wide">Bible Learning</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-3">
            <StatCard icon={BookOpen} label="Verses Encountered" value={stats.versesRead} />
            <StatCard icon={Headphones} label="Passages Listened" value={stats.passagesListened} accent="bg-sky-900/30" />
            <StatCard icon={CheckCircle2} label="Trivia Correct" value={stats.triviaCorrect} accent="bg-emerald-900/30" />
            <StatCard icon={Target} label="Trivia Answered" value={stats.triviaAnswered} />
          </div>
          {/* Accuracy bar */}
          <div className="p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide">Trivia Accuracy</span>
              <span className="text-emerald-300 text-sm lg:text-base font-bold font-serif">{triviaAccuracy}%</span>
            </div>
            <ProgressBar value={triviaAccuracy} max={100} barClass="bg-gradient-to-r from-emerald-600 to-emerald-400" />
          </div>
        </div>

        {/* Discovery */}
        <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
            <h3 className="font-serif text-amber-200 text-sm lg:text-lg uppercase tracking-wide">Discovery</h3>
          </div>
          <div className="space-y-2.5">
            {/* Cards discovered */}
            <div className="p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-200/80" />
                  <span className="text-amber-100/50 text-[10px] lg:text-xs">Cards Discovered</span>
                </div>
                <span className="text-amber-200 text-sm lg:text-base font-bold font-serif">{cardsCollected} / {TOTAL_CARDS}</span>
              </div>
              <ProgressBar value={cardsCollected} max={TOTAL_CARDS} barClass="bg-gradient-to-r from-sky-600 to-sky-400" />
            </div>
            {/* Heroes unlocked */}
            <div className="p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-200/80" />
                  <span className="text-amber-100/50 text-[10px] lg:text-xs">Heroes Unlocked</span>
                </div>
                <span className="text-amber-200 text-sm lg:text-base font-bold font-serif">{heroesUnlocked} / {TOTAL_HEROES}</span>
              </div>
              <ProgressBar value={heroesUnlocked} max={TOTAL_HEROES} barClass="bg-gradient-to-r from-purple-600 to-purple-400" />
            </div>
          </div>
        </div>

        {/* Best Scores by Difficulty */}
        <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
            <h3 className="font-serif text-amber-200 text-sm lg:text-lg uppercase tracking-wide">Best Scores</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {difficulties.map((d) => (
              <div key={d.key} className={`flex flex-col items-center gap-1 p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10`}>
                <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-md flex items-center justify-center ${d.accent}`}>
                  <span className="text-base lg:text-lg">{d.icon}</span>
                </div>
                <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none">{d.label}</p>
                <p className="text-amber-100 text-sm lg:text-lg font-bold font-serif leading-none">
                  {bestScores[d.key] ? bestScores[d.key].toLocaleString() : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Devotion & Runs — compact row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5 flex flex-col items-center" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
            <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-lg flex items-center justify-center bg-orange-900/30 mb-1">
              <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" />
            </div>
            <p className="text-amber-100 text-lg lg:text-2xl font-bold font-serif leading-none">{profile.devotionStreak || 0}</p>
            <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none text-center mt-1">Daily Prayer Streak</p>
          </div>
          <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5 flex flex-col items-center" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
            <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-lg flex items-center justify-center bg-emerald-900/30 mb-1">
              <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-amber-200/80" />
            </div>
            <p className="text-amber-100 text-lg lg:text-2xl font-bold font-serif leading-none">{stats.runsCompleted}</p>
            <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none text-center mt-1">Runs Completed</p>
          </div>
        </div>
      </div>

      <p className="text-amber-100/30 text-[10px] mt-6 font-serif italic text-center max-w-md">
        "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
      </p>
    </div>
  );
}