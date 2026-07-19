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
  "And God said, 'Let there be light,' and there was light.";
const REFERENCE = "Genesis 1:1-3";

const INTRO_AUDIO = "/audio/cid_intro-2.0.m4a";
const INTRO_VIDEO = "/video/genesis_intro.mp4";
const INTRO_MUSIC = "/audio/genesis_intro_music_15s.mp3";
export const VERSE_1_START_MS = 480;
export const VERSE_3_START_MS = 7700;
export const NARRATION_END_MS = 13632;
export const TITLE_CARD_HOLD_MS = 3600;
const AUDIO_END_FALLBACK_GRACE_MS = 4000;
const VIDEO_RETRY_TIMEOUT_MS = 6000;

const PORTRAIT_POSTER = "/images/intro/intro_poster.PNG";
const LANDSCAPE_POSTER = "/images/intro/intro-poster-2.0.PNG";

export default function CinematicIntro({ onComplete }) {
  const { profile } = useGame();

  const [step, setStep] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [cinematicStarted, setCinematicStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); 
  const [bookCardStage, setBookCardStage] = useState(0);
  const [narrationOn, setNarrationOn] = useState(
    profile.settings.narration !== false
  );

  const videoRef = useRef(null);
  const narrationTrackRef = useRef(null);
  const musicTrackRef = useRef(null);
  const timersRef = useRef([]);
  const cinematicStartedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const completedRef = useRef(false);
  const lifecycleRef = useRef(0);
  const scriptureFrameRef = useRef(null);

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

  Sound.stopCinematicTracks(1.2);

  narrationTrackRef.current = null;
  musicTrackRef.current = null;

  const chapterTimer = window.setTimeout(() => {
    setBookCardStage(2);
  }, 1800);

  const finishTimer = window.setTimeout(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    Sound.stopNarration();
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

    const video = videoRef.current;

    if (!video) {
      setNeedsTap(true);
      return;
    }

    let usePosterFallback = videoFailed;
    if (!usePosterFallback) {
      try {
        await waitForVideo(video);
        await video.play();
      } catch (error) {
        if (!userInitiated) {
          console.warn("Genesis video requires player interaction.", error);
          setNeedsTap(true);
          return;
        }

        try {
          video.load();
          await waitForVideo(video);
          await video.play();
        } catch (retryError) {
          console.warn("Genesis video could not be played; using its poster.", retryError);
          usePosterFallback = true;
          setVideoFailed(true);
        }
      }
    }

    if (lifecycleRef.current !== lifecycleId || completedRef.current) {
      return;
    }

    cinematicStartedRef.current = true;
    setCinematicStarted(true);
    setNeedsTap(false);

    Sound.pauseMusicForAmbience();

    musicTrackRef.current = await Sound.playCinematicTrack(
      INTRO_MUSIC,
      {
        volume: 0.12,
        loop: false,
      }
    );

    if (lifecycleRef.current !== lifecycleId || completedRef.current) {
      return;
    }

    let narrationTrack = null;

    if (narrationOn) {
      narrationTrackRef.current = await Sound.playCinematicTrack(
        INTRO_AUDIO,
        {
          volume: Math.min(
  1,
  ((profile.settings.narrationVolume ?? 70) / 100) * 1.4
),
          loop: false,
          onEnded: handleBegin,
        }
      );
      narrationTrack = narrationTrackRef.current;
    }

    if (lifecycleRef.current !== lifecycleId || completedRef.current) {
      return;
    }

    const setScriptureForTime = (elapsedMs) => {
      if (elapsedMs >= VERSE_3_START_MS) setStep(5);
      else if (elapsedMs >= VERSE_1_START_MS) setStep(1);
    };

    if (narrationTrack?.context && Number.isFinite(narrationTrack.startedAt)) {
      const updateScripture = () => {
        if (completedRef.current || isTransitioningRef.current) return;
        setScriptureForTime(
          (narrationTrack.context.currentTime - narrationTrack.startedAt) * 1000
        );
        scriptureFrameRef.current = window.requestAnimationFrame(updateScripture);
      };
      scriptureFrameRef.current = window.requestAnimationFrame(updateScripture);
    } else {
      timersRef.current.push(
        window.setTimeout(() => setStep(1), VERSE_1_START_MS),
        window.setTimeout(() => setStep(5), VERSE_3_START_MS)
      );
    }

    timersRef.current.push(
      window.setTimeout(
        handleBegin,
        narrationTrack
          ? NARRATION_END_MS + AUDIO_END_FALLBACK_GRACE_MS
          : NARRATION_END_MS
      )
    );
  }, [
    handleBegin,
    narrationOn,
    profile.settings.narrationVolume,
    videoFailed,
    waitForVideo,
  ]);

  useEffect(() => {
    const lifecycleId = ++lifecycleRef.current;
    completedRef.current = false;
    cinematicStartedRef.current = false;
    isTransitioningRef.current = false;
    setCinematicStarted(false);
    setIsTransitioning(false);
    setBookCardStage(0);
    setStep(0);
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

      Sound.stopCinematicTracks(0);
      Sound.stopNarration();

      narrationTrackRef.current = null;
      musicTrackRef.current = null;
    };
  }, [clearTimers]);

  useEffect(() => {
    if (videoReady && !cinematicStartedRef.current) {
      startCinematic(false);
    }
  }, [videoReady, startCinematic]);

  const handleSkip = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();

    videoRef.current?.pause();

    Sound.stopCinematicTracks(0);
    Sound.stopNarration();
    Sound.resumeMusicAfterAmbience("battle");

    narrationTrackRef.current = null;
    musicTrackRef.current = null;

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
        onCanPlay={() => setVideoReady(true)}
        onLoadedMetadata={() => {
          if (videoRef.current?.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            setVideoReady(true);
          }
        }}
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
                className={`[grid-area:1/1] font-serif font-semibold leading-relaxed text-amber-100 transition-all duration-100 ${
                  step === 5 ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
                style={{
                  fontSize: "clamp(1.15rem, 2.6vw, 1.75rem)",
                  textShadow: "0 0 28px rgba(251,191,36,0.35)",
                }}
              >
                &ldquo;{VERSE_3}&rdquo;
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
