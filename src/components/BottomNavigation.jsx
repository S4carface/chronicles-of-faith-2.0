import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Copy, BookOpen, Home as HomeIcon, Sun, CircleUser } from "lucide-react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

const ITEMS = [
  {
    label: "Cards",
    path: "/collection",
    icon: Copy,
    // Thin separator after this item, between Cards and Bible.
    dividerAfter: true,
  },
  {
    label: "Bible",
    path: "/daily-prayer",
    icon: BookOpen,
    // No separator after Bible — keeps clear space around the raised
    // Home medallion instead of a line cutting through its glow.
  },
  {
    label: "Home",
    path: "/",
    icon: HomeIcon,
    primary: true,
  },
  {
    label: "Daily",
    path: "/daily",
    icon: Sun,
    // Thin separator after this item, between Daily and You.
    dividerAfter: true,
  },
  {
    label: "You",
    path: "/journey",
    icon: CircleUser,
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
      {/* Reserves room so the fixed bar — including the raised Home
          medallion, which extends above the bar's own top edge — never
          covers page content (Start Journey in particular). */}
      <div
        aria-hidden="true"
        className="h-[calc(6.5rem+env(safe-area-inset-bottom))]"
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))]"
        aria-label="Main navigation"
      >
        <div
          className="relative grid min-h-[78px] grid-cols-5 items-center rounded-2xl border border-amber-400/25 px-1 shadow-2xl backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,33,58,0.97) 0%, rgba(6,10,20,0.99) 100%)",
            boxShadow:
              "0 -8px 30px rgba(0,0,0,0.45), 0 0 25px rgba(201,168,76,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.primary) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={() => Sound.sfx.click()}
                  className="group relative flex min-h-11 flex-col items-center justify-end gap-1 pb-1.5"
                >
                  {({ isActive }) => (
                    <>
                      {/* Raised medallion — rises above the bar's own top
                          edge (a real gold-bordered circle, not just a
                          halo) so Home reads as the unmistakable center
                          destination. The reserved spacer above accounts
                          for this rise, so it never reaches Start Journey. */}
                      <span
                        className={`relative -mt-8 flex h-[60px] w-[60px] items-center justify-center rounded-full transition-transform duration-200 motion-reduce:transition-none group-active:scale-95 ${
                          isActive ? "scale-105" : "scale-100"
                        }`}
                        style={{
                          background: isActive
                            ? "radial-gradient(circle at 50% 32%, rgba(251,191,36,0.4) 0%, rgba(180,140,40,0.22) 55%, rgba(16,24,44,0.96) 100%)"
                            : "linear-gradient(180deg, rgba(30,42,68,0.98) 0%, rgba(10,15,28,0.98) 100%)",
                          border: isActive
                            ? "2px solid rgba(251,191,36,0.8)"
                            : "2px solid rgba(201,168,76,0.4)",
                          boxShadow: isActive
                            ? "0 0 22px rgba(251,191,36,0.5), 0 4px 10px rgba(0,0,0,0.4)"
                            : "0 4px 10px rgba(0,0,0,0.35)",
                        }}
                      >
                        <Icon
                          className={`relative h-7 w-7 transition-colors motion-reduce:transition-none ${
                            isActive ? "text-amber-200" : "text-amber-100/70 group-hover:text-amber-100/85"
                          }`}
                          strokeWidth={2}
                        />
                      </span>

                      <span className="relative flex h-[13px] w-full items-center justify-center">
                        <span
                          className={`whitespace-nowrap text-[10px] font-semibold tracking-wide transition-colors duration-200 motion-reduce:transition-none ${
                            isActive ? "text-amber-200" : "text-amber-100/70"
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => Sound.sfx.click()}
                className={`group relative flex min-h-11 flex-col items-center justify-center gap-1 ${
                  item.dividerAfter ? "after:absolute after:right-0 after:top-1/2 after:h-7 after:w-px after:-translate-y-1/2 after:bg-amber-400/10" : ""
                }`}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center transition-transform duration-200 motion-reduce:transition-none ${
                        isActive ? "-translate-y-0.5" : "translate-y-0"
                      }`}
                    >
                      {/* Medallion halo — sits behind the icon so it can expand without resizing the glyph */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 rounded-full transition-all duration-200 motion-reduce:transition-none ${
                          isActive
                            ? "scale-110 bg-amber-400/15 ring-1 ring-amber-300/55 shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                            : "scale-100 ring-1 ring-transparent"
                        }`}
                      />

                      <Icon
                        className={`relative h-6 w-6 transition-colors motion-reduce:transition-none ${
                          isActive
                            ? "text-amber-200"
                            : "text-amber-100/65 group-hover:text-amber-100/80"
                        }`}
                        strokeWidth={2}
                      />
                    </span>

                    {/* Label — always visible for all five tabs (muted when
                        inactive, bright when active) so the bar is readable
                        without needing to tap around to find each
                        destination. Doubles as the link's accessible name. */}
                    <span className="relative flex h-[13px] w-full items-center justify-center">
                      <span
                        className={`whitespace-nowrap text-[10px] font-medium tracking-wide transition-colors duration-200 motion-reduce:transition-none ${
                          isActive ? "text-amber-200" : "text-amber-100/65"
                        }`}
                      >
                        {item.label}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
