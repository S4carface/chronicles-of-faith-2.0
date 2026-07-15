import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/game/GameContext";
import { HEROES } from "@/data/heroes";
import { getCardById } from "@/data/cards";
import { HERO_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function HeroSelect() {
  const { profile, startRun } = useGame();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const dragStartX = useRef(0);
  const dragDelta = useRef(0);

  const hero = HEROES[index];
  const unlocked = profile.unlockedHeroes.includes(hero.id);
  const hasAttackCards = hero.starterDeck.some(id => getCardById(id)?.type === "attack");

  const goNext = () => {
    Sound.sfx.click();
    setIndex(i => (i + 1) % HEROES.length);
  };

  const goPrev = () => {
    Sound.sfx.click();
    setIndex(i => (i - 1 + HEROES.length) % HEROES.length);
  };

  const handleStart = () => {
    if (!unlocked) return;
    Sound.sfx.click();
    startRun(hero.id);
  };

  const onDragStart = (e) => {
    dragStartX.current = (e.touches ? e.touches[0].clientX : e.clientX);
  };

  const onDragEnd = (e) => {
    const endX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    dragDelta.current = endX - dragStartX.current;
    if (Math.abs(dragDelta.current) > 50) {
      if (dragDelta.current < 0) goNext();
      else goPrev();
    }
  };

  return (
<div
  className="h-[100dvh] overflow-hidden flex flex-col p-4 sm:p-6"
  style={{
    background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 100%)",
    touchAction: "pan-x",
    overscrollBehavior: "none",
  }}
>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button onClick={() => { Sound.sfx.click(); navigate("/"); }} className="text-amber-100/60 hover:text-amber-200 transition text-sm">
          ← Menu
        </button>
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-serif text-amber-200">Choose Your Hero</h1>
          <p className="text-amber-100/50 text-xs sm:text-sm">Swipe to browse</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Carousel */}
<div
  className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
  style={{
    touchAction: "pan-x",
    overscrollBehavior: "none",
  }}
  onTouchStart={onDragStart}
        onTouchEnd={onDragEnd}
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
      >
        <div className="relative w-full max-w-sm lg:max-w-2xl" style={{ cursor: "grab" }}>
          {/* Nav arrows */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-6 lg:-translate-x-8 z-10 w-9 h-9 lg:w-11 lg:h-11 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 text-lg lg:text-2xl hover:bg-amber-500/20 transition"
          >
            ‹
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-6 lg:translate-x-8 z-10 w-9 h-9 lg:w-11 lg:h-11 rounded-full border-2 border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 text-lg lg:text-2xl hover:bg-amber-500/20 transition"
          >
            ›
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={hero.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl border-2 p-4 lg:p-10 text-center ${
                unlocked
                  ? "border-amber-400/60 bg-amber-500/10"
                  : "border-slate-700/30 bg-slate-900/40 opacity-60"
              }`}
              style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.85) 0%, rgba(15,26,48,0.85) 100%)" }}
            >
              <div className="mb-3 flex justify-center">
                {unlocked && HERO_ART[hero.id] ? (
                  <div className="w-24 h-24 lg:w-44 lg:h-44 rounded-xl border-2 border-amber-400/40 overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
                    <img src={HERO_ART[hero.id]} alt={hero.name} className="art-portrait" />
                  </div>
                ) : (
                  <span className="text-7xl lg:text-8xl">{unlocked ? hero.icon : "🔒"}</span>
                )}
              </div>
              <h3 className="text-2xl lg:text-4xl font-serif text-amber-100">{hero.name}</h3>
              <p className="text-amber-300/60 text-xs lg:text-base mb-4">{hero.title}</p>

              {!unlocked ? (
                <p className="text-amber-100/40 text-sm py-6">Complete Genesis to unlock</p>
              ) : (
                <div className="space-y-2 lg:space-y-3 mb-4 lg:max-w-xl lg:mx-auto">
                  <p className="text-amber-100/60 text-xs lg:text-base">{hero.description}</p>
                  <div className="text-xs lg:text-base text-emerald-300/70 bg-emerald-900/20 rounded-lg p-2 lg:p-3">
                    ⚡ {hero.ability}
                  </div>
                  {hero.passive && (
                    <div className="text-xs lg:text-base text-sky-300/70 bg-sky-900/20 rounded-lg p-2 lg:p-3">
                      🌟 Passive: {hero.passive.description}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 text-xs lg:text-base">
                    <span className="text-amber-100/40">❤️ {hero.maxHp} HP</span>
                    <span className="text-amber-100/40">🃏 {hero.starterDeck.length} cards</span>
                    {hasAttackCards ? (
                      <span className="text-red-300/50">⚔️ Has attacks</span>
                    ) : (
                      <span className="text-red-400/80">⚠️ No attacks!</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Tab indicators */}
      <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
        {HEROES.map((h, i) => (
          <button
            key={h.id}
            onClick={() => { Sound.sfx.click(); setIndex(i); }}
            className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-amber-400" : "w-2.5 bg-amber-100/20"}`}
          />
        ))}
      </div>

      {/* Bottom action */}
      <div className="flex-shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {unlocked && !hasAttackCards && (
          <div className="mb-3 px-4 py-2 rounded-lg border border-red-400/40 bg-red-900/20 text-red-200 text-sm text-center">
            ⚠️ This hero's deck has no attack cards!
          </div>
        )}
        <button
          onClick={handleStart}
          disabled={!unlocked}
          className="w-full max-w-sm lg:max-w-md mx-auto block px-8 py-4 lg:py-5 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg lg:text-2xl hover:bg-amber-600/40 transition disabled:opacity-40 disabled:cursor-not-allowed animate-pulse"
        >
          {unlocked ? "⚔️ Begin Genesis Run" : "🔒 Locked"}
        </button>
      </div>
    </div>
  );
}