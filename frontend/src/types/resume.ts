/**
 * TypeScript types for CareerLens Evidence-Aware AI Resume Builder.
 */

export type EvidenceStatusLevel = "VERIFIED" | "STRONG" | "MODERATE" | "WEAK" | "UNVERIFIED";

export type ResumeTemplateId = "minimal" | "modern" | "technical" | "academic";

export interface ResumeHeader {
  full_name: string;
  target_title: string;
  email: string;
  phone?: string;
  location?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  design_portfolio?: string;
}

export interface ResumeSkill {
  name: string;
  category: string;
  evidence_status: EvidenceStatusLevel;
  confidence: number; // 0–100
  evidence_ids?: string[];
  locators?: Array<Record<string, any>>;
}

export interface ResumeProject {
  id: string;
  name: string;
  role_title?: string;
  technologies: string[];
  github_url?: string;
  live_url?: string;
  bullets: string[];
  evidence_status: EvidenceStatusLevel;
  evidence_ids?: string[];
  evidence_confidence?: number;
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  location?: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
  bullets: string[];
  evidence_status?: EvidenceStatusLevel;
  evidence_confidence?: number;
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  location?: string;
  start_date: string;
  end_date: string;
  gpa?: string;
  highlights?: string;
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credential_url?: string;
  is_verified?: boolean;
}

export interface ResumeContent {
  header: ResumeHeader;
  summary: string;
  skills: ResumeSkill[];
  categorized_skills?: Record<string, ResumeSkill[]>;
  projects: ResumeProject[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: ResumeCertification[];
}

export interface QualityBreakdown {
  ats_compatibility: number;
  jd_alignment: number;
  evidence_coverage: number;
  readability: number;
  impact: number;
}

export interface JDGap {
  skill: string;
  status: "MATCHED" | "PARTIAL" | "UNVERIFIED" | "MISSING";
  importance: "HIGH" | "MEDIUM" | "LOW";
  evidence_level: string;
  confidence: number;
  recommendation: string;
  action: string;
  roadmap_ref: string;
}

export interface ResumeOptimizationResult {
  target_role: string;
  overall_alignment: number;
  skills_covered: number;
  project_relevance: number;
  keyword_coverage: number;
  evidence_backed_claims: number;
  matched_skills: string[];
  partial_skills: string[];
  missing_skills: string[];
  jd_gaps: JDGap[];
  quality_score: number;
  quality_breakdown: QualityBreakdown;
}

export interface ATSCheckItem {
  id: string;
  title: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface EvidenceAlert {
  skill: string;
  title: string;
  message: string;
  observed: string;
  severity: "WARN" | "INFO";
}

export interface ATSValidationResult {
  passed_cleanly: boolean;
  overall_status_message: string;
  checks: ATSCheckItem[];
  warnings: ATSCheckItem[];
  evidence_alerts: EvidenceAlert[];
  score: number;
}

export interface ResumeVersionData {
  id: string;
  profile_id: string;
  title: string;
  target_role: string;
  target_jd_text?: string | null;
  template_id: ResumeTemplateId;
  content: ResumeContent;
  quality_score: number;
  jd_alignment_pct: number;
  evidence_coverage_pct: number;
  version_num: number;
  optimization?: ResumeOptimizationResult;
  validation?: ATSValidationResult;
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  section: string;
  current: string;
  suggestion: string;
  reason: string;
  supported_skills: string[];
  evidence_tags: string[];
}
