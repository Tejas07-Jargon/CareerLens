/**
 * API client – typed wrappers around every backend endpoint.
 * Uses the Next.js API rewrite at /api/* → backend.
 */

import type {
  ProfileReport,
  CohortInsights,
  OptimiseResult,
  WhatIfActionInput,
  WhatIfResultItem,
  ProgressEvent,
} from "@/types";

const BASE = "/api";

// ── Profiles ──────────────────────────────────────────────────────────────────

export async function createProfile(formData: FormData): Promise<{ profile_id: string }> {
  const res = await fetch(`${BASE}/profiles/`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to create profile");
  }
  return res.json();
}

export async function getReport(profileId: string): Promise<ProfileReport> {
  const res = await fetch(`${BASE}/profiles/${profileId}/report`);
  if (!res.ok) throw new Error("Report not ready");
  return res.json();
}

export async function deleteProfile(profileId: string): Promise<void> {
  await fetch(`${BASE}/profiles/${profileId}`, { method: "DELETE" });
}

export async function runWhatIf(
  profileId: string,
  actions: WhatIfActionInput[]
): Promise<WhatIfResultItem[]> {
  const res = await fetch(`${BASE}/profiles/${profileId}/whatif`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions }),
  });
  if (!res.ok) throw new Error("What-if simulation failed");
  return res.json();
}

// ── SSE progress stream ───────────────────────────────────────────────────────

/**
 * Opens an SSE stream and calls onProgress with each update.
 * Calls onDone when analysis is complete.
 * Returns a cleanup function.
 */
export function streamProgress(
  profileId: string,
  onProgress: (event: ProgressEvent) => void,
  onDone: () => void,
  onError?: (err: Error) => void
): () => void {
  const es = new EventSource(`${BASE}/profiles/${profileId}/stream`);

  es.onmessage = (e) => {
    try {
      const data: ProgressEvent = JSON.parse(e.data);
      onProgress(data);
    } catch {
      // ignore parse errors
    }
  };

  es.addEventListener("done", () => {
    es.close();
    onDone();
  });

  es.onerror = (e) => {
    es.close();
    onError?.(new Error("Stream error"));
  };

  return () => es.close();
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<
  Array<{ role_name: string; role_track: string; jd_sample_size: number; top_skills: string[] }>
> {
  const res = await fetch(`${BASE}/roles/`);
  if (!res.ok) throw new Error("Failed to load roles");
  return res.json();
}

// ── Cohorts ───────────────────────────────────────────────────────────────────

export async function getCohortInsights(cohortId: string): Promise<CohortInsights> {
  const res = await fetch(`${BASE}/cohorts/${cohortId}/insights`);
  if (!res.ok) throw new Error("Failed to load cohort insights");
  return res.json();
}

export async function optimiseWorkshops(
  cohortId: string,
  candidateWorkshops: Array<{ name: string; skills_covered: string[] }>,
  budget?: number
): Promise<OptimiseResult> {
  const res = await fetch(`${BASE}/cohorts/${cohortId}/optimise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_workshops: candidateWorkshops, budget }),
  });
  if (!res.ok) throw new Error("Workshop optimisation failed");
  return res.json();
}
