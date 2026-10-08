"use client";

import React from "react";
import { Target, Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, Building2, MapPin, Briefcase } from "lucide-react";
import type { JobFitResult } from "@/types/jobFit";

interface JobFitHeroProps {
  jobFit: JobFitResult;
  onOpenJDSelector: () => void;
  onOptimizeResume?: () => void;
}

export default function JobFitHero({ jobFit, onOpenJDSelector, onOptimizeResume }: JobFitHeroProps) {
  const { job, overall_fit_score, fit_level, score_breakdown, explanations } = jobFit;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--green)";
    if (score >= 65) return "var(--blue)";
    if (score >= 50) return "var(--yellow)";
    return "var(--pink)";
  };

  const scoreColor = getScoreColor(overall_fit_score);

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--text)",
        boxShadow: "4px 4px 0 var(--text)",
        padding: "24px 26px",
      }}
    >
      {/* Top Job Information Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
              TARGET JOB ANALYSIS
            </span>
            <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)", fontSize: "0.70rem" }}>
              ● Evidence-Backed
            </span>
          </div>

          <h1 style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            {job.title}
          </h1>

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 16px", marginTop: 6, fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Building2 size={14} color="var(--purple)" /> {job.company}
            </span>
            {job.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={14} color="var(--teal)" /> {job.location}
              </span>
            )}
            {job.experience_level && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Briefcase size={14} color="var(--orange)" /> {job.experience_level}
              </span>
            )}
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            id="btn-switch-target-jd"
            onClick={onOpenJDSelector}
            className="btn"
            style={{ fontSize: "0.80rem", padding: "7px 14px", background: "var(--white)", borderColor: "var(--border)", fontWeight: 800 }}
          >
            Switch Job / Paste JD →
          </button>
          {onOptimizeResume && (
            <button
              id="btn-optimize-resume-jobfit"
              onClick={onOptimizeResume}
              className="btn btn-purple"
              style={{ fontSize: "0.80rem", padding: "7px 16px", fontWeight: 900, display: "flex", alignItems: "center", gap: 5 }}
            >
              <Sparkles size={14} /> Optimize Resume for this Job
            </button>
          )}
        </div>
      </div>

      {/* Main Score Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 280px) 1fr",
          gap: 20,
          background: "var(--bg-soft)",
          padding: "20px 22px",
          borderRadius: "14px",
          border: "2px solid var(--border)",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        {/* Left: Big Job Fit Score Hero */}
        <div style={{ textAlign: "center", borderRight: "2px dashed var(--border)", paddingRight: 16 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
            KAREER KRANTI JOB FIT
          </div>
          <div style={{ fontSize: "3.2rem", fontWeight: 900, color: scoreColor, lineHeight: 1.05, letterSpacing: "-0.04em" }}>
            {overall_fit_score}<span style={{ fontSize: "1.4rem", color: "var(--text-soft)", fontWeight: 700 }}>%</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span
              className="badge"
              style={{
                fontSize: "0.78rem",
                fontWeight: 900,
                padding: "3px 10px",
                background: overall_fit_score >= 75 ? "var(--green-light)" : "var(--yellow-light)",
                color: overall_fit_score >= 75 ? "var(--green)" : "var(--orange)",
                borderColor: overall_fit_score >= 75 ? "var(--green)" : "var(--yellow)",
              }}
            >
              ★ {fit_level}
            </span>
          </div>
        </div>

        {/* Right: 4-Metric Evidence Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "var(--white)", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 800 }}>CRITICAL SKILLS</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
              {scoreBreakdownDisplay(score_breakdown.critical_skills_covered, score_breakdown.critical_coverage_pct)}
            </div>
            <div style={{ fontSize: "0.70rem", color: "var(--green)", fontWeight: 700, marginTop: 2 }}>
              Must-have criteria verified
            </div>
          </div>

          <div style={{ background: "var(--white)", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 800 }}>REQUIRED COVERAGE</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--blue)", marginTop: 2 }}>
              {score_breakdown.required_skill_coverage}%
            </div>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700, marginTop: 2 }}>
              {score_breakdown.verified_skills_count} of {score_breakdown.total_skills_count} skills proven
            </div>
          </div>

          <div style={{ background: "var(--white)", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 800 }}>EVIDENCE STRENGTH</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--green)", marginTop: 2 }}>
              {score_breakdown.evidence_confidence}%
            </div>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700, marginTop: 2 }}>
              AST &amp; commit telemetry
            </div>
          </div>

          <div style={{ background: "var(--white)", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 800 }}>PROJECT RELEVANCE</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--purple)", marginTop: 2 }}>
              {score_breakdown.project_relevance}%
            </div>
            <div style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700, marginTop: 2 }}>
              Repo stack alignment
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Narrative Insights (Strongest Advantage vs Biggest Risk) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "var(--green-light)",
            border: "1.5px solid var(--green)",
            fontSize: "0.80rem",
            color: "var(--text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, color: "var(--green)", marginBottom: 3, textTransform: "uppercase", fontSize: "0.74rem" }}>
            <CheckCircle2 size={14} /> Strongest Advantage
          </div>
          <div style={{ lineHeight: 1.45 }}>{explanations.strongest_advantage}</div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "var(--yellow-light)",
            border: "1.5px solid var(--yellow)",
            fontSize: "0.80rem",
            color: "var(--text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, color: "var(--orange)", marginBottom: 3, textTransform: "uppercase", fontSize: "0.74rem" }}>
            <AlertTriangle size={14} /> Primary Risk Factor
          </div>
          <div style={{ lineHeight: 1.45 }}>{explanations.biggest_risk}</div>
        </div>
      </div>
    </div>
  );
}

function scoreBreakdownDisplay(ratio: string, pct: number) {
  return `${ratio} (${pct}%)`;
}
