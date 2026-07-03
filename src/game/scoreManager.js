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
      id = "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return "p-unknown";
  }
}

/**
 * Deduplicate scores by playerId (fallback to playerName),
 * keeping only the highest score per player.
 */
export function deduplicateByPlayer(scores) {
  const byPlayer = new Map();
  for (const s of scores) {
    const key = s.playerId || s.playerName;
    const existing = byPlayer.get(key);
    if (!existing || s.score > existing.score) {
      byPlayer.set(key, s);
    }
  }
  return Array.from(byPlayer.values()).sort((a, b) => b.score - a.score);
}

/**
 * Submit a score to the cloud LeaderboardScore entity.
 * Deduplicates by playerId + mode + dailyChallengeId — only the best score is kept.
 * If the new score is lower than the existing best, the previous score is kept.
 * Returns { success: boolean, action?: string, error?: string }
 */
export async function submitBestScore(scoreData) {
  const playerId = getPlayerId();
  // Never submit invalid names to the leaderboard — sanitize first
  const safeName = sanitizePlayerName(scoreData.playerName);
  const payload = {
    playerName: safeName,
    playerId,
    score: scoreData.score,
    mode: scoreData.mode || "story",
    chapter: scoreData.chapter || "Genesis",
    hero: scoreData.hero || "Adam",
    difficulty: scoreData.difficulty || "normal",
    roomsCleared: scoreData.roomsCleared || 0,
    battlesWon: scoreData.battlesWon || 0,
    triviaCorrect: scoreData.triviaCorrect || 0,
    result: scoreData.result || "completed",
    dailyChallengeId: scoreData.dailyChallengeId || null,
  };

  try {
    // Query for existing score by same player for same category
    const query = { playerId, mode: payload.mode };
    if (payload.mode === "daily") {
      query.dailyChallengeId = payload.dailyChallengeId;
    }
    const existing = await base44.entities.LeaderboardScore.filter(query, "-score", 1);

    if (existing && existing.length > 0) {
      const prev = existing[0];
      if (payload.score > prev.score) {
        await base44.entities.LeaderboardScore.update(prev.id, {
          score: payload.score,
          playerName: payload.playerName,
          chapter: payload.chapter,
          hero: payload.hero,
          difficulty: payload.difficulty,
          roomsCleared: payload.roomsCleared,
          battlesWon: payload.battlesWon,
          triviaCorrect: payload.triviaCorrect,
          result: payload.result,
        });
        return { success: true, action: "updated" };
      }
      return { success: true, action: "kept_previous" };
    }

    await base44.entities.LeaderboardScore.create(payload);
    return { success: true, action: "created" };
  } catch (e) {
    return { success: false, error: e?.message || "Network error" };
  }
}

/**
 * Fetch leaderboard scores from cloud, deduplicated by player.
 * tab: "all" | "weekly" | "daily"
 */
export async function fetchLeaderboard(tab) {
  let results;
  if (tab === "daily") {
    const today = new Date().toISOString().slice(0, 10);
    results = await base44.entities.LeaderboardScore.filter(
      { mode: "daily", dailyChallengeId: today },
      "-score",
      100
    );
  } else {
    results = await base44.entities.LeaderboardScore.filter(
      { mode: "story" },
      "-score",
      100
    );
    if (tab === "weekly") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      results = (results || []).filter(
        (e) => new Date(e.created_date).getTime() > weekAgo
      );
    }
  }
  return deduplicateByPlayer(results || []);
}

/**
 * Get a player's rank on the daily leaderboard for a given challenge date.
 */
export async function getDailyRank(dailyChallengeId) {
  const playerId = getPlayerId();
  const scores = await base44.entities.LeaderboardScore.filter(
    { mode: "daily", dailyChallengeId },
    "-score",
    100
  );
  const deduped = deduplicateByPlayer(scores || []);
  const idx = deduped.findIndex((s) => s.playerId === playerId);
  return idx >= 0 ? idx + 1 : null;
}