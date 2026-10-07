"use client";

import { useState } from "react";

interface RoadmapItem {
  week: string;
  title: string;
  description: string;
  skills: string[];
  color: string;
  icon: string;
  effort: string;
  resources: string[];
}

const SAMPLE_ROADMAP: RoadmapItem[] = [
  {
    week: "Week 1–2",
    title: "System Design Foundations",
    description: "Master scalable system design: load balancers, caches, databases, and distributed tracing.",
    skills: ["System Design", "Distributed Systems", "CAP Theorem"],
    color: "var(--blue)",
    icon: "🏗️",
    effort: "~10 hrs",
    resources: ["Designing Data-Intensive Applications", "system-design-primer (GitHub)", "ByteByteGo blog"],
  },
  {
    week: "Week 3–4",
    title: "Data Structures & Algorithms",
    description: "Deep dive into advanced DSA: graphs, dynamic programming, segment trees, and complexity proofs.",
    skills: ["Graphs", "DP", "Trees", "Complexity"],
    color: "var(--purple)",
    icon: "🧮",
    effort: "~12 hrs",
    resources: ["LeetCode Top 150", "NeetCode.io", "CLRS Introduction to Algorithms"],
  },
  {
    week: "Week 5–6",
    title: "Concurrency & OS Internals",
    description: "Threads, locks, async/await internals, deadlocks, and OS scheduling — critical for senior interviews.",
    skills: ["Concurrency", "OS", "Async"],
    color: "var(--green)",
    icon: "⚙️",
    effort: "~8 hrs",
    resources: ["OSTEP (free book)", "Java Concurrency in Practice", "Golang tour"],
  },
  {
    week: "Week 7–8",
    title: "Database & Query Optimization",
    description: "Indexing strategies, query plans, transactions (ACID), and NoSQL trade-offs.",
    skills: ["SQL", "Indexing", "NoSQL", "Transactions"],
    color: "var(--orange)",
    icon: "🗄️",
    effort: "~9 hrs",
    resources: ["Use The Index, Luke", "PostgreSQL docs", "MongoDB University"],
  },
  {
    week: "Week 9–10",
    title: "Portfolio & Open Source",
    description: "Ship a production-quality project or contribute to an open-source repo to close evidence gaps.",
    skills: ["GitHub", "Documentation", "CI/CD"],
    color: "var(--pink)",
    icon: "🚀",
    effort: "~15 hrs",
    resources: ["Good First Issues (goodfirstissue.dev)", "Readme-driven development", "GitHub Actions docs"],
  },
];

export default function RoadmapTab() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [role, setRole] = useState("Software Engineer");

  function toggleComplete(idx: number) {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const progress = Math.round((completedItems.size / SAMPLE_ROADMAP.length) * 100);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* Header */}
      <div className="card fade-in-up" style={{ borderColor: "var(--green)", boxShadow: "5px 5px 0 var(--green)", marginBottom: 24, padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: 6 }}>
              🗺️ Personalised <span className="gradient-text">Roadmap</span>
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
              A 10-week plan to close your skill gaps and land your dream role
            </p>
          </div>
          <div>
            <label className="input-label" htmlFor="roadmap-role" style={{ marginBottom: 4 }}>Role</label>
            <select
              id="roadmap-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ borderColor: "var(--green)", width: 200 }}
            >
              {["Software Engineer", "Data Scientist", "ML Engineer", "Frontend Developer", "DevOps Engineer"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--green)" }}>Overall Progress</span>
            <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--green)" }}>{progress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 14 }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "var(--green)", transition: "width 0.6s var(--ease)" }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", marginTop: 4, fontWeight: 600 }}>
            {completedItems.size} of {SAMPLE_ROADMAP.length} milestones completed
          </div>
        </div>
      </div>

      {/* Note: connect your profile */}
      <div className="card fade-in-up" style={{
        borderColor: "var(--yellow)", boxShadow: "3px 3px 0 var(--yellow)",
        background: "var(--yellow-light)", marginBottom: 24, padding: "14px 18px",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontSize: "1.2rem" }}>💡</span>
        <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, margin: 0 }}>
          Analyse your profile in the <strong>Analyse</strong> tab to get a personalised roadmap based on your actual skill gaps.
          This is a sample roadmap for {role}.
        </p>
      </div>

      {/* Milestones */}
      <div style={{ display: "grid", gap: 16 }}>
        {SAMPLE_ROADMAP.map((item, idx) => {
          const isOpen = expanded === idx;
          const done = completedItems.has(idx);

          return (
            <div
              key={idx}
              className="card fade-in-up"
              style={{
                borderColor: done ? "var(--green)" : item.color,
                boxShadow: `4px 4px 0 ${done ? "var(--green)" : item.color}`,
                background: done ? "var(--green-light)" : "var(--white)",
                animationDelay: `${idx * 0.05}s`,
                transition: "all 0.2s var(--ease)",
                padding: 0, overflow: "hidden",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 20px", cursor: "pointer",
                }}
                onClick={() => setExpanded(isOpen ? null : idx)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: done ? "var(--green)" : item.color,
                  color: "white", fontSize: "1.3rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, border: "2.5px solid var(--text)",
                }}>
                  {done ? "✅" : item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)" }}>{item.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 700 }}>
                    {item.week} · {item.effort}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    id={`roadmap-complete-${idx}`}
                    onClick={(e) => { e.stopPropagation(); toggleComplete(idx); }}
                    className="btn"
                    style={{
                      padding: "5px 14px", fontSize: "0.78rem",
                      background: done ? "var(--green)" : "var(--white)",
                      color: done ? "white" : "var(--text-mid)",
                      borderColor: done ? "var(--green)" : "var(--border)",
                    }}
                  >
                    {done ? "✅ Done" : "Mark Done"}
                  </button>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-mid)" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: "0 20px 20px", borderTop: `2px dashed ${item.color}` }}>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-mid)", lineHeight: 1.7, fontWeight: 600, marginTop: 14, marginBottom: 12 }}>
                    {item.description}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {item.skills.map((s) => (
                      <span key={s} className="badge" style={{ background: "var(--bg-soft)", color: item.color, borderColor: item.color }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--text)", marginBottom: 8 }}>📚 Resources</div>
                  <ul style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
                    {item.resources.map((r) => (
                      <li key={r} style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600, lineHeight: 1.5 }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
