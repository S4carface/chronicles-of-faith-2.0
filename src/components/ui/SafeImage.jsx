import React, { useEffect, useState } from "react";
import { preloadImage } from "@/lib/imageAssets";

// fallback contract:
//   - omitted (undefined): the original navy-gradient + gold-diamond
//     placeholder, unchanged, for every existing caller that doesn't pass one.
//   - null: renders nothing of its own while loading — for callers that
//     already have their own backdrop (a CSS gradient, glow, or icon layer
//     sitting behind this component) and don't want the diamond glyph
//     competing with it.
//   - any other node: rendered in place of the diamond placeholder while
//     loading/failed; the caller owns its sizing/positioning.
export default function SafeImage({ src, alt, className = "", style, fallback, ...props }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setFailed(false);
    preloadImage(src).then((loaded) => {
      if (!active) return;
      setReady(loaded);
      setFailed(!loaded);
    });
    return () => { active = false; };
  }, [src]);

  // One controlled retry: if this exact source failed, try it again once
  // connectivity returns. imageAssets.js's own module-level "online"
  // listener always runs first (registered at import time) and clears the
  // source from its failure cache, so this preloadImage call is a genuinely
  // fresh attempt rather than an instant replay of the earlier failure.
  useEffect(() => {
    if (!failed) return undefined;
    const retry = () => {
      preloadImage(src).then((loaded) => {
        setReady(loaded);
        setFailed(!loaded);
      });
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failed, src]);

  const showDefaultPlaceholder = !ready && fallback === undefined;
  const showCustomFallback = !ready && fallback !== undefined && fallback !== null;

  return (
    <>
      {showDefaultPlaceholder && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1A2744] to-[#0F1A30] text-amber-300/45"
          aria-label={failed ? `${alt} artwork unavailable` : `${alt} artwork loading`}
          role="img"
        >
          <span className="text-lg">✦</span>
        </span>
      )}
      {showCustomFallback && fallback}
      <img
        {...props}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-200 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
        style={style}
      />
    </>
  );
}
