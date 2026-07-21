import React from "react";
import { Compass } from "lucide-react";
import { useReducedMotion } from "framer-motion";

// Fixed, deterministic particle field — declared once at module scope so
// positions never change on re-render (the bug this replaces: computing
// Math.random() directly inside JSX regenerates every particle's position
// on every render, e.g. whenever profile/run state changes).
const DUST_PARTICLES = [
  { left: 10, top: 18, size: 2.5, duration: 10, delay: 0 },
  { left: 24, top: 52, size: 2, duration: 12.5, delay: 1.4 },
  { left: 40, top: 12, size: 3, duration: 9, delay: 3.1 },
  { left: 58, top: 60, size: 2, duration: 13, delay: 0.6 },
  { left: 72, top: 28, size: 2.5, duration: 11, delay: 2.4 },
  { left: 88, top: 46, size: 2, duration: 10.5, delay: 4.2 },
];

// The atmospheric centerpiece that fills the space between Home's compact
// upper content and the Start Journey dock. Replaces a plain `flex-1`
// spacer div with a quiet, non-interactive Genesis scene — a horizon glow,
// a faint mountain silhouette, a soft downward light beam, sparse drifting
// gold dust, and a faint sacred emblem — built entirely from CSS gradients
// and an inline SVG silhouette (no new image assets).
//
// Structured as two siblings rather than one box:
//   1. A `flex-1` decorative layer (this is what grows/shrinks with
//      available space, and is safe to clip via overflow-hidden — it's
//      pure decoration, nothing meaningful is ever lost).
//   2. The scripture, as a normal, naturally-sized block.
// Keeping the scripture OUTSIDE the shrinkable/clippable flex-1 box matters:
// in dense Home states (saved run + difficulty + prayer banners all
// visible), the decorative layer can be squeezed toward its floor by
// StickyActionDock's sticky-bottom behavior. If the scripture lived inside
// that same shrinking, overflow-hidden box, it could get clipped or
// visually collide with the button beneath it. As a sibling with its own
// natural height, it always renders in full, exactly like the other
// content blocks above it.
export default function HomeGenesisAtmosphere({ showJourneyHint = false }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      <div
        className="relative w-full flex-1 min-h-[24px] overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Soft downward light beam — visually leads the eye toward Start Journey */}
        <div
          className="absolute left-1/2 top-0 h-full w-28 -translate-x-1/2 sm:w-36"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.04) 30%, rgba(201,168,76,0.09) 65%, rgba(201,168,76,0.16) 100%)",
            filter: "blur(3px)",
          }}
        />

        {/* Faint mist band */}
        <div
          className="absolute inset-x-0 top-[28%] h-14 opacity-[0.07]"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(226,220,195,0.6) 50%, transparent 100%)",
            filter: "blur(8px)",
          }}
        />

        {/* Sacred emblem — faint compass within a thin ring, centered, static */}
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/[0.08] sm:h-48 sm:w-48">
          <Compass
            className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 text-amber-200/[0.09] sm:h-24 sm:w-24"
            strokeWidth={0.75}
          />
        </div>

        {/* Distant mountain silhouette — back layer */}
        <svg
          className="absolute inset-x-0 bottom-0 h-2/5 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            d="M0,220 C120,180 240,200 360,170 C480,140 600,190 720,160 C840,130 960,180 1080,150 C1200,120 1320,170 1440,140 L1440,320 L0,320 Z"
            fill="#1A2744"
            opacity="0.55"
          />
        </svg>

        {/* Distant mountain silhouette — front layer, with a thin golden ridge line */}
        <svg
          className="absolute inset-x-0 bottom-0 h-1/3 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            d="M0,260 C150,230 300,250 450,220 C600,190 750,240 900,210 C1050,180 1200,230 1350,200 L1440,210 L1440,320 L0,320 Z"
            fill="#0A0F1E"
            opacity="0.8"
          />
          <path
            d="M0,260 C150,230 300,250 450,220 C600,190 750,240 900,210 C1050,180 1200,230 1350,200 L1440,210"
            fill="none"
            stroke="rgba(251,191,36,0.18)"
            strokeWidth="2"
          />
        </svg>

        {/* Golden horizon glow, strongest at the very bottom edge — bleeds
            into StickyActionDock's own transparent top fade just below. */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.08) 45%, transparent 75%)",
          }}
        />

        {/* Sparse drifting gold dust */}
        {DUST_PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: "rgba(201,168,76,0.35)",
              animation: prefersReducedMotion
                ? "none"
                : `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              opacity: prefersReducedMotion ? 0.35 : undefined,
            }}
          />
        ))}
      </div>

      {/* Scripture — real content, always rendered at its natural size */}
      <div className="relative w-full px-4 pb-2 pt-1 text-center">
        {showJourneyHint && (
          <p className="mb-1.5 text-[10px] font-serif uppercase tracking-[0.2em] text-amber-300/50">
            Your journey begins in Genesis
          </p>
        )}
        <p
          className="font-serif italic text-amber-100/70"
          style={{
            fontSize: "clamp(0.8rem, 2vw, 0.95rem)",
            textShadow: "0 0 18px rgba(201,168,76,0.18)",
          }}
        >
          &ldquo;In the beginning, God created the heavens and the earth.&rdquo;
        </p>
        <p className="mt-1 text-[10px] font-serif italic text-amber-300/45">
          Genesis 1:1
        </p>
      </div>
    </>
  );
}
