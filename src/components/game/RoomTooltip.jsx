import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { ROOM_INFO } from "@/data/genesisRooms";

export default function RoomTooltip({ nodeType }) {
  const [open, setOpen] = useState(false);
  const info = ROOM_INFO[nodeType];
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  if (!info) return null;

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-4 h-4 rounded-full bg-slate-900/80 border border-amber-500/30 flex items-center justify-center hover:bg-amber-500/20 transition"
      >
        <Info className="w-2.5 h-2.5 text-amber-300/60" />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 p-2.5 rounded-lg border border-amber-500/30 shadow-xl animate-fade-in"
          style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-amber-200 font-serif text-[11px] font-bold mb-0.5">{info.title}</p>
          <p className="text-amber-100/70 text-[10px] leading-snug">{info.subtitle}</p>
        </div>
      )}
    </div>
  );
}