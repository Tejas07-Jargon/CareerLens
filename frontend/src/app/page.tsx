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

type Tab = "analyse" | "quiz" | "roadmap" | "dashboard" | "batch";

const TABS: { id: Tab; icon: string; label: string; description: string }[] = [
  { id: "analyse",   icon: "🔍", label: "Analyse",    description: "Score your profile against real evidence" },
  { id: "quiz",      icon: "🧠", label: "Quiz",       description: "Expert-level MCQs powered by Gemini AI" },
  { id: "roadmap",   icon: "🗺️", label: "Roadmap",    description: "Personalised 10-week skill-up plan" },
  { id: "dashboard", icon: "📊", label: "Dashboard",  description: "Gap analysis, market intel & timeline" },
  { id: "batch",     icon: "🏢", label: "Batch",      description: "Placement-cell cohort analytics" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("analyse");
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");

  return (
    <main>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                {p === "student" ? "🎓 Student" : "🏢 Placement Cell"}
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
        }}
      >
        <div className="container" style={{ padding: "0 24px" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              overflowX: "auto",
              paddingBottom: "2px",
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
                    padding: "12px 18px",
                    fontFamily: "var(--font)",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    border: "none",
                    borderBottom: isActive
                      ? "3px solid var(--blue)"
                      : "3px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    color: isActive ? "var(--blue)" : "var(--text-mid)",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s var(--ease)",
                    borderRadius: 0,
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Hero (only on Analyse tab, no report) ────────────────────────────── */}
      {activeTab === "analyse" && !report && (
        <section style={{ padding: "52px 0 32px", textAlign: "center" }}>
          <div className="container">
            {/* Live badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                background: "var(--green-light)",
                border: "2px solid var(--green)",
                borderRadius: "99px",
                marginBottom: 24,
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
                DataQuest 3.0 · CareerLens is Live!
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: 16,
                color: "var(--text)",
              }}
            >
              Know exactly how
              <br />
              <span className="gradient-text">job-ready you are</span> 🚀
            </h1>

            <p
              style={{
                fontSize: "1.05rem",
                color: "var(--text-mid)",
                maxWidth: 540,
                margin: "0 auto 32px",
                lineHeight: 1.7,
                fontWeight: 600,
              }}
            >
              Every skill claim verified against real proof of work — GitHub,
              portfolio, resume. Get an explainable score, not just a number.
            </p>

            {/* Quick-action cards */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 36,
              }}
            >
              {[
                { tab: "quiz" as Tab, icon: "🧠", label: "Take Expert Quiz", color: "var(--purple)", bg: "var(--purple-light)" },
                { tab: "roadmap" as Tab, icon: "🗺️", label: "View Roadmap", color: "var(--green)", bg: "var(--green-light)" },
                { tab: "dashboard" as Tab, icon: "📊", label: "Market Intel", color: "var(--orange)", bg: "var(--orange-light)" },
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
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hero on Quiz tab ─────────────────────────────────────────────────── */}
      {activeTab === "quiz" && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8 }}>
              🧠 Expert <span className="gradient-text">Technical Quiz</span>
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
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8 }}>
              🗺️ Your <span className="gradient-text">Career Roadmap</span>
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
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8 }}>
              📊 <span className="gradient-text">Placement Dashboard</span>
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
          style={{
            textAlign: "center",
            padding: "32px 0 24px",
            borderBottom: "2px dashed var(--border)",
            marginBottom: 32,
          }}
        >
          <div className="container">
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8 }}>
              🏢 <span className="gradient-text">Placement Cell</span> Portal
            </h1>
            <p style={{ color: "var(--text-mid)", fontWeight: 600, fontSize: "0.92rem" }}>
              View batch analytics, identify cohort gaps, and optimise workshop scheduling.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: 80 }}>
        {activeTab === "analyse" && (
          <>
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
          </>
        )}

        {activeTab === "quiz" && <QuizTab />}
        {activeTab === "roadmap" && <RoadmapTab />}
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "batch" && <BatchTab />}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "2.5px solid var(--text)",
          background: "var(--white)",
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-mid)" }}>
              Built with ❤️ for DataQuest 3.0 · CareerLens Team
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)",
                    padding: "2px 8px", fontFamily: "var(--font)",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
