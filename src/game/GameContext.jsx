import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { HEROES, HERO_MAP } from "@/data/heroes";
import { CARDS, CARD_MAP, getCardById } from "@/data/cards";
import { ENEMIES, ENEMY_POOL, BOSSES } from "@/data/enemies";
import { TRIVIA_QUESTIONS } from "@/data/trivia";
import { ACHIEVEMENT_MAP } from "@/data/achievements";
import { STORY_CHOICES, TREASURE_REWARDS, DIVINE_BLESSINGS, ROOM_TYPES } from "@/data/genesisRooms";
import { generateMap, pick, pickN, createRng } from "@/game/mapGenerator";
import * as Sound from "@/game/soundManager";

const GameContext = createContext(null);

const STORAGE_KEY = "chronicles_of_faith_v1";
const RUN_STORAGE_KEY = "chronicles_of_faith_run_v1";

function loadRun() {
  try {
    const raw = localStorage.getItem(RUN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (["victory", "defeat", "dailyResult"].includes(parsed.phase)) return null;
      return parsed;
    }
  } catch (e) {}
  return null;
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    unlockedHeroes: ["adam"],
    collectedCards: [...new Set(HEROES[0].starterDeck)],
    achievements: [],
    settings: { music: true, sfx: true, musicVolume: 50, sfxVolume: 50, narrationVolume: 50, narration: true, enemyAnimation: "step", narrationVoice: "default", guidanceTips: false, guidanceLevel: "normal" },
    dailyStreak: 0,
    lastDailyDate: null,
    playerName: "",
    battlesUnscathed: 0,
    difficulty: "normal",
    gold: 0,
    tutorialSeen: false,
  };
}

export function GameProvider({ children }) {
  const [profile, setProfile] = useState(loadProfile);
  const [run, setRun] = useState(loadRun);
  const [achievementQueue, setAchievementQueue] = useState([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (run) {
      try { localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run)); } catch (e) {}
    } else {
      localStorage.removeItem(RUN_STORAGE_KEY);
    }
  }, [run]);

  // Flush state to localStorage when app goes to background (save/resume reliability)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          if (run) localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
        } catch (e) {}
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleVisibilityChange);
    window.addEventListener("beforeunload", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleVisibilityChange);
    };
  }, [profile, run]);

  useEffect(() => {
    Sound.setMusicEnabled(profile.settings.music);
    Sound.setSfxEnabled(profile.settings.sfx);
    Sound.setMusicVolume((profile.settings.musicVolume ?? 50) / 100);
    Sound.setSfxVolume((profile.settings.sfxVolume ?? 50) / 100);
    Sound.setNarrationVolume((profile.settings.narrationVolume ?? 50) / 100);
  }, [profile.settings]);

  const saveProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const unlockAchievement = useCallback((id) => {
    setProfile(prev => {
      if (prev.achievements.includes(id)) return prev;
      setAchievementQueue(q => [...q, id]);
      if (prev.settings.sfx) Sound.sfx.achievement();
      return { ...prev, achievements: [...prev.achievements, id] };
    });
  }, []);

  const dismissAchievement = useCallback(() => {
    setAchievementQueue(q => q.slice(1));
  }, []);

  const addCardsToCollection = useCallback((cardIds) => {
    setProfile(prev => ({
      ...prev,
      collectedCards: [...new Set([...prev.collectedCards, ...cardIds])],
    }));
  }, []);

  // Check collection-based achievements
  useEffect(() => {
    if (profile.collectedCards.length >= 15 && !profile.achievements.includes("collector")) {
      unlockAchievement("collector");
    }
  }, [profile.collectedCards, profile.achievements, unlockAchievement]);

  // ===== RUN MANAGEMENT =====
  const startRun = useCallback((heroId, isDaily = false, seedOverride = null) => {
    const hero = HERO_MAP[heroId];
    if (!hero || !profile.unlockedHeroes.includes(heroId)) return;

    const difficulty = profile.difficulty || "normal";
    const seed = seedOverride || (isDaily ? new Date().toISOString().slice(0, 10) : `run-${Date.now()}-${Math.random()}`);
    const map = generateMap(seed, difficulty);
    const fogOfWar = difficulty !== "easy";
    const enemyRng = createRng(seed);

    // Assign enemies to battle nodes
    for (const layer of map) {
      for (const node of layer) {
        if (node.type === ROOM_TYPES.BATTLE) {
          const enemyId = pick(enemyRng, ENEMY_POOL);
          node.enemyId = enemyId;
        }
        if (node.type === ROOM_TYPES.BOSS) {
          node.enemyId = pick(enemyRng, BOSSES);
        }
        if (node.type === ROOM_TYPES.TREASURE) {
          node.treasureReward = pick(enemyRng, TREASURE_REWARDS);
        }
        if (node.type === ROOM_TYPES.DIVINE) {
          node.divineBlessings = pickN(enemyRng, DIVINE_BLESSINGS, 3);
        }
        if (node.type === ROOM_TYPES.STORY) {
          node.storyChoice = pick(enemyRng, STORY_CHOICES);
        }
        if (node.type === ROOM_TYPES.MYSTERY) {
          const types = [ROOM_TYPES.BATTLE, ROOM_TYPES.TREASURE, ROOM_TYPES.STORY, ROOM_TYPES.DIVINE];
          const realType = pick(enemyRng, types);
          node.mysteryType = realType;
          if (realType === ROOM_TYPES.BATTLE) node.enemyId = pick(enemyRng, ENEMY_POOL);
          if (realType === ROOM_TYPES.TREASURE) node.treasureReward = pick(enemyRng, TREASURE_REWARDS);
          if (realType === ROOM_TYPES.STORY) node.storyChoice = pick(enemyRng, STORY_CHOICES);
          if (realType === ROOM_TYPES.DIVINE) node.divineBlessings = pickN(enemyRng, DIVINE_BLESSINGS, 3);
        }
      }
    }

    setRun({
      hero,
      map,
      seed,
      isDaily,
      difficulty,
      fogOfWar,
      playerHp: hero.maxHp,
      maxHp: hero.maxHp,
      deck: [...hero.starterDeck],
      gold: 0,
      roomsCleared: 0,
      triviaCorrect: 0,
      triviaTotal: 0,
      battlesWithoutDamage: 0,
      divineEncounters: 0,
      tookOnlyBattles: true,
      usedScriptureOnly: true,
      usedLegendary: false,
      neverLostHp: true,
      storyChoices: [],
      currentNode: null,
      phase: "map", // map, battle, treasure, divine, story, mystery, narration, trivia, reward, victory, defeat
      pendingReward: null,
      narrationText: "In the beginning, there was nothing... Then God said, 'Let there be light.' And there was light. — Genesis 1:1-3",
      pendingEnemyId: null,
      currentBattleState: null,
      buffAttack: 0,
      shieldActive: false,
      extraDraw: 0,
      nextCardRare: false,
    });

    Sound.playMusic("eden");
  }, [profile.unlockedHeroes]);

  const selectNode = useCallback((nodeId) => {
    setRun(prev => {
      if (!prev) return prev;
      const node = findNode(prev.map, nodeId);
      if (!node) return prev;

      // Mark previous node as visited
      const newMap = prev.map.map(layer =>
        layer.map(n => ({ ...n, visited: n.id === nodeId ? true : n.visited }))
      );

      let phase = node.type;
      if (node.type === ROOM_TYPES.MYSTERY) {
        phase = node.mysteryType;
      }

      const updates = { map: newMap, currentNode: node, phase };

      // Track "narrow path" achievement — only battle rooms
      if (node.type !== ROOM_TYPES.BATTLE && node.type !== ROOM_TYPES.BOSS) {
        updates.tookOnlyBattles = false;
      }

      if (phase === ROOM_TYPES.BATTLE || phase === ROOM_TYPES.BOSS) {
        const enemy = ENEMIES[node.enemyId];
        updates.pendingEnemyId = node.enemyId;
        updates.phase = "battle";
        updates.currentBattleState = null;
      }

      return { ...prev, ...updates };
    });
  }, []);

  const findNode = (map, nodeId) => {
    for (const layer of map) {
      for (const node of layer) {
        if (node.id === nodeId) return node;
      }
    }
    return null;
  };

  const completeRoom = useCallback((nodeId, reward) => {
    setRun(prev => {
      if (!prev) return prev;
      const newMap = prev.map.map(layer =>
        layer.map(n => ({ ...n, cleared: n.id === nodeId ? true : n.cleared }))
      );
      const node = findNode(newMap, nodeId);

      let deck = prev.deck;
      let collectedNew = [];
      if (reward && reward.cardId) {
        deck = [...deck, reward.cardId];
        if (!profile.collectedCards.includes(reward.cardId)) {
          collectedNew = [reward.cardId];
        }
      }

      if (collectedNew.length > 0) {
        setProfile(p => ({
          ...p,
          collectedCards: [...new Set([...p.collectedCards, ...collectedNew])],
        }));
      }

      const roomsCleared = prev.roomsCleared + 1;
      const isBoss = node && node.type === ROOM_TYPES.BOSS;

      // Check achievements
      if (isBoss) {
        unlockAchievement("first_victory");
        if (node.enemyId === "the_flood") unlockAchievement("flood_survivor");
        if (node.enemyId === "babel_tower") unlockAchievement("babel_destroyer");
        if (prev.battlesWithoutDamage >= 3) unlockAchievement("unscathed");
        if (prev.triviaCorrect >= 5) unlockAchievement("scholar");
        if (prev.divineEncounters >= 3) unlockAchievement("divine_favor");
        if (prev.usedLegendary) unlockAchievement("miracle_worker");
        if (prev.tookOnlyBattles) unlockAchievement("narrow_path");
        if (prev.neverLostHp) unlockAchievement("righteous_run");
        if (prev.hero.id === "noah") unlockAchievement("noah_unlocked");
        if (prev.hero.id === "adam") {
          // unlock noah
          setProfile(p => {
            if (p.unlockedHeroes.includes("noah")) return p;
            unlockAchievement("noah_unlocked");
            return { ...p, unlockedHeroes: [...p.unlockedHeroes, "noah"] };
          });
        }
        // walking with god
        if (profile.unlockedHeroes.includes("noah") && prev.hero.id === "noah") {
          unlockAchievement("walking_with_god");
        }

        return {
          ...prev,
          map: newMap,
          deck,
          roomsCleared,
          phase: "victory",
          pendingReward: null,
        };
      }

      return {
        ...prev,
        map: newMap,
        deck,
        roomsCleared,
        phase: "map",
        pendingReward: null,
      };
    });
  }, [profile.collectedCards, profile.unlockedHeroes, unlockAchievement]);

  const setPhase = useCallback((phase) => {
    setRun(prev => prev ? { ...prev, phase } : prev);
  }, []);

  const updateRun = useCallback((updates) => {
    setRun(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const saveBattleState = useCallback((battleState) => {
    setRun(prev => prev ? { ...prev, currentBattleState: battleState } : prev);
  }, []);

  const startDailyBattle = useCallback((dailyConfig) => {
    const hero = dailyConfig.hero;

    setRun({
      hero,
      map: null,
      seed: dailyConfig.seed,
      isDaily: true,
      difficulty: "daily_standard",
      fogOfWar: false,
      playerHp: dailyConfig.playerHp,
      maxHp: dailyConfig.maxHp,
      deck: [...dailyConfig.deck],
      gold: 0,
      roomsCleared: 0,
      triviaCorrect: 0,
      triviaTotal: 0,
      battlesWithoutDamage: 0,
      divineEncounters: 0,
      tookOnlyBattles: true,
      usedScriptureOnly: true,
      usedLegendary: false,
      neverLostHp: true,
      storyChoices: [],
      currentNode: null,
      phase: "battle",
      pendingReward: null,
      narrationText: "",
      pendingEnemyId: dailyConfig.enemyId,
      dailyEnemy: dailyConfig.enemy,
      currentBattleState: null,
      buffAttack: 0,
      shieldActive: false,
      extraDraw: dailyConfig.rule.extraDraw || 0,
      nextCardRare: false,
      dailyConfig,
      dailyMaxEnergy: dailyConfig.rule.maxEnergy || 3,
      dailyEnemyStartBlock: dailyConfig.rule.enemyStartBlock || 0,
      dailyPlayerStartBlock: dailyConfig.rule.playerStartBlock || 0,
      dailyResult: null,
      dailyTriviaCorrect: false,
    });

    Sound.playMusic("battle");
  }, []);

  const endRun = useCallback(() => {
    setRun(null);
    Sound.playMusic("menu");
  }, []);

  const value = {
    profile,
    saveProfile,
    run,
    startRun,
    startDailyBattle,
    selectNode,
    completeRoom,
    setPhase,
    updateRun,
    saveBattleState,
    endRun,
    unlockAchievement,
    addCardsToCollection,
    achievementQueue,
    dismissAchievement,
    Sound,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}