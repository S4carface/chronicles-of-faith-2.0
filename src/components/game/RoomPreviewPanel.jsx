import React from "react";
import { ROOM_INFO } from "@/data/genesisRooms";
import { getNodeArt } from "@/data/art";
import { cn } from "@/utils";
import SafeImage from "@/components/ui/SafeImage";

export default function RoomPreviewPanel({
  node,
  recommendation,
  difficulty,
  onEnter,
  onCancel,
}) {
    if (!node) return null;

  const info = ROOM_INFO[node.type] || ROOM_INFO.mystery;
  const artUrl = getNodeArt(node);
  const isBoss = node.type === "boss"; 
  const isEasyBoss =   isBoss && String(difficulty || "easy").toLowerCase() === "easy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden"
      style={{ background: "rgba(8, 12, 24, 0.88)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-preview-title"
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border-2 animate-fade-in"
        style={{
          maxHeight:
            "calc(100dvh - env(safe-area-inset-top) - 12px)",
          paddingBottom: "env(safe-area-inset-bottom)",
          background:
            "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)",
          borderColor: isBoss
            ? "rgba(248, 113, 113, 0.5)"
            : "rgba(252, 211, 77, 0.4)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overflow-y-auto overscroll-contain p-5 pb-3">
          <div className="mb-3 flex items-center gap-3">
            <div
              className={cn(
                "h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2",
                isBoss
                  ? "border-red-400/60"
                  : "border-amber-400/40"
              )}
              style={{ background: "#0F1A30" }}
            >
              <SafeImage
                src={artUrl}
                alt={info.title}
                className="h-full w-full select-none object-cover"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onContextMenu={(event) => event.preventDefault()}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
              />
            </div>

            <div className="min-w-0">
              <h3
                id="room-preview-title"
                className={cn(
                  "font-serif text-xl",
                  isBoss ? "text-red-200" : "text-amber-200"
                )}
              >
                {info.title}
              </h3>

              {recommendation && (
                <span
                  className={cn(
                    "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold",
                    recommendation === "Recommended"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  )}
                >
                  {recommendation === "Recommended"
                    ? "★ Recommended"
                    : "⚔ High Reward"}
                </span>
              )}
            </div>
          </div>

          <p className="mb-2 text-sm leading-relaxed text-amber-100/80">
            {info.description}
          </p>

<p className="text-xs italic leading-relaxed text-amber-100/50">
  {info.tip}
</p>

{isBoss && (
  <div className="mt-4 rounded-xl border border-red-400/40 bg-red-950/30 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">
      Boss Ahead
    </p>

    <p className="mt-1 text-sm leading-relaxed text-amber-100/80">
      Your current HP will carry into the final battle.
    </p>

{isEasyBoss && (
  <p className="mt-1 text-xs leading-relaxed text-amber-100/55">
    Easy mode offers one preparation choice before the fight.
  </p>
)}
  </div>
)}
        </div>

        <div className="flex flex-shrink-0 gap-3 border-t border-amber-500/15 bg-[#0F1A30]/95 p-4">
          <button
            type="button"
            onClick={onEnter}
            className={cn(
              "min-h-12 flex-1 rounded-lg border-2 px-4 py-3 text-sm font-bold transition active:scale-[0.98]",
              isBoss
                ? "border-red-400/60 bg-red-900/30 text-red-100 hover:bg-red-800/40"
                : "border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
            )}
          >
            {isEasyBoss   ? "Prepare for Boss →"   : isBoss     ? "Enter Boss →"     : "Enter Room →"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-lg border border-slate-500/40 bg-slate-800/40 px-5 py-3 text-sm text-amber-100/70 transition hover:bg-slate-700/40 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
