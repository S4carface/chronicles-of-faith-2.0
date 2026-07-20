// Leaderboard seasons — centralized season config, submission, and fetch
// helpers, plus the protected admin season-transition flow.
//
// Design notes:
// - scoreManager.js's existing submitBestScore/fetchLeaderboard/getCurrentWeekId
//   stay untouched in their tested "story"/"daily"/"weekly" behavior. This file
//   only ADDS optional fields (leaderboardPeriod, seasonId, seasonName,
//   periodId, gameVersion) to submitBestScore's payload/query — every existing
//   caller omits them, so their behavior is byte-for-byte unchanged.
// - "Current Season" reuses mode:"story" (the old All Time bucket) plus a new
//   leaderboardPeriod:"season" + seasonId tag. Records written before this
//   feature existed have neither field set, so they never match a season
//   query — they become the implicit "Early Access Season 1" legacy bucket
//   with zero migration/mutation of existing rows required. This is the
//   "safe compatibility layer" the spec calls for when direct schema
//   backfills aren't practical.
// - "This Week" is left completely untouched (same mode:"daily" +
//   dailyChallengeId:"weekly-<mondayId>" trick as before) — submitWeeklyBestScore
//   is a thin, behavior-preserving wrapper around the existing mechanism.
import { base44 } from "@/api/base44Client";
import {
  submitBestScore,
  fetchLeaderboard,
  getCurrentWeekId,
  deduplicateByPlayer,
} from "@/game/scoreManager";

export const DEFAULT_ACTIVE_SEASON = {
  id: "early-access-season-2",
  name: "Early Access Season 2",
  startedAt: "2026-07-20",
  gameVersion: "2.0",
};

// The implicit legacy bucket every pre-season LeaderboardScore row belongs
// to. It never gets a real LeaderboardSeason entity row of its own — it's
// defined purely by the *absence* of a leaderboardPeriod/seasonId tag.
export const LEGACY_SEASON_1 = {
  id: "early-access-season-1",
  name: "Early Access Season 1",
  status: "archived",
};

/**
 * The currently active season, read from the LeaderboardSeason entity.
 * Falls back to DEFAULT_ACTIVE_SEASON (no entity row yet, or the query
 * failed) so gameplay never breaks even before an admin has ever touched
 * season management. `_entityId` is null when running on the fallback.
 */
export async function getActiveSeason() {
  try {
    const rows = await base44.entities.LeaderboardSeason.filter(
      { status: "active" },
      "-startedAt",
      5
    );
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        id: row.seasonId,
        name: row.seasonName,
        startedAt: row.startedAt,
        gameVersion: row.gameVersion,
        _entityId: row.id,
      };
    }
  } catch (error) {
    console.error("[seasonManager] getActiveSeason: falling back to default season", error);
  }
  return { ...DEFAULT_ACTIVE_SEASON, _entityId: null };
}

export { getCurrentWeekId };

/**
 * Submit the player's Current Season best. One row per player per season —
 * a lower score never replaces it. Creates the season record if none exists.
 */
export async function submitSeasonBestScore(scoreData, activeSeason) {
  const season = activeSeason || (await getActiveSeason());
  return submitBestScore({
    ...scoreData,
    mode: "story",
    leaderboardPeriod: "season",
    seasonId: season.id,
    seasonName: season.name,
    periodId: season.id,
    gameVersion: season.gameVersion || DEFAULT_ACTIVE_SEASON.gameVersion,
  });
}

/**
 * Submit the player's This Week best. Identical mechanism to the pre-season
 * implementation — untouched on purpose so existing weekly data and behavior
 * survive this feature unmodified.
 */
export async function submitWeeklyBestScore(scoreData) {
  const weekId = getCurrentWeekId();
  return submitBestScore({
    ...scoreData,
    mode: "daily",
    dailyChallengeId: `weekly-${weekId}`,
  });
}

/**
 * Every completed Genesis run submits independently to Current Season and
 * This Week (Promise.all — a failure in one never blocks or hides the other).
 */
export async function submitGenesisScores(scoreData) {
  const activeSeason = await getActiveSeason();
  const weekId = getCurrentWeekId();

  const [seasonResult, weeklyResult] = await Promise.all([
    submitSeasonBestScore(scoreData, activeSeason),
    submitWeeklyBestScore(scoreData),
  ]);

  if (!seasonResult.success || !weeklyResult.success) {
    console.error("[seasonManager] submitGenesisScores had a partial or full failure", {
      activeSeason,
      weekId,
      seasonResult,
      weeklyResult,
    });
  }

  return {
    success: seasonResult.success && weeklyResult.success,
    seasonResult,
    weeklyResult,
    activeSeason,
    weekId,
    error: seasonResult.error || weeklyResult.error,
  };
}

/** Best-effort count of Current Season rows for a given seasonId — used for
 * both the admin confirmation-dialog preview and the audit log entry. */
export async function estimateSeasonRecordCount(seasonId) {
  try {
    const rows = await base44.entities.LeaderboardScore.filter(
      { mode: "story", leaderboardPeriod: "season", seasonId },
      "-score",
      1000
    );
    return (rows || []).length;
  } catch (error) {
    console.error("[seasonManager] estimateSeasonRecordCount failed", error);
    return null;
  }
}

export async function fetchCurrentSeasonLeaderboard(activeSeason) {
  const season = activeSeason || (await getActiveSeason());
  const rows = await base44.entities.LeaderboardScore.filter(
    { mode: "story", leaderboardPeriod: "season", seasonId: season.id },
    "-score",
    100
  );
  return deduplicateByPlayer(rows || []);
}

// This Week is unaffected by seasons — same data, same query, same shape.
export async function fetchWeeklyLeaderboard() {
  return fetchLeaderboard("weekly");
}

/**
 * Known legacy (archived) seasons. Early Access Season 1 always appears —
 * it's the implicit pre-season bucket and never has its own entity row.
 * Any season archived later via startNewSeason() is also included.
 */
export async function fetchLegacySeasons() {
  const seasons = [{ ...LEGACY_SEASON_1 }];
  try {
    const archivedRows = await base44.entities.LeaderboardSeason.filter(
      { status: "archived" },
      "-startedAt",
      50
    );
    for (const row of archivedRows || []) {
      if (!seasons.some((s) => s.id === row.seasonId)) {
        seasons.push({
          id: row.seasonId,
          name: row.seasonName,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          gameVersion: row.gameVersion,
          status: "archived",
        });
      }
    }
  } catch (error) {
    console.error("[seasonManager] fetchLegacySeasons: could not load archived seasons", error);
  }
  return seasons;
}

/**
 * Read-only legacy leaderboard for a given archived season. For
 * Early Access Season 1 this is every mode:"story" row that was never
 * tagged with a leaderboardPeriod — i.e. everything written before seasons
 * existed. For any later archived season it's rows explicitly tagged with
 * that seasonId.
 */
export async function fetchLegacyLeaderboard(seasonId) {
  const allStoryRows = await base44.entities.LeaderboardScore.filter(
    { mode: "story" },
    "-score",
    500
  );

  const rows = (allStoryRows || []).filter((row) => {
    if (row.leaderboardPeriod === "season") {
      return row.seasonId === seasonId;
    }
    return seasonId === LEGACY_SEASON_1.id;
  });

  return deduplicateByPlayer(rows);
}

const SEASON_ACK_KEY_PREFIX = "chronicles_of_faith_season_ack_";

/** Has this device already dismissed the new-season announcement? */
export function hasAcknowledgedSeason(seasonId) {
  try {
    return localStorage.getItem(SEASON_ACK_KEY_PREFIX + seasonId) === "true";
  } catch {
    return true; // fail safe — never block the UI on a storage error
  }
}

export function acknowledgeSeason(seasonId) {
  try {
    localStorage.setItem(SEASON_ACK_KEY_PREFIX + seasonId, "true");
  } catch {
    // Best-effort only; the announcement simply reappears next visit.
  }
}

/**
 * Owner-only season transition. Archives the current active season (creating
 * a retroactive archived row for it if it only ever existed as the static
 * default) and activates a brand-new one. Never deletes a LeaderboardScore
 * row — Current Season vs Legacy is decided entirely by which seasonId is
 * "active" at read time, so old data simply becomes legacy the moment a
 * newer season takes over.
 *
 * Call-site (the admin UI) is responsible for verifying the caller is an
 * authenticated admin before invoking this — see AdminSeasons.jsx.
 */
export async function startNewSeason({
  newSeasonId,
  newSeasonName,
  reason,
  gameVersion,
  startDate,
  adminEmail,
}) {
  const trimmedId = (newSeasonId || "").trim();
  const trimmedName = (newSeasonName || "").trim();

  if (!trimmedId) {
    return { success: false, error: "Season ID is required." };
  }
  if (!trimmedName) {
    return { success: false, error: "Season name is required." };
  }
  if (!adminEmail) {
    return { success: false, error: "Admin identity is required." };
  }

  try {
    const existingWithId = await base44.entities.LeaderboardSeason.filter({ seasonId: trimmedId });
    if (existingWithId && existingWithId.length > 0) {
      return { success: false, error: `A season with ID "${trimmedId}" already exists.` };
    }

    const current = await getActiveSeason();
    if (current.id === trimmedId) {
      return { success: false, error: "New season ID must differ from the current active season." };
    }

    const recordsAffectedEstimate = (await estimateSeasonRecordCount(current.id)) || 0;

    // Archive every currently-active row defensively (there should only
    // ever be one, but this also self-heals a prior partial failure).
    const activeRows = await base44.entities.LeaderboardSeason.filter({ status: "active" });
    const endedAt = new Date().toISOString();
    for (const row of activeRows || []) {
      await base44.entities.LeaderboardSeason.update(row.id, { status: "archived", endedAt });
    }

    // The outgoing season may only have ever existed as the static
    // fallback (no entity row) — give it a real archived record now.
    if ((!activeRows || activeRows.length === 0) && current.id) {
      await base44.entities.LeaderboardSeason.create({
        seasonId: current.id,
        seasonName: current.name,
        status: "archived",
        startedAt: current.startedAt,
        gameVersion: current.gameVersion,
        endedAt,
      });
    }

    const created = await base44.entities.LeaderboardSeason.create({
      seasonId: trimmedId,
      seasonName: trimmedName,
      status: "active",
      startedAt: startDate || endedAt,
      gameVersion: gameVersion || DEFAULT_ACTIVE_SEASON.gameVersion,
      createdBy: adminEmail,
    });

    await base44.entities.SeasonAuditLog.create({
      adminEmail,
      oldSeasonId: current.id,
      newSeasonId: trimmedId,
      reason: reason || "",
      gameVersion: gameVersion || DEFAULT_ACTIVE_SEASON.gameVersion,
      recordsAffectedEstimate,
    });

    return {
      success: true,
      oldSeasonId: current.id,
      newSeason: { id: trimmedId, name: trimmedName },
      recordsAffectedEstimate,
      entity: created,
    };
  } catch (error) {
    console.error("[seasonManager] startNewSeason failed", error);
    return {
      success: false,
      error:
        error?.message ||
        "Season transition failed partway through. Check the admin panel before retrying — no scores were deleted.",
    };
  }
}
