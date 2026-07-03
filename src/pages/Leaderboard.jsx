import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, ScrollText, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

const RANK_STYLES = [
  { bg: "bg-gradient-to-br from-amber-300 to-amber-600", border: "border-amber-300", text: "text-amber-900", ring: "ring-amber-400/50" },
  { bg: "bg-gradient-to-br from-slate-200 to-slate-400", border: "border-slate-200", text: "text-slate-800", ring: "ring-slate-300/50" },
  { bg: "bg-gradient-to-br from-orange-300 to-amber-700", border: "border-orange-300", text: "text-amber-900", ring: "ring-orange-400/50" },
];

export default function Leaderboard() {
  const { Sound: Snd } = useGame();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Snd.playMusic("menu");
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let results;
      if (filter === "daily") {
        results = await base44.entities.LeaderboardEntry.filter({ is_daily: true }, "-score", 50);
      } else {
        results = await base44.entities.LeaderboardEntry.list("-score", 50);
      }
      if (filter === "weekly") {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        results = results.filter(e => new Date(e.created_date).getTime() > weekAgo);
      }
      setEntries(results || []);
    } catch (e) {
      setEntries([]);
    }
    setLoading(false);
  };

  const heroNames = { adam: "Adam", noah: "Noah" };

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-300" />
          <h1 className="text-3xl font-serif text-amber-200">Leaderboard</h1>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {[
          { key: "all", label: "All Time" },
          { key: "weekly", label: "This Week" },
          { key: "daily", label: "Daily Challenge" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); Sound.sfx.click(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
                : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto rounded-xl border-2 border-amber-500/15 overflow-hidden" style={{ background: "rgba(15,26,48,0.5)" }}>
        {loading && (
          <div className="p-12 text-center text-amber-100/60">
            <div className="w-8 h-8 border-4 border-amber-200/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            Loading scores...
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="p-12 text-center text-amber-100/60">
            <ScrollText className="w-10 h-10 mx-auto mb-3 text-amber-300/40" />
            <p>No scores yet. Be the first!</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="divide-y divide-amber-500/5">
            {entries.map((entry, idx) => {
              const rank = RANK_STYLES[idx] || null;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 transition ${
                    idx === 0 ? "bg-amber-500/10" : idx < 3 ? "bg-amber-500/5" : ""
                  }`}
                >
                  <div className="flex-shrink-0 w-10 flex justify-center">
                    {rank ? (
                      <div className={`w-8 h-8 rounded-full ${rank.bg} ${rank.border} border-2 flex items-center justify-center shadow-md ring-2 ${rank.ring}`}>
                        <span className={`text-sm font-bold ${rank.text}`}>{idx + 1}</span>
                      </div>
                    ) : (
                      <span className="text-amber-100/50 font-serif text-sm font-bold">#{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-amber-100">{entry.player_name}</div>
                    <div className="text-amber-100/60 text-xs flex items-center gap-1">
                      {heroNames[entry.hero_used] || entry.hero_used} • {entry.rooms_cleared} rooms • {entry.trivia_correct} trivia
                      {entry.is_daily && <span className="text-amber-300/60 ml-1 flex items-center gap-0.5"><Calendar className="w-3 h-3" />Daily</span>}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-200 font-serif">{entry.score}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}