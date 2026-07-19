import { CARD_ART, HOME_ART } from "@/data/art";

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

export const CRITICAL_ASSET_TIMEOUT_MS = 12000;

let preloadPromise;

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

export function preloadCriticalFirstRunAssets() {
  if (preloadPromise) return preloadPromise;

  const assetsReady = Promise.allSettled([
    ...CRITICAL_FIRST_RUN_ASSETS.images.map(preloadImage),
    ...CRITICAL_FIRST_RUN_ASSETS.audio.map((src) => preloadMedia(src, "audio")),
    ...CRITICAL_FIRST_RUN_ASSETS.video.map((src) => preloadMedia(src, "video")),
  ]);
  const timeout = new Promise((resolve) => {
    window.setTimeout(() => resolve("timeout"), CRITICAL_ASSET_TIMEOUT_MS);
  });

  preloadPromise = Promise.race([assetsReady, timeout]);
  return preloadPromise;
}
