import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { HEROES, HERO_MAP } from "@/data/heroes";
import { CARD_MAP, getCardById } from "@/data/cards";
import { ENEMIES, ENEMY_POOL, BOSSES, EASY_ENEMY_POOL, EASY_BOSS_POOL } from "@/data/enemies";
import { TRIVIA_QUESTIONS } from "@/data/trivia";
import { ACHIEVEMENT_MAP } from "@/data/achievements";
import { STORY_CHOICES, TREASURE_REWARDS, DIVINE_BLESSINGS, ROOM_TYPES } from "@/data/genesisRooms";
import { BOSS_MODIFIER_IDS } from "@/data/bossModifiers";
import { generateMap, pick, pickN, createRng } from "@/game/mapGenerator";
import { STARTER_DECK, STARTER_COLLECTION, RUN_DECK_MAX, validateDeck, grantCardOrFragments, addCardFragments as computeCardFragments, sanitizeCardFragments, craftCardWithFragments, sanitizeFaithShards, convertExcessFragmentsToFaithShards } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import { saveStoryRun, loadStoryRun, clearStoryRun, hasSavedStoryRun } from "@/game/storyRunSave";
import { recordRunStarted, recordPlayTime } from "@/game/playerStats";
import { sanitizePlayerName } from "@/game/nameValidator";
import { migrateDifficultyProgress, resolveSelectableDifficulty, isDifficultyUnlocked, unlocksNoah } from "@/game/difficultyAccess";
import { createDefaultGameplayProgress, resetGameplayProgress, CURRENT_PROGRESSION_VERSION } from "@/game/progressionReset";
import { resetStats } from "@/game/playerStats";
import { syncProfileToCloud } from "@/game/cloudSync";

const GameContext = createContext(null);

const STORAGE_KEY = "chronicles_of_faith_v1";

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate to cardCollection (ownedCount map) if missing
      if (!parsed.cardCollection) {
        const collection = { ...STARTER_COLLECTION };
        if (parsed.collectedCards) {
          for (const id of parsed.collectedCards) {
            if (!collection[id]) collection[id] = 1;
          }
        }
        parsed.cardCollection = collection;
      }
      // Migrate to activeDeck if missing
if (!parsed.activeDeck) {
  parsed.activeDeck = [...STARTER_DECK];
} else {
  const hasOldStarterDeck =
    parsed.activeDeck.includes("song_praise") &&
    parsed.activeDeck.filter(id => id === "righteous_strike").length === 1;

  if (hasOldStarterDeck) {
    parsed.activeDeck = parsed.activeDeck.map(id =>
      id === "song_praise" ? "righteous_strike" : id
    );

    parsed.cardCollection = {
      ...parsed.cardCollection,
      righteous_strike: Math.max(
        2,
        parsed.cardCollection?.righteous_strike || 0
      ),
    };
  }
}
      // Keep collectedCards in sync (unique card IDs)
      parsed.collectedCards = Object.keys(parsed.cardCollection);
      // Sanitize any stored player name (old invalid names become "Anonymous Pilgrim")
      parsed.playerName = sanitizePlayerName(parsed.playerName);
      // Migrate devotion tracking fields
      if (parsed.devotionStreak === undefined) parsed.devotionStreak = 0;
      if (parsed.devotionReadDate === undefined) parsed.devotionReadDate = null;
      // Migrate Genesis completion flag
      if (parsed.genesisCompleted === undefined) parsed.genesisCompleted = false;
      // Migrate Genesis Normal completion flag
      if (parsed.genesisNormalCompleted === undefined) {
        parsed.genesisNormalCompleted = false;
      }
      // Migrate tiered difficulty progression (genesisEasyCompleted / Hard).
      // Infers Easy from any prior completion so existing players keep access.
      Object.assign(parsed, migrateDifficultyProgress(parsed));
      // A stored difficulty preference that points at a now-locked mode falls
      // back safely to the highest unlocked mode (never a locked selection).
      parsed.difficulty = resolveSelectableDifficulty(parsed.difficulty, parsed);
      // Migrate leaderboard name-prompt-seen flag
      if (parsed.leaderboardNamePromptSeen === undefined) parsed.leaderboardNamePromptSeen = false;
      if (!parsed.settings) parsed.settings = {};
      if (parsed.settings.playableEndTurnWarning === undefined) {
        parsed.settings.playableEndTurnWarning = true;
      }
      if (parsed.settings.playableEndTurnWarningSeen === undefined) {
        parsed.settings.playableEndTurnWarningSeen = false;
      }

// Codex migration
if (!Array.isArray(parsed.encounteredEnemies)) parsed.encounteredEnemies = [];
if (!Array.isArray(parsed.defeatedEnemies)) parsed.defeatedEnemies = [];

// Migrate to Card Fragments map (Phase 1 foundation — storage only, no
// crafting/spending yet). Existing duplicates are NOT retroactively
// converted; players simply start at 0 Fragments for every card unless
// valid stored data already exists. Malformed entries (non-numeric,
// negative, non-integer) normalize to 0 rather than crashing the load.
parsed.cardFragments = sanitizeCardFragments(parsed.cardFragments);

// Migrate to Faith Shards (Phase 3 foundation). No historical retroactive
// grant — existing players simply start at 0 unless valid stored data
// already exists. Malformed values (non-numeric, negative, non-integer,
// null, missing) normalize to 0 rather than crashing the load.
parsed.faithShards = sanitizeFaithShards(parsed.faithShards);

// Versioned global-reset infrastructure (inactive) — a profile that
// predates this field simply gets migrated onto the current version, no
// reset. See progressionReset.js for when/how this would ever change.
if (typeof parsed.progressionVersion !== "number") {
  parsed.progressionVersion = CURRENT_PROGRESSION_VERSION;
}

return parsed;
    }
  } catch (e) {}
  return {
    ...createDefaultGameplayProgress(),
    settings: { music: true, sfx: true, musicVolume: 50, sfxVolume: 50, narrationVolume: 50, narration: true, enemyAnimation: "step", narrationVoice: "default", guidanceTips: false, guidanceLevel: "normal", playableEndTurnWarning: true, playableEndTurnWarningSeen: false },
    playerName: "Anonymous Pilgrim",
    accountPromptSeen: false,
    leaderboardNamePromptSeen: false,
    progressionVersion: CURRENT_PROGRESSION_VERSION,
  };
}

export function GameProvider({ children }) {
  const [profile, setProfile] = useState(loadProfile);
  const [run, setRun] = useState(null);
  const [savedStoryExists, setSavedStoryExists] = useState(() => hasSavedStoryRun());
  const [storySaveError, setStorySaveError] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState([]);
  const [showIntro, setShowIntro] = useState(false);
  const [introPurpose, setIntroPurpose] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Autosave story runs (never daily) — saves on every state change.
  // Victory: keep the last non-terminal save so the player can resume if they
  // reload during the victory screen. The save is cleared by endRun() after the
  // player returns to menu (score submission happens in VictoryScreen).
  // Defeat/dailyResult: clear immediately — the run is lost and the screen is shown.
  useEffect(() => {
    if (run) {
      if (run.isDaily || run.isTutorial) {
  return;
}
      if (run.phase === "victory") {
        return;
      }
      if (run.phase === "dailyResult") {
        clearStoryRun();
        setSavedStoryExists(false);
      } else if (run.phase === "defeat") {
        // Hard mode: true roguelike — clear save on defeat.
        // Easy/Normal: persist the run so the player can retry or end it.
        if (run.difficulty === "hard") {
          clearStoryRun();
          setSavedStoryExists(false);
        } else {
          saveStoryRun(run);
          setSavedStoryExists(true);
        }
      } else {
        saveStoryRun(run);
        setSavedStoryExists(true);
      }
    }
  }, [run]);

  // Flush state to localStorage when app goes to background (save/resume reliability)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {}
        if (   run &&   !run.isDaily &&   !run.isTutorial &&   !["victory", "defeat", "dailyResult"].includes(run.phase) ) {
          saveStoryRun(run);
        }
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
    setProfile(prev => {
      const next = { ...prev, ...updates };
      // Defense-in-depth: sanitize playerName on every save, no matter the source
      if (updates.playerName !== undefined) {
        next.playerName = sanitizePlayerName(updates.playerName);
      }
      return next;
    });
  }, []);
// Player-initiated progress reset (Settings > Danger Zone, typed "RESET"
// confirmation). Computed against the latest `profile` closure value (this
// is only ever invoked from a single confirmed tap, never a hot path, so
// there's no concurrent-mutation race to guard against here the way
// craftCard/convertFragments do against rapid battle actions). Persists to
// localStorage synchronously BEFORE updating React state or clearing
// derived storage, so a thrown write leaves the profile completely
// untouched — no partial clearing. Returns {success} so the caller (the
// Settings reset modal) only closes/navigates once persistence is
// confirmed; a failure leaves everything exactly as it was.
const resetGameProgress = useCallback(() => {
  const nextProfile = resetGameplayProgress(profile);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
  } catch (e) {
    return { success: false };
  }
  setProfile(nextProfile);
  setRun(null);
  clearStoryRun();
  setSavedStoryExists(false);
  setStorySaveError(false);
  resetStats();
  // Best-effort — mirrors the existing Settings "Sync Now" cloud push.
  // Never blocks navigation; a failure here doesn't affect the local reset.
  syncProfileToCloud(nextProfile).catch(() => {});
  return { success: true, profile: nextProfile };
}, [profile]);

const recordEnemyEncounter = useCallback((enemyId) => {
  if (!enemyId) return;

  setProfile(prev => {
    const encountered = prev.encounteredEnemies || [];

    if (encountered.includes(enemyId)) return prev;

    return {
      ...prev,
      encounteredEnemies: [...encountered, enemyId],
    };
  });
}, []);

const recordEnemyDefeat = useCallback((enemyId) => {
  if (!enemyId) return;

  setProfile(prev => {
    const encountered = prev.encounteredEnemies || [];
    const defeated = prev.defeatedEnemies || [];

    return {
      ...prev,
      encounteredEnemies: encountered.includes(enemyId)
        ? encountered
        : [...encountered, enemyId],
      defeatedEnemies: defeated.includes(enemyId)
        ? defeated
        : [...defeated, enemyId],
    };
  });
}, []);
  const unlockAchievement = useCallback((id) => {
  setProfile(prev => {
    if (prev.achievements.includes(id)) return prev;

    const achievement = ACHIEVEMENT_MAP[id];
    const goldReward = achievement?.goldReward || 0;

    setUnlockQueue(q => [
      ...q,
      {
        type: "achievement",
        id,
        goldReward,
      },
    ]);

    if (prev.settings.sfx) {
      Sound.sfx.achievement();
    }

    return {
      ...prev,
      achievements: [...prev.achievements, id],
      gold: (prev.gold || 0) + goldReward,
    };
  });
}, []);

  const dismissUnlock = useCallback(() => {
    setUnlockQueue(q => q.slice(1));
  }, []);

  const queueUnlock = useCallback((unlock) => {
    setUnlockQueue(q => [...q, unlock]);
  }, []);

  const triggerIntroReplay = useCallback((purpose = "replay") => {
    // Fire-and-forget: this issues AudioContext.resume() synchronously within
    // the same tap that called triggerIntroReplay (Start Journey / Replay
    // Intro), which is what mobile Safari's autoplay policy requires. The
    // rest of the chain (music decode/start, narration preload) resolves
    // asynchronously without blocking this state update. See
    // startGenesisIntro() in soundManager.js.
    Sound.startGenesisIntro();
    setIntroPurpose(purpose);
    setShowIntro(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIntroPurpose(null);
    saveProfile({ introSeen: true });
  }, [saveProfile]);

  const addCardsToCollection = useCallback((cardIds) => {
    setProfile(prev => {
      const newCollection = { ...(prev.cardCollection || {}) };
      for (const id of cardIds) {
        newCollection[id] = (newCollection[id] || 0) + 1;
      }
      return {
        ...prev,
        cardCollection: newCollection,
        collectedCards: Object.keys(newCollection),
      };
    });
  }, []);

  const addCardToCollection = useCallback((cardId) => {
    setProfile(prev => {
      const newCollection = { ...(prev.cardCollection || {}) };
      const wasNew = !newCollection[cardId];
      newCollection[cardId] = (newCollection[cardId] || 0) + 1;
      if (wasNew) {
        setUnlockQueue(q => [...q, { type: 'card', cardId }]);
      }
      return {
        ...prev,
        cardCollection: newCollection,
        collectedCards: Object.keys(newCollection),
      };
    });
  }, []);

  const addCardFragments = useCallback((cardId, amount) => {
    setProfile(prev => ({ ...prev, cardFragments: computeCardFragments(prev, cardId, amount) }));
  }, []);

  // Canonical card-grant pipeline (Phase 1 Card Fragments foundation) — every
  // complete-card reward source should route through this so duplicate
  // conversion is decided once, consistently. Reads the current profile
  // snapshot (the same "already owned" read pattern reward screens already
  // use) and dispatches to the matching functional-setState mutation below,
  // so two grants fired back-to-back in one synchronous call still both
  // persist instead of one clobbering the other.
  const grantCard = useCallback((cardId) => {
    const result = grantCardOrFragments(profile, cardId);
    if (result.type === "fragments") {
      addCardFragments(cardId, result.amount);
    } else {
      addCardToCollection(cardId);
    }
    return result;
  }, [profile, addCardFragments, addCardToCollection]);

  // Card Fragments Phase 2 — atomic crafting. `preview` (against the current
  // render's profile) drives the immediate UI result; the actual mutation
  // always re-derives eligibility against `prev` inside the functional
  // setState updater, so Fragments/Gold/ownership are revalidated against the
  // true latest state at the moment the update is applied — Fragments, Gold,
  // and the granted copy change together in that single update or not at all,
  // and two crafts fired back-to-back are each checked against the result of
  // the one before them rather than a shared stale snapshot.
  const craftCard = useCallback((cardId) => {
    const preview = craftCardWithFragments(profile, cardId);
    if (preview.success) {
      setProfile(prev => {
        const revalidated = craftCardWithFragments(prev, cardId);
        return revalidated.success ? revalidated.newProfile : prev;
      });
    }
    return preview;
  }, [profile]);

  // Faith Shards Phase 3 — atomic excess-Fragment conversion. Mirrors
  // craftCard's safety pattern exactly: `preview` (against the current
  // render's profile) drives immediate UI feedback, while the actual
  // mutation re-derives the conversion against `prev` inside the functional
  // setState updater, so Fragments/Faith Shards are revalidated against the
  // true latest state at the moment the update applies.
  const convertFragments = useCallback((cardId) => {
    const preview = convertExcessFragmentsToFaithShards(profile, cardId);
    if (preview.success) {
      setProfile(prev => {
        const revalidated = convertExcessFragmentsToFaithShards(prev, cardId);
        return revalidated.success ? revalidated.newProfile : prev;
      });
    }
    return preview;
  }, [profile]);

  const addToActiveDeck = useCallback((cardId) => {
    setProfile(prev => ({
      ...prev,
      activeDeck: [...(prev.activeDeck || []), cardId],
    }));
  }, []);

  const removeFromActiveDeck = useCallback((index) => {
    setProfile(prev => ({
      ...prev,
      activeDeck: (prev.activeDeck || []).filter((_, i) => i !== index),
    }));
  }, []);

  const removeCardFromDeck = useCallback((cardId) => {
    setProfile(prev => {
      const deck = prev.activeDeck || [];
      const idx = deck.findIndex(id => id === cardId);
      if (idx === -1) return prev;
      return { ...prev, activeDeck: deck.filter((_, i) => i !== idx) };
    });
  }, []);

  const addCardToRunDeck = useCallback((cardId) => {
    setRun(prev => {
      if (!prev) return prev;
      if (prev.deck.length >= RUN_DECK_MAX) return prev;
      return { ...prev, deck: [...prev.deck, cardId] };
    });
  }, []);

  const replaceCardInRun = useCallback((index, newCardId) => {
    setRun(prev => {
      if (!prev) return prev;
      const newDeck = [...prev.deck];
      if (index >= 0 && index < newDeck.length) {
        newDeck[index] = newCardId;
      }
      return { ...prev, deck: newDeck };
    });
  }, []);

  // Check collection-based achievements
  useEffect(() => {
    if (profile.collectedCards.length >= 15 && !profile.achievements.includes("collector")) {
      unlockAchievement("collector");
    }
  }, [profile.collectedCards, profile.achievements, unlockAchievement]);

  // ===== RUN MANAGEMENT =====
const startTutorialRun = useCallback(() => {
  const hero = HERO_MAP.adam;

  if (!hero) return;

  setStorySaveError(false);

  setRun({
    hero,

    // Tutorial is not part of the Genesis campaign.
    isTutorial: true,
    isDaily: false,
    difficulty: "easy",

    // No campaign map or room progression exists during tutorial.
    map: null,
    currentNode: null,
    pendingEnemyId: "serpent",
    phase: "battle",
    fogOfWar: false,

    // Dedicated tutorial health and cards.
    playerHp: hero.maxHp,
    maxHp: hero.maxHp,
    deck: [
      "sling_stone",
      "faith_shield",
      "prayer",
      "sling_stone",
    ],

    gold: 0,
    roomsCleared: 0,

    triviaCorrect: 0,
    triviaAttempted: 0,
    triviaWrong: 0,

    battlesWithoutDamage: 0,
    divineEncounters: 0,
    tookOnlyBattles: true,
    usedScriptureOnly: true,
    usedLegendary: false,
    neverLostHp: true,
    storyChoices: [],

    pendingReward: null,
    narrationText: "",
    narrationSummary: "",

    currentBattleState: null,

    buffAttack: 0,
    shieldActive: false,
    extraDraw: 0,
    freeCardsNext: 0,
    nextCardRare: false,
    startFaithNext: 0,
    startBlockNext: 0,

    bossModifier: null,
    battleCheckpoint: null,
    battleRetries: 0,
    checkpointRetries: 0,

    runStartTime: Date.now(),
  });

  Sound.playMusic("battle");
}, []);
  const startRun = useCallback((heroId, isDaily = false, seedOverride = null, options = {}) => {
    const hero = HERO_MAP[heroId];
    if (!hero || !profile.unlockedHeroes.includes(heroId)) return;

    const difficulty = options.difficulty || profile.difficulty || "easy";
    // Guard: a new campaign run can never start on a locked difficulty. Daily
    // Challenge uses its own difficulty and is unaffected. (The UI already
    // prevents selecting locked modes; this is a defensive safety net.)
    if (!isDaily && !isDifficultyUnlocked(difficulty, profile)) return;
    const seed = seedOverride || (isDaily ? new Date().toISOString().slice(0, 10) : `run-${Date.now()}-${Math.random()}`);
    const map = generateMap(seed, difficulty);
    const fogOfWar = difficulty !== "easy";
    const enemyRng = createRng(seed);

    // Assign enemies to battle nodes
    for (const layer of map) {
      for (const node of layer) {
        if (node.type === ROOM_TYPES.BATTLE) {
          const enemyId = pick(enemyRng, difficulty === "easy" ? EASY_ENEMY_POOL : ENEMY_POOL);
          node.enemyId = enemyId;
        }
        if (node.type === ROOM_TYPES.BOSS) {
  node.enemyId = pick(enemyRng, difficulty === "easy" ? EASY_BOSS_POOL : BOSSES);
  node.bossModifier = pick(enemyRng, BOSS_MODIFIER_IDS);
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
          if (realType === ROOM_TYPES.BATTLE) node.enemyId = pick(enemyRng, difficulty === "easy" ? EASY_ENEMY_POOL : ENEMY_POOL);
          if (realType === ROOM_TYPES.TREASURE) node.treasureReward = pick(enemyRng, TREASURE_REWARDS);
          if (realType === ROOM_TYPES.STORY) node.storyChoice = pick(enemyRng, STORY_CHOICES);
          if (realType === ROOM_TYPES.DIVINE) node.divineBlessings = pickN(enemyRng, DIVINE_BLESSINGS, 3);
        }
      }
    }
const startAtFirstBattle = options.startAtFirstBattle === true;
const firstBattleNode = map
  .flat()
  .find(node => node.type === ROOM_TYPES.BATTLE) || null;

// Easy Genesis always uses the regular serpent for its first battle encounter.
if (!isDaily && difficulty === "easy" && firstBattleNode) {
  Object.assign(firstBattleNode, { enemyId: "serpent" });
}

if (startAtFirstBattle && firstBattleNode) {
  firstBattleNode.visited = true;
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
      deck: [...(profile.activeDeck || STARTER_DECK)],
      gold: 0,
      roomsCleared: 0,
      triviaCorrect: 0,
      triviaAttempted: 0,
      triviaWrong: 0,
      battlesWithoutDamage: 0,
      divineEncounters: 0,
      tookOnlyBattles: true,
      usedScriptureOnly: true,
      usedLegendary: false,
      neverLostHp: true,
      storyChoices: [],
      currentNode: startAtFirstBattle ? firstBattleNode : null,
      phase: startAtFirstBattle ? "battle" : "map",
      runStartTime: Date.now(), // map, battle, treasure, divine, story, mystery, narration, trivia, reward, victory, defeat
      pendingReward: null,
      narrationText: "In the beginning, there was nothing... Then God said, 'Let there be light.' And there was light. — Genesis 1:1-3",
      narrationSummary: "God creates light and begins bringing order from nothing.",
      pendingEnemyId: startAtFirstBattle ? firstBattleNode?.enemyId || null : null,
      currentBattleState: null,
      buffAttack: 0,
      shieldActive: false,
      extraDraw: 0,
      nextCardRare: false,
      startFaithNext: 0,
      startBlockNext: 0,
      bossModifier: map[map.length - 1][0].bossModifier || null,
      battleCheckpoint: startAtFirstBattle
  ? {
      playerHp: hero.maxHp,
      maxHp: hero.maxHp,
      deck: [...(profile.activeDeck || STARTER_DECK)],
      gold: 0,
      roomsCleared: 0,
      buffAttack: 0,
      shieldActive: false,
      extraDraw: 0,
      battlesWithoutDamage: 0,
      neverLostHp: true,
    }
  : null,
      battleRetries: 0,
      checkpointRetries: 0,
    });

    recordRunStarted();
    Sound.playMusic("eden");
  }, [profile.unlockedHeroes, profile.activeDeck, profile.difficulty]);

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

const isBossNode = node.type === ROOM_TYPES.BOSS;
const getsBossPreparation =
  isBossNode && prev.difficulty === "easy";

const updates = {
  map: newMap,
  currentNode: node,
  phase: getsBossPreparation ? "bossPrep" : phase,
};

      // Track "narrow path" achievement — only battle rooms
      if (node.type !== ROOM_TYPES.BATTLE && node.type !== ROOM_TYPES.BOSS) {
        updates.tookOnlyBattles = false;
      }

      if (   phase === ROOM_TYPES.BATTLE ||   (phase === ROOM_TYPES.BOSS && !getsBossPreparation) ) {
        const enemy = ENEMIES[node.enemyId];
        updates.pendingEnemyId = node.enemyId;
        updates.phase = "battle";
        updates.currentBattleState = null;
        // Snapshot room-start state for checkpoint retries (Normal mode)
        updates.battleCheckpoint = {
          playerHp: prev.playerHp,
          maxHp: prev.maxHp,
          deck: [...prev.deck],
          gold: prev.gold,
          roomsCleared: prev.roomsCleared,
          buffAttack: prev.buffAttack,
          shieldActive: prev.shieldActive,
          extraDraw: prev.extraDraw,
          battlesWithoutDamage: prev.battlesWithoutDamage,
          neverLostHp: prev.neverLostHp,
        };
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

  const completeRoom = useCallback((nodeId) => {
    setRun(prev => {
      if (!prev) return prev;
      const newMap = prev.map.map(layer =>
        layer.map(n => ({ ...n, cleared: n.id === nodeId ? true : n.cleared }))
      );
      const node = findNode(newMap, nodeId);

      const roomsCleared = prev.roomsCleared + 1;
      const isBoss = node && node.type === ROOM_TYPES.BOSS;

      // Check achievements
      if (isBoss) {
        unlockAchievement("first_victory");
        if (node.enemyId === "the_flood") {
  unlockAchievement("flood_survivor");
}

if (node.enemyId === "sodom_gomorrah") {
  unlockAchievement("sodom_judgment");
}

if (node.enemyId === "babel_tower") {
  unlockAchievement("babel_destroyer");
}
        if (prev.battlesWithoutDamage >= 3) unlockAchievement("unscathed");
        if (prev.triviaCorrect >= 5) unlockAchievement("scholar");
        if (prev.divineEncounters >= 3) unlockAchievement("divine_favor");
        if (prev.usedLegendary) unlockAchievement("miracle_worker");
        if (prev.tookOnlyBattles) unlockAchievement("narrow_path");
        if (prev.neverLostHp) unlockAchievement("righteous_run");
        if (prev.hero.id === "noah") unlockAchievement("noah_unlocked");
        // Noah unlocks only after completing Genesis on Normal (or Hard) — never
        // from an Easy clear, the tutorial, or Daily.
        if (prev.hero.id === "adam" && unlocksNoah(prev.difficulty)) {
          // unlock noah
          setProfile(p => {
            if (p.unlockedHeroes.includes("noah")) return p;
            unlockAchievement("noah_unlocked");
            setUnlockQueue(q => [...q, { type: 'hero', heroId: 'noah' }]);
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
          roomsCleared,
          phase: "victory",
          pendingReward: null,
        };
      }

      return {
        ...prev,
        map: newMap,
        roomsCleared,
        phase: "map",
        pendingReward: null,
      };
    });
  }, [profile.unlockedHeroes, unlockAchievement]);

  const setPhase = useCallback((phase) => {
    setRun(prev => prev ? { ...prev, phase } : prev);
  }, []);

  const updateRun = useCallback((updates) => {
    setRun(prev => {
      if (!prev) return prev;
      const resolved = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolved };
    });
  }, []);

  const saveBattleState = useCallback((battleState) => {
    setRun(prev => prev ? { ...prev, currentBattleState: battleState } : prev);
  }, []);

  const startDailyBattle = useCallback((dailyConfig) => {
    const hero = dailyConfig.hero;

    // Daily Challenge is sealed: always the fixed deck computed deterministically
    // from today's seed in getDailyChallenge(). The player's custom deck,
    // unlocked cards, upgrades, and progression are never used here.
    const deck = [...dailyConfig.deck];

    setRun({
      hero,
      map: null,
      seed: dailyConfig.seed,
      isDaily: true,
      mode: "daily",
      difficulty: "daily_standard",
      fogOfWar: false,
      playerHp: dailyConfig.playerHp,
      maxHp: dailyConfig.maxHp,
      deck,
      gold: 0,
      roomsCleared: 0,
      triviaCorrect: 0,
      triviaAttempted: 0,
      triviaWrong: 0,
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
      dailyMaxEnergy: dailyConfig.startFaith || dailyConfig.rule.maxEnergy || 3,
      dailyDrawPerTurn: dailyConfig.drawPerTurn || 1,
      dailyEnemyStartBlock: dailyConfig.rule.enemyStartBlock || 0,
      dailyPlayerStartBlock: dailyConfig.rule.playerStartBlock || 0,
      dailyResult: null,
      dailyTriviaCorrect: false,
      runStartTime: Date.now(),
    });

    Sound.playMusic("battle");
  }, []);

  const resumeStoryRun = useCallback(() => {
    const saved = loadStoryRun();
    if (!saved) {
      setSavedStoryExists(false);
      setStorySaveError(true);
      return false;
    }
    const { savedAt, ...runData } = saved;
    setRun({ ...runData, runStartTime: Date.now(), difficulty: runData.difficulty || "easy" });
    setSavedStoryExists(true);
    setStorySaveError(false);
    return true;
  }, []);

  const endRun = useCallback(() => {
    const preservesStorySave = run?.isDaily || run?.isTutorial;
    if (run?.runStartTime) {
      recordPlayTime((Date.now() - run.runStartTime) / 1000);
    }
    setRun(null);
    if (!preservesStorySave) {
      clearStoryRun();
      setSavedStoryExists(false);
    }
    setStorySaveError(false);
    Sound.playMusic("menu");
  }, [run]);

  // Save the current story run and return to menu WITHOUT deleting the save.
  // The in-memory run is cleared so Home shows the "Continue Saved Run" button.
  const saveAndExit = useCallback(() => {
    if (   run &&   !run.isDaily &&   !run.isTutorial &&   !["victory", "defeat", "dailyResult"].includes(run.phase) ) {
      if (run.runStartTime) {
        recordPlayTime((Date.now() - run.runStartTime) / 1000);
      }
      saveStoryRun(run);
      setSavedStoryExists(true);
    }
    setRun(null);
    setStorySaveError(false);
    Sound.playMusic("menu");
  }, [run]);

  // Easy mode: retry the same battle with generous HP (75% max).
  // Small score penalty (-5%) per retry. Run persists.
  const retryBattle = useCallback(() => {
    setRun(prev => {
      if (!prev || prev.isDaily) return prev;
      const restoreHp = Math.max(1, Math.ceil(prev.maxHp * 0.75));
      return {
        ...prev,
        playerHp: restoreHp,
        phase: "battle",
        currentBattleState: null,
        battleRetries: (prev.battleRetries || 0) + 1,
        neverLostHp: false,
      };
    });
    Sound.sfx.click();
  }, []);

  // Normal mode: retry from checkpoint (room-start state) with 50% HP.
  // Larger score penalty (-15%) per retry. Run persists.
  const retryFromCheckpoint = useCallback(() => {
    setRun(prev => {
      if (!prev || prev.isDaily) return prev;
      const cp = prev.battleCheckpoint;
      const maxHp = cp?.maxHp || prev.maxHp;
      const restoreHp = Math.max(1, Math.ceil(maxHp * 0.50));
      if (!cp) {
        // Fallback: no checkpoint saved (old run) — just restore HP
        return {
          ...prev,
          playerHp: restoreHp,
          phase: "battle",
          currentBattleState: null,
          checkpointRetries: (prev.checkpointRetries || 0) + 1,
          neverLostHp: false,
        };
      }
      return {
        ...prev,
        playerHp: restoreHp,
        maxHp: cp.maxHp || prev.maxHp,
        deck: [...cp.deck],
        gold: cp.gold,
        roomsCleared: cp.roomsCleared,
        buffAttack: cp.buffAttack || 0,
        shieldActive: cp.shieldActive || false,
        extraDraw: cp.extraDraw || 0,
        battlesWithoutDamage: cp.battlesWithoutDamage || 0,
        neverLostHp: false,
        phase: "battle",
        currentBattleState: null,
        checkpointRetries: (prev.checkpointRetries || 0) + 1,
      };
    });
    Sound.sfx.click();
  }, []);

  const value = {
    profile,
    saveProfile,
    resetGameProgress,
    recordEnemyEncounter,
    recordEnemyDefeat,
    run,
    startRun,
    startTutorialRun,
    startDailyBattle,
    selectNode,
    completeRoom,
    setPhase,
    updateRun,
    saveBattleState,
    endRun,
    saveAndExit,
    retryBattle,
    retryFromCheckpoint,
    resumeStoryRun,
    savedStoryExists,
    storySaveError,
    unlockAchievement,
    addCardsToCollection,
    addCardToCollection,
    addCardFragments,
    grantCard,
    craftCard,
    convertFragments,
    addToActiveDeck,
    removeFromActiveDeck,
    removeCardFromDeck,
    addCardToRunDeck,
    replaceCardInRun,
    unlockQueue,
    dismissUnlock,
    queueUnlock,
    showIntro,
    introPurpose,
    triggerIntroReplay,
    handleIntroComplete,
    Sound,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
