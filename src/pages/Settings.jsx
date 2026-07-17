import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Volume2, VolumeX, Mic, Type, Settings as SettingsIcon, GraduationCap, Play, Pencil, Cloud, User, Film } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/lib/AuthContext";
import * as Sound from "@/game/soundManager";
import PlayerNamePrompt from "@/components/game/PlayerNamePrompt";
import CloudSaveComingSoon from "@/components/game/CloudSaveComingSoon";
import { syncProfileToCloud } from "@/game/cloudSync";
import { sanitizePlayerName } from "@/game/nameValidator";

export default function Settings() {
  const { profile, saveProfile, Sound: Snd, triggerIntroReplay } = useGame();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); 
  const [expandedSection, setExpandedSection] = useState("player");

  useEffect(() => { Snd.playMusic("menu"); }, []);

  const handleReplayIntro = () => {
    Sound.sfx.click();
    triggerIntroReplay();
    navigate("/");
  };

  const handleSignIn = () => {
    Sound.sfx.click();
    setShowCloudModal(true);
  };

  const handleSyncNow = async () => {
    Sound.sfx.click();
    setSyncing(true);
    setSyncResult(null);
    const success = await syncProfileToCloud(profile);
    setSyncResult(success ? "synced" : "error");
    setSyncing(false);
  };

  const toggleMusic = () => {
    const newVal = !profile.settings.music;
    saveProfile({ settings: { ...profile.settings, music: newVal } });
    Sound.sfx.click(); // unlock audio (user gesture) before starting music
    if (newVal) Sound.playMusic("menu");
  };

  const toggleSfx = () => {
    const newVal = !profile.settings.sfx;
    saveProfile({ settings: { ...profile.settings, sfx: newVal } });
    if (newVal) Sound.sfx.click();
  };

  const toggleNarration = () => {
    const newVal = !profile.settings.narration;
    saveProfile({ settings: { ...profile.settings, narration: newVal } });
    Sound.sfx.click();
  };

  const handleMusicVolume = (vol) => {
    saveProfile({ settings: { ...profile.settings, musicVolume: vol } });
  };
  const handleSfxVolume = (vol) => {
    saveProfile({ settings: { ...profile.settings, sfxVolume: vol } });
  };
  const handleNarrationVolume = (vol) => {
    saveProfile({ settings: { ...profile.settings, narrationVolume: vol } });
  };

  const setEnemyAnimation = (mode) => {
    saveProfile({ settings: { ...profile.settings, enemyAnimation: mode } });
    Sound.sfx.click();
  };

  const enemyAnim = profile.settings.enemyAnimation || "step";

  const setGuidanceLevel = (level) => {
    saveProfile({ settings: { ...profile.settings, guidanceLevel: level, guidanceTips: level === "guided" } });
    Sound.sfx.click();
  };

  const guidanceLevel = profile.settings.guidanceLevel || "normal";

const SettingsSection = ({
  id,
  title,
  children,
  expandedSection,
  setExpandedSection,
}) => {
  const open = expandedSection === id;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpandedSection(open ? "" : id)}
        className="w-full flex items-center justify-between px-1"
      >
        <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest">
          {title}
        </h2>

        <span
          className={`text-amber-300 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

  const previewVoice = () => {
    Sound.sfx.click();
    // Preview includes a raw scripture reference so the user hears how
    // citations are verbalized: "Genesis 1:1-3" → "Genesis chapter 1, verses 1 through 3"
    Sound.speakNarration(
      "In the beginning, God created the heavens and the earth. Genesis 1:1-3.",
      (profile.settings.narrationVolume ?? 50) / 100,
      profile.settings.narrationVoice
    );
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-6 w-full max-w-md lg:max-w-3xl">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <h1 className="text-3xl font-serif text-amber-200">Settings</h1>
        <div className="w-16" />
      </div>

      <div className="max-w-md lg:max-w-3xl w-full space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
               {/* === PLAYER SECTION === */}
<SettingsSection
  id="player"
  title="Player"
  expandedSection={expandedSection}
  setExpandedSection={setExpandedSection}
>
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-amber-300/70" />
              <div>
                <p className="font-serif text-amber-100 text-sm">Player Name</p>
                <p className="text-amber-100/40 text-[10px]">Shown on the leaderboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sanitizePlayerName(profile.playerName)}
                readOnly
                placeholder="Enter your name"
                className="flex-1 px-4 py-2 rounded-lg bg-slate-900/60 border border-amber-500/20 text-amber-100 outline-none focus:border-amber-400/50"
              />
              <button
                onClick={() => { Sound.sfx.click(); setShowNamePrompt(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-900/20 text-amber-100 text-sm hover:bg-amber-900/40 transition"
              >
                <Pencil className="w-3.5 h-3.5" /> Change Name
              </button>
            </div>
                    </div>
</SettingsSection>

         {/* === AUDIO SECTION === */}
<SettingsSection
  id="audio"
  title="Audio"
  expandedSection={expandedSection}
  setExpandedSection={setExpandedSection}
>

          {/* Music */}
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-300/70" />
                <span className="font-serif text-amber-100 text-sm">Music</span>
              </div>
              <button
                onClick={toggleMusic}
                className={`w-14 h-7 rounded-full transition relative ${profile.settings.music ? "bg-amber-500/40" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${profile.settings.music ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
            </div>
            {profile.settings.music && (
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100"
                  value={profile.settings.musicVolume ?? 50}
                  onChange={(e) => handleMusicVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-amber-300/60 text-xs w-8 text-right">{profile.settings.musicVolume ?? 50}%</span>
              </div>
            )}
          </div>

          {/* Sound Effects */}
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-300/70" />
                <span className="font-serif text-amber-100 text-sm">Sound Effects</span>
              </div>
              <button
                onClick={toggleSfx}
                className={`w-14 h-7 rounded-full transition relative ${profile.settings.sfx ? "bg-amber-500/40" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${profile.settings.sfx ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
            </div>
            {profile.settings.sfx && (
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100"
                  value={profile.settings.sfxVolume ?? 50}
                  onChange={(e) => handleSfxVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-amber-300/60 text-xs w-8 text-right">{profile.settings.sfxVolume ?? 50}%</span>
              </div>
            )}
          </div>

          {/* Voice Narration */}
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-300/70" />
                <div>
                  <span className="font-serif text-amber-100 text-sm">Voice Narration</span>
                  <p className="text-amber-100/40 text-[10px]">Reads scripture passages aloud</p>
                </div>
              </div>
              <button
                onClick={toggleNarration}
                className={`w-14 h-7 rounded-full transition relative ${profile.settings.narration ? "bg-amber-500/40" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${profile.settings.narration ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
            </div>
            {profile.settings.narration && (
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100"
                  value={profile.settings.narrationVolume ?? 50}
                  onChange={(e) => handleNarrationVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-amber-300/60 text-xs w-8 text-right">{profile.settings.narrationVolume ?? 50}%</span>
              </div>
            )}
            {profile.settings.narration && (
              <>
                <div className="mt-3">
                  <p className="text-amber-100/50 text-[10px] mb-2">Narrator Voice</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: "male", label: "Warm Male" },
                      { value: "female", label: "Warm Female" },
                      { value: "system", label: "System Voice" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { saveProfile({ settings: { ...profile.settings, narrationVoice: opt.value } }); Sound.sfx.click(); }}
                        className={`px-1 py-1.5 rounded-lg border text-[10px] font-medium transition ${
                          (profile.settings.narrationVoice || "system") === opt.value
                            ? "border-amber-400/60 bg-amber-600/20 text-amber-100"
                            : "border-amber-500/15 bg-slate-900/40 text-amber-100/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={previewVoice}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-amber-400/30 bg-amber-900/20 text-amber-200 text-xs font-medium hover:bg-amber-800/30 transition"
                >
                  <Play className="w-3 h-3" />
                  Preview Voice
                </button>
                <p className="text-amber-100/30 text-[9px] mt-1.5 text-center italic">Scripture references are read as "Genesis chapter 3, verse 1"</p>
              </>
            )}
          </div>
        </SettingsSection>

        {/* === BATTLE SECTION === */}
        <div className="space-y-3 lg:self-start">
          <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest px-1">Battle</h2>
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <p className="font-serif text-amber-100 text-sm mb-1">Enemy Turn Animation</p>
            <p className="text-amber-100/40 text-[10px] mb-3">How enemy actions are displayed</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "step", label: "Step-by-Step" },
                { value: "fast", label: "Fast" },
                { value: "skip", label: "Skip" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEnemyAnimation(opt.value)}
                  className={`px-2 py-2 rounded-lg border-2 text-[11px] font-medium transition ${
                    enemyAnim === opt.value
                      ? "border-amber-400/60 bg-amber-600/20 text-amber-100"
                      : "border-amber-500/15 bg-slate-900/40 text-amber-100/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guidance Level */}
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-amber-300/70" />
              <span className="font-serif text-amber-100 text-sm">Guidance Level</span>
            </div>
            <p className="text-amber-100/40 text-[10px] mb-3">How much help you receive during play</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "guided", label: "Guided", desc: "Hints & explanations" },
                { value: "normal", label: "Normal", desc: "Some clarity" },
                { value: "expert", label: "Expert", desc: "Less hand-holding" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGuidanceLevel(opt.value)}
                  className={`px-2 py-2 rounded-lg border-2 text-[11px] font-medium transition ${
                    guidanceLevel === opt.value
                      ? "border-amber-400/60 bg-amber-600/20 text-amber-100"
                      : "border-amber-500/15 bg-slate-900/40 text-amber-100/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-amber-100/40 text-[10px] mt-2 italic">
              {guidanceLevel === "guided" && "Shows enemy values and helpful hints."}
              {guidanceLevel === "normal" && "Shows enemy values with fewer hints."}
              {guidanceLevel === "expert" && "Hides exact enemy values for a harder challenge."}
            </p>
          </div>
        </div>



        {/* === TUTORIAL SECTION === */}
        <div className="space-y-3">
          <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest px-1">Tutorial</h2>
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-300/70" />
                <div>
                  <span className="font-serif text-amber-100 text-sm">Show Tutorial</span>
                  <p className="text-amber-100/40 text-[10px]">Display the battle tutorial on your next run</p>
                </div>
              </div>
              <button
                onClick={() => { saveProfile({ tutorialSeen: !profile.tutorialSeen }); Sound.sfx.click(); }}
                className={`w-14 h-7 rounded-full transition relative ${!profile.tutorialSeen ? "bg-amber-500/40" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-amber-200 transition-transform ${!profile.tutorialSeen ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* === STORY SECTION === */}
        <div className="space-y-3">
          <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest px-1">Story</h2>
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-300/70" />
                <div>
                  <span className="font-serif text-amber-100 text-sm">Replay Opening Story</span>
                  <p className="text-amber-100/40 text-[10px]">Watch the Genesis intro again</p>
                </div>
              </div>
              <button
                onClick={handleReplayIntro}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-900/20 text-amber-100 text-sm hover:bg-amber-900/40 transition"
              >
                <Play className="w-3.5 h-3.5" /> Replay
              </button>
            </div>
          </div>
        </div>

        {/* === ACCOUNT SECTION === */}
        <div className="space-y-3">
          <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest px-1">Account / Cloud Save</h2>
          <div className="p-4 rounded-xl border-2 border-amber-500/15" style={{ background: "rgba(15,26,48,0.6)" }}>
            {isAuthenticated ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="w-4 h-4 text-emerald-400/70" />
                  <div>
                    <p className="font-serif text-amber-100 text-sm">Signed In</p>
                    <p className="text-amber-100/40 text-[10px]">{user?.email || "Account connected"}</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-400/40 bg-emerald-900/20 text-emerald-200 text-sm hover:bg-emerald-800/30 transition disabled:opacity-40"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                {syncResult === "synced" && (
                  <p className="text-emerald-300 text-xs text-center mt-2">Progress synced to cloud.</p>
                )}
                {syncResult === "error" && (
                  <p className="text-red-300 text-xs text-center mt-2">Sync failed. Try again.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-amber-300/70" />
                  <div>
                    <p className="font-serif text-amber-100 text-sm">Playing locally</p>
                    <p className="text-amber-100/40 text-[10px]">Progress saved on this device</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-500/15 bg-slate-900/40">
                    <span className="text-amber-100/50 text-[10px] uppercase tracking-wide">Leaderboard name</span>
                    <span className="text-amber-100 text-xs font-medium">{sanitizePlayerName(profile.playerName)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-500/15 bg-slate-900/40">
                    <span className="text-amber-100/50 text-[10px] uppercase tracking-wide">Local account</span>
                    <span className="text-amber-100/60 text-xs font-medium">Guest device</span>
                  </div>
                </div>

                <p className="text-amber-100/50 text-[10px] mb-3 leading-relaxed">
                  Your progress is saved on this device. Leaderboard scores are shared online,
                  but cards, streaks, and story progress are not synced across devices yet.
                </p>
                <button
                  onClick={handleSignIn}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-600/20 text-amber-100 text-sm font-bold hover:bg-amber-600/40 transition"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  Cloud Save Coming Soon
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About */}
<div className="space-y-3 lg:col-span-2">
  <h2 className="text-amber-300/70 font-serif text-xs uppercase tracking-widest px-1">
    About
  </h2>

  <Link
    to="/about"
    onClick={() => Sound.sfx.click()}
    className="block p-4 rounded-xl border-2 border-amber-500/20 hover:border-amber-400/45 hover:bg-amber-500/5 transition"
    style={{ background: "rgba(15,26,48,0.5)" }}
  >
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-serif text-amber-100 text-sm">
          About Chronicles of Faith
        </p>
        <p className="text-amber-100/40 text-[10px] mt-1">
          Learn about the game, its mission, and its development.
        </p>
      </div>

      <span className="text-amber-300/60 text-lg">›</span>
    </div>
  </Link>
  
  <Link
  to="/contact"
  onClick={() => Sound.sfx.click()}
  className="block p-4 rounded-xl border-2 border-amber-500/20 hover:border-amber-400/45 hover:bg-amber-500/5 transition"
  style={{ background: "rgba(15,26,48,0.5)" }}
>
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="font-serif text-amber-100 text-sm">
        Contact & Feedback
      </p>

      <p className="text-amber-100/40 text-[10px] mt-1">
        Report bugs, suggest ideas, or send Bible accuracy feedback.
      </p>
    </div>

    <span className="text-amber-300/60 text-lg">›</span>
  </div>
</Link>

<Link
  to="/special-thanks"
  onClick={() => Sound.sfx.click()}
  className="block p-4 rounded-xl border-2 border-amber-500/20 hover:border-amber-400/45 hover:bg-amber-500/5 transition"
  style={{ background: "rgba(15,26,48,0.5)" }}
>
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="font-serif text-amber-100 text-sm">
        Special Thanks
      </p>

      <p className="text-amber-100/40 text-[10px] mt-1">
        Recognizing testers and supporters who helped improve the game.
      </p>
    </div>

    <span className="text-amber-300/60 text-lg">›</span>
  </div>
</Link>

  <div
    className="p-4 rounded-xl border border-amber-500/10"
    style={{ background: "rgba(15,26,48,0.35)" }}
  >
    <p className="text-amber-100/50 text-xs text-center font-serif italic">
      Chronicles of Faith — A Biblical Roguelike
      <br />
      Version 1.0 — Genesis
    </p>
  </div>
</div>
      </div>

      {showNamePrompt && (
        <PlayerNamePrompt
          onSave={() => setShowNamePrompt(false)}
          onCancel={() => setShowNamePrompt(false)}
          endOfRun
        />
      )}

      {showCloudModal && (
        <CloudSaveComingSoon onClose={() => setShowCloudModal(false)} />
      )}
    </div>
  );
}