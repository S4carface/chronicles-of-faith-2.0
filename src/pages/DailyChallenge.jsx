import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Check, Flame, Crown, Coins, Sparkles, Heart, User, Zap, ListChecks, Trophy } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getDailyChallenge } from "@/data/dailyChallenge";
import { getCardById } from "@/data/cards";
import { MENU_ART, ENEMY_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function DailyChallenge() {
  const { profile, run, startDailyBattle, Sound: Snd } = useGame();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const daily = getDailyChallenge();
  const todayStr = daily.date;
  const battleCompletedToday = profile.lastDailyDate === todayStr;
  const hasActiveDaily = run?.isDaily && run.phase === "battle";

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
      className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-28 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)",
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (        <div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `rgba(201,168,76,${0.2 + Math.random() * 0.3})`,
          animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}

      <div className="relative w-full max-w-md lg:max-w-2xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ background: "rgba(201,168,76,0.2)" }} />
            <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-amber-400/40 animate-icon-float" style={{ background: "#0F1A30" }}>
              <img src={MENU_ART.daily} alt="Daily Challenge" className="art-portrait" />
            </div>
          </div>
        </div>

        <p className="text-amber-300/60 text-xs lg:text-sm uppercase tracking-widest mb-2">Daily Battle</p>
        <h1 className="font-serif text-amber-200 mb-2" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>{daily.theme.title}</h1>
        <p className="text-amber-100/50 text-xs lg:text-sm mb-4 lg:mb-6 italic">{daily.theme.verse}</p>

        {/* ===== DAILY BATTLE ===== */}
        <div className="rounded-xl border-2 border-amber-500/20 p-4 lg:p-6 mb-4 lg:mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-amber-300/60" />
            <h3 className="font-serif text-amber-200 text-base lg:text-lg">Daily Battle</h3>
          </div>

          <div className="mb-4 lg:mb-6 rounded-lg border border-emerald-400/20 bg-emerald-900/10 px-3 py-3">
  <p className="text-emerald-200/90 text-xs lg:text-sm font-semibold">
    Equal Challenge
  </p>

  <p className="mt-1 text-amber-100/55 text-[10px] lg:text-xs">
    Every player uses today&apos;s fixed hero, deck, enemy, difficulty, and special rule.
    Your custom deck, unlocked cards, upgrades, and progression are never used —
    everyone faces the exact same battle.
  </p>
</div>

          {/* Difficulty display */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Today's Difficulty:</span>
            <span className={`font-serif font-bold text-sm lg:text-base ${daily.difficulty === "easy" ? "text-emerald-300" : daily.difficulty === "normal" ? "text-amber-200" : "text-red-300"}`}>{daily.difficultyLabel}</span>
          </div>
          <p className="text-amber-100/50 text-[10px] lg:text-xs mb-4 lg:mb-6 italic">{daily.difficultyDesc}</p>

          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-blue-500/30 bg-blue-900/20 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-300" />
              </div>
              <div className="min-w-0">
                <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Today's Hero</p>
                <p className="font-serif text-amber-100 text-sm lg:text-base">{daily.hero.name} — {daily.hero.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-red-500/30 bg-red-900/20 flex items-center justify-center gap-0">
                <Heart className="w-6 h-6 text-red-300" />
              </div>
              <div className="min-w-0">
                <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Starting HP &amp; Faith</p>
                <p className="font-serif text-amber-100 text-sm lg:text-base flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-300" />{daily.maxHp} HP</span>
                  <span className="inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-300" />{startingFaith} Faith</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden border border-red-900/50" style={{ background: "#0F1A30" }}>
                {enemyArt ? (
                  <img src={enemyArt} alt={daily.enemy.name} className="art-portrait" />
                ) : (
                  <span className="text-3xl">{daily.enemy.icon}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Today's Enemy</p>
                <p className="font-serif text-amber-100 text-sm lg:text-base">{daily.enemy.name}</p>
                {daily.enemy.isBoss && <span className="text-red-400 text-[9px] lg:text-xs font-bold">BOSS</span>}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-purple-500/30 bg-purple-900/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
              <div className="min-w-0">
                <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Special Rule</p>
                <p className="font-serif text-purple-200 text-sm lg:text-base">{daily.rule.name}</p>
                <p className="text-amber-100/50 text-[10px] lg:text-xs">{daily.rule.description}</p>
              </div>
            </div>

<div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-900/10">
  <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-emerald-500/30 bg-emerald-900/20 flex items-center justify-center">
    <span className="text-2xl">🃏</span>
  </div>

  <div className="min-w-0 flex-1">
    <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">
      Today&apos;s Fixed Deck — {daily.deck.length} Cards
    </p>

    <p className="text-amber-100/50 text-[10px] lg:text-xs mb-1.5">
      Identical for every player. Your unlocked cards are not used.
    </p>

    <div className="flex flex-wrap gap-1.5">
      {deckPreview.map((card) => (
        <span
          key={card.id}
          className="text-[10px] lg:text-xs px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-900/20 text-emerald-200/90"
        >
          {card.count > 1 ? `${card.count}× ` : ""}{card.name}
        </span>
      ))}
    </div>
  </div>
</div>

<div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
  <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-amber-500/30 bg-amber-900/20 flex items-center justify-center">
    <Coins className="w-6 h-6 text-amber-300" />
  </div>

  <div className="min-w-0">
    <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">
      Today&apos;s Reward
    </p>

    <p className="font-serif text-amber-100 text-sm lg:text-base">
      {daily.reward.gold} Gold
    </p>
  </div>
</div>
          </div>

          {/* Streak & Status row */}
          <div className="flex items-center justify-around text-center mt-4 pt-4 border-t border-amber-500/10">
            <div>
              <div className="flex justify-center mb-1">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-xl lg:text-2xl font-bold text-amber-200">{profile.dailyStreak}</p>
              <p className="text-amber-100/50 text-[10px] lg:text-xs">Battle Streak</p>
            </div>
            <div className="w-px h-10 bg-amber-500/20" />
            <div>
              <div className="flex justify-center mb-1">
                <Heart className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xl lg:text-2xl font-bold text-emerald-200">{profile.devotionStreak || 0}</p>
              <p className="text-amber-100/50 text-[10px] lg:text-xs">Prayer Streak</p>
            </div>
            <div className="w-px h-10 bg-amber-500/20" />
            <div>
              <div className="flex justify-center mb-1">
                {battleCompletedToday
                  ? <Check className="w-5 h-5 text-emerald-400" />
                  : <Crown className="w-5 h-5 text-amber-300/50" />
                }
              </div>
              <p className={`text-sm lg:text-base font-bold ${battleCompletedToday ? "text-emerald-300" : "text-amber-100/50"}`}>
                {battleCompletedToday ? "Completed" : "Not Done"}
              </p>
              <p className="text-amber-100/50 text-[10px] lg:text-xs">Today's Status</p>
            </div>
          </div>
        </div>

        {/* Scoring rules */}
        <div className="rounded-xl border-2 border-amber-500/20 p-4 lg:p-6 mb-4 lg:mb-6 text-left" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-amber-300/60" />
            <h3 className="font-serif text-amber-200 text-base lg:text-lg">Scoring Rules</h3>
          </div>
          <div className="space-y-1.5 text-xs lg:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Victory</span>
              <span className="text-amber-100 font-medium">+500</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">HP remaining</span>
              <span className="text-amber-100 font-medium">+10 per HP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Turns used</span>
              <span className="text-red-300/80 font-medium">-25 per turn</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Correct trivia</span>
              <span className="text-amber-100 font-medium">+100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Perfect battle (no HP lost)</span>
              <span className="text-amber-100 font-medium">+100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Cards played</span>
              <span className="text-amber-100/50 font-medium">0 points</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100/60">Defeat</span>
              <span className="text-amber-100/50 font-medium">0</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-start gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-300/60 flex-shrink-0 mt-0.5" />
            <p className="text-amber-100/50 text-[10px] lg:text-xs">
              Only your best score for today is kept on the Daily leaderboard — replaying with a
              lower score never overwrites it.
            </p>
          </div>
        </div>

        {battleCompletedToday && !hasActiveDaily && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-900/10 text-center">
            <p className="text-emerald-300/80 text-xs lg:text-sm">✓ Completed Today — Replay to beat your best score!</p>
          </div>
        )}

        {/* Single primary battle button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 lg:px-12 lg:py-4 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg lg:text-2xl hover:bg-amber-600/40 transition active:scale-95 disabled:opacity-50"
        >
          <Swords className="w-5 h-5" />
          {loading ? "Starting..." : hasActiveDaily ? "Continue Daily Battle" : "Start Daily Battle"}
        </button>

        <p className="text-amber-100/40 text-[10px] lg:text-xs mt-6 lg:mt-8 font-serif italic">
          "His mercies are new every morning." — Lamentations 3:23
        </p>
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