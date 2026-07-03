import React from "react";
import { ROOM_ICONS, ROOM_LABELS } from "@/data/genesisRooms";
import { getVisibleNodes } from "@/game/mapGenerator";
import { cn } from "@/utils";

export default function MapView({ map, currentNode, onSelectNode, onExit, fogOfWar }) {
  const availableNodes = currentNode
    ? currentNode.connections
    : [map[0][0].id];
  const visibleSet = getVisibleNodes(map, currentNode, fogOfWar);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0F1A30 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/10">
        <div>
          <h2 className="text-xl font-serif text-amber-200">The Path of Genesis</h2>
          <p className="text-amber-100/40 text-sm">
            {fogOfWar ? "Choose your next destination — the path ahead is hidden" : "Choose your next destination"}
          </p>
        </div>
        <button
          onClick={onExit}
          className="text-amber-100/60 hover:text-amber-200 text-sm transition"
        >
          ← Abandon Run
        </button>
      </div>

      {/* Map scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        <div className="flex gap-8 items-start min-w-max h-full pb-4">
          {map.map((layer, layerIdx) => (
            <div key={layerIdx} className="flex flex-col gap-6 items-center justify-center min-h-full">
              {layer.map((node) => {
                const isAvailable = availableNodes.includes(node.id);
                const isCurrent = currentNode?.id === node.id;
                const isCleared = node.cleared;
                const isVisited = node.visited;
                const isBoss = node.type === "boss";
                const isVisible = visibleSet.has(node.id);

                // Fog of war: hidden nodes show as mist
                if (!isVisible && !isCleared) {
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        "rounded-xl border-2",
                        isBoss ? "w-20 h-20" : "w-16 h-16",
                        "border-slate-700/20 bg-slate-900/20"
                      )}
                      style={{ filter: "blur(2px)", opacity: 0.3 }}
                    >
                      <div className="w-full h-full flex items-center justify-center text-2xl text-slate-700">🌫️</div>
                    </div>
                  );
                }

                return (
                  <button
                    key={node.id}
                    onClick={() => isAvailable && onSelectNode(node.id)}
                    disabled={!isAvailable}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300",
                      isBoss ? "w-20 h-20 text-3xl" : "w-16 h-16 text-2xl",
                      isCurrent && "ring-2 ring-amber-300 scale-110",
                      isAvailable && !isCleared && "border-amber-400/60 bg-amber-500/10 hover:scale-110 hover:bg-amber-500/20 cursor-pointer animate-pulse",
                      isCleared && "border-slate-600/30 bg-slate-800/40 opacity-40",
                      !isAvailable && !isCleared && "border-slate-700/30 bg-slate-900/40 opacity-30 cursor-not-allowed",
                      isBoss && isAvailable && "border-red-400/60 bg-red-500/10"
                    )}
                  >
                    <span>{isCleared && !isBoss ? "✓" : (ROOM_ICONS[node.type] || "❓")}</span>
                    {isAvailable && !isCleared && (
                      <span className="absolute -bottom-5 text-[9px] text-amber-200/70 whitespace-nowrap font-medium">
                        {ROOM_LABELS[node.type]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 border-t border-amber-500/10 text-center">
        <p className="text-amber-100/30 text-xs">
          {fogOfWar ? "🌫️ Fog of War — only nearby rooms are visible" : "✨ All rooms visible (Easy Mode)"}
        </p>
      </div>
    </div>
  );
}