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

  const enemies = useMemo(
    () =>
      Object.values(ENEMIES).filter(
        (enemy) => enemy?.id && enemy.id !== "pharaoh"
      ),
    []
  );

  const discoveredCount = enemies.filter((enemy) =>
    encountered.includes(enemy.id)
  ).length;

  const handleOpenEnemy = (enemy) => {
    if (!encountered.includes(enemy.id)) return;

    Sound.sfx.click();
    setSelectedEnemy(enemy);
  };

  const handleCloseEnemy = () => {
    Sound.sfx.click();
    setSelectedEnemy(null);
  };

  return (
    <div
      className="min-h-screen select-none px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]"
      style={{
        background:
          "radial-gradient(ellipse at top, #1A2744 0%, #0A0F1E 72%)",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              Sound.sfx.click();
              navigate("/");
            }}
            className="rounded-lg border border-amber-400/20 bg-slate-950/30 px-4 py-2 text-sm text-amber-100/65 transition hover:text-amber-200"
          >
            ← Menu
          </button>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/60">
              Genesis
            </p>

            <p className="mt-1 text-xs text-amber-100/50">
              {discoveredCount}/{enemies.length} discovered
            </p>
          </div>
        </div>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 shadow-lg shadow-amber-500/10">
            <BookOpen className="h-8 w-8 text-amber-300" />
          </div>

          <h1 className="font-serif text-4xl text-amber-200">
            Enemy Codex
          </h1>

          <p className="mt-2 text-sm text-amber-100/45">
            Encounter enemies to reveal their stories and abilities.
          </p>
        </header>

        <div className="mb-7 flex justify-center">
          <button className="rounded-lg border border-amber-400/45 bg-amber-500/10 px-7 py-2 font-serif text-amber-200">
            Genesis
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {enemies.map((enemy) => {
            const isEncountered = encountered.includes(enemy.id);
            const isDefeated = defeated.includes(enemy.id);
            const artwork = ENEMY_ART[enemy.id] || PLACEHOLDER_ART;

            return (
              <button
                key={enemy.id}
                onClick={() => handleOpenEnemy(enemy)}
                disabled={!isEncountered}
                className={`relative overflow-hidden rounded-xl border-2 text-left transition ${
                  isEncountered
                    ? enemy.isBoss
                      ? "border-red-400/55 hover:-translate-y-1"
                      : "border-amber-400/30 hover:-translate-y-1"
                    : "cursor-default border-slate-700/45"
                }`}
                style={{
                  background:
                    "linear-gradient(180deg, #17233D 0%, #0D1528 100%)",
                  boxShadow: isEncountered
                    ? "0 10px 30px rgba(0,0,0,0.25)"
                    : "none",
                }}
              >
                <div className="relative aspect-square overflow-hidden">
                  {isEncountered ? (
                    <img
                      src={artwork}
                      alt={enemy.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-950">
                      <Lock className="h-10 w-10 text-slate-600" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                  {enemy.isBoss && isEncountered && (
                    <span className="absolute left-2 top-2 rounded border border-red-400/40 bg-red-950/85 px-2 py-1 text-[9px] font-bold tracking-wider text-red-200">
                      BOSS
                    </span>
                  )}

                  {isDefeated && (
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-950/90">
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <h2 className="font-serif text-sm leading-tight text-amber-100 sm:text-base">
                    {isEncountered ? enemy.name : "Unknown Enemy"}
                  </h2>

                  <p className="mt-1 text-[10px] text-amber-100/40">
                    {!isEncountered
                      ? "Face this enemy to reveal it"
                      : isDefeated
                        ? "Defeated"
                        : "Encountered"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedEnemy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(4,8,18,0.94)" }}
          onClick={handleCloseEnemy}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 p-5"
            style={{
              background:
                "linear-gradient(180deg, #1A2744 0%, #0D1528 100%)",
              borderColor: selectedEnemy.isBoss
                ? "rgba(248,113,113,0.45)"
                : "rgba(201,168,76,0.35)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={handleCloseEnemy}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/20 bg-slate-950/85"
            >
              <X className="h-4 w-4 text-amber-100/60" />
            </button>

            <div className="aspect-square overflow-hidden rounded-xl border border-amber-400/25">
              <img
                src={
                  ENEMY_ART[selectedEnemy.id] || PLACEHOLDER_ART
                }
                alt={selectedEnemy.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-5 text-center">
              {selectedEnemy.isBoss && (
                <p className="mb-1 text-xs font-bold tracking-[0.2em] text-red-300">
                  BOSS
                </p>
              )}

              <h2 className="font-serif text-3xl text-amber-200">
                {selectedEnemy.name}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-amber-100/65">
                {selectedEnemy.summary ||
                  "No description is available yet."}
              </p>
            </div>

            <section className="mt-5 rounded-xl border border-amber-500/20 bg-slate-950/25 p-4">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-amber-300/60">
                Scripture
              </p>

              <p className="font-serif text-sm italic leading-relaxed text-amber-100/75">
                {selectedEnemy.narration ||
                  "Scripture reference coming soon."}
              </p>
            </section>

            <section className="mt-4 rounded-xl border border-amber-500/20 bg-slate-950/25 p-4">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-amber-300/60">
                Abilities
              </p>

              <div className="space-y-3">
                {(selectedEnemy.attacks || []).map(
                  (attack, index) => (
                    <div
                      key={`${attack.name}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <span className="text-xl">
                        {attack.icon || "⚔️"}
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-amber-100">
                          {attack.name}
                        </p>

                        <p className="mt-0.5 text-xs text-amber-100/45">
                          {attack.damage > 0
                            ? `${attack.damage} damage`
                            : "Special ability"}

                          {attack.description
                            ? ` · ${attack.description}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <div className="mt-5 text-center">
              <p
                className={`text-sm font-semibold ${
                  defeated.includes(selectedEnemy.id)
                    ? "text-emerald-300"
                    : "text-amber-200/60"
                }`}
              >
                {defeated.includes(selectedEnemy.id)
                  ? "✓ Defeated"
                  : "Encountered — Not Yet Defeated"}
              </p>
            </div>

            <button
              onClick={handleCloseEnemy}
              className="mt-5 w-full rounded-lg border-2 border-amber-400/50 bg-amber-600/15 px-6 py-3 font-serif text-lg font-bold text-amber-100 transition hover:bg-amber-600/30"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
           