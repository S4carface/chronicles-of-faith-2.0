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

  return (
    <>
      <style>{`
        @keyframes guidingLightNudgeDown {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(8px);
          }
        }

        @keyframes guidingLightNudgeUp {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes guidingLightNudgeLeft {
          0%, 100% {
            transform: translateX(0);
          }

          50% {
            transform: translateX(-8px);
          }
        }

        @keyframes guidingLightNudgeRight {
          0%, 100% {
            transform: translateX(0);
          }

          50% {
            transform: translateX(8px);
          }
        }

        @keyframes guidingLightPulse {
          0%, 100% {
            opacity: 0.75;
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.55));
          }

          50% {
            opacity: 1;
            filter:
              drop-shadow(0 0 9px rgba(251, 191, 36, 0.9))
              drop-shadow(0 0 16px rgba(255, 255, 255, 0.28));
          }
        }

        @keyframes guidingLightParticleOne {
          0%, 100% {
            opacity: 0.2;
            transform: translate(0, 0) scale(0.7);
          }

          50% {
            opacity: 0.9;
            transform: translate(-5px, -7px) scale(1);
          }
        }

        @keyframes guidingLightParticleTwo {
          0%, 100% {
            opacity: 0.15;
            transform: translate(0, 0) scale(0.6);
          }

          50% {
            opacity: 0.8;
            transform: translate(6px, -5px) scale(1);
          }
        }
      `}</style>

      <div
        className={`pointer-events-none absolute z-[57] flex h-14 w-14 items-center justify-center ${className}`}
        style={{
          animation:
            direction === "up"
              ? "guidingLightNudgeUp 1.25s ease-in-out infinite"
              : direction === "left"
                ? "guidingLightNudgeLeft 1.25s ease-in-out infinite"
                : direction === "right"
                  ? "guidingLightNudgeRight 1.25s ease-in-out infinite"
                  : "guidingLightNudgeDown 1.25s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <div
          className="relative flex h-12 w-12 items-center justify-center"
          style={{
            transform: rotation[direction] || rotation.down,
            animation: "guidingLightPulse 1.5s ease-in-out infinite",
          }}
        >
          {/* Soft sacred glow */}
          <div
            className="absolute h-10 w-10 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,248,210,0.42) 0%, rgba(251,191,36,0.18) 42%, transparent 72%)",
            }}
          />

          {/* Central guiding star */}
          <Sparkles
            className="relative z-10 h-7 w-7 text-amber-200"
            strokeWidth={1.8}
          />

          {/* Direction point */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: "12px solid rgba(251,191,36,0.95)",
              filter:
                "drop-shadow(0 0 5px rgba(251,191,36,0.75))",
            }}
          />

          {/* Floating light particles */}
          <span
            className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-amber-200"
            style={{
              animation:
                "guidingLightParticleOne 1.7s ease-in-out infinite",
            }}
          />

          <span
            className="absolute right-0 top-3 h-1 w-1 rounded-full bg-amber-100"
            style={{
              animation:
                "guidingLightParticleTwo 1.9s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </>
  );
}