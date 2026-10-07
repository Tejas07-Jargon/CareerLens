/**
 * Shared TypeScript types that mirror the backend Pydantic schemas.
 * Every field name matches what the API returns so there's no translation layer.
 */

// ── Evidence & Claims ─────────────────────────────────────────────────────────

export type EvidenceStatus = "Verified" | "Partial" | "Not yet evidenced";

export interface ClaimStatus {
  skill: string;
  status: EvidenceStatus;
  confidence: number;        // 0–1
  evidence_ids: string[];
  locators: Locator[];
}

export interface Locator {
  repo?: string;
  path?: string;
  commit_sha?: string;
  line_start?: number;
  line_end?: number;
  url?: string;
  file?: string;
  section?: string;
  snippet?: string;
  signal?: string;
  detail?: string;
  label?: string;            // "signal for review" for authenticity signals
  injected?: boolean;
}

// ── Score ─────────────────────────────────────────────────────────────────────

export interface ScoreInterval {
  mid: number;
  lo: number;
  hi: number;
}

export interface ComponentDetail {
  value: number;             // 0–100
  weight: number;            // 0–1
  reason: string;
  evidence_ids: string[];
}

export interface ScoreComponents {
  skill_coverage: ComponentDetail;
  project_depth: ComponentDetail;
  consistency_growth: ComponentDetail;
  portfolio_presentation: ComponentDetail;
  professional_signals: ComponentDetail;
}

export interface Credibility {
  verified_ratio: number;
  verified_count: number;
  total_claims: number;
  flags: SecurityFlag[];
}

export interface SecurityFlag {
  type: "hidden_text_white" | "hidden_text_tiny" | "prompt_injection" | string;
  detail: string;
  snippet?: string;
}

// ── Gap & Roadmap ─────────────────────────────────────────────────────────────

export interface Gap {
  skill: string;
  importance: number;
  market_frequency: number;
  current_confidence: number;
  priority_score: number;
  action: string;
}

export interface RoadmapMilestone {
  milestone: string;
  gap_closed: string;
  estimated_hours: number;
  proof_artifact: string;
  related_repo: string | null;
  resources: string[];
}

// ── Role Fit ──────────────────────────────────────────────────────────────────

export interface RoleFit {
  role: string;
  fit_pct: number;
  gap_skills: string[];
}

// ── Full Report ───────────────────────────────────────────────────────────────

export type ProfileStatus =
  | "pending"
  | "fast_pass"
  | "fast_pass_complete"
  | "deep_pass"
  | "complete"
  | "error";

export interface ProfileReport {
  profile_id: string;
  status: ProfileStatus;
  security_flags: SecurityFlag[];
  score: ScoreInterval;
  components: ScoreComponents;
  credibility: Credibility;
  claim_statuses: ClaimStatus[];
  role_fits: RoleFit[];
  gaps: Gap[];
  roadmap: RoadmapMilestone[];
}

// ── Batch / Cohort ────────────────────────────────────────────────────────────

export interface CohortInsights {
  cohort_id: string;
  cohort_name: string;
  cohort_size: number;
  heatmap: Record<string, number> | null;
  top_gaps: Array<{ skill: string; avg_confidence: number; gap_severity: number }> | null;
}

export interface WorkshopResult {
  name: string;
  skills_covered: string[];
  students_moved: number;
  pct_of_cohort: number;
}

export interface OptimiseResult {
  cohort_id: string;
  cohort_size: number;
  selected_workshops: WorkshopResult[];
}

// ── What-If ───────────────────────────────────────────────────────────────────

export interface WhatIfActionInput {
  description: string;
  skill_hints: string[];
  strength: number;
  source?: string;
}

export interface WhatIfResultItem {
  action: string;
  before_mid: number;
  after_mid: number;
  delta: number;
  before_range: [number, number];
  after_range: [number, number];
}

// ── SSE Progress ──────────────────────────────────────────────────────────────

export interface ProgressEvent {
  status: ProfileStatus;
  score?: ScoreInterval;
  error?: string;
}
