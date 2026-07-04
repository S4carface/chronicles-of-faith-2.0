import React, { useState, useEffect } from "react";
import { getCardById } from "@/data/cards";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

const RARITY_STYLES = {
  common: {
    label: "Common",
    color: "text-sky-300",
    border: "border-sky-400/50",
    glow: "rgba(56,189,248,0.4)",
    particleColor: "rgba(56,189,248",
  },
  rare: {
    label: "Rare",
    color: "text-emerald-300",
    border: "border-emerald-400/60",
    glow: "rgba(52,211,153,0.5)",
    particleColor: "rgba(52,211,153",
  },
  legendary: {
    label: "Legendary",
    color: "text-amber-300",
    border: "border-amber-300/70",
    glow: "rgba(251,191,36,0.6)",
    particleColor: "rgba(251,191,36",
  },
};

const TYPE_LABELS = {
  attack: "Attack",
  defense: "Defense",
  scripture: "Scripture",
  miracle: "Miracle",
};

// Timing profiles — common is simpler/faster, rare+legendary more dramatic
function getTiming(rarity) {
  if (rarity === "legendary") return { rise: 900, hold: 1600, fade: 500, particles: 24 };
  if (rarity === "rare") return { rise: 700, hold: 1300, fade: 400, particles: 18 };
  return { rise: 450, hold: 800, fade: 300, particles: 8 };
}

export default function CardReveal({ unlock, onDismiss }) {
  const card = getCardById(unlock.cardId);
  const [phase, setPhase] = useState("rise"); // rise -> hold -> fade -> done
  const [riseProgress, setRiseProgress] = useState(0);

  const rarity = card?.rarity || "common";
  const r = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const timing = getTiming(rarity);
  const isEpic = rarity === "rare" || rarity === "legendary";
  const art = CARD_ART[card?.id] || PLACEHOLDER_ART;
  const typeLabel = TYPE_LABELS[card?.type] || card?.type || "Card";

  useEffect(() => {
    Sound.sfx.unlockReveal();
    setPhase("rise");
    setRiseProgress(0);

    const riseTimer = setTimeout(() => {
      setRiseProgress(1);
      setPhase("hold");
    }, 80);

    const holdTimer = setTimeout(() => {
      setPhase("fade");
    }, 80 + timing.rise + timing.hold);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 80 + timing.rise + timing.hold + timing.fade);

    return () => {
      clearTimeout(riseTimer);
      clearTimeout(holdTimer);
      clearTimeout(dismissTimer);
    };
  }, [unlock, onDismiss, timing.rise, timing.hold, timing.fade]);

  if (!card) return null;

  const fading = phase === "fade";
  const rising = phase === "rise";

  // Card vertical position: starts below center, rises into view
  const translateY = rising ? (1 - riseProgress) * 80 : 0;

  return (
    <div
      className="fixed inset-0 z-[101] flex items-center justify-center p-4"
      onClick={onDismiss}
      style={{
        background: "rgba(8,12,24,0.9)",
        backdropFilter: "blur(6px)",
        opacity: fading ? 0 : 1,
        transition: `opacity ${timing.fade}ms ease-out`,
        cursor: "pointer",
      }}
    >
      {/* Soft radial glow — stronger for epic cards */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${r.glow}${isEpic ? "33" : "18"} 0%, transparent ${isEpic ? 65 : 50}%)`,
        }}
      />

      {/* Floating particles — more for rare/legendary */}
      {Array.from({ length: timing.particles }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${2 + Math.random() * (isEpic ? 5 : 3)}px`,
            height: `${2 + Math.random() * (isEpic ? 5 : 3)}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `${r.particleColor},${0.3 + Math.random() * 0.4})`,
            boxShadow: `0 0 ${4 + Math.random() * 8}px ${r.particleColor},0.5)`,
            animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Card reveal body */}
      <div
        className="relative flex flex-col items-center max-w-[260px]"
        style={{
          transform: `translateY(${translateY}px) scale(${rising ? 0.9 + riseProgress * 0.1 : 1})`,
          opacity: fading ? 0 : 1,
          transition: `transform ${timing.rise}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${timing.fade}ms ease-out`,
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.2em] mb-3 font-serif"
          style={{ color: r.color, opacity: 0.8 }}
        >
          New Card Unlocked
        </p>

        {/* Card art with sacred glow */}
        <div
          className={`relative w-32 h-32 lg:w-36 lg:h-36 rounded-2xl border-2 ${r.border} overflow-hidden mb-4`}
          style={{
            boxShadow: isEpic
              ? `0 0 50px ${r.glow}, 0 0 100px ${r.glow}55, inset 0 0 20px ${r.glow}66`
              : `0 0 24px ${r.glow}88`,
            background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
          }}
        >
          <img src={art} alt={card.name} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 16px ${r.glow}55` }}
          />
          {/* Cost badge */}
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-900/70 text-amber-200 border border-amber-400/30">
            {card.cost} ✨
          </span>
          {/* Rarity badge */}
          <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-slate-900/70 ${r.color} border ${r.border}`}>
            {r.label}
          </span>
        </div>

        <h2 className="text-2xl font-serif text-amber-100 text-center mb-1">{card.name}</h2>

        {/* Type + rarity line */}
        <p className={`text-sm font-medium ${r.color} text-center mb-2`}>
          {typeLabel} · {r.label}
        </p>

        {/* Effect summary */}
        <p className="text-amber-100/70 text-sm text-center leading-relaxed mb-3 px-2">
          {getCardEffectText(card)}
        </p>

        {card.verse && (
          <p className="text-amber-100/50 text-xs italic font-serif text-center">
            📖 {card.verse}
          </p>
        )}

        <p className="text-amber-100/20 text-[10px] mt-4">Tap to continue</p>
      </div>
    </div>
  );
}