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
const VERSE_2 =
  "And God said, 'Let there be light,' and there was light.";
const REFERENCE = "Genesis 1:1-3";

const INTRO_AUDIO = "/audio/cid_intro-2.0.m4a";
const INTRO_VIDEO = "/video/genesis_intro.mp4";
const INTRO_MUSIC = "/audio/genesis_intro_music_15s.mp3";

const PORTRAIT_POSTER = "/images/intro/intro_poster.PNG";
const LANDSCAPE_POSTER = "/images/intro/intro-poster-2.0.PNG";

export default function CinematicIntro({ onComplete }) {
  const { profile } = useGame();

  const [step, setStep] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [cinematicStarted, setCinematicStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
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

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });

    timersRef.current = [];
  }, []);

 const handleBegin = useCallback(() => {
  if (isTransitioning) return;

  setIsTransitioning(true);
  setBookCardStage(1);

  Sound.stopCinematicTracks(1.2);

  narrationTrackRef.current = null;
  musicTrackRef.current = null;

  const chapterTimer = window.setTimeout(() => {
    setBookCardStage(2);
  }, 1400);

  const finishTimer = window.setTimeout(() => {
    Sound.stopNarration();
    onComplete();
  }, 2800);

  timersRef.current.push(chapterTimer, finishTimer);
}, [isTransitioning, onComplete]);

  const startCinematic = useCallback(async () => {
    if (cinematicStartedRef.current) return;

    const video = videoRef.current;

    if (!video || videoFailed) {
      setNeedsTap(true);
      return;
    }

    try {
      await video.play();
    } catch (error) {
      console.warn("Genesis video requires player interaction.", error);
      setNeedsTap(true);
      return;
    }

    cinematicStartedRef.current = true;
    setCinematicStarted(true);
    setNeedsTap(false);

    Sound.stopMusic();

    musicTrackRef.current = await Sound.playCinematicTrack(
      INTRO_MUSIC,
      {
        volume: 0.12,
        loop: false,
      }
    );

    if (narrationOn) {
      narrationTrackRef.current = await Sound.playCinematicTrack(
        INTRO_AUDIO,
        {
          volume:
            (profile.settings.narrationVolume ?? 50) / 100,
          loop: false,
        }
      );
    }

    timersRef.current.push(
      window.setTimeout(() => setStep(1), 500),
      window.setTimeout(() => setStep(2), 1800),
      window.setTimeout(() => setStep(3), 3200),
      window.setTimeout(() => setStep(4), 5000),
      window.setTimeout(() => handleBegin(), 15000)
    );
  }, [
    handleBegin,
    narrationOn,
    profile.settings.narrationVolume,
    videoFailed,
  ]);

  useEffect(() => {
    Sound.stopMusic();

    const loadingTimeout = window.setTimeout(() => {
      if (!cinematicStartedRef.current) {
        setNeedsTap(true);
      }
    }, 7000);

    timersRef.current.push(loadingTimeout);

    return () => {
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
      startCinematic();
    }
  }, [videoReady, startCinematic]);

  const handleSkip = useCallback(() => {
    clearTimers();

    videoRef.current?.pause();

    Sound.stopCinematicTracks(0);
    Sound.stopNarration();

    narrationTrackRef.current = null;
    musicTrackRef.current = null;

    onComplete();
  }, [clearTimers, onComplete]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-hidden bg-black"
      style={{ background: "#000000" }}
    >
      {/* Loading poster */}
      <picture
        className={`absolute inset-0 transition-opacity duration-1000 ${
          cinematicStarted ? "opacity-0" : "opacity-100"
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
          cinematicStarted ? "opacity-0" : "opacity-100"
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
            <button
              onClick={startCinematic}
              className="mt-6 rounded-xl border border-amber-400/60 bg-slate-950/70 px-7 py-3 font-serif text-amber-100 shadow-lg"
            >
              Tap to Begin
            </button>
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
        onLoadedData={() => setVideoReady(true)}
        onError={() => {
          setVideoFailed(true);
          setNeedsTap(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          cinematicStarted ? "opacity-100" : "opacity-0"
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
          opacity: cinematicStarted && step >= 2 ? 1 : 0,
        }}
      />

      {/* Golden glow */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
        style={{
          background:
            "radial-gradient(circle at center, rgba(201,168,76,0.08) 0%, transparent 50%)",
          opacity: cinematicStarted && step >= 2 ? 1 : 0,
        }}
      />

      {cinematicStarted && step < 4 && (
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
            <div
              className={`mb-4 flex justify-center transition-all duration-[2000ms] ${
                step >= 4
                  ? "scale-100 opacity-100"
                  : "scale-50 opacity-0"
              }`}
            >
              <div
                className="h-16 w-16 overflow-hidden rounded-full border-2 border-amber-400/40 shadow-xl shadow-amber-400/30 lg:h-20 lg:w-20"
                style={{ background: "#0F1A30" }}
              >
                <img
                  src={HOME_ART.cross}
                  alt="Chronicles of Faith"
                  className="art-portrait"
                />
              </div>
            </div>

            <h1
              className={`font-serif tracking-wide text-amber-200 transition-all duration-[2000ms] ${
                step >= 4
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-4 opacity-0"
              }`}
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                textShadow: "0 0 30px rgba(201,168,76,0.3)",
              }}
            >
              Chronicles of Faith
            </h1>

            <p
              className={`mb-8 mt-1 font-serif italic text-amber-100/45 transition-all duration-[2000ms] ${
                step >= 4 ? "opacity-100" : "opacity-0"
              }`}
              style={{
                fontSize: "clamp(0.7rem, 1.5vw, 1rem)",
              }}
            >
              A Biblical Roguelike Journey
            </p>

            <p
              className={`font-serif leading-relaxed text-amber-100/90 transition-opacity duration-[1500ms] ${
                step >= 1 ? "opacity-100" : "opacity-0"
              }`}
              style={{
                fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
              }}
            >
              &ldquo;{VERSE_1}&rdquo;
            </p>

            <p
              className={`mt-4 font-serif leading-relaxed text-amber-100/90 transition-opacity duration-[1500ms] ${
                step >= 3 ? "opacity-100" : "opacity-0"
              }`}
              style={{
                fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
              }}
            >
              {VERSE_2}
            </p>

            <p
              className={`mt-4 font-serif italic text-amber-300/60 transition-opacity duration-[1500ms] ${
                step >= 3 ? "opacity-100" : "opacity-0"
              }`}
              style={{
                fontSize: "clamp(0.8rem, 1.5vw, 1rem)",
              }}
            >
              &mdash; {REFERENCE}
            </p>

            {step >= 4 && (
              <p className="mt-10 animate-fade-in font-serif text-sm italic text-amber-100/45">
                Your journey begins...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom subtitle */}
      {cinematicStarted && (
        <div className="pointer-events-none absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-10 px-6 text-center">
          {step >= 1 && step < 3 && (
            <p className="font-serif text-xs italic text-amber-100/25">
              {VERSE_1}
            </p>
          )}

          {step >= 3 && step < 4 && (
            <p className="font-serif text-xs italic text-amber-100/25">
              {VERSE_2} &mdash; {REFERENCE}
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
          <div className="mx-auto mb-5 h-px w-32 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

 <div className="relative flex min-h-[9rem] min-w-[18rem] items-center justify-center">
  <div
    className={`absolute text-center transition-all duration-700 ${
      bookCardStage === 1
        ? "translate-y-0 opacity-100"
        : "-translate-y-3 opacity-0"
    }`}
  >
    <p className="text-xs uppercase tracking-[0.45em] text-amber-300/55">
      Book I
    </p>

    <p className="mt-3 font-serif text-4xl tracking-[0.18em] text-amber-100 sm:text-5xl">
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
  );
}
