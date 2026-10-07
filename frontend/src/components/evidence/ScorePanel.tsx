"use client";

import type { ScoreInterval, ScoreComponents, Credibility, RoleFit } from "@/types";
import Link from "next/link";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Search } from "lucide-react";

interface Props {
  score: ScoreInterval;
  components: ScoreComponents;
  credibility: Credibility;
  roleFits: RoleFit[];
}

const COMPONENT_LABELS: Record<string, string> = {
  skill_coverage:         "Skill Coverage",
  project_depth:          "Project Depth",
  consistency_growth:     "Consistency & Growth",
  portfolio_presentation: "Portfolio Depth",
  professional_signals:   "Engineering Signals",
};

const COMPONENT_COLORS: Record<string, string> = {
  skill_coverage:         "var(--blue)",
  project_depth:          "var(--purple)",
  consistency_growth:     "var(--green)",
  portfolio_presentation: "var(--orange)",
  professional_signals:   "var(--teal)",
};

function ScoreRing({ value, lo, hi }: { value: number; lo: number; hi: number }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  const filled = (value / 100) * C;

  return (
    <div style={{ position: "relative", width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx="90" cy="90" r={R} className="score-ring-track" strokeWidth="12" stroke="var(--border)" />
        {/* Range arc (lo–hi) */}
        <circle
          cx="90" cy="90" r={R}
          fill="none"
          stroke="rgba(79,163,224,0.2)"
          strokeWidth="12"
          strokeDasharray={`${((hi - lo) / 100) * C} ${C}`}
          strokeDashoffset={-((lo / 100) * C)}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <circle
          cx="90" cy="90" r={R}
          className="score-ring-fill"
          stroke="url(#scoreGrad)"
          strokeWidth="12"
          strokeDasharray={`${filled} ${C}`}
          strokeDashoffset="0"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--blue)" />
            <stop offset="100%" stopColor="var(--purple)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: "2.6rem", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>
          {value.toFixed(0)}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 4, fontWeight: 800 }}>
          {lo.toFixed(0)}–{hi.toFixed(0)} CI
        </div>
      </div>
    </div>
  );
}

export default function ScorePanel({ score, components, credibility, roleFits }: Props) {
  const radarData = Object.entries(components).map(([key, val]) => ({
    subject: COMPONENT_LABELS[key] ?? key,
    value: val.value,
    fullMark: 100,
  }));

  return (
    <div className="card fade-in-up" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 32,
      alignItems: "center",
      borderColor: "var(--blue)",
      boxShadow: "5px 5px 0 var(--blue)",
      padding: "28px 24px"
    }}>

      {/* Score ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <ScoreRing value={score.mid} lo={score.lo} hi={score.hi} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 800, marginBottom: 4 }}>Job Readiness Score</div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600 }}>
            Credibility: <strong style={{ color: credibility.verified_ratio >= 0.6 ? "var(--green)" : "var(--orange)" }}>
              {(credibility.verified_ratio * 100).toFixed(0)}%
            </strong>
            <span style={{ color: "var(--text-soft)" }}> ({credibility.verified_count}/{credibility.total_claims} verified)</span>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Evidence Confidence Supporting Factor */}
        <Link
          href="/evidence"
          style={{
            textDecoration: "none",
            background: "var(--blue-light)",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1.5px solid var(--blue)",
            display: "block",
            transition: "transform 0.15s ease",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: "0.82rem", color: "var(--blue)", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={14} /> Evidence Confidence (Proof-of-Work)
            </span>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--blue)" }}>
              {Math.round((credibility.verified_ratio * 100) || 78)}% ↗
            </span>
          </div>
          <div className="progress-bar" style={{ height: 5 }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round((credibility.verified_ratio * 100) || 78)}%`, background: "var(--blue)" }}
            />
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-mid)", marginTop: 3 }}>
            Click to view evidence verification breakdown & sources
          </div>
        </Link>

        {Object.entries(components).map(([key, comp], idx) => {
          const color = COMPONENT_COLORS[key] ?? "var(--blue)";
          return (
            <div key={key} className={`fade-in-up stagger-${idx + 1}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 800 }}>
                  {COMPONENT_LABELS[key] ?? key}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 900, color }}>
                  {comp.value.toFixed(0)}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-bar-fill" style={{ width: `${comp.value}%`, background: color }} />
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginTop: 4, fontWeight: 600 }}>
                {comp.reason}
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div style={{ width: "100%", height: 220, minWidth: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" strokeWidth={1.5} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-mid)", fontSize: 10, fontWeight: 700 }} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="var(--blue)"
              fill="var(--blue)"
              fillOpacity={0.25}
              strokeWidth={2.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

