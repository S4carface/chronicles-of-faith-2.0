import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake in-memory stores for every entity this test suite touches, following
// the same pattern established in seasonLeaderboard.test.js: exact-match
// .filter(query, sort, limit), plus .create/.update.
function createFakeStore() {
  let rows = [];
  let nextId = 1;
  return {
    reset() {
      rows = [];
      nextId = 1;
    },
    all() {
      return rows.map((r) => ({ ...r }));
    },
    async filter(query = {}, sort, limit) {
      let results = rows.filter((r) =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
      if (sort) {
        const desc = sort.startsWith("-");
        const field = desc ? sort.slice(1) : sort;
        results = [...results].sort((a, b) =>
          desc ? (b[field] > a[field] ? 1 : -1) : (a[field] > b[field] ? 1 : -1)
        );
      }
      if (limit) results = results.slice(0, limit);
      return results.map((r) => ({ ...r }));
    },
    async create(payload) {
      const row = { id: `row-${nextId++}`, created_date: new Date().toISOString(), ...payload };
      rows.push(row);
      return { ...row };
    },
    async update(id, payload) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`No row with id ${id}`);
      rows[idx] = { ...rows[idx], ...payload };
      return { ...rows[idx] };
    },
  };
}

const leaderboardScoreStore = createFakeStore();
const developerAccountStore = createFakeStore();
const developerAccountAuditLogStore = createFakeStore();

// The authenticated identity for the "current session" in each test —
// mutated between scenarios via setCurrentUser()/setCurrentUserError().
let currentUser = null;
let currentUserError = null;

function setCurrentUser(user) {
  currentUser = user;
  currentUserError = null;
}
function setCurrentUserError(error) {
  currentUser = null;
  currentUserError = error;
}
function setGuest() {
  setCurrentUserError({ status: 401, message: "Unauthorized" });
}

vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: {
      me: async () => {
        if (currentUserError) throw currentUserError;
        return currentUser;
      },
    },
    entities: {
      LeaderboardScore: {
        filter: (...args) => leaderboardScoreStore.filter(...args),
        create: (...args) => leaderboardScoreStore.create(...args),
        update: (...args) => leaderboardScoreStore.update(...args),
      },
      DeveloperAccount: {
        filter: (...args) => developerAccountStore.filter(...args),
        create: (...args) => developerAccountStore.create(...args),
        update: (...args) => developerAccountStore.update(...args),
      },
      DeveloperAccountAuditLog: {
        filter: (...args) => developerAccountAuditLogStore.filter(...args),
        create: (...args) => developerAccountAuditLogStore.create(...args),
      },
    },
  },
}));

// localStorage polyfill — submitBestScore's getPlayerId() needs it.
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const { submitBestScore, fetchLeaderboard, getDailyRank } = await import("@/game/scoreManager");
const {
  getCompetitiveAccountStatus,
  isDeveloperAccount,
  canSubmitPublicScore,
  setDeveloperAccountExclusion,
  fetchDeveloperAccounts,
  ACCOUNT_STATUS,
} = await import("@/game/devAccountManager");
const { submitGenesisScores, fetchCurrentSeasonLeaderboard } = await import("@/game/seasonManager");

beforeEach(() => {
  leaderboardScoreStore.reset();
  developerAccountStore.reset();
  developerAccountAuditLogStore.reset();
  localStorage.clear();
  currentUser = null;
  currentUserError = null;
});

describe("getCompetitiveAccountStatus — identity resolution", () => {
  it("classifies an unauthenticated session as guest, not a lookup failure", async () => {
    setGuest();
    const status = await getCompetitiveAccountStatus();
    expect(status.status).toBe(ACCOUNT_STATUS.GUEST);
  });

  it("classifies an authenticated account with no DeveloperAccount row as normal", async () => {
    setCurrentUser({ email: "player@example.com", role: "user" });
    const status = await getCompetitiveAccountStatus();
    expect(status.status).toBe(ACCOUNT_STATUS.NORMAL);
  });

  it("classifies an authenticated, explicitly-excluded account as developer", async () => {
    setCurrentUser({ email: "dev@example.com", role: "user" });
    await developerAccountStore.create({ accountId: "dev@example.com", excluded: true, reason: "unlocked test cards" });
    const status = await getCompetitiveAccountStatus();
    expect(status.status).toBe(ACCOUNT_STATUS.DEVELOPER);
  });

  it("fail-safe: an unexpected identity-lookup error never becomes 'developer' and is logged", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setCurrentUserError(new Error("network exploded"));
    const status = await getCompetitiveAccountStatus();
    expect(status.status).toBe(ACCOUNT_STATUS.LOOKUP_FAILED);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("canSubmitPublicScore() is true for normal, guest, and lookup-failed — only false for developer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    setCurrentUser({ email: "player@example.com" });
    expect(await canSubmitPublicScore()).toBe(true);

    setGuest();
    expect(await canSubmitPublicScore()).toBe(true);

    setCurrentUserError(new Error("boom"));
    expect(await canSubmitPublicScore()).toBe(true);

    setCurrentUser({ email: "dev@example.com" });
    await developerAccountStore.create({ accountId: "dev@example.com", excluded: true });
    expect(await canSubmitPublicScore()).toBe(false);
    expect(await isDeveloperAccount()).toBe(true);

    vi.restoreAllMocks();
  });
});

describe("submitBestScore — developer accounts never write a LeaderboardScore row", () => {
  it("normal authenticated player: Genesis submits to Current Season and This Week", async () => {
    setCurrentUser({ email: "player@example.com" });
    const result = await submitGenesisScores({
      playerName: "Player One",
      score: 2000,
      hero: "Adam",
      difficulty: "normal",
      result: "victory",
    });
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.seasonResult.action).toBe("created");
    expect(result.weeklyResult.action).toBe("created");
    expect(leaderboardScoreStore.all().length).toBe(2);
  });

  it("developer account: Genesis score calculates but creates zero LeaderboardScore rows", async () => {
    setCurrentUser({ email: "dev@example.com" });
    await developerAccountStore.create({ accountId: "dev@example.com", excluded: true, reason: "unlocked test cards" });

    const result = await submitGenesisScores({
      playerName: "Dev Tester",
      score: 9999,
      hero: "Noah",
      difficulty: "hard",
      result: "victory",
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("developer_account");
    expect(result.seasonResult).toEqual({ success: true, skipped: true, reason: "developer_account", score: 9999 });
    expect(result.weeklyResult).toEqual({ success: true, skipped: true, reason: "developer_account", score: 9999 });
    // No error field, no isNewBest/bestScore fabricated for a skip.
    expect(result.error).toBeUndefined();
    expect(leaderboardScoreStore.all().length).toBe(0);
  });

  it("developer account: Daily Battle submission is skipped, not written", async () => {
    setCurrentUser({ email: "dev@example.com" });
    await developerAccountStore.create({ accountId: "dev@example.com", excluded: true });

    const result = await submitBestScore({
      playerName: "Dev Tester",
      score: 850,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
      hero: "Adam",
    });

    expect(result).toEqual({ success: true, skipped: true, reason: "developer_account", score: 850 });
    expect(leaderboardScoreStore.all().length).toBe(0);
  });

  it("a guest (anonymous) player's Daily Battle score still submits normally", async () => {
    setGuest();
    const result = await submitBestScore({
      playerName: "Anonymous Pilgrim",
      score: 500,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
      hero: "Adam",
    });
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(leaderboardScoreStore.all().length).toBe(1);
  });
});

describe("Public leaderboard retrieval excludes developer/test rows", () => {
  it("fetchLeaderboard('daily') never returns a row marked excludedFromCompetition", async () => {
    await leaderboardScoreStore.create({
      playerName: "Normal Player", playerId: "p-1", score: 900, mode: "daily", dailyChallengeId: "2026-07-20", hero: "Adam",
    });
    await leaderboardScoreStore.create({
      playerName: "Dev Tester", playerId: "p-2", score: 9999, mode: "daily", dailyChallengeId: "2026-07-20", hero: "Noah",
      excludedFromCompetition: true, exclusionReason: "developer_account",
    });

    const today = new Date().toISOString().slice(0, 10);
    // fetchLeaderboard("daily") queries dailyChallengeId === today's date;
    // reuse the same date the fixtures were written under.
    await leaderboardScoreStore.update(
      (await leaderboardScoreStore.filter({ playerName: "Normal Player" }))[0].id,
      { dailyChallengeId: today }
    );
    await leaderboardScoreStore.update(
      (await leaderboardScoreStore.filter({ playerName: "Dev Tester" }))[0].id,
      { dailyChallengeId: today }
    );

    const board = await fetchLeaderboard("daily");
    expect(board.length).toBe(1);
    expect(board[0].playerName).toBe("Normal Player");
  });

  it("normal players move up correctly once a developer row is excluded — no gap, no rank held", async () => {
    // Distinct playerIds — submitBestScore's getPlayerId() is a single
    // device-local id, so each simulated player needs its own localStorage
    // (switching "device" between submissions), same as weeklyLeaderboard.test.js.
    setCurrentUser({ email: "player@example.com" });
    localStorage.clear();
    await submitBestScore({ playerName: "Alice", score: 1000, mode: "story" });
    localStorage.clear();
    await submitBestScore({ playerName: "Bob", score: 800, mode: "story" });
    // Simulate a manually-excluded legacy developer row that would otherwise
    // rank #1.
    await leaderboardScoreStore.create({
      playerName: "Dev Tester", playerId: "p-dev", score: 5000, mode: "story", hero: "Noah",
      excludedFromCompetition: true, exclusionReason: "developer_account",
    });

    const board = await fetchLeaderboard("all");
    expect(board.map((r) => r.playerName)).toEqual(["Alice", "Bob"]);
  });

  it("getDailyRank never counts an excluded row toward rank position", async () => {
    const todayId = "rank-test-day";
    await leaderboardScoreStore.create({
      playerName: "Dev Tester", playerId: "p-dev", score: 9999, mode: "daily", dailyChallengeId: todayId, hero: "Noah",
      excludedFromCompetition: true,
    });
    // getDailyRank() reports the *calling device's own* rank, so this
    // device's playerId must match the "Real Player" fixture row.
    localStorage.setItem("cof_player_id", "p-real");
    await leaderboardScoreStore.create({
      playerName: "Real Player", playerId: "p-real", score: 500, mode: "daily", dailyChallengeId: todayId, hero: "Adam",
    });

    const rank = await getDailyRank(todayId);
    expect(rank).toBe(1); // Real Player is #1 — the excluded dev row never occupies a slot
  });

  it("fetchCurrentSeasonLeaderboard excludes developer rows tagged for the active season", async () => {
    await leaderboardScoreStore.create({
      playerName: "Normal", playerId: "p-1", score: 700, mode: "story", hero: "Adam",
      leaderboardPeriod: "season", seasonId: "early-access-season-2",
    });
    await leaderboardScoreStore.create({
      playerName: "Dev Tester", playerId: "p-2", score: 8000, mode: "story", hero: "Noah",
      leaderboardPeriod: "season", seasonId: "early-access-season-2",
      excludedFromCompetition: true, exclusionReason: "developer_account",
    });

    const board = await fetchCurrentSeasonLeaderboard({ id: "early-access-season-2", name: "Early Access Season 2" });
    expect(board.length).toBe(1);
    expect(board[0].playerName).toBe("Normal");
  });
});

describe("Admin: setDeveloperAccountExclusion — status changes take effect immediately", () => {
  it("adding then removing an exclusion changes future submission behavior, and writes an audit record each time", async () => {
    const addResult = await setDeveloperAccountExclusion({
      accountId: "dev@example.com",
      excluded: true,
      reason: "unlocked test cards",
      adminEmail: "owner@example.com",
    });
    expect(addResult.success).toBe(true);

    setCurrentUser({ email: "dev@example.com" });
    const skippedResult = await submitBestScore({ playerName: "Dev", score: 100, mode: "daily", dailyChallengeId: "d1" });
    expect(skippedResult.skipped).toBe(true);

    const removeResult = await setDeveloperAccountExclusion({
      accountId: "dev@example.com",
      excluded: false,
      reason: "no longer testing",
      adminEmail: "owner@example.com",
    });
    expect(removeResult.success).toBe(true);

    const normalResult = await submitBestScore({ playerName: "Dev", score: 100, mode: "daily", dailyChallengeId: "d2" });
    expect(normalResult.skipped).toBeUndefined();
    expect(normalResult.success).toBe(true);

    // Re-enable exclusion — future scores stop submitting again.
    await setDeveloperAccountExclusion({
      accountId: "dev@example.com",
      excluded: true,
      reason: "resumed testing",
      adminEmail: "owner@example.com",
    });
    const skippedAgain = await submitBestScore({ playerName: "Dev", score: 100, mode: "daily", dailyChallengeId: "d3" });
    expect(skippedAgain.skipped).toBe(true);

    const auditRows = developerAccountAuditLogStore.all();
    expect(auditRows.length).toBe(3);
    expect(auditRows.every((r) => r.adminEmail === "owner@example.com")).toBe(true);
  });

  it("rejects an empty account id and does not write anything", async () => {
    const result = await setDeveloperAccountExclusion({ accountId: "  ", excluded: true, adminEmail: "owner@example.com" });
    expect(result.success).toBe(false);
    expect(developerAccountStore.all().length).toBe(0);
  });

  it("rejects a missing admin identity", async () => {
    const result = await setDeveloperAccountExclusion({ accountId: "dev@example.com", excluded: true });
    expect(result.success).toBe(false);
  });

  it("fetchDeveloperAccounts only returns currently-excluded accounts", async () => {
    await setDeveloperAccountExclusion({ accountId: "a@example.com", excluded: true, adminEmail: "owner@example.com" });
    await setDeveloperAccountExclusion({ accountId: "b@example.com", excluded: true, adminEmail: "owner@example.com" });
    await setDeveloperAccountExclusion({ accountId: "b@example.com", excluded: false, adminEmail: "owner@example.com" });

    const list = await fetchDeveloperAccounts();
    expect(list.map((a) => a.accountId)).toEqual(["a@example.com"]);
  });
});
