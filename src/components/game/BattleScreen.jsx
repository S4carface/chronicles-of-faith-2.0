import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Heart, Shield, Skull, Sparkles, Swords as SwordsIcon, ChevronUp, ChevronDown, Volume2 } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { createBattleState, playCard as playCardEngine, endPlayerTurn, enemyTurn, checkBattleEnd, getEnemyTurnSteps } from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card from "@/components/game/Card";
import CardPreviewPanel from "@/components/game/CardPreviewPanel";
import CardDetailModal from "@/components/game/CardDetailModal";
import GuidanceHint from "@/components/game/GuidanceHint";
import { getIntentExplanation } from "@/game/intentExplanations";
import TutorialOverlay from "@/components/game/TutorialOverlay";
import useResponsive from "@/hooks/useResponsive";
import { ENEMY_ART, HERO_ART, INTENT_ART, VICTORY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

function getActionType(action) {
  if (!action) return "attack";
  if (action.effect === "block") return "block";
  if (["skip_draw", "block_scripture", "dot", "drain", "discard", "random_card"].includes(action.effect)) return "curse";
  if (action.damage > 0) return "attack";
  if (action.effect === "heal_self") return "heal";
  return "attack";
}

function getIntentAmountText(action, enemy) {
  const parts = [];
  if (action.damage > 0) parts.push(`${action.damage} DMG`);
  if (action.effect === "block") parts.push(`+${action.blockValue || 5} Block`);
  if (action.effect === "heal_self") parts.push(`+${enemy?.isBoss ? 6 : 4} HP`);
  if (action.effect === "dot") parts.push("Curse");
  if (action.effect === "skip_draw") parts.push("−1 Draw");
  if (action.effect === "block_scripture") parts.push("Silence");
  if (action.effect === "drain") parts.push("Drain Faith");
  if (action.effect === "discard") parts.push("Discard");
  if (action.effect === "random_card") parts.push("Confuse");
  return parts.join(" · ");
}

const INTENT_TYPE_MAP = {
  attack: { art: INTENT_ART.attack, label: "Strike", color: "text-red-300", border: "border-red-500/40" },
  block: { art: INTENT_ART.block, label: "Shield", color: "text-blue-300", border: "border-blue-500/40" },
  heal: { art: INTENT_ART.heal, label: "Heal", color: "text-emerald-300", border: "border-emerald-500/40" },
  curse: { art: INTENT_ART.curse, label: "Curse", color: "text-purple-300", border: "border-purple-500/40" },
};

export default function BattleScreen() {
  const { run, updateRun, saveBattleState, setPhase, completeRoom, unlockAchievement, profile, saveProfile, endRun } = useGame();
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  const enemy = run.dailyEnemy || ENEMIES[run.pendingEnemyId];
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
  const [longPressCard, setLongPressCard] = useState(null);
  const [showTutorial, setShowTutorial] = useState(!profile.tutorialSeen && run.roomsCleared === 0 && !run.isDaily);
  const [currentIntentIdx, setCurrentIntentIdx] = useState(-1);
  const [floatingText, setFloatingText] = useState(null);
  const [intentExplain, setIntentExplain] = useState(null);

  useEffect(() => {
    Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    if (run.currentBattleState) {
      setBattleState(run.currentBattleState);
      return;
    }
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
    if (run.isDaily) {
      if (run.dailyMaxEnergy) { state.maxEnergy = run.dailyMaxEnergy; state.energy = run.dailyMaxEnergy; }
      if (run.dailyEnemyStartBlock) state.enemyBlock = run.dailyEnemyStartBlock;
      if (run.dailyPlayerStartBlock) state.playerBlock = run.dailyPlayerStartBlock;
    }
    setBattleState(state);
  }, []);

  useEffect(() => {
    if (battleState) {
      saveBattleState(battleState);
    }
  }, [battleState]);

  // Desktop: expand combat log by default for readability
  useEffect(() => { setShowLog(isDesktop); }, [isDesktop]);

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

    // Type-specific sounds and animations
    if (card.type === "attack") {
      Sound.sfx.attack();
      setPlayerAttackAnim(true);
      setTimeout(() => {
        Sound.sfx.hit();
        setEnemyShake(true);
        setEnemyFlash(true);
      }, 250);
      setTimeout(() => {
        setPlayerAttackAnim(false);
        setEnemyShake(false);
        setEnemyFlash(false);
      }, 600);
    } else if (card.type === "miracle") {
      Sound.sfx.miracle();
      setPlayerAttackAnim(true);
      setTimeout(() => {
        setEnemyShake(true);
        setEnemyFlash(true);
      }, 250);
      setTimeout(() => {
        setPlayerAttackAnim(false);
        setEnemyShake(false);
        setEnemyFlash(false);
      }, 600);
    } else if (card.type === "scripture") {
      Sound.sfx.scripture();
      setPlayerFlash(true);
      setTimeout(() => setPlayerFlash(false), 500);
    } else if (card.type === "defense") {
      Sound.sfx.defense();
    }

    // Scripture sub-sounds: draw, gain faith, heal
    if (card.type === "scripture") {
      if (["wisdom", "jacobs_ladder", "doves_peace", "manna_heaven"].includes(card.id)) {
        setTimeout(() => Sound.sfx.drawCard(), 250);
      }
      if (["song_praise", "coat_colors"].includes(card.id)) {
        setTimeout(() => Sound.sfx.gainFaith(), 250);
      }
      if (["prayer", "bread_life", "living_water", "burning_bush", "doves_peace", "manna_heaven"].includes(card.id)) {
        setTimeout(() => Sound.sfx.heal(), 350);
      }
    }

    const end = checkBattleEnd(newState);
    if (end) {
      setBattleEnd(end);
      handleBattleEnd(end, newState);
    }
    setSelectedCard(null);
  };

  const handleSelectCard = (idx) => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    Sound.sfx.click();
    setSelectedCard(prev => prev === idx ? null : idx);
  };

  const handleEndTurn = () => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    const enemyAnim = profile.settings.enemyAnimation || "step";
    const endedState = endPlayerTurn(battleState);
    setBattleState(endedState);

    // Skip mode — instant resolve
    if (enemyAnim === "skip") {
      const enemyState = enemyTurn(endedState);
      setBattleState(enemyState);
      const end = checkBattleEnd(enemyState);
      if (end) { setBattleEnd(end); handleBattleEnd(end, enemyState); }
      return;
    }

    // Fast mode — single animation
    if (enemyAnim === "fast") {
      setAnimating(true);
      setTimeout(() => {
        Sound.sfx.enemyWindUp();
        setEnemyAttackAnim(true);
      }, 300);
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
        }, 400);
        const end = checkBattleEnd(enemyState);
        if (end) { setBattleEnd(end); handleBattleEnd(end, enemyState); }
        setAnimating(false);
      }, 800);
      return;
    }

    // Step-by-step mode (default)
    setAnimating(true);
    const steps = getEnemyTurnSteps(endedState);
    let stepIdx = 0;

    const clearTransient = () => {
      setFloatingText(null);
      setPlayerShake(false);
      setPlayerFlash(false);
      setEnemyFlash(false);
      setEnemyAttackAnim(false);
    };

    const resolveNextStep = () => {
      if (stepIdx >= steps.length) {
        clearTransient();
        setAnimating(false);
        setCurrentIntentIdx(-1);
        return;
      }

      const step = steps[stepIdx];

      // Shield step — Covenant Shield negates entire turn
      if (step.type === "shield") {
        Sound.sfx.divine();
        setFloatingText({ text: "Covenant Shield!", color: "#fbbf24", pos: "bottom" });
        setBattleState(step.state);
        setTimeout(() => {
          clearTransient();
          stepIdx++;
          resolveNextStep();
        }, 1200);
        return;
      }

      // Action step — enemy plays one action
      if (step.type === "action") {
        setCurrentIntentIdx(step.handIndex);
        Sound.sfx.enemyWindUp();
        setEnemyAttackAnim(true);

        setTimeout(() => {
          setEnemyAttackAnim(false);
          const actionType = getActionType(step.action);

          if (actionType === "attack") {
            Sound.sfx.enemyAttack();
            setPlayerShake(true);
            setPlayerFlash(true);
            setFloatingText({ text: `-${step.action.damage}`, color: "#f87171", pos: "bottom" });
          } else if (actionType === "block") {
            Sound.sfx.enemyDefend();
            setEnemyFlash(true);
            setFloatingText({ text: `+${step.action.blockValue || 5} Block`, color: "#60a5fa", pos: "top" });
          } else if (actionType === "heal") {
            Sound.sfx.enemyHeal();
            setEnemyFlash(true);
            setFloatingText({ text: `+${enemy.isBoss ? 6 : 4} HP`, color: "#34d399", pos: "top" });
          } else if (actionType === "curse") {
            Sound.sfx.enemyCurse();
            setPlayerFlash(true);
            setFloatingText({ text: step.action.effect === "dot" ? "Cursed!" : "Hex!", color: "#c084fc", pos: "bottom" });
          }

          setBattleState(step.state);

          // Check for defeat
          if (step.state.playerHp <= 0) {
            setTimeout(() => {
              clearTransient();
              setBattleEnd("defeat");
              handleBattleEnd("defeat", step.state);
              setAnimating(false);
              setCurrentIntentIdx(-1);
            }, 600);
            return;
          }

          // Check for victory (thorns kill enemy)
          if (step.state.enemy.currentHp <= 0) {
            setTimeout(() => {
              clearTransient();
              setBattleEnd("victory");
              handleBattleEnd("victory", step.state);
              setAnimating(false);
              setCurrentIntentIdx(-1);
            }, 600);
            return;
          }

          setTimeout(() => {
            clearTransient();
            stepIdx++;
            resolveNextStep();
          }, 700);
        }, 400);
        return;
      }

      // DOT step — curse damage
      if (step.type === "dot") {
        Sound.sfx.enemyCurse();
        setPlayerShake(true);
        setFloatingText({ text: "-2 Curse", color: "#c084fc", pos: "bottom" });
        setBattleState(step.state);
        setTimeout(() => {
          clearTransient();
          if (step.state.playerHp <= 0) {
            setBattleEnd("defeat");
            handleBattleEnd("defeat", step.state);
            setAnimating(false);
            setCurrentIntentIdx(-1);
            return;
          }
          stepIdx++;
          resolveNextStep();
        }, 700);
        return;
      }

      // End step — draw new hand, return to player
      if (step.type === "end") {
        setBattleState(step.state);
        setCurrentIntentIdx(-1);
        setAnimating(false);
        const end = checkBattleEnd(step.state);
        if (end) { setBattleEnd(end); handleBattleEnd(end, step.state); }
        return;
      }
    };

    // Start with wind-up
    setTimeout(() => {
      Sound.sfx.enemyWindUp();
      resolveNextStep();
    }, 400);
  };

  const handleCovenantShield = () => {
    if (covenantShieldUsed || hero.id !== "noah") return;
    setCovenantShieldUsed(true);
    setBattleState(s => ({ ...s, shieldActive: true }));
    Sound.sfx.divine();
  };

  const handleBattleEnd = (result, state) => {
    if (run.isDaily) {
      if (result === "victory") {
        Sound.sfx.victory();
        Sound.playMusic("victory");
      } else {
        Sound.sfx.defeat();
        Sound.playMusic("defeat");
      }
      const cardsPlayed = state.log.filter(e => e.includes("You played")).length;
      updateRun({
        dailyResult: {
          result,
          playerHp: state.playerHp,
          maxPlayerHp: state.maxPlayerHp,
          turnNumber: state.turnNumber,
          cardsPlayed,
          enemyName: enemy.name,
        },
      });
      return;
    }
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

  const isEnemyTurn = battleState.turn === "enemy" || animating;
  const enemyArt = ENEMY_ART[enemy.id];
  const heroArt = HERO_ART[hero.id];
  const guidanceLevel = profile.settings.guidanceLevel || "normal";
  const hideIntentValues = guidanceLevel === "expert" && !profile.settings.guidanceTips;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)" }}>
      <div className="flex flex-col h-full w-full lg:max-w-[1400px] lg:mx-auto">
      {/* Top row: pause */}
      <div className="flex items-center justify-end px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1">
        <button
          onClick={() => { setShowPause(true); Sound.sfx.click(); }}
          className="w-9 h-9 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* Enemy area */}
      <div className="flex-shrink-0 flex flex-col items-center px-3 pb-1 lg:pt-3">
        <div className="text-center mb-1">
          <h2 className="text-lg lg:text-3xl font-serif text-red-200 leading-tight">{enemy.name}</h2>
          {enemy.isBoss && (
            <span className="inline-block text-red-400 text-[9px] lg:text-xs font-bold tracking-widest px-2 py-0.5 rounded-full border border-red-500/30 bg-red-900/30 mt-0.5">BOSS</span>
          )}
        </div>

        {/* Enemy Intent — compact strip with painted icons */}
        {battleState.enemyHand?.length > 0 && !battleEnd && (
          <div className="mb-1 flex items-center gap-1 lg:gap-2 justify-center flex-wrap max-w-[95%] lg:max-w-[600px]">
            {battleState.enemyHand.map((action, i) => {
              const actionType = getActionType(action);
              const intentInfo = INTENT_TYPE_MAP[actionType];
              const isCurrent = currentIntentIdx === i;
              const isResolved = currentIntentIdx > i;
              return (
                <React.Fragment key={i}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIntentExplain(action); Sound.sfx.click(); }}
                    disabled={isResolved}
                    className={`flex items-center gap-1 px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-md border transition-all duration-200 ${
                      isCurrent ? `${intentInfo.border} bg-amber-500/20 scale-110 shadow-md shadow-amber-400/20` :
                      isResolved ? "border-slate-700/20 opacity-25" :
                      `${intentInfo.border} bg-slate-900/40 hover:bg-slate-800/60`
                    }`}
                  >
                    <img src={intentInfo.art} alt={intentInfo.label} className="w-4 h-4 lg:w-5 lg:h-5 object-cover rounded-sm flex-shrink-0" />
                    <span className={`${intentInfo.color} text-[9px] lg:text-xs font-medium leading-none`}>{action.name}</span>
                    {(() => {
                      if (hideIntentValues) return null;
                      const amt = getIntentAmountText(action, enemy);
                      if (!amt) return null;
                      const amtColor = actionType === "attack" ? "text-red-300/80" : actionType === "block" ? "text-blue-300/80" : actionType === "heal" ? "text-emerald-300/80" : "text-purple-300/80";
                      return <span className={`text-[8px] lg:text-xs font-bold leading-none ${amtColor}`}>{amt}</span>;
                    })()}
                  </button>
                  {i < battleState.enemyHand.length - 1 && <span className="text-amber-300/20 text-[8px]">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className="relative flex flex-col items-center">
          <div
            className={`mb-1 transition-transform duration-300 ${
              battleEnd === "victory" ? "animate-bounce" : ""
            } ${battleEnd === "defeat" ? "opacity-30" : ""} ${
              enemyAttackAnim ? "animate-enemy-lunge" : ""
            } ${enemyShake ? "animate-shake" : ""} ${enemyFlash ? "animate-damage-flash" : ""}`}
          >
            {enemyArt ? (
              <div className="w-24 h-24 lg:w-40 lg:h-40 rounded-lg border-2 border-red-900/60 overflow-hidden" style={{ background: "linear-gradient(135deg, #1A0A0A 0%, #2A1212 100%)" }}>
                <img src={enemyArt} alt={enemy.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-5xl">{enemy.icon}</span>
            )}
          </div>
          {/* Enemy HP bar */}
          <div className="w-36 lg:w-56 h-3 lg:h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              style={{ width: `${(battleState.enemy.currentHp / battleState.enemy.maxHp) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <p className="text-red-200 text-[11px] lg:text-base">{battleState.enemy.currentHp}/{battleState.enemy.maxHp} HP</p>
            {battleState.enemyBlock > 0 && (
              <span className="text-blue-300 text-[11px] lg:text-base flex items-center gap-0.5">
                <Shield className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.enemyBlock}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Combat Log */}
      <div className="flex-shrink-0 px-3 py-1 lg:py-2">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full flex items-center justify-between px-2 py-1 rounded-md border border-amber-500/15 bg-slate-900/50 text-amber-100/70 text-[9px] lg:text-xs uppercase tracking-wide hover:bg-slate-900/70 transition"
        >
          <span className="truncate flex items-center gap-1">
            <span className="text-amber-300/40">Log:</span>
            {battleState.log[battleState.log.length - 1] || "Battle log"}
          </span>
          {showLog ? <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />}
        </button>
        {showLog && (
          <div className="rounded-md border border-amber-500/15 bg-slate-900/50 p-1.5 lg:p-2 mt-1 max-h-16 lg:max-h-32 overflow-y-auto">
            {battleState.log.slice(-6).map((entry, i) => (
              <p key={i} className="text-amber-100/80 text-[11px] lg:text-sm leading-snug">
                {entry}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Floating combat text */}
      {floatingText && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
          <span
            className="text-4xl font-serif font-bold animate-fade-in"
            style={{
              color: floatingText.color,
              textShadow: `0 0 20px ${floatingText.color}`,
              transform: floatingText.pos === "top" ? "translateY(-150px)" : "translateY(100px)",
            }}
          >
            {floatingText.text}
          </span>
        </div>
      )}

      {/* Guidance hint — Guided mode tactical suggestion */}
      {(profile.settings.guidanceLevel === "guided" || profile.settings.guidanceTips) && !battleEnd && !isEnemyTurn && (
        <GuidanceHint battleState={battleState} />
      )}

      {/* Player stats — compact single row */}
      <div className="flex-shrink-0 px-3 py-1.5 lg:py-2.5 border-t border-amber-500/10 flex items-center justify-between gap-2" style={{ background: "rgba(15,10,5,0.6)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`transition-transform flex-shrink-0 ${playerShake ? "animate-shake" : ""} ${playerFlash ? "animate-heal-pulse" : ""} ${playerAttackAnim ? "animate-attack-lunge" : ""}`}
          >
            {heroArt ? (
              <img src={heroArt} alt={hero.name} className="w-8 h-8 lg:w-12 lg:h-12 object-cover rounded-full border border-amber-500/30" />
            ) : (
              <span className="text-2xl lg:text-4xl">{hero.icon}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 lg:w-5 lg:h-5 text-red-400 flex-shrink-0" />
              <div className="w-16 lg:w-36 h-3 lg:h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(battleState.playerHp / battleState.maxPlayerHp) * 100}%` }} />
              </div>
              <span className="text-emerald-200 text-[11px] lg:text-base font-bold flex-shrink-0">{battleState.playerHp}/{battleState.maxPlayerHp}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] lg:text-sm">
              {battleState.playerBlock > 0 && (
                <span className="text-blue-300 flex items-center gap-0.5">
                  <Shield className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.playerBlock}
                </span>
              )}
              {battleState.thorns > 0 && (
                <span className="text-orange-300 flex items-center gap-0.5">
                  <SwordsIcon className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.thorns}
                </span>
              )}
              {battleState.dots > 0 && (
                <span className="text-purple-300 flex items-center gap-0.5">
                  <Skull className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.dots}
                </span>
              )}
              <span className="text-amber-100/40">Deck {battleState.deck.length} · Discard {battleState.discard.length}</span>
            </div>
          </div>
        </div>

        {/* Faith + End Turn */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hero.id === "noah" && !covenantShieldUsed && (
            <button
              onClick={handleCovenantShield}
              disabled={isEnemyTurn}
              className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition disabled:opacity-40"
              title="Covenant Shield"
            >
              <Shield className="w-3 h-3 lg:w-5 lg:h-5" />
            </button>
          )}
          <div className="flex items-center gap-0.5 px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-amber-900/20 border border-amber-400/30">
            <Sparkles className="w-3 h-3 lg:w-5 lg:h-5 text-yellow-200" />
            <span className="text-yellow-200 text-sm lg:text-xl font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-[9px] lg:text-xs">/{battleState.maxEnergy}</span>
          </div>
          <button
            onClick={handleEndTurn}
            disabled={isEnemyTurn}
            className="px-3 py-1.5 lg:px-6 lg:py-2.5 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-xs lg:text-base hover:bg-amber-600/40 transition disabled:opacity-40 whitespace-nowrap"
          >
            End Turn →
          </button>
        </div>
      </div>

      {/* Bottom: hand — extra bottom padding when card selected */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: "rgba(15,10,5,0.8)" }}>
        <div className={`flex-1 flex items-end justify-center overflow-hidden px-3 pt-2 min-h-0 transition-all duration-200 ${selectedCard !== null ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-[calc(0.75rem+env(safe-area-inset-bottom))]"}`}>
          {battleState.hand.length === 0 && (
            <p className="text-amber-100/50 text-xs py-4 w-full text-center">No cards — End Turn to draw</p>
          )}
          <div className="flex gap-2 lg:gap-4 overflow-x-auto flex-nowrap snap-x pb-1 w-full justify-center">
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
                  small={!isDesktop}
                  playable={playable && !blocked && !isEnemyTurn}
                  selected={selectedCard === idx}
                  onClick={() => handleSelectCard(idx)}
                  onLongPress={() => setLongPressCard(card)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected card preview — compact bar, hand stays visible */}
      {selectedCard !== null && battleState.hand[selectedCard] && (() => {
        const selCard = getCardById(battleState.hand[selectedCard]);
        if (!selCard) return null;
        const playable = battleState.freeCardsRemaining > 0 || battleState.energy >= selCard.cost;
        const blocked = battleState.blockScripture && selCard.type === "scripture";
        return (
          <CardPreviewPanel
            card={selCard}
            playable={playable && !isEnemyTurn}
            blocked={blocked}
            onPlay={() => handlePlayCard(selectedCard)}
            onCancel={() => { Sound.sfx.click(); setSelectedCard(null); }}
          />
        );
      })()}

      {/* Battle end overlay */}
      {battleEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center">
            {battleEnd === "victory" ? (
              <>
                <div className="mb-4 flex justify-center">
                  <img src={VICTORY_ART.crest} alt="Victory" className="w-20 h-20 object-cover rounded-full border-2 border-amber-400/50 shadow-xl shadow-amber-400/30 animate-bounce" />
                </div>
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
                <div className="mb-4 flex justify-center">
                  <Skull className="w-20 h-20 text-red-400/50" />
                </div>
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

      {/* Long-press card detail */}
      {longPressCard && (
        <CardDetailModal
          card={longPressCard}
          owned={false}
          onClose={() => setLongPressCard(null)}
        />
      )}

      {/* Intent explanation popover */}
      {intentExplain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.85)" }} onClick={() => setIntentExplain(null)}>
          <div
            className="max-w-xs w-full rounded-xl border-2 p-4 animate-fade-in"
            style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)", borderColor: getActionType(intentExplain) === "attack" ? "rgba(248,113,113,0.5)" : getActionType(intentExplain) === "block" ? "rgba(96,165,250,0.5)" : getActionType(intentExplain) === "heal" ? "rgba(52,211,153,0.5)" : "rgba(192,132,252,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-serif text-amber-200">{intentExplain.name}</h3>
              <button onClick={() => setIntentExplain(null)} className="text-amber-100/40 hover:text-amber-200 text-sm">✕</button>
            </div>
            <p className="text-amber-100/80 text-xs leading-relaxed">
              {getIntentExplanation(intentExplain, enemy)}
            </p>
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
                <span className="text-amber-100 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-300/70" />
                  Music
                </span>
                <span className={profile.settings.music ? "text-emerald-300" : "text-slate-500"}>
                  {profile.settings.music ? "ON" : "OFF"}
                </span>
              </button>
              <button
                onClick={toggleSfx}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-slate-900/40"
              >
                <span className="text-amber-100 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-300/70" />
                  Sound Effects
                </span>
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
    </div>
  );
}