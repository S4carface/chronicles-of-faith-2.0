import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { ScrollText, Calendar, Clock, Globe, RefreshCw, WifiOff, Pencil, Archive, ChevronLeft } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/lib/AuthContext";
import { VICTORY_ART } from "@/data/art";
import { fetchLeaderboard, getPlayerId } from "@/game/scoreManager";
import {
  getActiveSeason,
  fetchCurrentSeasonLeaderboard,
  fetchWeeklyLeaderboard,
  fetchLegacySeasons,
  fetchLegacyLeaderboard,
} from "@/game/seasonManager";
import { sanitizePlayerName, needsPlayerName } from "@/game/nameValidator";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import * as Sound from "@/game/soundManager";

const RANK_STYLES = [
  { bg: "bg-gradient-to-br from-amber-300 to-amber-600", border: "border-amber-300", text: "text-amber-900", ring: "ring-amber-400/50" },
  { bg: "bg-gradient-to-br from-slate-200 to-slate-400", border: "border-slate-200", text: "text-slate-800", ring: "ring-slate-300/50" },
  { bg: "bg-gradient-to-br from-orange-300 to-amber-700", border: "border-orange-300", text: "text-amber-900", ring: "ring-orange-400/50" },
];

const DIFFICULTY_BADGE_CLASSES = {
  easy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  normal: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  hard: "border-red-400/40 bg-red-500/10 text-red-300",
};

const TABS = [
  { key: "season", label: "Current Season", icon: ScrollText },
  { key: "weekly", label: "This Week", icon: Clock },
  { key: "daily", label: "Daily Battle", icon: Calendar },
];

const TAB_EXPLANATIONS = {
  season: "One best Genesis score per player this season. Easy, Normal, and Hard are combined.",
  weekly: "One best Genesis score per player this week. Easy, Normal, and Hard are combined.",
  daily: "Today's fixed challenge uses the same hero, deck, enemy, difficulty, and scoring for every player.",
};

export default function Leaderboard() {
  const { Sound: Snd, profile, saveProfile } = useGame();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("season");
  const [loadError, setLoadError] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [activeSeason, setActiveSeason] = useState(null);

  const [showLegacy, setShowLegacy] = useState(false);
  const [legacySeasons, setLegacySeasons] = useState([]);
  const [legacySeasonId, setLegacySeasonId] = useState(null);

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
      let data;
      if (tab === "season") {
        const season = await getActiveSeason();
        setActiveSeason(season);
        data = await fetchCurrentSeasonLeaderboard(season);
      } else if (tab === "weekly") {
        data = await fetchWeeklyLeaderboard();
      } else {
        data = await fetchLeaderboard("daily");
      }
      setEntries(data);
    } catch {
      setEntries([]);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!showLegacy) loadLeaderboard(filter);
  }, [filter, showLegacy]);

  const handleRefresh = () => {
    Sound.sfx.click();
    if (showLegacy) {
      loadLegacy(legacySeasonId);
    } else {
      loadLeaderboard(filter);
    }
  };

  const loadLegacy = async (seasonId) => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchLegacyLeaderboard(seasonId);
      setEntries(data);
    } catch {
      setEntries([]);
      setLoadError(true);
    }
    setLoading(false);
  };

  const openLegacy = async () => {
    Sound.sfx.click();
    setShowLegacy(true);
    setLoading(true);
    const seasons = await fetchLegacySeasons();
    setLegacySeasons(seasons);
    const targetId = seasons[0]?.id || null;
    setLegacySeasonId(targetId);
    if (targetId) await loadLegacy(targetId);
    else setLoading(false);
  };

  const closeLegacy = () => {
    Sound.sfx.click();
    setShowLegacy(false);
  };

  const playerId = getPlayerId();

  const normalizedPlayerName = sanitizePlayerName(profile.playerName)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  const isMyEntry = (entry) => {
    const entryName = sanitizePlayerName(entry.playerName)
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

    return (
      entry.playerId === playerId ||
      (
        normalizedPlayerName &&
        normalizedPlayerName !== "anonymous pilgrim" &&
        entryName === normalizedPlayerName
      )
    );
  };

  const hasMyScore = entries.some(isMyEntry);
  const myEntryIndex = entries.findIndex(isMyEntry);
  const myEntry = myEntryIndex >= 0 ? entries[myEntryIndex] : null;

  const statusLabel = (() => {
    if (showLegacy) return null;
    const categoryWord = filter === "season" ? "season" : filter === "weekly" ? "weekly" : "daily";
    if (!myEntry) return `No ${categoryWord} score yet`;
    return `Your ${categoryWord} best: ${Number(myEntry.score || 0).toLocaleString()} · Rank #${myEntryIndex + 1}`;
  })();

  return (
    <div
      className="min-h-screen px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28"
      style={{
        background:
          "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)",
      }}
    >
      <div className="mb-4">
        <Link
          to="/"
          aria-label="Return to Main Menu"
          className="inline-flex min-h-11 items-center text-amber-100/60 hover:text-amber-200 transition text-sm"
        >
          ← Menu
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full overflow-hidden border-2 border-amber-400/50"
            style={{ background: "#0F1A30" }}
          >
            <img src={VICTORY_ART.crest} alt="" className="art-portrait" />
          </div>

          <h1 className="font-serif text-2xl text-amber-200 sm:text-3xl">
            Leaderboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleChangeName}
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-800/30"
            title="Change Name"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Name</span>
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
        <div className="mb-6 flex items-center justify-center gap-1.5 text-xs text-amber-100/40">
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

        {showLegacy ? (
          <div className="mb-4 flex items-center justify-center gap-3">
            <button
              onClick={closeLegacy}
              className="flex min-h-11 items-center gap-1 rounded-lg border border-amber-500/15 px-2 text-sm text-amber-100/60 transition hover:text-amber-100/80"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <p className="flex items-center gap-1.5 font-serif text-amber-200">
              <Archive className="h-4 w-4 text-amber-300/60" />
              {legacySeasons.find((s) => s.id === legacySeasonId)?.name || "Legacy Records"}
            </p>
          </div>
        ) : (
          <div className="flex justify-center gap-2 mb-3">
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
        )}

        {!showLegacy && (
          <div className="mb-4 text-center">
            <button
              onClick={openLegacy}
              className="min-h-11 px-2 text-xs text-amber-100/35 underline decoration-dotted transition hover:text-amber-200/60"
            >
              Legacy Records →
            </button>
          </div>
        )}

        <p className="mb-1 text-center text-[11px] text-amber-100/45">
          {showLegacy
            ? "Archived scores from earlier gameplay and balance versions."
            : TAB_EXPLANATIONS[filter]}
        </p>
        <p className="mb-4 text-center text-[9px] text-amber-100/25">
          Developer and internal test scores are excluded from public rankings.
        </p>

        {statusLabel && (
          <p className="mx-auto mb-3 max-w-2xl text-center text-xs font-medium text-amber-200/80">
            {statusLabel}
          </p>
        )}

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
            <p className="mb-1">{showLegacy ? "No archived scores in this season." : filter === "weekly" ? "No weekly scores yet." : "No scores yet."}</p>
            {!showLegacy && (
              <p className="text-xs text-amber-100/40">
                {filter === "weekly"
                  ? "Complete Genesis to post your best score for this week."
                  : "Complete Genesis or Daily Battle to appear here."}
              </p>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div className="divide-y divide-amber-500/5">
            {entries.map((entry, idx) => {
              const rank = RANK_STYLES[idx] || null;
              const mine = !showLegacy && isMyEntry(entry);
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 transition ${
                    mine
                      ? "bg-amber-400/10 ring-2 ring-inset ring-amber-300/50"
                      : idx === 0
                        ? "bg-amber-500/10"
                        : idx < 3
                          ? "bg-amber-500/5"
                          : ""
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
                    <div className="flex items-center gap-2">
                      <div className="truncate font-serif text-amber-100">
                        {sanitizePlayerName(entry.playerName)}
                      </div>

                      {mine && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-100">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-amber-100/60">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_BADGE_CLASSES[entry.difficulty] || DIFFICULTY_BADGE_CLASSES.normal}`}>
                        {entry.difficulty || "normal"}
                      </span>
                      <span className="text-amber-300/70">{entry.hero}</span>
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

      {!loading && !loadError && !showLegacy && entries.length > 0 && !hasMyScore && (
        <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-amber-500/20 bg-amber-900/10 p-4 text-center">
          <p className="text-sm text-amber-100/60">
            {filter === "daily"
              ? "Complete today's Daily Battle to challenge this score."
              : "Complete Genesis to place your best score on this leaderboard."}
          </p>
        </div>
      )}
      {!loading &&
        !loadError &&
        !showLegacy &&
        filter === "daily" &&
        entries.length === 1 &&
        hasMyScore && (
          <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-amber-500/15 bg-slate-900/20 p-4 text-center">
            <p className="text-sm text-amber-100/45">
              You currently hold the only score today. Other players can still challenge it.
            </p>
          </div>
        )}

      {isAdmin && (
        <div className="mx-auto mt-6 max-w-2xl flex items-center justify-center gap-4 text-center">
          <Link to="/admin/seasons" className="text-[10px] text-amber-100/30 transition hover:text-amber-200/60">
            Season Management →
          </Link>
          <Link to="/admin/developer-accounts" className="text-[10px] text-amber-100/30 transition hover:text-amber-200/60">
            Developer Accounts →
          </Link>
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
