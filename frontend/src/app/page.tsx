"use client";

import { useState } from "react";
import Link from "next/link";
import CareerLensLoading from "@/components/loading/CareerLensLoading";
import { SocialFlipButton } from "@/components/ui/social-flip-button";
import SubmitForm from "@/components/ui/SubmitForm";
import ReportView from "@/components/evidence/ReportView";
import QuizTab from "@/components/quiz/QuizTab";
import RoadmapTab from "@/components/roadmap/RoadmapTab";
import DashboardTab from "@/components/dashboard/DashboardTab";
import BatchTab from "@/components/batch/BatchTab";
import EvidenceDashboardWidget from "@/components/evidence/EvidenceDashboardWidget";
import type { ProfileReport } from "@/types";
import {
  Search,
  BrainCircuit,
  Map,
  LayoutDashboard,
  Building2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";

type Tab = "dashboard" | "analyse" | "roadmap" | "quiz" | "batch" | "evidence";

const TABS: { id: Tab; icon: React.ReactNode; label: string; description: string }[] = [
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard",   description: "Command center · score, gaps, roadmap & next action" },
  { id: "analyse",   icon: <Search size={18} />,          label: "Analyse",     description: "Score your profile against real evidence" },
  { id: "roadmap",   icon: <Map size={18} />,             label: "Roadmap",     description: "Personalised 10-week skill-up plan" },
  { id: "quiz",      icon: <BrainCircuit size={18} />,    label: "Quiz",        description: "Expert-level MCQs powered by Gemini AI" },
  { id: "batch",     icon: <Building2 size={18} />,       label: "Cohort Batch", description: "Placement-cell cohort analytics" },
];

const SAMPLE_BENCHMARK_REPORT: ProfileReport = {
  profile_id: "demo-candidate-82",
  status: "complete",
  security_flags: [],
  score: {
    mid: 82,
    lo: 76,
    hi: 88,
  },
  components: {
    skill_coverage: {
      value: 84,
      weight: 0.35,
      reason: "High verified coverage for backend engineering: Python, SQL, and FastAPI",
      evidence_ids: ["ev_1", "ev_2"]
    },
    project_depth: {
      value: 78,
      weight: 0.25,
      reason: "Production microservice with database migrations and automated unit tests",
      evidence_ids: ["ev_3"]
    },
    consistency_growth: {
      value: 92,
      weight: 0.15,
      reason: "Continuous weekly contributions across 46 active weeks in the past year",
      evidence_ids: ["ev_4"]
    },
    portfolio_presentation: {
      value: 65,
      weight: 0.15,
      reason: "Good README and API specs; live deployment or demo video unavailable",
      evidence_ids: ["ev_5"]
    },
    professional_signals: {
      value: 76,
      weight: 0.10,
      reason: "Open-source contributions and maintainer code reviews verified",
      evidence_ids: ["ev_6"]
    }
  },
  credibility: {
    verified_ratio: 0.82,
    verified_count: 9,
    total_claims: 11,
    flags: []
  },
  claim_statuses: [
    {
      skill: "Python",
      status: "Verified",
      confidence: 0.91,
      evidence_ids: ["ev_1"],
      locators: [{ repo: "backend-microservice", path: "app/main.py" }]
    },
    {
      skill: "SQL",
      status: "Verified",
      confidence: 0.85,
      evidence_ids: ["ev_2"],
      locators: [{ repo: "backend-microservice", path: "alembic/versions/001.py" }]
    },
    {
      skill: "FastAPI",
      status: "Verified",
      confidence: 0.88,
      evidence_ids: ["ev_3"],
      locators: [{ repo: "backend-microservice", path: "app/routers/api.py" }]
    },
    {
      skill: "Git",
      status: "Verified",
      confidence: 0.94,
      evidence_ids: ["ev_4"],
      locators: [{ weekly_series: [3, 4, 2, 5, 6, 8, 4, 3, 5, 7, 6, 4, 8, 9, 7, 6, 5, 4, 3, 6, 8, 9, 11, 7, 6, 8, 5, 4, 6, 7, 8, 9, 6, 5, 4, 7, 8, 9, 10, 6, 7, 8, 5, 6, 7, 8, 9, 6, 7, 8, 5, 4] }]
    },
    {
      skill: "Docker",
      status: "Partial",
      confidence: 0.42,
      evidence_ids: ["ev_7"],
      locators: [{ repo: "backend-microservice", path: "Dockerfile" }]
    },
    {
      skill: "System Design",
      status: "Partial",
      confidence: 0.48,
      evidence_ids: ["ev_8"],
      locators: [{ repo: "backend-microservice", path: "docs/architecture.md" }]
    },
    {
      skill: "AWS",
      status: "Not yet evidenced",
      confidence: 0.18,
      evidence_ids: [],
      locators: []
    }
  ],
  role_fits: [
    {
      role: "Software Engineer",
      fit_pct: 84,
      gap_skills: ["Docker", "System Design", "AWS"]
    },
    {
      role: "Backend Developer",
      fit_pct: 88,
      gap_skills: ["Docker", "Redis", "Kafka"]
    },
    {
      role: "Full Stack Developer",
      fit_pct: 74,
      gap_skills: ["React", "TypeScript", "Tailwind"]
    },
    {
      role: "DevOps Engineer",
      fit_pct: 46,
      gap_skills: ["Kubernetes", "Terraform", "CI/CD"]
    }
  ],
  gaps: [
    {
      skill: "Docker",
      importance: 0.88,
      market_frequency: 0.82,
      current_confidence: 0.42,
      priority_score: 0.86,
      action: "Implement multi-stage production Dockerfile and compose orchestration"
    },
    {
      skill: "System Design",
      importance: 0.92,
      market_frequency: 0.90,
      current_confidence: 0.48,
      priority_score: 0.84,
      action: "Publish an architectural RFC document with caching and load test benchmarks"
    },
    {
      skill: "AWS",
      importance: 0.85,
      market_frequency: 0.78,
      current_confidence: 0.18,
      priority_score: 0.78,
      action: "Deploy an IaC Terraform or CDK template with live S3/Lambda stack"
    }
  ],
  roadmap: [
    {
      milestone: "Containerize Backend with Docker Compose",
      gap_closed: "Docker",
      estimated_hours: 15,
      proof_artifact: "docker-compose.yml + Multi-stage Dockerfile",
      related_repo: "backend-microservice",
      resources: ["https://roadmap.sh/docker", "https://docs.docker.com"]
    },
    {
      milestone: "Distributed Caching & Scalability RFC",
      gap_closed: "System Design",
      estimated_hours: 20,
      proof_artifact: "RFC architectural document with Locust load benchmarks",
      related_repo: "backend-microservice",
      resources: ["https://roadmap.sh/system-design"]
    }
  ]
};

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [report, setReport] = useState<ProfileReport | null>(SAMPLE_BENCHMARK_REPORT);
  const [profileId, setProfileId] = useState<string | null>("demo-candidate-82");
  const [persona, setPersona] = useState<"student" | "placement">("student");
  const [viewDetailedReport, setViewDetailedReport] = useState<boolean>(false);

  function handleProfileCreated(id: string) {
    setProfileId(id);
  }

  function handleReportReady(r: ProfileReport) {
    setReport(r);
    setViewDetailedReport(false);
    setActiveTab("dashboard");
  }

  function handleLoadBenchmark() {
    setReport(SAMPLE_BENCHMARK_REPORT);
    setProfileId("demo-candidate-82");
    setActiveTab("dashboard");
  }

  function handleTabSwitch(tab: Tab | "evidence") {
    if (tab === "evidence") {
      window.location.href = "/evidence";
      return;
    }
    setActiveTab(tab);
  }

  return (
    <>
      {isLoading && <CareerLensLoading onComplete={() => setIsLoading(false)} />}
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        
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
              onClick={() => {
                setActiveTab("dashboard");
              }}
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
                  color: "white",
                  transition: "transform var(--dur-fast) var(--ease-spring)",
                }}
              >
                <Search size={20} strokeWidth={2.5} />
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
                <ShieldCheck size={16} /> Evidence Verification
              </Link>

              {(["student", "placement"] as const).map((p, i) => (
                <button
                  key={p}
                  id={`persona-${p}`}
                  onClick={() => {
                    setPersona(p);
                    if (p === "placement") {
                      setActiveTab("batch");
                    } else {
                      setActiveTab("dashboard");
                    }
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
                paddingBottom: "4px",
                paddingTop: "6px",
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "9px 18px",
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

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <div className="container" style={{ padding: "28px 24px 60px", flex: 1 }}>
          
          {/* TAB 1: DASHBOARD COMMAND CENTER */}
          {activeTab === "dashboard" && (
            <div key="dashboard-command-center" className="fade-in-up">
              <DashboardTab
                profileId={profileId}
                report={report}
                persona={persona}
                onNavigateTab={handleTabSwitch}
                onReanalyze={() => setActiveTab("analyse")}
                onLoadBenchmark={handleLoadBenchmark}
              />
            </div>
          )}

          {/* TAB 2: ANALYSE / REPORT VIEW */}
          {activeTab === "analyse" && (
            <div key="analyse-view" className="fade-in-up">
              {report && viewDetailedReport ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <button
                      onClick={() => setViewDetailedReport(false)}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.85rem", fontWeight: 800 }}
                    >
                      ← Back to Command Center
                    </button>
                    <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)" }}>
                      Full Detailed Report
                    </span>
                  </div>
                  <ReportView
                    report={report}
                    persona={persona}
                    onOpenDashboard={() => setViewDetailedReport(false)}
                    onReset={() => {
                      setReport(null);
                      setProfileId(null);
                      setViewDetailedReport(false);
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", textAlign: "center" }}>
                    <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: 8 }}>
                      Analyse Profile &amp; Verify <span className="gradient-text">Proof of Work</span>
                    </h1>
                    <p style={{ color: "var(--text-mid)", fontSize: "0.92rem", fontWeight: 600, marginBottom: 24 }}>
                      Submit your resume, GitHub username, and target role to trigger deterministic static analysis.
                    </p>
                    <EvidenceDashboardWidget profileId={profileId || undefined} />
                  </div>
                  <SubmitForm
                    onProfileCreated={handleProfileCreated}
                    onReportReady={handleReportReady}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROADMAP */}
          {activeTab === "roadmap" && (
            <div key="roadmap-view" className="fade-in-up">
              <RoadmapTab
                profileId={profileId}
                report={report}
                onNavigateToAnalyse={() => setActiveTab("analyse")}
              />
            </div>
          )}

          {/* TAB 4: QUIZ */}
          {activeTab === "quiz" && (
            <div key="quiz-view" className="fade-in-up">
              <QuizTab profileId={profileId} report={report} />
            </div>
          )}

          {/* TAB 5: BATCH */}
          {activeTab === "batch" && (
            <div key="batch-view" className="fade-in-up">
              <BatchTab />
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <footer
          style={{
            marginTop: "auto",
            borderTop: "1.5px solid var(--border)",
            background: "rgba(244, 240, 232, 0.45)",
            padding: "16px 24px",
          }}
        >
          <div
            className="container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted, #596575)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontWeight: 800, color: "var(--text)" }}>CareerLens</span>
              <span>·</span>
              <span>Evidence-based employability &amp; skill verification</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SocialFlipButton />
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
