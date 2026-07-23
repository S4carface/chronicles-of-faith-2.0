import React, { useEffect, useRef, useState } from "react";
import * as Sound from "@/game/soundManager";
import { RESET_CONFIRMATION_WORD } from "@/game/progressionReset";

// Danger Zone confirmation for permanently erasing gameplay progress.
// Deliberately requires typing "RESET" (trimmed, case-sensitive) rather than
// a Yes/No or hold gesture — the final button stays disabled until the
// typed text matches exactly, so a stray tap can never trigger the erase.
export default function ResetProgressModal({ pending, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const isConfirmed = typed.trim() === RESET_CONFIRMATION_WORD;

  const handleCancel = () => {
    if (pending) return;
    Sound.sfx.click();
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8,12,24,0.95)" }}
      onClick={handleCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label="Reset Game Progress — this action is permanent and destructive"
        aria-describedby="reset-progress-warning reset-progress-preserve"
        onClick={(e) => e.stopPropagation()}
        className="max-w-sm w-full rounded-2xl border-2 border-red-500/50 p-5 sm:p-6 animate-fade-in outline-none"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
      >
        <h2 className="text-xl font-serif text-red-300 text-center mb-3">
          RESET GAME PROGRESS
        </h2>

        <p id="reset-progress-warning" className="text-amber-100/70 text-sm text-center mb-2 leading-relaxed">
          This permanently erases your cards, Gold, Card Fragments, Faith
          Shards, decks, campaign progress, unlocked heroes, difficulty
          progress, and saved runs.
        </p>
        <p id="reset-progress-preserve" className="text-amber-100/50 text-xs text-center mb-4 leading-relaxed">
          Your account, display name, language, audio, and accessibility
          settings will remain.
        </p>

        <label className="block text-amber-100/50 text-[11px] uppercase tracking-wide mb-1.5" htmlFor="reset-confirm-input">
          Type RESET to confirm
        </label>
        <input
          id="reset-confirm-input"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={pending}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="RESET"
          className="w-full px-4 py-2.5 mb-4 rounded-lg bg-slate-950/60 border-2 border-red-500/30 text-amber-100 text-center tracking-widest font-semibold outline-none focus:border-red-400/60 disabled:opacity-50"
        />

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={pending}
            className="flex-1 min-h-11 rounded-lg border border-slate-500/30 text-amber-100/70 text-sm font-medium hover:bg-slate-800/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (!pending && isConfirmed) onConfirm(); }}
            disabled={pending || !isConfirmed}
            className="flex-1 min-h-11 rounded-lg border-2 border-red-500/60 bg-red-700/30 text-red-100 font-bold text-sm hover:bg-red-700/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? "Erasing…" : "Erase Progress"}
          </button>
        </div>
      </div>
    </div>
  );
}
