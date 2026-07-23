import { describe, it, expect } from "vitest";
import {
  CURRENT_PROGRESSION_VERSION,
  NEW_JOURNEY_MESSAGE,
  NEW_JOURNEY_BODY,
  POST_RESET_MESSAGE,
  RESET_CONFIRMATION_WORD,
  createDefaultGameplayProgress,
  resetGameplayProgress,
  needsVersionReset,
  resetForVersion,
} from "@/game/progressionReset";
import { STARTER_DECK, STARTER_COLLECTION } from "@/game/deckRules";

// A profile mid-way through progress, plus account identity/preferences that
// must survive a reset untouched.
function buildProgressedProfile(overrides = {}) {
  return {
    unlockedHeroes: ["adam", "noah"],
    cardCollection: { sling_stone: 3, ark_covenant: 1 },
    cardFragments: { sling_stone: 12 },
    faithShards: 40,
    activeDeck: ["sling_stone", "ark_covenant"],
    collectedCards: ["sling_stone", "ark_covenant"],
    achievements: ["collector", "first_victory"],
    dailyStreak: 9,
    lastDailyDate: "2026-07-20",
    devotionStreak: 5,
    devotionReadDate: "2026-07-22",
    introSeen: true,
    battlesUnscathed: 3,
    difficulty: "hard",
    gold: 500,
    tutorialSeen: true,
    genesisCompleted: true,
    genesisEasyCompleted: true,
    genesisNormalCompleted: true,
    genesisHardCompleted: true,
    encounteredEnemies: ["serpent", "the_flood"],
    defeatedEnemies: ["serpent"],
    // Account identity / preferences — must be preserved.
    playerName: "FaithfulRunner42",
    settings: { music: false, sfx: true, musicVolume: 30, guidanceLevel: "expert" },
    accountPromptSeen: true,
    leaderboardNamePromptSeen: true,
    developerUnlockAll: true,
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    ...overrides,
  };
}

describe("createDefaultGameplayProgress", () => {
  it("matches the game's actual starter deck/collection, not invented values", () => {
    const fresh = createDefaultGameplayProgress();
    expect(fresh.activeDeck).toEqual(STARTER_DECK);
    expect(fresh.cardCollection).toEqual(STARTER_COLLECTION);
    expect(fresh.collectedCards.sort()).toEqual(Object.keys(STARTER_COLLECTION).sort());
    expect(fresh.unlockedHeroes).toEqual(["adam"]);
    expect(fresh.gold).toBe(0);
    expect(fresh.faithShards).toBe(0);
    expect(fresh.cardFragments).toEqual({});
    expect(fresh.difficulty).toBe("easy");
  });

  it("never includes account identity or preference fields", () => {
    const fresh = createDefaultGameplayProgress();
    expect(fresh).not.toHaveProperty("playerName");
    expect(fresh).not.toHaveProperty("settings");
    expect(fresh).not.toHaveProperty("accountPromptSeen");
    expect(fresh).not.toHaveProperty("leaderboardNamePromptSeen");
    expect(fresh).not.toHaveProperty("progressionVersion");
  });

  it("returns a fresh object each call (no shared mutable references)", () => {
    const a = createDefaultGameplayProgress();
    const b = createDefaultGameplayProgress();
    a.activeDeck.push("intruder");
    a.cardCollection.intruder = 99;
    expect(b.activeDeck).not.toContain("intruder");
    expect(b.cardCollection).not.toHaveProperty("intruder");
  });
});

describe("resetGameplayProgress", () => {
  it("clears every gameplay-progress field back to fresh-journey defaults", () => {
    const progressed = buildProgressedProfile();
    const reset = resetGameplayProgress(progressed);
    const fresh = createDefaultGameplayProgress();

    for (const key of Object.keys(fresh)) {
      expect(reset[key]).toEqual(fresh[key]);
    }
  });

  it("preserves account identity and preference fields untouched", () => {
    const progressed = buildProgressedProfile();
    const reset = resetGameplayProgress(progressed);

    expect(reset.playerName).toBe(progressed.playerName);
    expect(reset.settings).toEqual(progressed.settings);
    expect(reset.accountPromptSeen).toBe(progressed.accountPromptSeen);
    expect(reset.leaderboardNamePromptSeen).toBe(progressed.leaderboardNamePromptSeen);
    expect(reset.developerUnlockAll).toBe(progressed.developerUnlockAll);
  });

  it("stamps the current progression version and reset bookkeeping fields", () => {
    const progressed = buildProgressedProfile({ progressResetGeneration: 2 });
    const before = Date.now();
    const reset = resetGameplayProgress(progressed);
    const after = Date.now();

    expect(reset.progressionVersion).toBe(CURRENT_PROGRESSION_VERSION);
    expect(reset.progressResetGeneration).toBe(3);
    expect(reset.lastProgressResetAt).toBeGreaterThanOrEqual(before);
    expect(reset.lastProgressResetAt).toBeLessThanOrEqual(after);
  });

  it("starts progressResetGeneration at 1 for a profile that never reset before", () => {
    const progressed = buildProgressedProfile();
    delete progressed.progressResetGeneration;
    const reset = resetGameplayProgress(progressed);
    expect(reset.progressResetGeneration).toBe(1);
  });

  it("is a pure function — never mutates the input profile", () => {
    const progressed = buildProgressedProfile();
    const snapshot = JSON.parse(JSON.stringify(progressed));
    resetGameplayProgress(progressed);
    expect(progressed).toEqual(snapshot);
  });

  it("is idempotent-safe: resetting an already-reset profile stays fully reset", () => {
    const progressed = buildProgressedProfile();
    const once = resetGameplayProgress(progressed);
    const twice = resetGameplayProgress(once);
    const fresh = createDefaultGameplayProgress();
    for (const key of Object.keys(fresh)) {
      expect(twice[key]).toEqual(fresh[key]);
    }
    expect(twice.progressResetGeneration).toBe(2);
  });
});

describe("versioned global-reset infrastructure (must stay inactive)", () => {
  it("CURRENT_PROGRESSION_VERSION is 1", () => {
    expect(CURRENT_PROGRESSION_VERSION).toBe(1);
  });

  it("needsVersionReset is false for a profile already on the current version", () => {
    expect(needsVersionReset({ progressionVersion: CURRENT_PROGRESSION_VERSION })).toBe(false);
  });

  it("needsVersionReset is false for a profile missing the field entirely (migrate, don't reset)", () => {
    expect(needsVersionReset({})).toBe(false);
  });

  it("needsVersionReset would only fire for a strictly older stored version", () => {
    expect(needsVersionReset({ progressionVersion: CURRENT_PROGRESSION_VERSION - 1 })).toBe(true);
  });

  it("resetForVersion reuses resetGameplayProgress's exact behavior", () => {
    const progressed = buildProgressedProfile({ progressionVersion: 0 });
    const result = resetForVersion(progressed);
    const fresh = createDefaultGameplayProgress();
    for (const key of Object.keys(fresh)) {
      expect(result[key]).toEqual(fresh[key]);
    }
    expect(result.progressionVersion).toBe(CURRENT_PROGRESSION_VERSION);
    expect(result.playerName).toBe(progressed.playerName);
  });
});

describe("prepared (not yet displayed) messaging", () => {
  it("NEW_JOURNEY_MESSAGE is prepared for a future versioned reset", () => {
    expect(NEW_JOURNEY_MESSAGE).toBe("A NEW JOURNEY BEGINS");
  });

  it("NEW_JOURNEY_BODY is prepared with the exact future announcement copy", () => {
    expect(NEW_JOURNEY_BODY).toBe(
      "Chronicles of Faith has received a major progression and economy update. " +
      "To keep competition fair, gameplay progress has been reset. Your account " +
      "preferences remain unchanged."
    );
  });

  it("POST_RESET_MESSAGE is the personal-reset acknowledgment text", () => {
    expect(POST_RESET_MESSAGE).toBe("Your journey has been reset.");
  });

  it("RESET_CONFIRMATION_WORD is the exact typed-confirmation word", () => {
    expect(RESET_CONFIRMATION_WORD).toBe("RESET");
  });
});
