import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swords, Pencil } from "lucide-react";
import { useGame } from "@/game/GameContext";
import DifficultySelect from "@/components/game/DifficultySelect";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import ResumeModal from "@/components/game/ResumeModal";
import { HOME_ART, MENU_ART } from "@/data/art";
import { getSavedRoute } from "@/components/ScrollToTop";
import * as Sound from "@/game/soundManager";

export default function Home() {
  const { profile, run, endRun, Sound: Snd } = useGame();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    Snd.playMusic("menu");
    if (run && getSavedRoute() === "/play") {
      setShowResume(true);
    }
    if (!profile.playerName && !localStorage.getItem("namePromptSeen")) {
      setShowNamePrompt(true);
    }
  }, []);

  const handleBeginRun = () => {
    Sound.sfx.click();
    if (!profile.playerName) {
      setPendingAction("run");
      setShowNamePrompt(true);
      return;
    }
    if (run) {
      setShowConfirm(true);
    } else {
      navigate("/play");
    }
  };

  const handleNameSaved = (name) => {
    setShowNamePrompt(false);
    localStorage.setItem("namePromptSeen", "true");
    if (pendingAction === "run") {
      setPendingAction(null);
      if (run) {
        setShowConfirm(true);
      } else {
        navigate("/play");
      }
    } else if (pendingAction === "daily") {
      setPendingAction(null);
      navigate("/daily");
    }
  };

  const handleConfirmNew = () => {
    endRun();
    setShowConfirm(false);
    navigate("/play");
  };

  const TOTAL_CARDS = 29;
  const TOTAL_ACHIEVEMENTS = 16;
  const menuItems = [
    { label: "My Collection", art: MENU_ART.collection, path: "/collection", desc: "Cards gathered", status: `${profile.collectedCards.length}/${TOTAL_CARDS}` },
    { label: "Marketplace", art: MENU_ART.shop, path: "/shop", desc: "Buy card packs & relics", status: `${profile.gold || 0} gold` },
    { label: "Progress Map", art: MENU_ART.progress, path: "/progress", desc: "Genesis to Revelation", status: "Genesis active" },
    { label: "Daily Challenge", art: MENU_ART.daily, path: "/daily", desc: "One daily battle", status: "New today" },
    { label: "Leaderboard", art: MENU_ART.leaderboard, path: "/leaderboard", desc: "Top scores", status: null },
    { label: "Achievements", art: MENU_ART.achievements, path: "/achievements", desc: "Sacred milestones", status: `${profile.achievements.length}/${TOTAL_ACHIEVEMENTS}` },
    { label: "Settings", art: MENU_ART.settings, path: "/settings", desc: "Audio & player options", status: null },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 lg:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 80%)" }}>
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

      {/* Player name row */}
      <button
        onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
        className="flex items-center gap-1.5 text-amber-100/60 hover:text-amber-200 transition text-sm mb-3"
      >
        <span>Player: {profile.playerName || "Anonymous Warrior"}</span>
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

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }} onClick={() => setShowConfirm(false)}>
          <div className="max-w-sm w-full rounded-2xl border-2 border-amber-500/30 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-serif text-amber-200 text-center mb-3">Abandon Current Run?</h2>
            <p className="text-amber-100/60 text-sm text-center mb-6">Starting a new run will abandon your current journey. Continue?</p>
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
                Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary menu — single column on mobile, two-column grid on desktop */}
      <div className="relative w-full max-w-md lg:max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-1.5 lg:gap-4 lg:px-0">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => Sound.sfx.click()}
            className="flex items-center gap-3 px-3 py-2 lg:px-5 lg:py-4 rounded-lg border border-amber-500/15 hover:border-amber-400/40 hover:bg-amber-500/5 hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 active:scale-[0.99] group"
            style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.45) 0%, rgba(15,26,48,0.45) 100%)" }}
          >
            <div className="flex-shrink-0 w-8 h-8 lg:w-12 lg:h-12 rounded-md overflow-hidden border border-amber-500/20 group-hover:border-amber-400/40 transition-colors">
              <img src={item.art} alt={item.label} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-amber-100 text-[13px] lg:text-base leading-tight">{item.label}</div>
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

      <p className="relative text-amber-100/40 text-[10px] mt-6 font-serif italic text-center max-w-md">
        "In the beginning, God created the heavens and the earth." — Genesis 1:1
      </p>

      {showNamePrompt && (
        <PlayerNamePrompt onSave={handleNameSaved} onCancel={() => { setShowNamePrompt(false); localStorage.setItem("namePromptSeen", "true"); }} />
      )}

      {showResume && (
        <ResumeModal
          onResume={() => { setShowResume(false); navigate("/play"); }}
          onAbandon={() => { setShowResume(false); endRun(); if (!profile.playerName && !localStorage.getItem("namePromptSeen")) setShowNamePrompt(true); }}
        />
      )}
    </div>
  );
}