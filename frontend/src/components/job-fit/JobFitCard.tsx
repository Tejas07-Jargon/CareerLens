"use client";

import React from "react";
import { Target, ArrowRight, ShieldCheck, Sparkles, Building2 } from "lucide-react";

interface JobFitCardProps {
  profileId?: string | null;
  targetRole?: string;
  jobTitle?: string;
  company?: string;
  overallFit?: number;
  requiredSkillsPct?: number;
  evidenceConfidencePct?: number;
  topGap?: string;
  onOpenJobFit: () => void;
}

export default function JobFitCard({
  profileId,
  targetRole,
  jobTitle = "Generative AI & Backend Engineer",
  company = "NeuralFlow Labs",
  overallFit = 82,
  requiredSkillsPct = 88,
  evidenceConfidencePct = 82,
  topGap = "Docker",
  onOpenJobFit,
}: JobFitCardProps) {
  const displayTitle = targetRole || jobTitle;
  return (
    <div
      className="card"
      style={{
        borderColor: "var(--purple)",
        boxShadow: "3px 3px 0 var(--purple)",
        padding: "20px 22px",
        background: "var(--white)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
              MARKET MATCH ENGINE
            </span>
            <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
              <Target size={17} color="var(--purple)" /> Job Fit Intelligence
            </h3>
          </div>
          <span className="badge" style={{ background: "var(--purple-light)", color: "var(--purple)", borderColor: "var(--purple)", fontSize: "0.72rem" }}>
            Live Evaluation
          </span>
        </div>

        {/* Target role & company */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: "0.92rem", color: "var(--text)" }}>{jobTitle}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <Building2 size={12} /> {company}
          </div>
        </div>

        {/* Score & breakdown */}
        <div
          style={{
            background: "var(--bg-soft)",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>OVERALL FIT</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--purple)", lineHeight: 1.1 }}>
              {Math.round(overallFit)}%
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>REQUIRED SKILLS</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text)" }}>
              {Math.round(requiredSkillsPct)}%
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>EVIDENCE</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--green)" }}>
              {Math.round(evidenceConfidencePct)}%
            </div>
          </div>
        </div>

        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontWeight: 600 }}>
          Primary priority gap: <strong style={{ color: "var(--orange)" }}>{topGap}</strong>
        </div>
      </div>

      <div style={{ paddingTop: 12, borderTop: "1.5px dashed var(--border)", marginTop: 12 }}>
        <button
          id="btn-open-job-fit-dashboard"
          onClick={onOpenJobFit}
          className="btn btn-purple"
          style={{
            width: "100%",
            fontSize: "0.80rem",
            padding: "7px 14px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          View Job Fit Intelligence <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
