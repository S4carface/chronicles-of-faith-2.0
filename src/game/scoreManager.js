import { base44 } from "@/api/base44Client";

const PENDING_KEY = "chronicles_pending_scores";
const DEVICE_ID_KEY = "cof_device_id";
const LB_CACHE_KEY = "chronicles_lb_cache";

export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = "dev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev-unknown";
  }
}

export function getPendingScores() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePending(scores) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(scores));
  } catch {}
}

/**
 * Submit a score to the online Score entity.
 * On failure, stores the score locally for later retry.
 * Returns { success: boolean, error?: string }
 */
export async function submitScore(scoreData) {
  const payload = {
    ...scoreData,
    deviceId: getDeviceId(),
    completedAt: scoreData.completedAt || new Date().toISOString(),
  };
  try {
    await base44.entities.Score.create(payload);
    return { success: true };
  } catch (e) {
    const pending = getPendingScores();
    pending.push({ ...payload, _queuedAt: Date.now() });
    savePending(pending);
    return { success: false, error: e?.message || "Network error" };
  }
}

/**
 * Attempt to submit any pending scores that failed previously.
 * Returns { retried, succeeded }
 */
export async function retryPendingScores() {
  const pending = getPendingScores();
  if (pending.length === 0) return { retried: 0, succeeded: 0 };
  let succeeded = 0;
  const stillPending = [];
  for (const score of pending) {
    try {
      await base44.entities.Score.create(score);
      succeeded++;
    } catch {
      stillPending.push(score);
    }
  }
  savePending(stillPending);
  return { retried: pending.length, succeeded };
}

/** Cache leaderboard results for fast initial load. */
export function cacheLeaderboard(tab, data) {
  try {
    const raw = localStorage.getItem(LB_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[tab] = { data, timestamp: Date.now() };
    localStorage.setItem(LB_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getCachedLeaderboard(tab) {
  try {
    const raw = localStorage.getItem(LB_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    return cache[tab]?.data || null;
  } catch {
    return null;
  }
}