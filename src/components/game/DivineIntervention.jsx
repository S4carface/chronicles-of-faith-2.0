import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

export default function DivineIntervention() {
  const { run, completeRoom, updateRun, unlockAchievement } = useGame();
  const node = run.currentNode;
  const blessings = node?.divineBlessings || [];
  const [chosen, setChosen] = useState(null);

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

    // Apply blessing effects
    if (blessing.effect.type === "heal") {
      updateRun({ playerHp: Math.min(run.maxHp, run.playerHp + blessing.effect.value) });
    } else if (blessing.effect.type === "buff_attack") {
      updateRun({ buffAttack: blessing.effect.value });
    } else if (blessing.effect.type === "draw") {
      updateRun({ extraDraw: blessing.effect.value });
    } else if (blessing.effect.type === "shield") {
      updateRun({ shieldActive: true });
    } else if (blessing.effect.type === "free_cards") {
      // handled at battle start via freeCardsRemaining
      updateRun({ freeCardsNext: blessing.effect.value });
    }

    setTimeout(() => {
      completeRoom(node.id);
    }, 1200);
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
        <div className="text-7xl mb-4">✨</div>
        <h2 className="text-4xl font-serif text-yellow-200">Divine Intervention</h2>
        <p className="text-amber-100/60 text-sm mt-3 max-w-md">
          The Lord speaks to you in this moment. Choose your blessing wisely.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        {blessings.map((blessing) => (
          <button
            key={blessing.id}
            onClick={() => !chosen && handleChoose(blessing)}
            disabled={chosen !== null}
            className={`p-6 rounded-xl border-2 text-center transition-all duration-300 ${
              chosen === blessing.id
                ? "border-yellow-300 bg-yellow-500/20 scale-105"
                : chosen !== null
                ? "border-slate-700/30 opacity-30"
                : "border-amber-400/40 bg-amber-900/10 hover:border-amber-300/70 hover:bg-amber-500/15 hover:scale-105 cursor-pointer"
            }`}
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
          >
            <div className="text-4xl mb-3">{blessing.icon}</div>
            <h3 className="font-serif text-amber-100 text-lg mb-2">{blessing.name}</h3>
            <p className="text-amber-100/60 text-xs">{blessing.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}