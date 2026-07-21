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
  },
  {
    label: "Bible",
    path: "/daily-prayer",
    icon: BookOpen,
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
          {ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => Sound.sfx.click()}
                className="group flex min-h-12 flex-col items-center justify-end gap-1"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex items-center justify-center transition-transform duration-200 motion-reduce:transition-none ${
                        item.primary ? "h-10 w-10" : "h-9 w-9"
                      } ${isActive ? "-translate-y-1" : "translate-y-0"}`}
                    >
                      {/* Medallion halo — sits behind the icon so it can expand without resizing the glyph */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 rounded-full transition-all duration-200 motion-reduce:transition-none ${
                          isActive
                            ? "scale-110 bg-amber-400/15 ring-1 ring-amber-300/50 shadow-[0_0_12px_rgba(201,168,76,0.28)]"
                            : "scale-100 ring-1 ring-transparent"
                        }`}
                      />

                      <Icon
                        className={`relative ${item.primary ? "h-[21px] w-[21px]" : "h-5 w-5"} transition-colors ${
                          isActive
                            ? "text-amber-200"
                            : "text-amber-100/60 group-hover:text-amber-100/80"
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
