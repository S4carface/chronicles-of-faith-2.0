import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Cards,
  Home,
  Map,
  UserRound,
} from "lucide-react";
import * as Sound from "@/game/soundManager";

const ITEMS = [
  {
    label: "Cards",
    path: "/collection",
    icon: Cards,
  },
  {
    label: "Bible",
    path: "/daily-prayer",
    icon: BookOpen,
  },
  {
    label: "Home",
    path: "/",
    icon: Home,
    primary: true,
  },
  {
    label: "Play",
    path: "/progress",
    icon: Map,
  },
  {
    label: "You",
    path: "/journey",
    icon: UserRound,
  },
];

const HIDDEN_PATHS = [
  "/play",
  "/daily",
];

export default function BottomNavigation() {
  const location = useLocation();

  const shouldHide = HIDDEN_PATHS.some(
    (path) =>
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
  );

  if (shouldHide) return null;

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
        {ITEMS.map((item) => {
          const Icon = item.icon;

          return (
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
                    className={`flex items-center justify-center rounded-full border transition-all ${
                      item.primary
                        ? "-mt-7 h-16 w-16 border-amber-300/60 bg-amber-600/30 shadow-lg shadow-amber-500/20"
                        : "h-9 w-9 border-transparent"
                    } ${
                      isActive
                        ? "text-amber-200"
                        : "text-amber-100/45 group-hover:text-amber-100/75"
                    }`}
                  >
                    <Icon
                      className={
                        item.primary ? "h-7 w-7" : "h-5 w-5"
                      }
                    />
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
          );
        })}
      </div>
    </nav>
  );
}