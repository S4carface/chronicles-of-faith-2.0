import React from "react";
import { useReducedMotion } from "framer-motion";
import SafeImage from "@/components/ui/SafeImage";

export const GENESIS_HORIZON_ART = "/images/home/genesis-horizon.webp";

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
// spacer div with a quiet, non-interactive Genesis scene: the real
// genesis-horizon.webp artwork (a sunrise over mountains), a dark navy
// overlay so the scripture stays readable, a golden glow at the bottom
// edge that bleeds into the dock below, and sparse drifting gold dust.
// SafeImage handles preload/fade-in/failure — if the artwork can't load,
// its placeholder plus the gradients/particles here still read as a
// deliberate (if simpler) atmosphere, never a broken-image icon.
//
// Structured as two siblings rather than one box:
//   1. A `flex-1` decorative layer with a real minimum height (96px small
//      mobile, up to 160px on desktop) — grows to fill available space when
//      content above is short, but never shrinks below a size where the
//      horizon art and its light source actually read.
//   2. The scripture, as a normal, naturally-sized block, never inside the
//      clippable decorative box — it always renders in full at its own
//      size, exactly like the other content blocks above it, regardless of
//      how much room the decorative layer above it gets.
// On a short viewport with a lot of content above (saved run + difficulty +
// prayer banners all visible together), the page's own scroll container
// (see FixedViewportPage) simply scrolls a little rather than compressing
// this down to nothing — StickyActionDock below is normal flow too, not
// pinned, so there's no scenario where it visually collides with either of
// these. The dark overlay's gradient deepens toward the bottom of the image
// so the two sections read as one continuous scene despite the DOM boundary.
export default function HomeGenesisAtmosphere({ showJourneyHint = false }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      <div
        className="relative w-full flex-1 min-h-24 min-[400px]:min-h-28 sm:min-h-32 lg:min-h-40 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <SafeImage
          src={GENESIS_HORIZON_ART}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 50%" }}
        />

        {/* Dark navy overlay — keeps the scripture below readable and fades
            the scene into the page's own background at the bottom edge.
            Applied on top of the (full-opacity) artwork rather than dimming
            the <img> itself, so it doesn't fight SafeImage's own opacity-
            based fade-in transition. Lightened ~20% relative to the previous
            pass so the artwork itself reads brighter while keeping the same
            top-to-bottom darkening shape scripture readability depends on. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,15,30,0.44) 0%, rgba(9,13,27,0.5) 55%, rgba(8,12,24,0.7) 100%)",
          }}
        />

        {/* Warm glow centered on the artwork's own light source, emphasizing
            the golden center without changing the overall darkening shape. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 50% 42%, rgba(251,191,36,0.16) 0%, transparent 70%)",
          }}
        />

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
      <div className="relative w-full px-4 pb-2 pt-2 text-center">
        {showJourneyHint && (
          <p className="mb-1.5 text-[10px] font-serif uppercase tracking-[0.2em] text-amber-300/50">
            Your journey begins in Genesis
          </p>
        )}
        <p
          className="font-serif italic text-amber-50/85"
          style={{
            fontSize: "clamp(0.8rem, 2vw, 0.95rem)",
            textShadow: "0 0 18px rgba(201,168,76,0.22), 0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          &ldquo;In the beginning, God created the heavens and the earth.&rdquo;
        </p>
        <p className="mt-1 text-[10px] font-serif italic text-amber-300/60">
          Genesis 1:1
        </p>
      </div>
    </>
  );
}
