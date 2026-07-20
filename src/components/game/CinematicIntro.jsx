import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

const VERSE_1 =
  "In the beginning, God created the heavens and the earth.";
const VERSE_3 =
  "And God said, “Let there be light,” and there was light.";
const REFERENCE = "Genesis 1:1-3";

const INTRO_VIDEO = "/video/genesis_intro.mp4";
export const VERSE_1_START_MS = 480;
export const VERSE_3_START_MS = 3500;
export const NARRATION_END_MS = 13632;
export const TITLE_CARD_HOLD_MS = 3600;
const VIDEO_RETRY_TIMEOUT_MS = 6000;

const PORTRAIT_POSTER = "/images/intro/intro_poster.PNG";
const LANDSCAPE_POSTER = "/images/intro/intro-poster-2.0.PNG";

export default function CinematicIntro({ onComplete }) {
  const { profile } = useGame();

  const [step, setStep] = useState(0);
  const [cinematicStarted, setCinematicStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); 
  const [bookCardStage, setBookCardStage] = useState(0);
  const [narrationOn, setNarrationOn] = useState(
    Sound.toBoolean(profile.settings.narration)
  );

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const timersRef = useRef([]);
  const cinematicStartedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const completedRef = useRef(false);
  const lifecycleRef = useRef(0);
  const scriptureFrameRef = useRef(null);
  const activeScriptureRef = useRef(0);
  const fallbackStartedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });

    timersRef.current = [];
    if (scriptureFrameRef.current) {
      window.cancelAnimationFrame(scriptureFrameRef.current);
      scriptureFrameRef.current = null;
    }
  }, []);

 const handleBegin = useCallback(() => {
  if (isTransitioningRef.current || completedRef.current) return;

  isTransitioningRef.current = true;
  setIsTransitioning(true);
  setBookCardStage(1);

  // Narration has just ended (or the fallback timing elapsed) — fade the
  // intro music out as we move to the title card. stopGenesisIntro() stops
  // both the music and the recorded narration together; it's the only
  // place either gets stopped outside of skip/unmount.
  Sound.stopGenesisIntro({ fadeDuration: 1.2 });
  audioRef.current = null;

  const chapterTimer = window.setTimeout(() => {
    setBookCardStage(2);
  }, 1800);

  const finishTimer = window.setTimeout(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, TITLE_CARD_HOLD_MS);

  timersRef.current.push(chapterTimer, finishTimer);
}, [onComplete]);

  const waitForVideo = useCallback((video) => {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => finish(reject), VIDEO_RETRY_TIMEOUT_MS);
      const finish = (callback) => {
        window.clearTimeout(timeout);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);
        callback();
      };
      const onReady = () => finish(resolve);
      const onError = () => finish(reject);
      video.addEventListener("canplay", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
  }, []);

  const startCinematic = useCallback(async (userInitiated = false) => {
    if (cinematicStartedRef.current) return;
    const lifecycleId = lifecycleRef.current;

    // Mobile browsers (iOS Safari in particular) block a non-muted Audio
    // element's play() unless it's adjacent to a real user gesture. The
    // Start Journey / Replay Intro tap already called Sound.startGenesisIntro()
    // (see GameContext.triggerIntroReplay), which issued the resume() and
    // began the intro music — this just confirms it actually succeeded
    // before revealing scripture/attempting narration. If it didn't, show
    // the existing "Tap to Begin" prompt so the eventual play() call
    // happens inside a genuine tap instead of failing silently.
    if (!userInitiated) {
      const unlocked = await Sound.ensureAudioUnlocked();
      if (lifecycleRef.current !== lifecycleId || completedRef.current) return;
      if (!unlocked) {
        setNeedsTap(true);
        return;
      }
    } else {
      await Sound.ensureAudioUnlocked();
    }

    cinematicStartedRef.current = true;
    setCinematicStarted(true);
    setNeedsTap(false);

    // Video is a visual layer only, attempted independently — a slow
    // network or failed decode must never delay or block narration/music,
    // which are the parts scripture playback actually depends on. Intro
    // music itself is NOT started here — it was already requested from the
    // Start Journey tap (Sound.startGenesisIntro()), so it's audible during
    // "Preparing Your Journey" instead of waiting on this component to mount.
    const video = videoRef.current;
    if (video) {
      (async () => {
        if (videoFailed) return;
        try {
          await waitForVideo(video);
          await video.play();
        } catch (error) {
          try {
            video.load();
            await waitForVideo(video);
            await video.play();
          } catch (retryError) {
            console.warn("[Genesis Intro] Video could not be played; using its poster.", retryError);
            if (lifecycleRef.current === lifecycleId) setVideoFailed(true);
          }
        }
      })();
    }

    const activateScripture = (nextStep, currentTime) => {
      if (activeScriptureRef.current === nextStep) return;
      activeScriptureRef.current = nextStep;
      setStep(nextStep);
      console.info(
        `[Genesis Intro] Scripture ${nextStep === 1 ? "Genesis 1:1" : "Genesis 1:3"} activated at audio.currentTime=${currentTime.toFixed(3)}s`
      );
    };

    const updateScriptureFromAudio = () => {
      const audio = audioRef.current;
      if (
        !audio ||
        audio.paused ||
        audio.ended ||
        completedRef.current ||
        isTransitioningRef.current
      ) {
        scriptureFrameRef.current = null;
        return;
      }

      const elapsedMs = audio.currentTime * 1000;
      if (elapsedMs >= VERSE_3_START_MS) activateScripture(5, audio.currentTime);
      else if (elapsedMs >= VERSE_1_START_MS) activateScripture(1, audio.currentTime);

      scriptureFrameRef.current = window.requestAnimationFrame(updateScriptureFromAudio);
    };

    const startFallbackTiming = () => {
      if (fallbackStartedRef.current) return;
      fallbackStartedRef.current = true;
      console.info("[Genesis Intro] Fallback subtitle timing active: true");
      timersRef.current.push(
        window.setTimeout(() => activateScripture(1, VERSE_1_START_MS / 1000), VERSE_1_START_MS),
        window.setTimeout(() => activateScripture(5, VERSE_3_START_MS / 1000), VERSE_3_START_MS),
        window.setTimeout(handleBegin, NARRATION_END_MS)
      );
    };

    // Scripture text becomes visible now (cinematicStarted, set above) — the
    // real recorded narration (/audio/cid_intro-2.0.m4a) starts in the same
    // breath, on its own HTMLAudioElement, never touching the music's Web
    // Audio buffer source. See playGenesisIntroNarration in soundManager.js.
    if (narrationOn) {
      const audio = Sound.playGenesisIntroNarration({
        onEvent: (event) => {
          if (lifecycleRef.current !== lifecycleId || completedRef.current) return;
          if (event === "playing") {
            if (scriptureFrameRef.current) {
              window.cancelAnimationFrame(scriptureFrameRef.current);
            }
            scriptureFrameRef.current = window.requestAnimationFrame(updateScriptureFromAudio);
          } else if (event === "ended") {
            handleBegin();
          } else if (event === "error" || event === "skipped") {
            startFallbackTiming();
          }
        },
      });
      audioRef.current = audio;
      if (!audio) startFallbackTiming();
    } else {
      startFallbackTiming();
    }

    if (lifecycleRef.current !== lifecycleId || completedRef.current) return;
  }, [handleBegin, narrationOn, videoFailed, waitForVideo]);

  useEffect(() => {
    const lifecycleId = ++lifecycleRef.current;
    completedRef.current = false;
    cinematicStartedRef.current = false;
    isTransitioningRef.current = false;
    setCinematicStarted(false);
    setIsTransitioning(false);
    setBookCardStage(0);
    setStep(0);
    activeScriptureRef.current = 0;
    fallbackStartedRef.current = false;
    setVideoPlaying(false);

    Sound.pauseMusicForAmbience();

    const loadingTimeout = window.setTimeout(() => {
      if (!cinematicStartedRef.current) {
        setNeedsTap(true);
      }
    }, 7000);

    timersRef.current.push(loadingTimeout);

    return () => {
      if (lifecycleRef.current === lifecycleId) {
        lifecycleRef.current += 1;
      }
      completedRef.current = true;
      cinematicStartedRef.current = false;
      clearTimers();

      videoRef.current?.pause();
      // A genuine unmount (intro finished, skipped, or the player navigated
      // away) — not an ordinary re-render, since this effect's only
      // dependency (clearTimers) is a stable useCallback([]) reference and
      // therefore only runs its setup/cleanup on true mount/unmount.
      Sound.stopGenesisIntro({ fadeDuration: 0 });
      audioRef.current = null;
    };
  }, [clearTimers]);

  // Reveal scripture and begin narration as soon as the AudioContext unlock
  // (already requested from the Start Journey/Replay tap) is confirmed —
  // not gated on video readiness, so a slow video download never delays
  // music or narration. See startCinematic() above.
  useEffect(() => {
    startCinematic(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();

    videoRef.current?.pause();
    Sound.stopGenesisIntro({ fadeDuration: 0 });
    audioRef.current = null;
    Sound.resumeMusicAfterAmbience("battle");

    onComplete();
  }, [clearTimers, onComplete]);

return (
    <>
      <style>{`
        @keyframes introLogoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(201,168,76,0.18));
          }

          50% {
            filter: drop-shadow(0 0 22px rgba(201,168,76,0.45));
          }
        }

        .intro-logo {
          animation: introLogoGlow 5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-logo {
            animation: none;
          }
        }
      `}</style>

      <div
      className="fixed inset-0 z-[80] overflow-hidden bg-black"
      style={{ background: "#000000" }}
    >
      {/* Loading poster */}
      <picture
        className={`absolute inset-0 transition-opacity duration-1000 ${
          videoPlaying && !videoFailed ? "opacity-0" : "opacity-100"
        }`}
      >
        <source
          media="(orientation: landscape)"
          srcSet={LANDSCAPE_POSTER}
        />

        <img
          src={PORTRAIT_POSTER}
          alt="Chronicles of Faith"
          className="h-full w-full object-cover"
        />
      </picture>

      {/* Dark loading readability layer */}
      <div
        className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-700 ${
          videoPlaying && !videoFailed ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Loading content */}
      {!cinematicStarted && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-[calc(3rem+env(safe-area-inset-bottom))] text-center">
          <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-amber-200/20 border-t-amber-300" />

          <p className="font-serif text-lg tracking-[0.12em] text-amber-100">
            Preparing Your Journey
          </p>

          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-amber-200/50">
            Entering Genesis
          </p>

          {needsTap && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => startCinematic(true)}
                className="rounded-xl border border-amber-400/60 bg-slate-950/70 px-7 py-3 font-serif text-amber-100 shadow-lg"
              >
                {videoFailed ? "Continue" : "Tap to Begin"}
              </button>
              {!videoFailed && (
                <button
                  onClick={handleSkip}
                  className="text-xs text-amber-100/50 transition hover:text-amber-100/80"
                >
                  Skip Intro →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Genesis video */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        poster={PORTRAIT_POSTER}
        onPlaying={() => setVideoPlaying(true)}
        onError={() => {
          if (!cinematicStartedRef.current) setNeedsTap(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          videoPlaying && !videoFailed ? "opacity-100" : "opacity-0"
        }`}
      >
        <source src={INTRO_VIDEO} type="video/mp4" />
      </video>

      <div
        className={`absolute inset-0 bg-black/25 transition-opacity duration-1000 ${
          cinematicStarted ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Dawn light */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(26,39,68,0.15) 0%, rgba(10,15,30,0.25) 70%, rgba(0,0,0,0.35) 100%)",
          opacity: cinematicStarted && step >= 3 ? 1 : 0,
        }}
      />

      {/* Golden glow */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
        style={{
          background:
            "radial-gradient(circle at center, rgba(201,168,76,0.08) 0%, transparent 50%)",
          opacity: cinematicStarted && step >= 5 ? 1 : 0,
        }}
      />

      {cinematicStarted && !isTransitioning && (
        <button
          onClick={handleSkip}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 text-sm text-amber-100/40 transition hover:text-amber-100/70"
        >
          Skip →
        </button>
      )}

      {/* Main cinematic content */}
      {cinematicStarted && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
          <div className="max-w-2xl text-center">
            <div className="grid min-h-[15rem] place-items-center">
              <p
                className={`[grid-area:1/1] font-serif leading-relaxed text-amber-100/90 transition-opacity ${
                  step === 1
                    ? "duration-700 opacity-100"
                    : "duration-100 opacity-0"
                }`}
                style={{ fontSize: "clamp(1rem, 2.2vw, 1.5rem)" }}
              >
                &ldquo;{VERSE_1}&rdquo;
                <span className="mt-4 block text-sm italic text-amber-300/60">Genesis 1:1</span>
              </p>

              <p
                className={`[grid-area:1/1] font-serif leading-relaxed text-amber-100/90 transition-all duration-100 ${
                  step === 5 ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
                style={{
                  fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
                  textShadow: "0 0 28px rgba(251,191,36,0.35)",
                }}
              >
                And God said, &ldquo;<strong>Let there be light</strong>,&rdquo; and there was light.
                <span className="mt-4 block text-sm font-normal italic text-amber-300/70">Genesis 1:3</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom subtitle */}
      {cinematicStarted && (
        <div className="pointer-events-none absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-10 px-6 text-center">
          {step === 1 && (
            <p className="font-serif text-xs italic text-amber-100/25">
              {VERSE_1}
            </p>
          )}

          {step === 5 && (
            <p className="font-serif text-xs italic text-amber-100/30">
              {VERSE_3} &mdash; {REFERENCE}
            </p>
          )}
        </div>
      )}

      {/* Transition into tutorial */}
      <div
        className={`pointer-events-none absolute inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-1000 ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`text-center transition-all delay-300 duration-700 ${
            isTransitioning
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0"
          }`}
        >
          <div
            className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-full border border-amber-400/35 shadow-lg shadow-amber-400/15"
            style={{ background: "#0F1A30" }}
          >
            <img
              src={HOME_ART.cross}
              alt="Chronicles of Faith"
              className="art-portrait"
            />
          </div>

          <p className="mb-4 font-serif text-lg tracking-[0.16em] text-amber-200/80">
            Chronicles of Faith
          </p>

          <div className="mx-auto mb-5 h-px w-32 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

 <div className="relative flex min-h-[9rem] min-w-[18rem] items-center justify-center">
  <div
    className={`absolute text-center transition-all duration-700 ${
      bookCardStage === 1
        ? "translate-y-0 opacity-100"
        : "-translate-y-3 opacity-0"
    }`}
  >
    <p className="text-xs uppercase tracking-[0.65em] text-amber-300/55">
      Book I
    </p>

    <p className="mt-3 font-serif text-5xl tracking-[0.18em] text-amber-100 sm:text-6xl">
      Genesis
    </p>
  </div>

  <div
    className={`absolute text-center transition-all duration-700 ${
      bookCardStage === 2
        ? "translate-y-0 opacity-100"
        : "translate-y-3 opacity-0"
    }`}
  >
    <p className="text-xs uppercase tracking-[0.35em] text-amber-300/50">
      Chapter One
    </p>

    <p className="mt-3 font-serif text-2xl tracking-[0.12em] text-amber-100">
      The Beginning
    </p>
  </div>
</div>
        </div>
      </div>
    </div>
    </>
  );
}
