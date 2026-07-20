import { describe, it, expect } from "vitest";
import {
  getDailyChallenge,
  getDailySeed,
  getDailyChallengeSeed,
} from "@/data/dailyChallenge";
import { HERO_MAP } from "@/data/heroes";
import { CARDS } from "@/data/cards";

const SAMPLE_DATE = new Date("2026-07-20T12:00:00Z");
const OTHER_SAMPLE_DATE = new Date("2026-12-25T12:00:00Z");

describe("Daily Challenge seed", () => {
  it("uses the daily_challenge_YYYY_MM_DD format", () => {
    expect(getDailyChallengeSeed(SAMPLE_DATE)).toBe("daily_challenge_2026_07_20");
  });

  it("keeps a plain ISO date key separate from the RNG seed", () => {
    expect(getDailySeed(SAMPLE_DATE)).toBe("2026-07-20");
  });
});

describe("Daily Challenge determinism", () => {
  it("produces the exact same challenge for the same date, every time", () => {
    const a = getDailyChallenge(SAMPLE_DATE);
    const b = getDailyChallenge(new Date("2026-07-20T12:00:00Z"));

    expect(a).toEqual(b);
  });

  it("produces the exact same challenge regardless of time-of-day on the same date", () => {
    const morning = getDailyChallenge(new Date("2026-07-20T00:05:00Z"));
    const evening = getDailyChallenge(new Date("2026-07-20T23:55:00Z"));

    expect(morning.seed).toBe(evening.seed);
    expect(morning.enemyId).toBe(evening.enemyId);
    expect(morning.rule.id).toBe(evening.rule.id);
    expect(morning.deck).toEqual(evening.deck);
  });

  it("uses a fixed single hero, enemy, difficulty, and trivia question per day", () => {
    const daily = getDailyChallenge(SAMPLE_DATE);

    expect(daily.hero.id).toBe("adam");
    expect(typeof daily.enemyId).toBe("string");
    expect(["easy", "normal", "hard"]).toContain(daily.difficulty);
    expect(daily.trivia).toBeTruthy();
  });

  it("stores the deterministic seed on the challenge for battle RNG use", () => {
    const daily = getDailyChallenge(SAMPLE_DATE);
    expect(daily.seed).toBe("daily_challenge_2026_07_20");
    expect(daily.date).toBe("2026-07-20");
  });
});

describe("Daily Challenge fixed deck (no player customization)", () => {
  it("only contains the hero's starter deck cards, plus at most one deterministic rare card", () => {
    const daily = getDailyChallenge(SAMPLE_DATE);
    const allowedIds = new Set([
      ...HERO_MAP.adam.starterDeck,
      ...CARDS.filter((c) => c.rarity === "rare").map((c) => c.id),
    ]);

    for (const cardId of daily.deck) {
      expect(allowedIds.has(cardId)).toBe(true);
    }
  });

  it("never includes cards that are not part of the fixed hero deck / rare pool (no custom cards)", () => {
    const daily = getDailyChallenge(SAMPLE_DATE);
    const customCardId = "totally_custom_card_not_in_game";

    expect(daily.deck).not.toContain(customCardId);
  });

  it("is unaffected by whatever the player's own collection/unlocks look like", () => {
    // getDailyChallenge takes no profile/player argument at all — it is a
    // pure function of the date, so it structurally cannot read the
    // player's active deck, unlocked cards, or progression.
    const daily1 = getDailyChallenge(SAMPLE_DATE);
    const daily2 = getDailyChallenge(SAMPLE_DATE);
    expect(daily1.deck).toEqual(daily2.deck);
  });
});

describe("Different days can produce different challenges", () => {
  it("does not always return identical content for different dates", () => {
    const a = getDailyChallenge(SAMPLE_DATE);
    const b = getDailyChallenge(OTHER_SAMPLE_DATE);

    // Not a strict guarantee for every possible pair of dates, but for this
    // fixed sample pair the seeds must differ (proves seeding is date-based).
    expect(a.seed).not.toBe(b.seed);
  });
});
