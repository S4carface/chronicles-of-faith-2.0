import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, Cross, Sword, BookOpen, Calendar, Layers, Footprints, Route, Heart, CloudRain, Waves, Building2, Sparkles, Wand2, Trophy, ShieldCheck, Lock, Check } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ACHIEVEMENTS } from "@/data/achievements";
import { ENEMY_ART } from "@/data/art";
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

  const unlocked = new Set(profile.achievements);
  const unlockedCount = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length;

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
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                isUnlocked
                  ? "border-amber-400/50 bg-amber-500/10 shadow-md shadow-amber-500/10"
                  : "border-slate-600/40 bg-slate-900/50"
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border overflow-hidden ${
                isUnlocked
                  ? "border-amber-400/40"
                  : "border-slate-600/30 bg-slate-800/50"
              }`} style={isUnlocked ? { background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" } : {}}>
                {isUnlocked
                  ? (achievement.art && ENEMY_ART[achievement.art]
                    ? <img src={ENEMY_ART[achievement.art]} alt={achievement.name} className="w-full h-full object-cover" />
                    : <Icon className="w-6 h-6 text-amber-300" />)
                  : <Lock className="w-5 h-5 text-slate-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif ${isUnlocked ? "text-amber-200" : "text-slate-300"}`}>
                  {achievement.name}
                </h3>
                <p className={`text-xs ${isUnlocked ? "text-amber-100/60" : "text-slate-400"}`}>
                  {achievement.description}
                </p>
                {isUnlocked && (
                  <p className="text-amber-300/50 text-[10px] italic mt-1">"{achievement.verse}"</p>
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