import { describe, it, expect, vi, beforeEach } from "vitest";

// getPlayerId() persists a stable per-device id in localStorage, which the
// vitest "node" environment doesn't provide. Without it every submission
// falls back to the same "p-unknown" id, making distinct players collide.
// A tiny in-memory polyfill lets each simulated "player" (device) keep its
// own id, exactly like separate browsers would in production.
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

// Switch the "current device" identity — call between simulated players so
// each gets their own freshly-generated playerId, the same way a different
// physical device/browser would in production.
function switchToNewDevice() {
  globalThis.localStorage.clear();
}

// A realistic in-memory fake of the Base44 LeaderboardScore entity —
// supports exact-match .filter(query, sort, limit), .create, .update —
// so multi-step scenarios (submit, submit again, retrieve) behave exactly
// like the real backend instead of needing to hand-chain mock responses.
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
    async filter(query, sort, limit) {
      let matches = rows.filter((r) =>
        Object.entries(query).every(([k, v]) => r[k] === v)
      );
      if (sort === "-score") {
        matches = [...matches].sort((a, b) => Number(b.score) - Number(a.score));
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
      if (idx === -1) throw new Error(`LeaderboardScore ${id} not found`);
      rows[idx] = { ...rows[idx], ...payload };
      return { ...rows[idx] };
    },
  };
}

const store = createFakeStore();

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      LeaderboardScore: {
        filter: (...args) => store.filter(...args),
        create: (...args) => store.create(...args),
        update: (...args) => store.update(...args),
      },
    },
  },
}));

const { submitStoryScores, fetchLeaderboard, getCurrentWeekId } = await import(
  "@/game/scoreManager"
);

function scoreNames(entries) {
  return entries.map((e) => `${e.playerName}:${e.score}`);
}

describe("submitStoryScores — independent All Time + This Week submission", () => {
  beforeEach(() => {
    store.reset();
    switchToNewDevice();
  });

  it("attempts both categories on every Genesis victory, regardless of order", async () => {
    const result = await submitStoryScores({
      playerName: "PlayerA",
      score: 2000,
      hero: "Adam",
      difficulty: "hard",
      roomsCleared: 8,
      triviaCorrect: 4,
      result: "victory",
    });

    expect(result.success).toBe(true);
    expect(result.allTimeResult.success).toBe(true);
    expect(result.weeklyResult.success).toBe(true);
    expect(result.weekId).toBe(getCurrentWeekId());

    const all = store.all();
    expect(all.filter((r) => r.mode === "story")).toHaveLength(1);
    expect(all.filter((r) => r.mode === "daily" && r.dailyChallengeId === `weekly-${getCurrentWeekId()}`)).toHaveLength(1);
  });

  it("Player A: a lower Easy score never replaces the Hard all-time best", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 2000, hero: "Adam", difficulty: "hard", result: "victory" });
    await submitStoryScores({ playerName: "PlayerA", score: 1000, hero: "Adam", difficulty: "easy", result: "victory" });

    const allTime = await fetchLeaderboard("all");
    expect(allTime).toHaveLength(1);
    expect(allTime[0].playerName).toBe("PlayerA");
    expect(allTime[0].score).toBe(2000);
  });

  it("Player A: the weekly submission is attempted even when the score is lower than the all-time best", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 2000, hero: "Adam", difficulty: "hard", result: "victory" });

    const result = await submitStoryScores({ playerName: "PlayerA", score: 1000, hero: "Adam", difficulty: "easy", result: "victory" });

    // The weekly call must be attempted (success) even though 1000 didn't
    // beat the existing weekly best of 2000 — "kept_previous" still means
    // the write path ran, it just correctly declined to lower the score.
    expect(result.weeklyResult.success).toBe(true);
    expect(result.weeklyResult.action).toBe("kept_previous");

    const weekly = await fetchLeaderboard("weekly");
    expect(weekly).toHaveLength(1);
    expect(weekly[0].playerName).toBe("PlayerA");
    expect(weekly[0].score).toBe(2000); // highest-this-week rule: 1000 < 2000, no change
  });

  it("Player A: a higher same-week score raises the weekly best without touching All Time twice", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 1200, hero: "Adam", difficulty: "normal", result: "victory" });
    await submitStoryScores({ playerName: "PlayerA", score: 1500, hero: "Adam", difficulty: "normal", result: "victory" });

    const weekly = await fetchLeaderboard("weekly");
    expect(weekly).toHaveLength(1);
    expect(weekly[0].score).toBe(1500);

    const allTime = await fetchLeaderboard("all");
    expect(allTime).toHaveLength(1);
    expect(allTime[0].score).toBe(1500);
  });

  it("Player B appears in This Week even with an older, higher All Time score already on record", async () => {
    // Player B set a big all-time score previously (e.g. last week) — that
    // earlier completion already created their all-time row.
    await submitStoryScores({ playerName: "PlayerB", score: 5000, hero: "Noah", difficulty: "hard", result: "victory" });

    // This week, Player B completes again with a much lower score. Per the
    // rules, the weekly submission must still be attempted and must still
    // show Player B this week — it is never skipped just because it can't
    // beat their (unrelated) all-time record.
    const result = await submitStoryScores({ playerName: "PlayerB", score: 300, hero: "Noah", difficulty: "easy", result: "victory" });

    expect(result.weeklyResult.success).toBe(true);

    const weekly = await fetchLeaderboard("weekly");
    const mine = weekly.find((e) => e.playerName === "PlayerB");
    expect(mine).toBeTruthy();
    expect(mine.score).toBe(5000); // same week, so the higher of the two submissions wins
  });

  it("one row per player in This Week — no duplicates across multiple completions", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 900, hero: "Adam", difficulty: "normal", result: "victory" });
    await submitStoryScores({ playerName: "PlayerA", score: 1100, hero: "Adam", difficulty: "hard", result: "victory" });
    await submitStoryScores({ playerName: "PlayerA", score: 700, hero: "Adam", difficulty: "easy", result: "victory" });

    const weekly = await fetchLeaderboard("weekly");
    const mine = weekly.filter((e) => e.playerName === "PlayerA");
    expect(mine).toHaveLength(1);
    expect(mine[0].score).toBe(1100);
  });

  it("This Week and All Time stay independent — two different players, two different leaders", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 3000, hero: "Adam", difficulty: "hard", result: "victory" });
    switchToNewDevice();
    await submitStoryScores({ playerName: "PlayerB", score: 400, hero: "Noah", difficulty: "easy", result: "victory" });

    const weekly = await fetchLeaderboard("weekly");
    const allTime = await fetchLeaderboard("all");

    expect(scoreNames(weekly).sort()).toEqual(["PlayerA:3000", "PlayerB:400"].sort());
    expect(scoreNames(allTime).sort()).toEqual(["PlayerA:3000", "PlayerB:400"].sort());
  });

  it("a failure in one category does not prevent or hide the result of the other", async () => {
    const originalCreate = store.create.bind(store);
    let calls = 0;
    store.create = async (payload) => {
      calls += 1;
      // Fail only the very first create call (the all-time submission,
      // since Promise.all preserves call order for two fresh promises).
      if (calls === 1) throw new Error("simulated network failure");
      return originalCreate(payload);
    };

    const result = await submitStoryScores({ playerName: "PlayerC", score: 800, hero: "Adam", difficulty: "normal", result: "victory" });

    expect(result.success).toBe(false);
    expect(result.allTimeResult.success).toBe(false);
    expect(result.weeklyResult.success).toBe(true);

    store.create = originalCreate;
  });

  it("does not filter the weekly query by created_date — it uses mode + dailyChallengeId", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 1000, hero: "Adam", difficulty: "normal", result: "victory" });
    const row = store.all().find((r) => r.mode === "daily");
    expect(row.dailyChallengeId).toBe(`weekly-${getCurrentWeekId()}`);
    expect(row).not.toHaveProperty("created_date");
  });
});

describe("fetchLeaderboard('weekly') vs fetchLeaderboard('all') isolation", () => {
  beforeEach(() => {
    store.reset();
  });

  it("a weekly-only row (lower than all-time) never leaks into the All Time tab", async () => {
    await submitStoryScores({ playerName: "PlayerA", score: 2000, hero: "Adam", difficulty: "hard", result: "victory" });
    await submitStoryScores({ playerName: "PlayerA", score: 500, hero: "Adam", difficulty: "easy", result: "victory" });

    const allTime = await fetchLeaderboard("all");
    expect(allTime).toHaveLength(1);
    expect(allTime[0].score).toBe(2000);
  });
});
