import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Base44 SDK client entirely so tests never touch the network and
// we can control exactly what the leaderboard "database" returns.
const mockFilter = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      LeaderboardScore: {
        filter: (...args) => mockFilter(...args),
        create: (...args) => mockCreate(...args),
        update: (...args) => mockUpdate(...args),
      },
    },
  },
}));

const { submitBestScore, calculateDailyScore } = await import("@/game/scoreManager");

describe("calculateDailyScore", () => {
  it("awards 0 for a defeat, regardless of other stats", () => {
    const breakdown = calculateDailyScore({
      result: "defeat",
      playerHp: 20,
      maxPlayerHp: 35,
      turns: 3,
      triviaCorrect: true,
    });
    expect(breakdown.finalScore).toBe(0);
  });

  it("matches the exact scoring spec for a victory", () => {
    // Victory +500, HP remaining +10/HP, turns -10/turn, correct trivia +100,
    // perfect battle (full HP) +100.
    const breakdown = calculateDailyScore({
      result: "victory",
      playerHp: 35,
      maxPlayerHp: 35,
      turns: 4,
      triviaCorrect: true,
    });

    expect(breakdown.victoryBonus).toBe(500);
    expect(breakdown.hpBonus).toBe(350); // 35 * 10
    expect(breakdown.turnPenalty).toBe(40); // 4 * 10
    expect(breakdown.triviaBonus).toBe(100);
    expect(breakdown.perfectBonus).toBe(100); // full HP remaining
    expect(breakdown.finalScore).toBe(500 + 350 - 40 + 100 + 100);
  });

  it("does not award the perfect battle bonus when HP was lost", () => {
    const breakdown = calculateDailyScore({
      result: "victory",
      playerHp: 10,
      maxPlayerHp: 35,
      turns: 4,
      triviaCorrect: false,
    });
    expect(breakdown.perfectBonus).toBe(0);
  });

  it("cards played never contribute to the score (not part of the formula)", () => {
    // calculateDailyScore has no cardsPlayed parameter at all — passing one
    // has zero effect on the result.
    const withExtra = calculateDailyScore({
      result: "victory",
      playerHp: 20,
      maxPlayerHp: 35,
      turns: 2,
      triviaCorrect: false,
      cardsPlayed: 999,
    });
    const withoutExtra = calculateDailyScore({
      result: "victory",
      playerHp: 20,
      maxPlayerHp: 35,
      turns: 2,
      triviaCorrect: false,
    });
    expect(withExtra.finalScore).toBe(withoutExtra.finalScore);
  });

  it("never returns a negative score", () => {
    const breakdown = calculateDailyScore({
      result: "victory",
      playerHp: 1,
      maxPlayerHp: 35,
      turns: 100,
      triviaCorrect: false,
    });
    expect(breakdown.finalScore).toBe(0);
  });
});

describe("submitBestScore — best-score-only, no duplicate leaderboard entries", () => {
  beforeEach(() => {
    mockFilter.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it("creates a new entry the first time a player submits for a date", async () => {
    mockFilter.mockResolvedValueOnce([]); // no existing entry by playerId
    mockCreate.mockResolvedValueOnce({ id: "new-1" });

    const result = await submitBestScore({
      playerName: "TestPlayer",
      score: 600,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe("created");
    expect(result.isNewBest).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("replaces the stored score when the new score is higher (higher replay score wins)", async () => {
    mockFilter.mockResolvedValueOnce([{ id: "existing-1", score: 400, playerName: "TestPlayer" }]);

    const result = await submitBestScore({
      playerName: "TestPlayer",
      score: 700,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
    });

    expect(result.action).toBe("updated");
    expect(result.isNewBest).toBe(true);
    expect(result.previousScore).toBe(400);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1].score).toBe(700);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT replace the stored score when the new score is lower (lower replay score loses)", async () => {
    mockFilter.mockResolvedValueOnce([{ id: "existing-1", score: 800, playerName: "TestPlayer" }]);

    const result = await submitBestScore({
      playerName: "TestPlayer",
      score: 350,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
    });

    expect(result.action).toBe("kept_previous");
    expect(result.isNewBest).toBe(false);
    expect(result.bestScore).toBe(800);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("never creates a second entry for the same player and date — it always updates in place", async () => {
    mockFilter.mockResolvedValueOnce([{ id: "existing-1", score: 100, playerName: "TestPlayer" }]);

    await submitBestScore({
      playerName: "TestPlayer",
      score: 900,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith("existing-1", expect.objectContaining({ score: 900 }));
  });

  it("keeps daily scores separate from campaign (story) scores via the mode + dailyChallengeId query", async () => {
    mockFilter.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce({ id: "daily-1" });

    await submitBestScore({
      playerName: "TestPlayer",
      score: 500,
      mode: "daily",
      dailyChallengeId: "2026-07-20",
    });

    const filterQuery = mockFilter.mock.calls[0][0];
    expect(filterQuery.mode).toBe("daily");
    expect(filterQuery.dailyChallengeId).toBe("2026-07-20");

    mockFilter.mockReset();
    mockCreate.mockReset();
    mockFilter.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce({ id: "story-1" });

    await submitBestScore({
      playerName: "TestPlayer",
      score: 500,
      mode: "story",
    });

    const storyQuery = mockFilter.mock.calls[0][0];
    expect(storyQuery.mode).toBe("story");
    expect(storyQuery.dailyChallengeId).toBeUndefined();
  });
});
