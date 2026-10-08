"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Briefcase,
  Sparkles,
  ShieldCheck,
  FileText,
  Sliders,
  GitCompare,
  Plus,
  ArrowRight,
  RotateCcw,
  Check,
  Search,
  X,
} from "lucide-react";
import type { JobFitResult, HoldingBackFactor } from "@/types/jobFit";
import type { ProfileReport } from "@/types";
import { analyzeJobFit, getPresetJobs } from "@/lib/jobFitApi";
import JobFitHero from "./JobFitHero";
import HoldingBackCards from "./HoldingBackCards";
import JobFitSkillMatrix from "./JobFitSkillMatrix";
import JobFitWhatIfSandbox from "./JobFitWhatIfSandbox";
import JobComparisonDrawer from "./JobComparisonDrawer";
import EvidenceDetailModal from "@/components/resume/EvidenceDetailModal";

interface JobFitTabProps {
  profileId?: string | null;
  report?: ProfileReport | null;
  persona?: "student" | "placement";
  onNavigateTab?: (tab: any) => void;
  onSelectRoleForResume?: (role: string) => void;
}

export default function JobFitTab({
  profileId,
  report,
  persona = "student",
  onNavigateTab,
  onSelectRoleForResume,
}: JobFitTabProps) {
  const [jobFitData, setJobFitData] = useState<JobFitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("jd-neuralflow-ai");

  // Custom JD Modal
  const [isCustomJDOpen, setIsCustomJDOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customJDText, setCustomJDText] = useState("");

  // Comparison Drawer
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Evidence Modal drill-down
  const [inspectedSkill, setInspectedSkill] = useState<string | null>(null);

  // Load Job Fit Analysis
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await analyzeJobFit({
          profile_id: profileId || "demo-candidate-82",
          preset_id: selectedPresetId,
        });
        setJobFitData(res);
      } catch (err) {
        console.warn("Job Fit load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profileId, selectedPresetId]);

  const handleApplyCustomJD = async () => {
    if (!customJDText.trim()) return;
    setLoading(true);
    setIsCustomJDOpen(false);
    try {
      const res = await analyzeJobFit({
        profile_id: profileId || "demo-candidate-82",
        jd_text: customJDText,
        job_title: customTitle || "Target Role Job Description",
        company: customCompany || "Target Employer",
      });
      setJobFitData(res);
    } catch (err) {
      console.warn("Custom JD error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWhatIfAction = (factor: HoldingBackFactor) => {
    // Scroll down to What-If sandbox
    const elem = document.getElementById("jobfit-whatif-section");
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  if (loading && !jobFitData) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--purple)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <h3 style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)" }}>Analyzing Proof of Work Against Job Requirements...</h3>
        <p style={{ color: "var(--text-soft)", fontSize: "0.86rem", fontWeight: 600 }}>Cross-referencing GitHub commits, AST telemetry, and importance weights.</p>
      </div>
    );
  }

  if (!jobFitData) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ══════════════════════════════════════════════════════════════════════════
          TOP PRESET JOB PICKER & COMPARISON BAR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        className="card fade-in-up stagger-1"
        style={{
          background: "var(--white)",
          borderColor: "var(--text)",
          boxShadow: "3px 3px 0 var(--text)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
            SELECT BENCHMARK JOB:
          </span>
          {jobFitData.preset_jobs.map((pj) => {
            const isSelected = selectedPresetId === pj.id && !customJDText;
            return (
              <button
                key={pj.id}
                onClick={() => {
                  setCustomJDText("");
                  setSelectedPresetId(pj.id);
                }}
                className="btn"
                style={{
                  fontSize: "0.76rem",
                  padding: "5px 12px",
                  background: isSelected ? "var(--purple)" : "var(--bg-soft)",
                  color: isSelected ? "white" : "var(--text)",
                  borderColor: isSelected ? "var(--text)" : "var(--border)",
                  boxShadow: isSelected ? "2px 2px 0 var(--text)" : "none",
                  fontWeight: 800,
                }}
              >
                {pj.title.split("(")[0]}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            id="btn-paste-custom-jd"
            onClick={() => setIsCustomJDOpen(true)}
            className="btn"
            style={{ fontSize: "0.78rem", padding: "6px 12px", background: "var(--white)", borderColor: "var(--border)", fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={14} /> Paste Custom JD
          </button>
          <button
            id="btn-open-job-comparison"
            onClick={() => setIsComparisonOpen(true)}
            className="btn btn-ghost"
            style={{ fontSize: "0.78rem", padding: "6px 12px", fontWeight: 800, color: "var(--purple)", display: "flex", alignItems: "center", gap: 5 }}
          >
            <GitCompare size={14} /> Compare 3 Roles
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          HERO JOB FIT SCORE & GROUNDED INSIGHTS
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="fade-in-up stagger-2">
        <JobFitHero
          jobFit={jobFitData}
          onOpenJDSelector={() => setIsCustomJDOpen(true)}
          onOptimizeResume={() => {
            onNavigateTab?.("resume");
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          2-COLUMN EXECUTION SECTION: WHAT'S HOLDING YOU BACK & WHAT-IF
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        className="fade-in-up stagger-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        <HoldingBackCards
          factors={jobFitData.holding_back_factors}
          onNavigateRoadmap={() => onNavigateTab?.("roadmap")}
          onNavigateQuiz={() => onNavigateTab?.("quiz")}
          onAddWhatIfAction={handleAddWhatIfAction}
        />

        <div id="jobfit-whatif-section">
          <JobFitWhatIfSandbox baseJobFit={jobFitData} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SKILL-BY-SKILL JOB MATCH TABLE (CLAIM VS PROOF)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="fade-in-up stagger-4">
        <JobFitSkillMatrix
          skillMatches={jobFitData.skill_matches}
          onSelectSkillForEvidence={(s) => setInspectedSkill(s)}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODALS & DRAWERS
          ══════════════════════════════════════════════════════════════════════════ */}
      {/* Custom JD Ingestion Modal */}
      {isCustomJDOpen && (
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
          onClick={() => setIsCustomJDOpen(false)}
        >
          <div
            className="card scale-in"
            style={{
              maxWidth: 620,
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
                <Target size={18} color="var(--purple)" />
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0 }}>
                  Analyze Custom Job Description
                </h3>
              </div>
              <button onClick={() => setIsCustomJDOpen(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>JOB TITLE</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>COMPANY NAME</label>
                  <input
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    placeholder="e.g. Stripe, Razorpay"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>PASTE JOB DESCRIPTION TEXT</label>
                <textarea
                  rows={6}
                  value={customJDText}
                  onChange={(e) => setCustomJDText(e.target.value)}
                  placeholder="Paste responsibilities, required skills, tools, and expectations here to extract requirements deterministically..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "2px solid var(--border)",
                    fontSize: "0.82rem",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "12px 20px",
                background: "var(--bg-soft)",
                borderTop: "1.5px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button onClick={() => setIsCustomJDOpen(false)} className="btn btn-ghost" style={{ fontSize: "0.82rem" }}>
                Cancel
              </button>
              <button
                onClick={handleApplyCustomJD}
                className="btn btn-purple"
                style={{ fontSize: "0.82rem", padding: "6px 18px", fontWeight: 900 }}
              >
                Analyze Job Fit →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Job Comparison Drawer */}
      <JobComparisonDrawer
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        profileId={profileId}
        onSelectJob={(jId) => {
          setSelectedPresetId(jId);
          setCustomJDText("");
        }}
      />

      {/* Clickable Evidence Detail Modal */}
      <EvidenceDetailModal
        isOpen={Boolean(inspectedSkill)}
        onClose={() => setInspectedSkill(null)}
        skillName={inspectedSkill}
        onNavigateRoadmap={() => {
          setInspectedSkill(null);
          onNavigateTab?.("roadmap");
        }}
      />
    </div>
  );
}
