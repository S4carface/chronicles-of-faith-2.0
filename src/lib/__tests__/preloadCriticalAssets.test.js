import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// preloadCriticalAssets.js touches the global Image constructor and
// document.createElement("audio"|"video") directly. vitest's "node"
// environment provides neither, so — matching the fake pattern used
// throughout this repo's tests — minimal fakes stand in for the DOM.
class FakeImage {
  constructor() {
    this._src = "";
    this.onload = null;
    this.onerror = null;
  }
  set src(value) {
    this._src = value;
    // Simulate a fast, successful image load.
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
  decode() {
    return Promise.resolve();
  }
}

class FakeMediaElement {
  constructor(kind) {
    this.kind = kind;
    this.preload = "";
    this.muted = false;
    this.playsInline = false;
    this._src = "";
    this._listeners = {};
  }
  addEventListener(type, cb) {
    (this._listeners[type] ||= []).push(cb);
  }
  removeEventListener(type, cb) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== cb);
  }
  set src(value) {
    this._src = value;
  }
  get src() {
    return this._src;
  }
  load() {}
  _emit(type) {
    (this._listeners[type] || []).forEach((cb) => cb());
  }
}

// Toggled per-test: when true, audio/video elements never fire a ready
// event, simulating a stalled/never-loading asset.
let mediaStalls = false;
let createdVideoElements = [];
let createdAudioElements = [];

globalThis.Image = FakeImage;
globalThis.window = globalThis.window || globalThis;
globalThis.document = {
  createElement: (kind) => {
    const el = new FakeMediaElement(kind);
    if (kind === "video") createdVideoElements.push(el);
    if (kind === "audio") createdAudioElements.push(el);
    if (!mediaStalls) {
      queueMicrotask(() => el._emit("canplay"));
    }
    return el;
  },
};

beforeEach(() => {
  mediaStalls = false;
  createdVideoElements = [];
  createdAudioElements = [];
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("preloadCriticalFirstRunAssets — video no longer blocks readiness", () => {
  it("uses a 6s cap now that only images + audio are in the blocking race", async () => {
    const mod = await import("@/lib/preloadCriticalAssets");
    expect(mod.CRITICAL_ASSET_TIMEOUT_MS).toBe(6000);
  });

  it("resolves once images + audio are ready, without waiting for a never-ready video", async () => {
    mediaStalls = true; // video (and audio, if it were included) would hang forever
    const mod = await import("@/lib/preloadCriticalAssets");

    // Manually let audio resolve (simulating it being fast) while leaving
    // video stalled — this is the real-world "video is slower than audio"
    // case the fix targets.
    const originalCreateElement = globalThis.document.createElement;
    globalThis.document.createElement = (kind) => {
      const el = originalCreateElement(kind);
      if (kind === "audio") queueMicrotask(() => el._emit("canplay"));
      return el;
    };

    const readyPromise = mod.preloadCriticalFirstRunAssets();
    const quickTimeout = new Promise((resolve) => setTimeout(() => resolve("still-pending"), 50));
    const result = await Promise.race([readyPromise.then(() => "ready"), quickTimeout]);

    expect(result).toBe("ready");
    // The video was still kicked off (fire-and-forget cache warm) even
    // though it never blocked readiness.
    expect(createdVideoElements.length).toBeGreaterThan(0);
  });

  it("still warms the video cache alongside the blocking preload", async () => {
    const mod = await import("@/lib/preloadCriticalAssets");
    await mod.preloadCriticalFirstRunAssets();
    expect(createdVideoElements.length).toBe(1);
    expect(createdVideoElements[0].muted).toBe(true);
    expect(createdVideoElements[0].playsInline).toBe(true);
  });

  it("falls back to the timeout if images/audio never settle either", async () => {
    vi.useFakeTimers();
    mediaStalls = true;
    const mod = await import("@/lib/preloadCriticalAssets");

    const readyPromise = mod.preloadCriticalFirstRunAssets();
    let settled = false;
    readyPromise.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(mod.CRITICAL_ASSET_TIMEOUT_MS);
    expect(settled).toBe(true);
  });
});
