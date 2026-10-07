"use client";

import type { ProfileReport } from "@/types";
import ScorePanel from "./ScorePanel";
import ClaimList from "./ClaimList";
import GapChart from "../dashboard/GapChart";
import RoadmapList from "./RoadmapList";
import SecurityFlagBanner from "./SecurityFlagBanner";
import WhatIfPanel from "./WhatIfPanel";
import ConsistencyChart from "../dashboard/ConsistencyChart";

interface Props {
  report: ProfileReport;
  persona: "student" | "placement";
  onReset: () => void;
}

export default function ReportView({ report, persona, onReset }: Props) {
  const hasFlags = report.security_flags?.length > 0;

  return (
    <div className="fade-in-up" style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.6rem", marginBottom: 4 }}>
            Your <span className="gradient-text">Readiness Report</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Profile ID: <code>{report.profile_id}</code> ·{" "}
            Role: <strong style={{ color: "var(--text-primary)" }}>{report.role_fits?.[0]?.role ?? "—"}</strong>
          </p>
        </div>
        <button id="reset-btn" onClick={onReset} className="btn btn-ghost" style={{ fontSize: "0.85rem" }}>
          ← Analyse another profile
        </button>
      </div>

      {/* ── Security flags (shown first) ───────────────────────────────── */}
      {hasFlags && (
        <div style={{ marginBottom: 24 }}>
          <SecurityFlagBanner flags={report.security_flags} />
        </div>
      )}

      {/* ── Score + credibility ────────────────────────────────────────── */}
      <ScorePanel
        score={report.score}
        components={report.components}
        credibility={report.credibility}
        roleFits={report.role_fits}
      />

      {/* ── Claim evidence list ────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <ClaimList claimStatuses={report.claim_statuses} />
      </div>

      {/* ── Gap chart ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <GapChart gaps={report.gaps} />
      </div>

      {/* ── Consistency timeline ───────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <ConsistencyChart claimStatuses={report.claim_statuses} />
      </div>

      {/* ── What-if simulator ─────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <WhatIfPanel profileId={report.profile_id} currentScore={report.score} />
      </div>

      {/* ── Roadmap ───────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, marginBottom: 48 }}>
        <RoadmapList milestones={report.roadmap} />
      </div>
    </div>
  );
}
