import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import DifficultySelect from "@/components/game/DifficultySelect";
import * as Sound from "@/game/soundManager";

export default function Home() {
  const { profile, Sound: Snd } = useGame();

  useEffect(() => {
    Snd.playMusic("menu");
  }, []);

  const menuItems = [
    { label: "Play", icon: "⚔️", path: "/play", desc: "Begin your journey through Genesis" },
    { label: "My Collection", icon: "🃏", path: "/collection", desc: `${profile.collectedCards.length} cards collected` },
    { label: "Shop", icon: "🛒", path: "/shop", desc: `${profile.gold || 0} gold — buy card packs` },
    { label: "Progress Map", icon: "🗺️", path: "/progress", desc: "Genesis to Revelation roadmap" },
    { label: "Daily Challenge", icon: "📅", path: "/daily", desc: "Today's special run" },
    { label: "Leaderboard", icon: "🏆", path: "/leaderboard", desc: "See top scores" },
    { label: "Achievements", icon: "🎖️", path: "/achievements", desc: `${profile.achievements.length} unlocked` },
    { label: "Settings", icon: "⚙️", path: "/settings", desc: "Music & sound options" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {/* Floating particles */}
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
          animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}

      {/* Title */}
      <div className="relative text-center mb-12">
        <div className="text-6xl mb-4">✝️</div>
        <h1 className="text-5xl md:text-6xl font-serif text-amber-200 tracking-wide" style={{ textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          Chronicles of Faith
        </h1>
        <p className="text-amber-100/50 text-sm md:text-base mt-3 font-serif italic">
          A Biblical Roguelike Journey
        </p>
        <div className="w-32 h-px mx-auto mt-4 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* Difficulty selector */}
      <div className="relative mb-6">
        <DifficultySelect />
      </div>

      {/* Menu */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md w-full">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => Sound.sfx.click()}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-amber-500/15 hover:border-amber-400/50 transition-all duration-300 hover:scale-[1.02] group"
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.6) 0%, rgba(15,26,48,0.6) 100%)" }}
          >
            <div className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</div>
            <div>
              <div className="font-serif text-amber-100 text-lg">{item.label}</div>
              <div className="text-amber-100/40 text-xs">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <p className="relative text-amber-100/30 text-xs mt-12 font-serif italic text-center max-w-md">
        "In the beginning, God created the heavens and the earth." — Genesis 1:1
      </p>
    </div>
  );
}