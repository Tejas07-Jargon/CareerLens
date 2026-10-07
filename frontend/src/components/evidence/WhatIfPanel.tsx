"use client";

import { useState } from "react";
import { runWhatIf } from "@/lib/api";
import type { ScoreInterval, WhatIfResultItem } from "@/types";

const PRESET_ACTIONS = [
  { description: "Add CI/CD to top repo", skill_hints: ["CI/CD", "DevOps"], strength: 0.70, source: "github_repo" },
  { description: "Write tests (≥10 test files)", skill_hints: ["Testing", "Software Quality"], strength: 0.75, source: "github_repo" },
  { description: "Deploy a project live", skill_hints: ["Deployment", "DevOps"], strength: 0.80, source: "live_probe" },
  { description: "Add a Docker config", skill_hints: ["Docker", "DevOps"], strength: 0.65, source: "github_repo" },
  { description: "Upload design portfolio", skill_hints: ["UI Design", "UX Design"], strength: 0.70, source: "design_portfolio" },
  { description: "Contribute for 10 more weeks", skill_hints: ["Consistency"], strength: 0.80, source: "github_calendar" },
];

interface Props {
  profileId: string;
  currentScore: ScoreInterval;
}

export default function WhatIfPanel({ profileId, currentScore }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<WhatIfResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
    setResults(null);
  }

  async function simulate() {
    if (!selected.size) return;
    setLoading(true);
    try {
      const actions = [...selected].map((i) => PRESET_ACTIONS[i]);
      const res = await runWhatIf(profileId, actions);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalDelta = results?.reduce((sum, r) => sum + r.delta, 0) ?? 0;

  return (
    <div className="card">
      <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 6 }}>What-If Simulator</h2>
      <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: 18 }}>
        Choose hypothetical improvements to see how they'd move your score.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 18 }}>
        {PRESET_ACTIONS.map((action, i) => (
          <button
            key={i}
            id={`whatif-${i}`}
            onClick={() => toggle(i)}
            className="btn"
            style={{
              justifyContent: "flex-start",
              textAlign: "left",
              padding: "12px 14px",
              fontSize: "0.82rem",
              background: selected.has(i) ? "rgba(79,158,255,0.12)" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (selected.has(i) ? "rgba(79,158,255,0.35)" : "var(--border)"),
              color: selected.has(i) ? "var(--text-primary)" : "var(--text-secondary)",
              borderRadius: 10,
            }}
          >
            <span style={{ marginRight: 8 }}>{selected.has(i) ? "☑" : "☐"}</span>
            {action.description}
          </button>
        ))}
      </div>

      <button
        id="whatif-run-btn"
        onClick={simulate}
        className="btn btn-primary"
        disabled={loading || !selected.size}
        style={{ width: "100%", marginBottom: results ? 20 : 0 }}
      >
        {loading ? "Simulating…" : `Simulate ${selected.size} change${selected.size !== 1 ? "s" : ""}`}
      </button>

      {results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {/* Summary delta */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 2 }}>Combined score lift</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-green)" }}>
                +{totalDelta.toFixed(1)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {currentScore.mid.toFixed(0)} → <strong style={{ color: "var(--text-primary)" }}>{(currentScore.mid + totalDelta).toFixed(0)}</strong>
              </div>
            </div>
          </div>

          {/* Per-action breakdown */}
          {results.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.88rem", fontWeight: 700, color: "var(--accent-green)", flexShrink: 0 }}>
                +{r.delta.toFixed(1)}
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.action}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Range: {r.before_range[0].toFixed(0)}–{r.before_range[1].toFixed(0)} → {r.after_range[0].toFixed(0)}–{r.after_range[1].toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
