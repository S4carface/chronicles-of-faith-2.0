// Story Mode run save/resume system.
// Only Story Mode runs are saved — Daily Challenge is never persisted mid-run.
// Uses localStorage now; structured so it can later move to cloud storage.

const STORY_RUN_KEY = "chronicles_of_faith_saved_story_run";
const OLD_RUN_KEY = "chronicles_of_faith_run_v1";

const TERMINAL_PHASES = ["victory", "dailyResult"];
// "defeat" is terminal (non-restorable) only for Hard mode; Easy/Normal allow retry.

/**
 * Validate that a saved run object has the essential fields to be restorable.
 * Returns true if the save is valid, false otherwise.
 */
export function validateSavedRun(saveData) {
  if (!saveData || typeof saveData !== "object") return false;
  if (saveData.isDaily) return false; // Never restore daily runs
  if (TERMINAL_PHASES.includes(saveData.phase)) return false;
  // Hard defeat is terminal — run is lost. Easy/Normal defeat is restorable (retry available).
  if (saveData.phase === "defeat" && saveData.difficulty === "hard") return false;
  if (!saveData.hero) return false;
  if (!saveData.phase) return false;
  if (typeof saveData.playerHp !== "number") return false;
  if (!Array.isArray(saveData.deck)) return false;
  return true;
}

/**
 * Save a story run to localStorage.
 * Silently skips daily runs and terminal-phase runs (clears save instead).
 */
export function saveStoryRun(runState) {
  try {
    if (!runState) return;
    if (runState.isDaily) return; // Never save daily runs
    if (TERMINAL_PHASES.includes(runState.phase)) {
      clearStoryRun();
      return;
    }
    const savePayload = { ...runState, savedAt: Date.now() };
    localStorage.setItem(STORY_RUN_KEY, JSON.stringify(savePayload));
    // Clean up old key from previous version
    try { localStorage.removeItem(OLD_RUN_KEY); } catch (e) {}
  } catch (e) {
    // If save fails (e.g. quota exceeded), clear to avoid corruption
    try { localStorage.removeItem(STORY_RUN_KEY); } catch (e2) {}
  }
}

/**
 * Load and validate a saved story run.
 * Handles migration from the old run storage key.
 * Returns the run object, or null if no valid save exists.
 * Corrupted saves are automatically deleted.
 */
export function loadStoryRun() {
  try {
    const raw = localStorage.getItem(STORY_RUN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!validateSavedRun(parsed)) {
        clearStoryRun();
        return null;
      }
      return parsed;
    }
    // Migration: check old key from previous version
    const oldRaw = localStorage.getItem(OLD_RUN_KEY);
    if (oldRaw) {
      try {
        const parsed = JSON.parse(oldRaw);
        if (validateSavedRun(parsed)) {
          localStorage.setItem(STORY_RUN_KEY, JSON.stringify({ ...parsed, savedAt: Date.now() }));
          return parsed;
        }
      } catch (e) {}
      try { localStorage.removeItem(OLD_RUN_KEY); } catch (e2) {}
    }
  } catch (e) {
    clearStoryRun();
  }
  return null;
}

/**
 * Delete the saved story run from localStorage.
 */
export function clearStoryRun() {
  try {
    localStorage.removeItem(STORY_RUN_KEY);
  } catch (e) {}
  try { localStorage.removeItem(OLD_RUN_KEY); } catch (e) {}
}

/**
 * Check if a valid saved story run exists.
 * Returns true if a restorable save is present.
 */
export function hasSavedStoryRun() {
  return loadStoryRun() !== null;
}