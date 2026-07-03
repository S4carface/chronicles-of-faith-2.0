import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Compass, Swords, BookOpen, Flame, Layers,
  Trophy, Skull, Crown, Coins, Target, Shield, Heart, Sparkles, Star,
} from "lucide-react";
import { useGame } from "@/game/GameContext";
import { CARD_MAP, getCardById } from "@/data/cards";
import { getStats, syncStatsToCloud } from "@/game/playerStats";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import { MENU_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
      <div className={`flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-md flex items-center justify-center ${accent || "bg-amber-900/30"}`}>
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-200/80" />
      </div>
      <div className="min-w-0">
        <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-amber-100 text-sm lg:text-lg font-bold font-serif leading-none">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border-2 border-amber-500/15 p-4 lg:p-5" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300/70" />
        <h3 className="font-serif text-amber-200 text-base lg:text-lg uppercase tracking-wide">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:gap-3">{children}</div>
    </div>
  );
}

export default function MyJourney() {
  const { profile, saveProfile } = useGame();
  const navigate = useNavigate();
  const [stats, setStats] = useState(() => getStats());
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    Sound.playMusic("menu");
    setStats(getStats());
    syncStatsToCloud();
  }, []);

  // Derived stats from the player profile (collection lives there)
  const collection = profile.cardCollection || {};
  const cardsCollected = Object.keys(collection).length;
  const legendaryCardsFound = useMemo(
    () => Object.keys(collection).filter(id => CARD_MAP[id]?.rarity === "legendary").length,
    [collection]
  );

  const favoriteCard = useMemo(() => {
    const usage = stats.cardUsage || {};
    const entries = Object.entries(usage);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [cardId, count] = entries[0];
    const card = getCardById(cardId);
    return card ? { name: card.name, count } : null;
  }, [stats.cardUsage]);

  const triviaAccuracy = stats.triviaAnswered > 0
    ? Math.round((stats.triviaCorrect / stats.triviaAnswered) * 100)
    : 0;

  const genesisCompleted = stats.runsWon > 0 ? 1 : 0;
  const hasName = !!(profile.playerName && profile.playerName !== "Anonymous Warrior");

  return (
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          onClick={() => { Sound.sfx.click(); navigate("/"); }}
          className="flex items-center gap-1.5 text-amber-100/60 hover:text-amber-200 transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Menu
        </button>
      </div>

      <div className="w-full max-w-2xl text-center mb-5">
        <div className="flex justify-center mb-2">
          <img src={MENU_ART.progress} alt="My Journey" className="w-14 h-14 object-cover rounded-full border-2 border-amber-400/30 shadow-lg shadow-amber-400/20 animate-icon-float" />
        </div>
        <h1 className="font-serif text-amber-200 tracking-wide" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          My Journey
        </h1>
        <p className="text-amber-100/45 mt-1 font-serif italic text-sm lg:text-base">Your progress, streaks, and Bible learning</p>
      </div>

      {/* Player name section */}
      <div className="w-full max-w-2xl mb-5">
        {hasName ? (
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-400/20" style={{ background: "linear-gradient(135deg, rgba(30,40,68,0.5) 0%, rgba(15,26,48,0.5) 100%)" }}>
            <div className="min-w-0">
              <p className="text-amber-100/40 text-[10px] uppercase tracking-wide">Player</p>
              <p className="font-serif text-amber-200 text-lg lg:text-xl truncate">{profile.playerName}</p>
            </div>
            <button
              onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-900/20 text-amber-100 text-sm hover:bg-amber-900/40 transition flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Name
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl border-2 border-amber-400/30 bg-amber-900/10 text-center">
            <p className="text-amber-100/70 text-sm mb-3">Choose your player name so your scores can appear on the leaderboard.</p>
            <button
              onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-sm hover:bg-amber-600/40 transition"
            >
              <Pencil className="w-4 h-4" /> Choose Player Name
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="w-full max-w-2xl space-y-4">
        {/* 1. Journey Progress */}
        <SectionCard icon={Compass} title="Journey Progress">
          <StatTile icon={Swords} label="Runs Played" value={stats.runsPlayed} />
          <StatTile icon={Trophy} label="Runs Completed" value={stats.runsCompleted} accent="bg-emerald-900/30" />
          <StatTile icon={Crown} label="Runs Won" value={stats.runsWon} accent="bg-amber-700/30" />
          <StatTile icon={Star} label="Genesis Completed" value={genesisCompleted} accent="bg-amber-700/30" />
        </SectionCard>

        {/* 2. Battle Record */}
        <SectionCard icon={Swords} title="Battle Record">
          <StatTile icon={Trophy} label="Battles Won" value={stats.battlesWon} accent="bg-emerald-900/30" />
          <StatTile icon={Skull} label="Battles Lost" value={stats.battlesLost} accent="bg-red-900/30" />
          <StatTile icon={Crown} label="Bosses Defeated" value={stats.bossesDefeated} accent="bg-amber-700/30" />
          <StatTile icon={Target} label="Best Score" value={stats.bestScore} accent="bg-amber-700/30" />
          <StatTile icon={Coins} label="Gold Earned" value={stats.totalGoldEarned} accent="bg-amber-700/30" />
          <StatTile icon={Layers} label="Cards Collected" value={cardsCollected} />
          <StatTile icon={Star} label="Legendary Found" value={legendaryCardsFound} accent="bg-amber-700/30" />
        </SectionCard>

        {/* 3. Bible Knowledge */}
        <SectionCard icon={BookOpen} title="Bible Knowledge">
          <StatTile icon={BookOpen} label="Trivia Answered" value={stats.triviaAnswered} />
          <StatTile icon={Target} label="Trivia Correct" value={stats.triviaCorrect} accent="bg-emerald-900/30" />
          <StatTile icon={Sparkles} label="Accuracy %" value={`${triviaAccuracy}%`} accent="bg-emerald-900/30" />
          <StatTile icon={BookOpen} label="Verses Read" value={stats.versesRead} />
          <StatTile icon={Compass} label="Books Completed" value={genesisCompleted} />
          <StatTile icon={Star} label="Genesis Done" value={genesisCompleted} accent="bg-amber-700/30" />
        </SectionCard>

        {/* 4. Daily Challenge */}
        <SectionCard icon={Flame} title="Daily Challenge">
          <StatTile icon={Flame} label="Current Streak" value={profile.dailyStreak || 0} accent="bg-orange-900/30" />
          <StatTile icon={Crown} label="Best Streak" value={stats.bestDailyStreak} accent="bg-orange-900/30" />
          <StatTile icon={Trophy} label="Challenges Done" value={stats.dailyChallengesCompleted} accent="bg-emerald-900/30" />
          <StatTile icon={Target} label="Best Daily Score" value={stats.bestDailyScore} accent="bg-amber-700/30" />
        </SectionCard>

        {/* 5. Card Mastery */}
        <SectionCard icon={Layers} title="Card Mastery">
          <div className="col-span-2 flex items-center gap-2.5 p-2.5 lg:p-3 rounded-lg bg-slate-900/40 border border-amber-500/10">
            <div className="flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-md flex items-center justify-center bg-amber-700/30">
              <Star className="w-4 h-4 lg:w-5 lg:h-5 text-amber-200/80" />
            </div>
            <div className="min-w-0">
              <p className="text-amber-100/40 text-[9px] lg:text-[10px] uppercase tracking-wide leading-none mb-0.5">Favorite Card</p>
              <p className="text-amber-100 text-sm lg:text-base font-bold font-serif leading-none truncate">
                {favoriteCard ? `${favoriteCard.name} (${favoriteCard.count}×)` : "—"}
              </p>
            </div>
          </div>
          <StatTile icon={Swords} label="Damage Dealt" value={stats.totalDamageDealt} accent="bg-red-900/30" />
          <StatTile icon={Shield} label="Block Gained" value={stats.totalBlockGained} accent="bg-sky-900/30" />
          <StatTile icon={Heart} label="Healing Done" value={stats.totalHealingDone} accent="bg-emerald-900/30" />
        </SectionCard>
      </div>

      <p className="text-amber-100/30 text-[10px] mt-6 font-serif italic text-center max-w-md">
        "I have fought the good fight, I have finished the race." — 2 Timothy 4:7
      </p>

      {showNamePrompt && (
        <PlayerNamePrompt
          onSave={(name) => { setShowNamePrompt(false); }}
          onCancel={() => setShowNamePrompt(false)}
          forceName={!hasName}
        />
      )}
    </div>
  );
}