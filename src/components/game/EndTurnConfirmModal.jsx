import React from "react";
import { AlertTriangle, Play } from "lucide-react";

export default function EndTurnConfirmModal({ type, onPlaySelected, onEndTurn, onCancel, onDisablePlayableWarning }) {
  const isSelected = type === "selected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.9)" }} onClick={onCancel}>
      <div
        className="max-w-sm w-full rounded-2xl border-2 p-6 animate-fade-in"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)", borderColor: "rgba(251,191,36,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <AlertTriangle className="w-10 h-10 text-amber-400/80" />
        </div>

        {isSelected ? (
          <>
            <p className="text-center text-amber-100 text-sm leading-relaxed mb-5">
              You selected a card but have not played it. End turn anyway?
            </p>
            <div className="space-y-2.5">
              <button
                onClick={onPlaySelected}
                className="w-full px-5 py-3 rounded-lg border-2 border-emerald-400/70 bg-gradient-to-r from-emerald-600/40 to-emerald-500/30 text-emerald-50 font-bold text-sm hover:from-emerald-600/50 hover:to-emerald-500/40 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4" /> Play Selected Card
              </button>
              <button
                onClick={onEndTurn}
                className="w-full px-5 py-2.5 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 font-medium text-sm hover:bg-amber-600/30 transition"
              >
                End Turn Anyway
              </button>
              <button
                onClick={onCancel}
                className="w-full px-5 py-2 rounded-lg border border-slate-500/30 bg-slate-800/30 text-amber-100/50 text-xs hover:bg-slate-800/50 transition"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-amber-100 text-sm leading-relaxed mb-5">
              Playable cards remain. End turn?
            </p>
            <div className="space-y-2.5">
              <button
                onClick={onCancel}
                className="w-full px-5 py-3 rounded-lg border-2 border-emerald-400/70 bg-gradient-to-r from-emerald-600/40 to-emerald-500/30 text-emerald-50 font-bold text-sm hover:from-emerald-600/50 hover:to-emerald-500/40 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Keep Playing
              </button>
              <button
                onClick={onEndTurn}
                className="w-full px-5 py-2.5 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 font-medium text-sm hover:bg-amber-600/30 transition"
              >
                End Turn
              </button>
              <button
                onClick={onDisablePlayableWarning}
                className="w-full px-5 py-2 text-xs text-amber-100/50 transition hover:text-amber-100/80"
              >
                Don&apos;t Show Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
