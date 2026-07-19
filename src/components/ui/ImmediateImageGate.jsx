import React, { useEffect, useState } from "react";
import { preloadImages } from "@/lib/imageAssets";

export default function ImmediateImageGate({ sources, label, children }) {
  const key = sources.filter(Boolean).join("|");
  const [readyKey, setReadyKey] = useState(null);

  useEffect(() => {
    let active = true;
    preloadImages(sources).finally(() => {
      if (active) setReadyKey(key);
    });
    return () => { active = false; };
  }, [key]);

  if (readyKey !== key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1A2744] to-[#0A0F1E] text-amber-200">
        <div className="rounded-xl border border-amber-400/35 bg-[#0F1A30]/90 px-6 py-4 text-center shadow-[0_0_24px_rgba(251,191,36,0.15)]">
          <span className="text-2xl text-amber-300/60">✦</span>
          <p className="mt-2 font-serif">{label}</p>
        </div>
      </div>
    );
  }

  return children;
}
