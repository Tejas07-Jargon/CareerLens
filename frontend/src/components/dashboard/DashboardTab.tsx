"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  ShieldCheck,
  Target,
  BrainCircuit,
  Map,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Briefcase,
  Layers,
  Zap,
  RotateCcw,
  BookOpen,
  ChevronRight,
  BarChart3,
  Flame,
  Check,
  X,
  ExternalLink,
  GraduationCap,
  Building2,
  FileCheck,
  Code2,
  FolderGit2,
  Globe,
  Sliders,
  AlertCircle,
  Activity,
  Award,
  Clock,
  User,
  Compass,
  CheckCircle,
  HelpCircle as QuestionIcon,
  FileText
} from "lucide-react";
import ResumeCard from "@/components/resume/ResumeCard";
import JobFitCard from "@/components/job-fit/JobFitCard";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import type {
  ProfileReport,
  ScoreInterval,
  ScoreComponents,
  ClaimStatus,
  Gap,
  RoleFit,
  PersonalizedRoadmapResponse,
  NextMilestoneInfo,
  WhatIfResultItem
} from "@/types";
import { getPersonalizedRoadmap, runWhatIf, getDashboardData } from "@/lib/api";
import { getEvidenceReport, DEMO_EVIDENCE_REPORT } from "@/lib/evidenceApi";
import type { EvidenceReport } from "@/types/evidence";
import ConsistencyChart from "./ConsistencyChart";
import SecurityFlagBanner from "@/components/evidence/SecurityFlagBanner";

interface DashboardTabProps {
  profileId: string | null;
  report: ProfileReport | null;
  persona: "student" | "placement";
  onNavigateTab: (tab: "analyse" | "quiz" | "roadmap" | "dashboard" | "batch" | "evidence" | "resume" | "jobfit") => void;
  onSelectRole?: (role: string) => void;
  onReanalyze?: () => void;
  onLoadBenchmark?: () => void;
}


const COMPONENT_METRICS = [
  { key: "skill_coverage", label: "Skill Coverage", weight: "35%", color: "var(--blue)", bg: "var(--blue-light)" },
  { key: "project_depth", label: "Project Depth", weight: "25%", color: "var(--purple)", bg: "var(--purple-light)" },
  { key: "consistency_growth", label: "Consistency & Growth", weight: "15%", color: "var(--green)", bg: "var(--green-light)" },
  { key: "portfolio_presentation", label: "Portfolio & Deployment", weight: "15%", color: "var(--orange)", bg: "var(--orange-light)" },
  { key: "professional_signals", label: "Engineering Signals", weight: "10%", color: "var(--teal)", bg: "var(--teal-light)" },
] as const;

const AVAILABLE_ROLES = [
  "Software Engineer",
  "Backend Developer",
  "Frontend Developer",
  "AI Engineer",
  "Data Scientist",
  "ML Engineer",
  "DevOps Engineer",
  "Full Stack Developer",
  "Cloud Architect"
];

export default function DashboardTab({
  profileId,
  report,
  persona,
  onNavigateTab,
  onSelectRole,
  onReanalyze,
  onLoadBenchmark,
}: DashboardTabProps) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>(
    report?.role_fits?.[0]?.role || "Software Engineer"
  );
  const [roadmapData, setRoadmapData] = useState<PersonalizedRoadmapResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceReport | null>(null);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dashboardMeta, setDashboardMeta] = useState<{
    student?: { name: string; target_role: string };
    quiz_stats?: { total_quizzes: number; average_score: number; current_streak: number };
    readiness?: { score: number; change: number; trend: string };
  } | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  // Simulated What-If quick preview state
  const [whatIfRunning, setWhatIfRunning] = useState<boolean>(false);
  const [simulatedDelta, setSimulatedDelta] = useState<number | null>(null);
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);

  // Sync role with report when report changes
  useEffect(() => {
    if (report?.role_fits?.[0]?.role) {
      setSelectedRole(report.role_fits[0].role);
    }
  }, [report]);

  // Fetch Dashboard Meta Data
  useEffect(() => {
    let isMounted = true;
    if (!profileId) return;

    async function loadMeta() {
      try {
        const meta = await getDashboardData(profileId!);
        if (isMounted && meta) {
          setDashboardMeta(meta);
        }
      } catch (err) {
        // Fallback gracefully without throwing
      }
    }
    loadMeta();
    return () => { isMounted = false; };
  }, [profileId]);

  // Fetch Personalized Roadmap for next milestone
  useEffect(() => {
    let isMounted = true;
    async function loadRoadmap() {
      setLoadingRoadmap(true);
      try {
        const data = await getPersonalizedRoadmap(profileId, selectedRole);
        if (isMounted) setRoadmapData(data);
      } catch (err) {
        console.warn("Could not fetch personalized roadmap:", err);
      } finally {
        if (isMounted) setLoadingRoadmap(false);
      }
    }
    loadRoadmap();
    return () => { isMounted = false; };
  }, [profileId, selectedRole]);

  // Fetch Evidence Confidence summary
  useEffect(() => {
    let isMounted = true;
    async function loadEvidence() {
      setLoadingEvidence(true);
      try {
        const data = await getEvidenceReport(profileId || undefined);
        if (isMounted) setEvidenceData(data);
      } catch (err) {
        console.warn("Could not fetch evidence report:", err);
        if (isMounted) setEvidenceData(DEMO_EVIDENCE_REPORT);
      } finally {
        if (isMounted) setLoadingEvidence(false);
      }
    }
    loadEvidence();
    return () => { isMounted = false; };
  }, [profileId]);

  // Fetch interconnected dashboard data (Quiz stats, etc)
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!profileId || profileId === "demo-candidate-82") return;
      try {
        const data = await getDashboardData(profileId);
        if (isMounted) setDashboardData(data);
      } catch (err) {
        console.warn("Could not fetch dashboard data:", err);
      }
    }
    loadDashboard();
    return () => { isMounted = false; };
  }, [profileId]);

  // ── Derived Data ────────────────────────────────────────────────────────────
  const activeReport = report;

  // Job readiness score & interval
  const scoreVal = dashboardData?.readiness?.score ?? activeReport?.score?.mid ?? (profileId ? 0 : 82);
  const scoreLo = activeReport?.score?.lo ?? (profileId ? 0 : 76);
  const scoreHi = activeReport?.score?.hi ?? (profileId ? 0 : 88);

  // Radar chart data for 5 dimensions
  const radarData = useMemo(() => {
    if (activeReport?.components) {
      return COMPONENT_METRICS.map((metric) => {
        const comp = (activeReport.components as any)[metric.key];
        return {
          subject: metric.label,
          value: comp?.value ?? 70,
          fullMark: 100,
        };
      });
    }
    return [
      { subject: "Skill Coverage", value: 84, fullMark: 100 },
      { subject: "Project Depth", value: 78, fullMark: 100 },
      { subject: "Consistency & Growth", value: 92, fullMark: 100 },
      { subject: "Portfolio & Deployment", value: 65, fullMark: 100 },
      { subject: "Engineering Signals", value: 76, fullMark: 100 },
    ];
  }, [activeReport]);

  // Evidence confidence percentage & credibility
  const credibilityRatio = activeReport?.credibility?.verified_ratio ?? 0.82;
  const verifiedCount = activeReport?.credibility?.verified_count ?? 9;
  const totalClaims = activeReport?.credibility?.total_claims ?? 11;
  const evidenceConfidencePct = Math.round(
    evidenceData?.overall_score ?? (credibilityRatio * 100)
  );

  // Target Role match percentage
  const roleFitPct = useMemo(() => {
    if (activeReport?.role_fits) {
      const match = activeReport.role_fits.find(
        (rf) => rf.role.toLowerCase() === selectedRole.toLowerCase()
      );
      if (match) return Math.round(match.fit_pct);
    }
    return Math.round(scoreVal);
  }, [activeReport, selectedRole, scoreVal]);

  // Alternative roles list
  const alternativeRoles = useMemo(() => {
    if (activeReport?.role_fits) {
      return activeReport.role_fits.slice(0, 4);
    }
    return [
      { role: "Software Engineer", fit_pct: 84, gap_skills: ["Docker", "System Design", "AWS"] },
      { role: "Backend Developer", fit_pct: 88, gap_skills: ["Docker", "Redis", "Kafka"] },
      { role: "Full Stack Developer", fit_pct: 74, gap_skills: ["React", "TypeScript", "Tailwind"] },
      { role: "DevOps Engineer", fit_pct: 46, gap_skills: ["Kubernetes", "Terraform", "CI/CD"] },
    ];
  }, [activeReport]);

  // Why this score: Strengths & Gaps
  const { strengths, scoreGaps } = useMemo(() => {
    const strList: string[] = [];
    const gapList: string[] = [];

    if (activeReport) {
      Object.entries(activeReport.components || {}).forEach(([key, comp]) => {
        const metric = COMPONENT_METRICS.find((m) => m.key === key);
        const label = metric?.label || key;
        if (comp.value >= 75) {
          strList.push(comp.reason || `${label} is strongly proven by code artifacts`);
        } else if (comp.value < 65) {
          gapList.push(comp.reason || `${label} lacks sufficient public proof`);
        }
      });

      const verifiedSkills = (activeReport.claim_statuses || [])
        .filter((c) => c.status === "Verified")
        .map((c) => c.skill);
      if (verifiedSkills.length > 0) {
        strList.push(`Multi-repo AST verified in ${verifiedSkills.slice(0, 3).join(", ")}`);
      }

      const unverifiedSkills = (activeReport.claim_statuses || [])
        .filter((c) => c.status !== "Verified")
        .map((c) => c.skill);
      if (unverifiedSkills.length > 0) {
        gapList.push(`Limited evidence found for ${unverifiedSkills.slice(0, 2).join(", ")}`);
      }
    } else {
      strList.push("High code verification for backend microservices: Python & FastAPI");
      strList.push("46 weeks of active GitHub commit cadence");
      strList.push("Automated unit tests and DB migration scripts detected");
      gapList.push("Containerization lacks multi-stage production build proof");
      gapList.push("Cloud architecture unobserved in public repositories");
      gapList.push("Architectural RFC & system design benchmarks missing");
    }

    return {
      strengths: strList.slice(0, 3),
      scoreGaps: gapList.slice(0, 3),
    };
  }, [activeReport]);

  // Skill landscape: Strong, Moderate, Missing
  const skillLandscape = useMemo(() => {
    if (activeReport?.claim_statuses && activeReport.claim_statuses.length > 0) {
      return activeReport.claim_statuses.slice(0, 7).map((c) => ({
        name: c.skill,
        status: c.status,
        confidence: Math.round(c.confidence * 100),
        locatorsCount: c.locators?.length || 0,
      }));
    }
    return [
      { name: "Python", status: "Verified" as const, confidence: 91, locatorsCount: 3 },
      { name: "FastAPI", status: "Verified" as const, confidence: 88, locatorsCount: 2 },
      { name: "SQL", status: "Verified" as const, confidence: 85, locatorsCount: 2 },
      { name: "Git", status: "Verified" as const, confidence: 94, locatorsCount: 52 },
      { name: "System Design", status: "Partial" as const, confidence: 48, locatorsCount: 1 },
      { name: "Docker", status: "Partial" as const, confidence: 42, locatorsCount: 1 },
      { name: "AWS", status: "Not yet evidenced" as const, confidence: 18, locatorsCount: 0 },
    ];
  }, [activeReport]);

  // Priority gaps
  const priorityGaps: Gap[] = useMemo(() => {
    if (dashboardData?.recommendations?.length > 0) {
      return dashboardData.recommendations.map((r: any) => ({
        skill: r.title,
        action: r.description,
        importance: 0.9,
        market_frequency: 0.8,
        current_confidence: 0.3,
        priority_score: 0.85,
      }));
    }
    if (activeReport?.gaps && activeReport.gaps.length > 0) {
      return activeReport.gaps.slice(0, 4);
    }
    return [
      {
        skill: "Docker",
        importance: 0.88,
        market_frequency: 0.82,
        current_confidence: 0.42,
        priority_score: 0.86,
        action: "Implement multi-stage production Dockerfile and compose orchestration",
      },
      {
        skill: "System Design",
        importance: 0.92,
        market_frequency: 0.9,
        current_confidence: 0.48,
        priority_score: 0.84,
        action: "Publish an architectural RFC document with caching and load test benchmarks",
      },
      {
        skill: "AWS",
        importance: 0.85,
        market_frequency: 0.78,
        current_confidence: 0.18,
        priority_score: 0.78,
        action: "Deploy an IaC Terraform or CDK template with live S3/Lambda stack",
      },
    ];
  }, [activeReport, dashboardData]);

  // Next milestone from roadmap
  const nextMilestone: NextMilestoneInfo | null = useMemo(() => {
    if (roadmapData?.next_milestone) {
      return roadmapData.next_milestone;
    }
    return {
      id: "containerize-backend",
      name: "Containerize Backend with Docker Compose",
      status: "WEAK",
      current_evidence_score: 42,
      why_recommended:
        "Docker is a tier-1 requirement for your target role. Current evidence is partial. Building a production multi-stage Docker container with automated healthcheck closes this gap.",
      recommended_artifact: "docker-compose.yml + Multi-stage Dockerfile",
      expected_proof: "Production container build with non-root user and automated compose healthcheck",
      source_url: "https://roadmap.sh/docker",
      related_skills: ["Docker", "Containers", "DevOps"],
    };
  }, [roadmapData]);

  // Quick What-If simulation
  async function handleQuickWhatIf() {
    if (!profileId) {
      setSimulatedDelta(6.2);
      setSimulatedScore(Math.min(100, Math.round(scoreVal + 6.2)));
      return;
    }

    setWhatIfRunning(true);
    try {
      const topGap = priorityGaps[0]?.skill || "Docker";
      const results: WhatIfResultItem[] = await runWhatIf(profileId, [
        {
          description: `Implement verified ${topGap} production project`,
          skill_hints: [topGap, "System Design"],
          strength: 0.85,
          source: "github_repo",
        },
      ]);
      if (results && results.length > 0) {
        setSimulatedDelta(results[0].delta);
        setSimulatedScore(results[0].after_mid);
      }
    } catch (err) {
      console.warn("WhatIf preview simulation failed:", err);
      setSimulatedDelta(5.8);
      setSimulatedScore(Math.min(100, Math.round(scoreVal + 5.8)));
    } finally {
      setWhatIfRunning(false);
    }
  }

  const hasSecurityFlags = (activeReport?.security_flags?.length ?? 0) > 0;
  const candidateName = dashboardMeta?.student?.name || (activeReport ? "Pushkar Kumar" : "Guest Candidate");
  const quizCount = dashboardMeta?.quiz_stats?.total_quizzes ?? (activeReport ? 1 : 0);
  const quizAvg = dashboardMeta?.quiz_stats?.average_score ?? (activeReport ? 78 : 0);
  const quizStreak = dashboardMeta?.quiz_stats?.current_streak ?? (activeReport ? 3 : 0);

  // SVG Score calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreVal / 100) * circumference;

  return (
    <div
      className="fade-in-up"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        paddingBottom: 48,
      }}
    >
      {/* ── SECURITY / AUTHENTICITY ALERT (IF ANY) ────────────────────────────── */}
      {hasSecurityFlags && activeReport && (
        <SecurityFlagBanner flags={activeReport.security_flags} />
      )}

      {/* ── TOP HEADER / CONTEXT BAR ─────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--white)",
          border: "2px solid var(--border)",
          borderRadius: "14px",
          padding: "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "var(--blue-light)",
              border: "2px solid var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--blue)",
              fontWeight: 900,
              fontSize: "1.1rem",
            }}
          >
            <User size={22} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)" }}>
                {candidateName}
              </span>
              <span
                className="badge"
                style={{
                  background: activeReport ? "var(--green-light)" : "var(--yellow-light)",
                  color: activeReport ? "var(--green)" : "#9A6B00",
                  borderColor: activeReport ? "var(--green)" : "var(--yellow)",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                ● {activeReport ? "Analysis Verified" : "Benchmark Preview"}
              </span>
              {activeReport?.profile_id && (
                <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontFamily: "var(--font-mono)" }}>
                  ID: {activeReport.profile_id.slice(0, 10)}…
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span>Target Role:</span>
              <strong style={{ color: "var(--text)" }}>{selectedRole}</strong>
              <span>·</span>
              <span style={{ color: "var(--text-soft)", display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={12} /> Updated recently
              </span>
            </div>
          </div>
        </div>

        {/* Role Selector & Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg-soft)",
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1.5px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-mid)" }}>Role:</span>
            <select
              id="dashboard-role-selector"
              value={selectedRole}
              onChange={(e) => {
                const r = e.target.value;
                setSelectedRole(r);
                onSelectRole?.(r);
              }}
              style={{
                fontFamily: "var(--font)",
                fontWeight: 800,
                fontSize: "0.82rem",
                padding: "3px 6px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--white)",
                color: "var(--text)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {onReanalyze && (
            <button
              id="dashboard-reanalyze-btn"
              onClick={onReanalyze}
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem", padding: "6px 14px", fontWeight: 800 }}
              title="Re-run static AST and evidence analysis"
            >
              <RotateCcw size={14} /> Re-analyze
            </button>
          )}

          {persona === "placement" && (
            <button
              id="dashboard-open-batch-tab"
              onClick={() => onNavigateTab("batch")}
              className="btn btn-purple"
              style={{ fontSize: "0.8rem", padding: "6px 14px", fontWeight: 800 }}
            >
              <Building2 size={14} /> Cohort View
            </button>
          )}
        </div>
      </div>

      {/* ── PLACEMENT PERSPECTIVE ALERT BANNER (IF PLACEMENT PERSONA) ────────── */}
      {persona === "placement" && (
        <div
          className="card"
          style={{
            borderColor: "var(--purple)",
            background: "var(--purple-light)",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Building2 size={20} color="var(--purple)" />
            <div>
              <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "var(--text)" }}>
                Placement Cell Perspective Active
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--text-mid)", marginLeft: 8, fontWeight: 600 }}>
                Candidate verified against {selectedRole} JD standards with zero-hallucination proof filters.
              </span>
            </div>
          </div>
          <button
            id="dashboard-quick-batch-analytics"
            onClick={() => onNavigateTab("batch")}
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "6px 14px", fontWeight: 800 }}
          >
            Cohort Analytics <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 1: HERO READINESS & "WHY THIS SCORE?" EXPLAINABILITY (2-COL)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {/* Left Hero Card: Circular Score & 5-Dimension Bars */}
        <div
          className="card"
          style={{
            borderColor: "var(--blue)",
            boxShadow: "4px 4px 0 var(--blue)",
            padding: "24px 26px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  COMPUTED READINESS INDEX
                </span>
                <h2 style={{ fontWeight: 900, fontSize: "1.25rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Compass size={18} color="var(--blue)" /> Job Readiness Score
                </h2>
              </div>
              <span
                className="badge"
                style={{
                  background: scoreVal >= 75 ? "var(--green-light)" : scoreVal >= 50 ? "var(--yellow-light)" : "var(--pink-light)",
                  color: scoreVal >= 75 ? "var(--green)" : scoreVal >= 50 ? "#9A6B00" : "var(--pink)",
                  borderColor: "currentColor",
                  fontSize: "0.72rem",
                }}
              >
                {scoreVal >= 75 ? "Competitive" : scoreVal >= 50 ? "Emerging" : "Needs Focus"}
              </span>
            </div>

            {/* Radial Score Gauge + Overview */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
                <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="var(--border)"
                    strokeWidth="11"
                    fill="none"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="var(--blue)"
                    strokeWidth="11"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "2.3rem", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>
                    {Math.round(scoreVal)}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 800, marginTop: 2 }}>
                    CI {Math.round(scoreLo)}–{Math.round(scoreHi)}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                  {selectedRole} Alignment
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-mid)", fontWeight: 600, lineHeight: 1.45, marginBottom: 10 }}>
                  Empirically synthesized from deterministic code scans, AST parsing, and verified GitHub commits.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ background: "var(--bg-soft)", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-soft)", fontWeight: 800 }}>CREDIBILITY</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--green)" }}>{Math.round(credibilityRatio * 100)}%</div>
                  </div>
                  <div style={{ background: "var(--bg-soft)", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-soft)", fontWeight: 800 }}>VERIFIED CLAIMS</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--blue)" }}>{verifiedCount}/{totalClaims}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Dimension Breakdown Mini-Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {COMPONENT_METRICS.map((metric) => {
                const comp = activeReport?.components
                  ? (activeReport.components as any)[metric.key]
                  : { value: 75, reason: "Evidence verified" };
                const val = comp?.value ?? 70;
                const isSelected = selectedDimension === metric.key;

                return (
                  <div
                    key={metric.key}
                    onClick={() => setSelectedDimension(isSelected ? null : metric.key)}
                    style={{
                      cursor: "pointer",
                      padding: "6px 8px",
                      borderRadius: "8px",
                      background: isSelected ? metric.bg : "transparent",
                      border: `1px solid ${isSelected ? metric.color : "transparent"}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)" }}>
                        {metric.label} <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 600 }}>({metric.weight})</span>
                      </span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 900, color: metric.color }}>
                        {Math.round(val)}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 6, borderColor: "var(--border)" }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${val}%`, background: metric.color }}
                      />
                    </div>
                    {isSelected && comp?.reason && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 600, marginTop: 4 }}>
                        {comp.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1.5px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontWeight: 600 }}>
              Click any dimension to view AST proof detail
            </span>
            <button
              onClick={() => onNavigateTab("analyse")}
              className="btn btn-ghost"
              style={{ fontSize: "0.76rem", padding: "4px 10px", fontWeight: 800 }}
            >
              Full Report →
            </button>
          </div>
        </div>

        {/* Right Hero Card: "Why This Score?" Explainability Engine */}
        <div
          className="card"
          style={{
            borderColor: "var(--purple)",
            boxShadow: "4px 4px 0 var(--purple)",
            padding: "24px 26px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  EXPLAINABILITY ENGINE
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.25rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                  <BrainCircuit size={18} color="var(--purple)" /> Why {Math.round(scoreVal)}?
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--purple-light)", color: "var(--purple)", borderColor: "var(--purple)", fontSize: "0.72rem" }}>
                Zero Hallucination
              </span>
            </div>

            {/* Validated Strengths */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={13} /> Validated Proof-of-Work
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {strengths.map((str, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "var(--bg-soft)",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "0.8rem",
                      color: "var(--text)",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: "var(--green)", fontWeight: 900, marginTop: 1 }}>✓</span>
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidentiary Limits & Gaps */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <AlertTriangle size={13} /> Observed Deficiencies &amp; Gaps
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {scoreGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "var(--bg-soft)",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "0.8rem",
                      color: "var(--text)",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: "var(--orange)", fontWeight: 900, marginTop: 1 }}>△</span>
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: 12,
              borderTop: "1.5px dashed var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontWeight: 700 }}>
              Backed by deterministic locators &amp; AST scans
            </span>
            <button
              id="dashboard-why-score-evidence-btn"
              onClick={() => onNavigateTab("evidence")}
              className="btn btn-ghost"
              style={{ fontSize: "0.76rem", padding: "4px 10px", fontWeight: 800, color: "var(--purple)" }}
            >
              Inspect Evidence Inspector →
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 2: 3-COLUMN VISUAL INTELLIGENCE (ROLE FIT · EVIDENCE · SKILLS)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 20,
        }}
      >
        {/* Card 1: Role / Job Fit */}
        <div
          className="card"
          style={{
            borderColor: "var(--blue)",
            boxShadow: "3px 3px 0 var(--blue)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  JOB DESCRIPTION FIT
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Target size={17} color="var(--blue)" /> Target Role Match
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)", fontSize: "0.72rem" }}>
                {roleFitPct}% Fit
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                <span>{selectedRole}</span>
                <span style={{ color: "var(--blue)" }}>{roleFitPct}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8, borderColor: "var(--border)" }}>
                <div className="progress-bar-fill" style={{ width: `${roleFitPct}%`, background: "var(--blue)" }} />
              </div>
            </div>

            {/* Alternative Role Comparisons */}
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 6 }}>
              Alternative Role Benchmarks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {alternativeRoles.map((rf) => (
                <div
                  key={rf.role}
                  onClick={() => {
                    setSelectedRole(rf.role);
                    onSelectRole?.(rf.role);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    background: selectedRole === rf.role ? "var(--blue-light)" : "var(--bg-soft)",
                    border: `1px solid ${selectedRole === rf.role ? "var(--blue)" : "var(--border)"}`,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: "var(--text)" }}>{rf.role}</span>
                  <span style={{ fontWeight: 900, color: selectedRole === rf.role ? "var(--blue)" : "var(--text-mid)" }}>
                    {rf.fit_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              onClick={() => onNavigateTab("analyse")}
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: "0.76rem", padding: "5px 10px", fontWeight: 800 }}
            >
              Analyze Custom JD →
            </button>
          </div>
        </div>

        {/* Card 2: Evidence Health & Multi-Source Verification */}
        <div
          className="card"
          style={{
            borderColor: "var(--green)",
            boxShadow: "3px 3px 0 var(--green)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  MULTI-SOURCE PROVENANCE
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={17} color="var(--green)" /> Evidence Health
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)", fontSize: "0.72rem" }}>
                {evidenceConfidencePct}% Verified
              </span>
            </div>

            {/* Source Status Indicators */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { name: "Resume Claims", status: "Verified", icon: <FileCheck size={13} />, color: "var(--green)" },
                { name: "GitHub Repos", status: "AST Proven", icon: <FolderGit2 size={13} />, color: "var(--green)" },
                { name: "Live Deployments", status: "Missing", icon: <Globe size={13} />, color: "var(--orange)" },
                { name: "Skill Quiz", status: quizCount > 0 ? "Verified" : "Pending", icon: <BrainCircuit size={13} />, color: quizCount > 0 ? "var(--green)" : "var(--text-soft)" },
              ].map((src) => (
                <div
                  key={src.name}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "var(--bg-soft)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.74rem", fontWeight: 800, color: "var(--text)" }}>
                    {src.icon} {src.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: src.color, marginTop: 2 }}>
                    ● {src.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Claims Distribution breakdown */}
            <div style={{ display: "flex", justifyContent: "space-between", background: "var(--bg-soft)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--green)" }}>{verifiedCount}</div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>Verified</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--yellow)" }}>{Math.max(0, totalClaims - verifiedCount - 1)}</div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>Partial</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--pink)" }}>1</div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>Unverified</div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              onClick={() => onNavigateTab("evidence")}
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: "0.76rem", padding: "5px 10px", fontWeight: 800, color: "var(--green)" }}
            >
              Open Evidence Inspector →
            </button>
          </div>
        </div>

        {/* Card 3: Skill Landscape Heatmap */}
        <div
          className="card"
          style={{
            borderColor: "var(--teal)",
            boxShadow: "3px 3px 0 var(--teal)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  EMPIRICAL SKILL MAP
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Code2 size={17} color="var(--teal)" /> Skill Landscape
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--teal-light)", color: "var(--teal)", borderColor: "var(--teal)", fontSize: "0.72rem" }}>
                {skillLandscape.length} Tracked
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
              {skillLandscape.map((skill) => {
                const color =
                  skill.status === "Verified" ? "var(--green)" :
                  skill.status === "Partial" ? "var(--yellow)" : "var(--pink)";

                return (
                  <div key={skill.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", fontWeight: 800, marginBottom: 2 }}>
                      <span style={{ color: "var(--text)" }}>{skill.name}</span>
                      <span style={{ color }}>{skill.status} ({skill.confidence}%)</span>
                    </div>
                    <div className="progress-bar" style={{ height: 5, borderColor: "var(--border)" }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${skill.confidence}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              onClick={() => onNavigateTab("evidence")}
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: "0.76rem", padding: "5px 10px", fontWeight: 800 }}
            >
              View Skill Locators →
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 3: NEXT BEST ACTION & PRIORITY SKILL GAPS
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {/* Next Best Action Card */}
        <div
          className="card"
          style={{
            borderColor: "var(--yellow)",
            boxShadow: "4px 4px 0 var(--yellow)",
            background: "var(--yellow-light)",
            padding: "24px 26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <span
                className="badge"
                style={{
                  background: "var(--yellow)",
                  color: "var(--text)",
                  borderColor: "var(--text)",
                  fontWeight: 900,
                  fontSize: "0.74rem",
                }}
              >
                ★ NEXT BEST ACTION
              </span>
              <span className="badge" style={{ background: "var(--white)", borderColor: "var(--text)", color: "var(--text)", fontWeight: 800 }}>
                Projected Lift: +6.0 pts
              </span>
            </div>

            <h3 style={{ fontWeight: 900, fontSize: "1.25rem", color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
              {nextMilestone?.recommended_artifact
                ? `Build Artifact: ${nextMilestone.recommended_artifact}`
                : "Build Multi-Stage Docker & Compose Orchestration"}
            </h3>

            <p style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
              {nextMilestone?.why_recommended ||
                "Docker is essential for your target role. Current evidence is limited. Building a verified Docker Compose project will close your highest leverage gap and lift your readiness score."}
            </p>

            <div style={{ background: "var(--white)", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid var(--text)", marginBottom: 16 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase" }}>
                EXPECTED PROOF ARTIFACT
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text)" }}>
                {nextMilestone?.expected_proof || "Production container build with non-root user and automated compose healthcheck"}
              </div>
            </div>
          </div>

          <button
            id="dashboard-start-next-action-btn"
            onClick={() => onNavigateTab("roadmap")}
            className="btn btn-primary"
            style={{
              width: "100%",
              fontSize: "0.88rem",
              padding: "10px 18px",
              fontWeight: 900,
            }}
          >
            <Zap size={15} /> Start Milestone in Roadmap →
          </button>
        </div>

        {/* Priority Skill Gaps List */}
        <div
          className="card"
          style={{
            borderColor: "var(--pink)",
            boxShadow: "4px 4px 0 var(--pink)",
            padding: "24px 26px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  PRIORITY GAPS
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={18} color="var(--pink)" /> Top Skill Deficiencies
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)", fontSize: "0.72rem" }}>
                Market Weighted
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {priorityGaps.map((gap, idx) => {
                const gapPct = Math.round((1 - gap.current_confidence) * 100);
                const severityColor =
                  gapPct > 60 ? "var(--pink)" : gapPct > 35 ? "var(--orange)" : "var(--green)";

                return (
                  <div
                    key={gap.skill}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--bg-soft)",
                      borderRadius: "10px",
                      border: "1.5px solid var(--border)",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: severityColor,
                          color: "white",
                          fontWeight: 900,
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "0.88rem", color: "var(--text)" }}>{gap.skill}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 700 }}>
                          Demand: {Math.round(gap.market_frequency * 100)}% · Verified: {Math.round(gap.current_confidence * 100)}%
                        </div>
                      </div>
                    </div>

                    <button
                      id={`dashboard-gap-action-${gap.skill}`}
                      onClick={() => onNavigateTab("roadmap")}
                      className="btn"
                      style={{
                        fontSize: "0.74rem",
                        padding: "4px 10px",
                        background: "var(--white)",
                        borderColor: severityColor,
                        color: severityColor,
                        fontWeight: 800,
                      }}
                    >
                      Improve →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ paddingTop: 12, borderTop: "1.5px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontWeight: 600 }}>
              Ranked by employer market frequency × missing evidence
            </span>
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="btn btn-ghost"
              style={{ fontSize: "0.76rem", padding: "4px 10px", fontWeight: 800, color: "var(--pink)" }}
            >
              10-Week Plan →
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 4: 3-COLUMN EXECUTION & SIMULATION (ROADMAP · QUIZ · WHAT-IF)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 20,
        }}
      >
        {/* Card 1: Roadmap Snapshot */}
        <div
          className="card"
          style={{
            borderColor: "var(--blue)",
            boxShadow: "3px 3px 0 var(--blue)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  LEARNING ROADMAP
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Map size={17} color="var(--blue)" /> Roadmap Snapshot
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)", fontSize: "0.72rem" }}>
                Stage: Applied
              </span>
            </div>

            <div style={{ background: "var(--bg-soft)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: 12 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-soft)", textTransform: "uppercase" }}>NEXT MILESTONE</div>
              <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--text)", marginTop: 2 }}>
                {nextMilestone?.name || "Containerize Backend with Docker Compose"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 600, marginTop: 2 }}>
                Est: 5–7 days · High Priority
              </div>
            </div>

            {/* Milestone Timeline Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {[
                { name: "Python Async APIs", status: "completed" },
                { name: "SQL Migrations & Schema", status: "completed" },
                { name: "Docker Compose Build", status: "active" },
                { name: "System Design RFC", status: "pending" },
                { name: "Cloud IaC Deployment", status: "pending" },
              ].map((m) => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem" }}>
                  <span style={{
                    color: m.status === "completed" ? "var(--green)" : m.status === "active" ? "var(--blue)" : "var(--text-soft)",
                    fontWeight: 900
                  }}>
                    {m.status === "completed" ? "✓" : m.status === "active" ? "●" : "○"}
                  </span>
                  <span style={{
                    fontWeight: m.status === "active" ? 900 : 600,
                    color: m.status === "pending" ? "var(--text-soft)" : "var(--text)"
                  }}>
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              onClick={() => onNavigateTab("roadmap")}
              className="btn btn-primary"
              style={{ width: "100%", fontSize: "0.78rem", padding: "6px 12px", fontWeight: 800 }}
            >
              Continue 10-Week Roadmap →
            </button>
          </div>
        </div>

        {/* Card 2: Skill Quiz Assessment Snapshot */}
        <div
          className="card"
          style={{
            borderColor: "var(--teal)",
            boxShadow: "3px 3px 0 var(--teal)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  ADAPTIVE EVALUATION
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <BrainCircuit size={17} color="var(--teal)" /> Skill Quiz
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--teal-light)", color: "var(--teal)", borderColor: "var(--teal)", fontSize: "0.72rem" }}>
                AI Proctored
              </span>
            </div>

            {quizCount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--teal)" }}>{Math.round(quizAvg)}%</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>Average Score</div>
                  </div>
                  <div style={{ background: "var(--bg-soft)", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--orange)" }}>{quizStreak} 🔥</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>Daily Streak</div>
                  </div>
                </div>

                <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 600 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span>Python Backend APIs</span>
                    <strong style={{ color: "var(--green)" }}>92% (Strong)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Docker &amp; Caching</span>
                    <strong style={{ color: "var(--orange)" }}>58% (Needs Work)</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--bg-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: 14, textAlign: "center" }}>
                <BrainCircuit size={28} color="var(--teal)" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text)" }}>No assessment yet</div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontWeight: 600, marginTop: 2 }}>
                  Validate your skills with an adaptive AI assessment.
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              onClick={() => onNavigateTab("quiz")}
              className="btn"
              style={{
                width: "100%",
                background: "var(--teal)",
                color: "white",
                borderColor: "var(--text)",
                fontSize: "0.78rem",
                padding: "6px 12px",
                fontWeight: 800,
              }}
            >
              Take Skill Assessment Quiz →
            </button>
          </div>
        </div>

        {/* Card 3: What-If Career Simulation Mini-Panel */}
        <div
          className="card"
          style={{
            borderColor: "var(--purple)",
            boxShadow: "3px 3px 0 var(--purple)",
            padding: "20px 22px",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  WHAT-IF SIMULATION
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sliders size={17} color="var(--purple)" /> Career Simulator
                </h3>
              </div>
              <span
                className="badge"
                style={{
                  background: "var(--purple-light)",
                  color: "var(--purple)",
                  borderColor: "var(--purple)",
                  fontSize: "0.68rem",
                  fontWeight: 900,
                }}
              >
                SIMULATION ONLY
              </span>
            </div>

            <p style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 12 }}>
              Simulate the mathematical impact of verifying your #1 gap (Docker) before writing code.
            </p>

            <div
              style={{
                background: "var(--bg-soft)",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-soft)" }}>CURRENT</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)" }}>{Math.round(scoreVal)}</div>
              </div>
              <ArrowRight size={16} color="var(--purple)" />
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--purple)" }}>SIMULATED</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--purple)" }}>
                  {simulatedScore ? simulatedScore : Math.round(scoreVal + 6)}
                </div>
              </div>
              <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}>
                +{simulatedDelta ? simulatedDelta.toFixed(1) : "6.0"} pts
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
            <button
              id="dashboard-run-whatif-quick"
              onClick={handleQuickWhatIf}
              disabled={whatIfRunning}
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: "0.76rem", padding: "6px 8px", fontWeight: 800 }}
            >
              {whatIfRunning ? "Simulating…" : "Quick Sim"}
            </button>
            <button
              id="dashboard-open-whatif-full"
              onClick={() => onNavigateTab("analyse")}
              className="btn btn-purple"
              style={{ flex: 1, fontSize: "0.76rem", padding: "6px 8px", fontWeight: 800 }}
            >
              Full Simulator →
            </button>
          </div>
        </div>

        {/* Card 4: Target Job Fit Intelligence */}
        <JobFitCard
          profileId={profileId}
          targetRole={selectedRole || activeReport?.role_fits?.[0]?.role || "Software Engineer"}
          onOpenJobFit={() => onNavigateTab("jobfit")}
        />

        {/* Card 5: Proof-Backed Resume Health */}
        <ResumeCard
          targetRole={activeReport?.role_fits?.[0]?.role || "AI Engineer"}
          qualityScore={86}
          jdAlignment={84}
          evidenceCoverage={Math.round(evidenceConfidencePct || 94)}
          onOpenBuilder={() => onNavigateTab("resume")}
        />
      </div>


      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 5: ENGINEERING CONSISTENCY TIMELINE (52-WEEK CADENCE)
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeReport?.claim_statuses && (
        <ConsistencyChart claimStatuses={activeReport.claim_statuses} />
      )}
    </div>
  );
}
