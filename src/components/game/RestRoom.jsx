import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

export default function RestRoom() {
  const { run, completeRoom, updateRun } = useGame();
  const node = run.currentNode;
  const [chosen, setChosen] = useState(null);
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    Sound.playMusic("divine");
  }, []);

  const handleHeal = () => {
    Sound.sfx.heal();
    setChosen("heal");
    const healAmount = Math.floor(run.maxHp * 0.3);
    updateRun({ playerHp: Math.min(run.maxHp, run.playerHp + healAmount) });
    setResultText(`Restored ${healAmount} HP. Your spirit is renewed.`);
  };

  const handlePray = () => {
    Sound.sfx.divine();
    setChosen("pray");
    updateRun({ buffAttack: run.buffAttack + 5 });
    setResultText("You feel divine strength. +5 attack power next battle.");
  };

  const handleContinue = () => {
    Sound.sfx.click();
    completeRoom(node.id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.1) 0%, rgba(8,12,24,0.98) 60%)" }}>
      <div className="text-center mb-8">
        <div className="text-7xl mb-4">🔥</div>
        <h2 className="text-3xl font-serif text-amber-200">A Moment of Rest</h2>
        <p className="text-amber-100/50 text-sm mt-2 max-w-md">
          You find a quiet place by a warm fire. Take a moment to restore your spirit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full">
        <button
          onClick={() => !chosen && handleHeal()}
          disabled={chosen !== null}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            chosen === "heal" ? "border-emerald-400 bg-emerald-500/20 scale-105" :
            chosen !== null ? "border-slate-700/30 opacity-30" :
            "border-emerald-500/30 bg-emerald-900/10 hover:border-emerald-400/60 hover:bg-emerald-500/10 hover:scale-105 cursor-pointer"
          }`}
          style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
        >
          <div className="text-4xl mb-3">❤️</div>
          <h3 className="font-serif text-amber-100 text-lg">Rest & Heal</h3>
          <p className="text-amber-100/50 text-xs mt-1">Restore 30% of your max HP</p>
        </button>

        <button
          onClick={() => !chosen && handlePray()}
          disabled={chosen !== null}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            chosen === "pray" ? "border-amber-300 bg-amber-500/20 scale-105" :
            chosen !== null ? "border-slate-700/30 opacity-30" :
            "border-amber-500/30 bg-amber-900/10 hover:border-amber-400/60 hover:bg-amber-500/10 hover:scale-105 cursor-pointer"
          }`}
          style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
        >
          <div className="text-4xl mb-3">🙏</div>
          <h3 className="font-serif text-amber-100 text-lg">Pray for Strength</h3>
          <p className="text-amber-100/50 text-xs mt-1">+5 attack power for your next battle</p>
        </button>
      </div>

      {chosen && resultText && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-amber-200 text-lg font-serif mb-6">{resultText}</p>
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