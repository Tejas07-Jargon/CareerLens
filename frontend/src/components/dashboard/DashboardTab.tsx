"use client";

import { useState, useEffect } from "react";
import { BarChart, Target, TrendingUp, Clock, Lightbulb } from "lucide-react";

const SAMPLE_SKILLS = [
  { skill: "React / Next.js", importance: 92, marketFreq: 88, confidence: 75, priority: 80, trend: "up" },
  { skill: "System Design", importance: 95, marketFreq: 90, confidence: 40, priority: 95, trend: "stable" },
  { skill: "TypeScript", importance: 85, marketFreq: 82, confidence: 80, priority: 60, trend: "up" },
  { skill: "SQL & Databases", importance: 88, marketFreq: 86, confidence: 55, priority: 85, trend: "down" },
  { skill: "Docker / K8s", importance: 80, marketFreq: 75, confidence: 30, priority: 90, trend: "stable" },
];

const MARKET_ROLES = [
  { role: "Software Engineer", openings: 4200, avgCTC: "18 LPA", demand: 95, growth: "+12%", color: "var(--blue)" },
  { role: "Data Scientist", openings: 2800, avgCTC: "22 LPA", demand: 88, growth: "+18%", color: "var(--purple)" },
  { role: "DevOps Engineer", openings: 1900, avgCTC: "20 LPA", demand: 82, growth: "+22%", color: "var(--green)" },
];

type DashView = "gap" | "market" | "timeline";

export default function DashboardTab({ profileId }: { profileId: string | null }) {
  const [view, setView] = useState<DashView>("gap");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/profiles/${profileId}/dashboard`)
        .then(res => res.json())
        .then(d => {
          if (!d.detail) setData(d);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [profileId]);

  const skillsToRender = data && data.strongest_skills 
    ? [...data.strongest_skills, ...data.weakest_skills].map((s: any) => ({
        skill: s.name,
        importance: 85,
        marketFreq: 80,
        confidence: s.score,
        priority: 100 - s.score,
        trend: s.trend
      }))
    : SAMPLE_SKILLS;

  const isReal = !!data;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div className="card fade-in-up" style={{ borderColor: "var(--yellow)", boxShadow: "5px 5px 0 var(--yellow)", marginBottom: 24, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart size={24} /> <span className="gradient-text">Placement Dashboard</span>
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
              Market intelligence · skill gap analysis · consistency timeline
            </p>
          </div>

          {/* Sub-tab switcher */}
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { key: "gap", label: <><Target size={14} className="inline mr-1 align-text-bottom" /> Skill Gaps</> },
              { key: "market", label: <><TrendingUp size={14} className="inline mr-1 align-text-bottom" /> Market Intel</> },
              { key: "timeline", label: <><Clock size={14} className="inline mr-1 align-text-bottom" /> Timeline</> },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                id={`dash-view-${key}`}
                onClick={() => setView(key)}
                className="btn"
                style={{
                  padding: "7px 16px", fontSize: "0.82rem", fontWeight: 800,
                  background: view === key ? "var(--yellow)" : "var(--white)",
                  color: view === key ? "var(--text)" : "var(--text-mid)",
                  borderColor: view === key ? "var(--text)" : "var(--border)",
                  boxShadow: view === key ? "var(--shadow-sm)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row if real data */}
      {isReal && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: "16px", borderColor: "var(--green)", boxShadow: "3px 3px 0 var(--green)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-mid)" }}>Overall Readiness</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--green)" }}>{data.readiness.score}%</div>
          </div>
          <div className="card" style={{ padding: "16px", borderColor: "var(--purple)", boxShadow: "3px 3px 0 var(--purple)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-mid)" }}>Quiz Average</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--purple)" }}>{data.quiz_stats.average_score}%</div>
          </div>
          <div className="card" style={{ padding: "16px", borderColor: "var(--blue)", boxShadow: "3px 3px 0 var(--blue)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-mid)" }}>Total Quizzes</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--blue)" }}>{data.quiz_stats.total_quizzes}</div>
          </div>
        </div>
      )}

      {/* Note */}
      {!isReal && (
        <div className="card fade-in-up" style={{
          borderColor: "var(--blue)", boxShadow: "3px 3px 0 var(--blue)",
          background: "var(--blue-light)", marginBottom: 24, padding: "12px 16px",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <span><Lightbulb size={24} /></span>
          <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600, margin: 0 }}>
            This is sample data. Take a quiz or analyse your profile to see real gaps.
          </p>
        </div>
      )}

      {/* ── Skill Gap View ─────────────────────────────────────────────────────── */}
      {view === "gap" && (
        <div className="fade-in-up">
          <div style={{ display: "grid", gap: 14 }}>
            {skillsToRender.sort((a, b) => b.priority - a.priority).map((s, i) => {
              const gapColor = s.confidence < 50 ? "var(--pink)" : s.confidence < 70 ? "var(--orange)" : "var(--green)";
              const gapLabel = s.confidence < 50 ? "Critical Gap" : s.confidence < 70 ? "Partial" : "Covered";
              return (
                <div key={s.skill} className="card" style={{
                  borderColor: gapColor,
                  boxShadow: `3px 3px 0 ${gapColor}`,
                  padding: "16px 20px",
                  animationDelay: `${i * 0.04}s`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                    <div style={{
                      minWidth: 36, height: 36, borderRadius: "50%",
                      background: gapColor, color: "white",
                      fontWeight: 900, fontSize: "0.85rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: "0.95rem" }}>{s.skill} {s.trend === "up" ? "📈" : s.trend === "down" ? "📉" : ""}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700 }}>
                        {isReal ? "Based on Quiz Performance" : `Market demand: ${s.marketFreq}% · Importance: ${s.importance}%`}
                      </div>
                    </div>
                    <span className="badge" style={{
                      background: s.confidence < 50 ? "var(--pink-light)" : s.confidence < 70 ? "var(--orange-light)" : "var(--green-light)",
                      color: gapColor, borderColor: gapColor,
                    }}>
                      {gapLabel}
                    </span>
                  </div>
                  {/* Confidence bar */}
                  <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", marginBottom: 4, fontWeight: 700 }}>
                    Mastery Level: {Math.round(s.confidence)}%
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.confidence}%`, background: gapColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Market Intel View ──────────────────────────────────────────────────── */}
      {view === "market" && (
        <div className="fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {MARKET_ROLES.map((r, i) => (
              <div key={r.role} className="card" style={{
                borderColor: r.color, boxShadow: `4px 4px 0 ${r.color}`,
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 14, color: r.color }}>
                  {r.role}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div style={{ textAlign: "center", padding: "10px", background: "var(--bg-soft)", borderRadius: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.4rem", color: r.color }}>{r.openings.toLocaleString()}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 700 }}>Open Roles (India)</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px", background: "var(--bg-soft)", borderRadius: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.4rem", color: r.color }}>{r.avgCTC}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 700 }}>Avg Package</div>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-mid)" }}>Demand Index</span>
                    <span style={{ fontWeight: 900, fontSize: "0.78rem", color: r.color }}>{r.demand}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${r.demand}%`, background: r.color }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
                    <TrendingUp size={14} /> {r.growth} YoY
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Timeline View ──────────────────────────────────────────────────────── */}
      {view === "timeline" && (
        <div className="fade-in-up">
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { month: "Jan 2025", event: "Started learning React & Next.js", type: "skill", color: "var(--blue)" },
              { month: "Feb 2025", event: "Contributed to open-source project (500+ stars)", type: "achievement", color: "var(--green)" },
              { month: "Mar 2025", event: "Built full-stack app deployed to Vercel", type: "project", color: "var(--purple)" },
              { month: "Apr 2025", event: "Completed System Design Primer", type: "skill", color: "var(--blue)" },
              { month: "May 2025", event: "Internship at early-stage startup", type: "achievement", color: "var(--orange)" },
              { month: "Jul 2025", event: "Published technical blog (2k reads)", type: "achievement", color: "var(--green)" },
              { month: "Sep 2025", event: "DSA: solved 200+ LeetCode problems", type: "skill", color: "var(--blue)" },
              { month: "Oct 2025", event: "CareerLens profile analysed", type: "current", color: "var(--pink)" },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  minWidth: 12, height: 12, borderRadius: "50%",
                  background: e.color, border: `2px solid ${e.color}`,
                  marginTop: 6,
                  boxShadow: e.type === "current" ? `0 0 0 4px ${e.color}33` : "none",
                }} />
                <div className="card" style={{
                  flex: 1, padding: "12px 16px",
                  borderColor: e.color, boxShadow: `2px 2px 0 ${e.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{e.event}</div>
                    <span className="badge" style={{ fontSize: "0.68rem" }}>{e.month}</span>
                  </div>
                  <span className="badge" style={{
                    marginTop: 6,
                    background: e.color + "22", color: e.color, borderColor: e.color,
                    fontSize: "0.68rem",
                  }}>
                    {e.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
