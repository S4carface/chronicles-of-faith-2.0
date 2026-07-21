const imagePromises = new Map();
const failedSources = new Set();

export const IMMEDIATE_IMAGE_TIMEOUT_MS = 4000;

export function preloadImage(src) {
  if (!src) return Promise.resolve(false);
  if (imagePromises.has(src)) return imagePromises.get(src);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // onload still means the browser has a usable fallback image.
      }
      failedSources.delete(src);
      resolve(true);
    };
    image.onerror = () => {
      failedSources.add(src);
      resolve(false);
    };
    image.src = src;
  });

  imagePromises.set(src, promise);
  return promise;
}

// True once a source has resolved false (failed to load). Lets callers
// (SafeImage) decide when to offer a retry instead of a permanent fallback.
export function hasFailedToLoad(src) {
  return failedSources.has(src);
}

// One controlled retry per failure: once connectivity returns, drop any
// failed sources from the cache so the next preloadImage(src) call for them
// is a genuinely fresh attempt instead of replaying the stale failure.
// Registered once at module load — ES module top-to-bottom execution order
// means this always runs before any React-effect-registered "online"
// listener reacting to the same event, so a component's own retry effect
// can rely on the cache already being cleared by the time it fires.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    failedSources.forEach((src) => imagePromises.delete(src));
    failedSources.clear();
  });
}

export function preloadImages(sources, timeoutMs = IMMEDIATE_IMAGE_TIMEOUT_MS) {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  if (!uniqueSources.length) return Promise.resolve([]);

  const ready = Promise.all(uniqueSources.map(preloadImage));
  const timeout = new Promise((resolve) => {
    window.setTimeout(() => resolve([]), timeoutMs);
  });

  return Promise.race([ready, timeout]);
}
