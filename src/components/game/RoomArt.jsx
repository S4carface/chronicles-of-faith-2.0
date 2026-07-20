import React, { useEffect, useState } from "react";
import { ROOM_ICONS } from "@/data/genesisRooms";

// Guaranteed-visible room artwork for the Genesis map.
//
// The room-type icon (ROOM_ICONS) is a local, network-independent glyph
// that is always rendered underneath. The remote/local artwork image is
// layered on top and only fades in once it has actually finished loading;
// on a slow connection or a failed request it simply never appears,
// leaving the icon as a legible fallback instead of a blank rectangle.
// No retries are attempted — a failed image just stays hidden.
export default function RoomArt({ roomType, src, alt, className = "", ...rest }) {
  const [loaded, setLoaded] = useState(false);

  // A different src (e.g. a new enemy assigned to this node) starts fresh.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const icon = ROOM_ICONS[roomType] || "✦";

  return (
    <>
      <span
        className="absolute inset-0 flex items-center justify-center text-xl leading-none text-amber-100/80 lg:text-2xl"
        aria-hidden="true"
      >
        {icon}
      </span>

      {src && (
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={`absolute inset-0 ${className} transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          {...rest}
        />
      )}
    </>
  );
}
