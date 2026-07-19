import React, { useState, useEffect } from "react";
import { getCardById } from "@/data/cards";
import { getCardEffectText } from "@/components/game/Card";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import RarityCardFrame from "@/components/ui/RarityCardFrame";
import { getCardRarity } from "@/data/cardRarity";

const TYPE_LABELS = {
  attack: "Attack",
  defense: "Defense",
  scripture: "Scripture",
  miracle: "Miracle",
};

// Timing profiles — common is simpler/faster, rare+legendary more dramatic
function getTiming(rarity, reduceMotion) {
  const timing = rarity === "legendary"
    ? { rise: 900, hold: 1600, fade: 500, particles: 18 }
    : rarity === "epic"
      ? { rise: 760, hold: 1400, fade: 420, particles: 14 }
      : rarity === "rare"
        ? { rise: 650, hold: 1250, fade: 380, particles: 10 }
        : rarity === "uncommon"
          ? { rise: 520, hold: 950, fade: 320, particles: 4 }
          : { rise: 420, hold: 800, fade: 280, particles: 0 };
  return reduceMotion ? { ...timing, rise: 0, fade: 0, particles: 0 } : timing;
}

export default function CardReveal({ unlock, onDismiss }) {
  const card = getCardById(unlock.cardId);
  const [phase, setPhase] = useState("rise"); // rise -> hold -> fade -> done
  const [riseProgress, setRiseProgress] = useState(0);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const rarity = card?.rarity || "common";
  const r = getCardRarity(rarity);
  const timing = getTiming(rarity, reduceMotion);
  const isEpic = rarity === "rare" || rarity === "epic" || rarity === "legendary";
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
          background: `radial-gradient(ellipse at center, ${r.glowColor} 0%, transparent ${isEpic ? 65 : 50}%)`,
          opacity: isEpic ? 0.65 : 0.35,
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
            background: r.accentColor,
            opacity: 0.3 + Math.random() * 0.4,
            boxShadow: `0 0 ${4 + Math.random() * 8}px ${r.glowColor}`,
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
          style={{ color: r.labelColor, opacity: 0.8 }}
        >
          New Card Unlocked
        </p>

        {/* Card art with sacred glow */}
        <RarityCardFrame
          rarity={r.key}
          className={`relative w-32 h-32 lg:w-36 lg:h-36 rounded-2xl border-2 overflow-hidden mb-4 ${r.rewardRevealClass}`}
          style={{
            boxShadow: isEpic
              ? `0 0 50px ${r.glowColor}, 0 0 90px ${r.glowColor}`
              : `0 0 24px ${r.glowColor}`,
            background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
          }}
        >
          <img src={art} alt={card.name} className="art-portrait" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 16px ${r.glowColor}` }}
          />
          {/* Cost badge */}
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-900/70 text-amber-200 border border-amber-400/30">
            {card.cost} ✨
          </span>
          {/* Rarity badge */}
          <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-slate-900/80 border" style={{ color: r.labelColor, borderColor: r.borderColor }}>
            {r.displayName}
          </span>
        </RarityCardFrame>

        <h2 className="text-2xl font-serif text-amber-100 text-center mb-1">{card.name}</h2>

        {/* Type + rarity line */}
        <p className="text-sm font-medium text-center mb-2" style={{ color: r.labelColor }}>
          {typeLabel} · {r.displayName}
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
