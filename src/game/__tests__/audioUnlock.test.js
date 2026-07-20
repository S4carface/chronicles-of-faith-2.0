import { describe, it, expect, vi, beforeEach } from "vitest";

// soundManager.js touches window.AudioContext, window.speechSynthesis, and
// SpeechSynthesisUtterance directly. vitest's "node" environment doesn't
// provide any of these, so — matching the MemoryStorage polyfill pattern
// used by weeklyLeaderboard.test.js — we install minimal fakes that behave
// enough like the real APIs to exercise the unlock/settings-sync logic.
class FakeGainParam {
  constructor(value = 1) {
    this.value = value;
  }
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}

class FakeGainNode {
  constructor() {
    this.gain = new FakeGainParam();
  }
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
    this._listeners = new Map();
  }
  addEventListener(type, cb) {
    this._listeners.set(type, cb);
  }
  createGain() {
    return new FakeGainNode();
  }
  createOscillator() {
    return {
      connect() {},
      start() {},
      stop() {},
      frequency: { value: 0 },
    };
  }
  createBufferSource() {
    return { connect() {}, start() {}, stop() {}, disconnect() {} };
  }
  async resume() {
    this.state = "running";
    return undefined;
  }
  async decodeAudioData() {
    return { duration: 1 };
  }
}

class FakeSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
  }
}

class FakeSpeechSynthesis {
  constructor() {
    this.spoken = [];
  }
  speak(utterance) {
    this.spoken.push(utterance);
    // Simulate the browser firing onstart then onend asynchronously.
    queueMicrotask(() => utterance.onstart?.());
    queueMicrotask(() => utterance.onend?.());
  }
  cancel() {}
  getVoices() {
    return [];
  }
}

globalThis.window = globalThis.window || globalThis;
globalThis.window.AudioContext = FakeAudioContext;
globalThis.window.webkitAudioContext = FakeAudioContext;
globalThis.window.speechSynthesis = new FakeSpeechSynthesis();
globalThis.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
globalThis.window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
globalThis.fetch = globalThis.fetch || (async () => ({ ok: false, status: 404 }));

const soundManager = await import("@/game/soundManager");

describe("ensureAudioUnlocked", () => {
  it("resolves true once the (fake) AudioContext resumes to running", async () => {
    const unlocked = await soundManager.ensureAudioUnlocked();
    expect(unlocked).toBe(true);
    expect(soundManager.isAudioUnlocked()).toBe(true);
  });
});

describe("toBoolean — settings must not treat the string \"false\" as truthy", () => {
  it("coerces the literal string \"false\" to boolean false", () => {
    expect(soundManager.toBoolean("false")).toBe(false);
  });

  it("coerces the literal string \"true\" to boolean true", () => {
    expect(soundManager.toBoolean("true")).toBe(true);
  });

  it("passes real booleans through unchanged", () => {
    expect(soundManager.toBoolean(true)).toBe(true);
    expect(soundManager.toBoolean(false)).toBe(false);
  });

  it("falls back to the default for undefined/null", () => {
    expect(soundManager.toBoolean(undefined, true)).toBe(true);
    expect(soundManager.toBoolean(null, false)).toBe(false);
  });
});

describe("setMusicEnabled / setSfxEnabled — string-safe", () => {
  it("setMusicEnabled(\"false\") actually disables music, not treats it as on", () => {
    soundManager.setMusicEnabled("false");
    // No direct getter exists for musicEnabled, but needsUnlockPrompt()
    // short-circuits to false when both music and sfx are off — a reliable
    // externally-observable signal that the string was coerced correctly.
    soundManager.setSfxEnabled("false");
    expect(soundManager.needsUnlockPrompt()).toBe(false);
    // Restore defaults for subsequent tests in this file.
    soundManager.setMusicEnabled(true);
    soundManager.setSfxEnabled(true);
  });
});

describe("speakNarration — Preview Voice state feedback", () => {
  it("calls onStateChange with start then end for a successful preview", async () => {
    const states = [];
    const utterance = soundManager.speakNarration(
      "In the beginning...",
      0.6,
      "system",
      (state) => states.push(state)
    );
    expect(utterance).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(states).toEqual(["start", "end"]);
  });

  it("returns null and does not throw when volume is 0", () => {
    const utterance = soundManager.speakNarration("text", 0, "system");
    expect(utterance).toBeNull();
  });
});
