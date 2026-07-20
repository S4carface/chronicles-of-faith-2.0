// Procedural sound system using Web Audio API
// Music: layered chord pads + harp arpeggios + bells for a sacred, reverent atmosphere
// SFX: distinct sound families per card type and enemy action
// Narration: voice via SpeechSynthesis API with music ducking
//
// Mobile audio unlock:
//   Browsers (especially iOS Safari) start AudioContext in "suspended" state.
//   We must resume it from a user gesture. playMusic() called before unlock
//   stores a pending theme; the first sfx/gesture call unlocks and starts it.

import { prepareTextForNarration, verbalizeScriptureReference, pickVoice } from "@/game/scriptureVoice";

const MAIN_THEME_URL = "/audio/music/chronicles-main-theme.mp3";

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let mainThemeBuffer = null;
let mainThemeLoadPromise = null;
let mainThemeSource = null;
let mainThemeStartedAt = 0;
let mainThemePausedAt = 0;
let mainThemeRequestId = 0;
let genesisCompletionAudio = null;
let genesisCompletionAudioActive = false;
let musicEnabled = true;
let sfxEnabled = true;

// Settings can arrive as real booleans (normal app flow) or, defensively,
// as strings — a manually-edited localStorage value, or a legacy/corrupted
// save. `Boolean("false")` is true, which would silently invert the user's
// preference, so every enabled-flag setter/read funnels through this.
export function toBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "false") return false;
    if (value.toLowerCase() === "true") return true;
  }
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

let musicVol = 0.5;
function normalizeMusicVolume(vol) {
  const value = Number(vol);

  if (!Number.isFinite(value)) {
    return 0.5;
  }

  const normalized = value > 1 ? value / 100 : value;

  return Math.max(0, Math.min(1, normalized));
}

function getMainThemeVolume(multiplier = 1) {
  return Math.max(
    0,
    Math.min(1, normalizeMusicVolume(musicVol) * 0.18 * multiplier)
  );
}
let sfxVol = 0.5;
let narrationVol = 0.5;
let currentMusicNodes = [];
let musicTimeoutId = null;
let musicTheme = null;
let pendingMusicTheme = null;
let musicPausedForAmbience = false;
let duckedGain = null;
let audioUnlocked = false;
let hasUserInteracted = false; // true once the player has ever unlocked audio via a gesture
let unlockListeners = new Set();

let heroAmbienceSource = null;
let heroAmbienceGain = null;
let heroAmbienceBuffers = new Map();
let heroAmbienceRequestId = 0;

let cinematicSources = [];
let cinematicGains = [];
let cinematicBuffers = new Map();
let cinematicRequestId = 0;
const manuallyStoppedCinematicSources = new WeakSet();

// Lazily create the AudioContext + gain nodes. Does NOT resume on mobile.
function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = audioCtx.createGain();
      musicGain.gain.value = getMainThemeVolume();
      musicGain.connect(audioCtx.destination);
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.3 * sfxVol;
      sfxGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn("[Audio] Failed to create AudioContext:", e);
      audioCtx = null;
    }
  }
  return audioCtx;
}

// Check if the context is in a running (playable) state
function ctxIsRunning() {
  const ctx = getCtx();
  if (!ctx) return false;
  return ctx.state === "running";
}
async function loadMainThemeBuffer() {
  const ctx = getCtx();

  if (!ctx) {
    return null;
  }

  if (mainThemeBuffer) {
    return mainThemeBuffer;
  }

  if (!mainThemeLoadPromise) {
    mainThemeLoadPromise = fetch(MAIN_THEME_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load main theme: ${response.status}`
          );
        }

        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((decodedBuffer) => {
        mainThemeBuffer = decodedBuffer;
        return decodedBuffer;
      })
      .catch((error) => {
        console.warn("[Audio] Main theme failed:", error);
        mainThemeLoadPromise = null;
        return null;
      });
  }

  return mainThemeLoadPromise;
}

function stopMainTheme({ preservePosition = true } = {}) {
  mainThemeRequestId += 1;

  if (
    preservePosition &&
    mainThemeSource &&
    audioCtx &&
    mainThemeBuffer?.duration
  ) {
    mainThemePausedAt =
      (audioCtx.currentTime - mainThemeStartedAt) %
      mainThemeBuffer.duration;
  } else if (!preservePosition) {
    mainThemePausedAt = 0;
  }

  const source = mainThemeSource;
  mainThemeSource = null;

  if (!source) {
    return;
  }

  try {
    source.onended = null;
    source.stop();
  } catch (error) {}

  try {
    source.disconnect();
  } catch (error) {}
}

async function startMainTheme() {
  const ctx = getCtx();

  if (
    !ctx ||
    ctx.state !== "running" ||
    !musicEnabled ||
    musicPausedForAmbience
  ) {
    return false;
  }

  if (mainThemeSource) {
    return true;
  }

  const requestId = ++mainThemeRequestId;
  const buffer = await loadMainThemeBuffer();

  if (
    !buffer ||
    requestId !== mainThemeRequestId ||
    !musicEnabled ||
    musicPausedForAmbience ||
    !ctxIsRunning()
  ) {
    return false;
  }

  const source = ctx.createBufferSource();
  const offset =
    buffer.duration > 0
      ? mainThemePausedAt % buffer.duration
      : 0;

  source.buffer = buffer;
  source.loop = true;
  source.connect(musicGain);
  source.start(0, offset);

  mainThemeSource = source;
  mainThemeStartedAt = ctx.currentTime - offset;

  source.onended = () => {
    if (mainThemeSource === source) {
      mainThemeSource = null;
    }
  };

  return true;
}

// Notify all subscribers of unlock state changes
function notifyUnlockListeners() {
  unlockListeners.forEach((cb) => {
    try { cb(audioUnlocked); } catch (e) {}
  });
}

// Global gesture + lifecycle listener for mobile audio resume.
// Stays registered for the app's lifetime so it can resume audio after
// the browser suspends the AudioContext (mobile background/lock/tab switch).
let globalListenerRegistered = false;

// Centralized "try to resume audio after returning to foreground" logic.
// Called from visibilitychange, pageshow, and focus events.
function tryResumeAfterReturn() {
  if (!hasUserInteracted) return; // respect autoplay rules — don't start audio before first gesture
  let ctx = getCtx();
  if (!ctx) return;

  // If the AudioContext was closed (e.g. long time in background on iOS),
  // discard it and create a fresh one.
  if (ctx.state === "closed") {
    audioCtx = null;
    musicGain = null;
    sfxGain = null;
    ctx = getCtx();
    if (!ctx) return;
  }

  // Clear any stale music state — the setTimeout may have been queued but
  // never fired while the page was frozen, or oscillators may have died
  // when the context was suspended. This ensures a clean restart.
  pauseMusicLoop();

  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    // Attempt direct resume. On desktop and some mobile browsers this works
    // without a gesture. On iOS Safari it usually fails silently — the
    // gesture handler will catch the next tap to complete the resume, and
    // notifyUnlockListeners() here will surface the "Tap to resume" button.
    audioUnlocked = false;
    notifyUnlockListeners(); // show the resume button in case gesture is needed
    const p = ctx.resume();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (ctx.state !== "running") return;
        audioUnlocked = true;
        notifyUnlockListeners();
        restartMusicIfNeeded();
      }).catch(() => {});
    }
  } else if (ctx.state === "running") {
    audioUnlocked = true;
    notifyUnlockListeners();
    restartMusicIfNeeded();
  }
}

// Restart the music loop if it should be playing but isn't
function restartMusicIfNeeded() {
  if (!musicEnabled || musicPausedForAmbience || genesisCompletionAudioActive) return;

  const theme = pendingMusicTheme || musicTheme;

  if (theme) {
    pendingMusicTheme = null;
    playMusic(theme);
  }
}

// Stop the music loop (clears the timeout) without losing the current theme.
// Called when the page goes hidden so we can cleanly restart on return.
function pauseMusicLoop() {
  if (musicTimeoutId) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }

  if (musicTheme) {
    pendingMusicTheme = musicTheme;
  }

  currentMusicNodes.forEach((node) => {
    try {
      node.stop();
    } catch {}
  });
  currentMusicNodes = [];

  stopMainTheme({ preservePosition: true });
}

export function initGlobalUnlockListener() {
  if (globalListenerRegistered) return;
  globalListenerRegistered = true;

  // Gesture handler — stays registered for the app's lifetime.
  // Handles both first-time unlock and post-background resume.
const gestureHandler = () => {
  if (!audioUnlocked || !ctxIsRunning()) {
    unlockAudio();
  }

  if (ctxIsRunning()) {
    audioUnlocked = true;
    hasUserInteracted = true;
    notifyUnlockListeners();
  }

  const theme = pendingMusicTheme || musicTheme;

  if (musicEnabled && !musicPausedForAmbience && !genesisCompletionAudioActive && theme) {
    pendingMusicTheme = null;
    playMusic(theme);
  }
};

  document.addEventListener("touchstart", gestureHandler, true);
  document.addEventListener("pointerdown", gestureHandler, true);
  document.addEventListener("click", gestureHandler, true);
  document.addEventListener("keydown", gestureHandler, true);

  // --- Lifecycle listeners for mobile background/foreground transitions ---

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      tryResumeAfterReturn();
    } else {
      pauseMusicLoop();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // pageshow — fires when returning from BFCache (iOS Safari app switcher)
  const onPageShow = (event) => {
    tryResumeAfterReturn();
  };
  window.addEventListener("pageshow", onPageShow);

  // focus — catches tab switches and some app-switcher returns
  const onFocus = () => {
    tryResumeAfterReturn();
  };
  window.addEventListener("focus", onFocus);

  // blur — pause music cleanly when the window loses focus
  const onBlur = () => {
    pauseMusicLoop();
  };
  window.addEventListener("blur", onBlur);
}

// Attempt to unlock/resume audio from a user gesture.
// Returns true if audio is now playable.
export function unlockAudio() {
  if (audioUnlocked && ctxIsRunning()) return true;
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    const p = ctx.resume();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (ctx.state === "running") {
          audioUnlocked = true;
          hasUserInteracted = true;
          notifyUnlockListeners();
          restartMusicIfNeeded();
        }
      }).catch((e) => {
        console.warn("[Audio] resume() failed:", e);
      });
    }
    // Optimistically set unlocked — some browsers resume synchronously
    if (ctx.state === "running") {
      audioUnlocked = true;
      hasUserInteracted = true;
      notifyUnlockListeners();
      restartMusicIfNeeded();
    }
  } else if (ctx.state === "running") {
    audioUnlocked = true;
    hasUserInteracted = true;
    notifyUnlockListeners();
  }
  return audioUnlocked;
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

// Awaitable variant of unlockAudio() — actually waits for ctx.resume() to
// settle instead of returning a stale synchronous flag. Callers that need to
// know *before* attempting playback whether audio is really unlockable right
// now (e.g. deciding whether to gate narration behind a "Tap to Begin"
// prompt) should use this instead of the fire-and-forget unlockAudio().
export async function ensureAudioUnlocked() {
  if (audioUnlocked && ctxIsRunning()) return true;
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn("[Audio] ensureAudioUnlocked: resume() failed:", e);
    }
  }
  if (ctx.state === "running") {
    audioUnlocked = true;
    hasUserInteracted = true;
    notifyUnlockListeners();
    return true;
  }
  return false;
}

// UI uses this to decide whether to show a "Tap to enable/resume sound" button.
// Returns true when: music is enabled, but the AudioContext is not running
// (either never unlocked, or suspended after returning from background).
export function needsUnlockPrompt() {
  if (!musicEnabled && !sfxEnabled) return false; // both off — no need to prompt
  if (audioUnlocked && ctxIsRunning()) return false;
  return true;
}

// Returns true when the player has previously unlocked audio (first gesture done).
// Used by the UI to choose between "Tap to enable sound" (first time) and
// "Tap to resume sound" (returning from background).
export function isResumeMode() {
  return hasUserInteracted;
}

// Subscribe to audio unlock state changes (returns unsubscribe fn)
export function subscribeUnlock(cb) {
  unlockListeners.add(cb);
  return () => { unlockListeners.delete(cb); };
}

export function setMusicEnabled(enabled) {
  enabled = toBoolean(enabled);
  musicEnabled = enabled;

  if (!enabled) {
    stopMusic();
    pendingMusicTheme = null;
    return;
  }

  if (musicPausedForAmbience) return;

  const theme = musicTheme || pendingMusicTheme;

  if (theme) {
    playMusic(theme);
  }
}

export function setSfxEnabled(enabled) {
  enabled = toBoolean(enabled);
  sfxEnabled = enabled;

  if (!enabled) {
    stopHeroAmbience();
  }
}
export function setMusicVolume(vol) {
  musicVol = normalizeMusicVolume(vol);

  if (musicGain) {
    const ctx = getCtx();

    if (ctx) {
      const targetVolume =
        duckedGain !== null
          ? getMainThemeVolume(0.2)
          : getMainThemeVolume();

      try {
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(
          musicGain.gain.value,
          ctx.currentTime
        );
        musicGain.gain.linearRampToValueAtTime(
          targetVolume,
          ctx.currentTime + 0.1
        );
      } catch (error) {}
    }
  }
}

export function setSfxVolume(vol) {
  sfxVol = vol;
  if (sfxGain) {
    const ctx = getCtx();
    if (ctx) {
      try {
        sfxGain.gain.cancelScheduledValues(ctx.currentTime);
        sfxGain.gain.linearRampToValueAtTime(0.3 * vol, ctx.currentTime + 0.1);
      } catch (e) {}
    }
  }
}

export function setNarrationVolume(vol) {
  narrationVol = vol;
}

// Lower background music to ~20% during narration
export function duckMusic() {
  if (!musicGain || duckedGain !== null) {
    return;
  }

  const ctx = getCtx();

  if (!ctx) {
    return;
  }

  duckedGain = getMainThemeVolume();

  try {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(
      musicGain.gain.value,
      ctx.currentTime
    );
    musicGain.gain.linearRampToValueAtTime(
      getMainThemeVolume(0.2),
      ctx.currentTime + 0.3
    );
  } catch (error) {}
}

export function unDuckMusic() {
  if (!musicGain || duckedGain === null) {
    return;
  }

  const ctx = getCtx();

  if (!ctx) {
    duckedGain = null;
    return;
  }

  try {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(
      musicGain.gain.value,
      ctx.currentTime
    );
    musicGain.gain.linearRampToValueAtTime(
      getMainThemeVolume(),
      ctx.currentTime + 0.5
    );
  } catch (error) {}

  duckedGain = null;
}

function playTone(freq, duration, type = "sine", vol = 0.3, target = null) {
  if (!sfxEnabled && target === sfxGain) return;
  if (!musicEnabled && target === musicGain) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(target || sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("[Audio] playTone error:", e);
  }
}

export async function playHeroAmbience(
  url = "/audio/hero-ambience/adam-eden.mp3"
) {
  const ctx = getCtx();

  if (!ctx || !sfxEnabled || !ctxIsRunning()) {
    return false;
  }

  stopHeroAmbience();

  const requestId = heroAmbienceRequestId;

  try {
if (!heroAmbienceBuffers.has(url)) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load hero ambience: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

  heroAmbienceBuffers.set(url, decodedBuffer);
}
    if (
      requestId !== heroAmbienceRequestId ||
      !sfxEnabled ||
      !ctxIsRunning()
    ) {
      return false;
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = heroAmbienceBuffers.get(url);
    source.loop = true;

    const targetGain = url.includes("noah-ark")
  ? 2.6
  : 2.0;

gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.0);

    source.connect(gain);
    gain.connect(sfxGain);

    source.start();

    heroAmbienceSource = source;
    heroAmbienceGain = gain;

    return true;
  } catch (error) {
    console.warn("[Audio] Hero ambience failed:", error);
    return false;
  }
}

export function stopHeroAmbience() {
  heroAmbienceRequestId += 1;

  if (heroAmbienceGain && audioCtx) {
    try {
      heroAmbienceGain.gain.cancelScheduledValues(audioCtx.currentTime);
      heroAmbienceGain.gain.setValueAtTime(
        heroAmbienceGain.gain.value,
        audioCtx.currentTime
      );
      heroAmbienceGain.gain.linearRampToValueAtTime(
        0,
        audioCtx.currentTime + 0.25
      );
    } catch (error) {}
  }

  const sourceToStop = heroAmbienceSource;

  if (sourceToStop) {
    window.setTimeout(() => {
      try {
        sourceToStop.stop();
      } catch (error) {}
    }, 275);
  }

  heroAmbienceSource = null;
  heroAmbienceGain = null;
}

export async function playCinematicTrack(
  url,
  {
    volume = 1,
    loop = false,
    onEnded = null,
  } = {}
) {
  const ctx = getCtx();

  if (!ctx) {
    return null;
  }

  if (!ctxIsRunning()) {
    try {
      await ctx.resume();
    } catch (error) {
      console.warn("[Audio] Cinematic audio could not resume:", error);
      return null;
    }
  }

  const requestId = cinematicRequestId;

  try {
    if (!cinematicBuffers.has(url)) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load cinematic audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      cinematicBuffers.set(url, decodedBuffer);
    }

    if (requestId !== cinematicRequestId) {
      return null;
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = cinematicBuffers.get(url);
    source.loop = loop;

    gain.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(gain);
    gain.connect(ctx.destination);

    const startedAt = ctx.currentTime;
    const expectedEndTime = startedAt + (source.buffer?.duration || 0);
    source.start();

    cinematicSources.push(source);
    cinematicGains.push(gain);

    source.onended = () => {
      cinematicSources = cinematicSources.filter(
        currentSource => currentSource !== source
      );

      cinematicGains = cinematicGains.filter(
        currentGain => currentGain !== gain
      );

      const endedNaturally =
        !manuallyStoppedCinematicSources.has(source) &&
        !source.loop &&
        ctx.state !== "closed" &&
        ctx.currentTime >= expectedEndTime - 0.1;

      manuallyStoppedCinematicSources.delete(source);

      if (endedNaturally) {
        onEnded?.();
      }
    };

    return {
      source,
      gain,
      context: ctx,
      startedAt,
      duration: source.buffer?.duration ?? null,
    };
  } catch (error) {
    console.warn("[Audio] Cinematic track failed:", error);
    return null;
  }
}

export function stopCinematicTracks(fadeDuration = 0.4) {
  cinematicRequestId += 1;

  const ctx = audioCtx;
  const sourcesToStop = [...cinematicSources];
  sourcesToStop.forEach(source => manuallyStoppedCinematicSources.add(source));

  if (ctx) {
    cinematicGains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(
          Math.max(0.0001, gain.gain.value),
          ctx.currentTime
        );
        gain.gain.linearRampToValueAtTime(
          0,
          ctx.currentTime + fadeDuration
        );
      } catch (error) {}
    });
  }

  window.setTimeout(() => {
    sourcesToStop.forEach((source) => {
      try {
        source.stop();
      } catch (error) {}
    });
  }, Math.ceil(fadeDuration * 1000) + 50);

  cinematicSources = [];
  cinematicGains = [];
}

// === Genesis intro sequence ===
// Centralizes the intro music + recorded narration so BOTH the Start
// Journey/Replay Intro tap handler (GameContext.triggerIntroReplay) and the
// CinematicIntro component operate on the same instances, instead of each
// independently starting their own. This is what makes music start from the
// tap (not a later Genesis-screen effect gated on video readiness) while
// still letting CinematicIntro track playback position for its scripture
// timeline. Narration plays on a separate HTMLAudioElement from the music's
// Web Audio buffer source — starting one never touches, stops, or restarts
// the other.
const GENESIS_INTRO_MUSIC_URL = "/audio/genesis_intro_music_15s.mp3";
const GENESIS_INTRO_NARRATION_URL = "/audio/cid_intro-2.0.m4a";
const GENESIS_INTRO_MUSIC_VOLUME = 0.12;
const GENESIS_INTRO_DUCK_RATIO = 0.3; // ~30% of configured volume while narration plays

let genesisIntroRequestId = 0;
let genesisIntroMusicHandle = null; // { source, gain, context, startedAt, duration }
let genesisNarrationAudio = null;
let genesisNarrationDucked = false;

function genesisIntroDevLog(...args) {
  if (import.meta.env?.DEV) console.info("[Genesis Intro Audio]", ...args);
}

export function isGenesisIntroMusicActive() {
  return !!genesisIntroMusicHandle;
}

/**
 * Called directly from the Start Journey / Replay Intro gesture handler
 * (GameContext.triggerIntroReplay) — not awaited by its caller, but the
 * AudioContext.resume() call it issues happens synchronously within the
 * same tap, which is what iOS Safari's autoplay policy actually requires.
 * Idempotent per intro session via genesisIntroRequestId: a second call
 * (e.g. a fast double-tap) supersedes rather than duplicates the first.
 */
export async function startGenesisIntro() {
  const requestId = ++genesisIntroRequestId;
  const tapAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const ctxStateBefore = audioCtx?.state ?? "(not created yet)";

  genesisIntroDevLog("Start Journey tap — requesting Genesis intro audio", {
    requestId,
    ctxStateBefore,
    musicEnabled,
    narrationVol,
  });

  const unlocked = await ensureAudioUnlocked();
  genesisIntroDevLog("AudioContext resume result", {
    unlocked,
    stateBefore: ctxStateBefore,
    stateAfter: audioCtx?.state,
    elapsedMs: (( typeof performance !== "undefined" ? performance.now() : Date.now()) - tapAt).toFixed(1),
  });

  if (requestId !== genesisIntroRequestId) return; // superseded by a newer call
  if (!unlocked) {
    genesisIntroDevLog("Could not unlock from this gesture — CinematicIntro's Tap to Begin will retry.");
    return;
  }

  // Preload the recorded narration immediately so it's ready by the time the
  // first scripture line appears. Never shares an Audio object with music.
  if (!genesisNarrationAudio) {
    const audio = new Audio(GENESIS_INTRO_NARRATION_URL);
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      console.error(
        "[Genesis Intro Audio] Narration asset failed to load",
        GENESIS_INTRO_NARRATION_URL,
        audio.error
      );
    });
    audio.load();
    genesisNarrationAudio = audio;
  }

  if (!musicEnabled) {
    genesisIntroDevLog("Music disabled in settings — narration will still preload/play on its own.");
    return;
  }

  pauseMusicForAmbience(); // stop the normal ambient loop underneath, if any

  genesisIntroDevLog("Requesting intro music", {
    url: GENESIS_INTRO_MUSIC_URL,
    sinceTapMs: ((typeof performance !== "undefined" ? performance.now() : Date.now()) - tapAt).toFixed(1),
  });

  const handle = await playCinematicTrack(GENESIS_INTRO_MUSIC_URL, {
    volume: GENESIS_INTRO_MUSIC_VOLUME,
    loop: false,
  });

  if (requestId !== genesisIntroRequestId) {
    if (handle) {
      try { handle.source.stop(); } catch (error) {}
    }
    return;
  }

  genesisIntroMusicHandle = handle;
  genesisIntroDevLog("Intro music playback started", {
    started: !!handle,
    sinceTapMs: ((typeof performance !== "undefined" ? performance.now() : Date.now()) - tapAt).toFixed(1),
    effectiveVolume: GENESIS_INTRO_MUSIC_VOLUME,
  });
}

function duckGenesisIntroMusic() {
  if (!genesisIntroMusicHandle || genesisNarrationDucked) return;
  genesisNarrationDucked = true;
  const { gain, context } = genesisIntroMusicHandle;
  try {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(
      GENESIS_INTRO_MUSIC_VOLUME * GENESIS_INTRO_DUCK_RATIO,
      context.currentTime + 0.3
    );
  } catch (error) {}
}

function unduckGenesisIntroMusic() {
  if (!genesisIntroMusicHandle || !genesisNarrationDucked) return;
  genesisNarrationDucked = false;
  const { gain, context } = genesisIntroMusicHandle;
  try {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(GENESIS_INTRO_MUSIC_VOLUME, context.currentTime + 0.6);
  } catch (error) {}
}

/**
 * Play the real recorded narration (/audio/cid_intro-2.0.m4a) — never
 * text-to-speech, never the Settings preview voice. Reuses the element
 * preloaded by startGenesisIntro() when available. Ducks the intro music
 * (not the main theme) while speaking and restores it on end/error/stop.
 * Returns the Audio element so CinematicIntro can track .currentTime for
 * its own scripture-reveal timeline (VERSE_1_START_MS / VERSE_3_START_MS) —
 * the actual sync mechanism is unchanged, only who owns the element moved.
 */
export function playGenesisIntroNarration({ onEvent } = {}) {
  if (!narrationVol || narrationVol <= 0) {
    genesisIntroDevLog("Narration volume is 0 — not playing recorded narration.");
    onEvent?.("skipped");
    return null;
  }

  const audio = genesisNarrationAudio || new Audio(GENESIS_INTRO_NARRATION_URL);
  genesisNarrationAudio = audio;
  // Matches the recorded narration's historical loudness boost (it was
  // mixed quieter than a typical voiceover) — narrationVol is already the
  // 0-1 normalized setting, so this mirrors the previous
  // (narrationVolume/100) * 1.4 calculation exactly.
  audio.volume = Math.max(0, Math.min(1, narrationVol * 1.4));
  try {
    audio.currentTime = 0;
  } catch (error) {}

  duckGenesisIntroMusic();

  const cleanup = () => unduckGenesisIntroMusic();

  audio.addEventListener("ended", () => { onEvent?.("ended"); cleanup(); }, { once: true });
  audio.addEventListener(
    "error",
    () => {
      console.error("[Genesis Intro Audio] Narration playback error", {
        src: GENESIS_INTRO_NARRATION_URL,
        error: audio.error,
      });
      onEvent?.("error", audio.error);
      cleanup();
    },
    { once: true }
  );
  audio.addEventListener("playing", () => {
    genesisIntroDevLog("Narration playing", { currentTime: audio.currentTime, volume: audio.volume });
    onEvent?.("playing");
  });

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.catch((error) => {
      console.error("[Genesis Intro Audio] Narration play() rejected", error);
      onEvent?.("error", error);
      cleanup();
    });
  }

  return audio;
}

/**
 * Stops both the intro music and the recorded narration cleanly. Called on
 * intro completion, skip, or unmount — never from an ordinary re-render.
 */
export function stopGenesisIntro({ fadeDuration = 0.4 } = {}) {
  genesisIntroRequestId += 1; // invalidate any in-flight startGenesisIntro()/narration
  genesisNarrationDucked = false;
  genesisIntroMusicHandle = null;
  stopCinematicTracks(fadeDuration);

  if (genesisNarrationAudio) {
    try { genesisNarrationAudio.pause(); } catch (error) {}
    genesisNarrationAudio = null;
  }
}

// === SOUND EFFECTS ===
// Card type-specific sound families + enemy action sounds.
// Every sfx call attempts to unlock audio (these are triggered by user gestures).
export const sfx = {
  // UI
  click: () => { unlockAudio(); playTone(600, 0.05, "sine", 0.1); },
  hover: () => { playTone(800, 0.03, "sine", 0.05); },

  // Card play base
  cardPlay: () => { unlockAudio(); playTone(440, 0.1, "triangle", 0.12); },

  // Attack cards — sharp, impactful, energetic
  attack: () => {
    unlockAudio();
    playTone(180, 0.08, "sawtooth", 0.18);
    setTimeout(() => playTone(120, 0.1, "sawtooth", 0.14), 40);
  },
  hit: () => {
    playTone(140, 0.1, "sawtooth", 0.16);
    setTimeout(() => playTone(90, 0.08, "square", 0.1), 40);
  },

  // Defense cards — solid, shielding, protective
  defense: () => {
    unlockAudio();
    playTone(220, 0.12, "triangle", 0.16);
    setTimeout(() => playTone(330, 0.15, "sine", 0.1), 50);
  },
  shield: () => {
    playTone(220, 0.12, "triangle", 0.16);
    setTimeout(() => playTone(330, 0.15, "sine", 0.1), 50);
  },

  // Scripture cards — airy, sacred, reverent
  scripture: () => {
    unlockAudio();
    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sine", 0.1), i * 50));
    setTimeout(() => playTone(1047, 0.35, "sine", 0.06), 150);
  },
  heal: () => {
    playTone(523, 0.12, "sine", 0.16);
    setTimeout(() => playTone(659, 0.12, "sine", 0.16), 70);
    setTimeout(() => playTone(784, 0.25, "sine", 0.12), 140);
  },

  // Miracle cards — divine, majestic
  miracle: () => {
    unlockAudio();
    for (let i = 0; i < 5; i++) setTimeout(() => playTone(523 + i * 131, 0.25, "sine", 0.1), i * 45);
    setTimeout(() => playTone(2093, 0.4, "sine", 0.05), 225);
  },

  // Enemy action sounds — distinct families
  enemyAttack: () => {
    playTone(120, 0.12, "sawtooth", 0.16);
    setTimeout(() => playTone(80, 0.1, "square", 0.1), 70);
  },
  enemyDefend: () => {
    playTone(160, 0.15, "triangle", 0.1);
    setTimeout(() => playTone(200, 0.12, "sine", 0.08), 70);
  },
  enemyHeal: () => {
    playTone(392, 0.15, "sine", 0.1);
    setTimeout(() => playTone(523, 0.2, "sine", 0.08), 80);
  },
  enemyCurse: () => {
    playTone(100, 0.25, "sawtooth", 0.08);
    setTimeout(() => playTone(70, 0.35, "square", 0.06), 120);
  },
  enemyWindUp: () => playTone(90, 0.25, "sawtooth", 0.05),

  // Counter deflect — metallic clang when Counter retaliates
  deflect: () => {
    playTone(1200, 0.06, "square", 0.12);
    setTimeout(() => playTone(900, 0.08, "triangle", 0.1), 30);
    setTimeout(() => playTone(1600, 0.05, "sine", 0.06), 60);
  },

  // Draw card — parchment/page flip sound
  drawCard: () => {
    playTone(2000, 0.04, "sawtooth", 0.04);
    setTimeout(() => playTone(1500, 0.06, "sawtooth", 0.03), 30);
    setTimeout(() => playTone(1000, 0.08, "triangle", 0.04), 60);
  },
  // Gain Faith — bright sparkle/chime
  gainFaith: () => {
    playTone(880, 0.08, "sine", 0.08);
    setTimeout(() => playTone(1320, 0.12, "sine", 0.08), 60);
  },

  // Results
  victory: () => {
    unlockAudio();
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "triangle", 0.16), i * 130));
    setTimeout(() => playTone(1319, 0.4, "sine", 0.12), 520);
  },
  defeat: () => {
    unlockAudio();
    [400, 300, 200, 100].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sawtooth", 0.12), i * 180));
  },
  divine: () => {
    unlockAudio();
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.35, "sine", 0.18), i * 45));
  },
  achievement: () => {
    [659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.2, "triangle", 0.12), i * 90));
  },
  unlockReveal: () => {
    unlockAudio();
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "sine", 0.1), i * 100));
    setTimeout(() => playTone(1319, 0.5, "sine", 0.12), 400);
  },
  trivia_correct: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.12, "sine", 0.12), i * 70));
  },
  trivia_wrong: () => playTone(200, 0.25, "sawtooth", 0.12),
  reward: () => {
    [523, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15, "triangle", 0.12), i * 90));
  },
};

export function stopMusic({ resetTheme = false } = {}) {
  if (genesisCompletionAudio) {
    const { audio, onEnded, onError } = genesisCompletionAudio;
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onError);
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    genesisCompletionAudio = null;
  }
  currentMusicNodes.forEach((node) => {
    try {
      node.stop();
    } catch {}
  });
  currentMusicNodes = [];

  if (musicTimeoutId) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }

  stopMainTheme({ preservePosition: !resetTheme });
  if (resetTheme) {
    musicTheme = null;
    pendingMusicTheme = null;
    mainThemePausedAt = 0;
  }
}

export function prepareGenesisCompletionAudio() {
  genesisCompletionAudioActive = true;
  stopMusic({ resetTheme: true });
}

export function playGenesisCompletionCue(src = "/audio/genesis_victory.mp3") {
  if (genesisCompletionAudio?.audio) return genesisCompletionAudio.audio;
  prepareGenesisCompletionAudio();
  if (!musicEnabled || !src) return null;

  try {
    const audio = new Audio(src);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = Math.max(0, Math.min(1, normalizeMusicVolume(musicVol) * 0.4));
    const clear = () => {
      if (genesisCompletionAudio?.audio === audio) genesisCompletionAudio = null;
    };
    const onEnded = clear;
    const onError = clear;
    genesisCompletionAudio = { audio, onEnded, onError };
    audio.addEventListener("ended", onEnded, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.play().catch(clear);
    return audio;
  } catch {
    return null;
  }
}

export function stopGenesisCompletionCue() {
  stopMusic({ resetTheme: true });
  genesisCompletionAudioActive = false;
}

export function pauseMusicForAmbience() {
  musicPausedForAmbience = true;

  if (musicTheme) {
    pendingMusicTheme = musicTheme;
  }

  stopMusic();
}

export function resumeMusicAfterAmbience(fallbackTheme = "menu") {
  musicPausedForAmbience = false;

  const themeToResume =
    pendingMusicTheme ||
    musicTheme ||
    fallbackTheme;

  pendingMusicTheme = null;
  playMusic(themeToResume);
}
// Chord pad — multiple sustained oscillators for warm background
function playChordPad(freqs, duration, vol, type = "sine") {
  const ctx = getCtx();
  if (!ctx || !musicGain) return;
  try {
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(vol * 0.7, ctx.currentTime + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      currentMusicNodes.push(osc);
    });
  } catch (e) {
    console.warn("[Audio] playChordPad error:", e);
  }
}

// Harp-like arpeggiated note
function playHarpNote(freq, duration, vol) {
  const ctx = getCtx();
  if (!ctx || !musicGain) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    currentMusicNodes.push(osc);
  } catch (e) {
    console.warn("[Audio] playHarpNote error:", e);
  }
}

// Soft bell tone — adds sacred atmosphere
function playBell(freq, vol) {
  const ctx = getCtx();
  if (!ctx || !musicGain) return;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = freq;
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(musicGain);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 1.5);
    osc2.stop(ctx.currentTime + 1.5);
    currentMusicNodes.push(osc1, osc2);
  } catch (e) {
    console.warn("[Audio] playBell error:", e);
  }
}

const MUSIC_THEMES = {
  // Main menu — warm, inviting, sacred
  menu: {
    chords: [[262, 330, 392], [196, 247, 294], [220, 277, 330], [262, 330, 392]],
    melody: [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 784, 880, 784, 659],
    padVol: 0.04, melodyVol: 0.06, padType: "sine",
    chordInterval: 2000, melodyInterval: 380, useBells: true,
  },
  // Eden / exploration — peaceful, gentle
  eden: {
    chords: [[294, 370, 440], [247, 294, 370], [330, 415, 494], [294, 370, 440]],
    melody: [587, 659, 740, 880, 740, 659, 587, 494, 523, 587, 659, 740, 880, 988, 880, 740],
    padVol: 0.035, melodyVol: 0.05, padType: "sine",
    chordInterval: 2200, melodyInterval: 420, useBells: false,
  },
  // Map exploration — mysterious, adventurous
  map: {
    chords: [[220, 277, 330], [196, 247, 294], [247, 294, 370], [220, 277, 330]],
    melody: [440, 523, 587, 659, 587, 523, 440, 330, 392, 440, 523, 587, 659, 784, 659, 523],
    padVol: 0.035, melodyVol: 0.05, padType: "sine",
    chordInterval: 2400, melodyInterval: 400, useBells: true,
  },
  // Battle — tense, driving
  battle: {
    chords: [[196, 247, 294], [165, 196, 247], [175, 220, 262], [196, 247, 294]],
    melody: [294, 349, 392, 440, 392, 349, 294, 247, 262, 294, 349, 392, 440, 494, 440, 349],
    padVol: 0.04, melodyVol: 0.05, padType: "sawtooth",
    chordInterval: 1500, melodyInterval: 280, useBells: false,
  },
  // Boss — dark, ominous
  boss: {
    chords: [[131, 165, 196], [98, 131, 165], [117, 147, 175], [131, 165, 196]],
    melody: [196, 233, 262, 311, 262, 233, 196, 165, 175, 196, 233, 262, 311, 349, 311, 233],
    padVol: 0.04, melodyVol: 0.05, padType: "sawtooth",
    chordInterval: 1400, melodyInterval: 250, useBells: false,
  },
  // Victory — triumphant, warm
  victory: {
    chords: [[523, 659, 784], [392, 494, 587], [440, 554, 659], [523, 659, 784]],
    melody: [784, 880, 988, 1047, 988, 880, 784, 659, 698, 784, 880, 988, 1047, 1175, 1047, 880],
    padVol: 0.04, melodyVol: 0.07, padType: "sine",
    chordInterval: 1800, melodyInterval: 350, useBells: true,
  },
  // Divine — angelic, ethereal
  divine: {
    chords: [[523, 659, 784, 1047], [587, 740, 880, 1175], [523, 659, 784, 1047], [494, 622, 740, 988]],
    melody: [1047, 1175, 1319, 1568, 1319, 1175, 1047, 880, 988, 1047, 1175, 1319, 1568, 1760, 1568, 1319],
    padVol: 0.035, melodyVol: 0.05, padType: "sine",
    chordInterval: 2500, melodyInterval: 400, useBells: true,
  },
  // Defeat — somber, mournful
  defeat: {
    chords: [[196, 247, 294], [175, 220, 262], [165, 196, 247], [196, 247, 294]],
    melody: [294, 247, 196, 165, 196, 247, 220, 196, 175, 196, 247, 220, 196, 165, 147, 131],
    padVol: 0.035, melodyVol: 0.045, padType: "sine",
    chordInterval: 2400, melodyInterval: 500, useBells: false,
  },
  // Story / scripture — reverent, contemplative
  story: {
    chords: [[262, 330, 392], [220, 277, 330], [196, 247, 294], [262, 330, 392]],
    melody: [523, 587, 659, 523, 587, 659, 784, 659, 587, 523, 587, 659, 784, 880, 784, 659],
    padVol: 0.035, melodyVol: 0.055, padType: "sine",
    chordInterval: 2400, melodyInterval: 450, useBells: true,
  },
};

// Internal: actually start the music loop (assumes audio is unlocked)
function _startMusic(theme) {
  stopMusic();
  musicTheme = theme;
  const ctx = getCtx();
  if (!ctx) return;

  const t = MUSIC_THEMES[theme] || MUSIC_THEMES.menu;
  let chordIdx = 0;
  let melodyIdx = 0;
  let step = 0;
  const chordEvery = Math.ceil(t.chordInterval / t.melodyInterval);

  function playNext() {
    if (!musicEnabled || musicTheme !== theme) return;

    // Play chord pad on schedule
    if (step % chordEvery === 0) {
      const chord = t.chords[chordIdx % t.chords.length];
      playChordPad(chord, (t.chordInterval / 1000) * 1.3, t.padVol, t.padType);
      if (t.useBells && chordIdx % 2 === 0) {
        playBell(chord[0] * 2, t.padVol * 0.5);
      }
      chordIdx++;
    }

    // Play melody note
    const freq = t.melody[melodyIdx % t.melody.length];
    playHarpNote(freq, (t.melodyInterval / 1000) * 0.9, t.melodyVol);

    melodyIdx++;
    step++;
    musicTimeoutId = setTimeout(playNext, t.melodyInterval);
  }

  playNext();
}

// Public: play a music theme. If audio isn't unlocked yet (mobile, no gesture),
// store as pending — it starts on the first user gesture / unlock.
export function playMusic(theme) {
  if (!musicEnabled || genesisCompletionAudioActive) {
    return;
  }

  musicTheme = theme;

  if (musicPausedForAmbience) {
    pendingMusicTheme = theme;
    return;
  }

  const ctx = getCtx();

  if (!ctx || ctx.state !== "running") {
    pendingMusicTheme = theme;
    return;
  }

  pendingMusicTheme = null;

  startMainTheme().then((started) => {
    if (
      !started &&
      musicEnabled &&
      !musicPausedForAmbience &&
      !mainThemeSource
    ) {
      pendingMusicTheme = theme;
    }
  });
}

// === VOICE NARRATION via SpeechSynthesis API ===
// Verbalization + voice selection logic lives in scriptureVoice.js (imported at top)

// Re-export so existing imports still work
export { verbalizeScriptureReference };

// onStateChange (optional) is called with "start" | "end" | "error" so
// callers like the Settings "Preview Voice" button can show a Playing
// indicator without duplicating the SpeechSynthesis setup. Returns the
// created utterance, or null if narration could not be started (existing
// callers that ignore the return value are unaffected).
export function speakNarration(text, volume, voicePreference, onStateChange) {
  if (!window.speechSynthesis) {
    onStateChange?.("error", new Error("speechSynthesis unavailable"));
    return null;
  }
  stopNarration();
  const vol = volume !== undefined ? volume : narrationVol;
  if (vol <= 0) return null;

  // Lower background music while the narrator speaks
  duckMusic();

  try {
    const spokenText = prepareTextForNarration(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.volume = vol;
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voice = pickVoice(voicePreference);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => onStateChange?.("start");
    // Restore music volume when narration ends or errors
    utterance.onend = () => { unDuckMusic(); onStateChange?.("end"); };
    utterance.onerror = (e) => {
      console.warn("[Audio] speakNarration playback error:", e.error || e);
      unDuckMusic();
      onStateChange?.("error", e);
    };
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (e) {
    console.warn("[Audio] speakNarration error:", e);
    unDuckMusic();
    onStateChange?.("error", e);
    return null;
  }
}

export function stopNarration() {
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    unDuckMusic();
  }
}
