import { describe, it, expect, beforeEach } from "vitest";
import {
  getHpPercent,
  getHpBand,
  getHpBandColor,
  HP_BAND_COLORS,
  getCampHealAmount,
  getProjectedHp,
  isLowHp,
  CAMP_HEAL_RATIO,
} from "@/game/hpStatus";

// localStorage polyfill for the save/continue round-trip (node test env).
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

describe("getHpPercent", () => {
  it("computes a normal percentage", () => {
    expect(getHpPercent(18, 35)).toBeCloseTo((18 / 35) * 100);
  });
  it("returns 0 when maxHp is 0 (defensive, no divide-by-zero)", () => {
    expect(getHpPercent(10, 0)).toBe(0);
    expect(getHpPercent(0, 0)).toBe(0);
  });
  it("clamps to [0, 100]", () => {
    expect(getHpPercent(50, 35)).toBe(100);
    expect(getHpPercent(-5, 35)).toBe(0);
  });
  it("handles missing values", () => {
    expect(getHpPercent(undefined, undefined)).toBe(0);
  });
});

describe("getHpBand", () => {
  it("above 60% is healthy", () => {
    expect(getHpBand(35, 35)).toBe("healthy");
    expect(getHpBand(22, 35)).toBe("healthy"); // ~62.9%
  });
  it("30%–60% is caution (inclusive of both ends)", () => {
    expect(getHpBand(21, 35)).toBe("caution"); // 60%
    expect(getHpBand(11, 35)).toBe("caution"); // ~31.4%
    expect(getHpBand(3, 10)).toBe("caution");  // exactly 30%
  });
  it("below 30% is danger", () => {
    expect(getHpBand(10, 35)).toBe("danger"); // ~28.6%
    expect(getHpBand(0, 35)).toBe("danger");
  });
  it("maxHp 0 is danger, not a crash", () => {
    expect(getHpBand(0, 0)).toBe("danger");
  });
});

describe("getHpBandColor", () => {
  it("maps each band to its muted colour", () => {
    expect(getHpBandColor(35, 35)).toBe(HP_BAND_COLORS.healthy);
    expect(getHpBandColor(18, 35)).toBe(HP_BAND_COLORS.caution);
    expect(getHpBandColor(5, 35)).toBe(HP_BAND_COLORS.danger);
  });
});

describe("camp heal math (mirrors RestRoom's 30%)", () => {
  it("uses the 0.3 ratio, floored", () => {
    expect(CAMP_HEAL_RATIO).toBe(0.3);
    expect(getCampHealAmount(35)).toBe(10); // Math.floor(10.5)
    expect(getCampHealAmount(40)).toBe(12);
    expect(getCampHealAmount(0)).toBe(0);
  });
  it("projects HP after rest, capped at max (never over-promises)", () => {
    expect(getProjectedHp(18, 35, getCampHealAmount(35))).toBe(28); // 18 + 10
    expect(getProjectedHp(33, 35, getCampHealAmount(35))).toBe(35); // capped
    expect(getProjectedHp(35, 35, getCampHealAmount(35))).toBe(35); // already full
  });
});

describe("isLowHp advisory", () => {
  it("is true below 30%", () => {
    expect(isLowHp(8, 35)).toBe(true);
    expect(isLowHp(21, 35)).toBe(false); // 60%
    expect(isLowHp(3, 10)).toBe(false); // exactly 30% → not low
  });
});

describe("save/continue preserves HUD source values (no fallback to full HP)", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips playerHp/maxHp/difficulty/gold/hero and re-derives the same HUD state", async () => {
    const { saveStoryRun, loadStoryRun } = await import("@/game/storyRunSave");
    const run = {
      hero: { id: "adam", name: "Adam", icon: "👨" },
      phase: "map",
      playerHp: 18,
      maxHp: 35,
      deck: ["sling_stone", "faith_shield"],
      isDaily: false,
      difficulty: "hard",
      gold: 120,
    };
    saveStoryRun(run);
    const restored = loadStoryRun();

    expect(restored.playerHp).toBe(18); // not reset to maxHp
    expect(restored.maxHp).toBe(35);
    expect(restored.difficulty).toBe("hard");
    expect(restored.gold).toBe(120);
    expect(restored.hero.name).toBe("Adam");

    // The HUD derives from these values — same numbers in, same band out.
    expect(getHpBand(restored.playerHp, restored.maxHp)).toBe(getHpBand(18, 35));
    expect(getHpPercent(restored.playerHp, restored.maxHp)).toBeCloseTo(getHpPercent(18, 35));
  });
});
