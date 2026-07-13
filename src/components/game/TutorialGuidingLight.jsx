import React from "react";
import { Sparkles } from "lucide-react";

export default function TutorialGuidingLight({
  direction = "down",
  className = "",
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
        className={`pointer-events-none absolute z-[57] flex h-16 w-16 items-center justify-center ${className}`}
        style={{
          animation:
            movementAnimation[direction] ||
            movementAnimation.down,
        }}
        aria-hidden="true"
      >
        <div
          className="relative flex h-14 w-14 items-center justify-center"
          style={{
            transform:
              rotation[direction] ||
              rotation.down,
          }}
        >
          {/* Large soft halo */}
          <div
            className="absolute h-14 w-14 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,251,226,0.52) 0%, rgba(251,191,36,0.24) 35%, rgba(251,191,36,0.08) 58%, transparent 76%)",
              animation:
                "guidingLightBreathe 1.9s ease-in-out infinite",
            }}
          />

          {/* Inner sacred glow */}
          <div
            className="absolute h-9 w-9 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,245,0.7) 0%, rgba(251,191,36,0.24) 48%, transparent 75%)",
            }}
          />

          {/* Main symbol */}
          <Sparkles
            className="relative z-10 h-8 w-8 text-amber-100"
            strokeWidth={1.7}
            style={{
              animation:
                "guidingLightCorePulse 1.7s ease-in-out infinite",
            }}
          />

          {/* Clear direction pointer */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft:
                "9px solid transparent",
              borderRight:
                "9px solid transparent",
              borderTop:
                "16px solid rgba(251,191,36,0.98)",
              filter:
                "drop-shadow(0 0 6px rgba(251,191,36,0.9))",
            }}
          />

          {/* Small particles */}
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
        </div>
      </div>
    </>
  );
}