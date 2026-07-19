import React, { useEffect, useState } from "react";
import { preloadImage } from "@/lib/imageAssets";

export default function SafeImage({ src, alt, className = "", style, ...props }) {
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

  return (
    <>
      {!ready && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1A2744] to-[#0F1A30] text-amber-300/45"
          aria-label={failed ? `${alt} artwork unavailable` : `${alt} artwork loading`}
          role="img"
        >
          <span className="text-lg">✦</span>
        </span>
      )}
      <img
        {...props}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-150 ${ready ? "opacity-100" : "opacity-0"}`}
        style={style}
      />
    </>
  );
}
