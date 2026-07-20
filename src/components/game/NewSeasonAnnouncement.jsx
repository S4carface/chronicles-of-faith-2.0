import React, { useEffect, useState } from "react";
import { useGame } from "@/game/GameContext";
import { getActiveSeason, hasAcknowledgedSeason, acknowledgeSeason } from "@/game/seasonManager";
import * as Sound from "@/game/soundManager";

// One-time, per-device, per-season notice. Shown at most once for a given
// seasonId — the acknowledgment is stored in localStorage keyed by season,
// so a future season change shows the notice again automatically.
export default function NewSeasonAnnouncement() {
  const { profile } = useGame();
  const [season, setSeason] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Nothing to announce to a player who hasn't finished onboarding yet —
    // they have no prior season's scores to contrast this against.
    if (!profile?.tutorialSeen) return;

    let active = true;
    getActiveSeason()
      .then((activeSeason) => {
        if (!active) return;
        if (!hasAcknowledgedSeason(activeSeason.id)) {
          setSeason(activeSeason);
          setVisible(true);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [profile?.tutorialSeen]);

  if (!visible || !season) return null;

  const handleEnter = () => {
    Sound.sfx.click();
    acknowledgeSeason(season.id);
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(8,12,24,0.95)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-season-title"
        className="w-full max-w-sm rounded-2xl border-2 border-amber-400/40 p-6 text-center"
        style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}
      >
        <h2 id="new-season-title" className="mb-2 font-serif text-xl text-amber-200">
          A New Season Has Begun
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-amber-100/70">
          Scores were refreshed following major gameplay and balance updates. Previous records
          remain available in Legacy Records.
        </p>
        <button
          onClick={handleEnter}
          className="min-h-11 w-full rounded-lg border-2 border-amber-400/60 bg-amber-600/20 font-serif font-bold text-amber-100 transition hover:bg-amber-600/40"
        >
          Enter New Season
        </button>
      </div>
    </div>
  );
}
