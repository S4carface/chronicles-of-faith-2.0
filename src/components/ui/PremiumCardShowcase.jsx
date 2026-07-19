import { useEffect, useRef } from "react";
import "./PremiumCardShowcase.css";

const MAX_TILT_DEGREES = 6;
const IDLE_CYCLE_MS = 6000;
const TILT_EASING = 0.085;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PremiumCardShowcase({
  src = "/images/cards/showcase/sling-stone-premium.png",
  alt = "Premium Sling Stone card",
  className = "",
}) {
  const cardRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const orientationActiveRef = useRef(false);
  const orientationRequestedRef = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return undefined;

    let frameId;
    let startTime = performance.now();

    const render = (time) => {
      const target = targetRef.current;
      const current = currentRef.current;

      current.x += (target.x - current.x) * TILT_EASING;
      current.y += (target.y - current.y) * TILT_EASING;

      const idlePhase = ((time - startTime) % IDLE_CYCLE_MS) / IDLE_CYCLE_MS;
      const idleWave = Math.sin(idlePhase * Math.PI * 2);
      const tiltX = current.x;
      const tiltY = current.y;
      const scale = 1.0075 + idleWave * 0.0075;
      const rotateZ = idleWave * 1.2;
      const lightX = 50 + tiltY * 4.2;
      const lightY = 50 - tiltX * 4.2;

      card.style.setProperty("--premium-tilt-x", `${tiltX.toFixed(3)}deg`);
      card.style.setProperty("--premium-tilt-y", `${tiltY.toFixed(3)}deg`);
      card.style.setProperty("--premium-idle-rotate", `${rotateZ.toFixed(3)}deg`);
      card.style.setProperty("--premium-scale", scale.toFixed(4));
      card.style.setProperty("--premium-light-x", `${lightX.toFixed(2)}%`);
      card.style.setProperty("--premium-light-y", `${lightY.toFixed(2)}%`);
      card.style.setProperty("--premium-shadow-x", `${(-tiltY * 1.1).toFixed(2)}px`);
      card.style.setProperty("--premium-shadow-y", `${(10 + tiltX * 0.8).toFixed(2)}px`);

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const onOrientation = ({ beta, gamma }) => {
      if (!orientationActiveRef.current || beta == null || gamma == null) return;
      targetRef.current = {
        x: clamp((beta - 35) / 7, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
        y: clamp(gamma / 7, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
      };
    };

    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  const requestOrientation = async () => {
    if (orientationRequestedRef.current || !("DeviceOrientationEvent" in window)) return;
    orientationRequestedRef.current = true;

    try {
      const permission = typeof DeviceOrientationEvent.requestPermission === "function"
        ? await DeviceOrientationEvent.requestPermission()
        : "granted";
      orientationActiveRef.current = permission === "granted";
    } catch {
      orientationActiveRef.current = false;
    }
  };

  const updatePointerTilt = (event) => {
    if (orientationActiveRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
    targetRef.current = {
      x: clamp(-normalizedY * MAX_TILT_DEGREES * 2, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
      y: clamp(normalizedX * MAX_TILT_DEGREES * 2, -MAX_TILT_DEGREES, MAX_TILT_DEGREES),
    };
  };

  const returnToNeutral = () => {
    if (!orientationActiveRef.current) targetRef.current = { x: 0, y: 0 };
  };

  return (
    <div className={`premium-card-scene ${className}`}>
      <div
        ref={cardRef}
        className="premium-card"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          requestOrientation();
          updatePointerTilt(event);
        }}
        onPointerMove={updatePointerTilt}
        onPointerUp={returnToNeutral}
        onPointerCancel={returnToNeutral}
        onPointerLeave={returnToNeutral}
      >
        <img className="premium-card__image" src={src} alt={alt} draggable="false" />
        <span className="premium-card__foil" aria-hidden="true" />
        <span className="premium-card__glint" aria-hidden="true" />
        <span className="premium-card__rim" aria-hidden="true" />
      </div>
    </div>
  );
}

export { MAX_TILT_DEGREES };
