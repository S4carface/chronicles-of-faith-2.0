import React, { useEffect, useState } from "react";

export default function StoryNarration({ text, onComplete, skipable = true }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

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
    return () => clearInterval(interval);
  }, [text]);

  const handleContinue = () => {
    if (onComplete) onComplete();
  };

  const skip = () => {
    if (!skipable) return;
    setDisplayed(text);
    setDone(true);
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
      <div className="relative max-w-2xl px-8 text-center">
        <div className="text-6xl mb-6 opacity-80">📖</div>
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