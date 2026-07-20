import React, { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX, RotateCcw, BookOpen, ArrowRight, Headphones } from "lucide-react";
import * as Sound from "@/game/soundManager";
import { recordPassageListened } from "@/game/playerStats";
import { useGame } from "@/game/GameContext";
import { HOME_ART } from "@/data/art";

// Layered narration: Quick Summary → Read Full Passage / Listen / Continue
// Reduces reading fatigue while keeping the full verse available.
export default function StoryNarration({ text, summary, onComplete, skipable = true }) {
  const { profile } = useGame();
  const [mode, setMode] = useState("summary"); // "summary" | "full"
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [narrationOn, setNarrationOn] = useState(Sound.toBoolean(profile.settings.narration));
  const [isListening, setIsListening] = useState(false);
  const narratedRef = useRef(false);

  // Typewriter effect for full passage
  useEffect(() => {
    if (mode !== "full") return;
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
    return () => clearInterval(interval);
  }, [mode, text]);

  // Auto-listen check: if narration is on and user picks "Listen"
  useEffect(() => {
    return () => { Sound.stopNarration(); };
  }, []);

  const handleReadFull = () => {
    Sound.sfx.click();
    setMode("full");
  };

  const handleListen = () => {
    Sound.sfx.click();
    setIsListening(true);
    Sound.speakNarration(text, (profile.settings.narrationVolume ?? 50) / 100, profile.settings.narrationVoice);
    recordPassageListened();
  };

  const handleContinue = () => {
    Sound.stopNarration();
    Sound.sfx.click();
    if (onComplete) onComplete();
  };

  const skip = () => {
    if (!skipable) return;
    setDisplayed(text);
    setDone(true);
  };

  const replayNarration = () => {
    Sound.speakNarration(text, (profile.settings.narrationVolume ?? 50) / 100, profile.settings.narrationVoice);
    recordPassageListened();
  };

  const toggleNarration = () => {
    if (narrationOn) {
      Sound.stopNarration();
      setIsListening(false);
      setNarrationOn(false);
    } else {
      setNarrationOn(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={mode === "full" ? skip : undefined}
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

      {/* Narration toggle */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); toggleNarration(); }}
          className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          {narrationOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        {narrationOn && mode === "full" && (
          <button
            onClick={(e) => { e.stopPropagation(); replayNarration(); }}
            className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* === SUMMARY MODE: Quick Summary + three choices === */}
      {mode === "summary" && (
        <div className="relative max-w-2xl lg:max-w-[700px] px-8 lg:px-12 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/30 opacity-80 animate-icon-float" style={{ background: "#0F1A30" }}>
              <img src={HOME_ART.cross} alt="" className="art-portrait" />
            </div>
          </div>

          {/* Quick Summary — the digestible one-liner */}
          {summary && (
            <div className="mb-6 px-5 py-3 rounded-xl border border-amber-400/30 bg-amber-900/15">
              <p className="text-amber-300/60 text-[10px] uppercase tracking-widest mb-1">Quick Summary</p>
              <p className="font-serif text-amber-100 text-lg lg:text-xl leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Secondary row: Read Full Passage (outline) + Listen (compact icon control) */}
          <div className="flex max-w-sm mx-auto gap-2">
            <button
              onClick={handleReadFull}
              className="flex flex-1 items-center justify-center gap-1.5 min-h-11 px-4 py-2.5 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/80 font-serif text-sm hover:bg-slate-800/60 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Read Full Passage
            </button>
            {narrationOn && (
              <button
                onClick={handleListen}
                aria-label={isListening ? "Listening" : "Listen to passage"}
                className={`flex flex-shrink-0 items-center justify-center gap-1.5 min-h-11 px-4 py-2.5 rounded-lg border transition ${
                  isListening
                    ? "border-sky-400/60 bg-sky-900/30 text-sky-100"
                    : "border-sky-400/25 bg-slate-800/40 text-sky-200/80 hover:bg-sky-900/20"
                } font-serif text-sm`}
              >
                <Headphones className="w-3.5 h-3.5" />
                {isListening ? "Listening..." : "Listen"}
              </button>
            )}
          </div>

          {/* Primary action — Continue clearly represents progression */}
          <button
            onClick={handleContinue}
            className="flex items-center justify-center gap-2 max-w-sm mx-auto mt-3 w-full px-8 py-3.5 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif font-bold text-lg hover:bg-amber-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-500/20"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* === FULL PASSAGE MODE: typewriter text === */}
      {mode === "full" && (
        <div className="relative max-w-2xl lg:max-w-[900px] px-8 lg:px-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/30 opacity-80 animate-icon-float" style={{ background: "#0F1A30" }}>
              <img src={HOME_ART.cross} alt="" className="art-portrait" />
            </div>
          </div>

          {/* Quick Summary stays visible above full text */}
          {summary && (
            <div className="mb-4 px-4 py-2 rounded-lg border border-amber-400/20 bg-amber-900/10">
              <p className="text-amber-100/70 text-sm font-serif italic">{summary}</p>
            </div>
          )}

          <p className="font-serif text-amber-100 leading-relaxed min-h-[6rem]" style={{ fontSize: "clamp(1.25rem, 3vw, 2.25rem)" }}>
            {displayed}
            {!done && <span className="animate-pulse">▊</span>}
          </p>

          {done && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8 animate-fade-in">
              {narrationOn && (
                <button
                  onClick={(e) => { e.stopPropagation(); replayNarration(); }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-sky-400/40 bg-sky-900/15 text-sky-200 font-serif text-sm hover:bg-sky-800/30 transition"
                >
                  <Headphones className="w-4 h-4" />
                  Listen
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleContinue(); }}
                className="flex items-center justify-center gap-2 px-10 py-3 lg:px-14 lg:py-4 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg lg:text-2xl hover:bg-amber-600/40 transition"
              >
                Continue →
              </button>
            </div>
          )}

          {!done && (
            <p className="text-amber-100/30 text-xs mt-6">Tap to reveal full text</p>
          )}
        </div>
      )}
    </div>
  );
}