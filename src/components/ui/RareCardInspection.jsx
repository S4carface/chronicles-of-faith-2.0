import { useEffect, useRef } from "react";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import { getCardEffectText } from "@/components/game/Card";
import SafeImage from "@/components/ui/SafeImage";
import "./RareCardInspection.css";

const MAX_TILT_DEGREES = 8;
const EASING = 0.105;
const SETTLED_EPSILON = 0.012;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function RareCardInspection({ card }) {
  const cardRef = useRef(null);
  const frameRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef(null);
  const draggingRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    };
  }, []);

  const renderFrame = () => {
    const surface = cardRef.current;
    if (!surface) return;

    const current = currentRef.current;
    const target = targetRef.current;
    current.x += (target.x - current.x) * EASING;
    current.y += (target.y - current.y) * EASING;

    const intensity = Math.min(1, Math.hypot(current.x, current.y) / MAX_TILT_DEGREES);
    surface.style.setProperty("--rare-tilt-x", `${current.x.toFixed(3)}deg`);
    surface.style.setProperty("--rare-tilt-y", `${current.y.toFixed(3)}deg`);
    surface.style.setProperty("--rare-art-x", `${(current.y * 1.05).toFixed(2)}px`);
    surface.style.setProperty("--rare-art-y", `${(-current.x * 0.8).toFixed(2)}px`);
    surface.style.setProperty("--rare-glare-x", `${(50 + current.y * 5.7).toFixed(2)}%`);
    surface.style.setProperty("--rare-glare-y", `${(50 - current.x * 5.7).toFixed(2)}%`);
    surface.style.setProperty("--rare-shadow-x", `${(-current.y * 2.25).toFixed(2)}px`);
    surface.style.setProperty("--rare-shadow-y", `${(18 + current.x * 1.35).toFixed(2)}px`);
    surface.style.setProperty("--rare-edge-angle", `${(135 + current.y * 4 - current.x * 2.5).toFixed(2)}deg`);
    surface.style.setProperty("--rare-glare-opacity", (0.24 + intensity * 0.22).toFixed(3));

    const settled = Math.abs(target.x - current.x) < SETTLED_EPSILON
      && Math.abs(target.y - current.y) < SETTLED_EPSILON;
    if (settled && !draggingRef.current) {
      frameIdRef.current = null;
      return;
    }
    frameIdRef.current = requestAnimationFrame(renderFrame);
  };

  const scheduleFrame = () => {
    if (!frameIdRef.current) frameIdRef.current = requestAnimationFrame(renderFrame);
  };

  const updateFromPointer = (event) => {
    if (!draggingRef.current || reducedMotionRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
    targetRef.current = {
      x: clamp(-normalizedY * MAX_TILT_DEGREES * 2, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
      y: clamp(normalizedX * MAX_TILT_DEGREES * 2, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
    };
    scheduleFrame();
  };

  const beginDrag = (event) => {
    if (reducedMotionRef.current) return;
    draggingRef.current = true;
    frameRef.current?.setPointerCapture?.(event.pointerId);
    updateFromPointer(event);
  };

  const endDrag = (event) => {
    draggingRef.current = false;
    targetRef.current = { x: 0, y: 0 };
    if (frameRef.current?.hasPointerCapture?.(event.pointerId)) {
      frameRef.current.releasePointerCapture(event.pointerId);
    }
    scheduleFrame();
  };

  return (
    <div className="rare-inspection-scene">
      <div
        ref={frameRef}
        className="rare-inspection-hit-area"
        onPointerDown={beginDrag}
        onPointerMove={updateFromPointer}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={cardRef} className="rare-inspection-card">
          <div className="rare-inspection-card__art">
            <SafeImage src={CARD_ART[card.id] || PLACEHOLDER_ART} alt={card.name} className="h-full w-full object-cover" />
          </div>
          <div className="rare-inspection-card__scrim" aria-hidden="true" />
          <div className="rare-inspection-card__frame" aria-hidden="true" />

          <div className="rare-inspection-card__content">
            <div className="rare-inspection-card__cost" aria-label={`${card.cost} Faith`}>{card.cost}</div>
            <div className="rare-inspection-card__rarity">Rare</div>
            <div className="rare-inspection-card__copy">
              <h3>{card.name}</h3>
              <p className="rare-inspection-card__type">{card.type}</p>
              <p className="rare-inspection-card__effect">{getCardEffectText(card)}</p>
              <p className="rare-inspection-card__verse">{card.verse}</p>
            </div>
          </div>

          <div className="rare-inspection-card__foil" aria-hidden="true" />
          <div className="rare-inspection-card__glare" aria-hidden="true" />
          <div className="rare-inspection-card__edge" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export { MAX_TILT_DEGREES };
