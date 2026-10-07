"use client";

import type { ProfileReport } from "@/types";
import ScorePanel from "./ScorePanel";
import EvidenceDashboardWidget from "./EvidenceDashboardWidget";
import ClaimList from "./ClaimList";
import GapChart from "../dashboard/GapChart";
import RoadmapList from "./RoadmapList";
import SecurityFlagBanner from "./SecurityFlagBanner";
import WhatIfPanel from "./WhatIfPanel";
import ConsistencyChart from "../dashboard/ConsistencyChart";
import { Sparkles, ArrowLeft } from "lucide-react";

interface Props {
  report: ProfileReport;
  persona: "student" | "placement";
  onReset: () => void;
  onOpenDashboard?: () => void;
}

export default function ReportView({ report, persona, onReset, onOpenDashboard }: Props) {
  const hasFlags = report.security_flags?.length > 0;

  return (
    <div className="fade-in-up" style={{ maxWidth: 980, margin: "0 auto" }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 32, flexWrap: "wrap", gap: 12,
        padding: "20px 24px",
        background: "var(--white)",
        border: "2.5px solid var(--text)",
        borderRadius: "14px 17px 13px 16px",
        boxShadow: "4px 4px 0 var(--blue)",
      }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.7rem", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={24} color="var(--yellow)" /> Your <span className="gradient-text">Readiness Report</span>
          </h1>
          <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
            Profile: <code>{report.profile_id}</code> ·{" "}
            Role: <strong style={{ color: "var(--blue)" }}>{report.role_fits?.[0]?.role ?? "—"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onOpenDashboard && (
            <button
              id="report-back-to-dashboard-btn"
              onClick={onOpenDashboard}
              className="btn btn-ghost"
              style={{ fontSize: "0.88rem", fontWeight: 800 }}
            >
              ← Command Center
            </button>
          )}
          <button id="reset-btn" onClick={onReset} className="btn" style={{ fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderColor: "var(--border)" }}>
            <ArrowLeft size={16} /> Analyse another
          </button>
        </div>
      </div>

      {/* ── Security flags ────────────────────────────────────────── */}
      {hasFlags && (
        <div style={{ marginBottom: 24 }}>
          <SecurityFlagBanner flags={report.security_flags} />
        </div>
      )}

      {/* ── Score ─────────────────────────────────────────────────── */}
      <ScorePanel
        score={report.score}
        components={report.components}
        credibility={report.credibility}
        roleFits={report.role_fits}
      />

      {/* ── Evidence Confidence Dashboard Widget ──────────────────── */}
      <div style={{ marginTop: 24 }}>
        <EvidenceDashboardWidget profileId={report.profile_id} />
      </div>

      {/* ── Claims ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <ClaimList claimStatuses={report.claim_statuses} />
      </div>

      {/* ── Gap chart ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <GapChart gaps={report.gaps} />
      </div>

      {/* ── Consistency ───────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <ConsistencyChart claimStatuses={report.claim_statuses} />
      </div>

      {/* ── What-if ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <WhatIfPanel profileId={report.profile_id} currentScore={report.score} />
      </div>

      {/* ── Roadmap ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 24, marginBottom: 48 }}>
        <RoadmapList milestones={report.roadmap} />
      </div>
    </div>
  );
}
