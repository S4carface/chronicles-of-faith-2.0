import React, { useState, useEffect } from "react";

import { BookOpen, Heart, Sun, Volume2, Square, Check, Flame, Coins } from "lucide-react";
import { getDailyReflection } from "@/data/dailyReflections";
import { recordVerseRead, recordDevotionRead } from "@/game/playerStats";
import { speakNarration, stopNarration } from "@/game/soundManager";
import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

const PRAYER_GOLD_REWARD = 5;

export default function DailyPrayer() {
  const { profile, saveProfile } = useGame();
  
  const reflection = getDailyReflection();
  const [reading, setReading] = useState(false);
  const [justMarked, setJustMarked] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const alreadyPrayed = profile.devotionReadDate === todayStr;

  useEffect(() => {
    Sound.playMusic("menu");
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
    const checkEnd = setInterval(() => {
      if (!window.speechSynthesis || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending)) {
        setReading(false);
        clearInterval(checkEnd);
      }
    }, 500);
  };

  const handleMarkPrayed = () => {
    Sound.sfx.click();
    if (alreadyPrayed) return;

    const newStreak = profile.devotionReadDate === yesterday ? (profile.devotionStreak || 0) + 1 : 1;
    saveProfile({
      devotionReadDate: todayStr,
      devotionStreak: newStreak,
      gold: (profile.gold || 0) + PRAYER_GOLD_REWARD,
    });
    recordVerseRead();
    recordDevotionRead(newStreak);
    setJustMarked(true);
    Sound.sfx.achievement();
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2A2E 0%, #0A0F1E 80%)" }}>
      {/* Soft floating particles — peaceful feel */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(251,191,36,${0.15 + Math.random() * 0.2})`,
          animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}



      <div className="relative w-full max-w-md lg:max-w-lg text-center">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ background: "rgba(251,191,36,0.15)" }} />
            <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/40 animate-icon-float" style={{ background: "#0F1A30" }}>
              <img src={HOME_ART.cross} alt="Daily Prayer" className="art-portrait" />
            </div>
          </div>
        </div>

        <p className="text-amber-300/60 text-xs lg:text-sm uppercase tracking-widest mb-2">Daily Prayer</p>
        <h1 className="font-serif text-amber-200 mb-1" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
          {justMarked ? "Prayer Complete" : "Take a Moment"}
        </h1>
        {profile.devotionStreak > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-amber-100/50 text-xs lg:text-sm mb-4">
            <Flame className="w-3.5 h-3.5 text-orange-400/70" />
            <span>{profile.devotionStreak}-day prayer streak</span>
          </div>
        )}

        {/* Completion feedback */}
        {justMarked && (
          <div className="mb-4 p-4 rounded-xl border-2 border-emerald-400/40 bg-emerald-900/15 animate-fade-in">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-emerald-300 text-sm font-serif mb-1">You prayed today.</p>
            <div className="flex items-center justify-center gap-3 text-xs text-amber-100/60">
              <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {profile.devotionStreak}-day streak</span>
              <span className="text-amber-100/30">·</span>
              <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-300" /> +{PRAYER_GOLD_REWARD} gold</span>
            </div>
          </div>
        )}

        {/* Scripture */}
        <div className="rounded-xl border-2 border-amber-400/20 p-4 lg:p-6 mb-3" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-300/50" />
              <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">Scripture</p>
            </div>
            <button
              onClick={() => { handleReadAloud(); Sound.sfx.click(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] lg:text-xs transition ${
                reading
                  ? "border-amber-400/50 bg-amber-600/20 text-amber-100"
                  : "border-amber-500/30 bg-amber-900/10 text-amber-200/70 hover:bg-amber-900/20"
              }`}
            >
              {reading ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {reading ? "Stop" : "Listen"}
            </button>
          </div>
          <p className="font-serif text-amber-100 text-sm lg:text-base italic leading-relaxed text-left">
            "{reflection.verse}"
          </p>
          <p className="text-amber-300/50 text-[10px] lg:text-xs mt-2 text-left">— {reflection.reference}</p>
        </div>

        {/* Reflection */}
        <div className="rounded-xl border border-amber-500/15 p-4 lg:p-5 mb-3" style={{ background: "rgba(15,26,48,0.4)" }}>
          <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide mb-2 text-left">Reflection</p>
          <p className="text-amber-100/70 text-sm lg:text-base leading-relaxed text-left">
            {reflection.reflection}
          </p>
        </div>

        {/* Prayer */}
        <div className="rounded-xl border border-amber-500/15 p-4 lg:p-5 mb-4" style={{ background: "rgba(15,26,48,0.4)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-amber-300/50" />
            <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">Prayer</p>
          </div>
          <p className="text-amber-100/60 text-sm lg:text-base italic leading-relaxed text-left">
            {reflection.prayer}
          </p>
        </div>

        {/* Mark as Prayed button */}
        <button
          onClick={handleMarkPrayed}
          disabled={alreadyPrayed}
          className={`w-full inline-flex items-center justify-center gap-2 px-8 py-3 lg:py-4 rounded-xl border-2 font-serif text-base lg:text-lg transition active:scale-95 ${
            alreadyPrayed
              ? "border-emerald-400/30 bg-emerald-900/10 text-emerald-300/60 cursor-default"
              : "border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
          }`}
        >
          {alreadyPrayed ? (
            <><Check className="w-5 h-5" /> Prayed Today</>
          ) : (
            <><Sun className="w-5 h-5" /> Mark as Prayed</>
          )}
        </button>

        <p className="text-amber-100/30 text-[10px] mt-6 font-serif italic">
          "Cast all your anxiety on Him because He cares for you." — 1 Peter 5:7
        </p>
      </div>
    </div>
  );
}