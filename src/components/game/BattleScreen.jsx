import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {   Pause,   Heart,   Shield,   Skull,   Sparkles,   Swords as SwordsIcon,   ChevronUp,   ChevronDown,   Volume2,   Zap,   Check,   BookOpen, } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import {
  createBattleState,
  playCard as playCardEngine,
  endPlayerTurn,
  enemyTurn,
  checkBattleEnd,
  getEnemyTurnSteps,
  drawCards,
  HAND_LIMIT
} from "@/game/battleEngine";
import { ENEMIES } from "@/data/enemies";
import Card, { getCardEffectText } from "@/components/game/Card";
import CardPreviewPanel from "@/components/game/CardPreviewPanel";
import EndTurnConfirmModal from "@/components/game/EndTurnConfirmModal";
import CardDetailModal from "@/components/game/CardDetailModal";
import GuidanceHint from "@/components/game/GuidanceHint";
import { getIntentExplanation } from "@/game/intentExplanations";
import { getStatusExplanation } from "@/game/statusExplanations";
import BattleHelper from "@/components/game/BattleHelper";
import BattleGuideCallouts from "@/components/game/BattleGuideCallouts";
import GuidedBattleTutorial, { TUTORIAL_TOTAL_STEPS } from "@/components/game/GuidedBattleTutorial";
import TutorialGuidingLight from "@/components/game/TutorialGuidingLight";
import useResponsive from "@/hooks/useResponsive";
import { CARD_ART, ENEMY_ART, HERO_ART, INTENT_ART, VICTORY_ART } from "@/data/art";
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
function resolveCard(cardOrId) {
  return typeof cardOrId === "string" ? getCardById(cardOrId) : cardOrId;
}

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
  s = s.replace(/^⚠️\sConfused\sTongues.*$/, `Confused Tongues — Scripture blocked`);
  s = s.replace(/^⚠️\s.*?\sreadies\s(.*)$/, `Enemy will attack next.`);
  s = s.replace(/^⚠️\s.*?\sprepares.*$/, `Enemy will attack next.`);
  s = s.replace(/^⚠️\sScripture\sblocked.*$/, `Confused Tongues — Scripture blocked`);
  s = s.replace(/^—\sTurn ends—$/, `Turn ended`);
  s = s.replace(/^🌈\sCovenant.*$/, `Covenant Shield activated`);
  // Battle start
  s = s.replace(/^Battle with.*begins!$/, `Battle begins!`);
  return s.trim();
}

export default function BattleScreen() {
  const {   run,   startRun,   updateRun,   saveBattleState,   setPhase,   completeRoom,   unlockAchievement,   profile,   saveProfile,   endRun,   saveAndExit,   recordEnemyEncounter,   recordEnemyDefeat, } = useGame();
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  const isTutorialBattle = run.isTutorial === true;
  const tutorialEnemy = isTutorialBattle ? { ...ENEMIES.serpent, hp: 12, attacks: [{ name: "Venomous Bite", damage: 5, icon: "🦷" }] } : null;
  const baseEnemy = run.dailyEnemy || (isTutorialBattle ? tutorialEnemy : ENEMIES[run.pendingEnemyId]);
  const enemy = (run.bossModifier && baseEnemy?.isBoss) ? applyBossModifier(baseEnemy, run.bossModifier) : baseEnemy;
  useEffect(() => {
  if (enemy?.id) {
    recordEnemyEncounter(enemy.id);
  }
}, [enemy?.id, recordEnemyEncounter]);
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
  const [statusExplain, setStatusExplain] = useState(null);
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

 const finishTutorialAndStartGenesis = () => {
  Sound.sfx.click();

  setTutorialActive(false);
  setTutorialCompleteMsg(false);

  saveProfile({ tutorialSeen: true });

  // Destroy the temporary tutorial run.
  endRun();

  // Start a completely fresh Genesis campaign.
  setTimeout(() => {
    startRun("adam", false, null, {
      difficulty: "easy",
    });

    navigate("/play");
  }, 0);
};

const handleTutorialSkip = () => {
  finishTutorialAndStartGenesis();
};

const handleTutorialDismiss = () => {
  finishTutorialAndStartGenesis();
};

  useEffect(() => {
    Sound.playMusic(enemy.isBoss ? "boss" : "battle");
    const savedBattleMatchesEnemy =
  run.currentBattleState?.enemy?.id === enemy?.id;

if (run.currentBattleState && savedBattleMatchesEnemy) {
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
        const drawCount = Math.max(   0,   HAND_LIMIT - (saved.skipDraw || 0) - (saved.hand?.length || 0) );
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
    const card = resolveCard(battleState.hand[handIndex]);
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

    const card = resolveCard(battleState.hand[idx]);
    if (!card) return;

    // During the guided tutorial, only the required card can be selected.
    if (tutorialActive) {
      if (!tutorialAllowsCardSelection) return;
      if (tutorialRequiredCardId && card.id !== tutorialRequiredCardId) return;
    }

    Sound.sfx.click();
    setSelectedCard((prev) => (prev === idx ? null : idx));
  };

    const handleEndTurnClick = () => {
    if (animating || battleState.turn !== "player" || battleEnd) return;

    // The first-battle tutorial unlocks End Turn only at its proper step.
    if (!tutorialAllowsEndTurn) return;

    Sound.sfx.click();

    const gLevel = profile.settings.guidanceLevel || "normal";
    const isEasyOrGuided = profile.difficulty === "easy" || gLevel === "guided" || profile.settings.guidanceTips;
    const isHardOrExpert = profile.difficulty === "hard" || gLevel === "expert";

    // Normal End Turn warnings are disabled during the guided tutorial.
// The tutorial instruction is the only guidance the player should follow.
if (!tutorialActive) {
  // Warning 1: a playable card is selected
  if (selectedCard !== null) {
    const selCard = resolveCard(battleState.hand[selectedCard]);

    const isPlayable =
      selCard &&
      (battleState.freeCardsRemaining > 0 ||
        battleState.energy >= selCard.cost) &&
      !(battleState.blockScripture && selCard.type === "scripture");

    if (isPlayable) {
      setEndTurnConfirm({ type: "selected" });
      return;
    }
  }

  // Warning 2: playable cards remain
  if (!isHardOrExpert) {
    const enemyAttacking = (battleState.enemyHand || []).some(
      action => action.damage > 0
    );

    const hasPlayable = battleState.hand.some(cardId => {
      const card = resolveCard(cardId);

      if (!card) return false;

      const playable =
        battleState.freeCardsRemaining > 0 ||
        battleState.energy >= card.cost;

      const blocked =
        battleState.blockScripture &&
        card.type === "scripture";

      return playable && !blocked;
    });

    if (enemyAttacking && hasPlayable) {
      setEndTurnConfirm({ type: "playable" });
      return;
    }
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

  const actionType = getActionType(step.action);
  const actionDealsDamage =
    actionType === "attack" ||
    (actionType === "curse" && step.action.damage > 0);

  if (actionDealsDamage) {
    Sound.sfx.enemyWindUp();
    setEnemyAttackAnim(true);
  }

  setTimeout(() => {
    setEnemyAttackAnim(false);
    
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
              step.action.effect === "drain" ? "Faith Drain!" :
              step.action.effect === "skip_draw" ? "Draw Reduced" :
              step.action.effect === "block_scripture" ? "Confused Tongues!" :
              step.action.effect === "discard" ? "Discard!" : "Confusion!";
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
        setFloatingText({ text: "Curse dealt 2 damage", color: "#c084fc", pos: "bottom" });
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

  if (end) {
    setBattleEnd(end);
    handleBattleEnd(end, step.state);
  }

  // The guided tutorial ends after the enemy completes its first turn.
  // Without this, tutorial restrictions remain active and soft-lock battle.
  if (
    tutorialActive &&
    tutorialStepRef.current >= TUTORIAL_TOTAL_STEPS &&
    !end
  ) {
    setTimeout(() => {
      setTutorialCompleteMsg(true);
    }, 300);
  }

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
  // Tutorial victory never enters rewards, trivia, map progression, or scoring.
  if (run.isTutorial) {
    if (result === "victory") {
      Sound.sfx.victory();
      Sound.playMusic("victory");

      setBattleEnd(null);
      setTutorialActive(false);
      setTutorialCompleteMsg(true);
    } else {
      Sound.sfx.defeat();
      Sound.playMusic("defeat");
    }

    return;
  }

  if (run.isDaily) {
      if (result === "victory") {
        recordEnemyDefeat(enemy.id);
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
      recordEnemyDefeat(enemy.id);
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

const selectedCardData =
  selectedCard !== null
    ? resolveCard(battleState.hand[selectedCard])
    : null;
  const tutorialRequiredCardId =
    tutorialActive && tutorialStep === 3
      ? "sling_stone"
      : tutorialActive && tutorialStep === 4
        ? "faith_shield"
        : null;

  const tutorialAllowsCardSelection =
    !tutorialActive || tutorialStep === 3 || tutorialStep === 4;

  const tutorialAllowsEndTurn =
    !tutorialActive || tutorialStep === 5;
  return (
  <>
    <style>{`
      .phone-landscape-blocker {
        display: none;
      }

      @media (orientation: landscape) and (max-height: 500px) and (max-width: 950px) {
        .phone-landscape-blocker {
          display: flex;
        }
      }
    `}</style>

    <div
      className="phone-landscape-blocker fixed inset-0 z-[999] items-center justify-center px-8 text-center"
      style={{
        background: "linear-gradient(180deg, #0F1A30 0%, #080C18 100%)",
      }}
    >
      <div>
        <div className="text-5xl mb-5">📱</div>

        <h2 className="text-2xl font-serif text-amber-200 mb-3">
  Portrait Mode Required
</h2>

<p className="text-amber-100/65 text-sm leading-relaxed">
  Rotate your phone upright to continue playing.
</p>
      </div>
    </div>

    <div
  className="fixed inset-0 flex flex-col overflow-hidden select-none"
  style={{
    background:
      "linear-gradient(180deg, #1A0A0A 0%, #2A1212 50%, #1A0A0A 100%)",
    WebkitUserSelect: "none",
    userSelect: "none",
    WebkitTouchCallout: "none",
    touchAction: "pan-x pan-y",
  }}
>
  <div className="flex flex-col h-full w-full lg:max-w-[1600px] lg:mx-auto lg:px-6">
      {/* Top row: help + pause */}
      <div className="flex items-center justify-end gap-2 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1">
        <button
  onClick={() => {
    if (tutorialActive) return;

    setShowHelpTips(true);
    Sound.sfx.click();
  }}
  disabled={tutorialActive}
  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition ${
    tutorialActive
      ? "border-amber-500/10 bg-slate-900/30 text-amber-100/20 cursor-not-allowed"
      : "border-amber-500/30 bg-slate-900/60 text-amber-200 hover:bg-amber-500/20 active:scale-90"
  }`}
  title={tutorialActive ? "Available after tutorial" : "Battle Tips"}
>
  <span className="text-sm font-bold">?</span>
</button>
        {!tutorialActive && (
  <button
    onClick={() => {
      setShowPause(true);
      Sound.sfx.click();
    }}
    className="w-9 h-9 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition active:scale-90"
  >
    <Pause className="w-4 h-4" />
  </button>
)}
      </div>

      {/* Battle UI 2.0: enemy left, information center, log right */}
<div className="flex-shrink-0 px-3 pb-2 lg:px-6 lg:pt-3">
  <div className="grid grid-cols-[80px_minmax(0,1fr)_128px] items-center gap-2 lg:grid-cols-[160px_minmax(0,1fr)_260px] lg:gap-5">
    {/* Enemy portrait */}
    <div className="relative flex flex-col items-start justify-center">
  <div className="mb-1 w-full">
    <h2 className="font-serif text-[13px] leading-none text-red-200 whitespace-nowrap lg:text-2xl">
      {enemy.name}
    </h2>

    {enemy.isBoss && (
      <span className="mt-1 inline-block rounded-full border border-red-500/30 bg-red-900/30 px-1.5 py-0.5 text-[7px] font-bold tracking-widest text-red-400 lg:px-2 lg:text-xs">
        BOSS
      </span>
    )}
  </div>      <div
        className={`transition-transform duration-300 ${
          battleEnd === "victory" ? "animate-bounce" : ""
        } ${
          battleEnd === "defeat" ? "opacity-30" : ""
        } ${
          enemyAttackAnim ? "animate-enemy-lunge" : ""
        } ${
          enemyShake ? "animate-shake" : ""
        } ${
          enemyFlash ? "animate-damage-flash" : ""
        }`}
      >
        {enemyArt ? (
          <div
            className="relative h-24 w-24 overflow-hidden rounded-lg lg:h-44 lg:w-44"
            style={{
              background: "#0A0F1E",
              border: "2px solid rgba(201,168,76,0.45)",
              boxShadow:
                "0 0 20px rgba(201,168,76,0.15), inset 0 0 30px rgba(8,12,24,0.8)",
            }}
          >
            <img
              src={enemyArt}
              alt={enemy.name}
              className="art-portrait"
              style={{
                filter: "contrast(1.05) saturate(0.95)",
              }}
            />

            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 60%, rgba(8,12,24,0.5) 100%)",
              }}
            />
          </div>
        ) : (
          <span className="text-5xl">{enemy.icon}</span>
        )}
      </div>

      {enemyDamageFloat && (
        <span
          key={enemyDamageFloat.key}
          className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 animate-fade-in font-serif text-2xl font-bold lg:text-4xl"
          style={{
            color: "#f87171",
            textShadow: "0 0 15px rgba(248,113,113,0.8)",
          }}
        >
          -{enemyDamageFloat.amount}
        </span>
      )}
    </div>

{/* Enemy name, intent and health */}
<div className="flex min-w-0 flex-col items-start gap-1">
  <div className="flex min-w-0 flex-wrap items-center gap-1.5">

  </div>

  {enemy.bossModifier && (
    <span className="inline-block max-w-full truncate rounded-full border border-purple-500/30 bg-purple-900/20 px-2 py-0.5 font-serif text-[9px] font-semibold text-purple-300 lg:text-sm">
      {enemy.bossModifier.icon} {enemy.bossModifier.name}
    </span>
  )}

  {/* Enemy’s single next action */}
  {battleState.enemyHand?.length > 0 && !battleEnd && (
    <div className="relative mt-0.5 max-w-full ml-2">
      {battleState.enemyHand.slice(0, 1).map((action, i) => {
        const actionType = getActionType(action);
        const intentInfo = INTENT_TYPE_MAP[actionType];
        const isCurrent = currentIntentIdx === i;
        const isResolved = currentIntentIdx > i;
        const amount = hideIntentValues
          ? null
          : getIntentAmountText(action, enemy);

        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIntentExplain(action);
              Sound.sfx.click();
            }}
            disabled={isResolved || tutorialActive}
            className={`relative flex max-w-full items-center gap-1 rounded-md border px-1.5 py-1 text-left transition-all duration-200 ${
              isCurrent
                ? `${intentInfo.border} scale-[1.02] bg-amber-500/20 shadow-md shadow-amber-400/20`
                : isResolved
                  ? "border-slate-700/20 opacity-25"
                  : `${intentInfo.border} bg-slate-900/40`
            }`}
          >
            {tutorialActive && tutorialStep === 2 && (
              <TutorialGuidingLight
                direction="down"
                size="small"
                className="-top-12 left-1/2 -translate-x-1/2"
              />
            )}

            <span
              className="h-4 w-4 flex-shrink-0 overflow-hidden rounded-sm lg:h-6 lg:w-6"
              style={{ background: "#0F1A30" }}
            >
              <img
                src={intentInfo.art}
                alt={intentInfo.label}
                className="art-portrait"
              />
            </span>

            <span className="min-w-0">
              <span
                className={`block truncate text-[9px] font-medium leading-tight lg:text-base ${intentInfo.color}`}
              >
                {action.name}
              </span>

              {amount && (
                <span className="block truncate text-[8px] font-bold leading-tight text-amber-100/55 lg:text-sm">
                  {amount}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  )}

  {/* Enemy HP */}
  <div className="mt-1 w-[88%]">
    <div className="h-3 w-full overflow-hidden rounded-full border border-red-900/50 bg-slate-900 lg:h-4">
      <div
        className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
        style={{
          width: `${
            (battleState.enemy.currentHp /
              battleState.enemy.maxHp) *
            100
          }%`,
        }}
      />
    </div>

    <div className="mt-0.5 flex items-center gap-2">
      <p className="text-[10px] text-red-200 lg:text-lg">
        {battleState.enemy.currentHp}/
        {battleState.enemy.maxHp} HP
      </p>

      {battleState.enemyBlock > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-blue-300 lg:text-lg">
          <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
          {battleState.enemyBlock}
        </span>
      )}
    </div>
  </div>
</div>

    {/* Battle log on far right */}
    <div className="flex min-w-0 flex-col items-stretch">
  <div className="max-h-28 overflow-y-auto rounded-lg border border-amber-500/20 bg-slate-950/90 p-1.5 text-left shadow-xl backdrop-blur-sm lg:max-h-40 lg:p-3">
    {battleState.log.slice(-6).map((entry, i) => (
      <p
        key={i}
        className="border-b border-amber-500/10 py-0.5 text-[8px] leading-snug text-amber-100/70 last:border-b-0 lg:text-xs"
      >
        {simplifyLogEntry(entry) || entry}
      </p>
    ))}
  </div>
</div>
  </div>
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
              <span className="block w-8 h-8 lg:w-12 lg:h-12 rounded-full border border-amber-500/40 overflow-hidden" style={{ background: "#0A0F1E" }}>
                <img src={heroArt} alt={hero.name} className="art-portrait" />
              </span>
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
            <div className="relative flex items-center gap-1.5">
  {tutorialActive && tutorialStep === 0 && (
    <TutorialGuidingLight
  direction="down"
  size="small"
  className="-top-12 left-8"
/>
  )}

  <Heart className="w-3 h-3 lg:w-5 lg:h-5 text-red-400 flex-shrink-0" />
              <div className="w-16 lg:w-36 h-3 lg:h-4 bg-slate-900 rounded-full border border-red-900/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${(battleState.playerHp / battleState.maxPlayerHp) * 100}%` }} />
              </div>
              <span className="text-emerald-200 text-[11px] lg:text-lg font-bold flex-shrink-0">{battleState.playerHp}/{battleState.maxPlayerHp}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] lg:text-sm">
              {battleState.playerBlock > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusExplain(getStatusExplanation("block", battleState.playerBlock)); Sound.sfx.click(); }}
                  className="text-blue-300 flex items-center gap-0.5 hover:text-blue-200 transition active:scale-90"
                >
                  <Shield className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.playerBlock}
                </button>
              )}
              {battleState.counter > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusExplain(getStatusExplanation("counter", battleState.counter)); Sound.sfx.click(); }}
                  className="text-amber-300 flex items-center gap-0.5 font-bold hover:text-amber-200 transition active:scale-90"
                >
                  <Zap className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.counter}
                </button>
              )}
              {battleState.dots > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusExplain(getStatusExplanation("curse", battleState.dots)); Sound.sfx.click(); }}
                  className="text-purple-300 flex items-center gap-0.5 hover:text-purple-200 transition active:scale-90"
                >
                  <Skull className="w-3 h-3 lg:w-4 lg:h-4 inline" />{battleState.dots}
                </button>
              )}
              {battleState.blockScripture && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusExplain(getStatusExplanation("silence")); Sound.sfx.click(); }}
                  className="text-purple-300 flex items-center gap-0.5 hover:text-purple-200 transition active:scale-90 animate-pulse"
                  title="Confused Tongues — Scripture blocked"
                >
                  <span className="text-[9px] lg:text-xs font-bold">🔇</span>
                </button>
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
            {tutorialActive && tutorialStep === 1 && (
  <TutorialGuidingLight
  direction="down"
  size="small"
  className="-top-12 left-1/2 -translate-x-1/2"
/>
)}
            <Sparkles className="w-3 h-3 lg:w-5 lg:h-5 text-yellow-200" />
            <span className="text-yellow-200 text-sm lg:text-2xl font-bold">{battleState.energy}</span>
            <span className="text-yellow-100/50 text-[9px] lg:text-sm">/{battleState.maxEnergy}</span>
            {faithParticle && (
              <span className="absolute -top-3 left-1/2 text-yellow-200 text-sm pointer-events-none" style={{ animation: "faithParticle 0.8s ease-out" }}>✨</span>
            )}
          </div>
          {selectedCard !== null && (() => {
            const sc = resolveCard(battleState.hand[selectedCard]);
            const scPlayable = sc && (battleState.freeCardsRemaining > 0 || battleState.energy >= sc.cost) && !(battleState.blockScripture && sc.type === "scripture");
            return scPlayable ? (
              <span className="text-emerald-300/60 text-[9px] lg:text-[10px] italic mr-1 lg:mr-2 max-w-[70px] lg:max-w-[120px] text-right leading-tight">
                Play card ↑
              </span>
            ) : null;
          })()}
                    <div className="relative">
  {tutorialActive && tutorialStep === 5 && (
    <TutorialGuidingLight
  direction="down"
  size="normal"
  className="-top-14 left-1/2 -translate-x-1/2"
/>
  )}

            <button
              onClick={handleEndTurnClick}
              disabled={isEnemyTurn || !tutorialAllowsEndTurn}
                        className={`rounded-lg border-2 font-bold transition-all whitespace-nowrap active:scale-[0.94] ${
              tutorialActive && tutorialStep === 5
                ? "ring-4 ring-amber-300 shadow-xl shadow-amber-400/60 animate-pulse "
                : ""
            } ${
              selectedCard !== null && (() => {
                const sc = resolveCard(battleState.hand[selectedCard]);
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
      </div>
{/* Selected-card battle summary — fixed-height slot prevents hand movement */}
<div className="h-[58px] flex-shrink-0 border-y border-amber-500/15 bg-slate-950/45 px-3 py-1.5 mb-1">
  {selectedCardData ? (
    <div className="mx-auto flex h-full w-full max-w-xl items-center justify-start gap-3 animate-fade-in">
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-amber-400/35 bg-slate-900 shadow-sm shadow-black/20">
        {CARD_ART[selectedCardData.id] ? (
          <img
            src={CARD_ART[selectedCardData.id]}
            alt={selectedCardData.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-amber-200/40">
            ?
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-start gap-x-1.5 gap-y-0.5 text-left">
          <span className="font-serif text-[11px] font-semibold uppercase tracking-wide text-amber-100">
            {selectedCardData.name}
          </span>

          <span className="text-amber-300/30">•</span>

          <span className="text-[10px] uppercase text-amber-100/60">
            {selectedCardData.type}
          </span>

          <span className="text-amber-300/30">•</span>

          <span className="flex items-center gap-0.5 whitespace-nowrap text-[10px] text-yellow-200">
            <Sparkles className="h-3 w-3" />
            {selectedCardData.cost} Faith
          </span>
        </div>

        <p className="mt-0.5 text-left text-[11px] leading-tight text-amber-100/80">
          {getCardEffectText(selectedCardData)}
        </p>
      </div>
    </div>
  ) : (
    <div className="h-full" aria-hidden="true" />
  )}
</div>
{/* Battle UI 2.0: four-card hand with selected-card focus */}
<div
  className="flex-1 flex flex-col min-h-0"
  style={{ background: "rgba(15,10,5,0.8)" }}
>
  <div
  className="flex-1 min-h-0 flex items-end justify-center overflow-visible px-3 pt-2 pb-[calc(9.5rem+env(safe-area-inset-bottom))]"
>
    {battleState.hand.length === 0 ? (
      <p className="text-amber-100/50 text-xs py-4 w-full text-center">
        No cards — End Turn to draw
      </p>
    ) : (
<div
  className={`grid w-full grid-cols-4 items-end gap-1.5 px-1 transition-transform duration-300 ease-out ${
    selectedCard !== null
      ? "translate-y-0"
      : "translate-y-10"
  }`}
>
        {battleState.hand.map((cardOrId, idx) => {
          const card =
            typeof cardOrId === "string"
              ? getCardById(cardOrId)
              : cardOrId;

          if (!card) return null;

          const playable =
            battleState.freeCardsRemaining > 0 ||
            battleState.energy >= card.cost;

          const blocked =
            battleState.blockScripture &&
            card.type === "scripture";

          const isRequiredTutorialCard =
            tutorialActive &&
            tutorialRequiredCardId === card.id;

          const tutorialCardEnabled =
            !tutorialActive ||
            (tutorialAllowsCardSelection &&
              (!tutorialRequiredCardId ||
                tutorialRequiredCardId === card.id));

          const cardCanBePlayed =
            playable &&
            !blocked &&
            !isEnemyTurn &&
            tutorialCardEnabled;

          const isSelected = selectedCard === idx;
          const anotherCardSelected =
            selectedCard !== null && !isSelected;

          return (
            <div
              key={idx}
              className={`relative min-w-0 origin-bottom transition-all duration-200 ${
                isSelected
                  ? "z-30 translate-y-0 scale-100"
                  : anotherCardSelected
                    ? "z-0 translate-y-0 scale-100 opacity-75"
                    : "z-0 translate-y-0 scale-100 opacity-100"
              } ${
       isRequiredTutorialCard && !isSelected
  ? "rounded-xl ring-2 ring-inset ring-amber-300/80 shadow-lg shadow-amber-400/25"
  : tutorialActive && !tutorialCardEnabled
    ? "opacity-55 grayscale"
    : ""
              }`}
            >
              {isRequiredTutorialCard && !isSelected && (
  <TutorialGuidingLight
  direction="down"
  size="normal"
  className="-top-14 left-1/2 -translate-x-1/2"
/>
)}
              <Card
                card={card}
                inHand
                small={true}
                playable={cardCanBePlayed}
                blocked={blocked}
                selected={false}
                onClick={
                  tutorialCardEnabled
                    ? () => handleSelectCard(idx)
                    : undefined
                }
                onLongPress={
                  tutorialActive
                    ? undefined
                    : () => setLongPressCard(card)
                }
              />
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

      {/* Selected card preview — compact bar, hand stays visible */}
      {selectedCard !== null && battleState.hand[selectedCard] && (() => {
        const selCard = resolveCard(battleState.hand[selectedCard]);
        if (!selCard) return null;
        const playable = battleState.freeCardsRemaining > 0 || battleState.energy >= selCard.cost;
        const blocked = battleState.blockScripture && selCard.type === "scripture";
        return (
          <CardPreviewPanel
  card={selCard}
  playable={playable && !isEnemyTurn}
  blocked={blocked}
  battleState={battleState}
  onPlay={() => handlePlayCard(selectedCard)}
  onCancel={() => {
    Sound.sfx.click();
    setSelectedCard(null);
  }}
  showTutorialPlayGuide={
    tutorialActive &&
    (
      (tutorialStep === 3 && selCard.id === "sling_stone") ||
      (tutorialStep === 4 && selCard.id === "faith_shield")
    )
  }
/>
        );
      })()}

      {/* Battle end overlay */}
      {battleEnd && !run.isTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center">
            {battleEnd === "victory" ? (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-amber-400/50 shadow-xl shadow-amber-400/30 overflow-hidden animate-bounce" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
                    <img src={VICTORY_ART.crest} alt="Victory" className="art-portrait" />
                  </div>
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

      {/* Status explanation popover — tap any status icon */}
      {statusExplain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.85)" }} onClick={() => setStatusExplain(null)}>
          <div
            className="max-w-xs w-full rounded-xl border-2 border-purple-500/50 p-4 animate-fade-in"
            style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-serif text-purple-200">{statusExplain.name}</h3>
              <button onClick={() => setStatusExplain(null)} className="text-amber-100/40 hover:text-amber-200 text-sm">✕</button>
            </div>
            <p className="text-amber-100/80 text-xs leading-relaxed">{statusExplain.text}</p>
          </div>
        </div>
      )}

      {/* End Turn confirmation */}
      {endTurnConfirm && !tutorialActive && (
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
  selectedCardId={selectedCardData?.id || null}
/>
      )}

      {/* Tutorial completion message */}
      {tutorialCompleteMsg && !battleEnd && (
        <div className="fixed inset-0 z-[58] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.85)" }} onClick={handleTutorialDismiss}>
          <div className="max-w-xs rounded-xl border-2 border-emerald-400/50 p-5 text-center animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full border-2 border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="mb-4">   <h3 className="font-serif text-lg text-emerald-200">     Tutorial Complete   </h3>    <p className="mt-2 text-sm leading-relaxed text-amber-100/80">     You now know how to attack, defend, and spend Faith.   </p> </div>
            <button onClick={handleTutorialDismiss} className="px-6 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Help tips overlay — reopened via "?" button */}
      {showHelpTips && !tutorialActive && (
  <BattleGuideCallouts
    onComplete={() => {
      setShowHelpTips(false);
      Sound.sfx.click();
    }}
  />
)}

      {/* Pause overlay */}
      {showPause && !showAbandonConfirm && !tutorialActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(8,12,24,0.95)" }}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-8" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <h2 className="text-2xl font-serif text-amber-200 text-center mb-1">Paused</h2>
            <p className="text-amber-100/50 text-xs text-center uppercase tracking-wider mb-6">
              Current Run: <span className="text-amber-200/80 capitalize">{run.difficulty || "Easy"}</span>
            </p>

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
  </>
);
}