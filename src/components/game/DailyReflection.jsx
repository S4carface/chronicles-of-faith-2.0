import React, { useState } from "react";
import { Swords, BookOpen, Heart, Sun } from "lucide-react";
import { getDailyReflection } from "@/data/dailyReflections";
import { recordVerseRead } from "@/game/playerStats";
import * as Sound from "@/game/soundManager";

export default function DailyReflection({ onStartBattle, buttonText, loading }) {
  const [expanded, setExpanded] = useState(false);
  const reflection = getDailyReflection();

  if (!expanded) {
    return (
      <button
        onClick={() => { Sound.sfx.click(); setExpanded(true); recordVerseRead(); }}
        className="w-full mb-4 p-4 rounded-xl border border-amber-400/20 bg-slate-900/30 hover:bg-slate-900/50 transition group text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-amber-400/30 bg-amber-900/20 flex items-center justify-center">
            <Sun className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-amber-200 text-sm lg:text-base">Daily Reflection</p>
            <p className="text-amber-100/40 text-[10px] lg:text-xs">A calm moment before the battle — tap to read</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full mb-4 lg:mb-6 rounded-xl border-2 border-amber-400/20 p-4 lg:p-6 animate-fade-in" style={{ background: "rgba(15,26,48,0.6)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-4 h-4 text-amber-300/60" />
        <h3 className="font-serif text-amber-200 text-base lg:text-lg">Daily Reflection</h3>
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
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Heart className="w-3.5 h-3.5 text-amber-300/50" />
          <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">Devotion</p>
        </div>
        <p className="text-amber-100/60 text-sm lg:text-base italic leading-relaxed">
          {reflection.prayer}
        </p>
      </div>

      {/* Begin Battle */}
      <button
        onClick={() => { Sound.sfx.click(); onStartBattle(); }}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 lg:py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-base lg:text-lg hover:bg-amber-600/40 transition disabled:opacity-50"
      >
        <Swords className="w-5 h-5" />
        {loading ? "Starting..." : buttonText || "Begin Daily Battle"}
      </button>
    </div>
  );
}