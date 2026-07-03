import React from "react";
import { ROOM_INFO } from "@/data/genesisRooms";
import { ROOM_ART, PLACEHOLDER_ART } from "@/data/art";
import { cn } from "@/utils";

export default function RoomPreviewPanel({ node, recommendation, onEnter, onCancel }) {
  if (!node) return null;
  const info = ROOM_INFO[node.type] || ROOM_INFO.mystery;
  const artUrl = ROOM_ART[node.type] || PLACEHOLDER_ART;
  const isBoss = node.type === "boss";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(8,12,24,0.85)" }} onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl border-2 p-5 animate-fade-in"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)", borderColor: isBoss ? "rgba(248,113,113,0.5)" : "rgba(252,211,77,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("rounded-lg border-2 overflow-hidden flex-shrink-0", isBoss ? "border-red-400/60" : "border-amber-400/40")}>
            <img src={artUrl} alt={info.title} className="w-12 h-12 object-cover" />
          </div>
          <div>
            <h3 className={cn("text-lg font-serif", isBoss ? "text-red-200" : "text-amber-200")}>{info.title}</h3>
            {recommendation && (
              <span className={cn(
                "inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold",
                recommendation === "Recommended" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              )}>
                {recommendation === "Recommended" ? "★ Recommended" : "⚔ High Reward"}
              </span>
            )}
          </div>
        </div>

        <p className="text-amber-100/80 text-sm leading-relaxed mb-2">{info.description}</p>
        <p className="text-amber-100/50 text-xs italic mb-4">{info.tip}</p>

        <div className="flex gap-3">
          <button
            onClick={onEnter}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition",
              isBoss
                ? "border-red-400/60 bg-red-900/30 text-red-100 hover:bg-red-800/40"
                : "border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
            )}
          >
            Enter Room →
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg border border-slate-500/40 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-700/40 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}