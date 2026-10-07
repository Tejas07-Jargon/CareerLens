"use client";

import React from "react";
import { FileText, Sparkles, ShieldCheck, Target, ArrowRight } from "lucide-react";

interface ResumeCardProps {
  targetRole?: string;
  qualityScore?: number;
  jdAlignment?: number;
  evidenceCoverage?: number;
  onOpenBuilder: () => void;
}

export default function ResumeCard({
  targetRole = "AI Engineer",
  qualityScore = 86,
  jdAlignment = 84,
  evidenceCoverage = 94,
  onOpenBuilder,
}: ResumeCardProps) {
  return (
    <div
      className="card"
      style={{
        borderColor: "var(--blue)",
        boxShadow: "3px 3px 0 var(--blue)",
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
              PROOF-BACKED RESUME
            </span>
            <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
              <FileText size={17} color="var(--blue)" /> Resume Health
            </h3>
          </div>
          <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)", fontSize: "0.72rem" }}>
            {targetRole}
          </span>
        </div>

        {/* Big Quality Score row */}
        <div
          style={{
            background: "var(--bg-soft)",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>RESUME QUALITY</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--blue)", lineHeight: 1.1 }}>
              {Math.round(qualityScore)} <span style={{ fontSize: "0.74rem", color: "var(--text-soft)" }}>/ 100</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>JD ALIGNMENT</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text)" }}>
              {Math.round(jdAlignment)}%
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>EVIDENCE</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--green)" }}>
              {Math.round(evidenceCoverage)}%
            </div>
          </div>
        </div>

        <p style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 600, margin: 0 }}>
          Tailored to verifiable GitHub repositories and static analysis. Zero fabricated claims.
        </p>
      </div>

      <div style={{ paddingTop: 12, borderTop: "1.5px dashed var(--border)", marginTop: 12 }}>
        <button
          id="btn-open-resume-builder-dashboard"
          onClick={onOpenBuilder}
          className="btn btn-primary"
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
          Open Resume Builder <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
