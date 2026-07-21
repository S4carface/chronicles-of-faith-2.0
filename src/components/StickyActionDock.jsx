import React from "react";

// Footer wrapper for a screen's one dominant action (Start Journey, Start
// Daily Battle, etc). Place it as the LAST child of a scrolling container,
// ideally right after a `<div className="flex-1" />` spacer so it still
// settles near the bottom of the viewport when content is short.
//
// Deliberately NORMAL document flow (not `position: sticky`). Sticky pins an
// element to the scroll container's bottom edge regardless of how tall the
// container's actual content is — on a short viewport with enough content
// above (a saved-run banner, difficulty select, a completed-prayer banner,
// etc. all visible together), that pin point can land ABOVE where this
// element would naturally sit, visually overlapping whatever content is
// still there. Normal flow can't do that: this always renders exactly where
// its position in the document puts it, directly below whatever precedes it,
// with a real gap. If that pushes the whole page past the viewport height,
// the page's own scroll container (see FixedViewportPage) scrolls to reach
// it — a short scroll, not a visual collision, and never both at once.
//
// The clearance from the fixed bottom nav is handled by the *container's*
// own padding-bottom (see Home.jsx's contentClassName — it's sized from
// BottomNavigation's actual reserved height plus env(safe-area-inset-bottom)),
// not by anything here.
export default function StickyActionDock({ children, className = "" }) {
  return (
    <div
      className={`relative z-10 w-full pb-1 pt-4 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(10,15,30,0) 0%, rgba(8,12,24,0.88) 45%, rgba(8,12,24,0.98) 100%)",
      }}
    >
      {children}
    </div>
  );
}
