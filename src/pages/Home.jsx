import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swords, Pencil, Sun } from "lucide-react";
import { useGame } from "@/game/GameContext";
import DifficultySelect from "@/components/game/DifficultySelect";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import ResumeModal from "@/components/game/ResumeModal";
import CinematicIntro from "@/components/game/CinematicIntro";
import { HOME_ART, MENU_ART } from "@/data/art";
import { getSavedRoute } from "@/components/ScrollToTop";
import { validateDeck } from "@/game/deckRules";
import { sanitizePlayerName, needsPlayerName } from "@/game/nameValidator";
import { loadStoryRun } from "@/game/storyRunSave";
import * as Sound from "@/game/soundManager";

export default function Home() {
  const { profile, run, endRun, Sound: Snd, savedStoryExists, resumeStoryRun, storySaveError, showIntro, handleIntroComplete } = useGame();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const savedRunInfo = useMemo(() => {
    if (!savedStoryExists) return null;
    const saved = loadStoryRun();
    if (!saved) return null;
    const nodeType = saved.currentNode?.type;
    const roomType = nodeType === "mystery" ? saved.currentNode?.mysteryType : nodeType;
    const roomLabels = { battle: "Battle", treasure: "Treasure", divine: "Divine Encounter", story: "Story Choice", mystery: "Mystery", boss: "Boss Battle", rest: "Campfire" };
    return {
      stage: (saved.roomsCleared || 0) + 1,
      difficulty: saved.difficulty || "normal",
      playerHp: saved.playerHp || 0,
      maxHp: saved.maxHp || 0,
      heroName: saved.hero?.name || "Adam",
      roomLabel: roomLabels[roomType] || "Exploring",
    };
  }, [savedStoryExists]);

  useEffect(() => {
    Snd.playMusic("menu");
    if (run && getSavedRoute() === "/play") {
      setShowResume(true);
    }
  }, []);

  const handleBeginRun = () => {
    Sound.sfx.click();
    // Validate active deck before starting
    const deckCheck = validateDeck(profile.activeDeck);
    if (!deckCheck.valid) {
      navigate("/collection");
      return;
    }
    if (run || savedStoryExists) {
      setShowConfirm(true);
    } else {
      navigate("/play");
    }
  };

  const handleNameSaved = () => {
    setShowNamePrompt(false);
  };

  const handleConfirmNew = () => {
    endRun();
    setShowConfirm(false);
    navigate("/play");
  };

  const handleContinueSaved = () => {
    Sound.sfx.click();
    setShowConfirm(false);
    if (run) {
      navigate("/play");
    } else if (resumeStoryRun()) {
      navigate("/play");
    }
  };

  const handleResumeSavedRun = () => {
    Sound.sfx.click();
    if (resumeStoryRun()) {
      navigate("/play");
    }
  };

  const TOTAL_CARDS = 29;
  const TOTAL_ACHIEVEMENTS = 16;
  const devotionPrayedToday = profile.devotionReadDate === new Date().toISOString().slice(0, 10);
  const primaryItems = [
    { label: "Daily Battle", art: MENU_ART.daily, path: "/daily", desc: "One shared battle. Compete for the best score.", status: "New today" },
    { label: "Daily Prayer", art: HOME_ART.cross, path: "/daily-prayer", desc: "A short scripture and prayer for today.", status: devotionPrayedToday ? "✓ Prayed" : null },
    { label: "My Cards & Deck", art: MENU_ART.collection, path: "/collection", desc: "Build your deck and view collected cards", status: `${profile.collectedCards.length}/${TOTAL_CARDS}` },
    { label: "Leaderboard", art: MENU_ART.leaderboard, path: "/leaderboard", desc: "Compare scores with other players", status: null },
    { label: "Faith Progress", art: MENU_ART.progress, path: "/faith-progress", desc: "Track your Bible learning progress", status: null },
    { label: "My Progress", art: MENU_ART.progress, path: "/journey", desc: "Stats, streaks, and Bible learning", status: null },
  ];
  const secondaryItems = [
    { label: "Marketplace", art: MENU_ART.shop, path: "/shop", desc: "Buy card packs with earned gold.", status: `${profile.gold || 0} gold` },
    { label: "Progress Map", art: MENU_ART.progress, path: "/progress", desc: "Genesis to Revelation", status: "Genesis active" },
    { label: "Achievements", art: MENU_ART.achievements, path: "/achievements", desc: "Sacred milestones", status: `${profile.achievements.length}/${TOTAL_ACHIEVEMENTS}` },
    { label: "Settings", art: MENU_ART.settings, path: "/settings", desc: "Audio & player options", status: null },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-8 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
      {/* Floating particles */}
      {Array.from({ length: 18 }).map((_, i) => (
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

      {/* Hero / Title — compact */}
      <div className="relative text-center mb-5">
        <div className="flex justify-center mb-2">
          <img src={HOME_ART.cross} alt="Chronicles of Faith" className="w-14 h-14 object-cover rounded-full border-2 border-amber-400/30 shadow-lg shadow-amber-400/20 animate-icon-float" />
        </div>
        <h1 className="font-serif text-amber-200 tracking-wide leading-tight" style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          Chronicles of Faith
        </h1>
        <p className="text-amber-100/45 mt-1 font-serif italic tracking-wide" style={{ fontSize: "clamp(0.7rem, 1.5vw, 1rem)" }}>
          A Biblical Roguelike Journey
        </p>
        <div className="w-24 h-px mx-auto mt-2 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* Player name row — subtle guest-mode indicator or name display */}
      <button
        onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
        className="flex items-center gap-1.5 text-amber-100/50 hover:text-amber-200 transition text-xs lg:text-sm mb-3"
      >
        {needsPlayerName(profile.playerName) ? (
          <>
            <span className="text-amber-100/40">Playing as Guest Pilgrim</span>
          </>
        ) : (
          <>
            <span>Playing as: {sanitizePlayerName(profile.playerName)}</span>
          </>
        )}
        <Pencil className="w-3 h-3" />
      </button>

      {/* Difficulty selector — compact horizontal */}
      <div className="relative w-full max-w-md lg:max-w-[600px] mb-4 lg:mb-5">
        <DifficultySelect />
      </div>

      {/* Resume prompt */}
      {run && (
        <div className="relative w-full max-w-md lg:max-w-2xl mb-4 p-4 rounded-xl border-2 border-emerald-400/40 bg-emerald-900/20 animate-fade-in">
          <p className="text-emerald-200 font-serif text-sm text-center mb-3">Continue your Genesis run?</p>
          <div className="flex gap-3">
            <button
              onClick={() => { Sound.sfx.click(); navigate("/play"); }}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-600/20 text-emerald-100 font-bold text-sm hover:bg-emerald-600/40 transition"
            >
              Continue
            </button>
            <button
              onClick={() => { Sound.sfx.click(); setShowConfirm(true); }}
              className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-amber-900/20 text-amber-100/80 text-sm hover:bg-amber-800/30 transition"
            >
              Start New Run
            </button>
          </div>
        </div>
      )}

      {/* Continue Saved Run — shown when no active run in memory but a story save exists */}
      {!run && savedStoryExists && savedRunInfo && (
        <div className="relative w-full max-w-md lg:max-w-[600px] mb-3 animate-fade-in">
          <button
            onClick={handleResumeSavedRun}
            className="relative w-full px-8 py-4 lg:py-5 rounded-xl border-2 border-emerald-400/60 text-emerald-100 font-serif font-bold text-center hover:bg-emerald-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
            style={{ background: "linear-gradient(135deg, rgba(20,80,40,0.25) 0%, rgba(10,60,30,0.2) 100%)" }}
          >
            <span className="flex items-center justify-center gap-2">
              <Swords className="w-5 h-5" />
              Continue Genesis Run
            </span>
            <span className="block text-emerald-200/60 text-xs font-body font-normal mt-1">
              {savedRunInfo.heroName} • {savedRunInfo.difficulty ? savedRunInfo.difficulty.charAt(0).toUpperCase() + savedRunInfo.difficulty.slice(1) : "Normal"} • Stage {savedRunInfo.stage} • HP {savedRunInfo.playerHp}/{savedRunInfo.maxHp} • {savedRunInfo.roomLabel}
            </span>
          </button>
          <button
            onClick={() => { Sound.sfx.click(); setShowConfirm(true); }}
            className="relative w-full mt-2 px-8 py-2.5 rounded-xl border border-amber-400/30 text-amber-100/70 font-serif text-sm text-center hover:bg-amber-900/20 transition"
          >
            Start New Run
          </button>
        </div>
      )}

      {/* Story save corruption notice */}
      {storySaveError && !savedStoryExists && (
        <div className="w-full max-w-md mb-3 p-3 rounded-lg border border-red-500/30 bg-red-900/20 text-center animate-fade-in">
          <p className="text-red-200/80 text-xs">
            Saved run could not be restored. Please start a new run.
          </p>
        </div>
      )}

      {/* Play button — primary CTA */}
      <button
        onClick={handleBeginRun}
        className="relative w-full max-w-md lg:max-w-[600px] mb-6 px-8 py-4 lg:py-5 rounded-xl border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif font-bold text-center hover:bg-amber-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-500/20" style={{ fontSize: "clamp(1.1rem, 2vw, 1.75rem)" }}
        style={{ background: "linear-gradient(135deg, rgba(180,140,40,0.25) 0%, rgba(120,90,20,0.2) 100%)" }}
      >
        <span className="flex items-center justify-center gap-2">
          <Swords className="w-5 h-5" />
          Begin Genesis Run
        </span>
      </button>

      {/* Score guidance */}
      <p className="text-amber-100/30 text-[10px] text-center -mt-4 mb-4 max-w-md">
        Finish Genesis or complete the Daily Battle to post a score.
      </p>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }} onClick={() => setShowConfirm(false)}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-serif text-amber-200 text-center mb-3">Start a New Run?</h2>
            <p className="text-amber-100/60 text-sm text-center mb-6">This will replace your saved Genesis run.</p>
            <div className="space-y-3">
              <button
                onClick={handleContinueSaved}
                className="w-full px-4 py-2 rounded-lg border-2 border-emerald-400/50 bg-emerald-900/30 text-emerald-100 text-sm font-bold hover:bg-emerald-800/40 transition"
              >
                Continue Saved Run
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-amber-400/30 bg-slate-800/40 text-amber-100/70 text-sm hover:bg-slate-800/60 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmNew}
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-red-100 text-sm font-bold hover:bg-red-800/40 transition"
                >
                  Start New Run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary menu — four main tiles */}
      <div className="relative w-full max-w-md lg:max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-1.5 lg:gap-4">
        {primaryItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => Sound.sfx.click()}
            className="flex items-center gap-3 px-3 py-2 lg:px-6 lg:py-5 rounded-lg border border-amber-500/15 hover:border-amber-400/40 hover:bg-amber-500/5 hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 active:scale-[0.99] group"
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.45) 0%, rgba(15,26,48,0.45) 100%)" }}
          >
            <div className="flex-shrink-0 w-8 h-8 lg:w-14 lg:h-14 rounded-md overflow-hidden border border-amber-500/20 group-hover:border-amber-400/40 transition-colors">
              <img src={item.art} alt={item.label} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-amber-100 text-[13px] lg:text-lg leading-tight">{item.label}</div>
              <div className="text-amber-100/40 text-[10px] lg:text-sm leading-tight">{item.desc}</div>
            </div>
            {item.status && (
              <span className="flex-shrink-0 text-amber-300/60 text-[10px] lg:text-sm font-medium font-serif tracking-wide">
                {item.status}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Secondary menu — "More" section, visually subdued */}
      <div className="relative w-full max-w-md lg:max-w-[1100px] mt-4 lg:mt-6">
        <p className="text-amber-100/30 text-[10px] lg:text-xs uppercase tracking-widest font-serif text-center mb-2">More</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 lg:gap-2 opacity-70 hover:opacity-100 transition-opacity">
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => Sound.sfx.click()}
              className="flex items-center gap-2.5 px-3 py-1.5 lg:px-5 lg:py-3 rounded-lg border border-amber-500/10 hover:border-amber-400/30 hover:bg-amber-500/5 transition-all duration-200 active:scale-[0.99] group"
            >
              <div className="flex-shrink-0 w-6 h-6 lg:w-10 lg:h-10 rounded-md overflow-hidden border border-amber-500/15 group-hover:border-amber-400/30 transition-colors">
                <img src={item.art} alt={item.label} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-amber-100/80 text-[12px] lg:text-base leading-tight">{item.label}</div>
                <div className="text-amber-100/30 text-[9px] lg:text-sm leading-tight">{item.desc}</div>
              </div>
              {item.status && (
                <span className="flex-shrink-0 text-amber-300/50 text-[9px] lg:text-xs font-medium font-serif tracking-wide">
                  {item.status}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <p className="relative text-amber-100/40 text-[10px] mt-6 font-serif italic text-center max-w-md">
        "In the beginning, God created the heavens and the earth." — Genesis 1:1
      </p>

      {showNamePrompt && (
        <PlayerNamePrompt onSave={handleNameSaved} onCancel={() => setShowNamePrompt(false)} />
      )}

      {showIntro && (
        <CinematicIntro onComplete={handleIntroComplete} />
      )}

      {showResume && (
        <ResumeModal
          onResume={() => { setShowResume(false); navigate("/play"); }}
          onAbandon={() => { setShowResume(false); endRun(); }}
        />
      )}
    </div>
  );
}