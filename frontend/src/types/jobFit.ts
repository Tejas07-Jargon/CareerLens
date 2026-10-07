/**
 * TypeScript types for CareerLens Job Fit & Job Match Intelligence.
 */

export type RequirementImportance = "CRITICAL" | "IMPORTANT" | "NICE_TO_HAVE";

export type ProofLevel = "VALIDATED" | "DEMONSTRATED" | "CLAIMED_ONLY" | "UNVERIFIED";

export type SkillFitStatus = "VERIFIED" | "STRONG" | "MODERATE" | "WEAK" | "MISSING";

export interface JobDescriptionInfo {
  id: string;
  title: string;
  company: string;
  role_category: string;
  experience_level?: string;
  location?: string;
  summary?: string;
}

export interface SkillMatchItem {
  skill: string;
  importance: RequirementImportance;
  importance_weight: number;
  proof_level: ProofLevel;
  evidence_status: SkillFitStatus;
  confidence: number; // 0–100
  evidence_ids: string[];
  evidence_summary: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  quiz_validated?: boolean;
  github_proven?: boolean;
}

export interface JobFitScoreBreakdown {
  overall_fit: number;
  required_skill_coverage: number;
  evidence_confidence: number;
  project_relevance: number;
  critical_skills_covered: string; // e.g. "4 / 4"
  critical_coverage_pct: number;
  total_skills_count: number;
  verified_skills_count: number;
  partial_skills_count: number;
  missing_skills_count: number;
}

export interface JobFitExplanations {
  strongest_advantage: string;
  biggest_risk: string;
  summary_narrative: string;
}

export interface HoldingBackFactor {
  skill: string;
  importance: RequirementImportance;
  evidence_status: SkillFitStatus;
  confidence: number;
  severity: number;
  estimated_impact: string; // e.g. "+8 pts"
  why_it_matters: string;
  recommended_action: string;
  roadmap_ref: string;
}

export interface JobFitResult {
  job: JobDescriptionInfo;
  overall_fit_score: number;
  fit_level: string; // "Exceptional Fit" | "Strong Fit" | "Moderate Fit" | "Developing Fit"
  score_breakdown: JobFitScoreBreakdown;
  skill_matches: SkillMatchItem[];
  strong_fit_skills: string[];
  partial_fit_skills: string[];
  missing_skills: string[];
  explanations: JobFitExplanations;
  holding_back_factors: HoldingBackFactor[];
  preset_jobs: Array<{
    id: string;
    title: string;
    company: string;
    role_category: string;
    location: string;
  }>;
}

export interface JobFitWhatIfResult {
  action: string;
  skill: string;
  before_score: number;
  projected_score: number;
  delta: number;
  reason: string;
}

export interface JobComparisonItem {
  job_id: string;
  title: string;
  company: string;
  overall_fit: number;
  fit_level: string;
  required_skills_pct: number;
  evidence_confidence_pct: number;
  project_relevance_pct: number;
  top_advantage: string;
  top_gap: string;
}

export interface JobComparisonResult {
  comparisons: JobComparisonItem[];
  best_current_fit: JobComparisonItem | null;
  best_growth_opportunity: JobComparisonItem | null;
}
