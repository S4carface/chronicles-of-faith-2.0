import React from "react";
import { CircleUser, Pencil, Cross, Diamond } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { needsPlayerName, sanitizePlayerName } from "@/game/nameValidator";
import { HOME_CREST_ART } from "@/lib/preloadHomeAssets";

// Intentional visual fallback — shown by SafeImage while home-crest.webp is
// still loading/decoding (or if it fails). Sized as a fraction of its
// parent box (absolute inset-0) so it exactly fills the same space the
// image will fade into, meaning artwork arriving never shifts the layout.
const CREST_FALLBACK = (
  <div
    className="absolute inset-0 flex items-center justify-center rounded-full"
    style={{
      background:
        "radial-gradient(circle at 50% 35%, rgba(30,42,68,0.95) 0%, rgba(8,12,24,0.98) 100%)",
      boxShadow: "inset 0 0 0 2px rgba(201,168,76,0.45)",
    }}
    aria-hidden="true"
  >
    <Cross className="h-2/5 w-2/5 text-amber-300/70" strokeWidth={1.75} />
  </div>
);

// font-variant: small-caps renders lowercase letters as smaller capitals
// while leaving the first (already-uppercase) letter full height — the
// "CHRONICLES" / "A BIBLICAL ROGUELIKE JOURNEY" engraved-title look from
// the approved mockup, without needing a dedicated small-caps font file.
const SMALL_CAPS = { fontVariant: "small-caps" };

// Crest + title + player-name identity, in the two deliberate compositions
// Home needs: the pre-tutorial cinematic hero band (a full section, title
// split across two lines, a flourished subtitle, and a quiet borderless
// identity line) and the post-tutorial compact dashboard's single tight
// row (crest beside a smaller two-line title block). These aren't the same
// layout wearing different Tailwind classes — they're different DOM shapes
// entirely, so each gets its own branch rather than a shared block full of
// ternaries.
export default function HomeHeader({ variant = "hero", playerName, onEditName }) {
  const displayName = needsPlayerName(playerName)
    ? "Guest Pilgrim"
    : sanitizePlayerName(playerName);

  if (variant === "compact") {
    return (
      <div className="w-full shrink-0 px-4 pt-1.5 pb-1 [@media(max-height:700px)]:pt-1 [@media(max-height:700px)]:pb-0.5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="relative h-[3.875rem] w-[3.875rem] flex-shrink-0 lg:h-[4.5rem] lg:w-[4.5rem]">
            <div
              className="absolute inset-0 rounded-full blur-lg"
              style={{ background: "rgba(251,191,36,0.45)" }}
              aria-hidden="true"
            />
            {/* home-crest.webp is a fully opaque square (no alpha channel) —
                object-contain alone can't make its dark background
                transparent, so it's clipped to a circle instead. The
                crest's own artwork (spike, ring, wings) sits well within
                the inscribed circle, so this only trims background/corners. */}
            <div className="h-full w-full overflow-hidden rounded-full">
              <SafeImage
                src={HOME_CREST_ART}
                alt="Chronicles of Faith"
                fallback={CREST_FALLBACK}
                className="h-full w-full object-contain"
                style={{ filter: "brightness(1.15) saturate(1.08)" }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <h1
              className="font-serif font-bold text-amber-100 tracking-wide leading-[1.05] truncate"
              style={{
                ...SMALL_CAPS,
                fontSize: "clamp(1.1rem, 3.4vw, 1.5rem)",
                textShadow: "0 0 20px rgba(251,191,36,0.4), 0 1px 5px rgba(0,0,0,0.5)",
              }}
            >
              Chronicles of Faith
            </h1>
            <p
              className="truncate text-amber-100/55"
              style={{ ...SMALL_CAPS, fontSize: "0.65rem", letterSpacing: "0.04em" }}
            >
              A Biblical Roguelike Journey
            </p>
            <button
              onClick={onEditName}
              className="mt-0.5 flex max-w-full items-center gap-1 text-[11px] text-amber-100/55 transition hover:text-amber-200"
            >
              <CircleUser className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Playing as {displayName}</span>
              <Pencil className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-width dark hero band. The darkening gradient sits on this
          full-bleed wrapper (no side padding) so it spans edge to edge; the
          crest/title/subtitle content is centered inside its own padded
          inner div. */}
      {/* shrink-0: this is a flex item of FixedViewportPage's flex column.
          Combined with overflow-hidden, a flex item's automatic minimum
          size resolves to 0 instead of its content size — on a short
          viewport with enough content below to exceed the container's
          height, that lets the flex algorithm collapse this section down
          to just its own padding and CLIP the crest/title/subtitle
          entirely, even though scrolling was available and preferred.
          shrink-0 keeps it pinned to its natural content height instead. */}
      <section className="relative w-full shrink-0 text-center overflow-hidden pt-3 pb-2 [@media(max-height:760px)]:pt-1 [@media(max-height:760px)]:pb-0.5 lg:pt-4 lg:pb-6">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 95% at 50% 15%, rgba(5,9,18,0.82) 0%, rgba(5,9,18,0.48) 55%, transparent 92%)",
          }}
          aria-hidden="true"
        />

        <div className="relative px-4 lg:px-8">
          <div className="flex justify-center mb-1.5 [@media(max-height:760px)]:mb-1">
            <div className="relative h-[4.5rem] w-[4.5rem] [@media(max-height:760px)]:h-12 [@media(max-height:760px)]:w-12 lg:h-24 lg:w-24">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(251,191,36,0.55)" }}
                aria-hidden="true"
              />
              <div className="h-full w-full overflow-hidden rounded-full">
                <SafeImage
                  src={HOME_CREST_ART}
                  alt="Chronicles of Faith"
                  fallback={CREST_FALLBACK}
                  className="h-full w-full object-contain"
                  style={{ filter: "brightness(1.15) saturate(1.08)" }}
                />
              </div>
            </div>
          </div>

          {/* Title split across two lines, small-caps, mirroring the
              approved mockup's engraved "CHRONICLES / OF FAITH" wordmark. */}
          {/* The !text-[...] short-viewport override beats the inline
              clamp() below on specificity (Tailwind's ! prefix compiles to
              !important) — a two-line title at full size is the single
              largest contributor to this hero header's height, so a short
              phone needs it smaller, not just less padding around it. */}
          <h1
            className="font-serif font-bold text-amber-50 tracking-wide leading-[1.05] [@media(max-height:760px)]:!text-[1.55rem]"
            style={{
              ...SMALL_CAPS,
              fontSize: "clamp(1.7rem, 6vw, 3rem)",
              textShadow: "0 0 40px rgba(251,191,36,0.5), 0 2px 10px rgba(0,0,0,0.55)",
            }}
          >
            <span className="block">Chronicles</span>
            <span className="block">of Faith</span>
          </h1>

          <div className="mt-1.5 flex items-center justify-center gap-2 [@media(max-height:760px)]:mt-1">
            <Diamond className="h-2 w-2 flex-shrink-0 fill-amber-400/60 text-amber-400/60" aria-hidden="true" />
            <p
              className="text-amber-100/70 font-serif italic tracking-wide"
              style={{ ...SMALL_CAPS, fontSize: "clamp(0.7rem, 1.5vw, 0.95rem)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              A Biblical Roguelike Journey
            </p>
            <Diamond className="h-2 w-2 flex-shrink-0 fill-amber-400/60 text-amber-400/60" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Player identity — quiet, borderless text so it reads as a subtle
          signature line rather than another dashboard chip competing with
          the cards below. */}
      <div className="w-full px-4 lg:px-8 flex justify-center mb-2.5 [@media(max-height:760px)]:mb-1">
        <button
          onClick={onEditName}
          className="flex items-center gap-1.5 text-xs text-amber-100/55 transition hover:text-amber-200 lg:text-sm"
        >
          <CircleUser className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          Playing as {displayName}
          <Pencil className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
