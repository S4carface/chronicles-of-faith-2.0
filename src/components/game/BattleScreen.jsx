import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { createBattleState, playCard as playCardEngine, endPlayerTurn, enemyTurn, checkBattleEnd } from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card from "@/components/game/Card";
import * as Sound from "@/game/soundManager";

export default function BattleScreen() {
  const { run, updateRun, setPhase, completeRoom, unlockAchievement, profile, saveProfile, endRun } = useGame();
  const navigate = useNavigate();
  const enemy = ENEMIES[run.pendingEnemyId];
  const [battleState, setBattleState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [battleEnd, setBattleEnd] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [hero, setHero] = useState(run.hero);
  const [covenantShieldUsed, setCovenantShieldUsed] = useState(false);
  const [scriptureOnlyBattle, setScriptureOnlyBattle] = useState(true);
  const [enemyAttackAnim, setEnemyAttackAnim] = useState(false);
  const [playerAttackAnim, setPlayerAttackAnim] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [showPause, setShowPause] = useState(false);

  useEffect(() => {
    Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    const state = createBattleState(
      enemy,
      run.playerHp,
      run.deck,
      0,
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

    if (card.rarity === "legendary") {
      unlockAchievement("miracle_worker");
      updateRun({ usedLegendary: true });
    }
    if (card.type !== "scripture") {
      setScriptureOnlyBattle(false);
    }

    const newState = playCardEngine(battleState, handIndex, card);
    setBattleState(newState);

    // Trigger animations
    if (card.type === "attack" || card.type === "miracle") {
      Sound.sfx.attack();
      setPlayerAttackAnim(true);
      setTimeout(() => {
        setEnemyShake(true);
        setEnemyFlash(true);
        Sound.sfx.enemyAttack();
      }, 250);
      setTimeout(() => {
        setPlayerAttackAnim(false);
        setEnemyShake(false);
        setEnemyFlash(false);
      }, 600);
    } else if (card.type === "scripture") {
      Sound.sfx.heal();
      setPlayerFlash(true);
      setTimeout(() => setPlayerFlash(false), 500);
    } else if (card.type === "defense") {
      Sound.sfx.shield();
    }

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

    // Enemy wind-up phase
    setTimeout(() => {
      Sound.sfx.enemyWindUp();
      setEnemyAttackAnim(true);
    }, 400);

    // Enemy strikes
    setTimeout(() => {
      const enemyState = enemyTurn(endedState);
      setEnemyAttackAnim(false);
      setPlayerShake(true);
      setPlayerFlash(true);
      Sound.sfx.enemyAttack();
      setBattleState(enemyState);

      setTimeout(() => {
        setPlayerShake(false);
        setPlayerFlash(false);
      }, 500);

      const end = checkBattleEnd(enemyState);
      if (end) {
        setBattleEnd(end);
        handleBattleEnd(end, enemyState);
      }
      setAnimating(false);
    }, 1100);
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
    } else {
      Sound.sfx.defeat();
      Sound.playMusic("defeat");
    }
  };

  const toggleMusic = () => {
    const newVal = !profile.settings.music;
    saveProfile({ settings: { ...profile.settings, music: newVal } });
    if (newVal) Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    Sound.sfx.click();
  };

  const toggleSfx = () => {
    const newVal = !profile.settings.sfx;
    saveProfile({ settings: { ...profile.settings, sfx: newVal } });
    if (newVal) Sound.sfx.click();
  };

  const handleAbandon = () => {
    endRun();
    navigate("/");
  };

  if (!battleState) return <div className="min-h-screen flex items-center justify-center text-amber-200">Loading battle...</div>;

  const intent = battleState.enemyIntent;
  const isEnemyTurn = battleState.turn === "enemy" || animating;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)" }}>
      {/* Top bar with pause */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={() => { setShowPause(true); Sound.sfx.click(); }}
          className="w-10 h-10 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          ⏸
        </button>
      </div>

      {/* Enemy area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-serif text-red-200">{enemy.name}</h2>
          {enemy.isBoss && <span className="text-red-400 text-sm font-bold tracking-widest">⚠ BOSS ⚠</span>}
        </div>

        {/* Enemy Intent — Telegraphing */}
        {intent && !battleEnd && (
          <div className="mb-3 px-4 py-2 rounded-lg border-2 border-red-500/40 bg-red-900/30 flex items-center gap-2 animate-fade-in">
            <span className="text-xl">{intent.icon}</span>
            <div className="text-left">
              <p className="text-red-200 text-xs font-bold">Next Attack:</p>
              <p className="text-red-100 text-sm">{intent.name} — {intent.damage} DMG</p>
              {intent.description && (
                <p className="text-red-300/60 text-[10px] italic">{intent.description}</p>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <div
            className={`text-8xl mb-3 transition-transform duration-300 ${
              battleEnd === "victory" ? "animate-bounce" : ""
            } ${battleEnd === "defeat" ? "opacity-30" : ""} ${
              enemyAttackAnim ? "animate-enemy-lunge" : ""
            } ${enemyShake ? "animate-shake" : ""} ${enemyFlash ? "animate-damage-flash" : ""}`}
          >
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

      {/* Combat Log — scrollable */}
      <div className="px-4 mb-2 mx-auto w-full max-w-md">
        <div className="rounded-lg border border-amber-500/15 bg-slate-900/50 p-2 max-h-24 overflow-y-auto">
          {battleState.log.slice(-5).map((entry, i) => (
            <p key={i} className="text-amber-100/70 text-xs leading-relaxed">
              {entry}
            </p>
          ))}
        </div>
      </div>

      {/* Player stats */}
      <div className="px-6 py-3 border-t border-amber-500/10 flex items-center justify-between" style={{ background: "rgba(15,10,5,0.6)" }}>
        <div className="flex items-center gap-4">
          <div
            className={`text-3xl transition-transform ${playerShake ? "animate-shake" : ""} ${playerFlash ? "animate-heal-pulse" : ""} ${playerAttackAnim ? "animate-attack-lunge" : ""}`}
          >
            {hero.icon}
          </div>
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
            {battleState.dots > 0 && (
              <p className="text-purple-300 text-xs">☠️ Cursed ({battleState.dots} turns)</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hero.id === "noah" && !covenantShieldUsed && (
            <button
              onClick={handleCovenantShield}
              disabled={isEnemyTurn}
              className="px-3 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 text-amber-200 text-xs font-bold hover:bg-amber-500/20 transition disabled:opacity-40"
            >
              🌈 Shield
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-yellow-200 text-xl font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-xs">/ {battleState.maxEnergy}</span>
          </div>
          <button
            onClick={handleEndTurn}
            disabled={isEnemyTurn}
            className="px-5 py-2 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition disabled:opacity-40"
          >
            End Turn →
          </button>
        </div>
      </div>

      {/* Hand */}
      <div className="py-4 px-4 flex justify-center gap-2 overflow-x-auto" style={{ background: "rgba(15,10,5,0.8)" }}>
        {battleState.hand.length === 0 && (
          <p className="text-amber-100/40 text-sm py-8">No cards in hand — End Turn to draw</p>
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
              playable={playable && !blocked && !isEnemyTurn}
              selected={selectedCard === idx}
              onClick={() => handlePlayCard(idx)}
            />
          );
        })}
      </div>

      {/* Battle end overlay — wait for click */}
      {battleEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center">
            {battleEnd === "victory" ? (
              <>
                <div className="text-8xl mb-4 animate-bounce">⚔️</div>
                <h2 className="text-5xl font-serif text-amber-200 mb-6">Victory!</h2>
                <button
                  onClick={() => setPhase("reward")}
                  className="px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-xl hover:bg-amber-600/40 transition"
                >
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div className="text-8xl mb-4 opacity-50">💀</div>
                <h2 className="text-5xl font-serif text-red-300 mb-6">Defeated</h2>
                <button
                  onClick={() => setPhase("defeat")}
                  className="px-10 py-3 rounded-lg border-2 border-red-400/60 bg-red-900/30 text-red-100 font-serif text-xl hover:bg-red-800/40 transition"
                >
                  Continue →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {showPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(8,12,24,0.95)" }}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-8" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <h2 className="text-2xl font-serif text-amber-200 text-center mb-6">Paused</h2>

            <div className="space-y-4">
              <button
                onClick={toggleMusic}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-slate-900/40"
              >
                <span className="text-amber-100">🎵 Music</span>
                <span className={profile.settings.music ? "text-emerald-300" : "text-slate-500"}>
                  {profile.settings.music ? "ON" : "OFF"}
                </span>
              </button>
              <button
                onClick={toggleSfx}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-slate-900/40"
              >
                <span className="text-amber-100">🔊 Sound Effects</span>
                <span className={profile.settings.sfx ? "text-emerald-300" : "text-slate-500"}>
                  {profile.settings.sfx ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => { setShowPause(false); Sound.sfx.click(); }}
                className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
              >
                Resume Battle
              </button>
              <button
                onClick={handleAbandon}
                className="w-full px-6 py-2 rounded-lg border border-red-400/40 bg-red-900/20 text-red-200 text-sm hover:bg-red-800/30 transition"
              >
                Abandon Run & Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}