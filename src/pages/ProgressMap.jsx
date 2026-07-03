import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

const BOOKS = [
  { name: "Genesis", status: "playable", icon: "🌍", desc: "Creation, the Fall, the Flood, and the Patriarchs" },
  { name: "Exodus", status: "locked", icon: "🏛️", desc: "Coming soon" },
  { name: "Leviticus", status: "locked", icon: "📜", desc: "Coming soon" },
  { name: "Numbers", status: "locked", icon: "🔢", desc: "Coming soon" },
  { name: "Deuteronomy", status: "locked", icon: "📖", desc: "Coming soon" },
  { name: "Joshua", status: "locked", icon: "🏰", desc: "Coming soon" },
  { name: "Judges", status: "locked", icon: "⚔️", desc: "Coming soon" },
  { name: "Ruth", status: "locked", icon: "🌾", desc: "Coming soon" },
  { name: "1 Samuel", status: "locked", icon: "👑", desc: "Coming soon" },
  { name: "2 Samuel", status: "locked", icon: "👑", desc: "Coming soon" },
  { name: "1 Kings", status: "locked", icon: "👑", desc: "Coming soon" },
  { name: "2 Kings", status: "locked", icon: "👑", desc: "Coming soon" },
  { name: "Matthew", status: "locked", icon: "✝️", desc: "Coming soon" },
  { name: "Mark", status: "locked", icon: "✝️", desc: "Coming soon" },
  { name: "Luke", status: "locked", icon: "✝️", desc: "Coming soon" },
  { name: "John", status: "locked", icon: "✝️", desc: "Coming soon" },
  { name: "Acts", status: "locked", icon: "🔥", desc: "Coming soon" },
  { name: "Revelation", status: "locked", icon: "🌅", desc: "The final chapter — coming last" },
];

export default function ProgressMap() {
  const { Sound: Snd } = useGame();
  useEffect(() => { Snd.playMusic("menu"); }, []);

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <h1 className="text-3xl font-serif text-amber-200">Progress Map</h1>
        <div className="w-16" />
      </div>

      <p className="text-center text-amber-100/70 text-sm mb-8 max-w-lg mx-auto font-serif italic">
        Your journey through the Bible, from Genesis to Revelation. Each book is a new chapter of adventure.
      </p>

      {/* Scroll */}
      <div className="max-w-2xl mx-auto space-y-3 pb-12">
        {BOOKS.map((book, idx) => {
          const isPlayable = book.status === "playable";
          return (
            <div key={book.name}>
              <div className="flex items-center gap-4">
                {/* Timeline dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  isPlayable ? "bg-amber-400 shadow-lg shadow-amber-400/50" : "bg-slate-700"
                }`} />

                {/* Book card */}
                <Link
                  to={isPlayable ? "/play" : "#"}
                  onClick={(e) => { if (!isPlayable) e.preventDefault(); else Sound.sfx.click(); }}
                  className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isPlayable
                      ? "border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/15 hover:scale-[1.02] cursor-pointer"
                      : "border-slate-700/20 bg-slate-900/30 opacity-50"
                  }`}
                >
                  <div className={`text-3xl ${isPlayable ? "" : "grayscale opacity-50"}`}>{book.icon}</div>
                  <div className="flex-1">
                    <h3 className={`font-serif text-lg ${isPlayable ? "text-amber-200" : "text-slate-500"}`}>
                      {book.name} {isPlayable && <span className="text-emerald-400 text-xs ml-2">▶ Playable</span>}
                    </h3>
                    <p className={`text-xs ${isPlayable ? "text-amber-100/70" : "text-slate-600"}`}>{book.desc}</p>
                  </div>
                  {isPlayable && <div className="text-amber-300 text-xl">→</div>}
                  {!isPlayable && <div className="text-slate-600 text-xl">🔒</div>}
                </Link>
              </div>
              {idx < BOOKS.length - 1 && (
                <div className={`ml-1.5 w-0.5 h-4 ${isPlayable ? "bg-amber-500/30" : "bg-slate-800"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}