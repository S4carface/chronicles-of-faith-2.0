// Pure helpers for the Genesis map Run Status HUD and node previews.
// Single source of truth for HP-percentage, HP band colours, and camp-heal math
// so the HUD, camp preview, and battle preview never disagree or promise healing
// that won't occur. No component/state coupling — trivially testable.

// Safe HP percentage in [0, 100]. Defends against maxHp = 0 / missing values.
export function getHpPercent(hp, maxHp) {
  const h = Number(hp) || 0;
  const m = Number(maxHp) || 0;
  if (m <= 0) return 0;
  return Math.max(0, Math.min(100, (h / m) * 100));
}

// HP band drives the muted bar colour and an accessible text label:
//   > 60%      → "healthy"
//   30% – 60%  → "caution"
//   < 30%      → "danger"
export function getHpBand(hp, maxHp) {
  const pct = getHpPercent(hp, maxHp);
  if (pct < 30) return "danger";
  if (pct <= 60) return "caution";
  return "healthy";
}

// Muted, premium bar colours (not arcade-bright), one per band.
export const HP_BAND_COLORS = {
  healthy: "#4A8F6D", // muted sage green
  caution: "#C9A227", // muted amber/gold
  danger: "#B4534B", // muted clay red
};

export function getHpBandColor(hp, maxHp) {
  return HP_BAND_COLORS[getHpBand(hp, maxHp)];
}

// Human-readable band label for accessible descriptions.
export const HP_BAND_LABELS = {
  healthy: "Healthy",
  caution: "Caution",
  danger: "Danger",
};

// HP below which a battle preview shows a "consider resting" advisory.
export const LOW_HP_ADVISORY_PERCENT = 30;

export function isLowHp(hp, maxHp) {
  return getHpPercent(hp, maxHp) < LOW_HP_ADVISORY_PERCENT;
}

// Camp heal amount — mirrors RestRoom's "restore 30% of max HP" rule exactly.
// (RestRoom remains the authority; this only reads the same formula for previews.)
export const CAMP_HEAL_RATIO = 0.3;

export function getCampHealAmount(maxHp) {
  return Math.floor((Number(maxHp) || 0) * CAMP_HEAL_RATIO);
}

// Projected HP after a heal, capped at max HP (never over-promises).
export function getProjectedHp(hp, maxHp, heal) {
  const m = Number(maxHp) || 0;
  return Math.min(m, (Number(hp) || 0) + (Number(heal) || 0));
}
