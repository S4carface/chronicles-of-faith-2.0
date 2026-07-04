import React from "react";
import { Cloud, X } from "lucide-react";
import * as Sound from "@/game/soundManager";

export default function CloudSaveComingSoon({ onClose }) {
  const handleClose = () => {
    Sound.sfx.click();
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(8,12,24,0.95)" }}
      onClick={handleClose}
    >
      <div
        className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6 animate-fade-in relative"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-amber-100/40 hover:text-amber-200 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full border-2 border-amber-400/30 flex items-center justify-center" style={{ background: "rgba(180,140,40,0.12)" }}>
            <Cloud className="w-7 h-7 text-amber-300/80" />
          </div>
        </div>

        <h2 className="text-xl font-serif text-amber-200 text-center mb-3">
          Cloud Save Coming Soon
        </h2>

        <p className="text-amber-100/55 text-sm text-center leading-relaxed mb-6">
          For now, your progress is saved on this device. Leaderboard scores are shared
          online. Soon you'll be able to sign in and sync cards, streaks, scores, and story
          progress across devices.
        </p>

        <button
          onClick={handleClose}
          className="w-full px-6 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold hover:bg-amber-600/40 transition active:scale-[0.98]"
        >
          Got It
        </button>
      </div>
    </div>
  );
}