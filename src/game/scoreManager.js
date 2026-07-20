import { base44 } from "@/api/base44Client";
import { sanitizePlayerName } from "@/game/nameValidator";

const PLAYER_ID_KEY = "cof_player_id";

/**
 * Daily Challenge scoring — pure function, no side effects.
 *
 * Victory: +500
 * HP remaining: +10 per HP
 * Turns used: -25 per turn
 * Correct trivia: +100
 * Perfect battle (no HP lost): +100
 * Defeat: 0
 * Cards played: always worth 0 points (no card-spam scoring)
 *
 * @param {{result?: string, playerHp?: number, maxPlayerHp?: number, turns?: number, triviaCorrect?: boolean}} params
 */
export function calculateDailyScore(params = {}) {
  const {
    result,
    playerHp = 0,
    maxPlayerHp = 0,
    turns = 0,
    triviaCorrect = false,
  } = params;
  if (result !== "victory") {
    return {
      victoryBonus: 0,
      hpBonus: 0,
      turnPenalty: 0,
      triviaBonus: 0,
      perfectBonus: 0,
      finalScore: 0,
    };
  }

  const victoryBonus = 500;
  const hpBonus = Math.max(0, playerHp) * 10;
  const turnPenalty = Math.max(0, turns) * 25;
  const triviaBonus = triviaCorrect ? 100 : 0;
  const perfectBonus = playerHp >= maxPlayerHp ? 100 : 0;

  const finalScore = Math.max(
    0,
    victoryBonus + hpBonus - turnPenalty + triviaBonus + perfectBonus
  );

  return { victoryBonus, hpBonus, turnPenalty, triviaBonus, perfectBonus, finalScore };
}

/**
 * Get or create a stable playerId stored in localStorage.
 * No login required — this identifies the browser/device.
 */
export function getPlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);

    if (!id) {
      id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(PLAYER_ID_KEY, id);
    }

    return id;
  } catch {
    return "p-unknown";
  }
}

/**
 * Return the Monday date for the current UTC week.
 * Example: "2026-07-13".
 */
export function getCurrentWeekId(date = new Date()) {
  const weekStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  const day = weekStart.getUTCDay() || 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - day + 1);

  return weekStart.toISOString().slice(0, 10);
}

function normalizePlayerName(name) {
  return sanitizePlayerName(name)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Keep only the highest score for each visible player name.
 * playerId is used as a fallback for anonymous players.
 */
export function deduplicateByPlayer(scores) {
  const bestByPlayer = new Map();

  for (const scoreEntry of scores) {
    const normalizedName = normalizePlayerName(scoreEntry.playerName);

    const key =
      normalizedName && normalizedName !== "anonymous pilgrim"
        ? normalizedName
        : scoreEntry.playerId || scoreEntry.id;

    const existing = bestByPlayer.get(key);

    if (
      !existing ||
      Number(scoreEntry.score || 0) > Number(existing.score || 0)
    ) {
      bestByPlayer.set(key, scoreEntry);
    }
  }

  return Array.from(bestByPlayer.values()).sort(
    (a, b) => Number(b.score || 0) - Number(a.score || 0)
  );
}

function buildCategoryQuery(payload, playerField, playerValue) {
  const query = {
    [playerField]: playerValue,
    mode: payload.mode,
  };

  if (payload.mode === "daily") {
    query.dailyChallengeId = payload.dailyChallengeId;
  }

  // Season-aware fields are additive and opt-in: existing callers never set
  // them, so this branch never fires for story/daily/weekly submissions and
  // their query shape is unchanged. See seasonManager.js.
  if (payload.leaderboardPeriod) {
    query.leaderboardPeriod = payload.leaderboardPeriod;
  }
  if (payload.seasonId) {
    query.seasonId = payload.seasonId;
  }

  return query;
}

/**
 * Submit one leaderboard category.
 *
 * Story mode stores the player's all-time best.
 * Weekly story scores use a reserved weekly challenge key.
 * Daily mode stores the player's best Daily Battle score for that date.
 */
export async function submitBestScore(scoreData) {
  const playerId = getPlayerId();
  const safeName = sanitizePlayerName(scoreData.playerName);

  const payload = {
    playerName: safeName,
    playerId,
    score: Number(scoreData.score || 0),
    mode: scoreData.mode || "story",
    chapter: scoreData.chapter || "Genesis",
    hero: scoreData.hero || "Adam",
    difficulty: scoreData.difficulty || "normal",
    roomsCleared: scoreData.roomsCleared || 0,
    battlesWon: scoreData.battlesWon || 0,
    triviaCorrect: scoreData.triviaCorrect || 0,
    result: scoreData.result || "completed",
    dailyChallengeId: scoreData.dailyChallengeId || null,
    retriesUsed: scoreData.retriesUsed || 0,
    scorePenalty: scoreData.scorePenalty || 0,
    // Optional season fields — only included when the caller provides them
    // (seasonManager.js), so existing story/daily/weekly payloads are
    // byte-for-byte unchanged.
    ...(scoreData.leaderboardPeriod ? { leaderboardPeriod: scoreData.leaderboardPeriod } : {}),
    ...(scoreData.seasonId ? { seasonId: scoreData.seasonId } : {}),
    ...(scoreData.seasonName ? { seasonName: scoreData.seasonName } : {}),
    ...(scoreData.periodId ? { periodId: scoreData.periodId } : {}),
    ...(scoreData.gameVersion ? { gameVersion: scoreData.gameVersion } : {}),
  };

  try {
    let existing = await base44.entities.LeaderboardScore.filter(
      buildCategoryQuery(payload, "playerId", playerId),
      "-score",
      1
    );

    // Reuse the visible player name when local storage was cleared,
    // the app was reinstalled, or the player used another device.
    if (
      (!existing || existing.length === 0) &&
      safeName !== "Anonymous Pilgrim"
    ) {
      existing = await base44.entities.LeaderboardScore.filter(
        buildCategoryQuery(payload, "playerName", safeName),
        "-score",
        1
      );
    }

    if (existing && existing.length > 0) {
      const previous = existing[0];
      const previousScore = Number(previous.score || 0);

      if (payload.score > previousScore) {
        await base44.entities.LeaderboardScore.update(previous.id, {
          ...payload,
          playerId,
        });

        return {
          success: true,
          action: "updated",
          previousScore,
          bestScore: payload.score,
          isNewBest: true,
        };
      }

      if (
        safeName !== "Anonymous Pilgrim" &&
        previous.playerName !== safeName
      ) {
        await base44.entities.LeaderboardScore.update(previous.id, {
          playerName: safeName,
          playerId,
        });

        return {
          success: true,
          action: "named",
          previousScore,
          bestScore: previousScore,
          isNewBest: false,
        };
      }

      return {
        success: true,
        action: "kept_previous",
        previousScore,
        bestScore: previousScore,
        isNewBest: false,
      };
    }

    await base44.entities.LeaderboardScore.create(payload);

    return {
      success: true,
      action: "created",
      previousScore: null,
      bestScore: payload.score,
      isNewBest: true,
    };
  } catch (error) {
    // Never swallow this silently — a failed create/update here is exactly
    // why a category can go missing from the leaderboard with no visible
    // trace. The caller still gets a graceful {success:false} to render,
    // but the failure is always visible in the console for debugging.
    console.error("[scoreManager] LeaderboardScore submission failed", {
      mode: payload.mode,
      dailyChallengeId: payload.dailyChallengeId,
      error,
    });
    return {
      success: false,
      error: error?.message || "Network error",
    };
  }
}

/**
 * Every completed story run is submitted independently to two categories:
 *
 * 1. All Time (mode: "story") — one row per player, the highest score ever.
 *    A lower score never overwrites it.
 * 2. This Week (mode: "daily", dailyChallengeId: "weekly-<mondayDate>") —
 *    one row per player, the highest score during the current calendar
 *    week (UTC, resets Monday). Reuses the "daily" mode + dailyChallengeId
 *    pair because the LeaderboardScore entity's `mode` field is a fixed
 *    enum of only "story"/"daily" (see base44/entities/LeaderboardScore.jsonc)
 *    — there is no third "weekly" mode value available. The "weekly-"
 *    prefix can never collide with a real daily challenge id (those are
 *    always plain "YYYY-MM-DD"), so this filter is unambiguous as long as
 *    submission and retrieval both call getCurrentWeekId() to build it,
 *    which they do (see fetchLeaderboard below).
 *
 * Both submissions are independently awaited (Promise.all over two calls
 * that each catch their own errors) so a failure in one category can never
 * prevent or mask the result of the other.
 */
export async function submitStoryScores(scoreData) {
  const weekId = getCurrentWeekId();

  const [allTimeResult, weeklyResult] = await Promise.all([
    submitBestScore({
      ...scoreData,
      mode: "story",
    }),

    submitBestScore({
      ...scoreData,
      mode: "daily",
      dailyChallengeId: `weekly-${weekId}`,
    }),
  ]);

  if (!allTimeResult.success || !weeklyResult.success) {
    console.error("[scoreManager] submitStoryScores had a partial or full failure", {
      weekId,
      allTimeResult,
      weeklyResult,
    });
  }

  return {
    success: allTimeResult.success && weeklyResult.success,
    allTimeResult,
    weeklyResult,
    weekId,
    error: allTimeResult.error || weeklyResult.error,
  };
}

/**
 * Fetch leaderboard scores from the cloud.
 *
 * tab: "all" | "weekly" | "daily"
 */
export async function fetchLeaderboard(tab) {
  let results = [];

  if (tab === "daily") {
    const today = new Date().toISOString().slice(0, 10);

    results = await base44.entities.LeaderboardScore.filter(
      {
        mode: "daily",
        dailyChallengeId: today,
      },
      "-score",
      100
    );
  } else if (tab === "weekly") {
    results = await base44.entities.LeaderboardScore.filter(
      {
        mode: "daily",
        dailyChallengeId: `weekly-${getCurrentWeekId()}`,
      },
      "-score",
      100
    );
  } else {
    results = await base44.entities.LeaderboardScore.filter(
      {
        mode: "story",
      },
      "-score",
      100
    );
  }

  return deduplicateByPlayer(results || []);
}

/**
 * Get the current player's Daily Battle rank.
 */
export async function getDailyRank(dailyChallengeId) {
  const playerId = getPlayerId();

  const scores = await base44.entities.LeaderboardScore.filter(
    {
      mode: "daily",
      dailyChallengeId,
    },
    "-score",
    100
  );

  const deduped = deduplicateByPlayer(scores || []);

  const index = deduped.findIndex(
    (score) => score.playerId === playerId
  );

  return index >= 0 ? index + 1 : null;
}
