import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { createBattleState, playCard as playCardEngine, endPlayerTurn, enemyTurn, checkBattleEnd } from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card from "@/components/game/Card";
import TutorialOverlay from "@/components/game/TutorialOverlay";
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
  const [showLog, setShowLog] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!profile.tutorialSeen && run.roomsCleared === 0);

  useEffect(() => {
    Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    const state = createBattleState(
      enemy,
      run.playerHp,
      run.maxHp,
      run.deck,
      0,
      run.extraDraw,
      run.hero?.id
    );
    if (run.shieldActive) state.shieldActive = true;
    if (run.buffAttack > 0) state.buffAttack = run.buffAttack;
    if (run.freeCardsNext > 0) state.freeCardsRemaining = run.freeCardsNext;
    setBattleState(state);
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    saveProfile({ tutorialSeen: true });
  };

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
      const goldReward = enemy.isBoss ? 30 : 10 + Math.floor(Math.random() * 5);
      if (run.pendingEnemyId === "serpent" && run.roomsCleared === 0) {
        unlockAchievement("serpent_slayer");
      }
      const tookDamage = state.playerHp < run.playerHp;
      if (!tookDamage) {
        updateRun({
          battlesWithoutDamage: run.battlesWithoutDamage + 1,
          playerHp: state.playerHp,
          gold: run.gold + goldReward,
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
          gold: run.gold + goldReward,
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
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)" }}>
      {/* Top row: pause */}
      <div className="flex items-center justify-end px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1">
        <button
          onClick={() => { setShowPause(true); Sound.sfx.click(); }}
          className="w-9 h-9 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          ⏸
        </button>
      </div>

      {/* Enemy area — compressed */}
      <div className="flex-shrink-0 flex flex-col items-center px-3 pb-1">
        <div className="text-center mb-1">
          <h2 className="text-lg font-serif text-red-200 leading-tight">{enemy.name}</h2>
          {enemy.isBoss && <span className="text-red-400 text-[10px] font-bold tracking-widest">⚠ BOSS ⚠</span>}
        </div>

        {/* Enemy Intent — compact single row */}
        {battleState.enemyHand?.length > 0 && !battleEnd && (
          <div className="mb-1 px-2 py-1 rounded-lg border border-red-500/40 bg-red-900/30 flex items-center gap-1 justify-center flex-wrap max-w-[95%]">
            <span className="text-red-200 text-[9px] font-bold uppercase tracking-wide mr-1">Plan:</span>
            {battleState.enemyHand.map((action, i) => (
              <React.Fragment key={i}>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-950/40">
                  <span className="text-xs">{action.icon}</span>
                  <span className="text-red-100 text-[10px] font-medium">{action.name}</span>
                  <span className="text-red-300/60 text-[9px]">{action.damage ? `${action.damage}dmg` : action.effect === "block" ? "🛡" : action.effect === "heal_self" ? "✚" : ""}</span>
                </span>
                {i < battleState.enemyHand.length - 1 && <span className="text-red-300/30 text-[9px]">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="relative flex flex-col items-center">
          <div
            className={`text-5xl mb-1 transition-transform duration-300 ${
              battleEnd === "victory" ? "animate-bounce" : ""
            } ${battleEnd === "defeat" ? "opacity-30" : ""} ${
              enemyAttackAnim ? "animate-enemy-lunge" : ""
            } ${enemyShake ? "animate-shake" : ""} ${enemyFlash ? "animate-damage-flash" : ""}`}
          >
            {enemy.icon}
          </div>
          {/* Enemy HP bar */}
          <div className="w-36 h-3 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              style={{ width: `${(battleState.enemy.currentHp / battleState.enemy.maxHp) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <p className="text-red-200 text-[11px]">{battleState.enemy.currentHp}/{battleState.enemy.maxHp} HP</p>
            {battleState.enemyBlock > 0 && (
              <p className="text-blue-300 text-[11px]">🛡️{battleState.enemyBlock}</p>
            )}
          </div>
        </div>
      </div>

      {/* Combat Log — collapsed, one latest message */}
      <div className="flex-shrink-0 px-3 py-1">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full flex items-center justify-between px-2 py-1 rounded-md border border-amber-500/15 bg-slate-900/50 text-amber-100/70 text-[9px] uppercase tracking-wide hover:bg-slate-900/70 transition"
        >
          <span className="truncate">📜 {battleState.log[battleState.log.length - 1] || "Battle log"}</span>
          <span className="flex-shrink-0 ml-1">{showLog ? "▲" : "▼"}</span>
        </button>
        {showLog && (
          <div className="rounded-md border border-amber-500/15 bg-slate-900/50 p-1.5 mt-1 max-h-16 overflow-y-auto">
            {battleState.log.slice(-4).map((entry, i) => (
              <p key={i} className="text-amber-100/80 text-[11px] leading-snug">
                {entry}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Player stats — compact single row */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-amber-500/10 flex items-center justify-between gap-2" style={{ background: "rgba(15,10,5,0.6)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`text-2xl transition-transform flex-shrink-0 ${playerShake ? "animate-shake" : ""} ${playerFlash ? "animate-heal-pulse" : ""} ${playerAttackAnim ? "animate-attack-lunge" : ""}`}
          >
            {hero.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">❤️</span>
              <div className="w-16 h-3 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(battleState.playerHp / battleState.maxPlayerHp) * 100}%` }} />
              </div>
              <span className="text-emerald-200 text-[11px] font-bold flex-shrink-0">{battleState.playerHp}/{battleState.maxPlayerHp}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              {battleState.playerBlock > 0 && (
                <span className="text-blue-300">🛡️{battleState.playerBlock}</span>
              )}
              {battleState.thorns > 0 && (
                <span className="text-orange-300">🗡️{battleState.thorns}</span>
              )}
              {battleState.dots > 0 && (
                <span className="text-purple-300">☠️{battleState.dots}</span>
              )}
              <span className="text-amber-100/50">🃏{battleState.deck.length} 🗑{battleState.discard.length}</span>
            </div>
          </div>
        </div>

        {/* Faith + End Turn together */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hero.id === "noah" && !covenantShieldUsed && (
            <button
              onClick={handleCovenantShield}
              disabled={isEnemyTurn}
              className="px-2 py-1 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 text-amber-200 text-[10px] font-bold hover:bg-amber-500/20 transition disabled:opacity-40"
            >
              🌈
            </button>
          )}
          <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-amber-900/20 border border-amber-400/30">
            <span className="text-sm">✨</span>
            <span className="text-yellow-200 text-sm font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-[9px]">/{battleState.maxEnergy}</span>
          </div>
          <button
            onClick={handleEndTurn}
            disabled={isEnemyTurn}
            className="px-3 py-1.5 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-xs hover:bg-amber-600/40 transition disabled:opacity-40 whitespace-nowrap"
          >
            End Turn →
          </button>
        </div>
      </div>

      {/* Hand — bottom, horizontal scroll, safe area */}
      <div className="flex-1 flex items-end overflow-hidden px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] gap-2 min-h-0" style={{ background: "rgba(15,10,5,0.8)" }}>
        {battleState.hand.length === 0 && (
          <p className="text-amber-100/40 text-xs py-4 w-full text-center">No cards — End Turn to draw</p>
        )}
        <div className="flex gap-2 overflow-x-auto flex-nowrap snap-x pb-1">
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
                small
                playable={playable && !blocked && !isEnemyTurn}
                selected={selectedCard === idx}
                onClick={() => handlePlayCard(idx)}
              />
            );
          })}
        </div>
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

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
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