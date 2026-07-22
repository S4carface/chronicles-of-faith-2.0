import { describe, it, expect } from "vitest";
import {
  getDailyChallenge,
  getDailySeed,
  getDailyChallengeSeed,
  getUtcDayOfYear,
} from "@/data/dailyChallenge";
import { HERO_MAP } from "@/data/heroes";
import { CARDS } from "@/data/cards";

const SAMPLE_DATE = new Date("2026-07-20T12:00:00Z");
const OTHER_SAMPLE_DATE = new Date("2026-12-25T12:00:00Z");

// Fields that fully identify a daily challenge's configuration.
function configOf(c) {
  return {
    seed: c.seed,
    date: c.date,
    difficulty: c.difficulty,
    enemyId: c.enemyId,
    enemyHp: c.enemy.hp,
    ruleId: c.rule.id,
    deck: c.deck,
    startFaith: c.startFaith,
    maxHp: c.maxHp,
  };
}

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

describe("Daily Challenge UTC fairness (same UTC date = same challenge worldwide)", () => {
  it("derives day-of-year purely from the UTC date", () => {
    // 2026-07-22 is day 203 of 2026 (non-leap year).
    expect(getUtcDayOfYear(new Date("2026-07-22T00:00:00Z"))).toBe(203);
    expect(getUtcDayOfYear(new Date("2026-07-22T23:59:59Z"))).toBe(203);
    // An instant just after UTC midnight is still the new UTC day, regardless
    // of what local date a non-UTC time zone would report for it.
    expect(getUtcDayOfYear(new Date("2026-07-22T03:00:00Z"))).toBe(203);
  });

  it("gives an identical full configuration across the whole UTC day (incl. near both midnights)", () => {
    const justAfterMidnight = getDailyChallenge(new Date("2026-07-22T00:00:30Z"));
    const earlyAmericasEvening = getDailyChallenge(new Date("2026-07-22T03:00:00Z")); // UTC-7 -> still Jul 21 locally
    const midday = getDailyChallenge(new Date("2026-07-22T12:00:00Z"));
    const justBeforeMidnight = getDailyChallenge(new Date("2026-07-22T23:59:30Z"));

    const base = configOf(midday);
    expect(configOf(justAfterMidnight)).toEqual(base);
    expect(configOf(earlyAmericasEvening)).toEqual(base);
    expect(configOf(justBeforeMidnight)).toEqual(base);
    // Difficulty specifically must match the UTC date (the field the old
    // local-date bug could desync from the seed).
    expect(midday.difficulty).toBe("hard"); // day 203 % 3 === 2 -> hard
  });

  it("difficulty rotates by UTC day, and the seed's date matches the difficulty's date", () => {
    for (const iso of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
      const c = getDailyChallenge(new Date(`${iso}T09:00:00Z`));
      const expected = ["easy", "normal", "hard"][getUtcDayOfYear(new Date(`${iso}T00:00:00Z`)) % 3];
      expect(c.difficulty).toBe(expected);
      expect(c.date).toBe(iso);
      expect(c.seed).toBe(`daily_challenge_${iso.replace(/-/g, "_")}`);
    }
  });
});

describe("Daily Challenge modifier / HP fairness", () => {
  it("never stacks an uncompensated enemy-only buff on a Hard day", () => {
    // Scan a year of Hard days: none may carry a pure enemy-only modifier.
    const enemyOnly = new Set(["mighty_adversary", "shielded_foe"]);
    let hardDays = 0;
    for (let d = 0; d < 366; d++) {
      const date = new Date(Date.UTC(2026, 0, 1 + d, 9, 0, 0));
      const c = getDailyChallenge(date);
      if (c.difficulty !== "hard") continue;
      hardDays++;
      expect(enemyOnly.has(c.rule.id)).toBe(false);
    }
    expect(hardDays).toBeGreaterThan(0);
  });

  it("Hard days grant at least 4 starting Faith (compensating economy)", () => {
    for (let d = 0; d < 366; d++) {
      const date = new Date(Date.UTC(2026, 0, 1 + d, 9, 0, 0));
      const c = getDailyChallenge(date);
      if (c.difficulty !== "hard") continue;
      expect(c.startFaith).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps enemy HP within safe bounds every day (never the old 64 Cain)", () => {
    for (let d = 0; d < 366; d++) {
      const date = new Date(Date.UTC(2026, 0, 1 + d, 9, 0, 0));
      const c = getDailyChallenge(date);
      expect(c.enemy.hp).toBeLessThanOrEqual(52); // safety cap
      expect(c.enemy.hp).toBeGreaterThanOrEqual(20);
    }
  });

  it("today's (2026-07-22) enemy HP is bounded and no longer 64", () => {
    const c = getDailyChallenge(new Date("2026-07-22T12:00:00Z"));
    expect(c.enemyId).toBe("cain_wrath");
    expect(c.enemy.hp).toBeLessThanOrEqual(50);
    expect(c.enemy.hp).not.toBe(64);
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
