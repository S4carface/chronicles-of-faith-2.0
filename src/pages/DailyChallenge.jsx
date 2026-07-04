import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Check, Flame, Crown, Coins, Sparkles, Sun } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getDailyChallenge } from "@/data/dailyChallenge";
import { MENU_ART, ENEMY_ART } from "@/data/art";
import { validateDeck } from "@/game/deckRules";
import DailyDevotion from "@/components/game/DailyDevotion";
import { recordVerseRead, recordDevotionRead } from "@/game/playerStats";
import * as Sound from "@/game/soundManager";

export default function DailyChallenge() {
  const { profile, saveProfile, run, startDailyBattle, Sound: Snd } = useGame();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const devotionTracked = useRef(false);

  const daily = getDailyChallenge();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const battleCompletedToday = profile.lastDailyDate === todayStr;
  const devotionReadToday = profile.devotionReadDate === todayStr;
  const hasActiveDaily = run?.isDaily && run.phase === "battle";

  useEffect(() => { Snd.playMusic("menu"); }, []);

  // Mark devotion as read when the page loads (devotion is visible by default)
  useEffect(() => {
    if (devotionTracked.current) return;
    devotionTracked.current = true;
    recordVerseRead();
    if (!devotionReadToday) {
      const newStreak = profile.devotionReadDate === yesterday ? (profile.devotionStreak || 0) + 1 : 1;
      saveProfile({ devotionReadDate: todayStr, devotionStreak: newStreak });
      recordDevotionRead(newStreak);
    }
  }, []);

  const beginDaily = () => {
    setLoading(true);
    setTimeout(() => {
      startDailyBattle(daily);
      navigate("/play");
    }, 300);
  };

  const handleStart = () => {
    Sound.sfx.click();
    const deckCheck = validateDeck(profile.activeDeck);
    if (!deckCheck.valid) {
      navigate("/collection");
      return;
    }
    if (run && !run.isDaily) {
      setShowConfirm(true);
      return;
    }
    if (hasActiveDaily) {
      navigate("/play");
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
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-10">
        <button onClick={() => { Sound.sfx.click(); navigate("/"); }} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</button>
      </div>

      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="absolute pointer-events-none rounded-full" style={{
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
            <img src={MENU_ART.daily} alt="Daily Challenge" className="relative w-16 h-16 lg:w-20 lg:h-20 object-cover rounded-full border-2 border-amber-400/40 animate-icon-float" />
          </div>
        </div>

        <p className="text-amber-300/60 text-xs lg:text-sm uppercase tracking-widest mb-2">Daily Challenge</p>
        <h1 className="font-serif text-amber-200 mb-2" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>{daily.theme.title}</h1>
        <p className="text-amber-100/50 text-xs lg:text-sm mb-4 lg:mb-6 italic">{daily.theme.verse}</p>

        {/* ===== SECTION 1: DAILY DEVOTION ===== */}
        <DailyDevotion />

        {/* Divider */}
        <div className="w-full max-w-xs mx-auto my-4 lg:my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/30" />
        </div>

        {/* ===== SECTION 2: DAILY BATTLE ===== */}
        <div className="rounded-xl border-2 border-amber-500/20 p-4 lg:p-6 mb-4 lg:mb-6" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-amber-300/60" />
            <h3 className="font-serif text-amber-200 text-base lg:text-lg">Daily Battle</h3>
          </div>

          <p className="text-amber-100/50 text-[10px] lg:text-xs mb-4 lg:mb-6 italic">
            One shared battle per day — same for everyone.
          </p>

          {/* Difficulty display */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Today's Difficulty:</span>
            <span className={`font-serif font-bold text-sm lg:text-base ${daily.difficulty === "easy" ? "text-emerald-300" : daily.difficulty === "normal" ? "text-amber-200" : "text-red-300"}`}>{daily.difficultyLabel}</span>
          </div>
          <p className="text-amber-100/50 text-[10px] lg:text-xs mb-4 lg:mb-6 italic">{daily.difficultyDesc}</p>

          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0">
                {enemyArt ? (
                  <img src={enemyArt} alt={daily.enemy.name} className="w-12 h-12 lg:w-14 lg:h-14 object-cover rounded-lg border border-red-900/50" />
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

            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-slate-900/30">
              <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg border border-amber-500/30 bg-amber-900/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-amber-100/50 text-[10px] lg:text-xs uppercase tracking-wide">Today's Reward</p>
                <p className="font-serif text-amber-100 text-sm lg:text-base">{daily.reward.gold} Gold</p>
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
              <p className="text-amber-100/50 text-[10px] lg:text-xs">Daily Battle Streak</p>
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

        {/* Devotion status indicator */}
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] lg:text-xs">
          <Sun className="w-3 h-3 text-amber-300/50" />
          <span className={devotionReadToday ? "text-emerald-300/70" : "text-amber-100/40"}>
            Devotion {devotionReadToday ? "✓ Read Today" : "Not Read Today"}
          </span>
          <span className="text-amber-100/30">·</span>
          <span className="text-amber-100/40">Devotion Streak: {profile.devotionStreak || 0}</span>
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