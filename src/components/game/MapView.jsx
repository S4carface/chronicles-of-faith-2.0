import React, { useState, useEffect } from "react";
import { ROOM_LABELS, ROOM_INFO } from "@/data/genesisRooms";
import { ROOM_ART, PLACEHOLDER_ART } from "@/data/art";
import { getVisibleNodes } from "@/game/mapGenerator";
import { cn } from "@/utils";
import RoomPreviewPanel from "@/components/game/RoomPreviewPanel";
import RoomTooltip from "@/components/game/RoomTooltip";
import * as Sound from "@/game/soundManager";

export default function MapView({ map, currentNode, onSelectNode, onExit, fogOfWar, playerHp, maxHp }) {
  const [previewNode, setPreviewNode] = useState(null);
  const availableNodes = currentNode ? currentNode.connections : [map[0][0].id];
  const visibleSet = getVisibleNodes(map, currentNode, fogOfWar);
  const isEasy = !fogOfWar;

  useEffect(() => {
    Sound.playMusic("map");
  }, []);

  const hpRatio = playerHp && maxHp ? playerHp / maxHp : 1;
  const isLowHp = hpRatio < 0.4;
  const isHighHp = hpRatio > 0.7;

  const getRecommendation = (nodeType) => {
    if ((nodeType === "divine" || nodeType === "treasure" || nodeType === "rest") && isLowHp) {
      return "Recommended";
    }
    if (nodeType === "battle" && isHighHp) {
      return "High Reward";
    }
    return null;
  };

  const handleNodeClick = (node) => {
    if (availableNodes.includes(node.id) && !node.cleared) {
      setPreviewNode(node);
    }
  };

  const handleEnterRoom = () => {
    if (previewNode) {
      onSelectNode(previewNode.id);
      setPreviewNode(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0F1A30 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-3 border-b border-amber-500/10">
        <div>
          <h2 className="text-lg font-serif text-amber-200">Path of Genesis</h2>
          <p className="text-amber-100/60 text-xs">
            {fogOfWar ? "The path ahead is hidden — tap the info icon for room details" : "All rooms visible"}
          </p>
        </div>
        <button
          onClick={onExit}
          className="text-amber-100/70 hover:text-amber-200 text-xs transition px-3 py-1.5 rounded-lg border border-amber-500/20"
        >
          ← Abandon
        </button>
      </div>

      {/* Map — vertical connected path */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
        <div className="flex flex-col items-center max-w-sm lg:max-w-2xl mx-auto">
          {map.map((layer, layerIdx) => {
            const isLast = layerIdx === map.length - 1;
            return (
              <React.Fragment key={layerIdx}>
                <div className="mb-2">
                  <span className="text-amber-100/50 text-[10px] uppercase tracking-wider">
                    {isLast ? "Final Trial" : `Stage ${layerIdx + 1}`}
                  </span>
                </div>

                {/* Nodes row */}
                <div className="flex flex-row justify-center items-start gap-3 lg:gap-6 w-full">
                  {layer.map((node) => {
                    const isAvailable = availableNodes.includes(node.id);
                    const isCurrent = currentNode?.id === node.id;
                    const isCleared = node.cleared;
                    const isBoss = node.type === "boss";
                    const isVisible = visibleSet.has(node.id);
                    const recommendation = getRecommendation(node.type);

                    if (!isVisible && !isCleared) {
                      return (
                        <div key={node.id} className="flex flex-col items-center w-20 lg:w-28">
                          <div
                            className={cn(
                              "rounded-lg border-2 border-slate-700/20 bg-slate-900/20 flex items-center justify-center",
                              isBoss ? "w-16 h-16 lg:w-24 lg:h-24" : "w-14 h-14 lg:w-20 lg:h-20"
                            )}
                            style={{ filter: "blur(1px)", opacity: 0.4 }}
                          >
                            <img src={PLACEHOLDER_ART} alt="" className="w-8 h-8 lg:w-12 lg:h-12 object-cover rounded opacity-30" />
                          </div>
                          <span className="text-[9px] mt-1.5 h-6" />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={node.id}
                        onClick={() => isAvailable && !isCleared && handleNodeClick(node)}
                        disabled={!isAvailable || isCleared}
                        className="flex flex-col items-center w-20 lg:w-28"
                      >
                        <div
                          className={cn(
                            "relative flex items-center justify-center rounded-xl border-2 overflow-hidden transition-all duration-300",
                            isBoss ? "w-16 h-16 lg:w-24 lg:h-24" : "w-14 h-14 lg:w-20 lg:h-20",
                            isCurrent && "ring-2 ring-amber-300 scale-110 shadow-lg shadow-amber-400/40",
                            isAvailable && !isCleared && "border-amber-400/70 bg-amber-500/15 hover:scale-110 hover:bg-amber-500/25 cursor-pointer animate-pulse shadow-lg shadow-amber-500/20",
                            isCleared && "border-emerald-600/40 bg-emerald-900/20 opacity-50",
                            !isAvailable && !isCleared && "border-slate-600/40 bg-slate-800/40 opacity-40 cursor-not-allowed",
                            isBoss && isAvailable && !isCleared && "border-red-400/70 bg-red-500/15 shadow-lg shadow-red-500/30"
                          )}
                        >
                          {isCleared && !isBoss ? (
                            <span className="text-emerald-400 text-lg lg:text-2xl font-bold">✓</span>
                          ) : (
                            <img src={ROOM_ART[node.type] || PLACEHOLDER_ART} alt={ROOM_LABELS[node.type]} className="w-10 h-10 lg:w-14 lg:h-14 object-cover" />
                          )}
                          {recommendation && isAvailable && !isCleared && (
                            <span className={cn(
                              "absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap",
                              recommendation === "Recommended" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                            )}>
                              {recommendation === "Recommended" ? "★" : "⚔"}
                            </span>
                          )}
                        </div>
                        {/* Label */}
                        <span
                          className={cn(
                            "text-[9px] lg:text-xs mt-1.5 text-center leading-tight flex items-start justify-center",
                            isAvailable && !isCleared ? "text-amber-200/80 font-medium" : "text-amber-100/50"
                          )}
                        >
                          {ROOM_LABELS[node.type]}
                        </span>
                        {/* Easy mode: subtitle always visible. Normal/Hard: info icon tooltip. */}
                        {!isCleared && (
                          isEasy ? (
                            <span className="text-[8px] text-amber-100/40 text-center leading-tight mt-0.5 px-0.5 min-h-[1.5rem]">
                              {ROOM_INFO[node.type]?.subtitle}
                            </span>
                          ) : isAvailable ? (
                            <div className="flex justify-center mt-0.5">
                              <RoomTooltip nodeType={node.type} />
                            </div>
                          ) : null
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Connector between layers */}
                {!isLast && (
                  <div className="my-1 flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/40 to-amber-500/20 rounded-full" />
                    <div className="text-amber-500/40 text-[8px]">▼</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 lg:px-8 py-3 border-t border-amber-500/10 flex flex-wrap items-center justify-center gap-3 lg:gap-5 text-[9px] lg:text-xs">
        <span className="flex items-center gap-1 text-amber-200/80"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Available</span>
        <span className="flex items-center gap-1 text-emerald-300/80"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Cleared</span>
        <span className="flex items-center gap-1 text-red-300/80"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Boss</span>
        <span className="flex items-center gap-1 text-slate-400/70"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" />Locked</span>
      </div>

      {/* Room preview panel */}
      {previewNode && (
        <RoomPreviewPanel
          node={previewNode}
          recommendation={getRecommendation(previewNode.type)}
          onEnter={handleEnterRoom}
          onCancel={() => setPreviewNode(null)}
        />
      )}
    </div>
  );
}