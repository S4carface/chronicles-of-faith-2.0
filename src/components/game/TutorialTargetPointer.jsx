import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import TutorialGuidingLight from "@/components/game/TutorialGuidingLight";

// Visible box size of the guiding light per size (matches the container
// classes in TutorialGuidingLight: h-12/16/20).
const BOX = { small: 48, normal: 64, large: 80 };
// How far the arrow tip extends past the light's box edge (the arrow sits at
// -bottom-2 = 8px, plus its own height). Used so the tip lands on the target
// edge rather than the box edge.
const ARROW = { small: 8 + 12, normal: 8 + 16, large: 8 + 18 };

const EDGE = 4; // keep the marker this many px inside the viewport edges

// Finds the first *visible* element matching the selector. A selector can match
// both a mobile and a desktop variant of the same control (one is display:none
// with a zero rect); we want the one actually on screen.
function findVisibleTarget(selector) {
  const nodes = document.querySelectorAll(selector);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

// Anchors a single guiding-light marker to a real battle element measured live
// from its getBoundingClientRect(), so guidance stays centered on the correct
// target across mobile viewports, address-bar collapse, orientation changes,
// dynamic text size, and card/hand/panel animations. No hard-coded screen
// coordinates. Portalled to <body> so its position:fixed is viewport-relative
// and never inherits a transformed/scaled battle ancestor.
export default function TutorialTargetPointer({
  targetSelector,
  size = "small",
  placement = "above", // preferred side; auto-flips if it would clip the top
  gap = 2, // px between the arrow tip and the target edge
}) {
  const prefersReducedMotion = useReducedMotion();
  const [pos, setPos] = useState(null); // { left, top, dir }
  const rafRef = useRef(0);
  const missRef = useRef(0);
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!targetSelector || typeof document === "undefined") {
      setPos(null);
      return undefined;
    }

    let active = true;
    missRef.current = 0;
    warnedRef.current = false;

    const box = BOX[size] || BOX.small;
    const arrow = ARROW[size] || ARROW.small;

    const compute = () => {
      const el = findVisibleTarget(targetSelector);
      if (!el) {
        // Missing/not-yet-mounted target: never render a misleading marker.
        // The rAF loop keeps retrying; warn once in dev after a grace period.
        missRef.current += 1;
        if (
          import.meta.env?.DEV &&
          !warnedRef.current &&
          missRef.current === 90
        ) {
          warnedRef.current = true;
          console.warn(
            `[TutorialTargetPointer] target not found (yet): ${targetSelector}`
          );
        }
        setPos((prev) => (prev === null ? prev : null));
        return;
      }
      missRef.current = 0;

      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Center horizontally on the target, clamped inside the viewport.
      let centerX = r.left + r.width / 2;
      centerX = Math.min(
        Math.max(centerX, box / 2 + EDGE),
        vw - box / 2 - EDGE
      );

      // Prefer the requested side; flip to the opposite if there's no room.
      let dir = placement === "below" ? "up" : "down";
      let top;
      if (dir === "down") {
        // Marker above the target, arrow pointing down at its top edge.
        top = r.top - gap - arrow - box;
        if (top < EDGE) {
          // Not enough room above → point up from below instead.
          dir = "up";
          top = r.bottom + gap + arrow;
        }
      } else {
        top = r.bottom + gap + arrow;
        if (top + box > vh - EDGE) {
          dir = "down";
          top = r.top - gap - arrow - box;
        }
      }

      const left = centerX - box / 2;
      setPos((prev) =>
        prev &&
        prev.left === left &&
        prev.top === top &&
        prev.dir === dir
          ? prev
          : { left, top, dir }
      );
    };

    // Continuous rAF re-measure keeps the marker glued to the target through
    // any animation (hand slide-in, card scale, preview panel open) without
    // needing to enumerate every transition. setState only fires on real
    // change, so a static target costs one cheap measurement per frame.
    const loop = () => {
      if (!active) return;
      compute();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Prompt recompute on layout-affecting events (belt-and-suspenders with
    // the rAF loop; covers visual-viewport shifts the loop's rect already
    // reflects but which we still want to react to immediately).
    const onChange = () => compute();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onChange);
    vv?.addEventListener("scroll", onChange);
    // Re-anchor once fonts settle (text-size shifts can move targets).
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (active) compute();
      });
    }

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      vv?.removeEventListener("resize", onChange);
      vv?.removeEventListener("scroll", onChange);
    };
  }, [targetSelector, size, placement, gap]);

  if (!pos || typeof document === "undefined") return null;

  const box = BOX[size] || BOX.small;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[57]"
      style={{ left: pos.left, top: pos.top, width: box, height: box }}
      data-tutorial-pointer={targetSelector}
      aria-hidden="true"
    >
      <TutorialGuidingLight
        direction={pos.dir}
        size={size}
        reduced={prefersReducedMotion}
      />
    </div>,
    document.body
  );
}
