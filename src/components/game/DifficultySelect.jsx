import React, { useState } from "react";
import { Lock } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { DIFFICULTY_PRESETS } from "@/game/mapGenerator";
import { HOME_ART } from "@/data/art";
import SafeImage from "@/components/ui/SafeImage";
import * as Sound from "@/game/soundManager";
import { isDifficultyUnlocked, getUnlockRequirement, resolveSelectableDifficulty } from "@/game/difficultyAccess";

// Rule text as two short, fixed lines per difficulty. Splitting the old
// single string ("Retry: 75% HP. −5% score per retry.") into two lines is a
// presentation change only — the underlying values (75% HP, −5%, 50%,
// −15%, one life) are unchanged. Two lines is deliberate and constant
// across all three difficulties so the selected-difficulty detail panel
// always renders the SAME number of text lines: switching Easy/Normal/Hard
// can never change the panel's height and therefore can never shift the
// Start Journey button below it.
const DIFFICULTY_RULES = {
  easy: {
    lines: ["Retry at 75% HP.", "−5% score per retry."],
    panelClass: "border-emerald-400/25 bg-emerald-950/20",
    textClass: "text-emerald-100/80",
  },

  normal: {
    lines: ["Checkpoint at 50% HP.", "−15% score per retry."],
    panelClass: "border-amber-400/25 bg-amber-950/20",
    textClass: "text-amber-100/80",
  },

  hard: {
    lines: ["One life.", "Defeat ends the run."],
    panelClass: "border-red-400/40 bg-red-950/25",
    textClass: "text-red-100/90",
  },
};

export default function DifficultySelect({ compact = false }) {
  const { profile, saveProfile } = useGame();
  const [lockedHint, setLockedHint] = useState(null);

  // The active difficulty is always one that's actually unlocked — a locked mode
  // can never appear selected.
  const current = resolveSelectableDifficulty(
    DIFFICULTY_PRESETS[profile.difficulty] ? profile.difficulty : "easy",
    profile
  );

  const currentPreset = DIFFICULTY_PRESETS[current];
  const currentRule = DIFFICULTY_RULES[current];

  const artMap = {
    easy: HOME_ART.difficulty_easy,
    normal: HOME_ART.difficulty_normal,
    hard: HOME_ART.difficulty_hard,
  };

  const handleSelect = (key) => {
    // Locked modes are never selectable — tapping shows a concise requirement.
    if (!isDifficultyUnlocked(key, profile)) {
      Sound.sfx.click();
      setLockedHint({ key, text: getUnlockRequirement(key) });
      return;
    }

    setLockedHint(null);
    if (key === current) return;

    Sound.sfx.click();

    const guidanceMap = {
      easy: "guided",
      normal: "normal",
      hard: "expert",
    };

    saveProfile({
      difficulty: key,

      settings: {
        ...profile.settings,
        guidanceTips: key === "easy",
        guidanceLevel: guidanceMap[key],
      },
    });
  };

  // Compact mode (post-tutorial Home dashboard): a horizontal Easy/Normal/
  // Hard selector (small circular artwork beside the label — never stacked
  // above it) followed by a fixed-height selected-difficulty detail panel
  // whose artwork is noticeably larger. The panel always renders the same
  // line count for every difficulty (see DIFFICULTY_RULES), so tapping a
  // different option updates its contents immediately without changing its
  // height — keeping the Start Journey button below perfectly stable.
  if (compact) {
    return (
      <div className="mx-auto w-full max-w-md">
        {/* Horizontal selector — [icon Easy] [icon Normal] [icon Hard], one
            row, no wrapping, no stacked icon-over-label. Locked modes stay
            visible with a lock icon and a tap-to-reveal requirement tooltip. */}
        <div className="relative flex justify-center gap-1.5">
          {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
            const unlocked = isDifficultyUnlocked(key, profile);
            const isActive = unlocked && current === key;
            const requirement = getUnlockRequirement(key);

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                aria-disabled={!unlocked}
                title={!unlocked ? requirement || undefined : undefined}
                onClick={() => handleSelect(key)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border-2 px-1.5 py-1 transition-all duration-200 [@media(max-height:700px)]:min-h-[40px] ${
                  isActive
                    ? "scale-[1.02] border-amber-300 bg-amber-500/25 shadow-md shadow-amber-400/30"
                    : !unlocked
                      ? "border-slate-600/30 bg-slate-900/40 opacity-55"
                      : "border-amber-500/25 bg-slate-900/50 opacity-70 hover:border-amber-400/40 hover:opacity-100"
                }`}
              >
                <span
                  className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-amber-400/25"
                  style={{ background: "#0F1A30" }}
                >
                  <SafeImage src={artMap[key]} alt="" fallback={null} className="h-full w-full object-cover object-center" />
                  {!unlocked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                      <Lock className="h-3 w-3 text-amber-200/80" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span
                  className={`font-serif text-xs font-semibold ${
                    isActive ? "text-amber-50" : unlocked ? "text-amber-100/60" : "text-amber-100/45"
                  }`}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}

          {/* Requirement tooltip (absolute — never shifts the Start button). */}
          {lockedHint && (
            <div
              className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-500/40 bg-slate-950/95 px-3 py-1.5 text-[11px] font-medium text-amber-100 shadow-lg"
              role="status"
            >
              🔒 {lockedHint.text}
            </div>
          )}
        </div>

        {/* Selected-difficulty detail panel — larger artwork on the left,
            text hierarchy on the right (name strongest, identity, then the
            two mechanical rule lines). The identity line is hidden on short
            viewports to save height; every difficulty still renders the same
            line count within a given viewport, so the panel height is fixed
            and Start Journey never shifts on selection. */}
        <div
          className={`mt-1.5 flex items-center gap-2.5 rounded-xl border px-3 py-2 [@media(max-height:700px)]:mt-1 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:py-1 ${currentRule.panelClass}`}
        >
          <div
            className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-amber-400/30 [@media(max-height:700px)]:h-11 [@media(max-height:700px)]:w-11"
            style={{ background: "#0F1A30" }}
          >
            <SafeImage
              src={artMap[current]}
              alt={currentPreset.label}
              fallback={null}
              className="h-full w-full object-cover object-center"
            />
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-serif text-sm font-bold text-amber-100">
              {currentPreset.label}
            </p>
            <p className="truncate text-[11px] text-amber-100/55 [@media(max-height:700px)]:hidden">
              {currentPreset.desc}
            </p>
            <p className={`truncate text-[11px] font-medium ${currentRule.textClass}`}>
              {currentRule.lines[0]}
            </p>
            <p className={`truncate text-[11px] font-medium ${currentRule.textClass}`}>
              {currentRule.lines[1]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Difficulty buttons */}
      <div className="relative flex justify-center gap-2">
        {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
          const unlocked = isDifficultyUnlocked(key, profile);
          const isActive = unlocked && current === key;
          const requirement = getUnlockRequirement(key);

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              aria-disabled={!unlocked}
              title={!unlocked ? requirement || undefined : undefined}
              onClick={() => handleSelect(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border-2 px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? "scale-[1.03] border-amber-300 bg-amber-500/20 shadow-md shadow-amber-400/30"
                  : !unlocked
                    ? "border-slate-600/30 bg-slate-900/40 opacity-55"
                    : "border-amber-500/15 bg-slate-900/40 opacity-70 hover:border-amber-400/40 hover:opacity-100"
              }`}
            >
              <div
                className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                style={{ background: "#0F1A30" }}
              >
                <SafeImage
                  src={artMap[key]}
                  alt=""
                  fallback={null}
                  className="h-full w-full object-cover object-center"
                />
                {!unlocked && (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                    <Lock className="h-3 w-3 text-amber-200/80" aria-hidden="true" />
                  </span>
                )}
              </div>

              <span
                className={`font-serif text-sm font-semibold ${
                  isActive ? "text-amber-100" : unlocked ? "text-amber-100/60" : "text-amber-100/45"
                }`}
              >
                {preset.label}
              </span>
            </button>
          );
        })}

        {lockedHint && (
          <div
            className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-500/40 bg-slate-950/95 px-3 py-1.5 text-xs font-medium text-amber-100 shadow-lg"
            role="status"
          >
            🔒 {lockedHint.text}
          </div>
        )}
      </div>

      {/* Selected difficulty — description and retry rule combined in one compact panel */}
      <div className={`mt-3 rounded-xl border px-4 py-2.5 ${currentRule.panelClass}`}>
        <div className="flex items-center gap-3">
          <div
            className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-amber-400/30"
            style={{ background: "#0F1A30" }}
          >
            <SafeImage
              src={artMap[current]}
              alt={currentPreset.label}
              fallback={null}
              className="h-full w-full object-cover object-center"
            />
          </div>

          <div className="min-w-0">
            <span className="font-serif text-sm font-bold text-amber-200">
              {currentPreset.label}
            </span>

            <span className="ml-2 text-xs text-amber-100/50">
              {currentPreset.desc}
            </span>
          </div>
        </div>

        <p className={`mt-1.5 pl-10 text-xs font-medium ${currentRule.textClass}`}>
          {currentRule.lines.join(" ")}
        </p>
      </div>
    </div>
  );
}
