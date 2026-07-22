import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Matches the fake-DOM pattern used by preloadCriticalAssets.test.js — this
// module (via imageAssets.js) touches the global Image constructor
// directly, which vitest's "node" environment doesn't provide.
let stall = false;
let constructedCount = 0;

class FakeImage {
  constructor() {
    constructedCount++;
    this._src = "";
    this.onload = null;
    this.onerror = null;
  }
  set src(value) {
    this._src = value;
    if (!stall) queueMicrotask(() => this.onload?.());
    // else: never settles, simulating a stalled/dead connection.
  }
  get src() {
    return this._src;
  }
  decode() {
    return Promise.resolve();
  }
}

globalThis.Image = FakeImage;
globalThis.window = globalThis.window || globalThis;
globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
globalThis.performance = globalThis.performance || { now: () => Date.now() };

beforeEach(() => {
  stall = false;
  constructedCount = 0;
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("preloadHomeCriticalAssets", () => {
  it("caps waiting at 3.5s", async () => {
    const mod = await import("@/lib/preloadHomeAssets");
    expect(mod.HOME_CRITICAL_TIMEOUT_MS).toBe(3500);
  });

  it("lists exactly the five local Home-critical images", async () => {
    const mod = await import("@/lib/preloadHomeAssets");
    expect(mod.HOME_LOCAL_CRITICAL_IMAGES).toEqual([
      "/images/home/home-crest.webp",
      "/images/home/home-trophy.webp",
      "/images/home/home-prayer.webp",
      "/images/home/genesis-horizon.webp",
      "/images/home/home-celestial.png",
    ]);
  });

  it("resolves once all local critical images load and decode successfully", async () => {
    const mod = await import("@/lib/preloadHomeAssets");
    const result = await mod.preloadHomeCriticalAssets();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(mod.HOME_LOCAL_CRITICAL_IMAGES.length);
    expect(result.every((r) => r.loaded)).toBe(true);
  });

  it("never waits past HOME_CRITICAL_TIMEOUT_MS even if artwork never settles", async () => {
    vi.useFakeTimers();
    stall = true;
    const mod = await import("@/lib/preloadHomeAssets");

    let settled = false;
    let value;
    mod.preloadHomeCriticalAssets().then((v) => {
      settled = true;
      value = v;
    });

    await vi.advanceTimersByTimeAsync(mod.HOME_CRITICAL_TIMEOUT_MS);
    expect(settled).toBe(true);
    expect(value).toBe("timeout");
  });

  it("also preloads the difficulty icons when includeDifficultyIcons is true", async () => {
    const mod = await import("@/lib/preloadHomeAssets");
    await mod.preloadHomeCriticalAssets({ includeDifficultyIcons: true });
    // preloadImage dedupes by exact source, so the Image() count reflects
    // the number of *unique* URLs across the two lists, not the raw count.
    const uniqueSources = new Set([
      ...mod.HOME_LOCAL_CRITICAL_IMAGES,
      ...mod.HOME_DIFFICULTY_ICONS,
    ]);
    expect(constructedCount).toBe(uniqueSources.size);
  });

  it("does not construct new Image objects for a source already preloaded", async () => {
    const mod = await import("@/lib/preloadHomeAssets");
    await mod.preloadHomeCriticalAssets();
    const afterFirst = constructedCount;
    await mod.preloadHomeCriticalAssets();
    expect(constructedCount).toBe(afterFirst);
  });
});
