import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

const ITEMS = [
  {
    label: "Cards",
    path: "/collection",
    symbol: "▦",
  },
  {
    label: "Bible",
    path: "/daily-prayer",
    symbol: "✦",
  },
  {
    label: "Home",
    path: "/",
    symbol: "⌂",
    primary: true,
  },
  {
    label: "Daily",
    path: "/daily",
    symbol: "◆",
  },
  {
    label: "You",
    path: "/journey",
    symbol: "○",
  },
];

const HIDDEN_PATHS = ["/play"];

export default function BottomNavigation() {
  const location = useLocation();
  const { profile } = useGame();

  const isHiddenPath = HIDDEN_PATHS.some(
    (path) =>
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
  );

  const shouldHide =
    !profile?.tutorialSeen ||
    isHiddenPath;

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Reserves room so the fixed bar does not cover page content */}
      <div
        aria-hidden="true"
        className="h-[calc(5.75rem+env(safe-area-inset-bottom))]"
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))]"
        aria-label="Main navigation"
      >
        <div
          className="grid grid-cols-5 items-end rounded-2xl border border-amber-400/20 px-2 py-1.5 shadow-2xl backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,39,68,0.96) 0%, rgba(8,12,24,0.98) 100%)",
            boxShadow:
              "0 -8px 30px rgba(0,0,0,0.45), 0 0 25px rgba(201,168,76,0.08)",
          }}
        >
          {ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => Sound.sfx.click()}
              className="group flex min-h-12 flex-col items-center justify-end gap-0.5"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center rounded-full border font-serif transition-all ${
                      item.primary
                        ? "-mt-4 h-12 w-12 border-amber-300/50 bg-amber-600/25 text-xl shadow-md shadow-amber-500/15"
                        : "h-8 w-8 border-transparent text-lg"
                    } ${
                      isActive
                        ? "text-amber-200"
                        : "text-amber-100/45 group-hover:text-amber-100/75"
                    }`}
                  >
                    {item.symbol}
                  </span>

                  <span
                    className={`text-[9px] font-medium ${
                      isActive
                        ? "text-amber-200"
                        : "text-amber-100/40"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}