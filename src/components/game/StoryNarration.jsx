import React, { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import * as Sound from "@/game/soundManager";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

export default function StoryNarration({ text, onComplete, skipable = true }) {
  const { profile } = useGame();
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [narrationOn, setNarrationOn] = useState(profile.settings.narration !== false);
  const narratedRef = useRef(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
      }
    }, 35);

    // Start voice narration
    if (narrationOn && !narratedRef.current) {
      narratedRef.current = true;
      Sound.speakNarration(text, (profile.settings.narrationVolume ?? 50) / 100);
    }

    return () => {
      clearInterval(interval);
      Sound.stopNarration();
    };
  }, [text]);

  const handleContinue = () => {
    Sound.stopNarration();
    if (onComplete) onComplete();
  };

  const skip = () => {
    if (!skipable) return;
    setDisplayed(text);
    setDone(true);
  };

  const replayNarration = () => {
    Sound.speakNarration(text, (profile.settings.narrationVolume ?? 50) / 100);
  };

  const toggleNarration = () => {
    if (narrationOn) {
      Sound.stopNarration();
      setNarrationOn(false);
    } else {
      setNarrationOn(true);
      replayNarration();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={skip}
      style={{ background: "radial-gradient(ellipse at center, rgba(26,39,68,0.95) 0%, rgba(8,12,24,0.98) 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(201,168,76,${0.3 + Math.random() * 0.4})`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Narration controls */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 flex gap-2 z-10">
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

      <div className="relative max-w-2xl px-8 text-center">
        <div className="flex justify-center mb-6">
          <img src={HOME_ART.cross} alt="" className="w-14 h-14 object-cover rounded-full border-2 border-amber-400/30 opacity-80 animate-icon-float" />
        </div>
        <p className="text-2xl md:text-3xl font-serif text-amber-100 leading-relaxed min-h-[6rem]">
          {displayed}
          {!done && <span className="animate-pulse">▊</span>}
        </p>
        {done && (
          <button
            onClick={(e) => { e.stopPropagation(); handleContinue(); }}
            className="mt-8 px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg hover:bg-amber-600/40 transition animate-fade-in"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}