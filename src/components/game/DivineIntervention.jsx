import React, { useState, useEffect } from "react";
import { Shield, Heart, Flame, BookOpen, Scroll } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ROOM_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

// Each blessing gets a distinct symbolic icon + accent color so players
// can tell defense / wisdom / strength apart at a glance, while sharing
// the same card frame, typography, and spacing as one polished system.
const BLESSING_VISUALS = {
  angel: {
    Icon: Shield,
    category: "Protection",
    accent: "text-sky-300",
    border: "border-sky-400/50",
    badge: "border-sky-400/40 bg-sky-900/30 text-sky-200",
    aura: "rgba(96,165,250,0.35)",
  },
  manna: {
    Icon: Heart,
    category: "Healing",
    accent: "text-emerald-300",
    border: "border-emerald-400/50",
    badge: "border-emerald-400/40 bg-emerald-900/30 text-emerald-200",
    aura: "rgba(52,211,153,0.35)",
  },
  strength: {
    Icon: Flame,
    category: "Strength / Attack",
    accent: "text-red-300",
    border: "border-red-400/50",
    badge: "border-red-400/40 bg-red-900/30 text-red-200",
    aura: "rgba(248,113,113,0.35)",
  },
  wisdom: {
    Icon: BookOpen,
    category: "Wisdom / Draw",
    accent: "text-amber-200",
    border: "border-amber-400/50",
    badge: "border-amber-400/40 bg-amber-900/30 text-amber-200",
    aura: "rgba(251,191,36,0.35)",
  },
  covenant: {
    Icon: Scroll,
    category: "Wisdom / Faith",
    accent: "text-cyan-300",
    border: "border-cyan-400/50",
    badge: "border-cyan-400/40 bg-cyan-900/30 text-cyan-200",
    aura: "rgba(34,211,238,0.35)",
  },
};

function BlessingCard({ blessing, chosen, isChosen, onSelect }) {
  const visual = BLESSING_VISUALS[blessing.id] || BLESSING_VISUALS.wisdom;
  const Icon = visual.Icon;

  return (
    <button
      onClick={() => !chosen && onSelect(blessing)}
      disabled={chosen !== null}
      className={`p-6 rounded-xl border-2 text-center transition-all duration-300 ${
        isChosen
          ? "border-yellow-300 bg-yellow-500/20 scale-105"
          : chosen !== null
          ? "border-slate-700/30 opacity-30"
          : "border-amber-400/40 hover:border-amber-300/70 hover:scale-105 cursor-pointer"
      }`}
      style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
    >
      {/* Category badge */}
      <div className="flex justify-center mb-4">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${visual.badge}`}>
          {visual.category}
        </span>
      </div>

      {/* Icon medallion with distinct colored glow */}
      <div className="mb-4 flex justify-center">
        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 ${visual.border} overflow-hidden`}
          style={{
            background: `radial-gradient(circle, ${visual.aura} 0%, rgba(15,26,48,0.9) 70%)`,
            boxShadow: `0 0 25px ${visual.aura}, inset 0 0 16px ${visual.aura}`,
          }}
        >
          <Icon
            className={`w-10 h-10 ${visual.accent}`}
            style={{ filter: `drop-shadow(0 0 6px ${visual.aura})` }}
          />
        </div>
      </div>

      <h3 className="font-serif text-amber-100 text-lg mb-2">{blessing.name}</h3>
      <p className="text-amber-100/60 text-xs leading-relaxed">{blessing.description}</p>
    </button>
  );
}

export default function DivineIntervention() {
  const { run, completeRoom, updateRun, unlockAchievement } = useGame();
  const node = run.currentNode;
  const blessings = node?.divineBlessings || [];
  const [chosen, setChosen] = useState(null);
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    Sound.playMusic("divine");
    Sound.sfx.divine();
    updateRun({ divineEncounters: run.divineEncounters + 1 });
    if (run.divineEncounters + 1 >= 3) {
      unlockAchievement("divine_favor");
    }
  }, []);

  const handleChoose = (blessing) => {
    Sound.sfx.reward();
    setChosen(blessing.id);

    if (blessing.effect.type === "heal") {
      updateRun({ playerHp: Math.min(run.maxHp, run.playerHp + blessing.effect.value) });
      setResultText(`Restored ${blessing.effect.value} HP!`);
    } else if (blessing.effect.type === "buff_attack") {
      updateRun({ buffAttack: blessing.effect.value });
      setResultText(`+${blessing.effect.value} attack power next battle!`);
    } else if (blessing.effect.type === "draw") {
      updateRun({ extraDraw: blessing.effect.value });
      setResultText(`Will draw ${blessing.effect.value} extra cards next battle!`);
    } else if (blessing.effect.type === "shield") {
      updateRun({ shieldActive: true });
      setResultText("All damage negated for your next battle's first turn!");
    } else if (blessing.effect.type === "free_cards") {
      updateRun({ freeCardsNext: blessing.effect.value });
      setResultText(`Next ${blessing.effect.value} cards will cost 0 Faith!`);
    }
  };

  const handleContinue = () => {
    Sound.sfx.click();
    completeRoom(node.id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, rgba(8,12,24,0.98) 60%)" }}>
      {/* Golden flash particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "4px",
            height: "4px",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: "rgba(255,215,100,0.8)",
            boxShadow: "0 0 8px rgba(255,215,100,0.6)",
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}

      <div className="relative text-center mb-8">
        <div className="mb-4 flex justify-center">
          <img src={ROOM_ART.divine || PLACEHOLDER_ART} alt="Divine" className="art-portrait w-16 h-16 rounded-xl border-2 border-amber-400/30" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} />
        </div>
        <h2 className="text-4xl font-serif text-yellow-200">Divine Intervention</h2>
        <p className="text-amber-100/60 text-sm mt-3 max-w-md">
          The Lord speaks to you in this moment. Choose your blessing wisely.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        {blessings.map((blessing) => (
          <BlessingCard
            key={blessing.id}
            blessing={blessing}
            chosen={chosen}
            isChosen={chosen === blessing.id}
            onSelect={handleChoose}
          />
        ))}
      </div>

      {chosen && resultText && (
        <div className="relative mt-8 text-center animate-fade-in">
          <p className="text-yellow-200 text-lg font-serif mb-6">{resultText}</p>
          <button
            onClick={handleContinue}
            className="px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg hover:bg-amber-600/40 transition"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}