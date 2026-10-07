"use client";

import { useState } from "react";
import { runWhatIf } from "@/lib/api";
import type { ScoreInterval, WhatIfResultItem } from "@/types";
import { Rocket, FlaskConical, Globe, Box, Palette, Calendar, Sparkles, CheckCircle } from "lucide-react";

const PRESET_ACTIONS = [
  { description: "Add CI/CD pipeline to top repo", icon: <Rocket size={18} />, skill_hints: ["CI/CD", "DevOps"], strength: 0.70, source: "github_repo" },
  { description: "Write comprehensive unit & integration tests", icon: <FlaskConical size={18} />, skill_hints: ["Testing", "Software Quality"], strength: 0.75, source: "github_repo" },
  { description: "Deploy project to production URL", icon: <Globe size={18} />, skill_hints: ["Deployment", "DevOps"], strength: 0.80, source: "live_probe" },
  { description: "Add multi-stage Docker & compose config", icon: <Box size={18} />, skill_hints: ["Docker", "DevOps"], strength: 0.65, source: "github_repo" },
  { description: "Publish visual UI/UX design case study", icon: <Palette size={18} />, skill_hints: ["UI Design", "UX Design"], strength: 0.70, source: "design_portfolio" },
  { description: "Maintain 10 more weeks of active contributions", icon: <Calendar size={18} />, skill_hints: ["Consistency"], strength: 0.80, source: "github_calendar" },
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
    <div className="card fade-in-up" style={{ borderColor: "var(--purple)", boxShadow: "5px 5px 0 var(--purple)", padding: "24px 28px" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={20} /> What-If Career Simulator</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>
          Select hypothetical achievements to project how they mathematically lift your readiness score.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
        {PRESET_ACTIONS.map((action, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              id={`whatif-${i}`}
              type="button"
              onClick={() => toggle(i)}
              className="btn"
              style={{
                justifyContent: "flex-start",
                textAlign: "left",
                padding: "12px 14px",
                fontSize: "0.84rem",
                background: isSelected ? "var(--purple-light)" : "var(--white)",
                borderColor: isSelected ? "var(--purple)" : "var(--border)",
                color: isSelected ? "var(--purple)" : "var(--text-mid)",
                boxShadow: isSelected ? "2px 2px 0 var(--purple)" : "none",
                borderRadius: "10px 12px 9px 11px",
              }}
            >
              <span style={{ marginRight: 8, display: "flex" }}>{isSelected ? <CheckCircle size={18} /> : action.icon}</span>
              <span style={{ fontWeight: 800 }}>{action.description}</span>
            </button>
          );
        })}
      </div>

      <button
        id="whatif-run-btn"
        onClick={simulate}
        className="btn btn-purple"
        disabled={loading || !selected.size}
        style={{ width: "100%", height: 48, fontSize: "0.95rem", fontWeight: 900, marginBottom: results ? 20 : 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {loading ? "Simulating Bayesian Engine…" : <><Sparkles size={18} /> Simulate {selected.size} Selected Improvement{selected.size !== 1 ? "s" : ""}</>}
      </button>

      {results && (
        <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
          {/* Summary delta */}
          <div style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "16px 20px", background: "var(--green-light)",
            border: "2.5px solid var(--green)", borderRadius: "12px 15px 11px 14px",
            boxShadow: "3px 3px 0 var(--green)"
          }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", fontWeight: 800 }}>Projected Lift</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>
                +{totalDelta.toFixed(1)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.9rem", color: "var(--text)", fontWeight: 700 }}>
                Score: {currentScore.mid.toFixed(0)} → <strong style={{ color: "var(--green)", fontSize: "1.1rem" }}>{(currentScore.mid + totalDelta).toFixed(0)}</strong>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", marginTop: 2, fontWeight: 600 }}>
                Calculated purely through evidence-weight changes
              </div>
            </div>
          </div>

          {/* Per-action breakdown */}
          {results.map((r, i) => (
            <div key={i} className={`fade-in-up stagger-${i + 1}`} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px", background: "var(--bg-soft)",
              border: "2px solid var(--border)", borderRadius: "10px 12px 9px 11px"
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "var(--green-light)", border: "2px solid var(--green)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.88rem", fontWeight: 900, color: "var(--green)", flexShrink: 0
              }}>
                +{r.delta.toFixed(1)}
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text)" }}>{r.action}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 700 }}>
                  Confidence Range: {r.before_range[0].toFixed(0)}–{r.before_range[1].toFixed(0)} → <strong style={{ color: "var(--green)" }}>{r.after_range[0].toFixed(0)}–{r.after_range[1].toFixed(0)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

