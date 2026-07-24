import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import {
  BookOpen,
  Heart,
  Sun,
  Volume2,
  Square,
  Check,
  Flame,
  Coins,
} from "lucide-react";
import { getDailyReflection } from "@/data/dailyReflections";
import { recordVerseRead, recordDevotionRead } from "@/game/playerStats";
import { speakNarration, stopNarration } from "@/game/soundManager";
import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

const PRAYER_GOLD_REWARD = 5;
const BIBLE_BACKGROUND = "/images/backgrounds/bible-bg-scripture-light.PNG";

const BIBLE_PARTICLES = [
  { left: 8, top: 16, size: 2.5, duration: 8, delay: 0.4, opacity: 0.26 },
  { left: 20, top: 72, size: 3, duration: 10, delay: 1.8, opacity: 0.2 },
  { left: 33, top: 34, size: 2, duration: 7, delay: 2.6, opacity: 0.22 },
  { left: 47, top: 58, size: 3.2, duration: 9, delay: 1.2, opacity: 0.18 },
  { left: 61, top: 18, size: 2.4, duration: 8.5, delay: 3.2, opacity: 0.24 },
  { left: 72, top: 84, size: 2.8, duration: 11, delay: 0.8, opacity: 0.2 },
  { left: 84, top: 42, size: 2.2, duration: 7.5, delay: 2.1, opacity: 0.24 },
  { left: 92, top: 12, size: 2.8, duration: 9.5, delay: 3.6, opacity: 0.18 },
];

export default function DailyPrayer() {
  const { profile, saveProfile } = useGame();

  const reflection = getDailyReflection();
  const [reading, setReading] = useState(false);
  const [justMarked, setJustMarked] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);
  const alreadyPrayed = profile.devotionReadDate === todayStr;

  useEffect(() => {
    Sound.playMusic("menu");
    return () => {
      stopNarration();
    };
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
      if (
        !window.speechSynthesis ||
        (!window.speechSynthesis.speaking &&
          !window.speechSynthesis.pending)
      ) {
        setReading(false);
        clearInterval(checkEnd);
      }
    }, 500);
  };

  const handleMarkPrayed = () => {
    Sound.sfx.click();
    if (alreadyPrayed) return;

    const newStreak =
      profile.devotionReadDate === yesterday
        ? (profile.devotionStreak || 0) + 1
        : 1;

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
    <div
      className="relative min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28 overflow-hidden"
      style={{
        backgroundColor: "#050B16",
        backgroundImage: `linear-gradient(180deg, rgba(4,9,20,0.48) 0%, rgba(5,11,26,0.68) 42%, rgba(3,8,18,0.9) 100%), url("${BIBLE_BACKGROUND}")`,
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(218,179,72,0.18) 0%, rgba(218,179,72,0.08) 18%, transparent 36%), radial-gradient(circle at 50% 28%, rgba(35,62,120,0.18) 0%, transparent 42%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,11,22,0.18) 0%, rgba(5,11,22,0.42) 60%, transparent 100%)",
        }}
      />

      {BIBLE_PARTICLES.map((particle, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          aria-hidden="true"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            background: `rgba(251,191,36,${particle.opacity})`,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      <div className="relative z-10 mb-4 w-full max-w-md lg:max-w-lg">
        <Link
          to="/"
          aria-label="Return to Main Menu"
          className="inline-flex min-h-11 items-center text-amber-100/70 hover:text-amber-200 transition text-sm"
        >
          ← Menu
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md lg:max-w-lg text-center">
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: "rgba(251,191,36,0.15)" }}
            />
            <div
              className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/40 animate-icon-float"
              style={{ background: "#0F1A30" }}
            >
              <img
                src={HOME_ART.cross}
                alt="Daily Prayer"
                className="art-portrait"
              />
            </div>
          </div>
        </div>

        <p className="text-amber-300/60 text-xs lg:text-sm uppercase tracking-widest mb-2">
          Daily Prayer
        </p>

        <h1
          className="font-serif text-amber-200 mb-1"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
        >
          {justMarked ? "Prayer Complete" : "Take a Moment"}
        </h1>

        {profile.devotionStreak > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-amber-100/55 text-xs lg:text-sm mb-4">
            <Flame className="w-3.5 h-3.5 text-orange-400/70" />
            <span>{profile.devotionStreak}-day prayer streak</span>
          </div>
        )}

        {justMarked && (
          <div className="mb-4 p-4 rounded-xl border-2 border-emerald-400/40 bg-emerald-900/15 backdrop-blur-[2px] animate-fade-in">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-emerald-300 text-sm font-serif mb-1">
              You prayed today.
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-amber-100/60">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />{" "}
                {profile.devotionStreak}-day streak
              </span>
              <span className="text-amber-100/30">·</span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-300" /> +
                {PRAYER_GOLD_REWARD} gold
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border-2 border-amber-400/20 p-4 lg:p-6 mb-3 bg-slate-950/38 backdrop-blur-[2px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-300/50" />
              <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">
                Scripture
              </p>
            </div>

            <button
              onClick={() => {
                handleReadAloud();
                Sound.sfx.click();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] lg:text-xs transition ${
                reading
                  ? "border-amber-400/50 bg-amber-600/20 text-amber-100"
                  : "border-amber-500/30 bg-amber-900/10 text-amber-200/70 hover:bg-amber-900/20"
              }`}
            >
              {reading ? (
                <Square className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              {reading ? "Stop" : "Listen"}
            </button>
          </div>

          <p className="font-serif text-amber-100 text-sm lg:text-base italic leading-relaxed text-left">
            "{reflection.verse}"
          </p>
          <p className="text-amber-300/50 text-[10px] lg:text-xs mt-2 text-left">
            — {reflection.reference}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/15 p-4 lg:p-5 mb-3 bg-slate-950/32 backdrop-blur-[2px]">
          <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide mb-2 text-left">
            Reflection
          </p>
          <p className="text-amber-100/72 text-sm lg:text-base leading-relaxed text-left">
            {reflection.reflection}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/15 p-4 lg:p-5 mb-4 bg-slate-950/32 backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-amber-300/50" />
            <p className="text-amber-100/40 text-[10px] lg:text-xs uppercase tracking-wide">
              Prayer
            </p>
          </div>
          <p className="text-amber-100/62 text-sm lg:text-base italic leading-relaxed text-left">
            {reflection.prayer}
          </p>
        </div>

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
            <>
              <Check className="w-5 h-5" /> Prayed Today
            </>
          ) : (
            <>
              <Sun className="w-5 h-5" /> Mark as Prayed
            </>
          )}
        </button>

        <p className="text-amber-100/30 text-[10px] mt-6 font-serif italic">
          "Cast all your anxiety on Him because He cares for you." — 1 Peter
          5:7
        </p>
      </div>
    </div>
  );
}
