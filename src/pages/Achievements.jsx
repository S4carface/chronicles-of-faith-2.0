import { ACHIEVEMENT_ART } from "@/data/art";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Cross,
  Sword,
  BookOpen,
  Calendar,
  Layers,
  Footprints,
  Route,
  Heart,
  CloudRain,
  Waves,
  Building2,
  Sparkles,
  Wand2,
  Trophy,
  ShieldCheck,
  Lock,
  Check,
  Coins,
  X,
} from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ACHIEVEMENTS } from "@/data/achievements";
import { getStats } from "@/game/playerStats";
import * as Sound from "@/game/soundManager";

const ICON_MAP = {
  "star": Star, "cross": Cross, "sword": Sword, "book-open": BookOpen,
  "calendar": Calendar, "layers": Layers, "footprints": Footprints,
  "route": Route, "heart": Heart, "cloud-rain": CloudRain, "waves": Waves,
  "building-2": Building2, "sparkles": Sparkles, "wand-2": Wand2,
  "trophy": Trophy, "shield-check": ShieldCheck,
};
function getAchievementProgress(achievementId, stats) {
  switch (achievementId) {
    case "first_victory": {
      const current = Math.min(stats.runsCompleted || 0, 1);

      return {
        current,
        target: 1,
        label: `${current} / 1 Genesis run`,
      };
    }

    case "daily_devotion": {
      const current = Math.min(stats.dailyChallengesCompleted || 0, 3);

      return {
        current,
        target: 3,
        label: `${current} / 3 Daily Battles`,
      };
    }

    case "low_score_champion": {
      const current = Math.max(0, stats.bestScore || 0);

      return {
        current: Math.min(current, 500),
        target: 500,
        label: `${current} / 500 score`,
      };
    }

    default:
      return null;
  }
}

export default function Achievements() {
const { profile, Sound: Snd } = useGame();
const stats = getStats();

const [selectedAchievement, setSelectedAchievement] = useState(null);

useEffect(() => {
  Snd.playMusic("menu");
}, []);
  const PREVIEW_ALL_ACHIEVEMENTS = true;

const unlocked = PREVIEW_ALL_ACHIEVEMENTS
  ? new Set(ACHIEVEMENTS.map((achievement) => achievement.id))
  : new Set(profile.achievements);

const unlockedCount = ACHIEVEMENTS.filter((achievement) =>
  unlocked.has(achievement.id)
).length;

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">Achievements</h1>
          <p className="text-amber-100/60 text-xs mt-1">{unlockedCount} / {ACHIEVEMENTS.length} unlocked</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = unlocked.has(achievement.id);
const Icon = ICON_MAP[achievement.icon] || Star;
const progress = getAchievementProgress(achievement.id, stats);

const progressPercent = progress
  ? Math.min(100, Math.round((progress.current / progress.target) * 100))
  : 0;    
  return (
<button
  type="button"
  key={achievement.id}
  onClick={() => {
    Sound.sfx.click();
    setSelectedAchievement(achievement);
  }}
  className={`w-full text-left flex items-center gap-4 p-5 rounded-xl border-2 transition active:scale-[0.99] ${                isUnlocked
                  ? "border-amber-400/50 bg-amber-500/10 shadow-md shadow-amber-500/10"
                  : "border-slate-600/40 bg-slate-900/50"
              }`}
            >
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border overflow-hidden ${
                isUnlocked
                  ? "border-amber-400/40"
                  : "border-slate-600/30 bg-slate-800/50"
              }`} style={isUnlocked ? { background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" } : {}}>
{ACHIEVEMENT_ART[achievement.art] ? (
  <div className="relative h-full w-full">
<img
  src={ACHIEVEMENT_ART[achievement.art]}
  alt={achievement.name}
  className={`h-full w-full object-cover transition select-none pointer-events-none ${
    isUnlocked
      ? ""
      : "grayscale opacity-30 blur-[0.5px]"
  }`}
  draggable={false}
  onDragStart={(event) => event.preventDefault()}
  onContextMenu={(event) => event.preventDefault()}
  style={{
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
  }}
/>

    {!isUnlocked && (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400/30 bg-slate-950/75">
          <Lock className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    )}
  </div>
) : isUnlocked ? (
  <Icon className="h-6 w-6 text-amber-300" />
) : (
  <Lock className="h-5 w-5 text-slate-400" />
)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif font-semibold tracking-wide ${   isUnlocked ? "text-amber-200" : "text-slate-300" }`}>
                  {achievement.name}
                </h3>
                <p className={`text-xs ${isUnlocked ? "text-amber-100/60" : "text-slate-400"}`}>
                  {achievement.description}
                </p>
{isUnlocked ? (
  <>
    <p className="mt-1 text-[10px] italic text-amber-300/50">
      "{achievement.verse}"
    </p>

    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1">
      <Coins className="h-3.5 w-3.5 text-amber-300" />

      <span className="text-[11px] font-bold text-amber-200">
        +{achievement.goldReward || 0} Gold Earned
      </span>
    </div>
  </>
) : (
  <div className="mt-2 inline-flex items-center gap-1.5 text-slate-400/75">
    <Coins className="h-3.5 w-3.5" />

    <span className="text-[10px] font-semibold">
      Reward: {achievement.goldReward || 0} Gold
    </span>
  </div>
)}
{!isUnlocked && progress && (
  <div className="mt-3">
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className="text-[10px] text-slate-300/70">
        Progress
      </span>

      <span className="text-[10px] font-semibold text-amber-200/75">
        {progress.label}
      </span>
    </div>

    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-300 transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  </div>
)}
              </div>
{isUnlocked && (
  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center">
    <Check className="w-4 h-4 text-emerald-400" />
  </div>
)}
</button>
          );
        })}
      </div>

      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedAchievement(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-detail-title"
        >
<div
  className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-400/35 bg-[#101a30] shadow-2xl animate-fade-in"
  style={{
    animation: "achievementModalOpen 180ms ease-out",
  }}
  onClick={(event) => event.stopPropagation()}
>
            <button
              type="button"
              onClick={() => {
                Sound.sfx.click();
                setSelectedAchievement(null);
              }}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/45 bg-slate-950/90 text-amber-100 shadow-lg shadow-black/40 backdrop-blur-sm transition hover:border-amber-200/70 hover:bg-slate-900 active:scale-90"
              aria-label="Close achievement details"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="aspect-square w-full overflow-hidden rounded-t-2xl bg-slate-950">
              {ACHIEVEMENT_ART[selectedAchievement.art] ? (
                <div className="relative h-full w-full">
<img
  src={ACHIEVEMENT_ART[selectedAchievement.art]}
  alt={selectedAchievement.name}
  className={`h-full w-full object-cover select-none pointer-events-none ${
    unlocked.has(selectedAchievement.id)
      ? ""
      : "grayscale opacity-45"
  }`}
  draggable={false}
  onDragStart={(event) => event.preventDefault()}
  onContextMenu={(event) => event.preventDefault()}
  style={{
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
  }}
/>

                  {!unlocked.has(selectedAchievement.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300/30 bg-slate-950/80">
                        <Lock className="h-7 w-7 text-slate-200" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Trophy className="h-16 w-16 text-amber-300" />
                </div>
              )}
            </div>

            <div className="p-6 text-center">
        <div className="mb-3 flex justify-center">
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
      unlocked.has(selectedAchievement.id)
        ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
        : "border-slate-500/35 bg-slate-800/40 text-slate-300"
    }`}
  >
    {unlocked.has(selectedAchievement.id) ? (
      <>
        <Check className="h-3.5 w-3.5" />
        Unlocked
      </>
    ) : (
      <>
        <Lock className="h-3.5 w-3.5" />
        Locked
      </>
    )}
  </span>
</div>

              <h2
                id="achievement-detail-title"
                className="font-serif text-2xl text-amber-200"
              >
                {selectedAchievement.name}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-amber-100/65">
                {selectedAchievement.description}
              </p>

              <div className="my-5 h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />

              <p className="font-serif text-sm italic text-amber-300/60">
                “{selectedAchievement.verse}”
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2">
                <Coins className="h-4 w-4 text-amber-300" />

                <span className="text-sm font-bold text-amber-200">
                  {unlocked.has(selectedAchievement.id)
                    ? `+${selectedAchievement.goldReward || 0} Gold Earned`
                    : `Reward: ${selectedAchievement.goldReward || 0} Gold`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  Sound.sfx.click();
                  setSelectedAchievement(null);
                }}
                className="mt-6 min-h-12 w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 font-serif text-amber-100 transition hover:bg-amber-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}