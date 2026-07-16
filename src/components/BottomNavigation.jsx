import React from "react";
import { NavLink } from "react-router-dom";
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
    label: "Journey",
    path: "/progress",
    symbol: "◇",
  },
  {
    label: "You",
    path: "/journey",
    symbol: "○",
  },
];

export default function BottomNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div
        className="grid grid-cols-5 items-end rounded-2xl border border-amber-400/20 px-2 py-2 shadow-2xl backdrop-blur-xl"
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
            className="group flex min-h-14 flex-col items-center justify-end gap-1"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center rounded-full border font-serif transition-all ${
                    item.primary
                      ? "-mt-7 h-16 w-16 border-amber-300/60 bg-amber-600/30 text-2xl shadow-lg shadow-amber-500/20"
                      : "h-9 w-9 border-transparent text-xl"
                  } ${
                    isActive
                      ? "text-amber-200"
                      : "text-amber-100/45 group-hover:text-amber-100/75"
                  }`}
                >
                  {item.symbol}
                </span>

                <span
                  className={`text-[10px] font-medium ${
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
  );
}