import { describe, it, expect, vi, beforeEach } from "vitest";

// Same localStorage polyfill pattern as weeklyLeaderboard.test.js — each
// simulated "player" needs its own stable playerId, exactly like separate
// devices/browsers would in production.
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
globalThis.localStorage = new MemoryStorage();

function switchToNewDevice() {
  globalThis.localStorage.clear();
}

// A realistic in-memory fake of a Base44 entity collection — exact-match
// .filter(query, sort, limit), .create, .update.
function createFakeCollection() {
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
      let matches = rows.filter((r) =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
      if (sort === "-score") {
        matches = [...matches].sort((a, b) => Number(b.score) - Number(a.score));
      } else if (sort === "-startedAt") {
        matches = [...matches].sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
      }
      if (typeof limit === "number") matches = matches.slice(0, limit);
      return matches.map((r) => ({ ...r }));
    },
    async create(payload) {
      const row = { id: `row-${nextId++}`, ...payload };
      rows.push(row);
      return { ...row };
    },
    async update(id, payload) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Entity row ${id} not found`);
      rows[idx] = { ...rows[idx], ...payload };
      return { ...rows[idx] };
    },
  };
}

const leaderboardScoreStore = createFakeCollection();
const leaderboardSeasonStore = createFakeCollection();
const seasonAuditLogStore = createFakeCollection();

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      LeaderboardScore: {
        filter: (...args) => leaderboardScoreStore.filter(...args),
        create: (...args) => leaderboardScoreStore.create(...args),
        update: (...args) => leaderboardScoreStore.update(...args),
      },
      LeaderboardSeason: {
        filter: (...args) => leaderboardSeasonStore.filter(...args),
        create: (...args) => leaderboardSeasonStore.create(...args),
        update: (...args) => leaderboardSeasonStore.update(...args),
      },
      SeasonAuditLog: {
        filter: (...args) => seasonAuditLogStore.filter(...args),
        create: (...args) => seasonAuditLogStore.create(...args),
      },
    },
  },
}));

const {
  DEFAULT_ACTIVE_SEASON,
  LEGACY_SEASON_1,
  getActiveSeason,
  submitGenesisScores,
  fetchCurrentSeasonLeaderboard,
  fetchWeeklyLeaderboard,
  fetchLegacyLeaderboard,
  fetchLegacySeasons,
  startNewSeason,
} = await import("@/game/seasonManager");

function baseRunData(overrides = {}) {
  return {
    playerName: "PlayerA",
    hero: "Adam",
    difficulty: "normal",
    roomsCleared: 8,
    triviaCorrect: 4,
    result: "victory",
    ...overrides,
  };
}

describe("getActiveSeason", () => {
  beforeEach(() => {
    leaderboardSeasonStore.reset();
  });

  it("falls back to the static default season when no entity row exists", async () => {
    const season = await getActiveSeason();
    expect(season.id).toBe(DEFAULT_ACTIVE_SEASON.id);
    expect(season.name).toBe(DEFAULT_ACTIVE_SEASON.name);
    expect(season._entityId).toBeNull();
  });
});

describe("submitGenesisScores — Current Season + This Week, independent submission", () => {
  beforeEach(() => {
    leaderboardScoreStore.reset();
    leaderboardSeasonStore.reset();
    switchToNewDevice();
  });

  it("Player A: 2000 then 1500 (no change) then 2500 (updates both)", async () => {
    const r1 = await submitGenesisScores(baseRunData({ score: 2000 }));
    expect(r1.success).toBe(true);
    expect(r1.seasonResult.isNewBest).toBe(true);
    expect(r1.weeklyResult.isNewBest).toBe(true);

    let season = await fetchCurrentSeasonLeaderboard();
    let weekly = await fetchWeeklyLeaderboard();
    expect(season).toHaveLength(1);
    expect(season[0].score).toBe(2000);
    expect(weekly).toHaveLength(1);
    expect(weekly[0].score).toBe(2000);

    const r2 = await submitGenesisScores(baseRunData({ score: 1500 }));
    expect(r2.success).toBe(true);
    expect(r2.seasonResult.isNewBest).toBe(false);
    expect(r2.weeklyResult.isNewBest).toBe(false);

    season = await fetchCurrentSeasonLeaderboard();
    weekly = await fetchWeeklyLeaderboard();
    expect(season[0].score).toBe(2000); // unchanged — lower score never replaces
    expect(weekly[0].score).toBe(2000);

    const r3 = await submitGenesisScores(baseRunData({ score: 2500 }));
    expect(r3.success).toBe(true);
    expect(r3.seasonResult.isNewBest).toBe(true);
    expect(r3.weeklyResult.isNewBest).toBe(true);

    season = await fetchCurrentSeasonLeaderboard();
    weekly = await fetchWeeklyLeaderboard();
    expect(season[0].score).toBe(2500);
    expect(weekly[0].score).toBe(2500);
  });

  it("Player B appears exactly once in Current Season and once in This Week", async () => {
    switchToNewDevice();
    await submitGenesisScores(baseRunData({ playerName: "PlayerB", score: 900 }));
    await submitGenesisScores(baseRunData({ playerName: "PlayerB", score: 1200 }));
    await submitGenesisScores(baseRunData({ playerName: "PlayerB", score: 300 }));

    const season = await fetchCurrentSeasonLeaderboard();
    const weekly = await fetchWeeklyLeaderboard();
    const seasonRowsForB = season.filter((r) => r.playerName === "PlayerB");
    const weeklyRowsForB = weekly.filter((r) => r.playerName === "PlayerB");

    expect(seasonRowsForB).toHaveLength(1);
    expect(seasonRowsForB[0].score).toBe(1200);
    expect(weeklyRowsForB).toHaveLength(1);
    expect(weeklyRowsForB[0].score).toBe(1200);
  });

  it("weekly submission is attempted even when the score does not beat the season best", async () => {
    await submitGenesisScores(baseRunData({ score: 3000 }));
    const result = await submitGenesisScores(baseRunData({ score: 1000 }));
    expect(result.weeklyResult.success).toBe(true);
    expect(result.weeklyResult.action).toBe("kept_previous");
  });

  it("a failure in the season submission does not block or hide the weekly result", async () => {
    const originalCreate = leaderboardScoreStore.create.bind(leaderboardScoreStore);
    let calls = 0;
    leaderboardScoreStore.create = async (payload) => {
      calls += 1;
      if (calls === 1) throw new Error("simulated network failure");
      return originalCreate(payload);
    };

    const result = await submitGenesisScores(baseRunData({ score: 800 }));
    expect(result.success).toBe(false);
    expect(result.seasonResult.success).toBe(false);
    expect(result.weeklyResult.success).toBe(true);

    leaderboardScoreStore.create = originalCreate;
  });

  it("only the highest-scoring difficulty run appears, showing that difficulty", async () => {
    await submitGenesisScores(baseRunData({ difficulty: "easy", score: 1000 }));
    await submitGenesisScores(baseRunData({ difficulty: "hard", score: 2600 }));
    await submitGenesisScores(baseRunData({ difficulty: "normal", score: 1800 }));

    const season = await fetchCurrentSeasonLeaderboard();
    expect(season).toHaveLength(1);
    expect(season[0].score).toBe(2600);
    expect(season[0].difficulty).toBe("hard");
  });
});

describe("Legacy records — pre-season rows never compete with Current Season", () => {
  beforeEach(() => {
    leaderboardScoreStore.reset();
    leaderboardSeasonStore.reset();
    switchToNewDevice();
  });

  it("an untagged (pre-season) row is invisible to Current Season and visible under Legacy", async () => {
    // Simulate a score written before the seasons feature existed — no
    // leaderboardPeriod/seasonId fields at all, exactly like real historical data.
    await leaderboardScoreStore.create({
      playerName: "OldTimer",
      playerId: "p-legacy-1",
      score: 5000,
      mode: "story",
      hero: "Noah",
      difficulty: "hard",
    });

    const season = await fetchCurrentSeasonLeaderboard();
    expect(season.find((r) => r.playerName === "OldTimer")).toBeUndefined();

    const legacy = await fetchLegacyLeaderboard(LEGACY_SEASON_1.id);
    expect(legacy.find((r) => r.playerName === "OldTimer")?.score).toBe(5000);
  });

  it("a new Current Season submission never appears in the legacy view", async () => {
    await submitGenesisScores(baseRunData({ playerName: "NewPlayer", score: 2100 }));

    const legacy = await fetchLegacyLeaderboard(LEGACY_SEASON_1.id);
    expect(legacy.find((r) => r.playerName === "NewPlayer")).toBeUndefined();
  });

  it("fetchLegacySeasons always includes Early Access Season 1", async () => {
    const seasons = await fetchLegacySeasons();
    expect(seasons.some((s) => s.id === LEGACY_SEASON_1.id)).toBe(true);
  });
});

describe("startNewSeason — owner-only season transition", () => {
  beforeEach(() => {
    leaderboardScoreStore.reset();
    leaderboardSeasonStore.reset();
    seasonAuditLogStore.reset();
  });

  it("archives the current season and activates the new one without deleting score rows", async () => {
    await leaderboardScoreStore.create({
      playerName: "Someone",
      playerId: "p-1",
      score: 100,
      mode: "story",
      hero: "Adam",
      leaderboardPeriod: "season",
      seasonId: DEFAULT_ACTIVE_SEASON.id,
    });

    const result = await startNewSeason({
      newSeasonId: "early-access-season-3",
      newSeasonName: "Early Access Season 3",
      reason: "Balance overhaul",
      gameVersion: "3.0",
      startDate: "2026-08-01",
      adminEmail: "owner@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.oldSeasonId).toBe(DEFAULT_ACTIVE_SEASON.id);

    const active = await getActiveSeason();
    expect(active.id).toBe("early-access-season-3");

    const archived = leaderboardSeasonStore.all().filter((r) => r.status === "archived");
    expect(archived.some((r) => r.seasonId === DEFAULT_ACTIVE_SEASON.id)).toBe(true);

    // The score row from the old season must still exist, untouched.
    const stillThere = leaderboardScoreStore.all().find((r) => r.playerName === "Someone");
    expect(stillThere).toBeTruthy();
    expect(stillThere.score).toBe(100);

    // Exactly one active season remains.
    const activeRows = leaderboardSeasonStore.all().filter((r) => r.status === "active");
    expect(activeRows).toHaveLength(1);

    const audit = seasonAuditLogStore.all();
    expect(audit).toHaveLength(1);
    expect(audit[0].newSeasonId).toBe("early-access-season-3");
    expect(audit[0].oldSeasonId).toBe(DEFAULT_ACTIVE_SEASON.id);
  });

  it("rejects an empty season ID", async () => {
    const result = await startNewSeason({
      newSeasonId: "   ",
      newSeasonName: "Season X",
      adminEmail: "owner@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate season ID and never produces two active seasons", async () => {
    await startNewSeason({
      newSeasonId: "season-x",
      newSeasonName: "Season X",
      adminEmail: "owner@example.com",
    });

    const secondAttempt = await startNewSeason({
      newSeasonId: "season-x",
      newSeasonName: "Season X Again",
      adminEmail: "owner@example.com",
    });

    expect(secondAttempt.success).toBe(false);

    const activeRows = leaderboardSeasonStore.all().filter((r) => r.status === "active");
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].seasonId).toBe("season-x");
  });

  it("running the same transition twice does not duplicate or corrupt records", async () => {
    await startNewSeason({
      newSeasonId: "season-y",
      newSeasonName: "Season Y",
      adminEmail: "owner@example.com",
    });
    const beforeCount = leaderboardSeasonStore.all().length;

    // Re-attempting the identical transition must be rejected (duplicate ID),
    // not silently re-applied.
    const repeat = await startNewSeason({
      newSeasonId: "season-y",
      newSeasonName: "Season Y",
      adminEmail: "owner@example.com",
    });

    expect(repeat.success).toBe(false);
    expect(leaderboardSeasonStore.all().length).toBe(beforeCount);
  });
});
