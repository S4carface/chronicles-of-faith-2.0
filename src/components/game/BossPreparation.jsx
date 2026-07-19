import React from "react";
import { useGame } from "@/game/GameContext";
import { getEnemyForDifficulty } from "@/data/enemies";
import * as Sound from "@/game/soundManager";

export default function BossPreparation() {
  const { run, updateRun } = useGame();

  const boss = getEnemyForDifficulty(run.pendingEnemyId || run.currentNode?.enemyId, run.difficulty);
  const isEasy = run.difficulty === "easy";

  const enterBoss = (choice) => {
    Sound.sfx.click();

    updateRun((currentRun) => {
      const healAmount = Math.ceil(currentRun.maxHp * 0.25);
      const restoredHp =
        choice === "rest"
          ? Math.min(currentRun.maxHp, currentRun.playerHp + healAmount)
          : currentRun.playerHp;

      return {
        playerHp: restoredHp,
        pendingEnemyId: currentRun.currentNode.enemyId,
        currentBattleState: null,
        bossStartingFaith: choice === "pray" ? 2 : 0,
        bossPreparationChoice: choice,
        battleCheckpoint: {
          playerHp: restoredHp,
          maxHp: currentRun.maxHp,
          deck: [...currentRun.deck],
          gold: currentRun.gold,
          roomsCleared: currentRun.roomsCleared,
          buffAttack: currentRun.buffAttack || 0,
          shieldActive: currentRun.shieldActive || false,
          extraDraw: currentRun.extraDraw || 0,
          battlesWithoutDamage: currentRun.battlesWithoutDamage || 0,
          neverLostHp: currentRun.neverLostHp,
        },
        phase: "battle",
      };
    });
  };

  const healAmount = Math.ceil(run.maxHp * 0.25);
  const healedHp = Math.min(run.maxHp, run.playerHp + healAmount);
  const actualHealing = healedHp - run.playerHp;

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at top, #26395f 0%, #101a30 45%, #080d18 100%)",
      }}
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-400/40 bg-slate-950/85 p-5 shadow-2xl">
        <div className="text-center mb-5">
          <p className="text-red-300/70 text-xs uppercase tracking-[0.25em] mb-2">
            Final Trial
          </p>

          <h1 className="text-3xl font-serif text-amber-200">
            Prepare for the Boss
          </h1>

          <p className="text-amber-100/60 text-sm mt-2">
            Your current health carries into the battle.
          </p>
        </div>

        <div className="rounded-xl border border-red-400/25 bg-red-950/20 p-4 mb-5 text-center">
          <p className="text-amber-100/50 text-xs uppercase tracking-wider">
            Current Health
          </p>

          <p className="text-2xl font-bold text-red-200 mt-1">
            {run.playerHp} / {run.maxHp} HP
          </p>

          {boss && (
            <p className="text-amber-100/60 text-sm mt-2">
              Next opponent:{" "}
              <span className="text-amber-200 font-semibold">{boss.name}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => enterBoss("rest")}
            className="w-full rounded-xl border-2 border-emerald-400/40 bg-emerald-900/20 p-4 text-left transition hover:bg-emerald-900/35"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔥</span>

              <div>
                <h2 className="text-lg font-serif text-emerald-200">Rest</h2>

                <p className="text-emerald-100/65 text-sm">
                  Restore 25% of your maximum health.
                </p>

                <p className="text-emerald-300 text-xs mt-1">
                  {actualHealing > 0
                    ? `${run.playerHp} HP → ${healedHp} HP`
                    : "You are already at full health."}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => enterBoss("pray")}
            className="w-full rounded-xl border-2 border-sky-400/40 bg-sky-900/20 p-4 text-left transition hover:bg-sky-900/35"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🙏</span>

              <div>
                <h2 className="text-lg font-serif text-sky-200">Pray</h2>

                <p className="text-sky-100/65 text-sm">
                  Begin the boss battle with 2 additional Faith.
                </p>

                <p className="text-sky-300 text-xs mt-1">
                  Start the first turn with 5 Faith instead of 3.
                </p>
              </div>
            </div>
          </button>
        </div>

        {isEasy && (
          <p className="text-center text-amber-100/40 text-xs mt-4">
            Easy mode grants one preparation choice before the final battle.
          </p>
        )}
      </div>
    </div>
  );
}
