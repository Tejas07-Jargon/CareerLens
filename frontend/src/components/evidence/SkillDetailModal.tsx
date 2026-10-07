"use client";

import { useEffect } from "react";
import type { SkillEvidenceItem } from "@/types/evidence";
import { Scale, BarChart2, FolderGit2, Check, AlertTriangle, Info, Lightbulb, X, Bot, CircleDot, ShieldCheck, Code2 } from "lucide-react";

interface Props {
  skill: SkillEvidenceItem | null;
  onClose: () => void;
}

export default function SkillDetailModal({ skill, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!skill) return null;

  const scoreColor =
    skill.score >= 81
      ? "var(--green)"
      : skill.score >= 61
      ? "var(--blue)"
      : skill.score >= 31
      ? "var(--yellow)"
      : "var(--pink)";

  const scoreBg =
    skill.score >= 81
      ? "var(--green-light)"
      : skill.score >= 61
      ? "var(--blue-light)"
      : skill.score >= 31
      ? "var(--yellow-light)"
      : "var(--pink-light)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(26, 26, 46, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="card scale-in"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "var(--white)",
          border: "3px solid var(--text)",
          boxShadow: "6px 6px 0 var(--text)",
          position: "relative",
          padding: "28px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "4px 8px",
            fontSize: "0.9rem",
            background: "var(--bg-soft)",
            borderColor: "var(--text)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingRight: 40 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "14px 16px 12px 15px",
              background: scoreBg,
              border: `2.5px solid ${scoreColor}`,
              boxShadow: `2px 2px 0 ${scoreColor}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
            }}
          >
            <span style={{ fontSize: "1.3rem", lineHeight: 1, color: "var(--text)" }}>{skill.score}</span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-mid)" }}>/ 100</span>
          </div>

          <div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>
              {skill.skill}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: "99px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  border: "1.5px solid var(--text)",
                  background: scoreBg,
                  color: "var(--text)",
                }}
              >
                ● {skill.status} ({skill.status_range})
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 600 }}>
                {skill.sources_count} verified source{skill.sources_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Potential Mismatch Notice ───────────────────────────── */}
        {skill.mismatch && (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 16px",
              background: skill.mismatch.severity === "warning" ? "var(--pink-light)" : "var(--blue-light)",
              border: `2px solid ${skill.mismatch.severity === "warning" ? "var(--pink)" : "var(--blue)"}`,
              borderRadius: "10px",
              boxShadow: "3px 3px 0 var(--text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {skill.mismatch.severity === "warning" ? (
                <AlertTriangle size={18} color="var(--pink)" />
              ) : (
                <Info size={18} color="var(--blue)" />
              )}
              <strong style={{ fontSize: "0.9rem", color: "var(--text)" }}>
                {skill.mismatch.title}
              </strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text)", marginBottom: 6 }}>
              {skill.mismatch.message}
            </p>
            {skill.mismatch.recommendation && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
                <Lightbulb size={14} color="var(--blue)" />
                <span><strong>Recommendation:</strong> {skill.mismatch.recommendation}</span>
              </p>
            )}
          </div>
        )}

        {/* ── Claim vs Evidence Comparison ───────────────────────── */}
        <div
          style={{
            background: "var(--bg-soft)",
            border: "2px solid var(--border)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Scale size={18} color="var(--text-mid)" /> Claim vs. Evidence Comparison
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "var(--white)", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 700, textTransform: "uppercase" }}>
                Resume Claim
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
                "{skill.claim_vs_evidence?.resume_claim || "Skill listed"}"
              </div>
            </div>

            <div style={{ background: "var(--white)", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 700, textTransform: "uppercase" }}>
                Assessment
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: skill.score >= 61 ? "var(--green)" : "var(--pink)",
                  marginTop: 4,
                }}
              >
                {skill.claim_vs_evidence?.assessment || skill.status}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700, marginBottom: 6 }}>
              Observed Evidence Proof Points:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "var(--text-mid)" }}>
              {skill.claim_vs_evidence?.observed_evidence?.map((item, idx) => (
                <li key={idx} style={{ marginBottom: 3 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Why This Score? Breakdown ───────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 size={18} color="var(--blue)" /> Why this score? ({skill.score} / 100)
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-soft)" }}>Deterministic contribution</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(skill.breakdown || {}).map(([key, item]) => {
              const isAwarded = item.points > 0;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: isAwarded ? "var(--bg)" : "var(--bg-soft)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontSize: "0.74rem", color: item.available ? "var(--text-mid)" : "var(--text-soft)" }}>
                      {item.status}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 60 }}>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        color: isAwarded ? "var(--green)" : "var(--text-soft)",
                      }}
                    >
                      {isAwarded ? `+${item.points}` : "0"}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", marginLeft: 2 }}>
                      / {item.max}
                    </span>
                  </div>
                </div>
              );
            })}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "var(--white)",
                borderTop: "2px solid var(--text)",
                marginTop: 4,
                fontWeight: 900,
                fontSize: "0.95rem",
              }}
            >
              <span>Total Evidence Confidence</span>
              <span style={{ color: scoreColor }}>{skill.score} / 100</span>
            </div>
          </div>
        </div>

        {/* ── Ownership Attribution Provenance (If Available) ──────── */}
        {skill.ownership && skill.ownership.status !== "not_analysed" && (
          <div
            style={{
              padding: "14px 16px",
              background: "var(--blue-light)",
              border: "2px solid var(--blue)",
              borderRadius: "10px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ShieldCheck size={18} color="var(--blue)" />
              <div style={{ fontWeight: 900, fontSize: "0.92rem", color: "var(--text)" }}>
                Repository Evidence Adjusted via Ownership Attribution
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.8rem", color: "var(--text)", marginBottom: 8 }}>
              <div>
                <span style={{ color: "var(--text-mid)", fontWeight: 700 }}>Primary Repository: </span>
                <strong>{skill.ownership.top_repo}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-mid)", fontWeight: 700 }}>Candidate-Attributed Lines: </span>
                <strong style={{ color: "var(--blue)" }}>{Math.round(skill.ownership.share * 100)}%</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-mid)", fontWeight: 700 }}>Ownership Factor: </span>
                <strong>{skill.ownership.factor.toFixed(2)}x</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-mid)", fontWeight: 700 }}>Blame Coverage: </span>
                <strong>{Math.round(skill.ownership.coverage * 100)}%</strong>
              </div>
            </div>

            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontStyle: "italic", borderTop: "1px dashed var(--blue)", paddingTop: 6 }}>
              ℹ️ Attribution based on surviving Git history and porcelain blame analysis. This measures code contribution provenance.
            </div>
          </div>
        )}

        {/* ── Evidence Sources Checklist ──────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <FolderGit2 size={18} color="var(--purple)" /> Verifiable Evidence Sources
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {skill.sources?.map((src, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--border)",
                  background: src.status === "verified" ? "var(--white)" : "var(--bg-soft)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: "1rem",
                    color:
                      src.status === "verified"
                        ? "var(--green)"
                        : src.status === "partial"
                        ? "var(--yellow)"
                        : "var(--text-soft)",
                    marginTop: 2,
                  }}
                >
                  {src.status === "verified" ? (
                    <Check size={16} strokeWidth={3} />
                  ) : src.status === "unavailable" ? (
                    <CircleDot size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.85rem", color: "var(--text)" }}>{src.source}</strong>
                    {src.contribution > 0 && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          background: "var(--green-light)",
                          color: "var(--green)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 700,
                        }}
                      >
                        +{src.contribution} pts
                      </span>
                    )}
                    {src.status === "unavailable" && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background: "var(--bg)",
                          color: "var(--text-soft)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Unavailable
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: 2 }}>
                    {src.description}
                  </div>
                  {src.details && (
                    <div style={{ fontSize: "0.73rem", color: "var(--text-soft)", marginTop: 3 }}>
                      {src.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Explanation ──────────────────────────────────────── */}
        <div
          style={{
            background: "var(--purple-light)",
            border: "2px solid var(--purple)",
            borderRadius: "10px",
            padding: "14px 16px",
            boxShadow: "3px 3px 0 var(--purple)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Bot size={16} color="var(--purple)" /> AI Explanation & Citation
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.6 }}>
            "{skill.ai_explanation}"
          </p>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: "8px 24px", fontSize: "0.9rem" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
