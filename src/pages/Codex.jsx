import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Lock, ShieldCheck, X } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { ENEMIES } from "@/data/enemies";
import { ENEMY_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function Codex() {
  const navigate = useNavigate();
  const { profile } = useGame();
  const [selectedEnemy, setSelectedEnemy] = useState(null);

  const encountered = profile.encounteredEnemies || [];
  const defeated = profile.defeatedEnemies || [];

  const enemies = useMemo(() => Object.values(ENEMIES), []);

  const revealedCount = enemies.filter((enemy) =>
    encountered.includes(enemy.id)
  ).length;

  const openEnemy = (enemy) => {
    if (!encountered.includes(enemy.id)) return;

    Sound.sfx.click();
    setSelectedEnemy(enemy);
  };

  return (
    <div
      className="min-h-screen px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
      style={{
        background:
          "radial-gradient(ellipse at top, #1A2744 0%, #0A0F1E 75%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              Sound.sfx.click();
              navigate("/");
            }}
            className="text-amber-100/60 hover:text-amber-200 transition"
          >
            ← Menu
          </button>

          <div className="text-right">
            <p className="text-amber-300/60 text-xs uppercase tracking-widest">
              Genesis
            </p>
           