// Developer/test account exclusion — keeps internal testing scores out of
// public competitive leaderboards without deleting them, without touching
// scoring/progression, and without any client-side-only gate.
//
// Identity source: the authenticated Base44 session (base44.auth.me()) —
// the same real, server-verified signal already used for admin gating in
// seasonManager.js/AdminSeasons.jsx. A player's stable identity here is
// their Base44 account email (falling back to their Base44 user id), never
// the local device playerId/playerName used by scoreManager.js for
// leaderboard rows, and never anything client-editable.
//
// requiresAuth:false means most players are anonymous and never touch this
// path at all — base44.auth.me() rejects for them, which this module
// treats as a normal "guest" (not a developer), never a lookup failure.
import { base44 } from "@/api/base44Client";

export const ACCOUNT_STATUS = {
  NORMAL: "normal",
  DEVELOPER: "developer",
  GUEST: "guest",
  LOOKUP_FAILED: "lookup_failed",
};

function resolveAccountId(user) {
  return user?.email || user?.id || null;
}

/**
 * Resolve the current session's competitive-eligibility status.
 *
 * Fail-safe contract:
 * - An anonymous/unauthenticated session (the common case) resolves to
 *   GUEST, not an error.
 * - Any failure resolving identity or reading the DeveloperAccount list
 *   resolves to LOOKUP_FAILED and is logged clearly — it never gets
 *   silently treated as DEVELOPER. Normal gameplay/submission continues.
 * - Only an explicit, matching, excluded=true DeveloperAccount row ever
 *   produces DEVELOPER.
 */
export async function getCompetitiveAccountStatus() {
  let user;
  try {
    user = await base44.auth.me();
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return { status: ACCOUNT_STATUS.GUEST, accountId: null };
    }
    console.error("[devAccountManager] Identity lookup failed — treating as normal player.", error);
    return { status: ACCOUNT_STATUS.LOOKUP_FAILED, accountId: null, error };
  }

  const accountId = resolveAccountId(user);
  if (!accountId) {
    return { status: ACCOUNT_STATUS.GUEST, accountId: null };
  }

  try {
    const rows = await base44.entities.DeveloperAccount.filter({ accountId, excluded: true });
    if (rows && rows.length > 0) {
      return { status: ACCOUNT_STATUS.DEVELOPER, accountId, reason: rows[0].reason || "developer_account" };
    }
    return { status: ACCOUNT_STATUS.NORMAL, accountId };
  } catch (error) {
    console.error("[devAccountManager] DeveloperAccount lookup failed — treating as normal player.", error);
    return { status: ACCOUNT_STATUS.LOOKUP_FAILED, accountId, error };
  }
}

export async function isDeveloperAccount() {
  const { status } = await getCompetitiveAccountStatus();
  return status === ACCOUNT_STATUS.DEVELOPER;
}

/**
 * Whether the current session may submit a score to a public leaderboard.
 * Everything except an explicitly-excluded developer account is eligible —
 * GUEST, NORMAL, and LOOKUP_FAILED all return true, per the fail-safe rule.
 */
export async function canSubmitPublicScore() {
  const { status } = await getCompetitiveAccountStatus();
  return status !== ACCOUNT_STATUS.DEVELOPER;
}

// === Admin management (backend-authorized call sites only — see
// AdminDeveloperAccounts.jsx, which gates on the real Base44 admin role
// before ever calling these) ===

export async function fetchDeveloperAccounts() {
  try {
    const rows = await base44.entities.DeveloperAccount.filter({ excluded: true }, "-created_date", 200);
    return rows || [];
  } catch (error) {
    console.error("[devAccountManager] fetchDeveloperAccounts failed", error);
    return [];
  }
}

/**
 * Add or update a developer/test account exclusion. Always writes an audit
 * record. Call-site is responsible for verifying the caller is an
 * authenticated admin — see AdminDeveloperAccounts.jsx.
 */
export async function setDeveloperAccountExclusion({ accountId, excluded, reason, adminEmail }) {
  const trimmedId = (accountId || "").trim().toLowerCase();
  if (!trimmedId) {
    return { success: false, error: "Account ID (email) is required." };
  }
  if (!adminEmail) {
    return { success: false, error: "Admin identity is required." };
  }

  try {
    const existing = await base44.entities.DeveloperAccount.filter({ accountId: trimmedId });
    const previousStatus = existing?.[0]?.excluded ? ACCOUNT_STATUS.DEVELOPER : ACCOUNT_STATUS.NORMAL;
    const newStatus = excluded ? ACCOUNT_STATUS.DEVELOPER : ACCOUNT_STATUS.NORMAL;

    let entity;
    if (existing && existing.length > 0) {
      entity = await base44.entities.DeveloperAccount.update(existing[0].id, {
        excluded: !!excluded,
        reason: reason || existing[0].reason || "",
        addedBy: adminEmail,
      });
    } else {
      entity = await base44.entities.DeveloperAccount.create({
        accountId: trimmedId,
        excluded: !!excluded,
        reason: reason || "",
        addedBy: adminEmail,
      });
    }

    await base44.entities.DeveloperAccountAuditLog.create({
      targetAccountId: trimmedId,
      previousStatus,
      newStatus,
      reason: reason || "",
      adminEmail,
    });

    return { success: true, entity, previousStatus, newStatus };
  } catch (error) {
    console.error("[devAccountManager] setDeveloperAccountExclusion failed", error);
    return { success: false, error: error?.message || "Could not update the developer account list." };
  }
}

export async function fetchDeveloperAccountAuditLog() {
  try {
    const rows = await base44.entities.DeveloperAccountAuditLog.filter({}, "-created_date", 100);
    return rows || [];
  } catch (error) {
    console.error("[devAccountManager] fetchDeveloperAccountAuditLog failed", error);
    return [];
  }
}

/**
 * Manually exclude an existing LeaderboardScore row from competitive
 * rankings. This is the safe fallback for legacy records that can't be
 * linked to an authenticated account automatically (they only ever stored
 * a local device playerId/playerName) — an admin reviews and picks the
 * specific rows they recognize as their own test runs. Never deletes the
 * row, never mass-matches by playerName.
 */
export async function excludeLeaderboardScoreRow({ rowId, reason, adminEmail }) {
  if (!rowId) {
    return { success: false, error: "A score record id is required." };
  }
  if (!adminEmail) {
    return { success: false, error: "Admin identity is required." };
  }
  try {
    const entity = await base44.entities.LeaderboardScore.update(rowId, {
      excludedFromCompetition: true,
      exclusionReason: reason || "developer_account",
      excludedBy: adminEmail,
    });
    return { success: true, entity };
  } catch (error) {
    console.error("[devAccountManager] excludeLeaderboardScoreRow failed", error);
    return { success: false, error: error?.message || "Could not exclude this record." };
  }
}

export async function restoreLeaderboardScoreRow({ rowId, adminEmail }) {
  if (!rowId) {
    return { success: false, error: "A score record id is required." };
  }
  try {
    const entity = await base44.entities.LeaderboardScore.update(rowId, {
      excludedFromCompetition: false,
      exclusionReason: "",
      excludedBy: "",
    });
    return { success: true, entity };
  } catch (error) {
    console.error("[devAccountManager] restoreLeaderboardScoreRow failed", error, { adminEmail });
    return { success: false, error: error?.message || "Could not restore this record." };
  }
}

/**
 * Internal-only "Developer / QA Scores" view — every LeaderboardScore row
 * currently marked excludedFromCompetition:true, across all modes/seasons.
 * Read-only, admin-gated at the call site (AdminDeveloperAccounts.jsx).
 */
export async function fetchExcludedLeaderboardScores() {
  try {
    const rows = await base44.entities.LeaderboardScore.filter(
      { excludedFromCompetition: true },
      "-score",
      200
    );
    return rows || [];
  } catch (error) {
    console.error("[devAccountManager] fetchExcludedLeaderboardScores failed", error);
    return [];
  }
}
