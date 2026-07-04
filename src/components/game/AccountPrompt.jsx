import React from "react";
import { HardDrive } from "lucide-react";
import * as Sound from "@/game/soundManager";

export default function AccountPrompt({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400/30 bg-amber-900/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-amber-300" />
          </div>
        </div>
        <h2 className="text-lg font-serif text-amber-200 text-center mb-2">Progress Saved Locally</h2>
        <p className="text-amber-100/50 text-sm text-center mb-6">
          Your cards, unlocks, and progress are saved on this device. Leaderboard scores are shared online. Cloud save is coming soon.
        </p>
        <button
          onClick={() => { Sound.sfx.click(); onDismiss(); }}
          className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
        >
          Got It
        </button>
      </div>
    </div>
  );
}