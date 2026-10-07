/**
 * Ownership Map Data Contracts & API Types.
 *
 * These must mirror the backend API response exactly.
 * Backend source: backend/app/api/routes/ownership.py
 */

export interface LineRangeData {
  path: string;
  start_line: number;
  end_line: number;
  line_count: number;
}

export interface SkillOwnershipData {
  skill: string;
  student_lines: number;
  other_lines: number;
  unknown_lines: number;
  total_lines: number;
  share: number;
  factor: number;
  top_ranges: LineRangeData[];
}

export interface FileOwnershipData {
  path: string;
  size_bytes: number;
  raw_lines: number;
  meaningful_lines: number;
  student_lines: number;
  other_lines: number;
  bot_lines: number;
  unknown_lines: number;
  student_share: number;
  skills: string[];
}

/**
 * Repository summary as returned by GET /profiles/{id}/ownership.
 * The `id` field is the database primary key of the RepoAttribution record.
 */
export interface RepoSummary {
  /** RepoAttribution primary key */
  id: string;
  repo_full_name: string;
  relation: "owner" | "contributed_to";
  status: "discovered" | "queued" | "analysing" | "complete" | "partial" | "incomplete" | "failed" | "not_analysed";
  head_sha?: string | null;
  coverage: number;
  student_lines?: number;
  total_meaningful_lines?: number;
  student_share: number;
  other_share: number;
  unknown_share: number;
  incomplete: boolean;
  solo_exception_applied: boolean;
  error_message?: string | null;
  skills?: {
    skill: string;
    student_lines: number;
    total_lines: number;
    share?: number;
    student_share?: number;
    factor?: number;
  }[];
  notes?: string[];
  created_at?: string;
}

/**
 * Response from GET /profiles/{id}/ownership.
 */
export interface OwnershipSummaryResponse {
  profile_id: string;
  github_username?: string | null;
  algorithm_version?: string;
  total_repositories: number;
  overall_student_share: number;
  /** Weighted-average blame coverage across analysed repositories (0–1). */
  overall_coverage: number;
  overall_student_lines: number;
  overall_total_lines: number;
  repositories: RepoSummary[];
  skills?: { skill: string; student_lines: number; total_lines: number; student_share: number }[];
  /** If set, repository discovery failed and this describes why (e.g., rate limit). */
  discovery_error?: string | null;
}

/**
 * Response from GET /profiles/{id}/ownership/repos/{attribution_id}.
 * Note: The backend returns `id` (not `attribution_id`) as the primary key.
 */
export interface RepoDetailResponse {
  /** RepoAttribution primary key – same as RepoSummary.id */
  id: string;
  profile_id: string;
  repo_full_name: string;
  relation: "owner" | "contributed_to";
  head_sha?: string | null;
  method: string;
  status: string;
  coverage: number;
  student_lines: number;
  other_lines: number;
  unknown_lines: number;
  bot_lines: number;
  total_meaningful_lines: number;
  student_share: number;
  other_share: number;
  unknown_share: number;
  incomplete: boolean;
  solo_exception_applied: boolean;
  files_total: number;
  files_analysed: number;
  files_skipped: number;
  skipped_reasons: Record<string, number>;
  skills: SkillOwnershipData[];
  file_results: FileOwnershipData[];
  notes: string[];
  error_message?: string | null;
  execution_time_sec: number;
  created_at?: string;
}
