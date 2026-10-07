"use client";

import { useState } from "react";
import { getCohortInsights, optimiseWorkshops } from "@/lib/api";
import type { CohortInsights, WorkshopResult } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";

const PRESET_WORKSHOPS = [
  { name: "Docker & CI/CD Bootcamp", skills_covered: ["Docker", "CI/CD", "DevOps"] },
  { name: "Testing & TDD Workshop", skills_covered: ["Testing", "Software Quality"] },
  { name: "System Design Intensive", skills_covered: ["System Design", "Data Structures & Algorithms"] },
  { name: "ML Fundamentals", skills_covered: ["Machine Learning", "Python", "Pandas", "NumPy"] },
  { name: "Frontend with React", skills_covered: ["React", "TypeScript", "CSS"] },
  { name: "REST API Design", skills_covered: ["REST API", "Node.js", "Express.js"] },
];

export default function BatchDashboard() {
  const [cohortId, setCohortId] = useState("");
  const [insights, setInsights] = useState<CohortInsights | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimising, setOptimising] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInsights() {
    if (!cohortId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCohortInsights(cohortId.trim());
      setInsights(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runOptimiser() {
    if (!cohortId.trim()) return;
    setOptimising(true);
    try {
      const res = await optimiseWorkshops(cohortId.trim(), PRESET_WORKSHOPS, 3);
      setWorkshops(res.selected_workshops);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOptimising(false);
    }
  }

  const heatmapEntries = insights?.heatmap
    ? Object.entries(insights.heatmap)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 20)
        .map(([skill, avg]) => ({ skill: skill.slice(0, 18), avg: +(avg * 100).toFixed(1) }))
    : [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      <h1 style={{ fontWeight: 800, fontSize: "1.6rem", marginBottom: 6 }}>
        Placement Cell <span className="gradient-text">Dashboard</span>
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: "0.9rem" }}>
        Batch-level skill heatmap, top gaps, and workshop optimiser.
        Stats suppressed for cohorts under 5 students.
      </p>

      {/* ── Cohort ID input ───────────────────────────────────────────── */}
      <div className="card" style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label className="input-label" htmlFor="cohort-id-input">Cohort ID</label>
          <input
            id="cohort-id-input"
            className="input"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            placeholder="Enter cohort UUID"
          />
        </div>
        <button id="load-insights-btn" className="btn btn-primary" onClick={loadInsights} disabled={loading || !cohortId}>
          {loading ? "Loading…" : "Load Insights"}
        </button>
      </div>

      {error && <div className="flag-banner" style={{ marginBottom: 20 }}><span>⚠</span><span>{error}</span></div>}

      {insights && (
        <>
          {/* Stats header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Cohort", value: insights.cohort_name },
              { label: "Students", value: insights.cohort_size },
              { label: "Heatmap skills", value: Object.keys(insights.heatmap ?? {}).length },
              { label: "Top gap", value: insights.top_gaps?.[0]?.skill ?? "—" },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: "14px 18px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Skill heatmap */}
          {heatmapEntries.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>Skill Confidence Heatmap</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 18 }}>Average evidence confidence per skill across all students (sorted ascending).</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={heatmapEntries} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#4a5578", fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="skill" width={120} tick={{ fill: "#8b9cc4", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]} name="Avg confidence %">
                    {heatmapEntries.map((e, i) => (
                      <Cell key={i} fill={e.avg < 30 ? "#f87171" : e.avg < 60 ? "#fbbf24" : "#4ade80"} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Workshop optimiser */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>Workshop Optimiser</h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Greedy coverage: selects up to 3 workshops that move the most students over the readiness threshold.
                </p>
              </div>
              <button id="run-optimiser-btn" className="btn btn-primary" onClick={runOptimiser} disabled={optimising}>
                {optimising ? "Optimising…" : "Run Optimiser"}
              </button>
            </div>

            {workshops && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {workshops.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "14px 18px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--accent-green)", flexShrink: 0 }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{w.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                        Skills: {w.skills_covered.join(", ")}
                      </div>
                      <div style={{ fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>{w.students_moved} students</span>
                        <span style={{ color: "var(--text-muted)" }}> ({w.pct_of_cohort}% of cohort) moved above readiness threshold</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
