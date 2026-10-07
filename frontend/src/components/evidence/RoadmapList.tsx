"use client";

import type { RoadmapMilestone } from "@/types";

interface Props { milestones: RoadmapMilestone[]; }

export default function RoadmapList({ milestones }: Props) {
  if (!milestones?.length) return null;

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 16 }}>
        Personalised Roadmap
      </h2>
      <div style={{ position: "relative" }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute", left: 18, top: 24, bottom: 24,
          width: 2, background: "linear-gradient(to bottom, #4f9eff, #a78bfa)",
          opacity: 0.25,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 20 }}>
              {/* Step number */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #4f9eff, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.85rem", zIndex: 1,
              }}>
                {i + 1}
              </div>

              <div className="card" style={{ flex: 1, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.milestone}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                      Closes gap: <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{m.gap_closed}</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Proof artifact: </span>
                      {m.proof_artifact}
                    </div>
                    {m.related_repo && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>
                        Repo: <code>{m.related_repo}</code>
                      </div>
                    )}
                    {m.resources?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {m.resources.map((r, ri) => (
                          r.startsWith("http") ? (
                            <a key={ri} href={r} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: "0.75rem", padding: "3px 10px", background: "rgba(79,158,255,0.10)", border: "1px solid rgba(79,158,255,0.2)", borderRadius: 99, color: "var(--accent-blue)", textDecoration: "none" }}>
                              🔗 Resource {ri + 1}
                            </a>
                          ) : (
                            <span key={ri} style={{ fontSize: "0.75rem", padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 99, color: "var(--text-muted)" }}>
                              {r}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, background: "var(--gradient-accent)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      ~{m.estimated_hours}h
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>estimated</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
