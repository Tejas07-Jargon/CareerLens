"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import CareerLensLoading from "@/components/loading/CareerLensLoading";
import { SocialFlipButton } from "@/components/ui/social-flip-button";
import LoginScreen from "@/components/ui/LoginScreen";
import { searchProfile, getReport } from "@/lib/api";
import SubmitForm from "@/components/ui/SubmitForm";
import ReportView from "@/components/evidence/ReportView";
import QuizTab from "@/components/quiz/QuizTab";
import RoadmapTab from "@/components/roadmap/RoadmapTab";
import DashboardTab from "@/components/dashboard/DashboardTab";
import BatchTab from "@/components/batch/BatchTab";
import EvidenceDashboardWidget from "@/components/evidence/EvidenceDashboardWidget";
import ResumeBuilderTab from "@/components/resume/ResumeBuilderTab";
import JobFitTab from "@/components/job-fit/JobFitTab";
import OwnershipPanel from "@/components/ownership/OwnershipPanel";
import LeetCodeAnalyzer from "@/components/leetcode/LeetCodeAnalyzer";
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
  ArrowRight,
  FileText,
  Target,
  FolderGit2,
  Code2
} from "lucide-react";

type Tab = "dashboard" | "resume" | "jobfit" | "analyse" | "ownership" | "roadmap" | "leetcode" | "quiz" | "batch" | "evidence";

const TABS: { id: Tab; icon: React.ReactNode; label: string; description: string; href?: string }[] = [
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard",      description: "Command center · score, gaps, roadmap & next action" },
  { id: "jobfit",    icon: <Target size={18} />,          label: "Job Fit",        description: "Evidence-aware JD matching, gap breakdown & what-if" },
  { id: "resume",    icon: <FileText size={18} />,        label: "Resume Builder", description: "Build an ATS-ready resume from verified evidence" },
  { id: "analyse",   icon: <Search size={18} />,          label: "Analyse",        description: "Score your profile against real evidence" },
  { id: "ownership", icon: <FolderGit2 size={18} />,      label: "Ownership Map", description: "Git blame code attribution & repository mapping" },
  { id: "roadmap",   icon: <Map size={18} />,             label: "Roadmap",        description: "Personalised 10-week skill-up plan" },
  { id: "leetcode",  icon: <Code2 size={18} />,           label: "LeetCode",    description: "Evidence-backed LeetCode intelligence" },
  { id: "quiz",      icon: <BrainCircuit size={18} />,    label: "Quiz",           description: "Expert-level MCQs powered by Gemini AI" },
  { id: "batch",     icon: <Building2 size={18} />,       label: "Cohort Batch",   description: "Placement-cell cohort analytics" },
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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");
  const [userName, setUserName] = useState<string>("");
  const [viewDetailedReport, setViewDetailedReport] = useState<boolean>(false);
  const [navIntent, setNavIntent] = useState<{ source: string; returnTo?: "ownership"; reason?: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get("profileId");
    const storedId = localStorage.getItem("careerlens_active_profile_id");
    const activeId = paramId || storedId;

    if (activeId && activeId !== "demo-candidate-82") {
      setProfileId(activeId);
      getReport(activeId)
        .then((rep) => {
          if (rep) {
            setReport(rep);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch active profile report:", err);
        });
    }
  }, []);

  const visibleTabs = TABS.filter(tab => {
    if (persona === "placement") {
      // HR Tabs: Only dashboard (viewing/selection) and cohort batch
      return ["dashboard", "batch"].includes(tab.id);
    } else {
      // Applicant Tabs
      return ["dashboard", "jobfit", "resume", "analyse", "ownership", "roadmap", "leetcode", "quiz"].includes(tab.id);
    }
  });

  function handleProfileCreated(id: string) {
    setProfileId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("careerlens_active_profile_id", id);
    }
  }

  function handleReportReady(r: ProfileReport) {
    setReport(r);
    setProfileId(r.profile_id);
    if (typeof window !== "undefined" && r.profile_id) {
      localStorage.setItem("careerlens_active_profile_id", r.profile_id);
    }
    setViewDetailedReport(false);

    // Contextual Return: If user entered Analyse from Ownership Map to add GitHub handle
    if (navIntent?.returnTo === "ownership") {
      setNavIntent(null);
      setActiveTab("ownership");
    } else {
      setActiveTab("dashboard");
    }
  }

  function handleAddGitHubForOwnership() {
    setNavIntent({ source: "ownership", returnTo: "ownership", reason: "configure-github" });
    setActiveTab("analyse");
  }

  function handleLoadBenchmark() {
    setReport(SAMPLE_BENCHMARK_REPORT);
    setProfileId("demo-candidate-82");
    setNavIntent(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("careerlens_active_profile_id");
    }
    setActiveTab("dashboard");
  }

  function handleTabSwitch(tab: Tab | "evidence") {
    if (tab === "evidence") {
      window.location.href = "/evidence";
      return;
    }
    setActiveTab(tab);
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen onLogin={(p, name) => {
        setPersona(p);
        if (name) setUserName(name);
        setIsLoggedIn(true);
        setActiveTab("dashboard");
      }} />
    );
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

              <div
                style={{
                  padding: "7px 18px",
                  fontSize: "0.82rem",
                  background: persona === "student" ? "var(--blue)" : "var(--purple)",
                  color: "white",
                  borderColor: "var(--text)",
                  boxShadow: "var(--shadow-sm)",
                  borderRadius: "8px",
                  border: "2px solid var(--text)",
                  fontWeight: 800,
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                {persona === "student" ? <><GraduationCap size={16} /> Student Portal</> : <><Building2 size={16} /> HR Portal</>}
              </div>

              <button
                onClick={() => setIsLoggedIn(false)}
                className="btn"
                style={{
                  padding: "7px 16px",
                  fontSize: "0.82rem",
                  background: "var(--bg-soft)",
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  fontWeight: 800
                }}
              >
                Logout
              </button>
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
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => {
                      if (tab.href) {
                        router.push(tab.href);
                      } else {
                        setActiveTab(tab.id);
                      }
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
                      transition: "background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
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
              {persona === "placement" && (
                <div className="card fade-in-up" style={{
                  marginBottom: 24,
                  padding: 24,
                  background: "var(--purple-light)",
                  borderColor: "var(--purple)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Search size={20} color="var(--purple)" />
                    <h3 style={{ fontWeight: 900, fontSize: "1.1rem", margin: 0, color: "var(--text)" }}>HR Candidate Search Portal</h3>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, margin: 0 }}>
                    Enter a GitHub username to pull their verified Profile Database record, including Quiz stats, What-If results, and Roadmaps.
                  </p>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <input
                      type="text"
                      id="hr-search-input"
                      placeholder="e.g. demo-candidate"
                      className="input-field"
                      style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "2px solid var(--border)", fontFamily: "var(--font)", fontSize: "0.95rem" }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          document.getElementById('hr-search-btn')?.click();
                        }
                      }}
                    />
                    <button
                      id="hr-search-btn"
                      className="btn"
                      style={{ background: "var(--purple)", color: "white", padding: "10px 24px", fontWeight: 800, borderRadius: "8px", border: "2px solid var(--text)", boxShadow: "2px 2px 0 var(--text)" }}
                      onClick={async () => {
                        const input = document.getElementById('hr-search-input') as HTMLInputElement;
                        const username = input?.value.trim();
                        if (!username) return;
                        
                        try {
                          const res = await searchProfile(username);
                          setProfileId(res.profile_id);
                          const userReport = await getReport(res.profile_id);
                          setReport(userReport);
                          input.value = ""; // clear
                        } catch (err: any) {
                          alert(err.message || "Failed to find candidate");
                        }
                      }}
                    >
                      Search
                    </button>
                  </div>
                </div>
              )}
              <DashboardTab
                profileId={profileId}
                report={report}
                persona={persona}
                userName={userName}
                onNavigateTab={handleTabSwitch}
                onReanalyze={() => setActiveTab("analyse")}
                onLoadBenchmark={handleLoadBenchmark}
              />
            </div>
          )}

          {/* TAB 2: RESUME BUILDER */}
          {activeTab === "resume" && (
            <div key="resume-builder-view" className="fade-in-up">
              <ResumeBuilderTab
                profileId={profileId}
                report={report}
                persona={persona}
                onNavigateTab={handleTabSwitch}
                onNavigateWhatIf={(gapSkill) => {
                  setActiveTab("dashboard");
                }}
              />
            </div>
          )}

          {/* TAB 3: JOB FIT INTELLIGENCE */}
          {activeTab === "jobfit" && (
            <div key="job-fit-view" className="fade-in-up">
              <JobFitTab
                profileId={profileId}
                report={report}
                persona={persona}
                onNavigateTab={handleTabSwitch}
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
                    defaultName={userName}
                    onProfileCreated={handleProfileCreated}
                    onReportReady={handleReportReady}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OWNERSHIP MAP */}
          {activeTab === "ownership" && (
            <div key="ownership-map-view" className="fade-in-up">
              <OwnershipPanel
                profileId={profileId}
                onNavigateToAnalyse={() => setActiveTab("analyse")}
                onAddGitHubUsername={handleAddGitHubForOwnership}
              />
            </div>
          )}

          {/* TAB 4: ROADMAP */}
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
              <BatchTab 
                onSelectCandidate={async (id) => {
                  setProfileId(id);
                  try {
                    const r = await getReport(id);
                    setReport(r);
                  } catch(e) {
                    // Ignore if no report
                  }
                  setActiveTab("dashboard");
                }}
              />
            </div>
          )}

          {/* TAB 6: LEETCODE */}
          {activeTab === "leetcode" && (
            <div key="leetcode-view" className="fade-in-up">
              <LeetCodeAnalyzer profileId={profileId} />
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
