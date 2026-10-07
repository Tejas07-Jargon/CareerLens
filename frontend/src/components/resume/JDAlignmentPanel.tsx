"use client";

import React from "react";
import { Target, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Sliders, Map } from "lucide-react";
import type { ResumeOptimizationResult } from "@/types/resume";

interface JDAlignmentPanelProps {
  optimization?: ResumeOptimizationResult;
  onNavigateRoadmap?: () => void;
  onNavigateWhatIf?: (gapSkill: string) => void;
}

export default function JDAlignmentPanel({
  optimization,
  onNavigateRoadmap,
  onNavigateWhatIf,
}: JDAlignmentPanelProps) {
  if (!optimization) return null;

  const {
    target_role,
    overall_alignment,
    skills_covered,
    project_relevance,
    keyword_coverage,
    evidence_backed_claims,
    matched_skills,
    jd_gaps,
  } = optimization;

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--purple)",
        boxShadow: "3px 3px 0 var(--purple)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            MARKET FIT ANALYSIS
          </span>
          <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Target size={16} color="var(--purple)" /> Target Role &amp; JD Alignment
          </h3>
        </div>

        <span
          className="badge"
          style={{
            background: "var(--purple-light)",
            color: "var(--purple)",
            borderColor: "var(--purple)",
            fontWeight: 900,
          }}
        >
          {overall_alignment}% Alignment
        </span>
      </div>

      {/* Metric 4-grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "var(--bg-soft)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>SKILLS COVERED</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text)" }}>{skills_covered}%</div>
        </div>
        <div style={{ background: "var(--bg-soft)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>PROJECT RELEVANCE</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text)" }}>{project_relevance}%</div>
        </div>
        <div style={{ background: "var(--bg-soft)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>KEYWORD DENSITY</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text)" }}>{keyword_coverage}%</div>
        </div>
        <div style={{ background: "var(--bg-soft)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>EVIDENCE-BACKED</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--green)" }}>{evidence_backed_claims}%</div>
        </div>
      </div>

      {/* Matched Verified Skills */}
      {matched_skills && matched_skills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--green)", textTransform: "uppercase", marginBottom: 6 }}>
            ✓ Verified Target Matches ({matched_skills.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {matched_skills.map((s) => (
              <span
                key={s}
                className="badge"
                style={{
                  background: "var(--green-light)",
                  color: "var(--green)",
                  borderColor: "var(--green)",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                ✓ {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* JD Gaps & Recommendations */}
      <div>
        <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--orange)", textTransform: "uppercase", marginBottom: 8 }}>
          △ Identified JD Gaps &amp; Next Actions
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jd_gaps && jd_gaps.length > 0 ? (
            jd_gaps.slice(0, 4).map((gap) => (
              <div
                key={gap.skill}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "var(--bg-soft)",
                  border: "1.5px solid var(--border)",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 900, color: "var(--text)" }}>{gap.skill}</span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        fontWeight: 800,
                        background: gap.importance === "HIGH" ? "var(--pink-light)" : "var(--yellow-light)",
                        color: gap.importance === "HIGH" ? "var(--pink)" : "var(--orange)",
                      }}
                    >
                      {gap.importance} IMPORTANCE
                    </span>
                  </div>
                  <span style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>
                    Evidence: {gap.evidence_level}
                  </span>
                </div>

                <div style={{ color: "var(--text-mid)", fontSize: "0.74rem", marginBottom: 6 }}>
                  {gap.recommendation}
                </div>

                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {onNavigateWhatIf && (
                    <button
                      onClick={() => onNavigateWhatIf(gap.skill)}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.70rem", padding: "2px 6px", fontWeight: 800, color: "var(--purple)" }}
                    >
                      <Sliders size={11} /> Simulate What-If
                    </button>
                  )}
                  {onNavigateRoadmap && (
                    <button
                      onClick={onNavigateRoadmap}
                      className="btn"
                      style={{ fontSize: "0.70rem", padding: "2px 8px", background: "var(--white)", borderColor: "var(--blue)", color: "var(--blue)", fontWeight: 800 }}
                    >
                      <Map size={11} /> 10-Wk Plan
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 700 }}>
              All core requirements for {target_role} are well represented with verifiable evidence!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
