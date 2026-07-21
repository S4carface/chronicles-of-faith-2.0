import React, { useState, useEffect } from "react";
import { Cross } from "lucide-react";

// Fixed, deterministic particle field — declared once at module scope so
// positions never change on re-render (this screen can now stay mounted for
// several seconds while Home-critical artwork loads, so a Math.random()
// field computed directly in JSX would visibly jump on every re-render).
const LOADING_PARTICLES = [
  { left: 6, top: 15, size: 3, duration: 7, delay: 0 },
  { left: 18, top: 62, size: 4, duration: 9.5, delay: 1.1 },
  { left: 30, top: 34, size: 2.5, duration: 6.5, delay: 2.4 },
  { left: 42, top: 78, size: 3.5, duration: 8.5, delay: 0.6 },
  { left: 54, top: 22, size: 3, duration: 7.5, delay: 3.2 },
  { left: 66, top: 58, size: 4, duration: 9, delay: 1.8 },
  { left: 78, top: 12, size: 2.5, duration: 6, delay: 2.9 },
  { left: 88, top: 70, size: 3, duration: 8, delay: 0.3 },
  { left: 12, top: 88, size: 2.5, duration: 10, delay: 3.6 },
  { left: 60, top: 90, size: 3.5, duration: 7.8, delay: 1.5 },
  { left: 94, top: 40, size: 2, duration: 9.2, delay: 2.1 },
  { left: 24, top: 6, size: 3, duration: 6.8, delay: 4 },
];

const SCRIPTURES = [
  { text: "In the beginning, God created the heavens and the earth.", ref: "Genesis 1:1" },
  { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart.", ref: "Proverbs 3:5" },
  { text: "Faith is the substance of things hoped for.", ref: "Hebrews 11:1" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { text: "Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9" },
  { text: "For God so loved the world that he gave his one and only Son.", ref: "John 3:16" },
  { text: "The earth is the Lord's, and everything in it.", ref: "Psalm 24:1" },
  { text: "Commit your way to the Lord; trust in him.", ref: "Psalm 37:5" },
];

const TIPS = [
  "Tip: Faith refills each turn.",
  "Tip: Block before heavy enemy attacks.",
  "Tip: Scripture cards can heal, draw, or strengthen your hand.",
  "Tip: Enemy intent shows what your opponent plans to do next.",
  "Tip: Attack cards damage enemies. Miracle cards deal holy damage.",
  "Tip: Treasure rooms give rewards. Story Choices shape your journey.",
  "Tip: Divine Intervention can save a difficult run.",
  "Tip: Keep your HP high before boss battles.",
  "Tip: Tap an enemy intent chip to see what it does.",
  "Tip: Daily Challenge gives the same battle to all players each day.",
];

export default function LoadingScreen({ message }) {
  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * TIPS.length));
  const [scriptureIdx, setScriptureIdx] = useState(Math.floor(Math.random() * SCRIPTURES.length));

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIdx(prev => (prev + 1) % TIPS.length);
    }, 4000);
    const scriptureInterval = setInterval(() => {
      setScriptureIdx(prev => (prev + 1) % SCRIPTURES.length);
    }, 6000);
    return () => { clearInterval(tipInterval); clearInterval(scriptureInterval); };
  }, []);

  const scripture = SCRIPTURES[scriptureIdx];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {LOADING_PARTICLES.map((particle, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          left: `${particle.left}%`,
          top: `${particle.top}%`,
          background: "rgba(201,168,76,0.35)",
          animation: `float ${particle.duration}s ease-in-out infinite`,
          animationDelay: `${particle.delay}s`,
        }} />
      ))}

      {/* CSS + a lightweight local icon only — this screen must never
          depend on the same large Home artwork it exists to wait for. */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: "rgba(201,168,76,0.15)" }} />
        <div className="relative w-20 h-20 rounded-full border-2 border-amber-400/40 flex items-center justify-center animate-icon-float" style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}>
          <Cross className="h-8 w-8 text-amber-300/80" strokeWidth={1.75} aria-hidden="true" />
        </div>
      </div>

      <h1 className="font-serif text-amber-200 tracking-wide mb-1" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
        Chronicles of Faith
      </h1>
      <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-4" />

      <p className="text-amber-100/50 text-xs font-serif italic text-center max-w-xs mb-1">"{scripture.text}"</p>
      <p className="text-amber-300/40 text-[10px] mb-6">— {scripture.ref}</p>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-amber-100/60 text-sm font-serif">{message || "Preparing the next chapter..."}</p>
      </div>

      <div className="max-w-xs text-center min-h-[2rem] px-4">
        <p key={tipIdx} className="text-amber-300/40 text-[11px] animate-fade-in">{TIPS[tipIdx]}</p>
      </div>
    </div>
  );
}