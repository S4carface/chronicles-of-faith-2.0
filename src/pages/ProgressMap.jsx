import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Landmark, Scroll, Hash, BookMarked, Castle, Swords, Wheat, Crown, Cross, Flame, Sunrise, Lock, Play, ChevronRight } from "lucide-react";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

const ICON_MAP = {
  globe: Globe, landmark: Landmark, scroll: Scroll, hash: Hash,
  bookmark: BookMarked, castle: Castle, swords: Swords, wheat: Wheat,
  crown: Crown, cross: Cross, flame: Flame, sunrise: Sunrise,
};

const BOOKS = [
  { name: "Genesis", status: "playable", icon: "globe", desc: "Creation, the Fall, the Flood, and the Patriarchs" },
  { name: "Exodus", status: "locked", icon: "landmark", desc: "Deliverance and the wilderness" },
  { name: "Leviticus", status: "locked", icon: "scroll", desc: "Laws, sacrifices, and holiness" },
  { name: "Numbers", status: "locked", icon: "hash", desc: "The census and the desert journey" },
  { name: "Deuteronomy", status: "locked", icon: "bookmark", desc: "Moses' final words to Israel" },
  { name: "Joshua", status: "locked", icon: "castle", desc: "Courage and conquest" },
  { name: "Judges", status: "locked", icon: "swords", desc: "Cycles of rebellion and rescue" },
  { name: "Ruth", status: "locked", icon: "wheat", desc: "Loyalty and redemption" },
  { name: "1 Samuel", status: "locked", icon: "crown", desc: "Prophets, kings, and calling" },
  { name: "2 Samuel", status: "locked", icon: "crown", desc: "David's reign and legacy" },
  { name: "1 Kings", status: "locked", icon: "crown", desc: "Solomon's wisdom and the divided kingdom" },
  { name: "2 Kings", status: "locked", icon: "crown", desc: "Exile and the fall of kings" },
  { name: "Matthew", status: "locked", icon: "cross", desc: "The genealogy and birth of the Messiah" },
  { name: "Mark", status: "locked", icon: "cross", desc: "The servant King in action" },
  { name: "Luke", status: "locked", icon: "cross", desc: "Good news for the lost and found" },
  { name: "John", status: "locked", icon: "cross", desc: "Light, life, and love incarnate" },
  { name: "Acts", status: "locked", icon: "flame", desc: "The Spirit empowers the early church" },
  { name: "Revelation", status: "locked", icon: "sunrise", desc: "The final chapter — coming last" },
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

      <div className="max-w-2xl mx-auto space-y-3 pb-12">
        {BOOKS.map((book, idx) => {
          const isPlayable = book.status === "playable";
          const Icon = ICON_MAP[book.icon] || BookMarked;
          return (
            <div key={book.name}>
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  isPlayable ? "bg-amber-400 shadow-lg shadow-amber-400/50" : "bg-slate-600"
                }`} />

                <Link
                  to={isPlayable ? "/play" : "#"}
                  onClick={(e) => { if (!isPlayable) e.preventDefault(); else Sound.sfx.click(); }}
                  className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isPlayable
                      ? "border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/15 hover:scale-[1.02] cursor-pointer"
                      : "border-slate-600/40 bg-slate-900/40 hover:border-slate-500/50"
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${
                    isPlayable
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-slate-600/30 bg-slate-800/50"
                  }`}>
                    <Icon className={`w-5 h-5 ${isPlayable ? "text-amber-300" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-serif text-lg flex items-center gap-2 ${isPlayable ? "text-amber-200" : "text-slate-300"}`}>
                      {book.name}
                      {isPlayable && <span className="text-emerald-400 text-xs flex items-center gap-0.5"><Play className="w-3 h-3" />Playable</span>}
                    </h3>
                    <p className={`text-xs ${isPlayable ? "text-amber-100/70" : "text-slate-400"}`}>{book.desc}</p>
                  </div>
                  {isPlayable
                    ? <ChevronRight className="text-amber-300 w-5 h-5 flex-shrink-0" />
                    : <Lock className="text-slate-500 w-4 h-4 flex-shrink-0" />
                  }
                </Link>
              </div>
              {idx < BOOKS.length - 1 && (
                <div className={`ml-1.5 w-0.5 h-4 ${isPlayable ? "bg-amber-500/30" : "bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}