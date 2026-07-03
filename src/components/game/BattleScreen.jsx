import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { createBattleState, playCard as playCardEngine, endPlayerTurn, enemyTurn, checkBattleEnd } from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card from "@/components/game/Card";
import * as Sound from "@/game/soundManager";

export default function BattleScreen() {
  const { run, updateRun, setPhase, completeRoom, unlockAchievement, profile } = useGame();
  const enemy = ENEMIES[run.pendingEnemyId];
  const [battleState, setBattleState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [battleEnd, setBattleEnd] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [hero, setHero] = useState(run.hero);
  const [covenantShieldUsed, setCovenantShieldUsed] = useState(false);
  const [scriptureOnlyBattle, setScriptureOnlyBattle] = useState(true);

  useEffect(() => {
    Sound.playMusic("battle");
    const state = createBattleState(
      enemy,
      run.playerHp,
      run.deck,
      run.buffAttack > 0 ? 0 : 0,
      run.extraDraw
    );
    if (run.shieldActive) state.shieldActive = true;
    if (run.buffAttack > 0) state.buffAttack = run.buffAttack;
    if (run.freeCardsNext > 0) state.freeCardsRemaining = run.freeCardsNext;
    setBattleState(state);
  }, []);

  const handlePlayCard = (handIndex) => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    const cardId = battleState.hand[handIndex];
    const card = getCardById(cardId);
    if (!card) return;
    if (battleState.freeCardsRemaining === 0 && battleState.energy < card.cost) {
      Sound.sfx.click();
      return;
    }

    Sound.sfx.cardPlay();
    if (card.type === "attack") Sound.sfx.attack();
    if (card.type === "scripture") Sound.sfx.heal();
    if (card.type === "miracle") Sound.sfx.miracle();
    if (card.type === "defense") Sound.sfx.shield();

    if (card.rarity === "legendary") {
      unlockAchievement("miracle_worker");
      updateRun({ usedLegendary: true });
    }
    if (card.type === "scripture" && run.usedScriptureOnly === false) {
      // already used non-scripture
    }
    if (card.type !== "scripture") {
      setScriptureOnlyBattle(false);
    }

    const newState = playCardEngine(battleState, handIndex, card);
    setBattleState(newState);

    const end = checkBattleEnd(newState);
    if (end) {
      setBattleEnd(end);
      handleBattleEnd(end, newState);
    }
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    setAnimating(true);
    const endedState = endPlayerTurn(battleState);
    setBattleState(endedState);

    setTimeout(() => {
      Sound.sfx.enemyAttack();
      const enemyState = enemyTurn(endedState);
      setBattleState(enemyState);

      const end = checkBattleEnd(enemyState);
      if (end) {
        setBattleEnd(end);
        handleBattleEnd(end, enemyState);
      }
      setAnimating(false);
    }, 600);
  };

  const handleCovenantShield = () => {
    if (covenantShieldUsed || hero.id !== "noah") return;
    setCovenantShieldUsed(true);
    setBattleState(s => ({ ...s, shieldActive: true }));
    Sound.sfx.divine();
  };

  const handleBattleEnd = (result, state) => {
    if (result === "victory") {
      Sound.sfx.victory();
      if (run.pendingEnemyId === "serpent" && run.roomsCleared === 0) {
        unlockAchievement("serpent_slayer");
      }
      const tookDamage = state.playerHp < run.playerHp;
      if (!tookDamage) {
        updateRun({
          battlesWithoutDamage: run.battlesWithoutDamage + 1,
          playerHp: state.playerHp,
        });
        if (run.battlesWithoutDamage + 1 >= 3) {
          unlockAchievement("unscathed");
        }
        if (scriptureOnlyBattle) {
          unlockAchievement("by_faith_alone");
        }
      } else {
        updateRun({
          battlesWithoutDamage: 0,
          playerHp: state.playerHp,
          neverLostHp: false,
        });
      }
      Sound.playMusic("victory");
      setTimeout(() => setPhase("reward"), 1200);
    } else {
      Sound.sfx.defeat();
      Sound.playMusic("defeat");
      setTimeout(() => setPhase("defeat"), 1500);
    }
  };

  if (!battleState) return <div className="min-h-screen flex items-center justify-center text-amber-200">Loading battle...</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)" }}>
      {/* Enemy area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-serif text-red-200">{enemy.name}</h2>
          {enemy.isBoss && <span className="text-red-400 text-sm font-bold tracking-widest">⚠ BOSS ⚠</span>}
        </div>
        <div className="relative">
          <div className={`text-8xl mb-3 ${battleEnd === "victory" ? "animate-bounce" : ""} ${battleEnd === "defeat" ? "opacity-30" : ""}`}>
            {enemy.icon}
          </div>
          {/* Enemy HP bar */}
          <div className="w-48 h-5 bg-slate-900 rounded-full border-2 border-red-900/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              style={{ width: `${(battleState.enemy.currentHp / battleState.enemy.maxHp) * 100}%` }}
            />
          </div>
          <p className="text-center text-red-200 text-sm mt-1">{battleState.enemy.currentHp} / {battleState.enemy.maxHp} HP</p>
        </div>
      </div>

      {/* Battle log */}
      <div className="px-4 mb-2 max-h-16 overflow-y-auto text-center">
        {battleState.log.slice(-2).map((entry, i) => (
          <p key={i} className="text-amber-100/60 text-xs">{entry}</p>
        ))}
      </div>

      {/* Player stats */}
      <div className="px-6 py-3 border-t border-amber-500/10 flex items-center justify-between" style={{ background: "rgba(15,10,5,0.6)" }}>
        <div className="flex items-center gap-4">
          <div className="text-3xl">{hero.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❤️</span>
              <div className="w-32 h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(battleState.playerHp / battleState.maxPlayerHp) * 100}%` }} />
              </div>
              <span className="text-emerald-200 text-sm font-bold">{battleState.playerHp}/{battleState.maxPlayerHp}</span>
            </div>
            {battleState.playerBlock > 0 && (
              <p className="text-blue-300 text-xs">🛡️ {battleState.playerBlock} block</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hero.id === "noah" && !covenantShieldUsed && (
            <button
              onClick={handleCovenantShield}
              className="px-3 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 text-amber-200 text-xs font-bold hover:bg-amber-500/20 transition"
            >
              🌈 Covenant Shield
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-yellow-200 text-xl font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-xs">/ {battleState.maxEnergy}</span>
          </div>
          <button
            onClick={handleEndTurn}
            disabled={animating || battleState.turn !== "player" || battleEnd}
            className="px-5 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition disabled:opacity-40"
          >
            End Turn →
          </button>
        </div>
      </div>

      {/* Hand */}
      <div className="py-4 px-4 flex justify-center gap-2 overflow-x-auto" style={{ background: "rgba(15,10,5,0.8)" }}>
        {battleState.hand.length === 0 && (
          <p className="text-amber-100/40 text-sm py-8">No cards in hand</p>
        )}
        {battleState.hand.map((cardId, idx) => {
          const card = getCardById(cardId);
          if (!card) return null;
          const playable = battleState.freeCardsRemaining > 0 || battleState.energy >= card.cost;
          const blocked = battleState.blockScripture && card.type === "scripture";
          return (
            <Card
              key={idx}
              card={card}
              inHand
              playable={playable && !blocked}
              selected={selectedCard === idx}
              onClick={() => handlePlayCard(idx)}
            />
          );
        })}
      </div>

      {/* Battle end overlay */}
      {battleEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="text-center">
            {battleEnd === "victory" ? (
              <>
                <div className="text-8xl mb-4 animate-bounce">⚔️</div>
                <h2 className="text-5xl font-serif text-amber-200">Victory!</h2>
              </>
            ) : (
              <>
                <div className="text-8xl mb-4 opacity-50">💀</div>
                <h2 className="text-5xl font-serif text-red-300">Defeated</h2>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}