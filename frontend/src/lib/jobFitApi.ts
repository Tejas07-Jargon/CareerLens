/**
 * Job Fit Intelligence API client.
 */

import { BASE } from "./api";
import type {
  JobFitResult,
  JobFitWhatIfResult,
  JobComparisonResult,
} from "@/types/jobFit";

export async function getPresetJobs(): Promise<Array<{
  id: string;
  title: string;
  company: string;
  role_category: string;
  location: string;
}>> {
  const res = await fetch(`${BASE}/job-fit/preset-jobs`);
  if (!res.ok) throw new Error("Failed to load preset jobs");
  return res.json();
}

export async function analyzeJobFit(params: {
  profile_id?: string | null;
  preset_id?: string | null;
  jd_text?: string | null;
  job_title?: string | null;
  company?: string | null;
  location?: string | null;
  experience_level?: string | null;
}): Promise<JobFitResult> {
  const res = await fetch(`${BASE}/job-fit/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to analyze Job Fit");
  }
  return res.json();
}

export async function runJobFitWhatIf(
  baseJobFit: JobFitResult,
  actions: Array<{ skill: string; strength: number; description?: string }>
): Promise<JobFitWhatIfResult[]> {
  const res = await fetch(`${BASE}/job-fit/whatif`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_job_fit: baseJobFit,
      actions,
    }),
  });
  if (!res.ok) throw new Error("Job Fit What-If simulation failed");
  return res.json();
}

export async function compareJobs(
  profileId: string = "demo-candidate-82",
  jobIds?: string[]
): Promise<JobComparisonResult> {
  const res = await fetch(`${BASE}/job-fit/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: profileId,
      job_ids: jobIds || ["jd-neuralflow-ai", "jd-cloudscale-swe", "jd-fintech-backend"],
    }),
  });
  if (!res.ok) throw new Error("Failed to compare jobs");
  return res.json();
}
