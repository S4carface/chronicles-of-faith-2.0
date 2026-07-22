import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

// Session-scoped flag so the one-time "Enable sound" tooltip never reappears
// on the same tab session (survives reloads, resets on a new tab/session).
const TOOLTIP_SESSION_KEY = "cof_sound_tooltip_shown";
const TOOLTIP_MS = 3500;

// Compact, safe-area-aware speaker control in the top-right corner. Replaces
// the old full-width "Tap to Enable Sound" banner that competed with the
// first-time Home crest and title.
//
// The real audio unlock is still driven by the app-wide first-gesture listener
// registered here (initGlobalUnlockListener) — ANY tap anywhere unlocks the
// AudioContext and starts music per the user's settings — so this button is a
// visible affordance/status, not the sole unlock path. That means the game
// stays fully playable whether or not the player ever taps it.
//
// Visibility:
//   - Audio locked/suspended (needs unlock or a post-background resume): the
//     button is shown on any screen, so the existing resume-anywhere behavior
//     is preserved (speaker-off icon).
//   - Audio unlocked: kept visible ONLY on the pre-tutorial Home for status
//     (speaker-on icon); hidden everywhere else so it never clutters the
//     returning Home or gameplay and no second control is added anywhere.
export default function AudioUnlockButton() {
  const [needsUnlock, setNeedsUnlock] = useState(Sound.needsUnlockPrompt());
  const [attention, setAttention] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();
  const { profile } = useGame();

  useEffect(() => {
    // Register the global first-tap listener on mount (once, app-wide).
    Sound.initGlobalUnlockListener();
    const unsub = Sound.subscribeUnlock(() => {
      setNeedsUnlock(Sound.needsUnlockPrompt());
    });
    return unsub;
  }, []);

  // One-time-per-session attention cue (tooltip + restrained glow), only for
  // the genuine first-time "enable" case — never on a background-resume
  // prompt, and never twice in the same tab session (the flag persists across
  // reloads within the tab).
  useEffect(() => {
    if (!Sound.needsUnlockPrompt() || Sound.isResumeMode()) return;
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(TOOLTIP_SESSION_KEY) === "1";
    } catch {}
    if (alreadyShown) return;
    try {
      sessionStorage.setItem(TOOLTIP_SESSION_KEY, "1");
    } catch {}
    setAttention(true);
    const t = setTimeout(() => setAttention(false), TOOLTIP_MS);
    return () => clearTimeout(t);
  }, []);

  const isFirstTimeHome = location.pathname === "/" && !profile?.tutorialSeen;
  const enabled = !needsUnlock;

  // Locked/suspended → always offer the control (enable or resume). Unlocked →
  // keep it only on the pre-tutorial Home for status; hide elsewhere.
  if (enabled && !isFirstTimeHome) return null;

  const handleTap = () => {
    // Preserve the exact existing unlock behavior — the tap still counts as
    // the required user gesture, resumes the AudioContext, and lets the global
    // handler start music per settings. No duplicate playback or volume/voice
    // changes are introduced here.
    Sound.unlockAudio();
    Sound.sfx.click();
    setNeedsUnlock(Sound.needsUnlockPrompt());
    setAttention(false);
  };

  const showAttention = attention && !enabled;

  // Rendered outside the animated route wrapper (see App.jsx), so this fixed
  // element positions against the viewport with no transformed ancestor.
  return (
    <div className="fixed z-[70] top-[calc(0.875rem+env(safe-area-inset-top))] right-[calc(0.875rem+env(safe-area-inset-right))]">
      <div className="relative">
        {/* Restrained pulsing glow while awaiting the first tap. Uses the
            shared sacred-glow utility, which already downgrades to a static
            glow under prefers-reduced-motion (see index.css). */}
        {showAttention && (
          <span
            className="pointer-events-none absolute -inset-1 rounded-full animate-sacred-glow"
            aria-hidden="true"
          />
        )}

        <button
          onClick={handleTap}
          aria-label={enabled ? "Sound enabled" : "Enable sound"}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/50 bg-slate-900/90 text-amber-200 shadow-md shadow-amber-500/20 transition hover:border-amber-300/70 hover:bg-slate-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none motion-reduce:active:scale-100"
          style={{ backdropFilter: "blur(6px)" }}
        >
          {enabled ? (
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* Small tooltip below the button — right-aligned in the top-right
            corner so it stays clear of the centered crest and title. It is an
            optional attention cue, so on the narrowest phones (<360px) where
            the large hero title reaches close to this corner it is suppressed
            (the muted icon + glow still draw the eye) rather than risk
            clipping the title's edge. Auto-dismisses with the attention cue. */}
        {showAttention && (
          <span
            role="status"
            className={`pointer-events-none absolute right-0 top-full mt-2 hidden min-[360px]:block whitespace-nowrap rounded-md border border-amber-400/70 bg-slate-950/95 px-2.5 py-1 text-[11px] font-semibold text-amber-50 shadow-lg shadow-black/60 ${
              prefersReducedMotion ? "" : "animate-fade-in"
            }`}
          >
            Enable sound
          </span>
        )}
      </div>
    </div>
  );
}
