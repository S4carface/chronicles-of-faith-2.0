import React from "react";
import { Sparkles } from "lucide-react";

export default function TutorialGuidingLight({
  direction = "down",
  size = "normal",
  className = "",
  reduced = false,
}) {
  const rotation = {
    up: "rotate(180deg)",
    down: "rotate(0deg)",
    left: "rotate(90deg)",
    right: "rotate(-90deg)",
  };

  const movementAnimation = {
    up: "guidingLightMoveUp 1.6s ease-in-out infinite",
    down: "guidingLightMoveDown 1.6s ease-in-out infinite",
    left: "guidingLightMoveLeft 1.6s ease-in-out infinite",
    right: "guidingLightMoveRight 1.6s ease-in-out infinite",
  };
  
  const sizeClasses = {
  small: {
    container: "h-12 w-12",
    inner: "h-10 w-10",
    halo: "h-10 w-10",
    glow: "h-7 w-7",
    icon: "h-6 w-6",
    pointerLeft: "7px",
    pointerRight: "7px",
    pointerTop: "12px",
  },

  normal: {
    container: "h-16 w-16",
    inner: "h-14 w-14",
    halo: "h-14 w-14",
    glow: "h-9 w-9",
    icon: "h-8 w-8",
    pointerLeft: "9px",
    pointerRight: "9px",
    pointerTop: "16px",
  },

  large: {
    container: "h-20 w-20",
    inner: "h-16 w-16",
    halo: "h-16 w-16",
    glow: "h-11 w-11",
    icon: "h-9 w-9",
    pointerLeft: "10px",
    pointerRight: "10px",
    pointerTop: "18px",
  },
};

const activeSize = sizeClasses[size] || sizeClasses.normal;

  return (
    <>
      <style>{`
        @keyframes guidingLightMoveDown {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(7px);
          }
        }

        @keyframes guidingLightMoveUp {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes guidingLightMoveLeft {
          0%, 100% {
            transform: translateX(0);
          }

          50% {
            transform: translateX(-7px);
          }
        }

        @keyframes guidingLightMoveRight {
          0%, 100% {
            transform: translateX(0);
          }

          50% {
            transform: translateX(7px);
          }
        }

        @keyframes guidingLightBreathe {
          0%, 100% {
            opacity: 0.72;
            transform: scale(0.92);
          }

          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @keyframes guidingLightCorePulse {
          0%, 100% {
            filter:
              drop-shadow(0 0 5px rgba(251,191,36,0.65))
              drop-shadow(0 0 9px rgba(255,255,255,0.18));
          }

          50% {
            filter:
              drop-shadow(0 0 9px rgba(251,191,36,0.95))
              drop-shadow(0 0 17px rgba(255,255,255,0.38));
          }
        }

        @keyframes guidingParticleLeft {
          0%, 100% {
            opacity: 0.15;
            transform: translate(0, 3px) scale(0.6);
          }

          50% {
            opacity: 0.9;
            transform: translate(-7px, -8px) scale(1);
          }
        }

        @keyframes guidingParticleRight {
          0%, 100% {
            opacity: 0.1;
            transform: translate(0, 2px) scale(0.6);
          }

          50% {
            opacity: 0.8;
            transform: translate(7px, -6px) scale(1);
          }
        }
      `}</style>

      <div
        className={`pointer-events-none absolute z-[57] flex items-center justify-center ${activeSize.container} ${className}`}
        style={{
          animation: reduced
            ? "none"
            : movementAnimation[direction] || movementAnimation.down,
        }}
        aria-hidden="true"
      >
        <div
          className={`relative flex items-center justify-center ${activeSize.inner}`}
          style={{
            transform:
              rotation[direction] ||
              rotation.down,
          }}
        >
          {/* Large soft halo */}
          <div
            className={`absolute rounded-full ${activeSize.halo}`}
            style={{
              background:
                "radial-gradient(circle, rgba(255,251,226,0.52) 0%, rgba(251,191,36,0.24) 35%, rgba(251,191,36,0.08) 58%, transparent 76%)",
              animation: reduced
                ? "none"
                : "guidingLightBreathe 1.9s ease-in-out infinite",
            }}
          />

          {/* Inner sacred glow */}
          <div
            className={`absolute rounded-full ${activeSize.glow}`}
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,245,0.7) 0%, rgba(251,191,36,0.24) 48%, transparent 75%)",
            }}
          />

          {/* Main symbol */}
          <Sparkles
            className={`relative z-10 text-amber-100 ${activeSize.icon}`}
            strokeWidth={1.7}
            style={{
              animation: reduced
                ? "none"
                : "guidingLightCorePulse 1.7s ease-in-out infinite",
              filter: reduced
                ? "drop-shadow(0 0 7px rgba(251,191,36,0.8)) drop-shadow(0 0 13px rgba(255,255,255,0.28))"
                : undefined,
            }}
          />

          {/* Clear direction pointer */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft:
  `${activeSize.pointerLeft} solid transparent`,
borderRight:
  `${activeSize.pointerRight} solid transparent`,
borderTop:
  `${activeSize.pointerTop} solid rgba(251,191,36,0.98)`,
              filter:
                "drop-shadow(0 0 6px rgba(251,191,36,0.9))",
            }}
          />

          {/* Small particles — omitted under reduced motion */}
          {!reduced && (
            <>
              <span
                className="absolute left-1 top-2 h-1.5 w-1.5 rounded-full bg-amber-100"
                style={{
                  animation:
                    "guidingParticleLeft 2s ease-in-out infinite",
                }}
              />

              <span
                className="absolute right-1 top-3 h-1.5 w-1.5 rounded-full bg-yellow-100"
                style={{
                  animation:
                    "guidingParticleRight 2.2s ease-in-out infinite",
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}