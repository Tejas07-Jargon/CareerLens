"use client";

import React, { useState, useEffect } from "react";
import { GitCompare, X, Trophy, TrendingUp, ArrowRight, ShieldCheck } from "lucide-react";
import type { JobComparisonResult } from "@/types/jobFit";
import { compareJobs } from "@/lib/jobFitApi";

interface JobComparisonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string | null;
  onSelectJob?: (jobId: string) => void;
}

export default function JobComparisonDrawer({
  isOpen,
  onClose,
  profileId,
  onSelectJob,
}: JobComparisonDrawerProps) {
  const [comparisonData, setComparisonData] = useState<JobComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setLoading(true);
      try {
        const res = await compareJobs(profileId || "demo-candidate-82");
        setComparisonData(res);
      } catch (err) {
        console.warn("Comparison loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="card scale-in"
        style={{
          maxWidth: 780,
          width: "100%",
          background: "var(--white)",
          borderColor: "var(--text)",
          boxShadow: "6px 6px 0 var(--text)",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "var(--bg-soft)",
            borderBottom: "2px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitCompare size={20} color="var(--purple)" />
            <h3 style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--text)", margin: 0 }}>
              Multi-Job Fit Comparison Matrix
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", maxHeight: "75vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading || !comparisonData ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--purple)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontWeight: 800, color: "var(--text)" }}>Comparing Target Role Requirements...</div>
            </div>
          ) : (
            <>
              {/* Highlight Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {comparisonData.best_current_fit && (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      background: "var(--green-light)",
                      border: "1.5px solid var(--green)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, color: "var(--green)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <Trophy size={14} /> Best Current Fit
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", marginTop: 4 }}>
                      {comparisonData.best_current_fit.title}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 700 }}>
                      {comparisonData.best_current_fit.company} · <strong style={{ color: "var(--green)" }}>{comparisonData.best_current_fit.overall_fit}% Fit</strong>
                    </div>
                  </div>
                )}

                {comparisonData.best_growth_opportunity && (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      background: "var(--blue-light)",
                      border: "1.5px solid var(--blue)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, color: "var(--blue)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <TrendingUp size={14} /> Best Growth Opportunity
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", marginTop: 4 }}>
                      {comparisonData.best_growth_opportunity.title}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 700 }}>
                      {comparisonData.best_growth_opportunity.company} · <strong style={{ color: "var(--blue)" }}>{comparisonData.best_growth_opportunity.overall_fit}% Fit</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Side by side comparison table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.80rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-soft)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>ROLE / COMPANY</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>OVERALL FIT</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>REQUIRED SKILLS</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>EVIDENCE STRENGTH</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>TOP GAP</th>
                      <th style={{ padding: "10px 12px", fontWeight: 800 }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.comparisons.map((c) => (
                      <tr key={c.job_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 900, color: "var(--text)" }}>{c.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-soft)" }}>{c.company}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 900, fontSize: "0.95rem", color: "var(--blue)" }}>
                          {c.overall_fit}%
                        </td>
                        <td style={{ padding: "10px 12px" }}>{c.required_skills_pct}%</td>
                        <td style={{ padding: "10px 12px" }}>{c.evidence_confidence_pct}%</td>
                        <td style={{ padding: "10px 12px", color: "var(--orange)", fontWeight: 700 }}>{c.top_gap}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => {
                              onSelectJob?.(c.job_id);
                              onClose();
                            }}
                            className="btn btn-ghost"
                            style={{ fontSize: "0.74rem", padding: "4px 8px", fontWeight: 800, color: "var(--purple)" }}
                          >
                            Select →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
