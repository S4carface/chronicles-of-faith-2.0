// Lifetime player stats — persisted to localStorage, structured for future online sync.
// Separates story-run stats from daily-challenge stats per the product requirements.

import { base44 } from "@/api/base44Client";
import { getPlayerId } from "@/game/scoreManager";

const STATS_KEY = "chronicles_of_faith_stats_v1";

const DEFAULT_STATS = {
  // Journey Progress
  runsPlayed: 0,          // story runs started (abandoned runs still count as played)
  runsCompleted: 0,      // story runs won (boss defeated = run complete)
  runsWon: 0,            // same as completed for now (only Genesis exists)
  // Battle Record
  battlesWon: 0,         // individual story battles won
  battlesLost: 0,        // individual story battles lost
  bossesDefeated: 0,
  bestScore: 0,          // best story score
  totalGoldEarned: 0,
  // Bible Knowledge
  triviaAnswered: 0,
  triviaCorrect: 0,
  versesRead: 0,
  // Daily Challenge
  dailyChallengesCompleted: 0,
  bestDailyStreak: 0,
  bestDailyScore: 0,
  // Daily Devotion (separate from battle)
  bestDevotionStreak: 0,
  // Gameplay / Card Mastery
  cardUsage: {},         // { cardId: count }
  totalDamageDealt: 0,
  totalBlockGained: 0,
  totalHealingDone: 0,
};

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATS, ...parsed, cardUsage: { ...(parsed.cardUsage || {}) } };
    }
  } catch {}
  return { ...DEFAULT_STATS, cardUsage: {} };
}

export function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

export function getStats() {
  return loadStats();
}

function mutate(fn) {
  const stats = loadStats();
  const next = fn({ ...stats, cardUsage: { ...stats.cardUsage } });
  saveStats(next);
  return next;
}

// ---- Journey ----
export function recordRunStarted() {
  mutate(s => ({ ...s, runsPlayed: s.runsPlayed + 1 }));
}
export function recordRunWon(score = 0, gold = 0) {
  mutate(s => ({
    ...s,
    runsCompleted: s.runsCompleted + 1,
    runsWon: s.runsWon + 1,
    bestScore: Math.max(s.bestScore, score),
    totalGoldEarned: s.totalGoldEarned + gold,
  }));
}
export function recordGoldEarned(amount) {
  if (amount > 0) mutate(s => ({ ...s, totalGoldEarned: s.totalGoldEarned + amount }));
}

// ---- Battles (story only — daily battles are tracked separately) ----
export function recordBattleWon(isBoss = false) {
  mutate(s => ({
    ...s,
    battlesWon: s.battlesWon + 1,
    bossesDefeated: isBoss ? s.bossesDefeated + 1 : s.bossesDefeated,
  }));
}
export function recordBattleLost() {
  mutate(s => ({ ...s, battlesLost: s.battlesLost + 1 }));
}

// ---- Gameplay ----
export function recordCardPlayed(cardId) {
  if (!cardId) return;
  mutate(s => {
    const cu = { ...s.cardUsage };
    cu[cardId] = (cu[cardId] || 0) + 1;
    return { ...s, cardUsage: cu };
  });
}
export function recordDamage(amount) {
  if (amount > 0) mutate(s => ({ ...s, totalDamageDealt: s.totalDamageDealt + amount }));
}
export function recordBlock(amount) {
  if (amount > 0) mutate(s => ({ ...s, totalBlockGained: s.totalBlockGained + amount }));
}
export function recordHealing(amount) {
  if (amount > 0) mutate(s => ({ ...s, totalHealingDone: s.totalHealingDone + amount }));
}

// ---- Bible Knowledge ----
export function recordTriviaAnswered(correct) {
  mutate(s => ({
    ...s,
    triviaAnswered: s.triviaAnswered + 1,
    triviaCorrect: s.triviaCorrect + (correct ? 1 : 0),
    versesRead: s.versesRead + 1, // each trivia shows a verse
  }));
}
export function recordVerseRead() {
  mutate(s => ({ ...s, versesRead: s.versesRead + 1 }));
}

// ---- Daily Challenge ----
export function recordDailyCompleted(score = 0, streak = 0, gold = 0) {
  mutate(s => ({
    ...s,
    dailyChallengesCompleted: s.dailyChallengesCompleted + 1,
    bestDailyScore: Math.max(s.bestDailyScore, score),
    bestDailyStreak: Math.max(s.bestDailyStreak, streak),
    totalGoldEarned: s.totalGoldEarned + gold,
  }));
}

// ---- Daily Devotion (separate from battle) ----
export function recordDevotionRead(streak = 0) {
  mutate(s => ({
    ...s,
    bestDevotionStreak: Math.max(s.bestDevotionStreak || 0, streak),
  }));
}

// ---- Best-effort online sync (structured for future; safe if entity/cloud unavailable) ----
export async function syncStatsToCloud() {
  try {
    const stats = loadStats();
    const playerId = getPlayerId();
    const { cardUsage, ...rest } = stats;
    const payload = {
      ...rest,
      playerId,
      cardUsageJson: JSON.stringify(cardUsage || {}),
    };
    const existing = await base44.entities.PlayerStats.filter({ playerId }, "-updated_date", 1);
    if (existing && existing.length > 0) {
      await base44.entities.PlayerStats.update(existing[0].id, payload);
    } else {
      await base44.entities.PlayerStats.create(payload);
    }
  } catch {
    // Local storage is the source of truth for now; cloud sync is best-effort.
  }
}