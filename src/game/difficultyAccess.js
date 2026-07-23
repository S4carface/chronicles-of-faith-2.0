// Campaign difficulty progression — single source of truth for which Genesis
// difficulties a profile has unlocked, the requirement text for locked ones, and
// safe selection/fallback + migration. Pure and dependency-free (trivially
// testable); no component/state coupling.
//
// Rules:
//   Easy   — always unlocked
//   Normal — unlocked by a completed Easy Genesis victory (genesisEasyCompleted)
//   Hard   — unlocked by a completed Normal Genesis victory (genesisNormalCompleted)
//
// Losses, abandoned runs, Daily Challenge, and tutorial completion never unlock
// the next mode (they never set these flags — see VictoryScreen for the only
// writer). Developer/test accounts may carry profile.developerUnlockAll to keep
// full access; this is separate from — and never affects — leaderboard exclusion.

export const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

export function isDifficultyUnlocked(difficulty, profile = {}) {
  if (!difficulty) return false;
  if (profile && profile.developerUnlockAll === true) return true; // dev/test override
  switch (difficulty) {
    case "easy":
      return true;
    case "normal":
      return !!(profile && profile.genesisEasyCompleted);
    case "hard":
      return !!(profile && profile.genesisNormalCompleted);
    default:
      return false;
  }
}

// Noah unlocks only after completing Genesis on Normal (or the harder Hard) —
// never from Easy, the tutorial, or Daily. (Enforced in completeRoom.)
export function unlocksNoah(difficulty) {
  return difficulty === "normal" || difficulty === "hard";
}

// Player-facing copy for Noah's lock state. Distinct from getUnlockRequirement
// above: Noah specifically needs a Normal (or Hard) clear, not "Complete
// Genesis" on any difficulty, so the generic per-difficulty text doesn't apply.
export const NOAH_UNLOCK_TEXT = "Complete Genesis on Normal to unlock";

// Requirement copy for a locked difficulty (null when it has no gate).
export function getUnlockRequirement(difficulty) {
  if (difficulty === "normal") return "Complete Genesis on Easy to unlock.";
  if (difficulty === "hard") return "Complete Genesis on Normal to unlock.";
  return null;
}

// The highest currently-unlocked difficulty (used as a safe fallback).
export function getHighestUnlockedDifficulty(profile = {}) {
  if (isDifficultyUnlocked("hard", profile)) return "hard";
  if (isDifficultyUnlocked("normal", profile)) return "normal";
  return "easy";
}

// Clamp a preferred difficulty to one that's actually unlocked. If the preferred
// mode is locked (e.g. a stored preference after migration), fall back to the
// highest unlocked mode.
export function resolveSelectableDifficulty(preferred, profile = {}) {
  return isDifficultyUnlocked(preferred, profile)
    ? preferred
    : getHighestUnlockedDifficulty(profile);
}

// Backfill the tiered progression flags for existing players without relocking
// proven progress. genesisEasyCompleted is new: any prior Genesis completion
// (genesisCompleted was set on the first clear at ANY difficulty, and
// genesisNormalCompleted on a Normal/Hard clear) proves Easy-tier capability, so
// we infer it true. Returns a new object; does not mutate the input.
export function migrateDifficultyProgress(profile = {}) {
  const p = { ...profile };
  if (p.genesisEasyCompleted === undefined) {
    p.genesisEasyCompleted =
      !!p.genesisCompleted || !!p.genesisNormalCompleted || !!p.genesisHardCompleted;
  }
  if (p.genesisNormalCompleted === undefined) p.genesisNormalCompleted = false;
  if (p.genesisHardCompleted === undefined) p.genesisHardCompleted = false;
  return p;
}
