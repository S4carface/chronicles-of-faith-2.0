import React from "react";
import { BookOpen, Heart, Sun, ArrowDown } from "lucide-react";
import { getDailyReflection } from "@/data/dailyReflections";
import { recordVerseRead } from "@/game/playerStats";
import * as Sound from "@/game/soundManager";

export default function DailyDevotion({ onSkipToBattle }) {
  const reflection = getDailyReflection();

  return (
    <div className="w-full mb-4 lg:mb-6 rounded-xl border-2 border-amber-400/20 p-4 lg:p-6 animate-fade-in" style={{ background: "rgba(15,26,48,0.6)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-300/60" />
          <h3 className="font-serif text-amber-200 text-base lg:text-lg">Daily Devotion</h3>
        </div>
        <button
          onClick={() => { Sound.sfx.click(); onSkipToBattle?.(); }}
          className="flex items-center gap-1 text-amber-300/50 hover:text-amber-200 text-[10px] lg:text-xs transition"
        >
          Skip to Battle <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* Today's Verse */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BookOpen className="w-3.5 h-3.5 text-amber-300/50" />
          <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">Today's Verse</p>
        </div>
        <p className="font-serif text-amber-100 text-sm lg:text-base italic leading-relaxed">
          "{reflection.verse}"
        </p>
        <p className="text-amber-300/50 text-[10px] lg:text-xs mt-1">— {reflection.reference}</p>
      </div>

      {/* Reflection */}
      <div className="mb-4">
        <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide mb-1.5">Reflection</p>
        <p className="text-amber-100/70 text-sm lg:text-base leading-relaxed">
          {reflection.reflection}
        </p>
      </div>

      {/* Prayer */}
      <div className="mb-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Heart className="w-3.5 h-3.5 text-amber-300/50" />
          <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">Prayer</p>
        </div>
        <p className="text-amber-100/60 text-sm lg:text-base italic leading-relaxed">
          {reflection.prayer}
        </p>
      </div>
    </div>
  );
}