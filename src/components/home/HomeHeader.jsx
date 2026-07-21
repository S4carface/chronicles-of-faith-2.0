import React from "react";
import { Pencil, Cross } from "lucide-react";
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

// Crest + title + player-name identity, in the two deliberate compositions
// Home needs: the pre-tutorial cinematic hero band (its own full section
// plus a separate identity pill below it) and the post-tutorial compact
// dashboard's single tight row. These aren't the same layout wearing
// different Tailwind classes — they're different DOM shapes entirely, so
// each gets its own branch rather than a shared block full of ternaries.
export default function HomeHeader({ variant = "hero", playerName, onEditName }) {
  const nameButton = (
    <button
      onClick={onEditName}
      className={
        variant === "hero"
          ? "flex items-center gap-2 rounded-full border border-amber-400/20 px-3.5 py-1.5 hover:border-amber-300/35 transition text-xs lg:text-sm"
          : "mt-0.5 flex max-w-full items-center gap-1 text-[11px] text-amber-100/60 transition hover:text-amber-200"
      }
      style={variant === "hero" ? { background: "rgba(5,9,18,0.55)" } : undefined}
    >
      {needsPlayerName(playerName) ? (
        <span className={variant === "hero" ? "text-amber-100/55" : "truncate"}>
          Playing as Guest Pilgrim
        </span>
      ) : (
        <span className={variant === "hero" ? "text-amber-100/85" : "truncate"}>
          Playing as: {sanitizePlayerName(playerName)}
        </span>
      )}
      <Pencil
        className={
          variant === "hero"
            ? "w-3 h-3 flex-shrink-0 text-amber-100/60"
            : "h-2.5 w-2.5 flex-shrink-0"
        }
      />
    </button>
  );

  if (variant === "compact") {
    return (
      <div className="w-full shrink-0 px-4 pt-1 pb-0.5 lg:px-8">
        <div className="flex items-center justify-center gap-2.5">
          <div className="relative h-10 w-10 flex-shrink-0 lg:h-14 lg:w-14">
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

          <div className="min-w-0 text-left">
            <h1
              className="font-serif text-amber-50 tracking-wide leading-tight truncate"
              style={{
                fontSize: "clamp(1.05rem, 3.2vw, 1.4rem)",
                textShadow: "0 0 20px rgba(251,191,36,0.4), 0 1px 5px rgba(0,0,0,0.5)",
              }}
            >
              Chronicles of Faith
            </h1>
            {nameButton}
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
      <section className="relative w-full shrink-0 text-center overflow-hidden pt-2 pb-3 [@media(max-height:760px)]:pt-0 [@media(max-height:760px)]:pb-0.5 lg:pt-3 lg:pb-9">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 95% at 50% 15%, rgba(5,9,18,0.82) 0%, rgba(5,9,18,0.48) 55%, transparent 92%)",
          }}
          aria-hidden="true"
        />

        <div className="relative px-4 lg:px-8">
          <div className="flex justify-center mb-1 [@media(max-height:760px)]:mb-0.5">
            <div className="relative h-16 w-16 [@media(max-height:760px)]:h-11 [@media(max-height:760px)]:w-11 lg:h-24 lg:w-24">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "rgba(251,191,36,0.5)" }}
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

          <h1
            className="font-serif text-amber-50 tracking-wide leading-tight"
            style={{
              fontSize: "clamp(1.5rem, 4.5vw, 3.5rem)",
              textShadow: "0 0 40px rgba(251,191,36,0.5), 0 2px 10px rgba(0,0,0,0.55)",
            }}
          >
            Chronicles of Faith
          </h1>
          <p
            className="text-amber-100/70 mt-1 font-serif italic tracking-wide"
            style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            A Biblical Roguelike Journey
          </p>
          <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mt-1" />
        </div>
      </section>

      {/* Player identity row — a small dark pill so the name reads clearly
          against the bright celestial background, without a large
          rectangle behind the whole header. */}
      <div className="w-full px-4 lg:px-8 flex justify-center mb-2 [@media(max-height:760px)]:mb-1">
        {nameButton}
      </div>
    </>
  );
}
