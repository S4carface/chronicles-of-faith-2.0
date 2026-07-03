import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGame } from "@/game/GameContext";
import * as Sound from "@/game/soundManager";

export default function Leaderboard() {
  const { Sound: Snd } = useGame();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, daily, weekly

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
        <h1 className="text-3xl font-serif text-amber-200">🏆 Leaderboard</h1>
        <div className="w-16" />
      </div>

      {/* Filters */}
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

      {/* Scroll-like list */}
      <div className="max-w-2xl mx-auto rounded-xl border-2 border-amber-500/15 overflow-hidden" style={{ background: "rgba(15,26,48,0.5)" }}>
        {loading && (
          <div className="p-12 text-center text-amber-100/60">
            <div className="w-8 h-8 border-4 border-amber-200/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            Loading scores...
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="p-12 text-center text-amber-100/60">
            <div className="text-4xl mb-3">📜</div>
            <p>No scores yet. Be the first!</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="divide-y divide-amber-500/5">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 transition ${
                  idx === 0 ? "bg-amber-500/10" : idx < 3 ? "bg-amber-500/5" : ""
                }`}
              >
                <div className={`w-8 text-center font-serif text-lg font-bold ${
                  idx === 0 ? "text-yellow-300" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-700" : "text-amber-100/60"
                }`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="flex-1">
                  <div className="font-serif text-amber-100">{entry.player_name}</div>
                  <div className="text-amber-100/60 text-xs">
                    {heroNames[entry.hero_used] || entry.hero_used} • {entry.rooms_cleared} rooms • {entry.trivia_correct} trivia
                    {entry.is_daily && <span className="text-amber-300/60 ml-1">📅 Daily</span>}
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-200 font-serif">{entry.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}