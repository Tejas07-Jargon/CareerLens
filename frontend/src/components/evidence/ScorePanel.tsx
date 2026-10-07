"use client";

import type { ScoreInterval, ScoreComponents, Credibility, RoleFit } from "@/types";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

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
  portfolio_presentation: "Portfolio",
  professional_signals:   "Professional",
};

function ScoreRing({ value, lo, hi }: { value: number; lo: number; hi: number }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  const filled = (value / 100) * C;

  return (
    <div style={{ position: "relative", width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx="90" cy="90" r={R} className="score-ring-track" strokeWidth="10" />
        {/* Range arc (lo–hi) */}
        <circle
          cx="90" cy="90" r={R}
          fill="none"
          stroke="rgba(79,158,255,0.18)"
          strokeWidth="10"
          strokeDasharray={`${((hi - lo) / 100) * C} ${C}`}
          strokeDashoffset={-((lo / 100) * C)}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <circle
          cx="90" cy="90" r={R}
          className="score-ring-fill"
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          strokeDasharray={`${filled} ${C}`}
          strokeDashoffset="0"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f9eff" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1,
          background: "var(--gradient-accent)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {value.toFixed(0)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
          {lo.toFixed(0)}–{hi.toFixed(0)}
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
    <div className="card" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 32, alignItems: "start", flexWrap: "wrap" }}>

      {/* Score ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <ScoreRing value={score.mid} lo={score.lo} hi={score.hi} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Job Readiness Score</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Credibility: <span style={{ color: credibility.verified_ratio > 0.6 ? "var(--accent-green)" : "var(--accent-amber)", fontWeight: 600 }}>
              {(credibility.verified_ratio * 100).toFixed(0)}%
            </span>
            <span style={{ color: "var(--text-muted)" }}> verified ({credibility.verified_count}/{credibility.total_claims})</span>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(components).map(([key, comp]) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {COMPONENT_LABELS[key] ?? key}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {comp.value.toFixed(0)}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${comp.value}%` }} />
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
              {comp.reason}
            </div>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      <div style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#8b9cc4", fontSize: 9 }} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#4f9eff"
              fill="#4f9eff"
              fillOpacity={0.18}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
