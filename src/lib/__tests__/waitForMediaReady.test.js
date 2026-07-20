import { describe, it, expect, vi } from "vitest";
import { waitForMediaReady, isMediaTimeoutError } from "@/lib/waitForMediaReady";

class FakeMediaElement {
  constructor(readyState = 0) {
    this.readyState = readyState;
    this.error = null;
    this._listeners = {};
  }
  addEventListener(type, cb) {
    (this._listeners[type] ||= []).push(cb);
  }
  removeEventListener(type, cb) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== cb);
  }
  fire(type) {
    (this._listeners[type] || []).forEach((cb) => cb());
  }
}

describe("waitForMediaReady", () => {
  it("resolves immediately when the element is already past the readyState threshold", async () => {
    const media = new FakeMediaElement(4);
    await expect(waitForMediaReady(media, { timeoutMs: 1000 })).resolves.toBeUndefined();
  });

  it("resolves once 'canplay' fires for an element that starts unready", async () => {
    const media = new FakeMediaElement(0);
    const promise = waitForMediaReady(media, { timeoutMs: 1000 });
    media.readyState = 3;
    media.fire("canplay");
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects with a real media error (not a timeout) when 'error' fires", async () => {
    const media = new FakeMediaElement(0);
    media.error = new Error("decode failed");
    const promise = waitForMediaReady(media, { timeoutMs: 1000 });
    media.fire("error");
    await expect(promise).rejects.toThrow("decode failed");

    let caught;
    try {
      await promise;
    } catch (e) {
      caught = e;
    }
    expect(isMediaTimeoutError(caught)).toBe(false);
  });

  it("rejects when neither event fires in time, distinguishable via isMediaTimeoutError", async () => {
    vi.useFakeTimers();
    try {
      const media = new FakeMediaElement(0);
      const promise = waitForMediaReady(media, { timeoutMs: 5000 });
      let caught;
      const assertion = promise.catch((e) => { caught = e; });
      vi.advanceTimersByTime(5000);
      await assertion;
      expect(caught.message).toBe("timeout");
      expect(isMediaTimeoutError(caught)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not resolve or reject twice — a late event after the timeout has no effect", async () => {
    vi.useFakeTimers();
    const media = new FakeMediaElement(0);
    const promise = waitForMediaReady(media, { timeoutMs: 10 });
    let settleCount = 0;
    promise.catch(() => {
      settleCount += 1;
    });

    vi.advanceTimersByTime(10);
    await Promise.resolve();
    media.fire("canplay"); // late — must be a no-op, listener was already removed
    await Promise.resolve();

    expect(settleCount).toBe(1);
    vi.useRealTimers();
  });
});
