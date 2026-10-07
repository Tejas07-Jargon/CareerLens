"use client";

import { useState } from "react";
import Link from "next/link";
import SubmitForm from "@/components/ui/SubmitForm";
import ReportView from "@/components/evidence/ReportView";
import QuizTab from "@/components/quiz/QuizTab";
import RoadmapTab from "@/components/roadmap/RoadmapTab";
import DashboardTab from "@/components/dashboard/DashboardTab";
import BatchTab from "@/components/batch/BatchTab";
import EvidenceDashboardWidget from "@/components/evidence/EvidenceDashboardWidget";
import type { ProfileReport } from "@/types";
import { Search, BrainCircuit, Map, LayoutDashboard, Building2, GraduationCap } from "lucide-react";

type Tab = "analyse" | "quiz" | "roadmap" | "dashboard" | "batch";

const TABS: { id: Tab; icon: React.ReactNode; label: string; description: string }[] = [
  { id: "analyse",   icon: <Search size={18} />, label: "Analyse",    description: "Score your profile against real evidence" },
  { id: "quiz",      icon: <BrainCircuit size={18} />, label: "Quiz",       description: "Expert-level MCQs powered by Gemini AI" },
  { id: "roadmap",   icon: <Map size={18} />, label: "Roadmap",    description: "Personalised 10-week skill-up plan" },
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard",  description: "Gap analysis, market intel & timeline" },
  { id: "batch",     icon: <Building2 size={18} />, label: "Batch",      description: "Placement-cell cohort analytics" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("analyse");
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="nav-bar">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "transform var(--dur-fast) var(--ease-spring)",
            }}
            onClick={() => { setActiveTab("analyse"); setReport(null); }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "var(--blue)",
                borderRadius: "10px 13px 9px 12px",
                border: "2.5px solid var(--text)",
                boxShadow: "2px 2px 0 var(--text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                transition: "transform var(--dur-fast) var(--ease-spring)",
              }}
            >
              🔍
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              Career<span className="gradient-text">Lens</span>
            </span>
          </div>

          {/* Nav links & Persona switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/evidence"
              className="btn"
              style={{
                padding: "7px 16px",
                fontSize: "0.82rem",
                background: "var(--blue-light)",
                color: "var(--blue)",
                borderColor: "var(--blue)",
                boxShadow: "2px 2px 0 var(--blue)",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🔍 Evidence Verification
            </Link>

            {(["student", "placement"] as const).map((p, i) => (
              <button
                key={p}
                id={`persona-${p}`}
                onClick={() => {
                  setPersona(p);
                  if (p === "placement") setActiveTab("batch");
                  else setActiveTab("analyse");
                }}
                className="btn"
                style={{
                  padding: "7px 18px",
                  fontSize: "0.82rem",
                  background:
                    persona === p
                      ? i === 0
                        ? "var(--blue)"
                        : "var(--purple)"
                      : "var(--white)",
                  color: persona === p ? "white" : "var(--text-mid)",
                  borderColor: persona === p ? "var(--text)" : "var(--border)",
                  boxShadow: persona === p ? "var(--shadow-sm)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {p === "student" ? <><GraduationCap size={16} /> Student</> : <><Building2 size={16} /> Placement Cell</>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--white)",
          borderBottom: "2.5px solid var(--border)",
          position: "sticky",
          top: "65px",
          zIndex: 90,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div className="container" style={{ padding: "0 24px" }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: "2px",
              paddingTop: "4px",
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 18px",
                    fontFamily: "var(--font)",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    border: "2px solid",
                    borderColor: isActive ? "var(--text)" : "transparent",
                    background: isActive ? "var(--bg-soft)" : "transparent",
                    cursor: "pointer",
                    color: isActive ? "var(--text)" : "var(--text-mid)",
                    whiteSpace: "nowrap",
                    borderRadius: "10px 12px 8px 11px",
                    boxShadow: isActive ? "2px 2px 0 var(--text)" : "none",
                    transform: isActive ? "translateY(-1px)" : "none",
                    transition: "all var(--dur-fast) var(--ease-out)",
                  }}
                >
                  <span style={{ fontSize: "1.05rem", display: "flex" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Hero (only on Analyse tab, no report) ────────────────────────────── */}
      {activeTab === "analyse" && !report && (
        <section style={{ padding: "48px 0 28px", textAlign: "center" }}>
          <div className="container">
            {/* Live badge */}
            <div
              className="fade-in-up stagger-1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                background: "var(--green-light)",
                border: "2px solid var(--green)",
                borderRadius: "99px",
                marginBottom: 20,
                boxShadow: "2px 2px 0 var(--green)",
              }}
            >
              <div className="pulse-dot" />
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--green)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                DataQuest 3.0 · CareerLens Evidence Engine Active
              </span>
            </div>

            <h1
              className="fade-in-up stagger-2"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.4rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 16,
                color: "var(--text)",
              }}
            >
              Know exactly how
              <br />
              <span className="gradient-text">job-ready you are</span>
            </h1>

            <p
              className="fade-in-up stagger-3"
              style={{
                fontSize: "1.05rem",
                color: "var(--text-mid)",
                maxWidth: 560,
                margin: "0 auto 28px",
                lineHeight: 1.7,
                fontWeight: 600,
              }}
            >
              Every skill claim verified against real proof of work — GitHub commits,
              project code, and live deployments. Get a 100% explainable score, not AI guesswork.
            </p>

            {/* Quick-action cards */}
            <div
              className="fade-in-up stagger-4"
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 32,
              }}
            >
              {[
                { tab: "quiz" as Tab, icon: <BrainCircuit size={16}/>, label: "Take Expert Quiz", color: "var(--purple)", bg: "var(--purple-light)" },
                { tab: "roadmap" as Tab, icon: <Map size={16}/>, label: "View Roadmap", color: "var(--green)", bg: "var(--green-light)" },
                { tab: "dashboard" as Tab, icon: <LayoutDashboard size={16}/>, label: "Market Intel", color: "var(--orange)", bg: "var(--orange-light)" },
              ].map((a) => (
                <button
                  key={a.tab}
                  id={`quick-action-${a.tab}`}
                  onClick={() => setActiveTab(a.tab)}
                  className="btn"
                  style={{
                    background: a.bg,
                    borderColor: a.color,
                    boxShadow: `3px 3px 0 ${a.color}`,
                    color: a.color,
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    padding: "10px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {a.icon} {a.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hero on Quiz tab ─────────────────────────────────────────────────── */}
      {activeTab === "quiz" && (
        <div
          className="fade-in-up"
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <BrainCircuit size={32} /> Expert <span className="gradient-text">Technical Quiz</span>
            </h1>
            <p style={{ color: "var(--text-mid)", fontWeight: 600, fontSize: "0.92rem" }}>
              Gemini AI generates FAANG-level questions tailored to your role &amp; skills.
              Find out where you actually stand.
            </p>
          </div>
        </div>
      )}

      {/* ── Roadmap hero ─────────────────────────────────────────────────────── */}
      {activeTab === "roadmap" && (
        <div
          className="fade-in-up"
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <Map size={32} /> Your <span className="gradient-text">Career Roadmap</span>
            </h1>
            <p style={{ color: "var(--text-mid)", fontWeight: 600, fontSize: "0.92rem" }}>
              A structured, week-by-week plan to close your skill gaps and become placement-ready.
            </p>
          </div>
        </div>
      )}

      {/* ── Dashboard hero ───────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div
          className="fade-in-up"
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <LayoutDashboard size={32} /> <span className="gradient-text">Placement Dashboard</span>
            </h1>
            <p style={{ color: "var(--text-mid)", fontWeight: 600, fontSize: "0.92rem" }}>
              Market intelligence, skill gap analysis, and your consistency timeline in one place.
            </p>
          </div>
        </div>
      )}

      {/* ── Batch hero ───────────────────────────────────────────────────────── */}
      {activeTab === "batch" && (
        <div
          className="fade-in-up"
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <Building2 size={32} /> <span className="gradient-text">Placement Cell</span> Portal
            </h1>
            <p style={{ color: "var(--text-mid)", fontWeight: 600, fontSize: "0.92rem" }}>
              View batch analytics, identify cohort gaps, and optimise workshop scheduling.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: 40, flex: 1 }}>
        {activeTab === "analyse" && (
          <div key={report ? "report-view" : "submit-view"} className="fade-in-up">
            {!report ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
                  <EvidenceDashboardWidget />
                </div>
                <SubmitForm
                  onProfileCreated={(id) => setProfileId(id)}
                  onReportReady={(r) => setReport(r)}
                />
              </div>
            ) : (
              <ReportView
                report={report}
                persona={persona}
                onReset={() => {
                  setReport(null);
                  setProfileId(null);
                }}
              />
            )}
          </div>
        )}

        {activeTab === "quiz" && <div key="quiz-view" className="fade-in-up"><QuizTab /></div>}
        {activeTab === "roadmap" && <div key="roadmap-view" className="fade-in-up"><RoadmapTab /></div>}
        {activeTab === "dashboard" && <div key="dashboard-view" className="fade-in-up"><DashboardTab /></div>}
        {activeTab === "batch" && <div key="batch-view" className="fade-in-up"><BatchTab /></div>}
      </div>

    </main>
  );
}

