import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getActiveSeason,
  estimateSeasonRecordCount,
  startNewSeason,
  DEFAULT_ACTIVE_SEASON,
} from "@/game/seasonManager";

const CONFIRM_PHRASE = "START NEW SEASON";

// Owner-only season-management console. Authorization is the real Base44
// `user.role === "admin"` value from the authenticated session (base44.auth.me()
// via AuthContext) — never a client-side boolean, URL parameter, or
// localStorage flag. Ordinary/anonymous players (the vast majority — this app
// runs with requiresAuth:false) have no `user` at all and are blocked below.
// This route is intentionally unlinked from bottom navigation, matching the
// existing /dev/* precedent in this repo — reachable only by URL, and gated
// behind real auth on top of that.
export default function AdminSeasons() {
  const { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const authLoading = isLoadingAuth || isLoadingPublicSettings;
  const isAdmin = isAuthenticated && user?.role === "admin";

  if (authLoading) {
    return <AdminShell><LoadingState /></AdminShell>;
  }

  if (!isAdmin) {
    return <AdminShell><DeniedState /></AdminShell>;
  }

  return (
    <AdminShell>
      <SeasonManagementPanel adminEmail={user?.email || user?.id || "unknown-admin"} />
    </AdminShell>
  );
}

function AdminShell({ children }) {
  return (
    <div
      className="min-h-screen px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6"
      style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}
    >
      <div className="mx-auto max-w-xl">
        <Link to="/leaderboard" className="mb-6 inline-flex min-h-11 items-center text-sm text-amber-100/60 transition hover:text-amber-200">
          ← Leaderboard
        </Link>
        {children}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-500/15 bg-slate-900/40 p-8 text-center text-amber-100/60">
      <Loader2 className="h-6 w-6 animate-spin" />
      Checking authorization…
    </div>
  );
}

function DeniedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/25 bg-red-900/10 p-8 text-center">
      <ShieldAlert className="h-8 w-8 text-red-300/70" />
      <p className="font-serif text-lg text-red-200">Restricted</p>
      <p className="text-sm text-red-200/70">
        This page is only available to the app owner's authenticated admin account.
      </p>
    </div>
  );
}

function SeasonManagementPanel({ adminEmail }) {
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);

  const [newSeasonId, setNewSeasonId] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [reason, setReason] = useState("");
  const [gameVersion, setGameVersion] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmText, setConfirmText] = useState("");

  const [showSummary, setShowSummary] = useState(false);
  const [recordsEstimate, setRecordsEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    getActiveSeason().then((season) => {
      if (active) {
        setCurrentSeason(season);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const canReview =
    confirmText === CONFIRM_PHRASE &&
    newSeasonId.trim().length > 0 &&
    newSeasonName.trim().length > 0 &&
    !submitting;

  const handleReview = async () => {
    if (!canReview) return;
    const estimate = await estimateSeasonRecordCount(currentSeason.id);
    setRecordsEstimate(estimate ?? 0);
    setShowSummary(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setResult(null);
    const outcome = await startNewSeason({
      newSeasonId: newSeasonId.trim(),
      newSeasonName: newSeasonName.trim(),
      reason: reason.trim(),
      gameVersion: gameVersion.trim() || DEFAULT_ACTIVE_SEASON.gameVersion,
      startDate,
      adminEmail,
    });
    setSubmitting(false);
    setShowSummary(false);
    setResult(outcome);
    if (outcome.success) {
      setCurrentSeason(await getActiveSeason());
      setNewSeasonId("");
      setNewSeasonName("");
      setReason("");
      setConfirmText("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-emerald-300/80">
        <ShieldCheck className="h-5 w-5" />
        <p className="font-serif text-lg">Season Management</p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4">
        <p className="text-[10px] uppercase tracking-widest text-amber-300/60">Current Active Season</p>
        {loading ? (
          <p className="mt-1 text-sm text-amber-100/50">Loading…</p>
        ) : (
          <>
            <p className="mt-1 font-serif text-xl text-amber-200">{currentSeason.name}</p>
            <p className="text-xs text-amber-100/50">ID: {currentSeason.id}</p>
          </>
        )}
      </div>

      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.success
              ? "border-emerald-400/30 bg-emerald-900/15 text-emerald-200"
              : "border-red-400/30 bg-red-900/15 text-red-200"
          }`}
        >
          {result.success
            ? `Season transition complete. "${result.newSeason.name}" is now active. ${result.recordsAffectedEstimate} record(s) from the previous season were archived, not deleted.`
            : `Season transition failed: ${result.error}`}
        </div>
      )}

      {!loading && (
        <div className="space-y-3 rounded-xl border border-amber-500/20 bg-slate-900/30 p-4">
          <p className="text-sm font-semibold text-amber-200">Start a New Season</p>

          <Field label="New Season ID">
            <input
              value={newSeasonId}
              onChange={(e) => setNewSeasonId(e.target.value)}
              placeholder="early-access-season-3"
              className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
            />
          </Field>

          <Field label="New Season Name">
            <input
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              placeholder="Early Access Season 3"
              className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
            />
          </Field>

          <Field label="Reason for Reset">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Major balance overhaul, new chapter, etc."
              rows={2}
              className="w-full rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 py-2 text-sm text-amber-100 outline-none focus:border-amber-400/60"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Game Version">
              <input
                value={gameVersion}
                onChange={(e) => setGameVersion(e.target.value)}
                placeholder={DEFAULT_ACTIVE_SEASON.gameVersion}
                className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
              />
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
              />
            </Field>
          </div>

          <Field label={`Type "${CONFIRM_PHRASE}" to enable`}>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="w-full min-h-11 rounded-lg border border-red-400/30 bg-slate-950/50 px-3 text-sm text-red-200 outline-none focus:border-red-400/60"
            />
          </Field>

          <button
            onClick={handleReview}
            disabled={!canReview}
            className="min-h-11 w-full rounded-lg border-2 border-red-400/50 bg-red-900/20 font-serif text-sm font-bold text-red-200 transition hover:bg-red-800/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review Season Transition
          </button>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,24,0.95)" }}>
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-400/40 p-6" style={{ background: "linear-gradient(135deg, #1A2744 0%, #0F1A30 100%)" }}>
            <h2 className="mb-3 text-center font-serif text-lg text-red-200">Confirm Season Transition</h2>
            <div className="space-y-2 text-sm text-amber-100/80">
              <p><span className="text-amber-100/50">Archiving:</span> {currentSeason.name} ({currentSeason.id})</p>
              <p><span className="text-amber-100/50">Activating:</span> {newSeasonName} ({newSeasonId})</p>
              <p><span className="text-amber-100/50">Records affected:</span> {recordsEstimate ?? "—"}</p>
              <p className="text-emerald-300/80">Historical scores will not be deleted — they remain in Legacy Records.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSummary(false)}
                className="min-h-11 flex-1 rounded-lg border border-amber-400/30 bg-slate-800/40 text-sm text-amber-100/70 transition hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg border-2 border-red-400/50 bg-red-900/30 text-sm font-bold text-red-100 transition hover:bg-red-800/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Starting…" : "Confirm & Start Season"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-amber-100/50">{label}</span>
      {children}
    </label>
  );
}
