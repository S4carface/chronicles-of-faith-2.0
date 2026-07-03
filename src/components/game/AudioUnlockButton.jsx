import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import * as Sound from "@/game/soundManager";

// Shows a non-intrusive "Tap to enable sound" button when audio is locked.
// Disappears once audio is unlocked via user gesture.
export default function AudioUnlockButton() {
  const [needsUnlock, setNeedsUnlock] = useState(Sound.needsUnlockPrompt());

  useEffect(() => {
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

  return (
    <button
      onClick={handleTap}
      className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-amber-400/50 bg-slate-900/90 text-amber-200 text-sm font-medium shadow-lg shadow-amber-500/20 animate-fade-in hover:bg-slate-800 transition active:scale-95"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <Volume2 className="w-4 h-4 animate-icon-float" />
      Tap to enable sound
    </button>
  );
}