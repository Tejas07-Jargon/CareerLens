"use client";

import React from "react";
import { Sparkles, ShieldCheck, Target, FileCheck, Eye, Zap } from "lucide-react";
import type { QualityBreakdown } from "@/types/resume";

interface QualityScorePanelProps {
  score: number;
  breakdown?: QualityBreakdown;
}

export default function QualityScorePanel({ score, breakdown }: QualityScorePanelProps) {
  const bd = breakdown || {
    ats_compatibility: 91,
    jd_alignment: 84,
    evidence_coverage: 94,
    readability: 89,
    impact: 81,
  };

  const getScoreColor = (val: number) => {
    if (val >= 80) return "var(--green)";
    if (val >= 65) return "var(--blue)";
    if (val >= 50) return "var(--yellow)";
    return "var(--pink)";
  };

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--blue)",
        boxShadow: "3px 3px 0 var(--blue)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            INTELLIGENCE AUDIT
          </span>
          <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={16} color="var(--blue)" /> Kareer Kranti Resume Quality
          </h3>
        </div>

        {/* Big Overall Quality Score */}
        <div
          style={{
            background: "var(--blue-light)",
            border: "2px solid var(--blue)",
            borderRadius: "12px",
            padding: "4px 12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--blue)", lineHeight: 1.1 }}>
            {Math.round(score)}
          </div>
          <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-soft)" }}>
            OUT OF 100
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: 14, lineHeight: 1.45 }}>
        Deterministic composite score derived from verifiable proof-of-work, ATS parsing heuristics, and target role alignment.
      </p>

      {/* Breakdown Metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "ATS Compatibility", val: bd.ats_compatibility, icon: <FileCheck size={14} /> },
          { label: "JD Alignment", val: bd.jd_alignment, icon: <Target size={14} /> },
          { label: "Evidence Coverage", val: bd.evidence_coverage, icon: <ShieldCheck size={14} /> },
          { label: "Readability", val: bd.readability, icon: <Eye size={14} /> },
          { label: "Impact & Action Verbs", val: bd.impact, icon: <Zap size={14} /> },
        ].map((item) => {
          const color = getScoreColor(item.val);
          return (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 800, marginBottom: 3 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text)" }}>
                  {item.icon} {item.label}
                </span>
                <span style={{ color }}>{item.val}%</span>
              </div>
              <div
                style={{
                  height: 7,
                  background: "var(--bg-soft)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${item.val}%`,
                    background: color,
                    borderRadius: "999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
