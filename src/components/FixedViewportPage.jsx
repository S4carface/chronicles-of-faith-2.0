import React from "react";

// Screen-level "dashboard" layout mode — locks a page to exactly the
// visible viewport so it reads as a fixed native-app screen instead of a
// normal scrolling document: no body/root drag, no iOS rubber-band bounce
// past real content, no horizontal drift.
//
// The app's single shared scroll owner is #root (see index.css); every
// routed page normally sits in its normal-flow content, which is why any
// page taller than the viewport — or even just the fixed bottom nav's
// spacer div sitting after it — makes the whole app draggable. Taking the
// page out of that flow entirely (position: fixed) removes it from #root's
// scrollable content, so #root has nothing left to scroll for this route.
//
// By default the page's own content still needs somewhere to go if it
// doesn't fit — an expanded accordion, a larger accessibility text size, a
// very short device — so the inner content region keeps a normal, contained
// overflow-y: auto as a fallback. It only ever activates when its own
// content actually exceeds the available height; it never causes the
// blank-space bounce this component exists to prevent.
//
// scrollable={false} opts a screen out of that fallback entirely (true no-
// scroll mode: overflow-hidden, no scroll fallback at all). Only use this
// for a screen whose content has actually been sized/compacted to fit
// 100dvh on its own — post-tutorial Home is the first such case. Screens
// that still rely on the scroll fallback (the pre-tutorial cinematic Home,
// which can slightly exceed one screen on the shortest legacy devices)
// must keep the default scrollable={true}.
//
// Intended for screens whose default state should feel like a fixed
// dashboard (Home, the collapsed Daily Battle page). Long or inherently
// scrolling screens (Cards, Bible, Settings, Collection, etc.) should keep
// using a normal min-h-screen page shell instead.
export default function FixedViewportPage({
  children,
  style,
  className = "",
  contentClassName = "",
  scrollable = true,
}) {
  return (
    <div
      className={`fixed inset-0 overflow-hidden overscroll-none ${className}`}
      style={{ height: "100dvh", maxHeight: "100dvh", ...style }}
    >
      <div
        className={`relative flex h-full w-full flex-col items-center overflow-x-hidden [-webkit-overflow-scrolling:touch] ${
          scrollable ? "overflow-y-auto overscroll-contain" : "overflow-y-hidden overscroll-none"
        } ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
