"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Target, Calendar, CheckCircle, BarChart, AlertTriangle } from "lucide-react";
import { getCohortData } from "@/lib/api";

const SAMPLE_STUDENTS = [
  { name: "Arjun Sharma", role: "Software Engineer", score: 82, status: "Ready", gaps: ["System Design", "K8s"], color: "var(--green)" },
  { name: "Priya Nair", role: "Data Scientist", score: 74, status: "Near-Ready", gaps: ["SQL Optimization", "MLOps"], color: "var(--blue)" },
  { name: "Rohit Verma", role: "DevOps Engineer", score: 61, status: "Developing", gaps: ["Kubernetes", "Terraform", "Monitoring"], color: "var(--orange)" },
  { name: "Sneha Patel", role: "Frontend Developer", score: 88, status: "Ready", gaps: ["Performance"], color: "var(--green)" },
  { name: "Karan Mehta", role: "ML Engineer", score: 55, status: "Developing", gaps: ["Deep Learning", "System Design", "Cloud"], color: "var(--orange)" },
  { name: "Ananya Roy", role: "Backend Developer", score: 79, status: "Near-Ready", gaps: ["Distributed Systems"], color: "var(--blue)" },
  { name: "Dev Gupta", role: "Software Engineer", score: 43, status: "Needs Work", gaps: ["DSA", "System Design", "Git"], color: "var(--pink)" },
  { name: "Meera Iyer", role: "Product Manager", score: 91, status: "Ready", gaps: [], color: "var(--green)" },
];

const TOP_GAPS = [
  { skill: "System Design", count: 5, severity: 90, color: "var(--pink)" },
  { skill: "Kubernetes / DevOps", count: 4, severity: 78, color: "var(--orange)" },
  { skill: "SQL & Databases", count: 3, severity: 65, color: "var(--yellow)" },
  { skill: "DSA", count: 3, severity: 62, color: "var(--yellow)" },
  { skill: "MLOps", count: 2, severity: 50, color: "var(--blue)" },
];

const WORKSHOPS = [
  { name: "System Design Bootcamp", skillsCovered: ["System Design", "Distributed Systems"], reach: 5, duration: "2 days" },
  { name: "Cloud & DevOps Intensive", skillsCovered: ["Kubernetes", "Terraform", "Cloud"], reach: 4, duration: "3 days" },
  { name: "SQL Mastery", skillsCovered: ["SQL & Databases", "SQL Optimization"], reach: 3, duration: "1 day" },
  { name: "DSA Sprint", skillsCovered: ["DSA", "Algorithms"], reach: 3, duration: "1 day" },
];

interface BatchTabProps {
  onSelectCandidate?: (profileId: string) => void;
}

export default function BatchTab({ onSelectCandidate }: BatchTabProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"overview" | "gaps" | "workshops">("overview");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCohortData()
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const readyCount = students.filter((s) => s.status === "Ready").length;
  const avgScore = students.length > 0 ? Math.round(students.reduce((a, b) => a + b.score, 0) / students.length) : 0;

  function toggleStudent(name: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div className="card fade-in-up" style={{ borderColor: "var(--teal)", boxShadow: "5px 5px 0 var(--teal)", marginBottom: 24, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={24} /> <span className="gradient-text">Placement Cell</span> Dashboard
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
              Batch analytics · gap prioritisation · workshop optimisation
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["overview", "gaps", "workshops"] as const).map((s) => (
              <button
                key={s}
                id={`batch-section-${s}`}
                onClick={() => setActiveSection(s)}
                className="btn"
                style={{
                  padding: "7px 16px", fontSize: "0.8rem", fontWeight: 800,
                  background: activeSection === s ? "var(--teal)" : "var(--white)",
                  color: activeSection === s ? "white" : "var(--text-mid)",
                  borderColor: activeSection === s ? "var(--text)" : "var(--border)",
                  boxShadow: activeSection === s ? "var(--shadow-sm)" : "none",
                }}
              >
                {s === "overview" ? <><Users size={14} className="inline mr-1 align-text-bottom" /> Batch</> : s === "gaps" ? <><Target size={14} className="inline mr-1 align-text-bottom" /> Gap Map</> : <><Calendar size={14} className="inline mr-1 align-text-bottom" /> Workshops</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Students", value: students.length, color: "var(--blue)", bg: "var(--blue-light)", icon: <Users size={24} /> },
          { label: "Placement Ready", value: readyCount, color: "var(--green)", bg: "var(--green-light)", icon: <CheckCircle size={24} /> },
          { label: "Avg Score", value: `${avgScore}%`, color: "var(--purple)", bg: "var(--purple-light)", icon: <BarChart size={24} /> },
          { label: "Top Gap", value: "Sys Design", color: "var(--pink)", bg: "var(--pink-light)", icon: <AlertTriangle size={24} /> },
        ].map((stat) => (
          <div key={stat.label} className="card fade-in-up" style={{
            borderColor: stat.color, boxShadow: `3px 3px 0 ${stat.color}`,
            background: stat.bg, padding: "16px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 4, display: "flex", justifyContent: "center" }}>{stat.icon}</div>
            <div style={{ fontWeight: 900, fontSize: "1.5rem", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 700 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────────── */}
      {activeSection === "overview" && (
        <div className="fade-in-up">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontWeight: 900, fontSize: "1rem" }}>Student Roster ({students.length})</h3>
            {selectedStudents.size > 0 && (
              <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)" }}>
                {selectedStudents.size} selected
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-mid)", fontWeight: 600 }}>Loading profiles...</div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-mid)", fontWeight: 600 }}>No candidates registered yet.</div>
          ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {students.map((s, i) => (
              <div
                key={s.name}
                className="card"
                style={{
                  borderColor: selectedStudents.has(s.name) ? "var(--blue)" : s.color,
                  boxShadow: `3px 3px 0 ${selectedStudents.has(s.name) ? "var(--blue)" : s.color}`,
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  background: selectedStudents.has(s.name) ? "var(--blue-light)" : "var(--white)",
                  cursor: "pointer", animationDelay: `${i * 0.03}s`,
                  transition: "all 0.15s var(--bounce)",
                }}
                onClick={() => toggleStudent(s.name)}
              >
                <input
                  type="checkbox"
                  id={`student-${s.name}`}
                  checked={selectedStudents.has(s.name)}
                  onChange={() => toggleStudent(s.name)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 18, height: 18, accentColor: "var(--blue)", flexShrink: 0 }}
                />
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: s.color, color: "white",
                  fontWeight: 900, fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, border: "2px solid var(--text)",
                }}>
                  {s.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: "0.92rem" }}>{s.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700 }}>{s.role}</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: s.color }}>{s.score}%</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-soft)", fontWeight: 700 }}>score</div>
                </div>
                <span className="badge" style={{
                  minWidth: 90, justifyContent: "center",
                  background: s.status === "Ready" ? "var(--green-light)" : s.status === "Near-Ready" ? "var(--blue-light)" : s.status === "Developing" ? "var(--orange-light)" : "var(--pink-light)",
                  color: s.color, borderColor: s.color,
                }}>
                  {s.status}
                </span>
                {s.gaps.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 200 }}>
                    {s.gaps.slice(0, 2).map((g: string) => (
                      <span key={g} className="badge" style={{ fontSize: "0.62rem", background: "var(--bg-soft)", color: "var(--text-mid)", borderColor: "var(--border)" }}>
                        {g}
                      </span>
                    ))}
                    {s.gaps.length > 2 && (
                      <span className="badge" style={{ fontSize: "0.62rem", background: "var(--bg-soft)", color: "var(--text-mid)", borderColor: "var(--border)" }}>
                        +{s.gaps.length - 2}
                      </span>
                    )}
                  </div>
                )}
                {onSelectCandidate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(s.id);
                    }}
                    className="btn"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      background: "white",
                      borderColor: "var(--border)",
                      color: "var(--text)"
                    }}
                  >
                    View Profile
                  </button>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ── Gap Map ───────────────────────────────────────────────────────────────── */}
      {activeSection === "gaps" && (
        <div className="fade-in-up">
          <h3 style={{ fontWeight: 900, marginBottom: 16, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}><Target size={20} /> Cohort-Wide Skill Gaps (Priority Order)</h3>
          <div style={{ display: "grid", gap: 14 }}>
            {TOP_GAPS.map((g, i) => (
              <div key={g.skill} className="card" style={{ borderColor: g.color, boxShadow: `3px 3px 0 ${g.color}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <div style={{
                    minWidth: 36, height: 36, borderRadius: "50%",
                    background: g.color, color: "white",
                    fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "0.95rem" }}>{g.skill}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700 }}>
                      {g.count} students affected
                    </div>
                  </div>
                  <span className="badge" style={{ background: g.color + "22", color: g.color, borderColor: g.color }}>
                    Severity: {g.severity}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${g.severity}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Workshops ─────────────────────────────────────────────────────────────── */}
      {activeSection === "workshops" && (
        <div className="fade-in-up">
          <h3 style={{ fontWeight: 900, marginBottom: 16, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}><Calendar size={20} /> Recommended Workshops</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {WORKSHOPS.map((w, i) => {
              const colors = ["var(--blue)", "var(--purple)", "var(--green)", "var(--orange)"];
              const c = colors[i % colors.length];
              return (
                <div key={w.name} className="card" style={{ borderColor: c, boxShadow: `4px 4px 0 ${c}` }}>
                  <div style={{ fontWeight: 900, fontSize: "1rem", marginBottom: 10, color: c }}>{w.name}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    {w.skillsCovered.map((s) => (
                      <span key={s} className="badge" style={{ background: c + "22", color: c, borderColor: c, fontSize: "0.7rem" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ textAlign: "center", padding: "8px", background: "var(--bg-soft)", borderRadius: "8px" }}>
                      <div style={{ fontWeight: 900, fontSize: "1.2rem", color: c }}>{w.reach}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-soft)", fontWeight: 700 }}>Students Helped</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", background: "var(--bg-soft)", borderRadius: "8px" }}>
                      <div style={{ fontWeight: 900, fontSize: "0.95rem", color: c }}>{w.duration}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-soft)", fontWeight: 700 }}>Duration</div>
                    </div>
                  </div>
                  <button
                    id={`schedule-workshop-${i}`}
                    className="btn"
                    style={{
                      width: "100%", marginTop: 14, fontSize: "0.82rem", fontWeight: 800,
                      background: c, color: "white", borderColor: "var(--text)",
                    }}
                  >
                    <Calendar size={16} className="inline mr-2 align-text-bottom" /> Schedule Workshop
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
