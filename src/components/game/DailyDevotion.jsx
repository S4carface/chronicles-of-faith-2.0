import React, { useState, useEffect } from "react";
import { BookOpen, Heart, Sun, Volume2, Square } from "lucide-react";
import { getDailyReflection } from "@/data/dailyReflections";
import { recordVerseRead } from "@/game/playerStats";
import { speakNarration, stopNarration } from "@/game/soundManager";
import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";

export default function DailyDevotion() {
  const { profile } = useGame();
  const reflection = getDailyReflection();
  const [reading, setReading] = useState(false);

  // Stop narration if component unmounts
  useEffect(() => {
    return () => { stopNarration(); };
  }, []);

  const handleReadAloud = () => {
    if (reading) {
      stopNarration();
      setReading(false);
      return;
    }
    const fullText = `${reflection.verse}. ${reflection.reference}. Reflection. ${reflection.reflection} Prayer. ${reflection.prayer}`;
    speakNarration(
      fullText,
      (profile.settings.narrationVolume ?? 50) / 100,
      profile.settings.narrationVoice
    );
    setReading(true);
    // Reset state after speech ends — poll since onend is inside soundManager
    const checkEnd = setInterval(() => {
      if (!window.speechSynthesis || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending)) {
        setReading(false);
        clearInterval(checkEnd);
      }
    }, 500);
  };

  return (
    <div className="w-full mb-4 lg:mb-6 rounded-xl border-2 border-amber-400/20 p-4 lg:p-6 animate-fade-in" style={{ background: "rgba(15,26,48,0.6)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-300/60" />
          <h3 className="font-serif text-amber-200 text-base lg:text-lg">Daily Devotion</h3>
        </div>
        <button
          onClick={() => { handleReadAloud(); Sound.sfx.click(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] lg:text-xs transition ${
            reading
              ? "border-amber-400/50 bg-amber-600/20 text-amber-100 hover:bg-amber-600/30"
              : "border-amber-500/30 bg-amber-900/10 text-amber-200/70 hover:bg-amber-900/20"
          }`}
        >
          {reading ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          {reading ? "Stop" : "Read Aloud"}
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