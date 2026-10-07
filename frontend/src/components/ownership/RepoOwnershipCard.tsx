"use client";

import { useState } from "react";
import type { RepoSummary, RepoDetailResponse } from "@/types/ownership";
import { getRepoOwnershipDetail } from "@/lib/ownershipApi";
import OwnershipStatusBadge from "./OwnershipStatusBadge";
import SkillShareChips from "./SkillShareChips";
import FileOwnershipList from "./FileOwnershipList";
import { GitBranch, FolderGit2, ChevronDown, ChevronUp, Layers, ShieldCheck, Clock } from "lucide-react";

interface Props {
  profileId: string;
  repo: RepoSummary;
}

export default function RepoOwnershipCard({ profileId, repo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<RepoDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const studentPct = Math.round(repo.student_share * 100);
  const otherPct = Math.round(repo.other_share * 100);
  const unknownPct = Math.max(0, 100 - studentPct - otherPct);
  const coveragePct = Math.round(repo.coverage * 100);

  async function handleToggleExpand() {
    const attrId = repo.id;
    if (!expanded && !detail && attrId) {
      setLoadingDetail(true);
      try {
        const data = await getRepoOwnershipDetail(profileId, attrId);
        setDetail(data);
      } catch (err) {
        console.error("Failed to load repo detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <div
      className="card"
      style={{
        padding: "18px 20px",
        borderRadius: "12px",
        borderColor: repo.relation === "owner" ? "var(--blue)" : "var(--purple)",
        boxShadow: "3px 3px 0 var(--text)",
        background: "var(--white)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FolderGit2 size={18} color={repo.relation === "owner" ? "var(--blue)" : "var(--purple)"} />
          <span style={{ fontWeight: 900, fontSize: "0.98rem", color: "var(--text)" }}>
            {repo.repo_full_name}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "99px",
              fontSize: "0.72rem",
              fontWeight: 800,
              background: repo.relation === "owner" ? "var(--blue-light)" : "var(--purple-light)",
              color: repo.relation === "owner" ? "var(--blue)" : "var(--purple)",
              border: `1px solid ${repo.relation === "owner" ? "var(--blue)" : "var(--purple)"}`,
            }}
          >
            {repo.relation === "owner" ? "YOUR REPO" : "CONTRIBUTED TO"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <OwnershipStatusBadge status={repo.status} incomplete={repo.incomplete} />
        </div>
      </div>

      {/* ── Stacked Attribution Visual Bar ───────────────────────────────── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 800, marginBottom: 6 }}>
          <span style={{ color: "var(--text)" }}>
            Approx. Candidate Attribution: <strong style={{ color: "var(--blue)", fontSize: "0.86rem" }}>{studentPct}%</strong>
          </span>
          <span style={{ color: "var(--text-soft)", fontSize: "0.74rem" }}>
            Coverage: {coveragePct}% · SHA: {repo.head_sha ? repo.head_sha.slice(0, 7) : "pending"}
          </span>
        </div>

        <div
          style={{
            height: 12,
            width: "100%",
            background: "var(--border)",
            borderRadius: "6px",
            overflow: "hidden",
            display: "flex",
            border: "1px solid var(--border)",
          }}
          title={`Candidate: ${studentPct}%, Other Contributors: ${otherPct}%, Unattributed: ${unknownPct}%`}
        >
          <div style={{ width: `${studentPct}%`, background: "var(--blue)", transition: "width 0.3s ease" }} />
          <div style={{ width: `${otherPct}%`, background: "var(--purple)", transition: "width 0.3s ease" }} />
          <div
            style={{
              width: `${unknownPct}%`,
              background: "repeating-linear-gradient(45deg, #F7C137, #F7C137 6px, #FFF5CC 6px, #FFF5CC 12px)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: "0.74rem", color: "var(--text-mid)", fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)" }} /> Candidate ({studentPct}%)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)" }} /> Other Contributors ({otherPct}%)
          </span>
          {unknownPct > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--yellow)" }} /> Unattributed ({unknownPct}%)
            </span>
          )}
        </div>
      </div>

      {/* ── Skill Chips ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
        <SkillShareChips skills={repo.skills} />

        <button
          onClick={handleToggleExpand}
          className="btn btn-ghost"
          style={{
            padding: "4px 10px",
            fontSize: "0.78rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {expanded ? (
            <>Hide Files <ChevronUp size={14} /></>
          ) : (
            <>View Files & Ranges <ChevronDown size={14} /></>
          )}
        </button>
      </div>

      {/* ── Expanded File Drill-Down ──────────────────────────────────────── */}
      {expanded && (
        <div style={{ borderTop: "1.5px dashed var(--border)", paddingTop: 12, marginTop: 4 }}>
          {loadingDetail ? (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: "0.82rem", color: "var(--text-soft)" }}>
              <div className="spinner" style={{ width: 22, height: 22, margin: "0 auto 8px" }} />
              Loading file attribution breakdown…
            </div>
          ) : detail ? (
            <FileOwnershipList
              repoFullName={repo.repo_full_name}
              headSha={detail.head_sha ?? null}
              files={detail.file_results}
              skills={detail.skills}
            />
          ) : (
            <div style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>Details unavailable.</div>
          )}
        </div>
      )}
    </div>
  );
}
