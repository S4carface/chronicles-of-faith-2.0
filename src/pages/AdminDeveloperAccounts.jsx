import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Loader2, UserX, UserCheck, History } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchDeveloperAccounts,
  setDeveloperAccountExclusion,
  fetchDeveloperAccountAuditLog,
  fetchExcludedLeaderboardScores,
  excludeLeaderboardScoreRow,
  restoreLeaderboardScoreRow,
} from "@/game/devAccountManager";
import { fetchCurrentSeasonLeaderboard } from "@/game/seasonManager";
import { fetchLeaderboard } from "@/game/scoreManager";

// Owner-only console for the developer/test-account leaderboard-exclusion
// system. Authorization is the real Base44 `user.role === "admin"` value
// from the authenticated session — same pattern as AdminSeasons.jsx. This
// route is intentionally unlinked from bottom navigation, reachable only by
// URL, and gated behind real auth on top of that.
export default function AdminDeveloperAccounts() {
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
      <DeveloperAccountsPanel adminEmail={user?.email || user?.id || "unknown-admin"} />
    </AdminShell>
  );
}

function AdminShell({ children }) {
  return (
    <div
      className="min-h-screen px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6"
      style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}
    >
      <div className="mx-auto max-w-2xl">
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

const REVIEW_BOARDS = [
  { key: "season", label: "Current Season" },
  { key: "weekly", label: "This Week" },
  { key: "daily", label: "Daily Battle" },
];

function DeveloperAccountsPanel({ adminEmail }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [excludedScores, setExcludedScores] = useState([]);

  const [newAccountId, setNewAccountId] = useState("");
  const [newReason, setNewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [reviewBoard, setReviewBoard] = useState("season");
  const [reviewEntries, setReviewEntries] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [accts, audit, excluded] = await Promise.all([
      fetchDeveloperAccounts(),
      fetchDeveloperAccountAuditLog(),
      fetchExcludedLeaderboardScores(),
    ]);
    setAccounts(accts);
    setAuditLog(audit);
    setExcludedScores(excluded);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadReviewBoard = async (board) => {
    setReviewBoard(board);
    setReviewLoading(true);
    let entries = [];
    if (board === "season") entries = await fetchCurrentSeasonLeaderboard();
    else if (board === "weekly") entries = await fetchLeaderboard("weekly");
    else entries = await fetchLeaderboard("daily");
    setReviewEntries(entries);
    setReviewLoading(false);
  };

  useEffect(() => {
    loadReviewBoard("season");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddExclusion = async () => {
    if (!newAccountId.trim()) return;
    setSubmitting(true);
    setResult(null);
    const outcome = await setDeveloperAccountExclusion({
      accountId: newAccountId.trim(),
      excluded: true,
      reason: newReason.trim(),
      adminEmail,
    });
    setSubmitting(false);
    setResult(outcome);
    if (outcome.success) {
      setNewAccountId("");
      setNewReason("");
      await loadAll();
    }
  };

  const handleRemoveExclusion = async (account) => {
    setSubmitting(true);
    setResult(null);
    const outcome = await setDeveloperAccountExclusion({
      accountId: account.accountId,
      excluded: false,
      reason: "Exclusion removed via admin console",
      adminEmail,
    });
    setSubmitting(false);
    setResult(outcome);
    if (outcome.success) await loadAll();
  };

  const handleExcludeRow = async (row) => {
    await excludeLeaderboardScoreRow({
      rowId: row.id,
      reason: "developer_account",
      adminEmail,
    });
    await Promise.all([loadReviewBoard(reviewBoard), loadAll()]);
  };

  const handleRestoreRow = async (row) => {
    await restoreLeaderboardScoreRow({ rowId: row.id, adminEmail });
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-emerald-300/80">
        <ShieldCheck className="h-5 w-5" />
        <p className="font-serif text-lg">Developer Accounts &amp; Leaderboard Integrity</p>
      </div>
      <p className="text-xs text-amber-100/40">
        Manage which authenticated accounts are excluded from public leaderboards. Runs still calculate
        and display scores normally — only the public submission is skipped.
      </p>

      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.success
              ? "border-emerald-400/30 bg-emerald-900/15 text-emerald-200"
              : "border-red-400/30 bg-red-900/15 text-red-200"
          }`}
        >
          {result.success ? "Saved." : `Failed: ${result.error}`}
        </div>
      )}

      {/* === Section: Excluded accounts === */}
      <section className="space-y-3 rounded-xl border border-amber-500/20 bg-slate-900/30 p-4">
        <p className="text-sm font-semibold text-amber-200">Excluded Accounts</p>

        {loading ? (
          <p className="text-sm text-amber-100/50">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-amber-100/40">No accounts are currently excluded.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-slate-950/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-amber-100">{account.accountId}</p>
                  {account.reason && <p className="truncate text-xs text-amber-100/40">{account.reason}</p>}
                </div>
                <button
                  onClick={() => handleRemoveExclusion(account)}
                  disabled={submitting}
                  className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-900/15 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-800/25 disabled:opacity-40"
                >
                  <UserCheck className="h-3 w-3" /> Remove Exclusion
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t border-amber-500/10 pt-3">
          <Field label="Account ID (email)">
            <input
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              placeholder="developer@example.com"
              className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
            />
          </Field>
          <Field label="Reason">
            <input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Development/QA account — unlocked cards from testing"
              className="w-full min-h-11 rounded-lg border border-amber-500/25 bg-slate-950/50 px-3 text-sm text-amber-100 outline-none focus:border-amber-400/60"
            />
          </Field>
          <button
            onClick={handleAddExclusion}
            disabled={submitting || !newAccountId.trim()}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border-2 border-amber-400/50 bg-amber-900/20 font-serif text-sm font-bold text-amber-200 transition hover:bg-amber-800/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserX className="h-3.5 w-3.5" /> Exclude Account
          </button>
        </div>
      </section>

      {/* === Section: Review & manually exclude existing rows === */}
      <section className="space-y-3 rounded-xl border border-amber-500/20 bg-slate-900/30 p-4">
        <p className="text-sm font-semibold text-amber-200">Review &amp; Exclude Existing Scores</p>
        <p className="text-xs text-amber-100/40">
          Older records may only have a local player id/name and can't be linked to an account
          automatically. Review each board below and manually exclude any row you recognize as your
          own testing run — nothing is removed by name-matching.
        </p>

        <div className="flex gap-2">
          {REVIEW_BOARDS.map((b) => (
            <button
              key={b.key}
              onClick={() => loadReviewBoard(b.key)}
              className={`min-h-9 flex-1 rounded-lg border px-2 text-xs font-medium transition ${
                reviewBoard === b.key
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                  : "border-amber-500/10 text-amber-100/50 hover:text-amber-100/70"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {reviewLoading ? (
          <p className="text-sm text-amber-100/50">Loading…</p>
        ) : reviewEntries.length === 0 ? (
          <p className="text-sm text-amber-100/40">No entries on this board.</p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {reviewEntries.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/10 bg-slate-950/30 p-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="text-amber-100/40">#{idx + 1}</span>{" "}
                  <span className="text-amber-100">{row.playerName}</span>{" "}
                  <span className="text-amber-300/60">{row.score}</span>
                </div>
                <button
                  onClick={() => handleExcludeRow(row)}
                  className="flex-shrink-0 rounded border border-red-400/30 px-2 py-1 text-[10px] font-medium text-red-300 transition hover:bg-red-900/20"
                >
                  Mark as Developer/Test
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Section: Developer / QA Scores (read-only internal history) === */}
      <section className="space-y-3 rounded-xl border border-amber-500/20 bg-slate-900/30 p-4">
        <p className="text-sm font-semibold text-amber-200">Developer / QA Scores</p>
        <p className="text-xs text-amber-100/40">
          Internal only — non-competitive. These rows never appear on a public leaderboard.
        </p>
        {excludedScores.length === 0 ? (
          <p className="text-sm text-amber-100/40">No excluded score records.</p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {excludedScores.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/10 bg-slate-950/30 p-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="text-amber-100">{row.playerName}</span>{" "}
                  <span className="text-amber-300/60">{row.score}</span>{" "}
                  <span className="text-amber-100/30">· {row.mode}</span>
                  {row.exclusionReason && <p className="truncate text-amber-100/30">{row.exclusionReason}</p>}
                </div>
                <button
                  onClick={() => handleRestoreRow(row)}
                  className="flex-shrink-0 rounded border border-emerald-400/30 px-2 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-900/20"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Section: Audit log === */}
      <section className="space-y-2 rounded-xl border border-amber-500/20 bg-slate-900/30 p-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-200">
          <History className="h-3.5 w-3.5" /> Recent Changes
        </div>
        {auditLog.length === 0 ? (
          <p className="text-sm text-amber-100/40">No changes recorded yet.</p>
        ) : (
          <div className="max-h-56 space-y-1.5 overflow-y-auto text-xs text-amber-100/50">
            {auditLog.map((entry) => (
              <p key={entry.id}>
                <span className="text-amber-100/80">{entry.targetAccountId}</span>{" "}
                {entry.previousStatus} → {entry.newStatus} by {entry.adminEmail}
                {entry.reason ? ` — ${entry.reason}` : ""}
              </p>
            ))}
          </div>
        )}
      </section>
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
