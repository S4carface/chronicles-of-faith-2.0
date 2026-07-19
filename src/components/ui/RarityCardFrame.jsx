import { useEffect, useRef } from "react";
import { cn } from "@/utils";
import { getCardRarity, getRarityCssVariables } from "@/data/cardRarity";
import "./RarityCardFrame.css";

const MAX_TILT_DEGREES = 6;
const TILT_EASING = 0.12;
const NEUTRAL_EPSILON = 0.015;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function RarityCardFrame({
  rarity = "common",
  className,
  children,
  selected = false,
  enableTilt = true,
  showcase = false,
  style,
  ...props
}) {
  const frameRef = useRef(null);
  const frameIdRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const orientationActiveRef = useRef(false);
  const orientationRequestedRef = useRef(false);
  const config = getCardRarity(rarity);
  const motionEnabled = enableTilt && config.motionIntensity > 0;

  const renderTilt = () => {
    const frame = frameRef.current;
    if (!frame) return;
    const current = currentRef.current;
    const target = targetRef.current;
    current.x += (target.x - current.x) * TILT_EASING;
    current.y += (target.y - current.y) * TILT_EASING;

    frame.style.setProperty("--rarity-tilt-x", `${current.x.toFixed(3)}deg`);
    frame.style.setProperty("--rarity-tilt-y", `${current.y.toFixed(3)}deg`);
    frame.style.setProperty("--rarity-light-x", `${(50 + current.y * 5).toFixed(2)}%`);
    frame.style.setProperty("--rarity-light-y", `${(50 - current.x * 5).toFixed(2)}%`);
    frame.style.setProperty("--rarity-shadow-x", `${(-current.y * 0.75).toFixed(2)}px`);

    const settled = Math.abs(target.x - current.x) < NEUTRAL_EPSILON
      && Math.abs(target.y - current.y) < NEUTRAL_EPSILON;
    if (settled && !orientationActiveRef.current) {
      frameIdRef.current = null;
      return;
    }
    frameIdRef.current = requestAnimationFrame(renderTilt);
  };

  const scheduleFrame = () => {
    if (!frameIdRef.current) frameIdRef.current = requestAnimationFrame(renderTilt);
  };

  useEffect(() => {
    if (!motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const onOrientation = ({ beta, gamma }) => {
      if (!orientationActiveRef.current || beta == null || gamma == null) return;
      const limit = MAX_TILT_DEGREES * config.motionIntensity;
      targetRef.current = {
        x: clamp((beta - 35) / 7, -limit, limit),
        y: clamp(gamma / 7, -limit, limit),
      };
      scheduleFrame();
    };
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    };
  }, [motionEnabled, config.motionIntensity]);

  const requestOrientation = async () => {
    if (!motionEnabled || orientationRequestedRef.current || !("DeviceOrientationEvent" in window)) return;
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

  const updatePointer = (event) => {
    if (!motionEnabled || orientationActiveRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const limit = MAX_TILT_DEGREES * config.motionIntensity;
    targetRef.current = {
      x: clamp(-(((event.clientY - bounds.top) / bounds.height) - 0.5) * limit * 2, -limit, limit),
      y: clamp((((event.clientX - bounds.left) / bounds.width) - 0.5) * limit * 2, -limit, limit),
    };
    scheduleFrame();
  };

  const returnToNeutral = () => {
    if (orientationActiveRef.current) return;
    targetRef.current = { x: 0, y: 0 };
    scheduleFrame();
  };

  return (
    <div
      {...props}
      ref={frameRef}
      data-rarity={config.key}
      className={cn(
        "rarity-card-frame",
        `rarity-card-frame--${config.key}`,
        motionEnabled && "rarity-card-frame--motion",
        selected && "rarity-card-frame--selected",
        showcase && "rarity-card-frame--showcase",
        className,
      )}
      style={{ ...getRarityCssVariables(config.key), ...style }}
      onPointerDown={(event) => {
        requestOrientation();
        updatePointer(event);
        props.onPointerDown?.(event);
      }}
      onPointerMove={(event) => {
        updatePointer(event);
        props.onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        returnToNeutral();
        props.onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        returnToNeutral();
        props.onPointerCancel?.(event);
      }}
      onPointerLeave={(event) => {
        returnToNeutral();
        props.onPointerLeave?.(event);
      }}
    >
      {children}
      <span className="rarity-card-frame__foil" aria-hidden="true" />
      <span className="rarity-card-frame__glint" aria-hidden="true" />
      <span className="rarity-card-frame__rim" aria-hidden="true" />
      {config.key === "legendary" && <span className="rarity-card-frame__particles" aria-hidden="true" />}
    </div>
  );
}

export { MAX_TILT_DEGREES };
