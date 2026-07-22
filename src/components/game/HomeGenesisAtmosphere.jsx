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
// overlayScripture: the post-tutorial fixed (non-scrollable) dashboard's
// variant — a flex-1 box that owns ALL of that layout's unused vertical
// space, with the scripture layered directly on top of the artwork instead
// of the image-plus-separate-text-block-below structure the rest of this
// component uses. A responsively-sized photo band (never stretched to the
// full flexible height) sits inside it, with a vertical gold light-path and
// drifting dust spanning the entire outer box — so on a tall phone, where
// the photo band alone can't fill the real leftover space, that space still
// reads as one continuous atmosphere instead of a blank gap before Start
// Journey. Kept as an early return (not threaded through the shared JSX
// below) because the two layouts don't share a DOM shape: below-image
// scripture is a real, independently-sized sibling block, while overlaid
// scripture is absolutely positioned inside the photo band and must never
// add its own height.
export default function HomeGenesisAtmosphere({
  showJourneyHint = false,
  compact = false,
  overlayScripture = false,
}) {
  const prefersReducedMotion = useReducedMotion();

  if (overlayScripture) {
    return (
      // Owns ALL of the fixed post-tutorial dashboard's unused flexible
      // space (flex-1, flex-basis 0% via Tailwind's flex-1 — grows purely
      // from available space, not from content size). min-h keeps it from
      // ever going too small to read; there is no max-height cap — the
      // horizon photo itself (object-cover, light source pinned centered
      // via objectPosition) is what fills whatever room a tall viewport
      // leaves unclaimed, rather than a fixed-height band surrounded by
      // gradients standing in for it. min-h-0 on the box lets it still
      // shrink freely on a short viewport instead of being held open by
      // its own content's implicit min-height.
      <div
        className="relative w-full shrink-0 flex-1 min-h-[92px] overflow-hidden"
        aria-label="Genesis 1:1"
      >
        {/* fallback=null: the gradients/glow below already give this box a
            deliberate atmosphere on their own — the actual photo fades in
            over them once decoded, so no separate placeholder glyph is
            needed here. */}
        <SafeImage
          src={GENESIS_HORIZON_ART}
          alt=""
          fallback={null}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 42%", filter: "brightness(1.14) saturate(1.16)" }}
        />

        {/* Stronger vignette than the below-image layout needs — the
            scripture sits directly on top of the artwork here, so it needs
            more contrast to stay readable regardless of how tall this box
            grows. */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,10,20,0.6) 0%, rgba(6,10,20,0.24) 30%, rgba(6,10,20,0.22) 55%, rgba(6,10,20,0.4) 78%, rgba(6,10,20,0.72) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 50% 38%, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0.08) 55%, transparent 78%)",
          }}
        />
        {/* Golden glow at the very bottom edge — bleeds into StickyActionDock's
            own transparent top fade just below, so the scene and Start
            Journey read as one continuous light source. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 50% 100%, rgba(201,168,76,0.3) 0%, rgba(201,168,76,0.12) 45%, transparent 78%)",
          }}
        />

        {/* Sparse drifting gold dust across the full flexible region */}
        {DUST_PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full"
            aria-hidden="true"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: "rgba(201,168,76,0.32)",
              animation: prefersReducedMotion
                ? "none"
                : `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              opacity: prefersReducedMotion ? 0.32 : undefined,
            }}
          />
        ))}

        {/* Scripture — live HTML, overlaid instead of taking its own space
            below. showJourneyHint is intentionally not supported in this
            mode: post-tutorial never needs the "journey begins" hint, and
            keeping this centered lets the box grow or shrink around it
            without the text ever needing to move. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p
            className="font-serif italic text-amber-50/95"
            style={{
              fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
              textShadow: "0 1px 6px rgba(0,0,0,0.75), 0 0 16px rgba(0,0,0,0.5)",
            }}
          >
            &ldquo;In the beginning, God created the heavens and the earth.&rdquo;
          </p>
          <p
            className="mt-1 text-[9px] font-serif italic text-amber-200/80"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
          >
            Genesis 1:1
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative w-full overflow-hidden pointer-events-none lg:min-h-[220px] ${
          compact
            ? // flex-1 (not flex-none): the compact pre-tutorial atmosphere
              // now OWNS whatever vertical space the rest of the hero layout
              // leaves unclaimed, instead of sitting at a fixed height while
              // a separate empty filler strip absorbed the leftover space
              // below Start Journey. min-h keeps it from ever going too
              // small to read; max-h keeps a very tall phone from stretching
              // the horizon photo into an awkward, oversized band.
              "flex-1 min-h-[110px] min-[400px]:min-h-[128px] sm:min-h-[150px] max-h-[260px] [@media(max-height:760px)]:min-h-[52px]"
            : "flex-1 min-h-[152px] min-[400px]:min-h-[168px] sm:min-h-[184px]"
        }`}
        aria-hidden="true"
      >
        {/* fallback=null: the navy/gold gradients and glow layers rendered
            just below already give this box a deliberate atmosphere on
            their own — the actual photo fades in over them once decoded,
            so no separate placeholder glyph is needed here. */}
        <SafeImage
          src={GENESIS_HORIZON_ART}
          alt=""
          fallback={null}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 50%", filter: "brightness(1.14) saturate(1.16)" }}
        />

        {/* Dark navy vignette — dark bands at the top and bottom edges keep
            the header above and the scripture below readable, while a much
            lighter middle band (down to ~0.16 opacity) lets the artwork's
            own golden light source shine through instead of reading as a
            single flat, washed-out gray tone across the whole box. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,10,20,0.6) 0%, rgba(6,10,20,0.22) 28%, rgba(6,10,20,0.16) 52%, rgba(6,10,20,0.3) 76%, rgba(6,10,20,0.68) 100%)",
          }}
        />

        {/* Warm glow centered on the artwork's own light source — the "let
            there be light" moment — emphasizing the golden center without
            changing the overall vignette shape. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 48% at 50% 42%, rgba(251,191,36,0.34) 0%, rgba(251,191,36,0.1) 55%, transparent 78%)",
          }}
        />

        {/* Golden horizon glow, strongest at the very bottom edge — bleeds
            into StickyActionDock's own transparent top fade just below. */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(201,168,76,0.24) 0%, rgba(201,168,76,0.1) 45%, transparent 75%)",
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
      <div
        className={`relative w-full px-4 text-center ${
          compact ? "pb-1.5 pt-1.5 [@media(max-height:760px)]:pb-1 [@media(max-height:760px)]:pt-1" : "pb-3 pt-3"
        }`}
      >
        {showJourneyHint && (
          <p
            className={`text-[10px] font-serif uppercase tracking-[0.2em] text-amber-300/60 ${compact ? "mb-1 [@media(max-height:760px)]:mb-0.5" : "mb-2"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
          >
            Your journey begins in Genesis
          </p>
        )}
        <p
          className="font-serif italic text-amber-50/90"
          style={{
            fontSize: compact ? "clamp(0.75rem, 1.8vw, 0.95rem)" : "clamp(0.8rem, 2vw, 0.95rem)",
            textShadow: "0 0 20px rgba(201,168,76,0.26), 0 1px 6px rgba(0,0,0,0.65)",
          }}
        >
          &ldquo;In the beginning, God created the heavens and the earth.&rdquo;
        </p>
        <p className={`text-[10px] font-serif italic text-amber-300/65 ${compact ? "mt-1" : "mt-1.5"}`}>
          Genesis 1:1
        </p>
      </div>
    </>
  );
}
