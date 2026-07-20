import React, { useEffect, useState } from "react";
import { HOME_ART } from "@/data/art";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function gateDevLog(...args) {
  if (import.meta.env?.DEV) console.info("[Opening Audio Gate]", ...args);
}

// The first deliberate in-game tap. iOS Safari does not reliably treat
// opening a link from Messages/another app as gesture-authorization for
// audible media inside the freshly-loaded page — the first real tap here is
// what unlocks the mobile audio system, so intro music can start immediately
// instead of the app silently auto-advancing into the Genesis cinematic.
//
// Shown at most once per page load (see Sound.isOpeningGateDismissed): a
// module-level flag, not sessionStorage, so a genuine reload — which gives
// the browser a fresh, suspended AudioContext — naturally shows it again,
// while ordinary in-app navigation never does.
export default function OpeningAudioGate() {
  const { profile, run, savedStoryExists, triggerIntroReplay } = useGame();
  const [dismissed, setDismissed] = useState(() => Sound.isOpeningGateDismissed());

  useEffect(() => {
    if (!dismissed) {
      gateDevLog("Tap to Begin shown", { shownAt: nowMs() });
    }
    // Only ever relevant for the initial mount — this gate doesn't reappear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleTap = () => {
    const tapAt = nowMs();
    gateDevLog("Tap to Begin pressed", { tapAt, ctxUnlockedBefore: Sound.isAudioUnlocked() });

    // Issued synchronously within this gesture — required for iOS Safari to
    // treat the resume as gesture-authorized. Also resumes any music theme
    // a returning player's Home screen already queued while locked.
    Sound.unlockAudio();

    const isFirstTime = !profile.tutorialSeen && !run && !savedStoryExists;
    gateDevLog("Opening flow decision", { isFirstTime, tutorialSeen: profile.tutorialSeen });

    if (isFirstTime) {
      gateDevLog("Opening transition start", { purpose: "onboarding", sinceTapMs: (nowMs() - tapAt).toFixed(1) });
      // Same synchronous gesture — starts Genesis intro music/narration and
      // reveals the cinematic. See GameContext.triggerIntroReplay.
      triggerIntroReplay("onboarding");
    }

    Sound.dismissOpeningGate();
    setDismissed(true);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6 cursor-pointer"
      style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}
      role="button"
      tabIndex={0}
      aria-label="Tap to begin"
      onClick={handleTap}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleTap();
        }
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
            animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}

      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: "rgba(201,168,76,0.15)" }} />
        <div
          className="relative w-20 h-20 rounded-full border-2 border-amber-400/40 overflow-hidden animate-icon-float"
          style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
        >
          <img src={HOME_ART.cross} alt="Chronicles of Faith" className="art-portrait" />
        </div>
      </div>

      <h1
        className="font-serif text-amber-200 tracking-wide mb-1"
        style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}
      >
        Chronicles of Faith
      </h1>
      <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-8" />

      <div
        className="relative min-h-11 px-10 py-3 rounded-full border-2 border-amber-400/60 text-amber-200 font-serif font-bold tracking-wide animate-pulse flex items-center justify-center"
        style={{
          fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
          background: "linear-gradient(135deg, rgba(180,140,40,0.18) 0%, rgba(120,90,20,0.14) 100%)",
          boxShadow: "0 0 24px rgba(201,168,76,0.15)",
        }}
      >
        Tap to Begin
      </div>

      <p className="text-amber-100/40 text-[11px] mt-5 font-serif italic text-center max-w-xs">
        Tap anywhere to enter
      </p>
    </div>
  );
}
