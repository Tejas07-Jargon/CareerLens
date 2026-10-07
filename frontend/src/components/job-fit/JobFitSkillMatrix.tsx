"use client";

import React, { useState } from "react";
import { Table, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Search, Filter, ExternalLink, Code2 } from "lucide-react";
import type { SkillMatchItem } from "@/types/jobFit";

interface JobFitSkillMatrixProps {
  skillMatches: SkillMatchItem[];
  onSelectSkillForEvidence: (skillName: string) => void;
}

export default function JobFitSkillMatrix({
  skillMatches,
  onSelectSkillForEvidence,
}: JobFitSkillMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "critical" | "gaps" | "validated">("all");

  const filteredMatches = skillMatches.filter((item) => {
    const matchesSearch = item.skill.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === "critical") return item.importance === "CRITICAL";
    if (filterTab === "gaps") return item.evidence_status === "WEAK" || item.evidence_status === "MISSING" || item.evidence_status === "MODERATE";
    if (filterTab === "validated") return item.proof_level === "VALIDATED";
    return true;
  });

  const getProofBadge = (proof: string) => {
    if (proof === "VALIDATED") {
      return (
        <span
          className="badge"
          style={{
            background: "var(--green-light)",
            color: "var(--green)",
            borderColor: "var(--green)",
            fontSize: "0.68rem",
            fontWeight: 900,
          }}
        >
          ★ VALIDATED (AST/Quiz)
        </span>
      );
    }
    if (proof === "DEMONSTRATED") {
      return (
        <span
          className="badge"
          style={{
            background: "var(--blue-light)",
            color: "var(--blue)",
            borderColor: "var(--blue)",
            fontSize: "0.68rem",
            fontWeight: 800,
          }}
        >
          ● DEMONSTRATED (Repo)
        </span>
      );
    }
    if (proof === "CLAIMED_ONLY") {
      return (
        <span
          className="badge"
          style={{
            background: "var(--yellow-light)",
            color: "var(--orange)",
            borderColor: "var(--yellow)",
            fontSize: "0.68rem",
            fontWeight: 800,
          }}
        >
          ○ CLAIMED ONLY
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: "var(--bg-soft)",
          color: "var(--text-soft)",
          borderColor: "var(--border)",
          fontSize: "0.68rem",
        }}
      >
        ✕ UNVERIFIED
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "VERIFIED") return { label: "✓ Verified", color: "var(--green)", bg: "var(--green-light)" };
    if (status === "STRONG") return { label: "✓ Strong", color: "var(--green)", bg: "var(--green-light)" };
    if (status === "MODERATE") return { label: "▲ Moderate", color: "var(--blue)", bg: "var(--blue-light)" };
    if (status === "WEAK") return { label: "⚠ Weak", color: "var(--orange)", bg: "var(--yellow-light)" };
    return { label: "✕ Missing", color: "var(--pink)", bg: "var(--pink-light)" };
  };

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--text)",
        boxShadow: "4px 4px 0 var(--text)",
        padding: "22px 24px",
      }}
    >
      {/* Header and Filter Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            SKILL-BY-SKILL MATCH MATRIX
          </span>
          <h3 style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Table size={18} color="var(--blue)" /> Requirement Evidence &amp; Proof Verification
          </h3>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${skillMatches.length})` },
            { id: "critical", label: "Critical Only" },
            { id: "gaps", label: "Gaps & Weak" },
            { id: "validated", label: "Validated Proof" },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  fontSize: "0.74rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 800,
                  border: "1.5px solid",
                  borderColor: isActive ? "var(--text)" : "var(--border)",
                  background: isActive ? "var(--blue)" : "var(--bg-soft)",
                  color: isActive ? "white" : "var(--text-mid)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color="var(--text-soft)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter skills (e.g. Python, Docker, PyTorch)..."
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            borderRadius: "8px",
            border: "1.5px solid var(--border)",
            fontSize: "0.80rem",
            color: "var(--text)",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.80rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-soft)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>SKILL</th>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>IMPORTANCE</th>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>PROOF LEVEL</th>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>EVIDENCE SUMMARY</th>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>CONFIDENCE</th>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text)" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((m) => {
              const statusBadge = getStatusBadge(m.evidence_status);
              return (
                <tr
                  key={m.skill}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Skill Name */}
                  <td style={{ padding: "10px 12px", fontWeight: 900, color: "var(--text)" }}>
                    <button
                      onClick={() => onSelectSkillForEvidence(m.skill)}
                      style={{
                        background: "none",
                        border: "none",
                        fontWeight: 900,
                        color: "var(--text)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        textAlign: "left",
                        padding: 0,
                      }}
                      title="Click to inspect underlying evidence"
                    >
                      {m.skill}
                      <ExternalLink size={12} color="var(--blue)" />
                    </button>
                  </td>

                  {/* Importance */}
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          m.importance === "CRITICAL"
                            ? "var(--pink-light)"
                            : m.importance === "IMPORTANT"
                            ? "var(--yellow-light)"
                            : "var(--bg-soft)",
                        color:
                          m.importance === "CRITICAL"
                            ? "var(--pink)"
                            : m.importance === "IMPORTANT"
                            ? "var(--orange)"
                            : "var(--text-soft)",
                      }}
                    >
                      {m.importance}
                    </span>
                  </td>

                  {/* Proof Level (Claim vs Demonstrated vs Validated) */}
                  <td style={{ padding: "10px 12px" }}>
                    {getProofBadge(m.proof_level)}
                  </td>

                  {/* Candidate Evidence Summary */}
                  <td style={{ padding: "10px 12px", color: "var(--text-mid)", fontSize: "0.76rem", maxWidth: 280 }}>
                    {m.evidence_summary}
                  </td>

                  {/* Confidence */}
                  <td style={{ padding: "10px 12px", fontWeight: 900, color: m.confidence >= 70 ? "var(--green)" : "var(--text)" }}>
                    {m.confidence}%
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      className="badge"
                      style={{
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        borderColor: statusBadge.color,
                        fontSize: "0.70rem",
                        fontWeight: 900,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
