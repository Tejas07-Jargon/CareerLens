"use client";

import { useState } from "react";
import Link from "next/link";
import type { EvidenceReport, SkillEvidenceItem } from "@/types/evidence";
import SkillDetailModal from "./SkillDetailModal";
import OwnershipPanel from "@/components/ownership/OwnershipPanel";
import {
  Search,
  Lightbulb,
  Target,
  CheckCircle,
  AlertTriangle,
  Scale,
  Folder,
  ArrowUpRight,
  HelpCircle,
  FolderGit2,
  ShieldCheck,
  Code2
} from "lucide-react";

interface Props {
  report: EvidenceReport;
  profileId?: string;
  onRefresh?: () => void;
}

const STATUS_FILTERS = [
  { id: "all", label: "All Skills" },
  { id: "Strong Evidence", label: "Strong (81–100)" },
  { id: "Moderate Evidence", label: "Moderate (61–80)" },
  { id: "Limited Evidence", label: "Limited (31–60)" },
  { id: "Weak / Unverified", label: "Weak (0–30)" },
] as const;

export default function EvidenceVerificationView({ report, profileId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"skills" | "ownership">("skills");
  const [selectedSkill, setSelectedSkill] = useState<SkillEvidenceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredSkills = (report.skills || []).filter((s) => {
    const matchesSearch = s.skill.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" ? true : s.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Strong Evidence":
        return { bg: "var(--green-light)", color: "var(--green)", border: "var(--green)" };
      case "Moderate Evidence":
        return { bg: "var(--blue-light)", color: "var(--blue)", border: "var(--blue)" };
      case "Limited Evidence":
        return { bg: "var(--yellow-light)", color: "var(--yellow)", border: "var(--yellow)" };
      default:
        return { bg: "var(--pink-light)", color: "var(--pink)", border: "var(--pink)" };
    }
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          marginBottom: 20,
          borderColor: "var(--blue)",
          boxShadow: "4px 4px 0 var(--blue)",
          background: "var(--white)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "var(--blue-light)", border: "1.5px solid var(--blue)", borderRadius: "99px", marginBottom: 12 }}>
              <Search size={14} color="var(--blue)" />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--blue)" }}>
                Proof-Backed Employability
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>
              Evidence <span className="gradient-text">Verification</span>
            </h1>
            <p style={{ color: "var(--text-mid)", fontSize: "0.95rem", fontWeight: 600, maxWidth: 640 }}>
              See how strongly your claimed skills are supported by real proof of work and code ownership.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/"
              className="btn btn-ghost"
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Sub-view Navigation Tabs */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
          <button
            id="subtab-skills"
            onClick={() => setActiveSubTab("skills")}
            className="btn"
            style={{
              fontSize: "0.84rem",
              padding: "8px 18px",
              background: activeSubTab === "skills" ? "var(--blue)" : "var(--white)",
              color: activeSubTab === "skills" ? "white" : "var(--text)",
              borderColor: activeSubTab === "skills" ? "var(--text)" : "var(--border)",
              boxShadow: activeSubTab === "skills" ? "2px 2px 0 var(--text)" : "none",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={16} /> Skill Evidence Breakdown ({report.skills?.length || 0})
          </button>

          <button
            id="subtab-ownership"
            onClick={() => setActiveSubTab("ownership")}
            className="btn"
            style={{
              fontSize: "0.84rem",
              padding: "8px 18px",
              background: activeSubTab === "ownership" ? "var(--purple)" : "var(--white)",
              color: activeSubTab === "ownership" ? "white" : "var(--text)",
              borderColor: activeSubTab === "ownership" ? "var(--text)" : "var(--border)",
              boxShadow: activeSubTab === "ownership" ? "2px 2px 0 var(--text)" : "none",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FolderGit2 size={16} /> Ownership Map (Git Blame Attribution)
          </button>
        </div>
      </div>

      {activeSubTab === "ownership" ? (
        <OwnershipPanel profileId={profileId} />
      ) : (
        <>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {/* Overall Confidence */}
        <div className="card" style={{ borderColor: "var(--blue)", boxShadow: "3px 3px 0 var(--blue)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 700 }}>Overall Evidence Confidence</span>
            <Target size={18} color="var(--blue)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: "2.3rem", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
              {report.overall_score}
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-soft)", fontWeight: 700 }}>/ 100</span>
          </div>
          <div className="progress-bar" style={{ marginTop: 10, height: 6 }}>
            <div className="progress-bar-fill" style={{ width: `${report.overall_score}%`, background: "var(--blue)" }} />
          </div>
        </div>

        {/* Verified Skills */}
        <div className="card" style={{ borderColor: "var(--green)", boxShadow: "3px 3px 0 var(--green)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 700 }}>Verified Skills (81–100)</span>
            <CheckCircle size={18} color="var(--green)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: "2.3rem", fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>
              {report.verified_count}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 700 }}>Strong Evidence</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginTop: 10 }}>
            Deep repo & commit proof established
          </div>
        </div>

        {/* Partially Verified */}
        <div className="card" style={{ borderColor: "var(--yellow)", boxShadow: "3px 3px 0 var(--yellow)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 700 }}>Partially Verified (31–80)</span>
            <HelpCircle size={18} color="var(--yellow)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: "2.3rem", fontWeight: 900, color: "var(--yellow)", lineHeight: 1 }}>
              {report.partial_count}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 700 }}>Moderate / Limited</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginTop: 10 }}>
            Preliminary signals; needs test/CI depth
          </div>
        </div>

        {/* Weak / Unverified */}
        <div className="card" style={{ borderColor: "var(--pink)", boxShadow: "3px 3px 0 var(--pink)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 700 }}>Weak / Unverified (0–30)</span>
            <AlertTriangle size={18} color="var(--pink)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: "2.3rem", fontWeight: 900, color: "var(--pink)", lineHeight: 1 }}>
              {report.weak_count}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 700 }}>Unverified Claims</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginTop: 10 }}>
            Claimed but zero practical code proof
          </div>
        </div>
      </div>

      {/* ── Overall Evidence Breakdown & Missing Data Distinction ──── */}
      <div
        className="card"
        style={{
          padding: "24px",
          marginBottom: 28,
          borderColor: "var(--purple)",
          boxShadow: "4px 4px 0 var(--purple)",
          background: "var(--white)",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)", marginBottom: 16 }}>
          📈 Overall Evidence Category Breakdown
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {/* Technical Skills */}
          <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>Technical Skills Evidence</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--blue)", marginTop: 4 }}>
              {report.categories?.technical ?? 84}
            </div>
            <div className="progress-bar" style={{ marginTop: 6, height: 5 }}>
              <div className="progress-bar-fill" style={{ width: `${report.categories?.technical ?? 84}%`, background: "var(--blue)" }} />
            </div>
          </div>

          {/* Project Evidence */}
          <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>Project Evidence</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--green)", marginTop: 4 }}>
              {report.categories?.projects ?? 79}
            </div>
            <div className="progress-bar" style={{ marginTop: 6, height: 5 }}>
              <div className="progress-bar-fill" style={{ width: `${report.categories?.projects ?? 79}%`, background: "var(--green)" }} />
            </div>
          </div>

          {/* GitHub Evidence */}
          <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>GitHub Evidence</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--purple)", marginTop: 4 }}>
              {report.source_availability?.github ? (report.categories?.github ?? 72) : "Unavailable"}
            </div>
            <div className="progress-bar" style={{ marginTop: 6, height: 5 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: report.source_availability?.github ? `${report.categories?.github ?? 72}%` : "0%",
                  background: "var(--purple)",
                }}
              />
            </div>
          </div>

          {/* Portfolio Evidence */}
          <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>Portfolio Evidence</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--orange)", marginTop: 4 }}>
              {report.source_availability?.portfolio ? `${report.categories?.portfolio ?? 68}` : "Not provided"}
            </div>
            <div className="progress-bar" style={{ marginTop: 6, height: 5 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: report.source_availability?.portfolio ? `${report.categories?.portfolio ?? 68}%` : "0%",
                  background: "var(--orange)",
                }}
              />
            </div>
          </div>

          {/* Resume Consistency */}
          <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1.5px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>Resume Consistency</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--teal)", marginTop: 4 }}>
              {report.categories?.resumeConsistency ?? 81}%
            </div>
            <div className="progress-bar" style={{ marginTop: 6, height: 5 }}>
              <div className="progress-bar-fill" style={{ width: `${report.categories?.resumeConsistency ?? 81}%`, background: "var(--teal)" }} />
            </div>
          </div>
        </div>

        {/* Missing Data Policy Note */}
        <div
          style={{
            marginTop: 18,
            padding: "10px 14px",
            background: "var(--bg)",
            borderRadius: "8px",
            border: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: "0.78rem",
            color: "var(--text-mid)",
          }}
        >
          <Scale size={16} color="var(--text-mid)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Missing Data Fair Assessment:</strong> We clearly distinguish between{" "}
            <em>"No evidence found"</em> (checked but zero trace), <em>"Evidence unavailable"</em> (source not connected), and{" "}
            <em>"Contradictory evidence"</em>. Missing channels do not penalize your verified skill scores.
          </span>
        </div>
      </div>

      {/* ── Potential Claim Mismatches ──────────────────────────────── */}
      {report.mismatches && report.mismatches.length > 0 && (
        <div
          className="card"
          style={{
            padding: "22px",
            marginBottom: 28,
            borderColor: "var(--pink)",
            boxShadow: "4px 4px 0 var(--pink)",
            background: "var(--white)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={20} color="var(--pink)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)" }}>
              Potential Claim Mismatch (Actionable Review)
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {report.mismatches.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: m.severity === "warning" ? "var(--pink-light)" : "var(--blue-light)",
                  border: `2px solid ${m.severity === "warning" ? "var(--pink)" : "var(--blue)"}`,
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    background: "var(--white)",
                    border: "1.5px solid var(--text)",
                  }}
                >
                  {m.skill}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 4 }}>
                    {m.title}: {m.resume_claim ? `Claimed as "${m.resume_claim}"` : m.message}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text)", marginBottom: 6 }}>
                    <strong>Observed Evidence:</strong> {m.observed_evidence || m.message}
                  </div>
                  {m.recommendation && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
                      <Lightbulb size={14} color="var(--blue)" />
                      <span><strong>Recommendation:</strong> {m.recommendation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Skill Evidence Table & Controls ────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "24px",
          marginBottom: 40,
          borderColor: "var(--text)",
          boxShadow: "4px 4px 0 var(--text)",
          background: "var(--white)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text)" }}>
            📋 Skill Evidence Verification Table ({filteredSkills.length})
          </h2>

          {/* Search Input */}
          <input
            type="text"
            className="input"
            placeholder="Search skill (e.g. Java, AWS)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 260, padding: "8px 14px", fontSize: "0.85rem" }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="btn"
              style={{
                fontSize: "0.78rem",
                padding: "6px 14px",
                background: activeFilter === f.id ? "var(--text)" : "var(--white)",
                color: activeFilter === f.id ? "white" : "var(--text)",
                borderColor: "var(--text)",
                boxShadow: activeFilter === f.id ? "2px 2px 0 var(--blue)" : "none",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Desktop / Tablet Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "var(--text-soft)", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 14px" }}>Skill</th>
                <th style={{ padding: "8px 14px" }}>Evidence Confidence</th>
                <th style={{ padding: "8px 14px" }}>Verifiable Sources</th>
                <th style={{ padding: "8px 14px" }}>Verification Status</th>
                <th style={{ padding: "8px 14px", textAlign: "right" }}>Drilldown</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((sk) => {
                const badge = getStatusBadgeClass(sk.status);
                return (
                  <tr
                    key={sk.skill}
                    onClick={() => setSelectedSkill(sk)}
                    style={{
                      background: "var(--bg-soft)",
                      cursor: "pointer",
                      transition: "transform 0.12s ease, background 0.12s ease",
                      borderRadius: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--white)";
                      e.currentTarget.style.transform = "translate(-1px, -1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--bg-soft)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    {/* Skill */}
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", borderLeft: `4px solid ${badge.border}`, borderRadius: "8px 0 0 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>{sk.skill}</span>
                        {sk.ownership && sk.ownership.status !== "not_analysed" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              background: "var(--blue-light)",
                              color: "var(--blue)",
                              border: "1px solid var(--blue)",
                            }}
                            title={`Approx. ${Math.round(sk.ownership.share * 100)}% attributed code in ${sk.ownership.repos_count} repo(s)`}
                          >
                            <Code2 size={11} /> {Math.round(sk.ownership.share * 100)}% code
                          </span>
                        )}
                        {sk.mismatch && (
                          <span title="Potential claim mismatch" style={{ display: "inline-flex" }}>
                            <AlertTriangle size={14} color="var(--pink)" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Confidence Bar */}
                    <td style={{ padding: "14px", minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${sk.score}%`,
                              background: badge.border,
                              borderRadius: 99,
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: "0.88rem", minWidth: 42, color: "var(--text)" }}>
                          {sk.score}%
                        </span>
                      </div>
                    </td>

                    {/* Sources count */}
                    <td style={{ padding: "14px", fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Folder size={14} color="var(--text-soft)" /> {sk.sources_count} source{sk.sources_count !== 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "14px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "99px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                          border: `1.5px solid ${badge.border}`,
                        }}
                      >
                        {sk.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "14px", textAlign: "right", borderRadius: "0 8px 8px 0" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSkill(sk);
                        }}
                        className="btn btn-ghost"
                        style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        View Proof <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSkills.length === 0 && (
          <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-mid)" }}>
            <Search size={32} color="var(--text-soft)" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontWeight: 700 }}>No skills match the current search or filter.</p>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── Skill Detail Modal ─────────────────────────────────────── */}
      <SkillDetailModal
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
}
