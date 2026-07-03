import React, { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { getGuidanceHint } from "@/game/guidance";

export default function GuidanceHint({ battleState }) {
  const hint = useMemo(() => getGuidanceHint(battleState), [battleState]);

  if (!hint) return null;

  return (
    <div className="flex-shrink-0 px-3 py-1 animate-fade-in">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-400/20 bg-sky-900/15">
        <Lightbulb className="w-3 h-3 text-sky-300/60 flex-shrink-0" />
        <p className="text-sky-200/70 text-[10px] leading-tight">{hint}</p>
      </div>
    </div>
  );
}