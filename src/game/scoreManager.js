import { base44 } from "@/api/base44Client";
import { sanitizePlayerName } from "@/game/nameValidator";

const PLAYER_ID_KEY = "cof_player_id";

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

      if (payload.score > Number(previous.score || 0)) {
        await base44.entities.LeaderboardScore.update(previous.id, {
          ...payload,
          playerId,
        });

        return {
          success: true,
          action: "updated",
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
        };
      }

      return {
        success: true,
        action: "kept_previous",
      };
    }

    await base44.entities.LeaderboardScore.create(payload);

    return {
      success: true,
      action: "created",
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Network error",
    };
  }
}

/**
 * Every completed story run is submitted independently to:
 *
 * 1. All Time — highest score ever.
 * 2. This Week — highest score during the current week.
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

  return {
    success: allTimeResult.success && weeklyResult.success,
    allTimeResult,
    weeklyResult,
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
