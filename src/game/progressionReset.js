// Canonical gameplay-progress reset infrastructure.
//
// createDefaultGameplayProgress() is the single source of truth for what a
// brand-new Genesis journey's *gameplay* fields look like — GameContext's
// loadProfile() fallback (used when there's no stored profile, or it fails
// to parse) spreads this in for new players, and resetGameplayProgress()
// spreads it in for an existing player who chooses "Reset Game Progress" in
// Settings. Both paths read the exact same values, so a fresh install and a
// player-initiated reset always produce an identical starting point.
//
// Deliberately excluded from this "gameplay" set (see resetGameplayProgress
// below for the full account/preference-preservation list): settings,
// playerName, accountPromptSeen, leaderboardNamePromptSeen,
// developerUnlockAll, progressionVersion. Those are account identity or
// preferences, not progress, and a reset must never touch them.
import { STARTER_DECK, STARTER_COLLECTION } from "@/game/deckRules";

// Bump this only in a future release that intentionally wants to give every
// existing profile a fair, one-time global progress reset (e.g. a major
// economy rebalance). Until then it must stay at its current value — see
// needsVersionReset()/resetForVersion() below. Raising it is a deliberate,
// separate decision from anything in this task: this task adds the
// infrastructure and migrates existing profiles onto CURRENT_PROGRESSION_VERSION
// WITHOUT resetting anyone.
export const CURRENT_PROGRESSION_VERSION = 1;

// Prepared for a future versioned global reset — intentionally not rendered
// or referenced by any UI yet. See resetForVersion()/needsVersionReset().
export const NEW_JOURNEY_MESSAGE = "A NEW JOURNEY BEGINS";
export const NEW_JOURNEY_BODY =
  "Chronicles of Faith has received a major progression and economy update. " +
  "To keep competition fair, gameplay progress has been reset. Your account " +
  "preferences remain unchanged.";

// Shown once after a successful player-initiated reset (Settings > Danger Zone).
export const POST_RESET_MESSAGE = "Your journey has been reset.";

// Typed-confirmation word required in the Settings reset modal. Trimmed,
// case-sensitive exact match — no "yes/no" shortcut, no hold gesture.
export const RESET_CONFIRMATION_WORD = "RESET";

// The exact set of fields a fresh Genesis journey starts with. Values match
// GameContext.jsx's pre-existing loadProfile() fallback literal — nothing
// here is invented; it's read from and now shared with that fallback.
export function createDefaultGameplayProgress() {
  return {
    unlockedHeroes: ["adam"],
    cardCollection: { ...STARTER_COLLECTION },
    cardFragments: {},
    faithShards: 0,
    activeDeck: [...STARTER_DECK],
    collectedCards: Object.keys(STARTER_COLLECTION),
    achievements: [],
    dailyStreak: 0,
    lastDailyDate: null,
    devotionStreak: 0,
    devotionReadDate: null,
    introSeen: false,
    battlesUnscathed: 0,
    difficulty: "easy",
    gold: 0,
    tutorialSeen: false,
    genesisCompleted: false,
    genesisEasyCompleted: false,
    genesisNormalCompleted: false,
    genesisHardCompleted: false,
    encounteredEnemies: [],
    defeatedEnemies: [],
  };
}

// Reset one profile's gameplay progress back to a fresh journey, preserving
// account identity and preferences:
//   - playerName, settings.* (audio/narration/accessibility/battle prefs)
//   - accountPromptSeen, leaderboardNamePromptSeen — these gate one-time
//     identity prompts; since playerName is preserved, re-showing them would
//     just re-annoy a returning player over a decision that already stands.
//   - developerUnlockAll — a device/test override, not player progress.
//   - progressionVersion — reset always brings a profile up to the current
//     version (see resetForVersion), it never rolls it back.
//
// Pure function: returns a new object, never mutates its argument.
export function resetGameplayProgress(profile = {}) {
  return {
    ...profile,
    ...createDefaultGameplayProgress(),
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    lastProgressResetAt: Date.now(),
    progressResetGeneration: (profile.progressResetGeneration || 0) + 1,
  };
}

// Versioned global-reset infrastructure — INACTIVE while
// CURRENT_PROGRESSION_VERSION stays at its present value. A profile missing
// progressionVersion (every existing profile today) is migrated up to
// CURRENT_PROGRESSION_VERSION in GameContext's loadProfile() WITHOUT calling
// this — silent migration, no wipe. This only starts returning true the
// release after CURRENT_PROGRESSION_VERSION is intentionally bumped above a
// profile's stored value.
export function needsVersionReset(profile = {}) {
  const version = profile.progressionVersion;
  if (typeof version !== "number") return false;
  return version < CURRENT_PROGRESSION_VERSION;
}

// Reuses the same reset used by the player-facing Settings flow — a future
// version-triggered reset is just resetGameplayProgress plus the
// NEW_JOURNEY_MESSAGE banner (not wired to any UI yet).
export function resetForVersion(profile = {}) {
  return resetGameplayProgress(profile);
}
