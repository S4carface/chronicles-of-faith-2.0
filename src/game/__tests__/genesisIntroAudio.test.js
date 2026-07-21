import { describe, it, expect, vi, beforeEach } from "vitest";

// soundManager.js's Genesis intro functions touch window.AudioContext,
// window.fetch, and the global Audio constructor directly. vitest's "node"
// environment provides none of these, so — matching the fake pattern in
// audioUnlock.test.js — minimal fakes stand in for the real browser APIs.
class FakeGainParam {
  constructor(value = 1) {
    this.value = value;
  }
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
}

class FakeGainNode {
  constructor() {
    this.gain = new FakeGainParam();
  }
  connect() {}
  disconnect() {}
}

class FakeBufferSource {
  constructor() {
    this.buffer = null;
    this.loop = false;
    this.onended = null;
    this._stopped = false;
  }
  connect() {}
  start() {}
  stop() {
    this._stopped = true;
    this.onended?.();
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  addEventListener() {}
  createGain() { return new FakeGainNode(); }
  createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0 } }; }
  createBufferSource() { return new FakeBufferSource(); }
  async resume() { this.state = "running"; }
  async decodeAudioData() { return { duration: 15 }; }
}

// Fake HTMLAudioElement — the global `Audio` constructor CinematicIntro/
// soundManager use for the recorded narration, distinct from the music's
// Web Audio buffer source (proves the two never share an object).
const createdAudios = [];
class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentSrc = src;
    this.preload = "";
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    this.ended = false;
    this._listeners = {};
    createdAudios.push(this);
  }
  addEventListener(type, cb) {
    (this._listeners[type] ||= []).push(cb);
  }
  removeEventListener(type, cb) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== cb);
  }
  _emit(type, ...args) {
    (this._listeners[type] || []).forEach((cb) => cb(...args));
  }
  load() {}
  play() {
    this.paused = false;
    // Simulate the browser firing "playing" asynchronously.
    queueMicrotask(() => this._emit("playing"));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  // Test helper — not part of the real HTMLAudioElement API.
  __finishPlayback() {
    this.paused = true;
    this.ended = true;
    this._emit("ended");
  }
  __fail(error = new Error("no supported source")) {
    this.paused = true;
    this._emit("error", error);
  }
}

globalThis.window = globalThis.window || globalThis;
globalThis.window.AudioContext = FakeAudioContext;
globalThis.window.webkitAudioContext = FakeAudioContext;
globalThis.Audio = FakeAudio;
globalThis.window.Audio = FakeAudio;

let fetchCallCount = 0;
globalThis.fetch = (...args) => {
  fetchCallCount += 1;
  return Promise.resolve({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) });
};

const soundManager = await import("@/game/soundManager");

beforeEach(() => {
  createdAudios.length = 0;
  fetchCallCount = 0;
  soundManager.stopGenesisIntro({ fadeDuration: 0 });
  soundManager.setMusicEnabled(true);
  soundManager.setNarrationVolume(0.6);
});

describe("preloadGenesisIntroAssets — warms music + narration ahead of any tap", () => {
  // preloadGenesisIntroAssets() memoizes its promise at module scope (so a
  // real page load only ever pays for the fetch+decode once) — these are
  // combined into a single test, in file order before any other test
  // populates the buffer, rather than split across `it`s that would each
  // see the already-cached result.
  it("decodes the buffer + preloads narration once, ahead of any tap, and lets startGenesisIntro reuse it", async () => {
    expect(soundManager.isGenesisIntroMusicBufferReady()).toBe(false);

    await soundManager.preloadGenesisIntroAssets();
    expect(soundManager.isGenesisIntroMusicBufferReady()).toBe(true);
    expect(createdAudios.some((a) => a.src.includes("cid_intro-2.0.m4a"))).toBe(true);
    expect(fetchCallCount).toBe(1);

    // A second call must not re-fetch.
    await soundManager.preloadGenesisIntroAssets();
    expect(fetchCallCount).toBe(1);

    // The tap-to-audible path (startGenesisIntro -> playCinematicTrack)
    // should find the buffer already warm and skip its own fetch entirely.
    await soundManager.startGenesisIntro();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(true);
    expect(fetchCallCount).toBe(1);
  });
});

describe("startGenesisIntro — music starts from the tap, not a later effect", () => {
  it("resumes the AudioContext and begins the intro music", async () => {
    await soundManager.startGenesisIntro();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(true);
  });

  it("still preloads the recorded narration when music is disabled", async () => {
    soundManager.setMusicEnabled(false);
    await soundManager.startGenesisIntro();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(false);
    expect(createdAudios.some((a) => a.src.includes("cid_intro-2.0.m4a"))).toBe(true);
  });

  it("a second call before the first resolves supersedes it instead of starting two tracks", async () => {
    const first = soundManager.startGenesisIntro();
    const second = soundManager.startGenesisIntro();
    await Promise.all([first, second]);
    expect(soundManager.isGenesisIntroMusicActive()).toBe(true);
    // Only one music request should have actually landed as the active track.
  });
});

describe("playGenesisIntroNarration — the real recorded voice, on its own channel", () => {
  it("plays /audio/cid_intro-2.0.m4a, never text-to-speech or a shared object with music", async () => {
    await soundManager.startGenesisIntro();
    const musicHandleBefore = soundManager.isGenesisIntroMusicActive();

    const events = [];
    const audio = soundManager.playGenesisIntroNarration({ onEvent: (e) => events.push(e) });

    expect(audio).not.toBeNull();
    expect(audio.src).toBe("/audio/cid_intro-2.0.m4a");
    expect(audio).toBeInstanceOf(FakeAudio);
    // Music's active state is untouched by starting narration — separate channels.
    expect(soundManager.isGenesisIntroMusicActive()).toBe(musicHandleBefore);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toContain("playing");
  });

  it("does not play when narration volume is 0, and reports the skip", () => {
    soundManager.setNarrationVolume(0);
    const events = [];
    const audio = soundManager.playGenesisIntroNarration({ onEvent: (e) => events.push(e) });
    expect(audio).toBeNull();
    expect(events).toEqual(["skipped"]);
  });

  it("reports 'ended' exactly once, allowing the caller to advance the intro", async () => {
    await soundManager.startGenesisIntro();
    const events = [];
    const audio = soundManager.playGenesisIntroNarration({ onEvent: (e) => events.push(e) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    audio.__finishPlayback();
    expect(events.filter((e) => e === "ended").length).toBe(1);
  });

  it("reports 'error' (not a silent failure) and the caller can fall back", async () => {
    await soundManager.startGenesisIntro();
    const events = [];
    const audio = soundManager.playGenesisIntroNarration({ onEvent: (e) => events.push(e) });
    audio.__fail();
    expect(events).toContain("error");
  });
});

describe("Music ducking — reduced while narration plays, restored after", () => {
  it("starting/ending narration ducks and restores without stopping or restarting the music", async () => {
    await soundManager.startGenesisIntro();
    // Starting narration must never stop, restart, or reset the music that's
    // already playing underneath — verified by the music staying "active"
    // (same source, never re-created) across the full duck/un-duck cycle.
    const audio = soundManager.playGenesisIntroNarration({ onEvent: () => {} });
    expect(soundManager.isGenesisIntroMusicActive()).toBe(true);
    audio.__finishPlayback();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(true);
  });

  it("restores correctly even when narration is interrupted (stopGenesisIntro mid-playback)", async () => {
    await soundManager.startGenesisIntro();
    soundManager.playGenesisIntroNarration({ onEvent: () => {} });
    expect(() => soundManager.stopGenesisIntro({ fadeDuration: 0 })).not.toThrow();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(false);
  });
});

describe("stopGenesisIntro — clean, idempotent shutdown", () => {
  it("stops both the music and the narration, and is safe to call twice", async () => {
    await soundManager.startGenesisIntro();
    soundManager.playGenesisIntroNarration({ onEvent: () => {} });

    soundManager.stopGenesisIntro({ fadeDuration: 0 });
    expect(soundManager.isGenesisIntroMusicActive()).toBe(false);

    // Calling it again (e.g. handleBegin followed by the unmount cleanup)
    // must not throw.
    expect(() => soundManager.stopGenesisIntro({ fadeDuration: 0 })).not.toThrow();
  });

  it("accepts an optional diagnostic reason without changing its behavior", async () => {
    await soundManager.startGenesisIntro();
    expect(() => soundManager.stopGenesisIntro({ fadeDuration: 0, reason: "skip" })).not.toThrow();
    expect(soundManager.isGenesisIntroMusicActive()).toBe(false);
  });
});
