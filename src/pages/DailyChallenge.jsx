import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Check, Flame, Crown, Coins, Sparkles, Heart, User, Zap, Trophy, Info } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getDailyChallenge } from "@/data/dailyChallenge";
import { getCardById } from "@/data/cards";
import { getStats } from "@/game/playerStats";
import { MENU_ART, ENEMY_ART } from "@/data/art";
import CollapsibleRow from "@/components/game/CollapsibleRow";
import * as Sound from "@/game/soundManager";

const DIFFICULTY_BADGE_CLASSES = {
  easy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  normal: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  hard: "border-red-400/40 bg-red-500/10 text-red-300",
};

function StatTile({ icon: Icon, label, value, valueClassName = "" }) {
  return (
    <div className="rounded-lg border border-amber-500/10 bg-slate-900/30 px-2 py-2.5 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-amber-300/60" />
      <p className={`font-serif text-sm font-bold text-amber-100 ${valueClassName}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-amber-100/40">{label}</p>
    </div>
  );
}

export default function DailyChallenge() {
  const { profile, run, startDailyBattle, Sound: Snd } = useGame();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEqualInfo, setShowEqualInfo] = useState(false);
  const [showDeck, setShowDeck] = useState(false);
  const [showScoring, setShowScoring] = useState(false);

  const daily = getDailyChallenge();
  const todayStr = daily.date;
  const battleCompletedToday = profile.lastDailyDate === todayStr;
  const hasActiveDaily = run?.isDaily && run.phase === "battle";
  const stats = getStats();

  // Fixed deck preview — counts per card, identical for every player.
  const deckCounts = daily.deck.reduce((acc, cardId) => {
    acc[cardId] = (acc[cardId] || 0) + 1;
    return acc;
  }, {});
  const deckPreview = Object.entries(deckCounts).map(([cardId, count]) => ({
    id: cardId,
    count,
    name: getCardById(cardId)?.name || cardId,
  }));

  const startingFaith = daily.rule.maxEnergy || 3;
  const difficultyBadgeClass = DIFFICULTY_BADGE_CLASSES[daily.difficulty] || DIFFICULTY_BADGE_CLASSES.normal;

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const beginDaily = () => {
    setLoading(true);
    setTimeout(() => {
      startDailyBattle(daily);
      navigate("/play");
    }, 300);
  };

  const handleStart = () => {
    Sound.sfx.click();

    if (hasActiveDaily) {
      navigate("/play");
      return;
    }

    if (run && !run.isDaily) {
      setShowConfirm(true);
      return;
    }

    beginDaily();
  };

  const handleConfirmAbandon = () => {
    setShowConfirm(false);
    setLoading(true);
    setTimeout(() => {
      startDailyBattle(daily);
      navigate("/play");
    }, 300);
  };

  const enemyArt = ENEMY_ART[daily.enemy.id];

  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-16 lg:pt-8"
      style={{
        background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)",
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full motion-reduce:animate-none"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
            animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}

      <div className="relative w-full max-w-md lg:max-w-2xl">
        {/* Compact header */}
        <div className="mb-2 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full blur-md" style={{ background: "rgba(201,168,76,0.2)" }} />
            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-amber-400/40" style={{ background: "#0F1A30" }}>
              <img src={MENU_ART.daily} alt="Daily Battle" className="art-portrait" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-amber-300/60">Daily Battle</p>
            <h1 className="truncate font-serif text-lg text-amber-200 leading-tight">{daily.theme.title}</h1>
            <p className="truncate text-xs italic text-amber-100/50">{daily.theme.verse}</p>
          </div>
        </div>

        {/* Equal Challenge — compact row with optional expanded explanation */}
        <div className="mb-2 rounded-lg border border-emerald-400/20 bg-emerald-900/10 px-3 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-200/90">Equal Challenge</p>
              <p className="mt-0.5 text-[11px] leading-snug text-amber-100/55">
                Same hero, deck, enemy, rules, and difficulty for every player today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { Sound.sfx.click(); setShowEqualInfo((v) => !v); }}
              aria-expanded={showEqualInfo}
              aria-controls="equal-challenge-detail"
              aria-label="More about Equal Challenge"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-400/30 text-emerald-200/80 transition hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <p
            id="equal-challenge-detail"
            hidden={!showEqualInfo}
            className="mt-2 border-t border-emerald-400/10 pt-2 text-[10px] leading-relaxed text-amber-100/50"
          >
            Your custom deck, unlocked cards, upgrades, and personal progression are not used.
          </p>
        </div>

        {/* Today's Challenge — compact combined panel */}
        <div className="mb-2 rounded-xl border-2 border-amber-500/20 p-2.5" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-100/50">Today&apos;s Challenge</p>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${difficultyBadgeClass}`}>
              {daily.difficultyLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-900/20">
              <User className="h-4 w-4 text-blue-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-sm text-amber-100">{daily.hero.name} — {daily.hero.title}</p>
              <p className="flex items-center gap-2 text-[11px] text-amber-100/50">
                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-red-300" />{daily.maxHp} HP</span>
                <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-300" />{startingFaith} Faith</span>
              </p>
            </div>
          </div>

          <div className="my-1 flex items-center gap-2">
            <div className="h-px flex-1 bg-amber-500/15" />
            <span className="text-[9px] font-bold tracking-widest text-amber-300/40">VS</span>
            <div className="h-px flex-1 bg-amber-500/15" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-red-900/50" style={{ background: "#0F1A30" }}>
              {enemyArt ? (
                <img src={enemyArt} alt={daily.enemy.name} className="art-portrait" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base">{daily.enemy.icon}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-sm text-amber-100">
                {daily.enemy.name}
                {daily.enemy.isBoss && (
                  <span className="ml-1.5 align-middle text-[9px] font-bold text-red-400">BOSS</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-start gap-2 border-t border-amber-500/10 pt-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-300" />
            <div className="min-w-0">
              <p className="font-serif text-xs font-semibold text-purple-200">{daily.rule.name}</p>
              <p className="text-[11px] leading-snug text-amber-100/50">{daily.rule.description}</p>
            </div>
          </div>
        </div>

        {/* Fixed Deck — collapsed row */}
        <div className="mb-1.5">
          <CollapsibleRow
            label={`Fixed Deck — ${daily.deck.length} Cards`}
            actionLabel="View Deck"
            open={showDeck}
            onToggle={() => { Sound.sfx.click(); setShowDeck((v) => !v); }}
          >
            <p className="mb-2 text-[10px] text-amber-100/50">
              Identical for every player. Your unlocked cards are not used.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {deckPreview.map((card) => (
                <span
                  key={card.id}
                  className="rounded-full border border-emerald-500/20 bg-emerald-900/20 px-2 py-1 text-[10px] text-emerald-200/90"
                >
                  {card.count > 1 ? `${card.count}× ` : ""}{card.name}
                </span>
              ))}
            </div>
          </CollapsibleRow>
        </div>

        {/* Scoring Rules — collapsed row */}
        <div className="mb-2.5">
          <CollapsibleRow
            label="Scoring Rules"
            summary="Victory +500 • HP +10 • Turn −25"
            actionLabel="Details"
            open={showScoring}
            onToggle={() => { Sound.sfx.click(); setShowScoring((v) => !v); }}
          >
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Victory</span>
                <span className="font-medium text-amber-100">+500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">HP remaining</span>
                <span className="font-medium text-amber-100">+10 per HP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Turns used</span>
                <span className="font-medium text-red-300/80">-25 per turn</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Correct trivia</span>
                <span className="font-medium text-amber-100">+100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Perfect battle (no HP lost)</span>
                <span className="font-medium text-amber-100">+100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Cards played</span>
                <span className="font-medium text-amber-100/50">0 points</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-100/60">Defeat</span>
                <span className="font-medium text-amber-100/50">0</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 border-t border-amber-500/10 pt-2.5">
              <Trophy className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300/60" />
              <p className="text-[10px] text-amber-100/50">
                Only your best score for today is kept on the Daily leaderboard — replaying with a
                lower score never overwrites it.
              </p>
            </div>
          </CollapsibleRow>
        </div>

        {/* Primary battle button — moved above the fold */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 px-6 py-3.5 font-serif text-lg font-bold text-amber-100 transition hover:bg-amber-600/40 active:scale-[0.98] disabled:opacity-50"
        >
          <Swords className="h-5 w-5" />
          {loading ? "Starting..." : hasActiveDaily ? "Continue Daily Battle" : "Start Daily Battle"}
        </button>

        {/* Compact status & reward grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={Coins} label="Reward" value={`${daily.reward.gold} Gold`} />
          <StatTile
            icon={Trophy}
            label="Best Score"
            value={stats.bestDailyScore > 0 ? stats.bestDailyScore : "—"}
          />
          <StatTile
            icon={battleCompletedToday ? Check : Crown}
            label="Today's Status"
            value={battleCompletedToday ? "Completed" : "Not Done"}
            valueClassName={battleCompletedToday ? "text-emerald-300" : "text-amber-100/60"}
          />
          <StatTile icon={Flame} label="Battle Streak" value={profile.dailyStreak} />
          <StatTile icon={Heart} label="Prayer Streak" value={profile.devotionStreak || 0} />
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }} onClick={() => setShowConfirm(false)}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-serif text-amber-200 text-center mb-3">Abandon Current Run?</h2>
            <p className="text-amber-100/60 text-sm text-center mb-6">Starting the Daily Challenge will abandon your current Genesis run. Continue?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-800/60 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAbandon}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-red-100 text-sm font-bold hover:bg-red-800/40 transition"
              >
                Start Daily
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
