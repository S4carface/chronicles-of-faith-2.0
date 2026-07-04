import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import * as Sound from "@/game/soundManager";

// Shows a non-intrusive "Tap to enable sound" button when audio is locked.
// Disappears once audio is unlocked via user gesture.
export default function AudioUnlockButton() {
  const [needsUnlock, setNeedsUnlock] = useState(Sound.needsUnlockPrompt());

  useEffect(() => {
    // Register the global first-tap listener on mount (once, app-wide)
    Sound.initGlobalUnlockListener();
    const unsub = Sound.subscribeUnlock(() => {
      setNeedsUnlock(Sound.needsUnlockPrompt());
    });
    return unsub;
  }, []);

  if (!needsUnlock) return null;

  const handleTap = () => {
    Sound.unlockAudio();
    // sfx click after unlock attempt
    Sound.sfx.click();
    setNeedsUnlock(Sound.needsUnlockPrompt());
  };

  const resumeMode = Sound.isResumeMode();

  return (
    <button
      onClick={handleTap}
      className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-amber-400/60 bg-slate-900/95 text-amber-200 text-sm font-medium shadow-lg shadow-amber-500/30 animate-fade-in hover:bg-slate-800 transition active:scale-95"
      style={{ backdropFilter: "blur(8px)", animation: "iconFloat 2s ease-in-out infinite, fadeIn 0.4s ease-out" }}
    >
      <Volume2 className="w-4 h-4" style={{ animation: "iconFloat 2s ease-in-out infinite" }} />
      {resumeMode ? "Tap to resume sound" : "Tap to enable sound"}
    </button>
  );
}