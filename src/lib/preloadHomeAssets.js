import { HOME_ART } from "@/data/art";
import { preloadImage, preloadImages } from "@/lib/imageAssets";

// The Home artwork that must be decoded before Home is ever revealed — see
// the SafeImage usages in Home.jsx / HomeGenesisAtmosphere.jsx that render
// these exact sources. Kept as the single source of truth for both the
// preload gate below and the components that render them, so the two can
// never drift out of sync.
export const HOME_CREST_ART = "/images/home/home-crest.webp";
export const HOME_TROPHY_ART = "/images/home/home-trophy.webp";
export const HOME_GENESIS_HORIZON_ART = "/images/home/genesis-horizon.webp";
export const HOME_BACKGROUND_ART = "/images/home/home-celestial.png";

// All four are local, same-origin files — this is also the exact list the
// service worker (public/sw.js) caches with a cache-first strategy.
export const HOME_LOCAL_CRITICAL_IMAGES = Object.freeze([
  HOME_CREST_ART,
  HOME_TROPHY_ART,
  HOME_GENESIS_HORIZON_ART,
  HOME_BACKGROUND_ART,
]);

// Cross-origin (base44 media host) — preloaded/decoded alongside the local
// critical images for returning players (they're immediately visible below
// Start Journey once the tutorial is done), but intentionally left out of
// the service worker's cache list: caching opaque cross-origin responses is
// a different, less verifiable risk than caching our own static files.
export const HOME_DIFFICULTY_ICONS = Object.freeze([
  HOME_ART.difficulty_easy,
  HOME_ART.difficulty_normal,
  HOME_ART.difficulty_hard,
]);

// Maximum time Home will wait on its own critical artwork before revealing
// anyway with styled fallbacks — never traps the player behind the loading
// screen on a dead or very slow connection.
export const HOME_CRITICAL_TIMEOUT_MS = 3500;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function preloadDevLog(...args) {
  if (import.meta.env?.DEV) console.info("[Home Preload]", ...args);
}

let homeCriticalPromise;
let homeCriticalIncludedIcons = false;

// preloadHomeCriticalAssets: preloads and decodes only the assets required
// for the first visible Home frame (crest, trophy, Genesis horizon, Home
// background, and — for returning players — the three difficulty icons).
// Dedup is inherited from preloadImage's own module-level cache, so this is
// safe to call more than once (e.g. a remount) without refetching anything
// already in flight or already resolved. Never rejects and never hangs
// longer than HOME_CRITICAL_TIMEOUT_MS.
export function preloadHomeCriticalAssets({ includeDifficultyIcons = false } = {}) {
  // A first call without difficulty icons, followed by a later call that
  // needs them (tutorial completes mid-session), should still preload the
  // icons rather than returning the earlier, narrower promise forever.
  if (homeCriticalPromise && (!includeDifficultyIcons || homeCriticalIncludedIcons)) {
    return homeCriticalPromise;
  }

  homeCriticalIncludedIcons = includeDifficultyIcons;
  const sources = includeDifficultyIcons
    ? [...HOME_LOCAL_CRITICAL_IMAGES, ...HOME_DIFFICULTY_ICONS]
    : HOME_LOCAL_CRITICAL_IMAGES;

  const startedAt = nowMs();

  const ready = Promise.allSettled(sources.map((src) => preloadImage(src))).then((results) => {
    const summary = sources.map((src, i) => ({
      src,
      loaded: results[i].status === "fulfilled" && results[i].value === true,
    }));
    preloadDevLog("Home-critical assets settled", {
      elapsedMs: (nowMs() - startedAt).toFixed(1),
      summary,
    });
    return summary;
  });

  const timeout = new Promise((resolve) => {
    window.setTimeout(() => {
      preloadDevLog("Home-critical timeout reached", {
        elapsedMs: (nowMs() - startedAt).toFixed(1),
      });
      resolve("timeout");
    }, HOME_CRITICAL_TIMEOUT_MS);
  });

  homeCriticalPromise = Promise.race([ready, timeout]);
  return homeCriticalPromise;
}

// preloadDeferredGameAssets: fire-and-forget warm-up for assets that are
// likely needed soon but must never gate a screen reveal — called only
// after Home itself is already visible, so it never competes with the
// critical Home frame for bandwidth on a slow connection.
export function preloadDeferredGameAssets() {
  preloadImages(HOME_DIFFICULTY_ICONS);
}
