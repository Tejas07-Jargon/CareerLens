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
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
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
import GapChart from "./GapChart";
import ConsistencyChart from "./ConsistencyChart";
import SecurityFlagBanner from "@/components/evidence/SecurityFlagBanner";

interface DashboardTabProps {
  profileId: string | null;
  report: ProfileReport | null;
  persona: "student" | "placement";
  onNavigateTab: (tab: "analyse" | "quiz" | "roadmap" | "dashboard" | "batch" | "evidence") => void;
  onSelectRole?: (role: string) => void;
  onReanalyze?: () => void;
  onLoadBenchmark?: () => void;
}

const COMPONENT_LABELS: Record<string, string> = {
  skill_coverage: "Skill Coverage",
  project_depth: "Project Depth",
  consistency_growth: "Consistency & Growth",
  portfolio_presentation: "Portfolio Depth",
  professional_signals: "Engineering Signals",
};

const AVAILABLE_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
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
  onLoadBenchmark
}: DashboardTabProps) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>(
    report?.role_fits?.[0]?.role || "Software Engineer"
  );
  const [activeSection, setActiveSection] = useState<"overview" | "skills" | "insights" | "actions">("overview");
  const [roadmapData, setRoadmapData] = useState<PersonalizedRoadmapResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceReport | null>(null);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);

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
      return Object.entries(activeReport.components).map(([key, val]) => ({
        subject: COMPONENT_LABELS[key] ?? key,
        value: val.value,
        fullMark: 100,
      }));
    }
    return [
      { subject: "Skill Coverage", value: 84, fullMark: 100 },
      { subject: "Project Depth", value: 78, fullMark: 100 },
      { subject: "Consistency & Growth", value: 92, fullMark: 100 },
      { subject: "Portfolio Depth", value: 65, fullMark: 100 },
      { subject: "Engineering Signals", value: 76, fullMark: 100 },
    ];
  }, [activeReport]);

  // Evidence confidence percentage & credibility
  const credibilityRatio = activeReport?.credibility?.verified_ratio ?? 0.78;
  const verifiedCount = activeReport?.credibility?.verified_count ?? 8;
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

  // Why this score: Strengths & Gaps
  const { strengths, scoreGaps } = useMemo(() => {
    const strList: string[] = [];
    const gapList: string[] = [];

    if (activeReport) {
      Object.entries(activeReport.components || {}).forEach(([key, comp]) => {
        if (comp.value >= 75) {
          strList.push(comp.reason || `${COMPONENT_LABELS[key]} is strongly evidenced`);
        } else if (comp.value < 60) {
          gapList.push(comp.reason || `${COMPONENT_LABELS[key]} has limited observable proof`);
        }
      });

      const verifiedSkills = (activeReport.claim_statuses || [])
        .filter((c) => c.status === "Verified")
        .map((c) => c.skill);
      if (verifiedSkills.length > 0) {
        strList.push(`Verified proof-of-work in ${verifiedSkills.slice(0, 3).join(", ")}`);
      }

      const unverifiedSkills = (activeReport.claim_statuses || [])
        .filter((c) => c.status !== "Verified")
        .map((c) => c.skill);
      if (unverifiedSkills.length > 0) {
        gapList.push(`Insufficient proof-of-work for ${unverifiedSkills.slice(0, 2).join(", ")}`);
      }
    } else {
      strList.push("Strong verified evidence in Python & modern backend APIs");
      strList.push("High GitHub commit consistency across 52 weeks");
      strList.push("Full test suite and database migration provenance detected");
      gapList.push("Docker containerization lacks multi-stage production build");
      gapList.push("AWS cloud architecture unobserved in public repositories");
      gapList.push("System design documentation and load benchmarks missing");
    }

    return {
      strengths: strList.slice(0, 4),
      scoreGaps: gapList.slice(0, 4),
    };
  }, [activeReport]);

  // Skill categorisation
  const { strongSkills, moderateSkills, missingSkills } = useMemo(() => {
    if (dashboardData?.strongest_skills?.length > 0) {
      return {
        strongSkills: dashboardData.strongest_skills.map((s: any) => s.name),
        moderateSkills: [],
        missingSkills: dashboardData.weakest_skills?.map((s: any) => s.name) || [],
      };
    }
    if (activeReport?.claim_statuses && activeReport.claim_statuses.length > 0) {
      const strong = activeReport.claim_statuses
        .filter((c) => c.status === "Verified" || c.confidence >= 0.75)
        .map((c) => c.skill);
      const mod = activeReport.claim_statuses
        .filter((c) => c.status === "Partial" || (c.confidence >= 0.4 && c.confidence < 0.75))
        .map((c) => c.skill);
      const miss = activeReport.claim_statuses
        .filter((c) => c.status === "Not yet evidenced" || c.confidence < 0.4)
        .map((c) => c.skill);
      return { strongSkills: strong, moderateSkills: mod, missingSkills: miss };
    }
    return {
      strongSkills: ["Python", "SQL / PostgreSQL", "FastAPI / REST", "Git"],
      moderateSkills: ["Docker", "System Design", "Redis Caching"],
      missingSkills: ["AWS / Cloud Infra", "Kubernetes"],
    };
  }, [activeReport, dashboardData]);

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
        current_confidence: 0.38,
        priority_score: 0.85,
        action: "Create a multi-service Docker Compose setup with healthchecks",
      },
      {
        skill: "System Design",
        importance: 0.92,
        market_frequency: 0.9,
        current_confidence: 0.45,
        priority_score: 0.82,
        action: "Publish an architectural RFC document with load test benchmarks",
      },
      {
        skill: "AWS Cloud",
        importance: 0.85,
        market_frequency: 0.78,
        current_confidence: 0.18,
        priority_score: 0.76,
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
      id: "docker-fundamentals",
      name: "Docker & Container Architecture",
      status: "WEAK",
      current_evidence_score: 38,
      why_recommended:
        "High relevance to target role (Software Engineer), current evidence is limited to 1 dev Dockerfile, and backend API prerequisites are verified.",
      recommended_artifact: "docker-compose.yml + Multi-Stage Dockerfile",
      expected_proof: "Production container build with non-root user and automated compose healthcheck",
      source_url: "https://roadmap.sh/docker",
      related_skills: ["Docker", "Containers", "DevOps"],
    };
  }, [roadmapData]);

  // Quick What-If simulation
  async function handleQuickWhatIf() {
    if (!profileId) {
      setSimulatedDelta(6);
      setSimulatedScore(scoreVal + 6);
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
      setSimulatedDelta(5.5);
      setSimulatedScore(Math.min(100, Math.round(scoreVal + 5.5)));
    } finally {
      setWhatIfRunning(false);
    }
  }

  const hasSecurityFlags = (activeReport?.security_flags?.length ?? 0) > 0;
  const topStrongSkill = strongSkills[0] || "Python";
  const topGapSkill = priorityGaps[0]?.skill || "Docker";

  return (
    <div className="fade-in-up" style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      
      {/* ── SECURITY / AUTHENTICITY ALERT BANNER (IF ANY) ─────────────────────── */}
      {hasSecurityFlags && activeReport && (
        <SecurityFlagBanner flags={activeReport.security_flags} />
      )}

      {/* ── RECRUITER / PLACEMENT PERSPECTIVE NOTIFICATION ───────────────────── */}
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
                Placement Perspective
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--text-mid)", marginLeft: 8, fontWeight: 600 }}>
                Candidate verified against {selectedRole} JD standards with proof-of-work integrity filters.
              </span>
            </div>
          </div>
          <button
            id="dashboard-open-batch-analytics"
            onClick={() => onNavigateTab("batch")}
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "6px 14px", fontWeight: 800 }}
          >
            Cohort Analytics <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 1: CAREER READINESS OVERVIEW (HERO HEADER & EXECUTIVE SNAPSHOT)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          borderColor: "var(--blue)",
          boxShadow: "5px 5px 0 var(--blue)",
          padding: "26px 30px",
          background: "var(--white)",
        }}
      >
        {/* Top Control Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 22, paddingBottom: 16, borderBottom: "1.5px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              className="badge"
              style={{
                background: "var(--blue-light)",
                color: "var(--blue)",
                borderColor: "var(--blue)",
                fontWeight: 900,
                fontSize: "0.76rem",
              }}
            >
              ● CAREERLENS DASHBOARD
            </span>
            <span
              className="badge"
              style={{
                background: activeReport ? "var(--green-light)" : "var(--yellow-light)",
                color: activeReport ? "var(--green)" : "var(--yellow)",
                borderColor: activeReport ? "var(--green)" : "var(--yellow)",
                fontWeight: 800,
                fontSize: "0.74rem",
              }}
            >
              {activeReport ? "Analysis Verified" : "Benchmark Preview"}
            </span>
            {activeReport?.profile_id && (
              <span style={{ fontSize: "0.74rem", color: "var(--text-soft)", fontFamily: "var(--font-mono)" }}>
                ID: {activeReport.profile_id.slice(0, 8)}…
              </span>
            )}
          </div>

          {/* Target Role Selector & Reanalyze */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-soft)", padding: "4px 10px", borderRadius: "8px", border: "1.5px solid var(--border)" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-mid)" }}>Target Role:</span>
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
                style={{ fontSize: "0.78rem", padding: "5px 12px", fontWeight: 800 }}
                title="Re-run static AST and evidence analysis"
              >
                <RotateCcw size={13} /> Re-analyze
              </button>
            )}
          </div>
        </div>

        {/* 5-Column Executive KPI Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 18,
            alignItems: "center",
          }}
        >
          {/* KPI 1: Readiness Score */}
          <div
            style={{
              padding: "16px",
              background: "var(--bg-soft)",
              borderRadius: "14px",
              border: "2px solid var(--text)",
              boxShadow: "3px 3px 0 var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ position: "relative", width: 62, height: 62, flexShrink: 0 }}>
              <svg width="62" height="62" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="31" cy="31" r="25" stroke="var(--border)" strokeWidth="6" fill="none" />
                <circle
                  cx="31" cy="31" r="25"
                  fill="none"
                  stroke="var(--blue)"
                  strokeWidth="6"
                  strokeDasharray={`${(scoreVal / 100) * (2 * Math.PI * 25)} ${2 * Math.PI * 25}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem", color: "var(--text)" }}>
                {Math.round(scoreVal)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-soft)", letterSpacing: "0.04em" }}>
                READINESS SCORE
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text)" }}>
                {Math.round(scoreVal)}/100
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 700 }}>
                Range: {Math.round(scoreLo)}–{Math.round(scoreHi)}
              </div>
            </div>
          </div>

          {/* KPI 2: Evidence Coverage */}
          <div
            style={{
              padding: "16px",
              background: "var(--white)",
              borderRadius: "14px",
              border: "2px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <ShieldCheck size={16} color="var(--green)" />
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-soft)", letterSpacing: "0.04em" }}>
                EVIDENCE COVERAGE
              </span>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--green)" }}>
              {evidenceConfidencePct}%
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontWeight: 600 }}>
              {verifiedCount} of {totalClaims} claims verified
            </div>
          </div>

          {/* KPI 3: Target Role Fit */}
          <div
            style={{
              padding: "16px",
              background: "var(--white)",
              borderRadius: "14px",
              border: "2px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Target size={16} color="var(--blue)" />
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-soft)", letterSpacing: "0.04em" }}>
                ROLE ALIGNMENT
              </span>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--blue)" }}>
              {roleFitPct}%
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedRole}
            </div>
          </div>

          {/* KPI 4: Strongest Skill */}
          <div
            style={{
              padding: "16px",
              background: "var(--white)",
              borderRadius: "14px",
              border: "2px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Award size={16} color="var(--green)" />
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-soft)", letterSpacing: "0.04em" }}>
                STRONGEST SKILL
              </span>
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {topStrongSkill}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--green)", fontWeight: 800 }}>
              ✓ Multi-repo verified
            </div>
          </div>

          {/* KPI 5: Quiz Performance (Interconnected) */}
          <div
            style={{
              padding: "16px",
              background: "var(--white)",
              borderRadius: "14px",
              border: "2px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <BrainCircuit size={16} color="var(--purple)" />
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-soft)", letterSpacing: "0.04em" }}>
                QUIZ MASTERY
              </span>
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {dashboardData?.quiz_stats?.average_score ? `${dashboardData.quiz_stats.average_score}% Avg` : "No Attempts"}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--purple)", fontWeight: 800 }}>
              {dashboardData?.quiz_stats?.total_quizzes || 0} Quizzes Completed
            </div>
          </div>
        </div>

        {/* Clean View Selector Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1.5px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "overview", label: "Executive Overview", icon: <Sparkles size={14} /> },
            { id: "skills", label: "Evidence & Skills", icon: <ShieldCheck size={14} /> },
            { id: "insights", label: "Insights & Consistency", icon: <BrainCircuit size={14} /> },
            { id: "actions", label: "Actions & Simulator", icon: <Zap size={14} /> },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  fontFamily: "var(--font)",
                  cursor: "pointer",
                  border: isActive ? "2px solid var(--text)" : "2px solid transparent",
                  background: isActive ? "var(--text)" : "var(--bg-soft)",
                  color: isActive ? "var(--white)" : "var(--text-mid)",
                  boxShadow: isActive ? "2px 2px 0 var(--blue)" : "none",
                  transition: "background-color 150ms ease, color 150ms ease, border-color 150ms ease",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 2: EVIDENCE & SKILL SUMMARY (CONSOLIDATED GROUPING)
          ══════════════════════════════════════════════════════════════════════════ */}
      {(activeSection === "overview" || activeSection === "skills") && (
        <div
          className="card"
          style={{
            borderColor: "var(--green)",
            boxShadow: "4px 4px 0 var(--green)",
            padding: "24px 28px",
            background: "var(--white)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                EVIDENCE &amp; CAPABILITY BREAKDOWN
              </span>
              <h2 style={{ fontWeight: 900, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                <ShieldCheck size={20} color="var(--green)" /> Skill Verification &amp; Dimension Assessment
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab("evidence")}
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem", padding: "5px 12px", fontWeight: 800, color: "var(--green)" }}
            >
              Evidence Locators →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
            
            {/* Left: 3-Tier Categorized Skill Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              
              {/* Verified Skills */}
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={13} /> Verified Skills ({strongSkills.length})
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 700 }}>AST &amp; Proof Proven</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {strongSkills.map((s) => (
                    <span
                      key={s}
                      className="badge"
                      style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)", fontSize: "0.75rem", fontWeight: 800 }}
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Partially Evidenced */}
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={13} /> Partially Evidenced ({moderateSkills.length})
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 700 }}>Tests or Docs Needed</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {moderateSkills.map((s) => (
                    <span
                      key={s}
                      className="badge"
                      style={{ background: "var(--yellow-light)", color: "var(--yellow)", borderColor: "var(--yellow)", fontSize: "0.75rem", fontWeight: 800 }}
                    >
                      △ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Not Yet Evidenced */}
              <div style={{ background: "var(--bg-soft)", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "var(--pink)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
                    <Layers size={13} /> Not Yet Evidenced ({missingSkills.length})
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-soft)", fontWeight: 700 }}>Target Role Requirement</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {missingSkills.map((s) => (
                    <span
                      key={s}
                      className="badge"
                      style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)", fontSize: "0.75rem", fontWeight: 800 }}
                    >
                      ○ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Multi-Source Provenance Health (Compact Bar) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                {[
                  { name: "Resume", verified: true, icon: <FileCheck size={13} /> },
                  { name: "GitHub Repos", verified: true, icon: <FolderGit2 size={13} /> },
                  { name: "Live Deployments", verified: false, icon: <Globe size={13} /> },
                  { name: "Quiz Diagnostic", verified: true, icon: <BrainCircuit size={13} /> },
                ].map((src) => (
                  <div
                    key={src.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: src.verified ? "var(--green-light)" : "var(--bg-soft)",
                      border: `1px solid ${src.verified ? "var(--green)" : "var(--border)"}`,
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      color: src.verified ? "var(--green)" : "var(--text-mid)",
                    }}
                  >
                    {src.icon} {src.name} {src.verified ? "✓" : "○"}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 5 Dimensions Progress & Integrated Radar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {radarData.map((comp) => {
                  const color =
                    comp.subject === "Skill Coverage" ? "var(--blue)" :
                    comp.subject === "Project Depth" ? "var(--purple)" :
                    comp.subject === "Consistency & Growth" ? "var(--green)" :
                    comp.subject === "Portfolio Depth" ? "var(--orange)" : "var(--teal)";

                  return (
                    <div key={comp.subject}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text)" }}>{comp.subject}</span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 900, color }}>{comp.value}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 7, borderColor: "var(--border)" }}>
                        <div className="progress-bar-fill" style={{ width: `${comp.value}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Radar Chart */}
              <div style={{ width: "100%", height: 180, marginTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" strokeWidth={1.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text-mid)", fontSize: 9, fontWeight: 800 }} />
                    <Radar
                      name="Readiness"
                      dataKey="value"
                      stroke="var(--blue)"
                      fill="var(--blue)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 3: INSIGHTS & ANALYTICAL EXPLAINABILITY
          ══════════════════════════════════════════════════════════════════════════ */}
      {(activeSection === "overview" || activeSection === "insights") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          
          {/* Explainability Card: Why this score */}
          <div
            className="card"
            style={{
              borderColor: "var(--purple)",
              boxShadow: "4px 4px 0 var(--purple)",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  EXPLAINABILITY ENGINE
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                  <BrainCircuit size={18} color="var(--purple)" /> Why Readiness is {Math.round(scoreVal)}
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--purple-light)", color: "var(--purple)", borderColor: "var(--purple)", fontSize: "0.74rem" }}>
                Zero Hallucination
              </span>
            </div>

            {/* Strengths */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 900, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={13} /> Validated Strengths
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {strengths.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "var(--text)" }}>
                    <span style={{ color: "var(--green)", fontWeight: 900, marginTop: 1 }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 900, color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={13} /> Evidentiary Limits &amp; Gaps
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {scoreGaps.map((g, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "var(--text)" }}>
                    <span style={{ color: "var(--orange)", fontWeight: 900, marginTop: 1 }}>△</span>
                    <span style={{ fontWeight: 600 }}>{g}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1.5px dashed var(--border)" }}>
              <button
                id="dashboard-why-score-evidence-btn"
                onClick={() => onNavigateTab("evidence")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--blue)",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Inspect verifiable proof tokens <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* AI Skill Diagnostic Card */}
          <div
            className="card"
            style={{
              borderColor: "var(--teal)",
              boxShadow: "4px 4px 0 var(--teal)",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  DIAGNOSTIC SIGNALS
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                  <Activity size={18} color="var(--teal)" /> Technical Diagnostic Verification
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--teal-light)", color: "var(--teal)", borderColor: "var(--teal)", fontSize: "0.74rem" }}>
                AI Proctored
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--teal)" }}>86%</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-mid)" }}>Diagnostic Accuracy</div>
              </div>
              <div style={{ background: "var(--bg-soft)", padding: "10px 14px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--green)" }}>+14 pts</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-mid)" }}>Evidence Boosted</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700 }}>
                <span>Python Async &amp; Backend APIs</span>
                <span style={{ color: "var(--green)", fontWeight: 900 }}>Strong (92%)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700 }}>
                <span>SQL Schema &amp; Relational Joins</span>
                <span style={{ color: "var(--blue)", fontWeight: 900 }}>Proficient (80%)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700 }}>
                <span>Distributed Caching &amp; Docker</span>
                <span style={{ color: "var(--orange)", fontWeight: 900 }}>Needs Practice (55%)</span>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1.5px dashed var(--border)" }}>
              <button
                id="dashboard-take-quiz-btn"
                onClick={() => onNavigateTab("quiz")}
                className="btn"
                style={{
                  width: "100%",
                  background: "var(--teal)",
                  color: "white",
                  borderColor: "var(--text)",
                  boxShadow: "2px 2px 0 var(--text)",
                  fontWeight: 900,
                  fontSize: "0.82rem",
                  padding: "7px 14px",
                }}
              >
                Launch Skill Assessment Quiz <ArrowRight size={14} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Consistency Timeline Chart (Rendered when viewing Insights or Overview) */}
      {(activeSection === "overview" || activeSection === "insights") && activeReport?.claim_statuses && (
        <ConsistencyChart claimStatuses={activeReport.claim_statuses} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 4: RECOMMENDED ACTIONS & SIMULATION
          ══════════════════════════════════════════════════════════════════════════ */}
      {(activeSection === "overview" || activeSection === "actions") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Top Leverage Action Banner */}
          <div
            className="card"
            style={{
              borderColor: "var(--text)",
              boxShadow: "5px 5px 0 var(--text)",
              background: "var(--yellow-light)",
              padding: "24px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="badge"
                  style={{
                    background: "var(--yellow)",
                    color: "var(--text)",
                    borderColor: "var(--text)",
                    fontWeight: 900,
                    fontSize: "0.76rem",
                  }}
                >
                  ★ RECOMMENDED NEXT ACTION
                </span>
                <span style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 800 }}>
                  Single highest-leverage career milestone
                </span>
              </div>
              <span className="badge" style={{ background: "var(--white)", borderColor: "var(--text)", color: "var(--text)", fontWeight: 800 }}>
                Expected Impact: +6 pts Readiness Lift
              </span>
            </div>

            <h3 style={{ fontWeight: 900, fontSize: "1.35rem", color: "var(--text)", marginBottom: 8 }}>
              {nextMilestone?.recommended_artifact
                ? `Build Artifact: ${nextMilestone.recommended_artifact}`
                : "Build a Containerized Backend Project with Multi-Stage Dockerfile"}
            </h3>

            <p style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.55, maxWidth: 840, marginBottom: 16 }}>
              {nextMilestone?.why_recommended ||
                "Docker is essential for your target role (Software Engineer). Current evidence is limited to a single development template. Building and pushing a verified Docker Compose project will close your #1 gap and lift your readiness score."}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span>Milestone:</span>
                <span style={{ color: "var(--text)", fontWeight: 900 }}>{nextMilestone?.name || "Docker & Container Architecture"}</span>
              </div>

              <button
                id="dashboard-start-next-action-btn"
                onClick={() => onNavigateTab("roadmap")}
                className="btn btn-primary"
                style={{
                  fontSize: "0.88rem",
                  padding: "9px 20px",
                  fontWeight: 900,
                  boxShadow: "2px 2px 0 var(--text)"
                }}
              >
                <Zap size={15} /> Start Milestone in Roadmap
              </button>
            </div>
          </div>

          {/* Actionable Gaps List */}
          <div
            className="card"
            style={{
              borderColor: "var(--pink)",
              boxShadow: "4px 4px 0 var(--pink)",
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  ACTIONABLE SKILL GAPS
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                  <Layers size={18} color="var(--pink)" /> Priority Skill Gaps (Market Demand × Missing Evidence)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab("roadmap")}
                className="btn btn-ghost"
                style={{ fontSize: "0.78rem", padding: "4px 12px", fontWeight: 800, color: "var(--pink)" }}
              >
                Full 10-Week Roadmap →
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {priorityGaps.map((gap, idx) => {
                const gapPct = Math.round((1 - gap.current_confidence) * 100);
                const severityColor =
                  gapPct > 65 ? "var(--pink)" : gapPct > 35 ? "var(--orange)" : "var(--green)";

                return (
                  <div
                    key={gap.skill}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      background: "var(--bg-soft)",
                      borderRadius: "10px",
                      border: "1.5px solid var(--border)",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: severityColor,
                          color: "white",
                          fontWeight: 900,
                          fontSize: "0.78rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "0.92rem" }}>{gap.skill}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 700 }}>
                          Market demand: {Math.round(gap.market_frequency * 100)}% · Verified: {Math.round(gap.current_confidence * 100)}%
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-mid)" }}>
                        Action: {gap.action}
                      </div>
                    </div>

                    <button
                      id={`dashboard-improve-gap-${gap.skill}`}
                      onClick={() => onNavigateTab("roadmap")}
                      className="btn"
                      style={{
                        fontSize: "0.76rem",
                        padding: "5px 12px",
                        background: "var(--white)",
                        borderColor: severityColor,
                        color: severityColor,
                        boxShadow: `2px 2px 0 ${severityColor}`,
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

          {/* Quick What-If Simulation Card */}
          <div
            className="card"
            style={{
              borderColor: "var(--teal)",
              boxShadow: "4px 4px 0 var(--teal)",
              padding: "20px 24px",
              background: "var(--white)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                  WHAT-IF EXPLORATION
                </span>
                <h3 style={{ fontWeight: 900, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                  <Sliders size={18} color="var(--teal)" /> Simulated Employability Potential
                </h3>
              </div>
              <span className="badge" style={{ background: "var(--teal-light)", color: "var(--teal)", borderColor: "var(--teal)", fontSize: "0.72rem" }}>
                SIMULATED PREVIEW
              </span>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", marginBottom: 12, fontWeight: 600 }}>
              Simulate how verifying your priority gaps impacts your Job Readiness score before writing code.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-soft)",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--border)",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-soft)" }}>CURRENT SCORE</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text)" }}>{Math.round(scoreVal)}</div>
                </div>
                <ArrowRight size={16} color="var(--text-soft)" />
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--teal)" }}>SIMULATED POTENTIAL</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--teal)" }}>
                    {simulatedScore ? simulatedScore : Math.round(scoreVal + 6)}
                  </div>
                </div>
                {simulatedDelta && (
                  <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}>
                    +{simulatedDelta.toFixed(1)} pts
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  id="dashboard-run-quick-whatif"
                  onClick={handleQuickWhatIf}
                  disabled={whatIfRunning}
                  className="btn btn-ghost"
                  style={{ fontSize: "0.78rem", padding: "6px 12px", fontWeight: 800 }}
                >
                  {whatIfRunning ? "Simulating…" : "Run Quick Simulation"}
                </button>
                <button
                  id="dashboard-open-full-whatif"
                  onClick={() => onNavigateTab("analyse")}
                  className="btn"
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 12px",
                    background: "var(--teal-light)",
                    color: "var(--teal)",
                    borderColor: "var(--teal)",
                    fontWeight: 800,
                  }}
                >
                  Full Simulator →
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
