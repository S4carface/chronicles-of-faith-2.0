import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Heart, Shield, Skull, Sparkles, Swords as SwordsIcon, ChevronUp, ChevronDown, Volume2, Zap, Check } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { createBattleState, playCard as playCardEngine, endPlayerTurn, enemyTurn, checkBattleEnd, getEnemyTurnSteps, drawCards } from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card from "@/components/game/Card";
import CardPreviewPanel from "@/components/game/CardPreviewPanel";
import EndTurnConfirmModal from "@/components/game/EndTurnConfirmModal";
import CardDetailModal from "@/components/game/CardDetailModal";
import GuidanceHint from "@/components/game/GuidanceHint";
import { getIntentExplanation } from "@/game/intentExplanations";
import BattleHelper from "@/components/game/BattleHelper";
import BattleGuideCallouts from "@/components/game/BattleGuideCallouts";
import GuidedBattleTutorial, { TUTORIAL_TOTAL_STEPS } from "@/components/game/GuidedBattleTutorial";
import useResponsive from "@/hooks/useResponsive";
import { ENEMY_ART, HERO_ART, INTENT_ART, VICTORY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import { recordBattleWon, recordBattleLost, recordCardPlayed, recordDamage, recordBlock, recordHealing } from "@/game/playerStats";
import { applyBossModifier } from "@/data/bossModifiers";

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

// Convert a raw battle log entry into plain language for the collapsed summary line.
function simplifyLogEntry(entry) {
  if (!entry) return "";
  let s = entry;
  // Player actions
  s = s.replace(/^⚔️\s.*?—\s(\d+)\s*dmg.*$/, `You dealt $1 damage`);
  s = s.replace(/^🛡️\s.*?—\s(\d+)\s*block.*$/, `You gained $1 Block`);
  s = s.replace(/^💚\s.*?—\s\+(\d+)\s*HP.*$/, `You healed $1 HP`);
  s = s.replace(/^✨\s.*?—\s(\d+)\s*(?:holy )?dmg.*$/, `You dealt $1 holy damage`);
  s = s.replace(/^🎵\s.*—\s\+2\s*Faith$/, `You gained 2 Faith`);
  s = s.replace(/^🌈\s.*—\s\+3\s*Faith$/, `You gained 3 Faith`);
  s = s.replace(/^📖\s.*—\s*drew\s(\d+)$/, `You drew $1 cards`);
  s = s.replace(/^🪜\s.*—\s*drew\s(\d+)$/, `You drew $1 cards`);
  s = s.replace(/^🦁\sCounter.*$/, ``);
  s = s.replace(/^🎯\s.*—\snext attack.*$/, `Next attack will deal double damage`);
  // Enemy actions
  s = s.replace(/^💥\s.*?—\s(\d+)\s*dmg.*$/, `Enemy dealt $1 damage`);
  s = s.replace(/^🛡️\sEnemy\sblocked\s(\d+)$/, `Enemy blocked $1`);
  s = s.replace(/^🛡️\sBlocked\s(\d+)$/, `Blocked $1 damage`);
  s = s.replace(/^🛡️\s.*?—\s\+(\d+)\s*block.*$/, `Enemy gained $1 Block`);
  s = s.replace(/^✨\s.*?\s.*?healed\s(\d+)$/, `Enemy healed $1 HP`);
  s = s.replace(/^✨\s\+(\d+)\s*HP.*$/, `Enemy healed $1 HP`);
  s = s.replace(/^☠️\sCurse.*$/, `Curse dealt damage`);
  s = s.replace(/^⚠️\s.*?\sreadies\s(.*)$/, `Enemy will attack next.`);
  s = s.replace(/^⚠️\s.*?\sprepares.*$/, `Enemy will attack next.`);
  s = s.replace(/^⚠️\sScripture\sblocked.*$/, `Scripture blocked next turn`);
  s = s.replace(/^—\sTurn ends—$/, `Turn ended`);
  s = s.replace(/^🌈\sCovenant.*$/, `Covenant Shield activated`);
  // Battle start
  s = s.replace(/^Battle with.*begins!$/, `Battle begins!`);
  return s.trim();
}

export default function BattleScreen() {
  const { run, updateRun, saveBattleState, setPhase, completeRoom, unlockAchievement, profile, saveProfile, endRun, saveAndExit } = useGame();
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  const isTutorialBattle = !profile.tutorialSeen && run.roomsCleared === 0 && !run.isDaily;
  const tutorialEnemy = isTutorialBattle ? { ...ENEMIES.serpent, hp: 12, attacks: [{ name: "Venomous Bite", damage: 5, icon: "🦷" }] } : null;
  const baseEnemy = run.dailyEnemy || (isTutorialBattle ? tutorialEnemy : ENEMIES[run.pendingEnemyId]);
  const enemy = (run.bossModifier && baseEnemy?.isBoss) ? applyBossModifier(baseEnemy, run.bossModifier) : baseEnemy;
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
  const [counterFlash, setCounterFlash] = useState(false);
  const [counterFloat, setCounterFloat] = useState(null);
  const [showPause, setShowPause] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [longPressCard, setLongPressCard] = useState(null);
  const [showGuideCallouts, setShowGuideCallouts] = useState(false);
  const [showHelpTips, setShowHelpTips] = useState(false);
  const [currentIntentIdx, setCurrentIntentIdx] = useState(-1);
  const [floatingText, setFloatingText] = useState(null);
  const [intentExplain, setIntentExplain] = useState(null);
  const [endTurnConfirm, setEndTurnConfirm] = useState(null);
  const [undoData, setUndoData] = useState(null);
  const undoTimeoutRef = useRef(null);
  const [enemyDamageFloat, setEnemyDamageFloat] = useState(null);
  const [shieldGlow, setShieldGlow] = useState(false);
  const [healGlow, setHealGlow] = useState(false);
  const [healFloat, setHealFloat] = useState(null);
  const [faithParticle, setFaithParticle] = useState(false);
  const [reshuffleAnim, setReshuffleAnim] = useState(false);
  const [deckMessage, setDeckMessage] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialActive, setTutorialActive] = useState(isTutorialBattle);
  const [tutorialCompleteMsg, setTutorialCompleteMsg] = useState(false);
  const tutorialStepRef = useRef(0);

  const advanceTutorial = () => {
    const next = tutorialStepRef.current + 1;
    tutorialStepRef.current = next;
    setTutorialStep(next);
  };

  const handleTutorialAcknowledge = () => {
    Sound.sfx.click();
    advanceTutorial();
  };

  const handleTutorialSkip = () => {
    Sound.sfx.click();
    setTutorialActive(false);
    setTutorialCompleteMsg(false);
    saveProfile({ tutorialSeen: true });
  };

  const handleTutorialDismiss = () => {
    Sound.sfx.click();
    setTutorialActive(false);
    setTutorialCompleteMsg(false);
    saveProfile({ tutorialSeen: true });
  };

  useEffect(() => {
    Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    if (run.currentBattleState) {
      const saved = run.currentBattleState;
      if (saved.turn === "enemy") {
        // Mid-enemy-turn resume: complete the turn so the player isn't stuck.
        // Remaining enemy actions are skipped (already-applied effects stay),
        // DOT ticks, and the player draws a new hand.
        let playerHp = saved.playerHp;
        let dots = saved.dots || 0;
        if (dots > 0) {
          playerHp = Math.max(0, playerHp - 2);
          dots -= 1;
        }
        const baseState = {
          ...saved,
          turn: "player",
          turnNumber: saved.turnNumber + 1,
          energy: saved.maxEnergy,
          playerHp,
          dots,
        };
        const drawCount = Math.max(0, 5 - (saved.skipDraw || 0));
        const newState = drawCards(baseState, drawCount);
        const finalState = { ...newState, skipDraw: 0 };
        setBattleState(finalState);
        if (playerHp <= 0) {
          setBattleEnd("defeat");
          handleBattleEnd("defeat", finalState);
        }
      } else {
        setBattleState(saved);
        // Detect if the battle already ended (resume after reload during victory/defeat overlay)
        const endResult = checkBattleEnd(saved);
        if (endResult) {
          setBattleEnd(endResult);
        }
      }
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
    if (run.bossModifier && enemy.startBlock) {
      state.enemyBlock = (state.enemyBlock || 0) + enemy.startBlock;
    }
    if (isTutorialBattle) {
      state.hand = ["sling_stone", "faith_shield", "prayer"];
      state.deck = ["sling_stone", "faith_shield", "prayer", "sling_stone"];
      state.discard = [];
    }
    setBattleState(state);
  }, []);

  useEffect(() => {
    if (battleState) {
      saveBattleState(battleState);
    }
  }, [battleState]);

  // Battle log collapsed by default — expandable via Details button

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const handleGuideComplete = () => {
    setShowGuideCallouts(false);
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

    // Track lifetime gameplay stats (works for both story & daily — these are gameplay stats)
    recordCardPlayed(card.id);
    const dmgDealt = Math.max(0, (battleState.enemy.currentHp) - (newState.enemy.currentHp));
    if (dmgDealt > 0) recordDamage(dmgDealt);
    const blockGained = Math.max(0, (newState.playerBlock) - (battleState.playerBlock));
    if (blockGained > 0) recordBlock(blockGained);
    const healed = Math.max(0, (newState.playerHp) - (battleState.playerHp));
    if (healed > 0) recordHealing(healed);

    // Visual feedback for card actions
    if (dmgDealt > 0) {
      setEnemyDamageFloat({ amount: dmgDealt, key: Date.now() });
      setTimeout(() => setEnemyDamageFloat(null), 800);
    }
    if (blockGained > 0) {
      setShieldGlow(true);
      setFloatingText({ text: `Blocked ${blockGained}`, color: "#60a5fa", pos: "bottom" });
      setTimeout(() => { setShieldGlow(false); setFloatingText(null); }, 800);
    }
    if (healed > 0) {
      setHealGlow(true);
      setHealFloat({ amount: healed, key: Date.now() });
      setTimeout(() => { setHealGlow(false); setHealFloat(null); }, 800);
    }
    if (card.type === "scripture" && ["song_praise", "coat_colors"].includes(card.id)) {
      setFaithParticle(true);
      setTimeout(() => setFaithParticle(false), 800);
    }
    if (newState.reshuffled) {
      setReshuffleAnim(true);
      setDeckMessage("Deck renewed — discard pile reshuffled.");
      setTimeout(() => setReshuffleAnim(false), 1000);
      setTimeout(() => setDeckMessage(null), 2000);
    }

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
    if (tutorialActive && !end) {
      const step = tutorialStepRef.current;
      if ((step === 3 && card.type === "attack") || (step === 4 && card.type === "defense")) {
        advanceTutorial();
      }
    }
    setSelectedCard(null);
  };

  const handleSelectCard = (idx) => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    Sound.sfx.click();
    setSelectedCard(prev => prev === idx ? null : idx);
  };

  const handleEndTurnClick = () => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    Sound.sfx.click();

    const gLevel = profile.settings.guidanceLevel || "normal";
    const isEasyOrGuided = profile.difficulty === "easy" || gLevel === "guided" || profile.settings.guidanceTips;
    const isHardOrExpert = profile.difficulty === "hard" || gLevel === "expert";

    // Warning 1: a playable card is selected (all modes)
    if (selectedCard !== null) {
      const selCard = getCardById(battleState.hand[selectedCard]);
      const isPlayable = selCard && (battleState.freeCardsRemaining > 0 || battleState.energy >= selCard.cost) && !(battleState.blockScripture && selCard.type === "scripture");
      if (isPlayable) {
        setEndTurnConfirm({ type: "selected" });
        return;
      }
    }

    // Warning 2: playable cards remain (all modes except expert, when enemy is attacking)
    if (!isHardOrExpert) {
      const enemyAttacking = (battleState.enemyHand || []).some(a => a.damage > 0);
      const hasPlayable = battleState.hand.some(cardId => {
        const c = getCardById(cardId);
        if (!c) return false;
        const playable = battleState.freeCardsRemaining > 0 || battleState.energy >= c.cost;
        const blocked = battleState.blockScripture && c.type === "scripture";
        return playable && !blocked;
      });
      if (enemyAttacking && hasPlayable) {
        setEndTurnConfirm({ type: "playable" });
        return;
      }
    }

    performEndTurn();
  };

  const performEndTurn = (opts = {}) => {
    if (animating || battleState.turn !== "player" || battleEnd) return;
    const enemyAnim = profile.settings.enemyAnimation || "step";
    const gLevel = profile.settings.guidanceLevel || "normal";
    const canUndo = (profile.difficulty === "easy" || gLevel === "guided" || profile.settings.guidanceTips) && enemyAnim !== "skip";

    const preEndSnapshot = battleState;
    const endedState = endPlayerTurn(battleState);
    setBattleState(endedState);

    if (tutorialActive && tutorialStepRef.current === 5) {
      advanceTutorial();
    }

    // Undo window for Easy/Guided before enemy actions begin
    if (canUndo && !opts.bypassUndo) {
      setUndoData({ snapshot: preEndSnapshot, endedState, enemyAnim });
      undoTimeoutRef.current = setTimeout(() => {
        setUndoData(null);
        undoTimeoutRef.current = null;
        runEnemyTurn(endedState, enemyAnim);
      }, 2000);
      return;
    }

    runEnemyTurn(endedState, enemyAnim);
  };

  const handleUndoEndTurn = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (undoData?.snapshot) {
      setBattleState(undoData.snapshot);
    }
    setUndoData(null);
    Sound.sfx.click();
  };

  const runEnemyTurn = (endedState, enemyAnim) => {
    // Skip mode — instant resolve
    if (enemyAnim === "skip") {
      const enemyState = enemyTurn(endedState);
      setBattleState(enemyState);
      const end = checkBattleEnd(enemyState);
      if (end) { setBattleEnd(end); handleBattleEnd(end, enemyState); }
      if (tutorialActive && tutorialStepRef.current >= TUTORIAL_TOTAL_STEPS && !end) {
        setTimeout(() => setTutorialCompleteMsg(true), 300);
      }
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
        if (tutorialActive && tutorialStepRef.current >= TUTORIAL_TOTAL_STEPS && !end) {
          setTimeout(() => setTutorialCompleteMsg(true), 300);
        }
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
      setCounterFlash(false);
      setCounterFloat(null);
    };

    const resolveNextStep = () => {
      if (stepIdx >= steps.length) {
        clearTransient();
        setAnimating(false);
        setCurrentIntentIdx(-1);
        if (tutorialActive && tutorialStepRef.current >= TUTORIAL_TOTAL_STEPS) {
          setTimeout(() => setTutorialCompleteMsg(true), 300);
        }
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
            const curseText = step.action.effect === "dot" ? "Cursed!" :
              step.action.effect === "drain" ? "Faith drained" :
              step.action.effect === "skip_draw" ? "Draw reduced" :
              step.action.effect === "block_scripture" ? "Silenced" :
              step.action.effect === "discard" ? "Cards discarded" : "Confused";
            setFloatingText({ text: curseText, color: "#c084fc", pos: "bottom" });
          }

          setBattleState(step.state);

          // Counter retaliation effects — shield flash + damage number + deflect sound
          if (step.counterHit > 0) {
            recordDamage(step.counterHit);
            Sound.sfx.deflect();
            setCounterFlash(true);
            setCounterFloat({ text: `Counter -${step.counterHit}`, color: "#fbbf24" });
            setTimeout(() => {
              setCounterFlash(false);
              setEnemyShake(true);
              setEnemyFlash(true);
            }, 200);
            setTimeout(() => {
              setEnemyShake(false);
              setEnemyFlash(false);
              setCounterFloat(null);
            }, 700);
          }

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

          // Check for victory (counter/thorns kill enemy)
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
        if (step.state.reshuffled) {
          setReshuffleAnim(true);
          setDeckMessage("Deck renewed — discard pile reshuffled.");
          setTimeout(() => setReshuffleAnim(false), 1000);
          setTimeout(() => setDeckMessage(null), 2500);
        }
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
      const cardsPlayed = state.log.filter(e => e.includes("—") && (e.includes("dmg") || e.includes("block") || e.includes("HP") || e.includes("Faith") || e.includes("drew"))).length;
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
      recordBattleWon(enemy.isBoss);
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
      recordBattleLost();
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

  const handleSaveAndExit = () => {
    saveAndExit();
    navigate("/");
  };

  if (!battleState) return <div className="min-h-screen flex items-center justify-center text-amber-200">Loading battle...</div>;

  const isEnemyTurn = battleState.turn === "enemy" || animating;
  const enemyArt = ENEMY_ART[enemy.id];
  const heroArt = HERO_ART[hero.id];
  const guidanceLevel = profile.settings.guidanceLevel || "normal";
  const hideIntentValues = guidanceLevel === "expert";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)" }}>
      <div className="flex flex-col h-full w-full lg:max-w-[1600px] lg:mx-auto lg:px-6">
      {/* Top row: help + pause */}
      <div className="flex items-center justify-end gap-2 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1">
        <button
          onClick={() => { setShowHelpTips(true); Sound.sfx.click(); }}
          className="w-9 h-9 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition active:scale-90"
          title="Battle Tips"
        >
          <span className="text-sm font-bold">?</span>
        </button>
        <button
          onClick={() => { setShowPause(true); Sound.sfx.click(); }}
          className="w-9 h-9 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition active:scale-90"
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
          {enemy.bossModifier && (
            <div className="mt-1">
              <span className="inline-block text-purple-300 text-[10px] lg:text-sm font-serif font-semibold tracking-wide px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-900/20">
                {enemy.bossModifier.icon} {enemy.bossModifier.name}
              </span>
              <p className="text-purple-200/40 text-[8px] lg:text-[10px] italic mt-0.5">{enemy.bossModifier.description}</p>
            </div>
          )}
        </div>

        {/* Enemy Intent — compact strip with painted icons */}
        {battleState.enemyHand?.length > 0 && !battleEnd && (
          <div className="mb-1 flex items-center gap-1 lg:gap-2.5 justify-center flex-wrap max-w-[95%] lg:max-w-[800px]">
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
                    <img src={intentInfo.art} alt={intentInfo.label} className="w-4 h-4 lg:w-6 lg:h-6 object-cover rounded-sm flex-shrink-0" />
                    <span className={`${intentInfo.color} text-[9px] lg:text-base font-medium leading-none`}>{action.name}</span>
                    {(() => {
                      if (hideIntentValues) return null;
                      const amt = getIntentAmountText(action, enemy);
                      if (!amt) return null;
                      const amtColor = actionType === "attack" ? "text-red-300/80" : actionType === "block" ? "text-blue-300/80" : actionType === "heal" ? "text-emerald-300/80" : "text-purple-300/80";
                      return <span className={`text-[8px] lg:text-base font-bold leading-none ${amtColor}`}>{amt}</span>;
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
              <div className="w-24 h-24 lg:w-40 lg:h-40 rounded-lg overflow-hidden relative" style={{ background: "#0A0F1E", border: "2px solid rgba(201,168,76,0.45)", boxShadow: "0 0 20px rgba(201,168,76,0.15), inset 0 0 30px rgba(8,12,24,0.8)" }}>
                <img src={enemyArt} alt={enemy.name} className="w-full h-full object-cover block" style={{ transform: "scale(1.06)", filter: "contrast(1.05) saturate(0.95)" }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 60%, rgba(8,12,24,0.5) 100%)" }} />
              </div>
            ) : (
              <span className="text-5xl">{enemy.icon}</span>
            )}
          </div>
          {/* Enemy damage float — red number from player attacks */}
          {enemyDamageFloat && (
            <span key={enemyDamageFloat.key} className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl lg:text-4xl font-serif font-bold pointer-events-none animate-fade-in z-20" style={{ color: "#f87171", textShadow: "0 0 15px rgba(248,113,113,0.8)" }}>
              -{enemyDamageFloat.amount}
            </span>
          )}
          {/* Enemy HP bar */}
          <div className="w-36 lg:w-56 h-3 lg:h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
              style={{ width: `${(battleState.enemy.currentHp / battleState.enemy.maxHp) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <p className="text-red-200 text-[11px] lg:text-lg">{battleState.enemy.currentHp}/{battleState.enemy.maxHp} HP</p>
            {battleState.enemyBlock > 0 && (
              <span className="text-blue-300 text-[11px] lg:text-lg flex items-center gap-0.5">
                <Shield className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.enemyBlock}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Combat Log — minimal pill when collapsed, expandable for full log */}
      <div className="flex-shrink-0 flex flex-col items-center py-0.5 lg:py-1">
        <button
          onClick={() => setShowLog(!showLog)}
          className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-amber-500/10 bg-slate-900/30 text-amber-300/35 text-[9px] lg:text-[10px] uppercase tracking-wide hover:bg-slate-900/50 hover:text-amber-300/60 transition active:scale-[0.98]"
        >
          {showLog ? "Hide Log" : "Log"}
          {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showLog && (
          <div className="w-full rounded-md border border-amber-500/15 bg-slate-900/50 p-1.5 lg:p-3 mt-1 max-h-20 lg:max-h-40 overflow-y-auto">
            {battleState.log.slice(-10).map((entry, i) => (
              <p key={i} className="text-amber-100/70 text-[11px] lg:text-sm leading-snug">
                {simplifyLogEntry(entry) || entry}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Battle helper — contextual advice below the log */}
      <div className="flex-shrink-0">
        {!battleEnd && !isEnemyTurn && (
          <BattleHelper battleState={battleState} selectedCard={selectedCard} enemy={enemy} />
        )}
        {/* Deck status messages */}
        {deckMessage && (
          <div className="flex items-center justify-center gap-2 px-3 py-1 animate-fade-in">
            {reshuffleAnim && (
              <span className="text-amber-300 text-sm" style={{ animation: "cardSwirl 0.9s ease-in-out", display: "inline-block" }}>🃏</span>
            )}
            <span className="text-emerald-300/80 text-[10px] lg:text-xs italic">{deckMessage}</span>
          </div>
        )}
        {!deckMessage && battleState.deck.length === 0 && battleState.discard.length === 0 && battleState.hand.length === 0 && !battleEnd && (
          <div className="flex items-center justify-center px-3 py-1">
            <span className="text-amber-300/60 text-[10px] lg:text-xs italic">No cards left. End your turn or finish the battle with your remaining options.</span>
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

      {/* Counter retaliation damage over enemy */}
      {counterFloat && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
          <span
            className="text-3xl lg:text-4xl font-serif font-bold animate-fade-in"
            style={{
              color: counterFloat.color,
              textShadow: `0 0 20px ${counterFloat.color}`,
              transform: "translateY(-120px)",
            }}
          >
            {counterFloat.text}
          </span>
        </div>
      )}

      {/* Guidance hint — Guided mode tactical suggestion */}
      {(profile.settings.guidanceLevel === "guided" || profile.settings.guidanceTips) && !battleEnd && !isEnemyTurn && (
        <GuidanceHint battleState={battleState} />
      )}

      {/* Player stats — compact single row */}
      <div className="flex-shrink-0 px-3 lg:px-6 py-1.5 lg:py-3 border-t border-amber-500/10 flex items-center justify-between gap-2" style={{ background: "rgba(15,10,5,0.6)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`relative transition-transform flex-shrink-0 ${playerShake ? "animate-shake" : ""} ${playerFlash ? "animate-heal-pulse" : ""} ${playerAttackAnim ? "animate-attack-lunge" : ""}`}
            style={shieldGlow ? { animation: "shieldGlow 0.6s ease-in-out", borderRadius: "50%" } : healGlow ? { animation: "healGlow 0.6s ease-in-out", borderRadius: "50%" } : {}}
          >
            {counterFlash && (
              <div className="absolute inset-0 -m-1 rounded-full border-2 border-amber-300/80 animate-ping pointer-events-none" style={{ boxShadow: "0 0 20px rgba(251,191,36,0.6)" }} />
            )}
            {shieldGlow && (
              <div className="absolute inset-0 -m-1 rounded-full border-2 border-blue-400/80 pointer-events-none" style={{ boxShadow: "0 0 20px rgba(96,165,250,0.7)" }} />
            )}
            {heroArt ? (
              <img src={heroArt} alt={hero.name} className="w-8 h-8 lg:w-12 lg:h-12 object-cover rounded-full border border-amber-500/40" style={{ transform: "scale(1.03)", background: "#0A0F1E" }} />
            ) : (
              <span className="text-2xl lg:text-4xl">{hero.icon}</span>
            )}
            {/* Heal float — green +HP number */}
            {healFloat && (
              <span key={healFloat.key} className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg lg:text-2xl font-serif font-bold pointer-events-none animate-fade-in z-20" style={{ color: "#34d399", textShadow: "0 0 12px rgba(52,211,153,0.8)" }}>
                +{healFloat.amount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 lg:w-5 lg:h-5 text-red-400 flex-shrink-0" />
              <div className="w-16 lg:w-36 h-3 lg:h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(battleState.playerHp / battleState.maxPlayerHp) * 100}%` }} />
              </div>
              <span className="text-emerald-200 text-[11px] lg:text-lg font-bold flex-shrink-0">{battleState.playerHp}/{battleState.maxPlayerHp}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] lg:text-sm">
              {battleState.playerBlock > 0 && (
                <span className="text-blue-300 flex items-center gap-0.5">
                  <Shield className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.playerBlock}
                </span>
              )}
              {battleState.counter > 0 && (
                <span className="text-amber-300 flex items-center gap-0.5 font-bold" title={`Counter: enemy takes ${battleState.counter} damage on each attack (cap 12)`}>
                  <Zap className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.counter}
                </span>
              )}
              {battleState.dots > 0 && (
                <span className="text-purple-300 flex items-center gap-0.5">
                  <Skull className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.dots}
                </span>
              )}
              <span className={`text-amber-100/40 ${reshuffleAnim ? "text-amber-300" : ""}`}>Deck {battleState.deck.length} · Discard {battleState.discard.length}</span>
            </div>
          </div>
        </div>

        {/* Faith + End Turn */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hero.id === "noah" && !covenantShieldUsed && (
            <button
              onClick={handleCovenantShield}
              disabled={isEnemyTurn}
              className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg border-2 border-amber-400/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
              title="Covenant Shield"
            >
              <Shield className="w-3 h-3 lg:w-5 lg:h-5" />
            </button>
          )}
          <div className="relative flex items-center gap-0.5 px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-amber-900/20 border border-amber-400/30">
            <Sparkles className="w-3 h-3 lg:w-5 lg:h-5 text-yellow-200" />
            <span className="text-yellow-200 text-sm lg:text-2xl font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-[9px] lg:text-sm">/{battleState.maxEnergy}</span>
            {faithParticle && (
              <span className="absolute -top-3 left-1/2 text-yellow-200 text-sm pointer-events-none" style={{ animation: "faithParticle 0.8s ease-out" }}>✨</span>
            )}
          </div>
          {selectedCard !== null && (() => {
            const sc = getCardById(battleState.hand[selectedCard]);
            const scPlayable = sc && (battleState.freeCardsRemaining > 0 || battleState.energy >= sc.cost) && !(battleState.blockScripture && sc.type === "scripture");
            return scPlayable ? (
              <span className="text-emerald-300/60 text-[9px] lg:text-[10px] italic mr-1 lg:mr-2 max-w-[70px] lg:max-w-[120px] text-right leading-tight">
                Play card ↑
              </span>
            ) : null;
          })()}
          <button
            onClick={handleEndTurnClick}
            disabled={isEnemyTurn}
            className={`rounded-lg border-2 font-bold transition-all whitespace-nowrap active:scale-[0.94] ${
              selectedCard !== null && (() => {
                const sc = getCardById(battleState.hand[selectedCard]);
                return sc && (battleState.freeCardsRemaining > 0 || battleState.energy >= sc.cost) && !(battleState.blockScripture && sc.type === "scripture");
              })()
                ? "px-2.5 py-1 lg:px-4 lg:py-2 text-[10px] lg:text-sm border-amber-500/10 bg-amber-900/5 text-amber-100/25 hover:bg-amber-900/10"
                : "px-3 py-1.5 lg:px-6 lg:py-2.5 text-xs lg:text-lg border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40 active:bg-amber-600/50"
            } disabled:opacity-40 disabled:active:scale-100`}
          >
            End Turn →
          </button>
        </div>
      </div>

      {/* Bottom: hand — extra bottom padding when card selected */}
      <div className="flex-1 flex flex-col min-h-0" style={{ background: "rgba(15,10,5,0.8)" }}>
        <div className={`flex-1 flex items-end justify-center overflow-hidden px-3 pt-2 min-h-0 transition-all duration-200 ${selectedCard !== null ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"}`}>
          {battleState.hand.length === 0 && (
            <p className="text-amber-100/50 text-xs py-4 w-full text-center">No cards — End Turn to draw</p>
          )}
          <div className="flex gap-2 lg:gap-5 overflow-x-auto flex-nowrap snap-x pb-1 w-full justify-center">
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
                  className="px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-xl hover:bg-amber-600/40 transition active:scale-95"
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
                  className="px-10 py-3 rounded-lg border-2 border-red-400/60 bg-red-900/30 text-red-100 font-serif text-xl hover:bg-red-800/40 transition active:scale-95"
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

      {/* End Turn confirmation */}
      {endTurnConfirm && (
        <EndTurnConfirmModal
          type={endTurnConfirm.type}
          onPlaySelected={() => {
            setEndTurnConfirm(null);
            if (selectedCard !== null) handlePlayCard(selectedCard);
          }}
          onEndTurn={() => {
            setEndTurnConfirm(null);
            performEndTurn();
          }}
          onCancel={() => { setEndTurnConfirm(null); Sound.sfx.click(); }}
        />
      )}

      {/* Undo End Turn (Easy/Guided) */}
      {undoData && (
        <div className="fixed inset-x-0 bottom-20 lg:bottom-24 z-40 flex justify-center px-4 pointer-events-none">
          <button
            onClick={handleUndoEndTurn}
            className="pointer-events-auto px-6 py-2.5 rounded-full border-2 border-sky-400/60 bg-sky-900/40 backdrop-blur-sm text-sky-100 font-bold text-sm hover:bg-sky-800/50 transition animate-fade-in shadow-lg shadow-sky-500/20"
          >
            ↩ Undo End Turn
          </button>
        </div>
      )}

      {/* Guided first-battle tutorial */}
      {tutorialActive && tutorialStep < TUTORIAL_TOTAL_STEPS && !battleEnd && !tutorialCompleteMsg && !isEnemyTurn && (
        <GuidedBattleTutorial
          step={tutorialStep}
          onAcknowledge={handleTutorialAcknowledge}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Tutorial completion message */}
      {tutorialCompleteMsg && !battleEnd && (
        <div className="fixed inset-0 z-[58] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.85)" }} onClick={handleTutorialDismiss}>
          <div className="max-w-xs rounded-xl border-2 border-emerald-400/50 p-5 text-center animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full border-2 border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-amber-100 text-sm mb-4">You learned the basics. Now continue Genesis.</p>
            <button onClick={handleTutorialDismiss} className="px-6 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Help tips overlay — reopened via "?" button */}
      {showHelpTips && (
        <BattleGuideCallouts onComplete={() => { setShowHelpTips(false); Sound.sfx.click(); }} />
      )}

      {/* Pause overlay */}
      {showPause && !showAbandonConfirm && (
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
              {/* Primary */}
              <button
                onClick={() => { setShowPause(false); Sound.sfx.click(); }}
                className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
              >
                Resume Battle
              </button>

              {/* Secondary */}
              {!run.isDaily && (
                <div>
                  <button
                    onClick={handleSaveAndExit}
                    className="w-full px-6 py-3 rounded-lg border-2 border-emerald-400/50 bg-emerald-600/20 text-emerald-100 font-bold hover:bg-emerald-600/40 transition"
                  >
                    Save &amp; Exit to Menu
                  </button>
                  <p className="text-amber-100/40 text-[10px] text-center mt-1.5">
                    You can continue this Story Mode run later.
                  </p>
                </div>
              )}
              {run.isDaily && (
                <p className="text-amber-100/40 text-[10px] text-center">
                  Daily Battles cannot be resumed once abandoned.
                </p>
              )}

              {/* Destructive — visually separated, below */}
              <div className="pt-5 mt-3 border-t border-amber-500/10">
                <button
                  onClick={() => { setShowAbandonConfirm(true); Sound.sfx.click(); }}
                  className="w-full px-6 py-2 rounded-lg border border-red-400/30 bg-red-900/10 text-red-300/80 text-sm hover:bg-red-900/20 hover:text-red-200 transition"
                >
                  {run.isDaily ? "Abandon Daily Battle" : "Abandon Run — Delete Progress"}
                </button>
                <p className="text-red-300/30 text-[10px] text-center mt-1.5">
                  {run.isDaily ? "This ends today's Daily Battle." : "This deletes the saved run."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abandon confirmation */}
      {showAbandonConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-red-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <h2 className="text-lg font-serif text-red-200 text-center mb-3">Abandon this run?</h2>
            {run.isDaily ? (
              <>
                <p className="text-amber-100/60 text-sm text-center mb-2">This <span className="text-amber-300 font-semibold">Daily Battle</span> attempt will be lost.</p>
                <p className="text-red-300/70 text-xs text-center mb-6">You cannot retry today's Daily Battle once abandoned.</p>
              </>
            ) : (
              <>
                <p className="text-amber-100/60 text-sm text-center mb-2">Your current progress will be lost.</p>
                <p className="text-red-300/70 text-xs text-center mb-6">Are you sure you want to abandon this run?</p>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAbandonConfirm(false); Sound.sfx.click(); }}
                className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-800/60 transition"
              >
                Keep Playing
              </button>
              <button
                onClick={handleAbandon}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-red-100 text-sm font-bold hover:bg-red-800/40 transition"
              >
                {run.isDaily ? "Abandon Battle" : "Abandon Run"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}