import { CARD_ART, HOME_ART } from "@/data/art";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function preloadDevLog(...args) {
  if (import.meta.env?.DEV) console.info("[Opening Preload]", ...args);
}

export const CRITICAL_FIRST_RUN_ASSETS = Object.freeze({
  images: [
    "/images/intro/intro_poster.PNG",
    "/images/intro/intro-poster-2.0.PNG",
    HOME_ART.cross,
    "/images/enemies/serpent.PNG",
    "/images/hero-backgrounds/adam-eden-2.0.PNG",
    CARD_ART.sling_stone,
    CARD_ART.faith_shield,
    CARD_ART.prayer,
  ],
  audio: [
    "/audio/cid_intro-2.0.m4a",
    "/audio/genesis_intro_music_15s.mp3",
  ],
  video: ["/video/genesis_intro.mp4"],
});

export const CRITICAL_ASSET_TIMEOUT_MS = 6000;

let preloadPromise;
let videoPreloadPromise;

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // A successful load is still usable when a browser cannot decode eagerly.
      }
      resolve(src);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function preloadMedia(src, kind) {
  return new Promise((resolve, reject) => {
    const media = document.createElement(kind);
    let settled = false;
    const finish = (callback) => () => {
      if (settled) return;
      settled = true;
      media.removeEventListener("loadedmetadata", finishLoad);
      media.removeEventListener("canplay", finishLoad);
      media.removeEventListener("error", finishError);
      callback(src);
    };
    const finishLoad = finish(resolve);
    const finishError = finish(reject);

    media.preload = "auto";
    if (kind === "video") {
      media.muted = true;
      media.playsInline = true;
    }
    media.addEventListener("loadedmetadata", finishLoad, { once: true });
    media.addEventListener("canplay", finishLoad, { once: true });
    media.addEventListener("error", finishError, { once: true });
    media.src = src;
    media.load();
  });
}

// The video is intentionally excluded from the blocking readiness race below.
// It's by far the largest of the critical assets, and CinematicIntro already
// falls back to its poster image when the video itself isn't ready yet, so
// gating "Tap to Begin" on a fully-preloaded video just adds silent wait time
// for no playback benefit. It's still warmed here, fire-and-forget, so it's
// likely cached by the time the cinematic actually needs it.
export function preloadCriticalVideoAssets() {
  if (videoPreloadPromise) return videoPreloadPromise;
  const startedAt = nowMs();
  videoPreloadPromise = Promise.allSettled(
    CRITICAL_FIRST_RUN_ASSETS.video.map((src) => preloadMedia(src, "video"))
  ).then((results) => {
    preloadDevLog("Video ready (or settled)", {
      elapsedMs: (nowMs() - startedAt).toFixed(1),
      results: results.map((r) => r.status),
    });
    return results;
  });
  return videoPreloadPromise;
}

export function preloadCriticalFirstRunAssets() {
  if (preloadPromise) return preloadPromise;
  const startedAt = nowMs();
  preloadDevLog("Media preload start", { startedAt, timeoutMs: CRITICAL_ASSET_TIMEOUT_MS });

  // Fire-and-forget: warms the video cache without blocking readiness below.
  preloadCriticalVideoAssets();

  const assetsReady = Promise.allSettled([
    ...CRITICAL_FIRST_RUN_ASSETS.images.map(preloadImage),
    ...CRITICAL_FIRST_RUN_ASSETS.audio.map((src) => preloadMedia(src, "audio")),
  ]).then((results) => {
    preloadDevLog("Images + audio ready", {
      elapsedMs: (nowMs() - startedAt).toFixed(1),
      results: results.map((r) => r.status),
    });
    return results;
  });
  const timeout = new Promise((resolve) => {
    window.setTimeout(() => {
      preloadDevLog("Critical asset timeout reached", { elapsedMs: (nowMs() - startedAt).toFixed(1) });
      resolve("timeout");
    }, CRITICAL_ASSET_TIMEOUT_MS);
  });

  preloadPromise = Promise.race([assetsReady, timeout]);
  return preloadPromise;
}
