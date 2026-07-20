import React, { useId } from "react";
import { ChevronRight } from "lucide-react";

// Compact, accessible disclosure row — a tappable summary line that reveals
// a details panel beneath it. Used to keep info-dense screens (like Daily
// Battle) short by default while keeping the full detail one tap away.
//
// @param {{label: string, summary?: string, actionLabel?: string, open: boolean, onToggle: () => void, id?: string, children: any}} props
export default function CollapsibleRow({
  label,
  summary = null,
  actionLabel = "View",
  open,
  onToggle,
  id = null,
  children,
}) {
  const generatedId = useId();
  const panelId = id || generatedId;

  return (
    <div
      className="rounded-xl border border-amber-500/15 overflow-hidden"
      style={{ background: "rgba(15,26,48,0.5)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-amber-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-inset"
      >
        <span className="min-w-0">
          <span className="block font-serif text-sm text-amber-200">{label}</span>
          {summary && (
            <span className="mt-0.5 block truncate text-[11px] text-amber-100/50">
              {summary}
            </span>
          )}
        </span>
        <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-amber-300/70">
          {open ? "Hide" : actionLabel}
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
              open ? "rotate-90" : ""
            }`}
          />
        </span>
      </button>

      <div id={panelId} role="region" hidden={!open} className="border-t border-amber-500/10 px-3.5 pb-3.5 pt-3">
        {children}
      </div>
    </div>
  );
}
