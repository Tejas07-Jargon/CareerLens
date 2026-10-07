/**
 * Evidence API Client.
 * Connects to the backend `/api/evidence` endpoints with a robust demo/fallback data layer
 * for seamless development and offline demonstration.
 */

import type { EvidenceReport, EvidenceSummary, SkillEvidenceItem } from "@/types/evidence";

const BASE = "/api";

// ── DEMO / FALLBACK DATA LAYER (For local testing & offline graceful fallback) ──
export const DEMO_EVIDENCE_REPORT: EvidenceReport = {
  overall_score: 78,
  verified_count: 8,
  partial_count: 3,
  weak_count: 2,
  total_skills: 13,
  categories: {
    technical: 84,
    projects: 79,
    github: 72,
    portfolio: 68,
    resumeConsistency: 81,
  },
  source_availability: {
    github: true,
    portfolio: false,
    resume: true,
    certifications: false,
  },
  skills: [
    {
      skill: "Java",
      score: 91,
      status: "Strong Evidence",
      status_range: "81-100",
      sources_count: 6,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected", available: true },
        project_evidence: { points: 25, max: 25, label: "Project Evidence", status: "✓ 4 projects", available: true },
        code_evidence: { points: 25, max: 25, label: "Code Evidence", status: "✓ Strong", available: true },
        github_activity: { points: 15, max: 15, label: "GitHub Activity", status: "✓ 127 commits", available: true },
        project_relevance: { points: 10, max: 10, label: "Project Relevance", status: "✓ High", available: true },
        recency: { points: 6, max: 10, label: "Recent Activity", status: "✓ Active within last 30 days", available: true },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ Good docs, portfolio unavailable", available: true },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'Advanced Java developer'", contribution: 10, status: "verified", details: "Listed under core skills with 3+ years experience" },
        { source: "GitHub", description: "Java detected in 4 repositories with 127 commits", contribution: 40, status: "verified", details: "ecommerce-microservice, spring-security-starter" },
        { source: "Projects", description: "Spring Boot backend project with JPA & JUnit 5 tests", contribution: 35, status: "verified", details: "Full test coverage and REST API endpoints" },
        { source: "Recency", description: "Last Java commit detected 8 days ago", contribution: 6, status: "verified", details: "Continuous development cadence" },
        { source: "Portfolio", description: "Portfolio evidence unavailable", contribution: 0, status: "unavailable", details: "Connect portfolio to verify live deployments" },
      ],
      claim_vs_evidence: {
        resume_claim: "Advanced Java developer",
        observed_evidence: [
          "4 Java repositories",
          "127 Java commits",
          "3 relevant projects",
          "Strong code evidence",
        ],
        assessment: "Strongly Supported",
        confidence_score: 91,
      },
      mismatch: null,
      ai_explanation:
        "Your Java skill is strongly supported by multiple independent sources. Your resume claim is consistent with your GitHub activity and project implementation. Recent activity further increases confidence.",
    },
    {
      skill: "React",
      score: 84,
      status: "Strong Evidence",
      status_range: "81-100",
      sources_count: 5,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected", available: true },
        project_evidence: { points: 25, max: 25, label: "Project Evidence", status: "✓ 3 projects", available: true },
        code_evidence: { points: 22, max: 25, label: "Code Evidence", status: "✓ Strong (Hooks & Next.js)", available: true },
        github_activity: { points: 13, max: 15, label: "GitHub Activity", status: "✓ 84 commits", available: true },
        project_relevance: { points: 8, max: 10, label: "Project Relevance", status: "✓ High", available: true },
        recency: { points: 6, max: 10, label: "Recent Activity", status: "✓ Active within last 2 weeks", available: true },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ Portfolio unavailable", available: false },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'React — Frontend'", contribution: 10, status: "verified", details: "Included in projects and coursework" },
        { source: "GitHub", description: "3 React/Next.js repositories with 84 commits", contribution: 35, status: "verified", details: "dashboard-ui, careerlens-frontend" },
        { source: "Projects", description: "Interactive dashboard with Recharts & TypeScript", contribution: 30, status: "verified", details: "Component modularity and clean state handling" },
        { source: "Portfolio", description: "Portfolio evidence unavailable", contribution: 0, status: "unavailable", details: "No live portfolio link" },
      ],
      claim_vs_evidence: {
        resume_claim: "React — Frontend",
        observed_evidence: [
          "3 React repositories",
          "84 React commits",
          "Next.js App router implementation",
          "Interactive UI components verified",
        ],
        assessment: "Strongly Supported",
        confidence_score: 84,
      },
      mismatch: null,
      ai_explanation:
        "Your React skill is strongly supported by high-quality GitHub repositories and modern component architecture. Adding component test suites will push this into the 90s.",
    },
    {
      skill: "SQL",
      score: 78,
      status: "Moderate Evidence",
      status_range: "61-80",
      sources_count: 4,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected", available: true },
        project_evidence: { points: 18, max: 25, label: "Project Evidence", status: "✓ 2 projects", available: true },
        code_evidence: { points: 20, max: 25, label: "Code Evidence", status: "✓ Complex queries & migrations", available: true },
        github_activity: { points: 10, max: 15, label: "GitHub Activity", status: "✓ 45 commits", available: true },
        project_relevance: { points: 10, max: 10, label: "Project Relevance", status: "✓ High", available: true },
        recency: { points: 5, max: 10, label: "Recent Activity", status: "✓ Active within last 60 days", available: true },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ Schema documented", available: true },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'PostgreSQL / MySQL'", contribution: 10, status: "verified", details: "Used in database coursework and backend" },
        { source: "GitHub", description: "Schema migrations and relational queries in 2 repositories", contribution: 30, status: "verified", details: "Alembic migrations verified" },
        { source: "Projects", description: "Normalized 3NF relational models with foreign keys & joins", contribution: 33, status: "verified", details: "Clean indexed schemas" },
      ],
      claim_vs_evidence: {
        resume_claim: "Experienced with SQL & PostgreSQL",
        observed_evidence: [
          "2 database projects",
          "Schema migration files detected",
          "Multi-table joins and indexing",
        ],
        assessment: "Moderately Supported",
        confidence_score: 78,
      },
      mismatch: null,
      ai_explanation:
        "Solid relational database evidence in schemas and migrations. Documenting query performance or indexing benchmarks will boost confidence further.",
    },
    {
      skill: "Python",
      score: 67,
      status: "Moderate Evidence",
      status_range: "61-80",
      sources_count: 3,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected", available: true },
        project_evidence: { points: 18, max: 25, label: "Project Evidence", status: "✓ 2 projects", available: true },
        code_evidence: { points: 18, max: 25, label: "Code Evidence", status: "✓ API scripts & utilities", available: true },
        github_activity: { points: 8, max: 15, label: "GitHub Activity", status: "✓ 32 commits", available: true },
        project_relevance: { points: 8, max: 10, label: "Project Relevance", status: "✓ Moderate", available: true },
        recency: { points: 5, max: 10, label: "Recent Activity", status: "✓ Active 40 days ago", available: true },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ Minimal docstrings", available: true },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'Python Developer'", contribution: 10, status: "verified", details: "Backend scripts and automation" },
        { source: "GitHub", description: "2 repositories with Python FastAPI and utility scripts", contribution: 26, status: "verified", details: "data-pipeline, backend-api" },
        { source: "Projects", description: "FastAPI endpoints and data models", contribution: 26, status: "verified", details: "Pydantic models with type hinting" },
      ],
      claim_vs_evidence: {
        resume_claim: "Python Developer",
        observed_evidence: [
          "2 Python repositories",
          "32 commits",
          "Basic test coverage absent",
        ],
        assessment: "Moderately Supported",
        confidence_score: 67,
      },
      mismatch: null,
      ai_explanation:
        "Python implementation is observable in web and automation scripts. Adding comprehensive unit tests with pytest will significantly enhance verification.",
    },
    {
      skill: "AWS",
      score: 18,
      status: "Weak / Unverified",
      status_range: "0-30",
      sources_count: 1,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected ('Expert in AWS')", available: true },
        project_evidence: { points: 0, max: 25, label: "Project Evidence", status: "○ No AWS projects detected", available: true },
        code_evidence: { points: 0, max: 25, label: "Code Evidence", status: "○ No IaC or SDK evidence", available: true },
        github_activity: { points: 0, max: 15, label: "GitHub Activity", status: "○ No AWS repository activity", available: true },
        project_relevance: { points: 0, max: 10, label: "Project Relevance", status: "○ No cloud deployment files", available: true },
        recency: { points: 8, max: 10, label: "Recent Activity", status: "○ No cloud logs recorded", available: false },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ No architecture diagram", available: false },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'Expert in AWS (EC2, S3, Lambda)'", contribution: 10, status: "verified", details: "Listed prominently on resume" },
        { source: "GitHub", description: "No AWS configuration, Terraform, CDK, or Boto3 found", contribution: 0, status: "unverified", details: "0 matches for AWS SDK or templates across public repos" },
        { source: "Projects", description: "No deployed AWS architectures or cloud templates", contribution: 0, status: "unverified", details: "No CloudFormation, SAM, or serverless yaml files" },
        { source: "Portfolio", description: "Portfolio evidence unavailable", contribution: 0, status: "unavailable", details: "No live AWS URL connected" },
      ],
      claim_vs_evidence: {
        resume_claim: "Expert in AWS",
        observed_evidence: [
          "No AWS projects detected",
          "No AWS repository activity detected",
          "No deployment evidence detected",
        ],
        assessment: "Claim not sufficiently supported",
        confidence_score: 18,
      },
      mismatch: {
        skill: "AWS",
        type: "under_supported",
        severity: "warning",
        title: "Potential Claim Mismatch",
        message: "Resume states 'Expert in AWS', but no observable AWS code, CDK/Terraform configs, or live infrastructure exist in connected repositories.",
        recommendation: "Add a demonstrable AWS project (e.g. S3 + Lambda serverless API or Terraform template) or reduce the proficiency claim until stronger evidence exists.",
        resume_claim: "Expert in AWS",
        observed_evidence: "No AWS projects, commits, or deployment templates detected",
      },
      ai_explanation:
        "Your AWS claim is currently unverified beyond the text on your resume. To prove this skill to hiring managers, commit Infrastructure-as-Code (Terraform/CDK) or a deployment workflow targeting AWS.",
    },
    {
      skill: "Docker",
      score: 38,
      status: "Limited Evidence",
      status_range: "31-60",
      sources_count: 2,
      breakdown: {
        resume_claim: { points: 10, max: 10, label: "Resume Claim", status: "✓ Detected", available: true },
        project_evidence: { points: 12, max: 25, label: "Project Evidence", status: "✓ 1 Dockerfile detected", available: true },
        code_evidence: { points: 10, max: 25, label: "Code Evidence", status: "✓ Basic single-stage build", available: true },
        github_activity: { points: 6, max: 15, label: "GitHub Activity", status: "✓ 6 container commits", available: true },
        project_relevance: { points: 0, max: 10, label: "Project Relevance", status: "○ No multi-service compose", available: true },
        recency: { points: 0, max: 10, label: "Recent Activity", status: "○ Created >120 days ago", available: true },
        documentation: { points: 0, max: 5, label: "Documentation & Portfolio", status: "○ No registry link", available: false },
      },
      sources: [
        { source: "Resume", description: "Candidate claims 'Docker & Containerization'", contribution: 10, status: "verified", details: "Listed under DevOps tools" },
        { source: "GitHub", description: "1 basic Dockerfile detected in backend repo", contribution: 28, status: "verified", details: "Found in fast-api-demo/Dockerfile" },
        { source: "Projects", description: "No Docker Compose or multi-stage production builds", contribution: 0, status: "unverified", details: "Container is a single-stage dev template" },
      ],
      claim_vs_evidence: {
        resume_claim: "Containerization with Docker",
        observed_evidence: [
          "1 Dockerfile found",
          "Single-stage build only",
          "No docker-compose orchestration",
        ],
        assessment: "Limited Support",
        confidence_score: 38,
      },
      mismatch: null,
      ai_explanation:
        "You have demonstrated basic Docker setup with a single Dockerfile. Implementing a multi-stage production build and a docker-compose.yml file will elevate this to strong evidence.",
    },
  ],
  mismatches: [
    {
      skill: "AWS",
      type: "under_supported",
      severity: "warning",
      title: "Potential Claim Mismatch",
      message: "Resume states 'Expert in AWS', but no observable AWS code, CDK/Terraform configs, or live infrastructure exist in connected repositories.",
      recommendation: "Add a demonstrable AWS project (e.g. S3 + Lambda serverless API or Terraform template) or reduce the proficiency claim until stronger evidence exists.",
      resume_claim: "Expert in AWS",
      observed_evidence: "No AWS projects, commits, or deployment templates detected",
    },
  ],
};

// ── API Functions ─────────────────────────────────────────────────────────────

export async function getEvidenceReport(profileId?: string): Promise<EvidenceReport> {
  const url = profileId ? `${BASE}/evidence?profile_id=${encodeURIComponent(profileId)}` : `${BASE}/evidence`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback to demo data if backend returns error
      return DEMO_EVIDENCE_REPORT;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    // Graceful offline fallback
    console.warn("Evidence API unavailable, using offline demo report.", err);
    return DEMO_EVIDENCE_REPORT;
  }
}

export async function getEvidenceSummary(profileId?: string): Promise<EvidenceSummary> {
  const url = profileId ? `${BASE}/evidence/summary?profile_id=${encodeURIComponent(profileId)}` : `${BASE}/evidence/summary`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Summary not ready");
    return res.json();
  } catch {
    return {
      overall_score: DEMO_EVIDENCE_REPORT.overall_score,
      verified_count: DEMO_EVIDENCE_REPORT.verified_count,
      partial_count: DEMO_EVIDENCE_REPORT.partial_count,
      weak_count: DEMO_EVIDENCE_REPORT.weak_count,
      total_skills: DEMO_EVIDENCE_REPORT.total_skills,
      top_verified: ["Java", "React", "SQL"],
      needs_evidence: ["AWS", "Docker"],
      categories: DEMO_EVIDENCE_REPORT.categories,
    };
  }
}

export async function getSkillEvidence(skillName: string, profileId?: string): Promise<SkillEvidenceItem> {
  const url = profileId
    ? `${BASE}/evidence/skills/${encodeURIComponent(skillName)}?profile_id=${encodeURIComponent(profileId)}`
    : `${BASE}/evidence/skills/${encodeURIComponent(skillName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Skill detail not found");
    return res.json();
  } catch {
    const match = DEMO_EVIDENCE_REPORT.skills.find(
      (s) => s.skill.toLowerCase() === skillName.toLowerCase()
    );
    if (match) return match;
    throw new Error(`Skill ${skillName} not found`);
  }
}
