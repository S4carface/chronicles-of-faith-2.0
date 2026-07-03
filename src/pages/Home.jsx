import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swords } from "lucide-react";
import { useGame } from "@/game/GameContext";
import DifficultySelect from "@/components/game/DifficultySelect";
import { HOME_ART, MENU_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function Home() {
  const { profile, Sound: Snd } = useGame();

  useEffect(() => {
    Snd.playMusic("menu");
  }, []);

  const TOTAL_CARDS = 29;
  const TOTAL_ACHIEVEMENTS = 16;
  const menuItems = [
    { label: "My Collection", art: MENU_ART.collection, path: "/collection", desc: "Cards gathered", status: `${profile.collectedCards.length}/${TOTAL_CARDS}` },
    { label: "Shop", art: MENU_ART.shop, path: "/shop", desc: "Card packs & relics", status: `${profile.gold || 0} gold` },
    { label: "Progress Map", art: MENU_ART.progress, path: "/progress", desc: "Genesis to Revelation", status: "Genesis active" },
    { label: "Daily Challenge", art: MENU_ART.daily, path: "/daily", desc: "Today's special run", status: "New today" },
    { label: "Leaderboard", art: MENU_ART.leaderboard, path: "/leaderboard", desc: "Top scores", status: null },
    { label: "Achievements", art: MENU_ART.achievements, path: "/achievements", desc: "Sacred milestones", status: `${profile.achievements.length}/${TOTAL_ACHIEVEMENTS}` },
    { label: "Settings", art: MENU_ART.settings, path: "/settings", desc: "Audio & player options", status: null },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {/* Floating particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
          animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}

      {/* Hero / Title — compact */}
      <div className="relative text-center mb-5">
        <div className="flex justify-center mb-2">
          <img src={HOME_ART.cross} alt="Chronicles of Faith" className="w-14 h-14 object-cover rounded-full border-2 border-amber-400/30 shadow-lg shadow-amber-400/20 animate-icon-float" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif text-amber-200 tracking-wide leading-tight" style={{ textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          Chronicles of Faith
        </h1>
        <p className="text-amber-100/45 text-xs mt-1 font-serif italic tracking-wide">
          A Biblical Roguelike Journey
        </p>
        <div className="w-24 h-px mx-auto mt-2 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* Difficulty selector — compact horizontal */}
      <div className="relative w-full mb-4">
        <DifficultySelect />
      </div>

      {/* Play button — primary CTA */}
      <Link
        to="/play"
        onClick={() => Sound.sfx.click()}
        className="relative w-full max-w-md mb-6 px-8 py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-xl font-bold text-center hover:bg-amber-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-500/20"
        style={{ background: "linear-gradient(135deg, rgba(180,140,40,0.25) 0%, rgba(120,90,20,0.2) 100%)" }}
      >
        <span className="flex items-center justify-center gap-2">
          <Swords className="w-5 h-5" />
          Begin Genesis Run
        </span>
      </Link>

      {/* Secondary menu — compact premium rows */}
      <div className="relative w-full max-w-md grid grid-cols-1 gap-1.5">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => Sound.sfx.click()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-500/15 hover:border-amber-400/40 hover:bg-amber-500/5 hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 active:scale-[0.99] group"
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.45) 0%, rgba(15,26,48,0.45) 100%)" }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden border border-amber-500/20 group-hover:border-amber-400/40 transition-colors">
              <img src={item.art} alt={item.label} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-amber-100 text-[13px] leading-tight">{item.label}</div>
              <div className="text-amber-100/40 text-[10px] leading-tight">{item.desc}</div>
            </div>
            {item.status && (
              <span className="flex-shrink-0 text-amber-300/60 text-[10px] font-medium font-serif tracking-wide">
                {item.status}
              </span>
            )}
          </Link>
        ))}
      </div>

      <p className="relative text-amber-100/40 text-[10px] mt-6 font-serif italic text-center max-w-md">
        "In the beginning, God created the heavens and the earth." — Genesis 1:1
      </p>
    </div>
  );
}