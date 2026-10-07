"use client";

import React from "react";
import { AlertTriangle, ArrowRight, BrainCircuit, Map, Sliders, ShieldCheck } from "lucide-react";
import type { HoldingBackFactor } from "@/types/jobFit";

interface HoldingBackCardsProps {
  factors: HoldingBackFactor[];
  onNavigateRoadmap?: () => void;
  onNavigateQuiz?: () => void;
  onAddWhatIfAction?: (factor: HoldingBackFactor) => void;
}

export default function HoldingBackCards({
  factors,
  onNavigateRoadmap,
  onNavigateQuiz,
  onAddWhatIfAction,
}: HoldingBackCardsProps) {
  if (!factors || factors.length === 0) {
    return (
      <div
        className="card"
        style={{
          background: "var(--white)",
          borderColor: "var(--green)",
          boxShadow: "3px 3px 0 var(--green)",
          padding: "20px 22px",
          textAlign: "center",
        }}
      >
        <ShieldCheck size={32} color="var(--green)" style={{ margin: "0 auto 8px" }} />
        <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)" }}>
          No Critical Evidence Gaps Detected
        </h3>
        <p style={{ color: "var(--text-soft)", fontSize: "0.82rem", fontWeight: 600, margin: 0 }}>
          Your verified repositories and telemetry satisfy the core job requirements with high proof-of-work.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--orange)",
        boxShadow: "4px 4px 0 var(--orange)",
        padding: "22px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            CRITICAL GAP ANALYSIS
          </span>
          <h2 style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={18} color="var(--orange)" /> What&apos;s Holding You Back?
          </h2>
        </div>
        <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)", fontWeight: 800 }}>
          {factors.length} Priority Factors
        </span>
      </div>

      <p style={{ fontSize: "0.80rem", color: "var(--text-mid)", marginBottom: 16 }}>
        Addressing these specific proof-of-work gaps yields the highest mathematical increase in your Job Fit Score.
      </p>

      {/* List of factors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {factors.map((factor, idx) => {
          const isCritical = factor.importance === "CRITICAL";
          return (
            <div
              key={factor.skill}
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                background: "var(--bg-soft)",
                border: `1.5px solid ${isCritical ? "var(--pink)" : "var(--border)"}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCritical ? "var(--pink)" : "var(--orange)",
                      color: "white",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--text)" }}>
                    {factor.skill}
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: isCritical ? "var(--pink-light)" : "var(--yellow-light)",
                      color: isCritical ? "var(--pink)" : "var(--orange)",
                    }}
                  >
                    {factor.importance}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontWeight: 700 }}>
                    Evidence: <strong style={{ color: "var(--orange)" }}>{factor.evidence_status}</strong>
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: "var(--green-light)",
                      color: "var(--green)",
                      borderColor: "var(--green)",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                    }}
                  >
                    Potential: {factor.estimated_impact}
                  </span>
                </div>
              </div>

              {/* Why it matters & Recommended action */}
              <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", lineHeight: 1.45 }}>
                <div><strong>Why it matters:</strong> {factor.why_it_matters}</div>
                <div style={{ marginTop: 2 }}><strong>Action:</strong> {factor.recommended_action}</div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {onAddWhatIfAction && (
                  <button
                    onClick={() => onAddWhatIfAction(factor)}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.74rem", padding: "4px 8px", fontWeight: 800, color: "var(--purple)", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Sliders size={12} /> Simulate Impact
                  </button>
                )}
                {onNavigateQuiz && (
                  <button
                    onClick={onNavigateQuiz}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.74rem", padding: "4px 8px", fontWeight: 800, color: "var(--teal)", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <BrainCircuit size={12} /> Take Quiz
                  </button>
                )}
                {onNavigateRoadmap && (
                  <button
                    onClick={onNavigateRoadmap}
                    className="btn"
                    style={{
                      fontSize: "0.74rem",
                      padding: "4px 10px",
                      background: "var(--white)",
                      borderColor: "var(--blue)",
                      color: "var(--blue)",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Map size={12} /> 10-Wk Roadmap Milestone →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
