"use client";

import { useEffect, useState, useCallback } from "react";
import type { OwnershipSummaryResponse } from "@/types/ownership";
import { getOwnershipOverview, refreshOwnership } from "@/lib/ownershipApi";
import RepoOwnershipCard from "./RepoOwnershipCard";
import IncompleteAttributionBanner from "./IncompleteAttributionBanner";
import {
  FolderGit2,
  GitPullRequest,
  RefreshCw,
  ShieldCheck,
  Code2,
  AlertTriangle,
  Info
} from "lucide-react";

interface Props {
  profileId?: string | null;
  onNavigateToAnalyse?: () => void;
  onAddGitHubUsername?: () => void;
}

/** Terminal statuses – repos in these states are done and won't change. */
const TERMINAL_STATUSES = new Set(["complete", "partial", "incomplete", "failed", "not_analysed"]);

/** Non-terminal statuses – repos being processed. */
const PROCESSING_STATUSES = new Set(["discovered", "queued", "analysing"]);

export default function OwnershipPanel({ profileId, onNavigateToAnalyse, onAddGitHubUsername }: Props) {
  const [data, setData] = useState<OwnershipSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisTriggered, setAnalysisTriggered] = useState<boolean>(false);
  const [githubToken, setGithubToken] = useState<string>("");

  const isRealProfile = Boolean(profileId);

  const loadData = useCallback(async (showLoading = true) => {
    if (!profileId) {
      setData(null);
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await getOwnershipOverview(profileId);
      setData(res);

      const hasPending = res.repositories.some((r) => PROCESSING_STATUSES.has(r.status));
      if (!hasPending) {
        setRefreshing(false);
      }
    } catch (err: any) {
      console.error("Failed to fetch ownership overview:", err);
      setError(err.message || "Failed to load ownership map");
      setRefreshing(false);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (isRealProfile) {
      setAnalysisTriggered(false);
      loadData(true);
    } else {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setAnalysisTriggered(false);
    }
  }, [profileId, isRealProfile]);

  // Auto-trigger analysis if repos are discovered but analysis hasn't run, OR if it's completely empty.
  // This handles the case where the page is refreshed and repos exist in 'discovered' state,
  // or when an HR searches a new profile and repos haven't been discovered yet.
  useEffect(() => {
    if (!isRealProfile || !data || analysisTriggered || refreshing) return;

    const hasDiscoveredNotAnalysed = data.repositories.some((r) => r.status === "discovered");
    const hasNoTerminal = data.repositories.every((r) => !TERMINAL_STATUSES.has(r.status));
    const isCompletelyEmpty = data.repositories.length === 0 && Boolean(data.github_username);

    if (isCompletelyEmpty || (hasDiscoveredNotAnalysed && hasNoTerminal && data.repositories.length > 0)) {
      // Repos are staged but analysis was never queued (or not discovered yet) – trigger it
      console.info("[OwnershipPanel] Auto-triggering analysis");
      setAnalysisTriggered(true);
      setRefreshing(true);
      refreshOwnership(profileId!, githubToken).then(() => {
        loadData(false);
      }).catch((err) => {
        console.error("[OwnershipPanel] Auto-trigger failed:", err);
        setRefreshing(false);
      });
    }
  }, [data, isRealProfile, analysisTriggered, refreshing, profileId, githubToken, loadData]);

  // Polling: while refreshing or while any repository is being analyzed
  const isAnyRepoProcessing = Boolean(
    refreshing || data?.repositories.some((r) => PROCESSING_STATUSES.has(r.status))
  );

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRealProfile && isAnyRepoProcessing) {
      timer = setTimeout(() => {
        loadData(false);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isRealProfile, isAnyRepoProcessing, data, loadData]);

  async function handleRefresh() {
    if (!profileId || refreshing) return;
    setRefreshing(true);
    setAnalysisTriggered(true);
    try {
      await refreshOwnership(profileId, githubToken);
      await loadData(false);
    } catch (err: any) {
      console.error("Refresh failed:", err);
      setRefreshing(false);
    }
  }

  // ── 1. No real profile submitted yet ─────────────────────────────────────────
  if (!isRealProfile) {
    return (
      <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          className="card"
          style={{
            padding: "28px 32px",
            borderColor: "var(--blue)",
            boxShadow: "4px 4px 0 var(--blue)",
            background: "var(--white)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: "var(--blue-light)", borderRadius: "99px", marginBottom: 12 }}>
            <ShieldCheck size={14} color="var(--blue)" />
            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--blue)" }}>
              Git Blame Code Attribution
            </span>
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>
            Ownership <span className="gradient-text">Map</span>
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--text-mid)", maxWidth: 640, lineHeight: 1.5, marginBottom: 20 }}>
            Evaluates surviving code attribution across your public repositories and open-source contributions using full-history Git blame analysis.
          </p>

          <div
            style={{
              padding: "20px 24px",
              background: "var(--bg-soft)",
              borderRadius: "12px",
              border: "1.5px solid var(--border)",
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", marginBottom: 6 }}>
              Ready to Analyse Your Repositories
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", lineHeight: 1.5, margin: 0 }}>
              Submit your GitHub username and target role in the <strong>Analyse</strong> tab to generate your personalized code attribution map, verify surviving source lines, and refine evidence scoring.
            </p>
          </div>

          {(onAddGitHubUsername || onNavigateToAnalyse) && (
            <button
              id="ownership-go-to-analyse"
              onClick={onAddGitHubUsername || onNavigateToAnalyse}
              className="btn btn-primary"
              style={{ padding: "10px 22px", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Code2 size={16} /> Go to Analyse Tab
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 2. Loading State ──────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 16px" }} />
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>
          Loading Ownership Map…
        </div>
        <p style={{ fontSize: "0.84rem", color: "var(--text-soft)", marginTop: 4 }}>
          Calculating code attribution across owned and contributed repositories
        </p>
      </div>
    );
  }

  // ── 3. Error State ────────────────────────────────────────────────────────────
  if (error || !data) {
    const isNotFound = error?.toLowerCase().includes("not found");
    return (
      <div className="card" style={{ padding: "36px 24px", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", marginBottom: 8 }}>
          {isNotFound ? "Profile Not Found in Database" : "Ownership Attribution Unavailable"}
        </div>
        <p style={{ fontSize: "0.86rem", color: "var(--text-soft)", marginBottom: 20, lineHeight: 1.5 }}>
          {isNotFound
            ? `The active profile ID (${profileId}) is not present in the database. Please submit a new profile in the Analyse tab to start analysis.`
            : error || "No repository attribution records found for this profile."}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          {isNotFound && (onAddGitHubUsername || onNavigateToAnalyse) ? (
            <button onClick={onAddGitHubUsername || onNavigateToAnalyse} className="btn btn-primary" style={{ fontSize: "0.84rem" }}>
              Go to Analyse Tab
            </button>
          ) : (
            <button onClick={() => loadData(true)} className="btn btn-secondary" style={{ fontSize: "0.84rem" }}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 4. Missing GitHub Username on Profile ─────────────────────────────────────
  if (!data.github_username) {
    return (
      <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          className="card"
          style={{
            padding: "28px 32px",
            borderColor: "var(--purple)",
            boxShadow: "4px 4px 0 var(--purple)",
            background: "var(--white)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: "var(--purple-light)", borderRadius: "99px", marginBottom: 12 }}>
            <FolderGit2 size={14} color="var(--purple)" />
            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--purple)" }}>
              GitHub Account Required
            </span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>
            Add Your GitHub Username
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-mid)", maxWidth: 600, lineHeight: 1.5, marginBottom: 20 }}>
            To generate code attribution across your repositories, link your GitHub username in the profile analysis section.
          </p>

          <button
            id="ownership-add-github-btn"
            onClick={onAddGitHubUsername || onNavigateToAnalyse}
            className="btn btn-primary"
            style={{ padding: "10px 22px", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FolderGit2 size={16} /> Add GitHub Username
          </button>
        </div>
      </div>
    );
  }

  const ownedRepos = data.repositories.filter((r) => r.relation === "owner");
  const contributedRepos = data.repositories.filter((r) => r.relation === "contributed_to");

  const overallSharePct = Math.round((data.overall_student_share ?? 0) * 100);
  const overallCoveragePct = Math.round((data.overall_coverage ?? 0) * 100);
  const hasIncomplete = data.repositories.some((r) => r.incomplete || r.status === "incomplete");

  return (
    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Top Summary Header ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          borderColor: "var(--blue)",
          boxShadow: "4px 4px 0 var(--blue)",
          background: "var(--white)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: "var(--blue-light)", borderRadius: "99px", marginBottom: 10 }}>
              <ShieldCheck size={14} color="var(--blue)" />
              <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--blue)" }}>
                Code Attribution & Provenance
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>
              Ownership <span className="gradient-text">Map</span>
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-mid)", maxWidth: 580 }}>
              Evaluates surviving code attribution across your public repositories and open-source contributions using full-history Git blame.
              {data.github_username && (
                <span style={{ color: "var(--blue)", fontWeight: 700 }}> @{data.github_username}</span>
              )}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            {refreshing ? "Re-analysing…" : "Refresh Ownership"}
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1.5px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase" }}>
              Approx. Code Attribution
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--blue)", marginTop: 2 }}>
              {overallSharePct}%
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)" }}>
              {Math.round(data.overall_student_lines)} / {Math.round(data.overall_total_lines)} lines
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase" }}>
              Blame Coverage
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--green)", marginTop: 2 }}>
              {overallCoveragePct}%
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)" }}>
              {isAnyRepoProcessing ? "Analysis in progress…" : "Byte-weighted source files"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase" }}>
              Public Repositories
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--purple)", marginTop: 2 }}>
              {data.total_repositories}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)" }}>
              {ownedRepos.length} owned · {contributedRepos.length} contributed
            </div>
          </div>
        </div>
      </div>

      {/* ── Discovery Error Banner ────────────────────────────────────── */}
      {data.discovery_error && (
        <div
          className="card fade-in"
          style={{
            padding: "16px 20px",
            background: "#fff8e1",
            borderColor: "#f59e0b",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#92400e", marginBottom: 4 }}>
              Repository Discovery Issue
            </div>
            <div style={{ fontSize: "0.82rem", color: "#78350f", lineHeight: 1.5 }}>
              {data.discovery_error}
            </div>
            {data.discovery_error.toLowerCase().includes("rate limit") && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "0.78rem", color: "#92400e", marginBottom: 6, fontStyle: "italic" }}>
                  💡 To bypass the unauthenticated rate limit (60 req/hr), provide a Personal Access Token:
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.8rem",
                      border: "1px solid #d97706",
                      borderRadius: "6px",
                      background: "#fffbeb",
                      color: "#92400e",
                      width: "250px",
                    }}
                  />
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || !githubToken}
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", height: "30px" }}
                  >
                    {refreshing ? "Retrying..." : "Retry with Token"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Active Analysis Progress Banner ────────────────────────────── */}
      {isAnyRepoProcessing && (
        <div
          className="card fade-in"
          style={{
            padding: "16px 20px",
            background: "var(--blue-light)",
            borderColor: "var(--blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="spinner" style={{ width: 18, height: 18 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--blue)" }}>
                Analyzing Repositories via Git Blame…
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-mid)" }}>
                {data.repositories.filter((r) => r.status === "analysing").length} analysing ·{" "}
                {data.repositories.filter((r) => TERMINAL_STATUSES.has(r.status)).length} complete ·{" "}
                {data.repositories.length} total
              </div>
            </div>
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--blue)" }}>
            Live Polling Active
          </span>
        </div>
      )}

      {/* Incomplete Attribution Warning if needed */}
      <IncompleteAttributionBanner hasIncomplete={hasIncomplete} />

      {/* ── Empty Repositories Action ──────────────────────────────────── */}
      {data.repositories.length === 0 && !data.discovery_error && (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center", background: "var(--bg-soft)" }}>
          <FolderGit2 size={32} color="var(--blue)" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>
            No Repository Attribution Records Yet
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", maxWidth: 500, margin: "0 auto 18px", lineHeight: 1.5 }}>
            {data.github_username
              ? `Click 'Run Ownership Analysis' to discover public repositories for @${data.github_username} and compute Git blame line attributions.`
              : "Click 'Run Ownership Analysis' to discover and analyze repositories for this profile."}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-primary"
            style={{ fontSize: "0.84rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
            {refreshing ? "Analyzing Repositories…" : "Run Ownership Analysis"}
          </button>
        </div>
      )}

      {/* ── Owned Repositories Section ─────────────────────────────────── */}
      {ownedRepos.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <FolderGit2 size={20} color="var(--blue)" />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)" }}>
              Your Repositories ({ownedRepos.length})
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ownedRepos.map((repo) => (
              <RepoOwnershipCard key={repo.id || repo.repo_full_name} profileId={profileId || ""} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* No owned repos message, but contributed repos exist */}
      {ownedRepos.length === 0 && contributedRepos.length === 0 && data.repositories.length > 0 && (
        <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--text-soft)", fontSize: "0.86rem" }}>
          No owned public repositories discovered. All {data.repositories.length} repos are currently being analysed.
        </div>
      )}

      {/* ── Contributed Repositories Section ───────────────────────────── */}
      {contributedRepos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <GitPullRequest size={20} color="var(--purple)" />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)" }}>
              Contributed Repositories ({contributedRepos.length})
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {contributedRepos.map((repo) => (
              <RepoOwnershipCard key={repo.id || repo.repo_full_name} profileId={profileId || ""} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* Skill breakdown if available */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", marginBottom: 12 }}>
            Skill-Level Attribution
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {data.skills.map((sk) => {
              const pct = Math.round((sk.student_share ?? 0) * 100);
              return (
                <div
                  key={sk.skill}
                  className="card"
                  style={{ padding: "14px 18px", background: "var(--bg-soft)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>{sk.skill}</span>
                    <span style={{ fontWeight: 900, fontSize: "1rem", color: "var(--blue)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue)", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 4 }}>
                    {Math.round(sk.student_lines)} / {Math.round(sk.total_lines)} lines
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Methodology Note Footer ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "14px 18px",
          background: "var(--bg-soft)",
          border: "1.5px solid var(--border)",
          borderRadius: "10px",
          fontSize: "0.78rem",
          color: "var(--text-mid)",
          lineHeight: 1.5,
        }}
      >
        <Info size={16} color="var(--text-soft)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Deterministic Attribution Methodology:</strong> Code attribution is computed via porcelain Git blame on public repository history.
          It measures surviving source lines attributable to the candidate's GitHub identity.
          Ownership adjustments scale evidence strength deterministically and do not constitute cryptographic proof of originality or account ownership.
        </div>
      </div>
    </div>
  );
}
