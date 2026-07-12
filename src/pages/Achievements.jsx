import { ACHIEVEMENT_ART } from "@/data/art";
import React, { useEffect } from "react";
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
} from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ACHIEVEMENTS } from "@/data/achievements";
import * as Sound from "@/game/soundManager";

const ICON_MAP = {
  "star": Star, "cross": Cross, "sword": Sword, "book-open": BookOpen,
  "calendar": Calendar, "layers": Layers, "footprints": Footprints,
  "route": Route, "heart": Heart, "cloud-rain": CloudRain, "waves": Waves,
  "building-2": Building2, "sparkles": Sparkles, "wand-2": Wand2,
  "trophy": Trophy, "shield-check": ShieldCheck,
};

export default function Achievements() {
  const { profile, Sound: Snd } = useGame();
  useEffect(() => { Snd.playMusic("menu"); }, []);

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
          return (
            <div
              key={achievement.id}
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition ${
                isUnlocked
                  ? "border-amber-400/50 bg-amber-500/10 shadow-md shadow-amber-500/10"
                  : "border-slate-600/40 bg-slate-900/50"
              }`}
            >
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border overflow-hidden ${
                isUnlocked
                  ? "border-amber-400/40"
                  : "border-slate-600/30 bg-slate-800/50"
              }`} style={isUnlocked ? { background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" } : {}}>
                {isUnlocked ? (
  ACHIEVEMENT_ART[achievement.art] ? (
    <img
      src={ACHIEVEMENT_ART[achievement.art]}
      alt={achievement.name}
      className="w-full h-full object-cover"
      draggable={false}
    />
  ) : (
    <Icon className="w-6 h-6 text-amber-300" />
  )
) : (
  <Lock className="w-5 h-5 text-slate-400" />
)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif font-semibold tracking-wide ${   isUnlocked ? "text-amber-200" : "text-slate-300" }`}>
                  {achievement.name}
                </h3>
                <p className={`text-xs ${isUnlocked ? "text-amber-100/60" : "text-slate-400"}`}>
                  {achievement.description}
                </p>
                {isUnlocked && (
  <>
    <p className="text-amber-300/50 text-[10px] italic mt-1">
      "{achievement.verse}"
    </p>

    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1">
  <Coins className="w-3.5 h-3.5 text-amber-300" />

  <span className="text-amber-200 text-[11px] font-bold">
    +{achievement.goldReward || 0} Gold
  </span>
</div>
  </>
)}
              </div>
              {isUnlocked && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}