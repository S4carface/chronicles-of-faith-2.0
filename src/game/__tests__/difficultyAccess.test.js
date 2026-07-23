import { describe, it, expect, beforeEach } from "vitest";
import {
  isDifficultyUnlocked,
  getUnlockRequirement,
  getHighestUnlockedDifficulty,
  resolveSelectableDifficulty,
  migrateDifficultyProgress,
  unlocksNoah,
  NOAH_UNLOCK_TEXT,
  DIFFICULTY_ORDER,
} from "@/game/difficultyAccess";

// localStorage polyfill for the persistence / saved-run round-trips.
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

describe("unlock rules", () => {
  it("a new player has only Easy unlocked", () => {
    const p = {};
    expect(isDifficultyUnlocked("easy", p)).toBe(true);
    expect(isDifficultyUnlocked("normal", p)).toBe(false);
    expect(isDifficultyUnlocked("hard", p)).toBe(false);
  });

  it("an Easy victory unlocks Normal (genesisEasyCompleted)", () => {
    const p = { genesisEasyCompleted: true };
    expect(isDifficultyUnlocked("normal", p)).toBe(true);
    expect(isDifficultyUnlocked("hard", p)).toBe(false);
  });

  it("an Easy loss does not unlock Normal (no flag set)", () => {
    // A loss never sets genesisEasyCompleted (only VictoryScreen does).
    const p = { genesisEasyCompleted: false };
    expect(isDifficultyUnlocked("normal", p)).toBe(false);
  });

  it("a Normal victory unlocks Hard (genesisNormalCompleted)", () => {
    const p = { genesisEasyCompleted: true, genesisNormalCompleted: true };
    expect(isDifficultyUnlocked("hard", p)).toBe(true);
  });

  it("a Normal loss does not unlock Hard", () => {
    const p = { genesisEasyCompleted: true, genesisNormalCompleted: false };
    expect(isDifficultyUnlocked("hard", p)).toBe(false);
  });

  it("Daily completion does not unlock campaign difficulty", () => {
    // Daily never writes genesis* flags, so a daily-only profile stays Easy-only.
    const dailyOnly = { dailyStreak: 5, lastDailyDate: "2026-07-20" };
    expect(isDifficultyUnlocked("normal", dailyOnly)).toBe(false);
    expect(isDifficultyUnlocked("hard", dailyOnly)).toBe(false);
  });

  it("tutorial completion alone does not unlock Normal", () => {
    const p = { tutorialSeen: true };
    expect(isDifficultyUnlocked("normal", p)).toBe(false);
  });
});

describe("locked difficulty presentation", () => {
  it("exposes requirement text so locked modes stay visible with a reason", () => {
    expect(getUnlockRequirement("normal")).toMatch(/Complete Genesis on Easy/i);
    expect(getUnlockRequirement("hard")).toMatch(/Complete Genesis on Normal/i);
    expect(getUnlockRequirement("easy")).toBeNull();
  });
  it("keeps all three difficulties in a stable visible order", () => {
    expect(DIFFICULTY_ORDER).toEqual(["easy", "normal", "hard"]);
  });
});

describe("selection safety (Home fallback)", () => {
  it("a locked preference falls back to the highest unlocked mode", () => {
    expect(resolveSelectableDifficulty("hard", {})).toBe("easy");
    expect(resolveSelectableDifficulty("normal", {})).toBe("easy");
    expect(resolveSelectableDifficulty("hard", { genesisEasyCompleted: true })).toBe("normal");
  });
  it("keeps an unlocked preference as-is", () => {
    expect(resolveSelectableDifficulty("easy", {})).toBe("easy");
    expect(resolveSelectableDifficulty("hard", { genesisEasyCompleted: true, genesisNormalCompleted: true })).toBe("hard");
  });
  it("getHighestUnlockedDifficulty reflects progression", () => {
    expect(getHighestUnlockedDifficulty({})).toBe("easy");
    expect(getHighestUnlockedDifficulty({ genesisEasyCompleted: true })).toBe("normal");
    expect(getHighestUnlockedDifficulty({ genesisEasyCompleted: true, genesisNormalCompleted: true })).toBe("hard");
  });
});

describe("locked difficulty cannot start a run (guard predicate)", () => {
  it("startRun's guard predicate blocks locked modes", () => {
    // GameContext.startRun does: if (!isDifficultyUnlocked(difficulty, profile)) return;
    const p = {}; // new player
    expect(isDifficultyUnlocked("normal", p)).toBe(false); // → blocked
    expect(isDifficultyUnlocked("easy", p)).toBe(true); // → allowed
  });
});

describe("migration preserves existing progress", () => {
  it("infers Easy for a player who completed Genesis under old rules", () => {
    const migrated = migrateDifficultyProgress({ genesisCompleted: true });
    expect(migrated.genesisEasyCompleted).toBe(true);
    expect(isDifficultyUnlocked("normal", migrated)).toBe(true);
  });

  it("keeps Hard access for a player who had completed Normal (never relocks)", () => {
    const migrated = migrateDifficultyProgress({ genesisCompleted: true, genesisNormalCompleted: true });
    expect(migrated.genesisEasyCompleted).toBe(true);
    expect(isDifficultyUnlocked("hard", migrated)).toBe(true);
  });

  it("does not grant progression to a truly-new profile", () => {
    const migrated = migrateDifficultyProgress({});
    expect(migrated.genesisEasyCompleted).toBe(false);
    expect(migrated.genesisNormalCompleted).toBe(false);
    expect(migrated.genesisHardCompleted).toBe(false);
  });

  it("does not mutate the input profile", () => {
    const original = { genesisCompleted: true };
    migrateDifficultyProgress(original);
    expect(original.genesisEasyCompleted).toBeUndefined();
  });

  it("is idempotent (does not overwrite already-set flags)", () => {
    const once = migrateDifficultyProgress({ genesisEasyCompleted: true });
    const twice = migrateDifficultyProgress(once);
    expect(twice.genesisEasyCompleted).toBe(true);
  });
});

describe("developer / test override", () => {
  it("unlocks everything without touching leaderboard fields", () => {
    const dev = { developerUnlockAll: true };
    expect(isDifficultyUnlocked("easy", dev)).toBe(true);
    expect(isDifficultyUnlocked("normal", dev)).toBe(true);
    expect(isDifficultyUnlocked("hard", dev)).toBe(true);
    // The override is unlock-only; it introduces no competitive/leaderboard state.
    expect(dev.excluded).toBeUndefined();
    expect(dev.competitiveStatus).toBeUndefined();
  });
});

describe("Noah unlock difficulty", () => {
  it("unlocks on Normal or Hard, never Easy", () => {
    expect(unlocksNoah("easy")).toBe(false);
    expect(unlocksNoah("normal")).toBe(true);
    expect(unlocksNoah("hard")).toBe(true);
    expect(unlocksNoah("daily_standard")).toBe(false);
  });

  it("exposes accurate player-facing text (not the misleading 'Complete Genesis to unlock')", () => {
    expect(NOAH_UNLOCK_TEXT).toBe("Complete Genesis on Normal to unlock");
    expect(NOAH_UNLOCK_TEXT).not.toBe("Complete Genesis to unlock");
  });
});

describe("saved active run remains resumable regardless of unlock rules", () => {
  beforeEach(() => localStorage.clear());

  it("preserves a Normal saved run's difficulty even when the profile has it locked", async () => {
    const { saveStoryRun, loadStoryRun } = await import("@/game/storyRunSave");
    // Mid-run on Normal, but the player's profile would now compute Normal as locked.
    const run = { hero: { id: "adam" }, phase: "map", playerHp: 20, deck: ["sling_stone"], isDaily: false, difficulty: "normal" };
    saveStoryRun(run);
    const restored = loadStoryRun();
    expect(restored.difficulty).toBe("normal"); // resume uses the saved difficulty, not the lock rules
  });
});

describe("persistence of progression flags", () => {
  it("round-trips genesis completion flags through JSON (profile persistence)", () => {
    const profile = { genesisEasyCompleted: true, genesisNormalCompleted: true, genesisHardCompleted: false };
    const restored = JSON.parse(JSON.stringify(profile));
    expect(isDifficultyUnlocked("normal", restored)).toBe(true);
    expect(isDifficultyUnlocked("hard", restored)).toBe(true);
  });
});
