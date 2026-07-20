// Waits for an HTMLMediaElement (video or audio) to reach a playable
// readyState, or rejects on a genuine media error / timeout. Kept separate
// from CinematicIntro.jsx so the "was this a real error or just still
// loading" distinction — the thing that actually matters for deciding
// whether a caller should reset the element via .load() — is independently
// testable without a DOM/React test environment.
//
// Regression this exists to prevent: resetting a merely-slow-but-still-
// buffering video via .load() throws away whatever progress it already
// made, which can turn "a bit slow" into "never becomes ready." Callers
// should only reload on isMediaTimeoutError(error) === false (a real error).
export function waitForMediaReady(media, { timeoutMs, readyStateThreshold = 3 } = {}) {
  if (media.readyState >= readyStateThreshold) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(() => reject(new Error("timeout"))), timeoutMs);
    const finish = (action) => {
      clearTimeout(timeout);
      media.removeEventListener("canplay", onReady);
      media.removeEventListener("error", onError);
      action();
    };
    const onReady = () => finish(resolve);
    const onError = () => finish(() => reject(media.error || new Error("media error")));
    media.addEventListener("canplay", onReady, { once: true });
    media.addEventListener("error", onError, { once: true });
  });
}

// True when the rejection came from waitForMediaReady's own timeout rather
// than a real media error event — the signal callers use to decide whether
// a .load()-triggered reload is warranted (real error) or would just
// discard buffered progress for no benefit (mere timeout).
export function isMediaTimeoutError(error) {
  return error?.message === "timeout";
}
