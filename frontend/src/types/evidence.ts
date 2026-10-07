/**
 * TypeScript types for Evidence Confidence Score and Verification feature.
 */

export type EvidenceConfidenceStatus =
  | "Strong Evidence"
  | "Moderate Evidence"
  | "Limited Evidence"
  | "Weak / Unverified";

export interface BreakdownItem {
  points: number;
  max: number;
  label: string;
  status: string;
  available: boolean;
}

export interface EvidenceSourceItem {
  source: string;
  description: string;
  contribution: number;
  status: "verified" | "partial" | "unverified" | "unavailable";
  details?: string;
}

export interface ClaimVsEvidence {
  resume_claim: string;
  observed_evidence: string[];
  assessment: string;
  confidence_score: number;
}

export interface MismatchItem {
  skill?: string;
  type: "under_supported" | "exceeds_claim" | string;
  severity: "warning" | "info";
  title: string;
  message: string;
  recommendation?: string;
  resume_claim?: string;
  observed_evidence?: string;
}

export interface SkillEvidenceItem {
  skill: string;
  score: number; // 0–100
  status: EvidenceConfidenceStatus;
  status_range: string; // e.g. "81-100", "61-80", "31-60", "0-30"
  sources_count: number;
  breakdown: Record<string, BreakdownItem>;
  sources: EvidenceSourceItem[];
  claim_vs_evidence: ClaimVsEvidence;
  mismatch?: MismatchItem | null;
  ai_explanation: string;
}

export interface EvidenceCategories {
  technical: number;
  projects: number;
  github: number | null;
  portfolio: number | null;
  resumeConsistency: number;
}

export interface SourceAvailability {
  github: boolean;
  portfolio: boolean;
  resume: boolean;
  certifications: boolean;
}

export interface EvidenceReport {
  overall_score: number;
  verified_count: number;
  partial_count: number;
  weak_count: number;
  total_skills: number;
  categories: EvidenceCategories;
  source_availability: SourceAvailability;
  skills: SkillEvidenceItem[];
  mismatches: MismatchItem[];
}

export interface EvidenceSummary {
  overall_score: number;
  verified_count: number;
  partial_count: number;
  weak_count: number;
  total_skills: number;
  top_verified: string[];
  needs_evidence: string[];
  categories?: Partial<EvidenceCategories>;
}
