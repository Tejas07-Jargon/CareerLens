"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Target,
  Sparkles,
  ShieldCheck,
  Download,
  Printer,
  History,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Map,
  Eye,
  FileCheck,
  Zap,
  RotateCcw,
  LayoutTemplate,
  Layers,
  Info,
  ExternalLink,
} from "lucide-react";

import type {
  ResumeVersionData,
  ResumeContent,
  ResumeSkill,
  ResumeProject,
  ResumeExperience,
  ResumeEducation,
  ResumeCertification,
  ResumeTemplateId,
  AISuggestion,
} from "@/types/resume";
import type { ProfileReport } from "@/types";

import {
  getSampleResume,
  generateProfileResume,
  listProfileResumes,
  getResumeVersion,
  updateResumeVersion,
  duplicateResumeVersion,
  compareResumeVersions,
  requestAISuggestion,
  exportResumePDF,
} from "@/lib/resumeApi";

import MinimalTemplate from "./templates/MinimalTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import TechnicalTemplate from "./templates/TechnicalTemplate";
import AcademicTemplate from "./templates/AcademicTemplate";

import EvidenceDetailModal from "./EvidenceDetailModal";
import AISuggestionCard from "./AISuggestionCard";
import EvidenceAlertBanner from "./EvidenceAlertBanner";
import QualityScorePanel from "./QualityScorePanel";
import JDAlignmentPanel from "./JDAlignmentPanel";
import ATSCheckerPanel from "./ATSCheckerPanel";
import VersionHistoryModal from "./VersionHistoryModal";
import CustomJDModal from "./CustomJDModal";

interface ResumeBuilderTabProps {
  profileId?: string | null;
  report?: ProfileReport | null;
  persona?: "student" | "placement";
  onNavigateTab?: (tab: any) => void;
  onNavigateWhatIf?: (skillHint: string) => void;
}

type StepId = "target" | "content" | "optimization" | "design" | "preview";

export default function ResumeBuilderTab({
  profileId,
  report,
  persona = "student",
  onNavigateTab,
  onNavigateWhatIf,
}: ResumeBuilderTabProps) {
  const [activeStep, setActiveStep] = useState<StepId>("content");
  const [resumeData, setResumeData] = useState<ResumeVersionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [versionList, setVersionList] = useState<ResumeVersionData[]>([]);

  // Modals state
  const [isJDModalOpen, setIsJDModalOpen] = useState<boolean>(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [selectedEvidenceSkill, setSelectedEvidenceSkill] = useState<string | null>(null);
  const [selectedEvidenceProject, setSelectedEvidenceProject] = useState<string | null>(null);

  // AI Suggestion State
  const [activeAISuggestion, setActiveAISuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [activeSuggestContext, setActiveSuggestContext] = useState<{ type: string; id?: string; bulletIndex?: number } | null>(null);

  // Bottom Insights Sub-tab
  const [insightTab, setInsightTab] = useState<"quality" | "jd" | "ats">("quality");

  // Accordion Sections in Editor
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    header: true,
    summary: true,
    skills: true,
    projects: true,
    experience: false,
    education: false,
    certifications: false,
  });

  const previewRef = useRef<HTMLDivElement>(null);

  // Toggle accordion section
  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Initial load
  useEffect(() => {
    async function loadResume() {
      setIsLoading(true);
      try {
        if (profileId && profileId !== "demo-candidate-82") {
          const list = await listProfileResumes(profileId);
          setVersionList(list);
          if (list && list.length > 0) {
            setResumeData(list[0]);
          } else {
            const created = await generateProfileResume(profileId, report?.role_fits?.[0]?.role || "Software Engineer");
            setResumeData(created);
            setVersionList([created]);
          }
        } else {
          // Demo benchmark candidate
          const sample = await getSampleResume(report?.role_fits?.[0]?.role || "AI Engineer");
          setResumeData(sample);
          setVersionList([sample]);
        }
      } catch (err) {
        console.warn("Falling back to sample resume benchmark:", err);
        const sample = await getSampleResume("Software Engineer");
        setResumeData(sample);
        setVersionList([sample]);
      } finally {
        setIsLoading(false);
      }
    }
    loadResume();
  }, [profileId, report]);

  // Handle content updates
  const handleUpdateContent = async (newContent: ResumeContent) => {
    if (!resumeData) return;
    setResumeData((prev) => (prev ? { ...prev, content: newContent } : null));

    // Debounced or live auto-save
    setIsSaving(true);
    try {
      const updated = await updateResumeVersion(resumeData.id, {
        target_role: resumeData.target_role,
        target_jd_text: resumeData.target_jd_text,
        template_id: resumeData.template_id,
        content: newContent,
      });
      setResumeData(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.warn("Live update sync note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch Template
  const handleSwitchTemplate = async (tmpl: ResumeTemplateId) => {
    if (!resumeData) return;
    setResumeData((prev) => (prev ? { ...prev, template_id: tmpl } : null));
    try {
      const updated = await updateResumeVersion(resumeData.id, {
        template_id: tmpl,
        content: resumeData.content,
      });
      setResumeData(updated);
    } catch (err) {
      console.warn("Template switch note:", err);
    }
  };

  // Handle Role / JD Change
  const handleApplyRoleAndJD = async (role: string, customJD: string) => {
    if (!resumeData) return;
    setIsLoading(true);
    try {
      const updated = await updateResumeVersion(resumeData.id, {
        target_role: role,
        target_jd_text: customJD || null,
        content: {
          ...resumeData.content,
          header: {
            ...resumeData.content.header,
            target_title: role,
          },
        },
      });
      setResumeData(updated);
    } catch (err) {
      console.warn("Failed to apply target role / JD:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Suggestion Handler
  const handleRequestAISuggestion = async (
    section: "summary" | "project_bullet",
    currentText: string,
    contextInfo?: { projectId?: string; bulletIndex?: number }
  ) => {
    if (!resumeData) return;
    setAiLoading(true);
    setActiveSuggestContext({ type: section, id: contextInfo?.projectId, bulletIndex: contextInfo?.bulletIndex });
    try {
      const proj = resumeData.content.projects.find((p) => p.id === contextInfo?.projectId);
      const verifiedSkills = resumeData.content.skills
        .filter((s) => s.evidence_status === "VERIFIED")
        .map((s) => s.name);

      const suggestion = await requestAISuggestion({
        section,
        current_text: currentText,
        target_role: resumeData.target_role,
        project_name: proj?.name,
        technologies: proj?.technologies,
        verified_skills: verifiedSkills,
      });
      setActiveAISuggestion(suggestion);
    } catch (err) {
      console.warn("AI suggestion note:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = (newText: string) => {
    if (!resumeData || !activeSuggestContext) return;
    const content = { ...resumeData.content };

    if (activeSuggestContext.type === "summary") {
      content.summary = newText;
    } else if (activeSuggestContext.type === "project_bullet" && activeSuggestContext.id !== undefined && activeSuggestContext.bulletIndex !== undefined) {
      content.projects = content.projects.map((p) => {
        if (p.id === activeSuggestContext.id) {
          const newBullets = [...p.bullets];
          newBullets[activeSuggestContext.bulletIndex!] = newText;
          return { ...p, bullets: newBullets };
        }
        return p;
      });
    }

    handleUpdateContent(content);
    setActiveAISuggestion(null);
    setActiveSuggestContext(null);
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!resumeData) return;
    try {
      const blob = await exportResumePDF(resumeData.content, resumeData.template_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resumeData.content.header.full_name || "Kareer Kranti"}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.warn("Falling back to print-to-PDF:", err);
      window.print();
    }
  };

  if (isLoading || !resumeData) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--blue)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <h3 style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)" }}>Building Evidence-Backed Resume...</h3>
        <p style={{ color: "var(--text-soft)", fontSize: "0.86rem", fontWeight: 600 }}>Cross-referencing verified static evidence and target role requirements.</p>
      </div>
    );
  }

  const { content, optimization, validation, quality_score, jd_alignment_pct, evidence_coverage_pct, template_id, target_role } = resumeData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ══════════════════════════════════════════════════════════════════════════
          TOP CONTROL BAR & HEADER
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          background: "var(--white)",
          borderColor: "var(--text)",
          boxShadow: "4px 4px 0 var(--text)",
          padding: "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              background: "var(--blue-light)",
              border: "2px solid var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--blue)",
              flexShrink: 0,
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                {resumeData.title || "Kareer Kranti Resume"}
              </h2>
              <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)", fontSize: "0.70rem" }}>
                ✓ Evidence-Aware
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 700 }}>
                Target: <strong style={{ color: "var(--text)" }}>{target_role}</strong>
              </span>
              <button
                id="btn-edit-target-role"
                onClick={() => setIsJDModalOpen(true)}
                className="btn btn-ghost"
                style={{ fontSize: "0.72rem", padding: "2px 6px", fontWeight: 800, color: "var(--blue)" }}
              >
                Change Role / Paste JD →
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Save Status */}
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: isSaving ? "var(--orange)" : "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
            {isSaving ? "Saving..." : saveSuccess ? <><Check size={13} /> Saved</> : "Auto-saved"}
          </span>

          {/* Version History Button */}
          <button
            id="btn-version-history"
            onClick={() => setIsVersionModalOpen(true)}
            className="btn"
            style={{ fontSize: "0.78rem", padding: "6px 12px", background: "var(--white)", borderColor: "var(--border)", fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}
          >
            <History size={14} color="var(--purple)" /> v{resumeData.version_num} History
          </button>

          {/* Export PDF Button */}
          <button
            id="btn-export-pdf"
            onClick={handleDownloadPDF}
            className="btn btn-primary"
            style={{ fontSize: "0.80rem", padding: "6px 16px", fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MULTI-STEP WORKFLOW INDICATOR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {[
          { id: "target", label: "1. Target Role & JD", icon: <Target size={14} /> },
          { id: "content", label: "2. Resume Content", icon: <FileText size={14} /> },
          { id: "optimization", label: "3. JD Optimization", icon: <Zap size={14} /> },
          { id: "design", label: "4. Design & Templates", icon: <LayoutTemplate size={14} /> },
          { id: "preview", label: "5. Live Preview & Export", icon: <Eye size={14} /> },
        ].map((step) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => {
                if (step.id === "target") {
                  setIsJDModalOpen(true);
                } else {
                  setActiveStep(step.id as StepId);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 800,
                borderRadius: "8px",
                border: "2px solid",
                borderColor: isActive ? "var(--text)" : "var(--border)",
                background: isActive ? "var(--blue)" : "var(--white)",
                color: isActive ? "white" : "var(--text-mid)",
                boxShadow: isActive ? "2px 2px 0 var(--text)" : "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {step.icon} {step.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MAIN 2-COLUMN LAYOUT: LEFT EDITOR | RIGHT PREVIEW
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: activeStep === "preview" ? "1fr" : "minmax(340px, 1.15fr) minmax(360px, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ────────────────────────────────────────────────────────────────────────
            LEFT COLUMN: INTERACTIVE EDITOR
            ──────────────────────────────────────────────────────────────────────── */}
        {activeStep !== "preview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Real-time Evidence Alert Banner */}
            {validation?.evidence_alerts && validation.evidence_alerts.length > 0 && (
              <EvidenceAlertBanner
                alerts={validation.evidence_alerts}
                onNavigateRoadmap={() => onNavigateTab?.("roadmap")}
              />
            )}

            {/* Template Selector Bar (When in Design Step) */}
            {activeStep === "design" && (
              <div
                className="card fade-in-up"
                style={{
                  background: "var(--white)",
                  borderColor: "var(--blue)",
                  boxShadow: "3px 3px 0 var(--blue)",
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800, marginBottom: 8 }}>
                  CHOOSE ATS-FRIENDLY RESUME TEMPLATE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { id: "modern", title: "Modern Technical", desc: "Accent divider & balanced hierarchy" },
                    { id: "minimal", title: "Minimal Classic", desc: "Single column technical format" },
                    { id: "technical", title: "Engineered Stack", desc: "Optimized for SWE / AI repo proof" },
                    { id: "academic", title: "Academic & Scholar", desc: "Research, education & coursework" },
                  ].map((tmpl) => {
                    const isSelected = template_id === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => handleSwitchTemplate(tmpl.id as ResumeTemplateId)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          textAlign: "left",
                          border: `2px solid ${isSelected ? "var(--blue)" : "var(--border)"}`,
                          background: isSelected ? "var(--blue-light)" : "var(--bg-soft)",
                          cursor: "pointer",
                          boxShadow: isSelected ? "2px 2px 0 var(--blue)" : "none",
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--text)" }}>{tmpl.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>{tmpl.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 1: HEADER & CONTACT */}
            <div className="card" style={{ background: "var(--white)", padding: "16px 20px" }}>
              <div
                onClick={() => toggleSection("header")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                  1. Contact Information
                </h3>
                {openSections.header ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.header && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>FULL NAME</label>
                    <input
                      type="text"
                      value={content.header.full_name}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, full_name: e.target.value },
                        })
                      }
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem", fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>TARGET TITLE</label>
                    <input
                      type="text"
                      value={content.header.target_title}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, target_title: e.target.value },
                        })
                      }
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem", fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>EMAIL ADDRESS</label>
                    <input
                      type="email"
                      value={content.header.email}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, email: e.target.value },
                        })
                      }
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>LOCATION</label>
                    <input
                      type="text"
                      value={content.header.location || ""}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, location: e.target.value },
                        })
                      }
                      placeholder="Bengaluru, India"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>GITHUB URL</label>
                    <input
                      type="text"
                      value={content.header.github || ""}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, github: e.target.value },
                        })
                      }
                      placeholder="https://github.com/username"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>LINKEDIN URL</label>
                    <input
                      type="text"
                      value={content.header.linkedin || ""}
                      onChange={(e) =>
                        handleUpdateContent({
                          ...content,
                          header: { ...content.header, linkedin: e.target.value },
                        })
                      }
                      placeholder="https://linkedin.com/in/username"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: PROFESSIONAL SUMMARY */}
            <div className="card" style={{ background: "var(--white)", padding: "16px 20px" }}>
              <div
                onClick={() => toggleSection("summary")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                    2. Professional Summary
                  </h3>
                  <span className="badge" style={{ fontSize: "0.68rem", background: "var(--blue-light)", color: "var(--blue)" }}>
                    Verified Framing
                  </span>
                </div>
                {openSections.summary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.summary && (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    rows={4}
                    value={content.summary}
                    onChange={(e) =>
                      handleUpdateContent({
                        ...content,
                        summary: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid var(--border)",
                      fontFamily: "var(--font)",
                      fontSize: "0.82rem",
                      lineHeight: 1.5,
                      color: "var(--text)",
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-soft)" }}>
                      Grounds solely in verified repositories &amp; skills. Zero fabricated claims.
                    </span>
                    <button
                      id="btn-improve-summary"
                      onClick={() => handleRequestAISuggestion("summary", content.summary)}
                      disabled={aiLoading}
                      className="btn"
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        background: "var(--purple-light)",
                        color: "var(--purple)",
                        borderColor: "var(--purple)",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Sparkles size={12} /> {aiLoading ? "Generating..." : "Improve with Kareer Kranti"}
                    </button>
                  </div>

                  {activeAISuggestion && activeSuggestContext?.type === "summary" && (
                    <AISuggestionCard
                      suggestion={activeAISuggestion}
                      onApply={handleApplySuggestion}
                      onDismiss={() => {
                        setActiveAISuggestion(null);
                        setActiveSuggestContext(null);
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: SKILLS WITH EVIDENCE BADGES */}
            <div className="card" style={{ background: "var(--white)", padding: "16px 20px" }}>
              <div
                onClick={() => toggleSection("skills")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                    3. Technical Skills &amp; Evidence Badges
                  </h3>
                  <span className="badge" style={{ fontSize: "0.68rem", background: "var(--green-light)", color: "var(--green)" }}>
                    {content.skills.length} Items
                  </span>
                </div>
                {openSections.skills ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.skills && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {content.skills.map((skill) => {
                      const isVerified = skill.evidence_status === "VERIFIED";
                      const isWeak = skill.evidence_status === "WEAK" || skill.evidence_status === "UNVERIFIED";
                      return (
                        <div
                          key={skill.name}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: "8px",
                            background: isVerified ? "var(--green-light)" : isWeak ? "var(--yellow-light)" : "var(--bg-soft)",
                            border: `1.5px solid ${isVerified ? "var(--green)" : isWeak ? "var(--yellow)" : "var(--border)"}`,
                            fontSize: "0.78rem",
                            fontWeight: 800,
                          }}
                        >
                          <span
                            onClick={() => setSelectedEvidenceSkill(skill.name)}
                            style={{ cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}
                            title="Click to view supporting proof of work"
                          >
                            {isVerified && <ShieldCheck size={13} color="var(--green)" />}
                            {skill.name}
                          </span>

                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: isVerified ? "var(--green)" : "var(--text-soft)",
                              fontWeight: 900,
                            }}
                          >
                            {skill.confidence}%
                          </span>

                          <button
                            onClick={() => {
                              const updatedSkills = content.skills.filter((s) => s.name !== skill.name);
                              handleUpdateContent({ ...content, skills: updatedSkills });
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-soft)", padding: 0, marginLeft: 2 }}
                            title="Remove skill"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add skill input */}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      id="input-add-skill"
                      type="text"
                      placeholder="Add another skill (e.g. PyTorch, Redis)..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !content.skills.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
                            const newSkill: ResumeSkill = {
                              name: val,
                              category: "Tools & DevOps",
                              evidence_status: "UNVERIFIED",
                              confidence: 40,
                            };
                            handleUpdateContent({ ...content, skills: [...content.skills, newSkill] });
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                      style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1.5px solid var(--border)", fontSize: "0.78rem" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: PROJECTS WITH IMPACT BULLETS */}
            <div className="card" style={{ background: "var(--white)", padding: "16px 20px" }}>
              <div
                onClick={() => toggleSection("projects")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                    4. Projects &amp; GitHub Proof
                  </h3>
                  <span className="badge" style={{ fontSize: "0.68rem", background: "var(--blue-light)", color: "var(--blue)" }}>
                    {content.projects.length} Repos
                  </span>
                </div>
                {openSections.projects ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.projects && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {content.projects.map((proj, pIdx) => (
                    <div
                      key={proj.id}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        background: "var(--bg-soft)",
                        border: "1.5px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => {
                              const newProjects = [...content.projects];
                              newProjects[pIdx].name = e.target.value;
                              handleUpdateContent({ ...content, projects: newProjects });
                            }}
                            style={{ fontWeight: 900, fontSize: "0.90rem", color: "var(--text)", border: "none", background: "transparent", outline: "none" }}
                          />
                          <button
                            onClick={() => setSelectedEvidenceProject(proj.name)}
                            className="badge"
                            style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)", cursor: "pointer", fontSize: "0.68rem" }}
                          >
                            ✓ Proven Repo
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const newProjects = content.projects.filter((p) => p.id !== proj.id);
                            handleUpdateContent({ ...content, projects: newProjects });
                          }}
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "var(--pink)" }}
                          title="Delete project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Technologies tags */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {proj.technologies.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: "0.70rem",
                              fontWeight: 700,
                              background: "var(--white)",
                              border: "1px solid var(--border)",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Bullets */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {proj.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <span style={{ fontWeight: 900, color: "var(--text-soft)", marginTop: 6 }}>•</span>
                              <textarea
                                rows={2}
                                value={bullet}
                                onChange={(e) => {
                                  const newProjects = [...content.projects];
                                  newProjects[pIdx].bullets[bIdx] = e.target.value;
                                  handleUpdateContent({ ...content, projects: newProjects });
                                }}
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  fontSize: "0.78rem",
                                  lineHeight: 1.4,
                                }}
                              />
                              <button
                                onClick={() =>
                                  handleRequestAISuggestion("project_bullet", bullet, {
                                    projectId: proj.id,
                                    bulletIndex: bIdx,
                                  })
                                }
                                disabled={aiLoading}
                                className="btn btn-ghost"
                                style={{ padding: "6px 8px", fontSize: "0.72rem", color: "var(--purple)" }}
                                title="Improve this bullet with Kareer Kranti"
                              >
                                <Sparkles size={13} />
                              </button>
                            </div>

                            {activeAISuggestion &&
                              activeSuggestContext?.type === "project_bullet" &&
                              activeSuggestContext?.id === proj.id &&
                              activeSuggestContext?.bulletIndex === bIdx && (
                                <AISuggestionCard
                                  suggestion={activeAISuggestion}
                                  onApply={handleApplySuggestion}
                                  onDismiss={() => {
                                    setActiveAISuggestion(null);
                                    setActiveSuggestContext(null);
                                  }}
                                />
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 5: EDUCATION */}
            <div className="card" style={{ background: "var(--white)", padding: "16px 20px" }}>
              <div
                onClick={() => toggleSection("education")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                  5. Education &amp; Coursework
                </h3>
                {openSections.education ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.education && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {content.education.map((edu, idx) => (
                    <div key={edu.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: "0.70rem", fontWeight: 800, color: "var(--text-soft)" }}>DEGREE</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => {
                            const newEdu = [...content.education];
                            newEdu[idx].degree = e.target.value;
                            handleUpdateContent({ ...content, education: newEdu });
                          }}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.80rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.70rem", fontWeight: 800, color: "var(--text-soft)" }}>INSTITUTION</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => {
                            const newEdu = [...content.education];
                            newEdu[idx].institution = e.target.value;
                            handleUpdateContent({ ...content, education: newEdu });
                          }}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.80rem" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            RIGHT COLUMN: LIVE PRINTABLE RESUME PREVIEW
            ──────────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "sticky",
            top: "135px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Preview Action Header */}
          <div
            className="card"
            style={{
              background: "var(--white)",
              borderColor: "var(--text)",
              boxShadow: "3px 3px 0 var(--text)",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={15} color="var(--blue)" />
              <span style={{ fontWeight: 900, fontSize: "0.82rem", color: "var(--text)" }}>
                Live Resume Preview
              </span>
              <span className="badge" style={{ fontSize: "0.65rem", background: "var(--bg-soft)", color: "var(--text-soft)" }}>
                {template_id.toUpperCase()}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => window.print()}
                className="btn btn-ghost"
                style={{ fontSize: "0.74rem", padding: "4px 8px" }}
                title="Print Preview"
              >
                <Printer size={13} /> Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="btn btn-primary"
                style={{ fontSize: "0.74rem", padding: "4px 10px", fontWeight: 800 }}
              >
                <Download size={13} /> PDF
              </button>
            </div>
          </div>

          {/* Printable White Resume Sheet Container */}
          <div
            ref={previewRef}
            style={{
              background: "#525659",
              padding: "16px",
              borderRadius: "12px",
              border: "2px solid var(--text)",
              boxShadow: "4px 4px 0 var(--text)",
              overflowY: "auto",
              maxHeight: "calc(100vh - 220px)",
            }}
          >
            <div
              style={{
                boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                borderRadius: "2px",
                overflow: "hidden",
                margin: "0 auto",
                maxWidth: "720px",
              }}
            >
              {template_id === "minimal" && (
                <MinimalTemplate
                  content={content}
                  onSkillClick={(s) => setSelectedEvidenceSkill(s)}
                  onProjectClick={(p) => setSelectedEvidenceProject(p)}
                />
              )}
              {template_id === "modern" && (
                <ModernTemplate
                  content={content}
                  onSkillClick={(s) => setSelectedEvidenceSkill(s)}
                  onProjectClick={(p) => setSelectedEvidenceProject(p)}
                />
              )}
              {template_id === "technical" && (
                <TechnicalTemplate
                  content={content}
                  onSkillClick={(s) => setSelectedEvidenceSkill(s)}
                  onProjectClick={(p) => setSelectedEvidenceProject(p)}
                />
              )}
              {template_id === "academic" && (
                <AcademicTemplate
                  content={content}
                  onSkillClick={(s) => setSelectedEvidenceSkill(s)}
                  onProjectClick={(p) => setSelectedEvidenceProject(p)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          BOTTOM SECTION: 3 INTELLIGENCE AUDIT PANELS (QUALITY · JD GAPS · ATS)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 18,
          marginTop: 10,
        }}
      >
        <QualityScorePanel
          score={quality_score}
          breakdown={optimization?.quality_breakdown}
        />

        <JDAlignmentPanel
          optimization={optimization}
          onNavigateRoadmap={() => onNavigateTab?.("roadmap")}
          onNavigateWhatIf={(gapSkill) => onNavigateWhatIf?.(gapSkill)}
        />

        <ATSCheckerPanel
          validation={validation}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODALS & DRAWERS
          ══════════════════════════════════════════════════════════════════════════ */}
      {/* Clickable Evidence Modal */}
      <EvidenceDetailModal
        isOpen={Boolean(selectedEvidenceSkill || selectedEvidenceProject)}
        onClose={() => {
          setSelectedEvidenceSkill(null);
          setSelectedEvidenceProject(null);
        }}
        skillName={selectedEvidenceSkill}
        skillData={content.skills.find((s) => s.name === selectedEvidenceSkill)}
        projectName={selectedEvidenceProject}
        projectData={content.projects.find((p) => p.name === selectedEvidenceProject)}
        onNavigateRoadmap={() => onNavigateTab?.("roadmap")}
      />

      {/* Custom JD Modal */}
      <CustomJDModal
        isOpen={isJDModalOpen}
        onClose={() => setIsJDModalOpen(false)}
        currentRole={target_role}
        currentJDText={resumeData.target_jd_text}
        onApplyRoleAndJD={handleApplyRoleAndJD}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versions={versionList}
        currentVersionId={resumeData.id}
        onSelectVersion={async (vId) => {
          const ver = await getResumeVersion(vId);
          setResumeData(ver);
        }}
        onDuplicateVersion={async (vId) => {
          const duplicated = await duplicateResumeVersion(vId);
          setResumeData(duplicated);
          setVersionList((prev) => [duplicated, ...prev]);
        }}
      />
    </div>
  );
}
