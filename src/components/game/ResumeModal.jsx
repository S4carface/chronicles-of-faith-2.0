import React from "react";
import { Swords } from "lucide-react";
import * as Sound from "@/game/soundManager";

export default function ResumeModal({ onResume, onAbandon }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
      <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full border-2 border-amber-400/40 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <Swords className="w-7 h-7 text-amber-300/80" />
          </div>
        </div>
        <h2 className="text-xl font-serif text-amber-200 text-center mb-2">Continue Your Journey?</h2>
        <p className="text-amber-100/50 text-sm text-center mb-6">You have an unfinished battle.</p>
        <div className="space-y-3">
          <button
            onClick={() => { Sound.sfx.click(); onResume(); }}
            className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition"
          >
            Resume Battle
          </button>
          <button
            onClick={() => { Sound.sfx.click(); onAbandon(); }}
            className="w-full px-6 py-2 rounded-lg border border-red-400/30 bg-red-900/20 text-red-200 text-sm hover:bg-red-800/30 transition"
          >
            Abandon Run
          </button>
        </div>
      </div>
    </div>
  );
}