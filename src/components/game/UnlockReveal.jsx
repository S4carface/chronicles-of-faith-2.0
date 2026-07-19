import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { HERO_MAP } from "@/data/heroes";
import { ACHIEVEMENT_MAP } from "@/data/achievements";
import { HERO_ART, VICTORY_ART, PLACEHOLDER_ART, ENEMY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import CardReveal from "@/components/game/CardReveal";

function buildContent(unlock) {
  if (!unlock) return null;

  if (unlock.type === "hero") {
    const hero = HERO_MAP[unlock.heroId];
    if (!hero) return null;
    return {
      label: "Hero Unlocked",
      art: HERO_ART[hero.id] || PLACEHOLDER_ART,
      name: hero.name,
      subtitle: hero.title,
      subtitleColor: "text-amber-300",
      verse: null,
      borderColor: "border-amber-400/60",
      glowColor: "rgba(251,191,36,0.5)",
    };
  }

  if (unlock.type === "chapter") {
    return {
      label: "Chapter Complete",
      art: VICTORY_ART.crest || PLACEHOLDER_ART,
      name: unlock.name || "Genesis",
      subtitle: "Story Complete",
      subtitleColor: "text-amber-300",
      verse: "Genesis 2:1",
      borderColor: "border-amber-300/70",
      glowColor: "rgba(251,191,36,0.6)",
    };
  }

  if (unlock.type === "achievement") {
    const ach = ACHIEVEMENT_MAP[unlock.id];
    if (!ach) return null;
    const artUrl = ach.art === "victory_crest" ? VICTORY_ART.crest : ENEMY_ART[ach.art];
    return {
      label: "Achievement Unlocked",
      art: artUrl || PLACEHOLDER_ART,
      name: ach.name,
      subtitle: ach.description,
      subtitleColor: "text-amber-100/70",
      verse: ach.verse,
      borderColor: "border-amber-400/50",
      glowColor: "rgba(251,191,36,0.5)",
    };
  }

  return null;
}

export default function UnlockReveal() {
  const { unlockQueue, dismissUnlock } = useGame();
  const [scale, setScale] = useState(0.5);
  const [opacity, setOpacity] = useState(0);
  const current = unlockQueue[0];
  const content = buildContent(current);

  useEffect(() => {
    if (!current || !content) return;
    setScale(0.5);
    setOpacity(0);

    Sound.sfx.unlockReveal();

    const enterTimer = setTimeout(() => {
      setScale(1);
      setOpacity(1);
    }, 60);

    const exitTimer = setTimeout(() => {
      setOpacity(0);
      setScale(0.92);
    }, 2200);

    const dismissTimer = setTimeout(() => {
      dismissUnlock();
    }, 2700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [current, content, dismissUnlock]);

  if (!current) return null;

  // Card unlocks use the dedicated richer reveal
  if (current.type === "card") {
    return <CardReveal unlock={current} onDismiss={dismissUnlock} />;
  }

  if (!content) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={dismissUnlock}
      style={{
        background: "rgba(8,12,24,0.85)",
        backdropFilter: "blur(4px)",
        opacity,
        transition: "opacity 0.4s ease-out",
        cursor: "pointer",
      }}
    >
      {/* Golden radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${content.glowColor}22 0%, transparent 60%)`,
        }}
      />

      {/* Floating golden particles */}
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(251,191,36,${0.3 + Math.random() * 0.4})`,
            boxShadow: `0 0 ${4 + Math.random() * 6}px rgba(251,191,36,0.5)`,
            animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Central reveal */}
      <div
        className="relative flex flex-col items-center max-w-xs"
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out",
          opacity,
        }}
      >
        <p className="text-amber-300/80 text-xs font-bold uppercase tracking-[0.2em] mb-3 font-serif">
          {content.label}
        </p>

        {/* Art with sacred glow */}
        <div
          className={`relative w-28 h-28 lg:w-32 lg:h-32 rounded-full border-2 ${content.borderColor} overflow-hidden mb-4`}
          style={{
            boxShadow: `0 0 40px ${content.glowColor}, 0 0 80px ${content.glowColor}44`,
            background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
          }}
        >
          <img src={content.art} alt={content.name} className="art-portrait" />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: `inset 0 0 20px ${content.glowColor}66` }}
          />
        </div>

        <h2 className="text-2xl lg:text-3xl font-serif text-amber-100 text-center mb-1">
          {content.name}
        </h2>

        <p className={`text-sm font-medium ${content.subtitleColor} text-center mb-2`}>
          {content.subtitle}
        </p>

        {content.verse && (
          <p className="text-amber-100/50 text-xs italic font-serif text-center">
            📖 {content.verse}
          </p>
        )}

        <p className="text-amber-100/20 text-[10px] mt-4">Tap to continue</p>
      </div>
    </div>
  );
}
