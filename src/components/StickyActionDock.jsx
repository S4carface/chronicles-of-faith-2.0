import React from "react";

// Reusable sticky footer for a screen's one dominant action (Start Journey,
// Start Daily Battle, etc). Place it as the LAST child of a scrolling
// container, ideally right after a `<div className="flex-1" />` spacer so the
// dock still settles at the bottom of the viewport when content is short.
//
// `position: sticky` keeps it glued just above the fixed bottom nav no matter
// how much content scrolls past above it — expanding an accordion or growing
// the page never moves or hides it — without ever covering later content,
// since by convention nothing follows it in the DOM.
//
// Sticky offsets resolve against the scroll container's *padding edge*, not
// its border-box edge — so this stays at `bottom-0` and the clearance for the
// bottom nav (plus a small gap) belongs entirely to the container's own
// padding-bottom. Giving both a non-zero offset would double-count the gap
// and shove the dock up over earlier content.
export default function StickyActionDock({ children, className = "" }) {
  return (
    <div
      className={`sticky bottom-0 z-10 w-full pb-1 pt-4 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(10,15,30,0) 0%, rgba(8,12,24,0.88) 45%, rgba(8,12,24,0.98) 100%)",
      }}
    >
      {children}
    </div>
  );
}
