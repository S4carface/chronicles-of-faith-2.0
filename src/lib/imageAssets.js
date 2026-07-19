const imagePromises = new Map();

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
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = src;
  });

  imagePromises.set(src, promise);
  return promise;
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
