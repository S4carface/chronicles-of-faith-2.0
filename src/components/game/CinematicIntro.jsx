import React, { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

const VERSE_1 = "In the beginning, God created the heavens and the earth.";
const VERSE_2 = "And God said, 'Let there be light,' and there was light.";
const REFERENCE = "Genesis 1:1-3";
const INTRO_AUDIO = "/audio/cid_intro.m4a";

export default function CinematicIntro({ onComplete }) {
  const { profile } = useGame();
  const [step, setStep] = useState(0);
  const [showButtons, setShowButtons] = useState(false);
  const [narrationOn, setNarrationOn] = useState(profile.settings.narration !== false);
  const narratedRef = useRef(false);
  const audioRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    if (narrationOn && !narratedRef.current) {
  narratedRef.current = true;

  const t = setTimeout(() => {
    const audio = new Audio(INTRO_AUDIO);
    audio.volume = (profile.settings.narrationVolume ?? 50) / 100;
    audioRef.current = audio;

    audio.play().catch(() => {
      console.warn("Intro narration could not autoplay.");
    });
  }, 600);

  timersRef.current.push(t);
}

    timersRef.current.push(setTimeout(() => setStep(1), 1200));
    timersRef.current.push(setTimeout(() => setStep(2), 4500));
    timersRef.current.push(setTimeout(() => setStep(3), 6500));
    timersRef.current.push(setTimeout(() => { setStep(4); setShowButtons(true); }, 9500));

    return () => {
      timersRef.current.forEach(id => clearTimeout(id));
      audioRef.current?.pause();
audioRef.current = null;
Sound.stopNarration();
    };
  }, []);

  const handleSkip = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    audioRef.current?.pause();
audioRef.current = null;
Sound.stopNarration();
    onComplete();
  }, [onComplete]);

  const handleBegin = useCallback(() => {
    Sound.sfx.click();
    audioRef.current?.pause();
audioRef.current = null;
Sound.stopNarration();
    onComplete();
  }, [onComplete]);

  const replayNarration = () => {
  audioRef.current?.pause();

  const audio = new Audio(INTRO_AUDIO);
  audio.volume = (profile.settings.narrationVolume ?? 50) / 100;
  audioRef.current = audio;

  audio.play().catch(() => {
    console.warn("Intro narration could not play.");
  });
};

  const toggleNarration = () => {
    if (narrationOn) {
      audioRef.current?.pause();
audioRef.current = null;
Sound.stopNarration();
      setNarrationOn(false);
    } else {
      setNarrationOn(true);
      replayNarration();
    }
  };

  return (
    <div className="fixed inset-0 z-[80]" style={{ background: "#000000" }}>
      {/* Dawn light overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
        style={{
          background: "radial-gradient(ellipse at center, rgba(26,39,68,0.9) 0%, rgba(10,15,30,0.95) 70%, rgba(0,0,0,1) 100%)",
          opacity: step >= 2 ? 1 : 0,
        }}
      />
      {/* Golden glow */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
        style={{
          background: "radial-gradient(circle at center, rgba(201,168,76,0.08) 0%, transparent 50%)",
          opacity: step >= 2 ? 1 : 0,
        }}
      />

      {/* Skip button during animation */}
      {!showButtons && (
        <button
          onClick={handleSkip}
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 text-amber-100/30 hover:text-amber-100/70 transition text-sm z-20"
        >
          Skip →
        </button>
      )}

      {/* Narration controls */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 flex gap-2 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); toggleNarration(); }}
          className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          {narrationOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        {narrationOn && (
          <button
            onClick={(e) => { e.stopPropagation(); replayNarration(); }}
            className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          {/* Logo */}
          <div className={`flex justify-center mb-4 transition-all duration-[2000ms] ${step >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/40 shadow-xl shadow-amber-400/30" style={{ background: "#0F1A30" }}>
              <img src={HOME_ART.cross} alt="Chronicles of Faith" className="art-portrait" />
            </div>
          </div>

          {/* Title */}
          <h1
            className={`font-serif text-amber-200 tracking-wide transition-all duration-[2000ms] ${step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
            style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}
          >
            Chronicles of Faith
          </h1>
          <p
            className={`font-serif italic text-amber-100/45 mt-1 mb-8 transition-all duration-[2000ms] ${step >= 4 ? "opacity-100" : "opacity-0"}`}
            style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)" }}
          >
            A Biblical Roguelike Journey
          </p>

          {/* Verse 1 (caption) */}
          <p
            className={`font-serif text-amber-100/90 leading-relaxed transition-opacity duration-[1500ms] ${step >= 1 ? "opacity-100" : "opacity-0"}`}
            style={{ fontSize: "clamp(1rem, 2.2vw, 1.5rem)" }}
          >
            &ldquo;{VERSE_1}&rdquo;
          </p>

          {/* Verse 2 (caption) */}
          <p
            className={`font-serif text-amber-100/90 leading-relaxed mt-4 transition-opacity duration-[1500ms] ${step >= 3 ? "opacity-100" : "opacity-0"}`}
            style={{ fontSize: "clamp(1rem, 2.2vw, 1.5rem)" }}
          >
            {VERSE_2}
          </p>

          {/* Reference */}
          <p
            className={`font-serif text-amber-300/60 italic mt-4 transition-opacity duration-[1500ms] ${step >= 3 ? "opacity-100" : "opacity-0"}`}
            style={{ fontSize: "clamp(0.8rem, 1.5vw, 1rem)" }}
          >
            &mdash; {REFERENCE}
          </p>

          {/* Buttons */}
          {showButtons && (
            <div className="flex flex-col gap-3 mt-10 animate-fade-in">
              <button
                onClick={handleBegin}
                className="px-10 py-3 lg:px-14 lg:py-4 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg lg:text-2xl hover:bg-amber-600/40 transition"
              >
                Begin Journey
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-amber-100/40 hover:text-amber-100/70 transition text-sm"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom caption bar (subtitle for narration) */}
      <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-6 text-center z-10 pointer-events-none">
        {step >= 1 && step < 3 && (
          <p className="text-amber-100/25 text-xs font-serif italic">
            {VERSE_1}
          </p>
        )}
        {step >= 3 && !showButtons && (
          <p className="text-amber-100/25 text-xs font-serif italic">
            {VERSE_2} &mdash; {REFERENCE}
          </p>
        )}
      </div>
    </div>
  );
}