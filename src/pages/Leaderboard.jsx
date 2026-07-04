import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ScrollText, Calendar, Clock, Globe, RefreshCw, WifiOff, Pencil } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { VICTORY_ART } from "@/data/art";
import { fetchLeaderboard, getPlayerId } from "@/game/scoreManager";
import { sanitizePlayerName, needsPlayerName } from "@/game/nameValidator";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import * as Sound from "@/game/soundManager";

const RANK_STYLES = [
  { bg: "bg-gradient-to-br from-amber-300 to-amber-600", border: "border-amber-300", text: "text-amber-900", ring: "ring-amber-400/50" },
  { bg: "bg-gradient-to-br from-slate-200 to-slate-400", border: "border-slate-200", text: "text-slate-800", ring: "ring-slate-300/50" },
  { bg: "bg-gradient-to-br from-orange-300 to-amber-700", border: "border-orange-300", text: "text-amber-900", ring: "ring-orange-400/50" },
];

const TABS = [
  { key: "all", label: "All Time", icon: ScrollText },
  { key: "weekly", label: "This Week", icon: Clock },
  { key: "daily", label: "Today's Daily", icon: Calendar },
];

export default function Leaderboard() {
  const { Sound: Snd, profile, saveProfile } = useGame();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [loadError, setLoadError] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    Snd.playMusic("menu");
    // Auto-prompt only the first time a guest opens the Leaderboard.
    // After that, show a soft banner instead of a blocking modal.
    if (needsPlayerName(profile.playerName) && !profile.leaderboardNamePromptSeen) {
      setShowNamePrompt(true);
      saveProfile({ leaderboardNamePromptSeen: true });
    }
  }, []);

  const handleChangeName = () => {
    Sound.sfx.click();
    setShowNamePrompt(true);
  };

  const loadLeaderboard = useCallback(async (tab) => {
    setLoading(true);
    setLoadError(false);
    setEntries([]);
    try {
      const data = await fetchLeaderboard(tab);
      setEntries(data);
    } catch {
      setEntries([]);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeaderboard(filter);
  }, [filter]);

  const handleRefresh = () => {
    Sound.sfx.click();
    loadLeaderboard(filter);
  };

  const playerId = getPlayerId();
  const hasMyScore = entries.some(e => e.playerId === playerId);

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-amber-400/50" style={{ background: "#0F1A30" }}>
            <img src={VICTORY_ART.crest} alt="" className="art-portrait" />
          </div>
          <h1 className="text-3xl font-serif text-amber-200">Leaderboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleChangeName}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/30 bg-amber-900/20 text-amber-200 text-xs font-medium hover:bg-amber-800/30 transition"
            title="Change Name"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Change Name</span>
          </button>
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-lg border border-amber-400/30 bg-amber-900/20 flex items-center justify-center text-amber-200 hover:bg-amber-800/30 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-4 text-amber-100/40 text-xs">
        <Globe className="w-3.5 h-3.5 text-emerald-400/60" />
        <span>Scores are shared online across players.</span>
      </div>

      {/* Soft invite banner for guests who skipped the auto-prompt */}
      {needsPlayerName(profile.playerName) && !showNamePrompt && (
        <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg border border-amber-400/30 bg-amber-900/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-3.5 h-3.5 text-amber-300/60 flex-shrink-0" />
            <span className="text-amber-100/60 text-xs lg:text-sm truncate">
              Playing as Anonymous Pilgrim — add your name to claim your scores.
            </span>
          </div>
          <button
            onClick={handleChangeName}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-900/20 text-amber-200 text-xs font-medium hover:bg-amber-800/30 transition"
          >
            Add Name
          </button>
        </div>
      )}

      <div className="flex justify-center gap-2 mb-6">
        {TABS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); Sound.sfx.click(); }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f.key
                  ? "bg-amber-500/20 border border-amber-400/50 text-amber-200"
                  : "border border-amber-500/10 text-amber-100/60 hover:text-amber-100/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto rounded-xl border-2 border-amber-500/15 overflow-hidden" style={{ background: "rgba(15,26,48,0.5)" }}>
        {loading && (
          <div className="p-12 text-center text-amber-100/60">
            <div className="w-8 h-8 border-4 border-amber-200/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            Loading leaderboard...
          </div>
        )}

        {loadError && !loading && (
          <div className="p-12 text-center text-amber-100/60">
            <WifiOff className="w-10 h-10 mx-auto mb-3 text-amber-300/40" />
            <p className="mb-2">Could not load leaderboard.</p>
            <p className="text-xs text-amber-100/40">Check your connection and try again.</p>
          </div>
        )}

        {!loading && !loadError && entries.length === 0 && (
          <div className="p-12 text-center text-amber-100/60">
            <ScrollText className="w-10 h-10 mx-auto mb-3 text-amber-300/40" />
            <p className="mb-1">No scores yet.</p>
            <p className="text-xs text-amber-100/40">Complete Genesis or Daily Battle to appear here.</p>
          </div>
        )}

        {entries.length > 0 && (
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
                    <div className="font-serif text-amber-100 truncate">{sanitizePlayerName(entry.playerName)}</div>
                    <div className="text-amber-100/60 text-xs flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-300/70">{entry.hero}</span>
                      <span className="text-amber-100/30">·</span>
                      <span className="capitalize text-amber-100/50">{entry.difficulty}</span>
                      <span className="text-amber-100/30">·</span>
                      <span>{entry.roomsCleared} rooms</span>
                      <span className="text-amber-100/30">·</span>
                      <span>{entry.triviaCorrect} trivia</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-200 font-serif">{entry.score}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !loadError && entries.length > 0 && !hasMyScore && (
        <div className="max-w-2xl mx-auto mt-4 p-4 rounded-lg border border-amber-500/20 bg-amber-900/10 text-center">
          <p className="text-amber-100/60 text-sm">No score yet. Complete Genesis or Daily Battle to appear here.</p>
        </div>
      )}

      {showNamePrompt && (
        <PlayerNamePrompt
          onSave={() => setShowNamePrompt(false)}
          onCancel={() => setShowNamePrompt(false)}
          endOfRun
        />
      )}
    </div>
  );
}