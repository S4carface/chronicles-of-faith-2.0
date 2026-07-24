import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Swords, Check, Flame, Crown, Coins, Sparkles, Heart, User, Zap, Trophy, Info } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getDailyChallenge } from "@/data/dailyChallenge";
import { getCardById } from "@/data/cards";
import { getStats } from "@/game/playerStats";
import { MENU_ART, ENEMY_ART } from "@/data/art";
import CollapsibleRow from "@/components/game/CollapsibleRow";
import FixedViewportPage from "@/components/FixedViewportPage";
import StickyActionDock from "@/components/StickyActionDock";
import * as Sound from "@/game/soundManager";

// The daily seed rolls over at UTC midnight (see getDailySeed in dailyChallenge.js) —
// this only computes a display countdown to that boundary, it never touches the seed itself.
function useResetCountdown() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const diffMs = Math.max(0, nextReset - now.getTime());
      const hours = Math.floor(diffMs / 3_600_000);
      const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
      setLabel(`${hours}h ${minutes}m`);
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return label;
}
const DAILY_BACKGROUND =
  "/images/backgrounds/daily-bg-celestial-challenge.PNG";
const DIFFICULTY_BADGE_CLASSES = {
  easy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  normal: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  hard: "border-red-400/40 bg-red-500/10 text-red-300",
};

function StatTile({ icon: Icon, label, value, valueClassName = "" }) {
  return (
    <div className="rounded-lg border border-amber-500/15 bg-slate-950/65 px-2 py-1.5 text-center backdrop-blur-[2px]">
      <Icon className="mx-auto mb-0.5 h-3.5 w-3.5 text-amber-300/60" />
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
  const [showFairnessInfo, setShowFairnessInfo] = useState(false);
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

  const startingFaith = daily.startFaith || daily.rule.maxEnergy || 3;
  const difficultyBadgeClass = DIFFICULTY_BADGE_CLASSES[daily.difficulty] || DIFFICULTY_BADGE_CLASSES.normal;
  const resetLabel = useResetCountdown();

  useEffect(() => { Snd.playMusic("menu"); }, []);

  useEffect(() => {
    if (!showFairnessInfo) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowFairnessInfo(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFairnessInfo]);

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
<FixedViewportPage
  style={{
    backgroundColor: "#050B16",
    backgroundImage: `linear-gradient(
      180deg,
      rgba(4, 9, 20, 0.38) 0%,
      rgba(5, 11, 26, 0.62) 34%,
      rgba(3, 8, 18, 0.9) 100%
    ), url("${DAILY_BACKGROUND}")`,
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  }}
        contentClassName="px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:px-6 lg:pt-8"
    >
<div
  className="pointer-events-none absolute inset-0"
  aria-hidden="true"
  style={{
    background:
      "radial-gradient(circle at 50% 4%, rgba(244,190,76,0.18) 0%, rgba(244,190,76,0.06) 22%, transparent 42%), radial-gradient(circle at 50% 58%, rgba(25,48,94,0.18) 0%, transparent 48%)",
  }}
/>

<div
  className="pointer-events-none absolute inset-x-0 top-0 h-52"
  aria-hidden="true"
  style={{
    background:
      "linear-gradient(180deg, rgba(5,11,22,0.08) 0%, rgba(5,11,22,0.3) 62%, transparent 100%)",
  }}
/>

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
        <div className="mb-1 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full blur-md" style={{ background: "rgba(201,168,76,0.2)" }} />
            <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-amber-400/40" style={{ background: "#0F1A30" }}>
              <img src={MENU_ART.daily} alt="Daily Battle" className="art-portrait" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-300/60">Daily Battle</p>
            <h1 className="truncate font-serif text-lg text-amber-200 leading-tight">{daily.theme.title}</h1>
            <p className="truncate text-xs italic text-amber-100/50">{daily.theme.verse}</p>
          </div>

          {resetLabel && (
            <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-amber-500/20 bg-slate-900/40 px-2 py-1 text-[10px] font-medium text-amber-100/50">
              Resets in {resetLabel}
            </span>
          )}
        </div>

        {/* Compact fairness note — full explanation lives in a modal */}
        <div className="mb-1.5 flex items-center gap-1 pl-11">
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-amber-100/55">
            Same challenge for every player today.
          </p>
          <button
            type="button"
            onClick={() => { Sound.sfx.click(); setShowFairnessInfo(true); }}
            aria-label="Explain Daily Battle fairness"
            className="relative -my-2.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-emerald-200/80 transition hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Today's Challenge — compact combined panel */}
        <div   className="mb-1 rounded-xl border-2 border-amber-500/20 p-1.5"   style={{     background: "rgba(8,16,34,0.76)",     backdropFilter: "blur(2px)",   }} >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-100/50">Today&apos;s Challenge</p>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${difficultyBadgeClass}`}>
              {daily.difficultyLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-900/20">
              <User className="h-3.5 w-3.5 text-blue-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-sm text-amber-100">{daily.hero.name} — {daily.hero.title}</p>
              <p className="flex flex-wrap items-center gap-2 text-[11px] text-amber-100/50">
                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-red-300" />{daily.maxHp} HP</span>
                <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-300" />{startingFaith} Faith</span>
                {daily.drawPerTurn > 1 && (
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-300" />Draw {daily.drawPerTurn}/turn</span>
                )}
              </p>
            </div>
          </div>

          <p className="my-0.5 text-center text-[9px] font-bold tracking-widest text-amber-300/40">VS</p>

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-lg border border-red-900/50" style={{ background: "#0F1A30" }}>
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

          <div className="mt-1 flex items-start gap-2 border-t border-amber-500/10 pt-1">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-300" />
            <div className="min-w-0">
              <p className="font-serif text-xs font-semibold text-purple-200">{daily.rule.name}</p>
              <p className="text-[11px] leading-snug text-amber-100/50">{daily.rule.description}</p>
            </div>
          </div>
        </div>

        {/* Fixed Deck — collapsed row */}
        <div className="mb-0.5">
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
        <div className="mb-1">
          <CollapsibleRow
            label="Scoring Rules"
            summary="Victory +500 • HP +10 • Turn −10"
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
                <span className="font-medium text-red-300/80">-10 per turn</span>
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

      {/* Flexible filler — keeps the sticky Start button pinned to the bottom
          of the viewport even when the content above doesn't fill it */}
      <div className="flex-1" aria-hidden="true" />

      <StickyActionDock className="mx-auto max-w-md lg:max-w-2xl">
        <button
          onClick={handleStart}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 px-6 py-2.5 font-serif text-lg font-bold text-amber-100 transition hover:bg-amber-600/40 active:scale-[0.98] disabled:opacity-50"
        >
          <Swords className="h-5 w-5" />
          {loading ? "Starting..." : hasActiveDaily ? "Continue Daily Battle" : "Start Daily Battle"}
        </button>
      </StickyActionDock>

      {showFairnessInfo && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(8,12,24,0.95)" }}
          onClick={() => setShowFairnessInfo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fairness-info-title"
            className="w-full max-w-sm rounded-2xl border-2 border-emerald-400/30 p-6"
            style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fairness-info-title" className="mb-3 text-center font-serif text-lg text-emerald-200">
              Same Challenge For Everyone
            </h2>
            <p className="mb-6 text-center text-sm leading-relaxed text-amber-100/70">
              Hero, deck, enemy, difficulty, modifiers, and scoring are fixed. Your personal cards,
              upgrades, and progression are not used.
            </p>
            <button
              type="button"
              onClick={() => setShowFairnessInfo(false)}
              className="w-full rounded-lg border-2 border-emerald-400/50 bg-emerald-900/30 px-4 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-800/40"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}

      {showConfirm && createPortal(
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
        </div>,
        document.body
      )}
    </FixedViewportPage>
  );
}
