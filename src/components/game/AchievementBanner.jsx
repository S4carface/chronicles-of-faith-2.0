import React, { useEffect } from "react";
import { Star, Cross, Sword, BookOpen, Calendar, Layers, Footprints, Route, Heart, CloudRain, Waves, Building2, Sparkles, Wand2, Trophy, ShieldCheck } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ACHIEVEMENT_MAP } from "@/data/achievements";
import { ENEMY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const ICON_MAP = {
  "star": Star, "cross": Cross, "sword": Sword, "book-open": BookOpen,
  "calendar": Calendar, "layers": Layers, "footprints": Footprints,
  "route": Route, "heart": Heart, "cloud-rain": CloudRain, "waves": Waves,
  "building-2": Building2, "sparkles": Sparkles, "wand-2": Wand2,
  "trophy": Trophy, "shield-check": ShieldCheck,
};

export default function AchievementBanner() {
  const { achievementQueue, dismissAchievement, profile } = useGame();

  useEffect(() => {
    if (achievementQueue.length > 0) {
      const timer = setTimeout(() => dismissAchievement(), 4000);
      return () => clearTimeout(timer);
    }
  }, [achievementQueue, dismissAchievement]);

  if (achievementQueue.length === 0) return null;
  const achievement = ACHIEVEMENT_MAP[achievementQueue[0]];
  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div
        className="flex items-center gap-4 px-6 py-4 rounded-xl border-2 shadow-2xl max-w-md"
        style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(26,39,68,0.95) 50%, rgba(139,26,26,0.2) 100%)",
          borderColor: "rgba(201,168,76,0.6)",
        }}
      >
        <div className="w-12 h-12 rounded-lg border border-amber-400/50 overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
          {achievement.art && ENEMY_ART[achievement.art]
            ? <img src={ENEMY_ART[achievement.art]} alt={achievement.name} className="w-full h-full object-cover" />
            : (() => { const Icon = ICON_MAP[achievement.icon] || Star; return <Icon className="w-6 h-6 text-amber-300" />; })()}
        </div>
        <div>
          <p className="text-amber-300/60 text-xs font-bold uppercase tracking-wider">Achievement Unlocked!</p>
          <h3 className="text-amber-100 font-serif text-lg">{achievement.name}</h3>
          <p className="text-amber-100/50 text-xs mt-0.5">{achievement.description}</p>
          <p className="text-amber-300/40 text-[10px] italic mt-1">"{achievement.verse}"</p>
        </div>
      </div>
    </div>
  );
}