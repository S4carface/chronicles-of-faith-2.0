import React, { useState, useEffect } from "react";
import { VICTORY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

// Elegant chapter completion celebration — gold light, emblem, stats, next unlock.
// Plays once on mount for ~5s, skippable by tap.
export default function GenesisCompletionCelebration({ score, stats, nextUnlock, onComplete }) {
  const [phase, setPhase] = useState("enter"); // enter -> hold -> fade
  const [emblemScale, setEmblemScale] = useState(0.3);
  const [emblemOpacity, setEmblemOpacity] = useState(0);
  const [contentOpacity, setContentOpacity] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  useEffect(() => {
    Sound.sfx.unlockReveal();
    Sound.sfx.victory();

    // Emblem rises into view
    const emblemTimer = setTimeout(() => {
      setEmblemScale(1);
      setEmblemOpacity(1);
      setPhase("hold");
    }, 100);

    // Stats content fades in after emblem settles
    const contentTimer = setTimeout(() => {
      setContentOpacity(1);
    }, 100 + 800);

    // Begin fade out
    const fadeTimer = setTimeout(() => {
      setPhase("fade");
      setOverlayOpacity(0);
      setContentOpacity(0);
    }, 100 + 800 + 3500);

    // Dismiss
    const dismissTimer = setTimeout(() => {
      onComplete();
    }, 100 + 800 + 3500 + 500);

    return () => {
      clearTimeout(emblemTimer);
      clearTimeout(contentTimer);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (phase === "fade") return;
    setPhase("fade");
    setOverlayOpacity(0);
    setContentOpacity(0);
    setTimeout(() => onComplete(), 300);
  };

  const keyStats = [
    { label: "Final Score", value: score, highlight: true },
    { label: "Rooms Cleared", value: stats.roomsCleared },
    { label: "Trivia", value: `${stats.triviaCorrect}/${stats.triviaAttempted}` },
    { label: "HP Remaining", value: `${stats.playerHp}/${stats.maxHp}` },
    { label: "Gold Earned", value: stats.gold },
    { label: "Difficulty", value: stats.difficulty },
  ];

  return (
    <div
      className="fixed inset-0 z-[102] flex items-center justify-center p-4"
      onClick={handleSkip}
      style={{
        background: "radial-gradient(ellipse at center, rgba(201,168,76,0.25) 0%, rgba(8,12,24,0.97) 60%)",
        opacity: overlayOpacity,
        transition: "opacity 0.5s ease-out",
        cursor: "pointer",
      }}
    >
      {/* Golden light rays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`ray-${i}`}
            className="absolute origin-bottom"
            style={{
              left: `${(i / 12) * 100}%`,
              bottom: "50%",
              width: "2px",
              height: "60%",
              background: `linear-gradient(to top, rgba(251,191,36,0) 0%, rgba(251,191,36,${0.08 + (i % 3) * 0.03}) 50%, rgba(251,191,36,0) 100%)`,
              transform: `rotate(${(i - 6) * 6}deg)`,
              transformOrigin: "bottom center",
              animation: `float ${5 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Floating gold particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={`p-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(251,191,36,${0.3 + Math.random() * 0.4})`,
            boxShadow: `0 0 ${4 + Math.random() * 8}px rgba(251,191,36,0.5)`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Central content */}
      <div className="relative flex flex-col items-center max-w-md w-full">
        {/* Chapter emblem with glow */}
        <div
          className="relative mb-5"
          style={{
            transform: `scale(${emblemScale})`,
            opacity: emblemOpacity,
            transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease-out",
          }}
        >
          <div
            className="absolute inset-0 -m-6 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
              animation: "float 4s ease-in-out infinite",
            }}
          />
          <img
            src={VICTORY_ART.crest}
            alt="Genesis Emblem"
            className="relative w-28 h-28 lg:w-32 lg:h-32 object-cover rounded-full border-2 border-amber-300/70"
            style={{ boxShadow: "0 0 50px rgba(251,191,36,0.5), 0 0 100px rgba(251,191,36,0.3)" }}
          />
        </div>

        {/* Title + stats */}
        <div
          className="flex flex-col items-center"
          style={{
            opacity: contentOpacity,
            transition: "opacity 0.6s ease-out",
          }}
        >
          <h1 className="text-4xl lg:text-5xl font-serif text-amber-200 mb-2 text-center" style={{ textShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
            Genesis Complete
          </h1>
          <p className="text-amber-100/60 text-sm italic font-serif mb-5 text-center">
            "Thus the heavens and the earth were completed in all their vast array." — Genesis 2:1
          </p>

          {/* Key stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-5 w-full max-w-sm">
            {keyStats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-lg border p-2.5 text-center ${
                  stat.highlight
                    ? "border-amber-400/50 bg-amber-500/10 col-span-3"
                    : "border-amber-500/15 bg-slate-900/40"
                }`}
              >
                <p className="text-amber-100/50 text-[10px] uppercase tracking-wide mb-0.5">{stat.label}</p>
                <p className={stat.highlight ? "text-3xl font-bold text-amber-200 font-serif" : "text-lg font-bold text-amber-100"}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Next unlock preview */}
          {nextUnlock && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-5 py-3 mb-3 text-center animate-fade-in">
              <p className="text-amber-300/60 text-[10px] uppercase tracking-wide mb-0.5">Unlocked</p>
              <p className="text-amber-200 font-serif text-sm">{nextUnlock}</p>
            </div>
          )}

          <p className="text-amber-100/20 text-[10px] mt-2">Tap to continue</p>
        </div>
      </div>
    </div>
  );
}