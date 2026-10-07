"use client";

import type { RoadmapMilestone } from "@/types";
import { Map, Target, Folder, Link, BookOpen } from "lucide-react";

interface Props { milestones: RoadmapMilestone[]; }

export default function RoadmapList({ milestones }: Props) {
  if (!milestones?.length) return null;

  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Map size={20} /> Personalised Action Roadmap
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>
          Evidence-oriented milestones designed to produce verifiable commits and portfolio proof.
        </p>
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute", left: 20, top: 28, bottom: 28,
          width: 3, background: "repeating-linear-gradient(to bottom, var(--blue) 0px, var(--blue) 6px, transparent 6px, transparent 12px)",
          zIndex: 0,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {milestones.map((m, i) => (
            <div key={i} className={`fade-in-up stagger-${(i % 6) + 1}`} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              {/* Step number badge */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: "var(--blue)", border: "2.5px solid var(--text)",
                boxShadow: "2px 2px 0 var(--text)",
                color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: "1.05rem", zIndex: 1,
              }}>
                {i + 1}
              </div>

              <div className="card" style={{ flex: 1, padding: "18px 22px", borderColor: "var(--blue)", boxShadow: "3px 3px 0 var(--blue)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 6, color: "var(--text)" }}>{m.milestone}</div>
                    
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="pill" style={{ background: "var(--pink-light)", borderColor: "var(--pink)", color: "var(--pink)", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: 4 }}>
                        <Target size={14} /> Closes: {m.gap_closed}
                      </span>
                      {m.related_repo && (
                        <span className="pill" style={{ background: "var(--bg-soft)", borderColor: "var(--border)", color: "var(--text-mid)", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: 4 }}>
                          <Folder size={14} /> <code>{m.related_repo}</code>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "0.86rem", color: "var(--text-mid)", marginBottom: 10, fontWeight: 600 }}>
                      <strong style={{ color: "var(--text)" }}>Proof Artifact: </strong>
                      {m.proof_artifact}
                    </div>

                    {m.resources?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {m.resources.map((r, ri) => (
                          r.startsWith("http") ? (
                            <a key={ri} href={r} target="_blank" rel="noopener noreferrer"
                              className="pill"
                              style={{
                                background: "var(--blue-light)", borderColor: "var(--blue)", color: "var(--blue)",
                                textDecoration: "none", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: 4
                              }}>
                              <Link size={14} /> Resource {ri + 1}
                            </a>
                          ) : (
                            <span key={ri} className="pill"
                              style={{
                                background: "var(--bg-soft)", borderColor: "var(--border)", color: "var(--text-mid)",
                                fontSize: "0.76rem", display: "flex", alignItems: "center", gap: 4
                              }}>
                              <BookOpen size={14} /> {r}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--blue)", lineHeight: 1 }}>
                      ~{m.estimated_hours}h
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 800, marginTop: 3 }}>estimated effort</div>
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

