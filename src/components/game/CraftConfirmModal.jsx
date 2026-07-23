import React, { useEffect, useRef } from "react";
import * as Sound from "@/game/soundManager";
import { getCardRarity } from "@/data/cardRarity";

// Single confirmation step before spending Card Fragments + Gold to craft a
// card. Deliberately plain: no hold gesture, no full-screen cinematic — just
// the exact cost, the player's current balance, and Cancel/Craft Card.
export default function CraftConfirmModal({ card, cost, fragmentBalance, goldBalance, pending, onCancel, onConfirm }) {
  const cardRef = useRef(null);

  // Focus the dialog itself on open so keyboard/AT users land somewhere
  // sensible; the caller restores focus to the triggering Craft button on close.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  if (!card || !cost) return null;

  const rarity = getCardRarity(card.rarity);

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
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Craft ${card.name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-sm w-full rounded-2xl border-2 p-5 sm:p-6 animate-fade-in outline-none"
        style={{ borderColor: rarity.borderColor, background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
      >
        <h2 className="text-xl font-serif text-amber-200 text-center mb-3">Craft {card.name}?</h2>

        <div className="rounded-lg border border-amber-500/20 bg-slate-950/40 p-3 mb-3 text-center">
          <p className="text-amber-100 text-sm font-semibold">
            {cost.fragments} {card.name} Fragments
          </p>
          <p className="text-amber-100 text-sm font-semibold mt-1">
            {cost.gold} Gold
          </p>
          <p className="text-amber-100/50 text-xs mt-2">You will receive 1 card copy.</p>
        </div>

        <p className="text-amber-100/40 text-xs text-center mb-4">
          Current balance: {fragmentBalance} Fragments · {goldBalance} Gold
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={pending}
            className="flex-1 min-h-11 rounded-lg border border-slate-500/30 text-amber-100/70 text-sm font-medium hover:bg-slate-800/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (!pending) onConfirm(); }}
            disabled={pending}
            className="flex-1 min-h-11 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Crafting…" : "Craft Card"}
          </button>
        </div>
      </div>
    </div>
  );
}
