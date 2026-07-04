import React from "react";
import { Cloud, User } from "lucide-react";
import * as Sound from "@/game/soundManager";

export default function AccountPrompt({ onDismiss, onSignIn }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400/30 bg-amber-900/20 flex items-center justify-center">
            <Cloud className="w-6 h-6 text-amber-300" />
          </div>
        </div>
        <h2 className="text-lg font-serif text-amber-200 text-center mb-2">Want to save your progress across devices?</h2>
        <p className="text-amber-100/50 text-sm text-center mb-6">
          Save your cards, streaks, scores, and progress across devices.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => { Sound.sfx.click(); onSignIn(); }}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            Sign In to Save Across Devices
          </button>
          <button
            onClick={() => { Sound.sfx.click(); onDismiss(); }}
            className="w-full px-6 py-2.5 rounded-lg border border-amber-400/20 bg-slate-800/40 text-amber-100/60 text-sm hover:bg-slate-800/60 transition flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            Play as Guest
          </button>
        </div>
        <p className="text-amber-100/30 text-xs text-center mt-4 italic">
          Guest progress is saved on this device only.
        </p>
      </div>
    </div>
  );
}