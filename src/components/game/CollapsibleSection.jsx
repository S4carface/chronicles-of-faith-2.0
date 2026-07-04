import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border-2 border-amber-500/15 overflow-hidden transition-colors hover:border-amber-500/25" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 lg:p-5"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
          <h3 className="font-serif text-amber-200 text-sm lg:text-lg uppercase tracking-wide">{title}</h3>
        </div>
        <ChevronDown className={`w-4 h-4 lg:w-5 lg:h-5 text-amber-300/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 lg:px-5 pb-4 lg:pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}