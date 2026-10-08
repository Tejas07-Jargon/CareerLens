/**
 * API client – typed wrappers around every backend endpoint.
 * Single source of truth for the backend base URL.
 */

import type {
  ProfileReport,
  CohortInsights,
  OptimiseResult,
  WhatIfActionInput,
  WhatIfResultItem,
  ProgressEvent,
  QuizRequest,
  QuizResponse,
  PersonalizedRoadmapResponse,
} from "@/types";

// ─── Single source of truth ───────────────────────────────────────────────────
// All API files import BASE from here — no more scattered hardcoded URLs.
export const BASE = "http://localhost:8000";

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

export async function searchProfile(username: string): Promise<{ profile_id: string }> {
  const res = await fetch(`${BASE}/profiles/search?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Candidate doesn't exist");
    }
    throw new Error("Failed to search candidate");
  }
  return res.json();
}

export async function offerJob(profileId: string, companyName: string): Promise<{ status: string, message: string }> {
  const res = await fetch(`${BASE}/profiles/${profileId}/offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to offer job");
  }
  return res.json();
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

export async function getDashboardData(profileId: string): Promise<{
  student: { name: string; target_role: string };
  job_offer?: { company: string | null; offered_at: string | null };
  readiness: { score: number; change: number; trend: string };
  evidence_confidence: number;
  quiz_stats: { total_quizzes: number; average_score: number; current_streak: number };
  strongest_skills: { name: string; score: number; trend: string }[];
  weakest_skills: { name: string; score: number; trend: string }[];
  recommendations: { title: string; description: string; type: string }[];
}> {
  const res = await fetch(`${BASE}/profiles/${profileId}/dashboard`, { cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error("Dashboard data not available");
  return res.json();
}

// ── SSE progress stream ───────────────────────────────────────────────────────

/**
 * Opens an SSE stream for analysis progress.
 * Resilient to temporary backend restarts — reconnects up to MAX_RETRIES
 * times with exponential back-off before invoking onError.
 * Returns a cleanup function to close the stream.
 */
export function streamProgress(
  profileId: string,
  onProgress: (event: ProgressEvent) => void,
  onDone: () => void,
  onError?: (err: Error) => void
): () => void {
  let closed = false;
  let retries = 0;
  const MAX_RETRIES = 5;
  let es: EventSource | null = null;

  function connect() {
    if (closed) return;
    es = new EventSource(`${BASE}/profiles/${profileId}/stream`);

    es.onmessage = (e) => {
      retries = 0; // reset on each successful message
      try {
        const data: ProgressEvent = JSON.parse(e.data);
        onProgress(data);
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener("done", () => {
      es?.close();
      closed = true;
      onDone();
    });

    es.onerror = () => {
      es?.close();
      if (closed) return;
      if (retries >= MAX_RETRIES) {
        closed = true;
        onError?.(
          new Error("Stream disconnected. Analysis may still be running — please refresh to check.")
        );
        return;
      }
      const delay = Math.min(1000 * Math.pow(2, retries), 16000);
      retries++;
      setTimeout(connect, delay);
    };
  }

  connect();
  return () => {
    closed = true;
    es?.close();
  };
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

export async function getGlobalInsights(): Promise<CohortInsights> {
  const res = await fetch(`${BASE}/cohorts/global/insights`);
  if (!res.ok) throw new Error("Failed to load global cohort insights");
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

// ── Quiz ──────────────────────────────────────────────────────────────────────

export async function generateQuiz(req: QuizRequest): Promise<QuizResponse> {
  const res = await fetch(`${BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Quiz generation failed");
  }
  return res.json();
}

/**
 * Submit quiz attempt results to the backend.
 * Saves to the profile's quiz history and updates mastery scores.
 * quizId is a slug like "software-engineer-quiz-1".
 */
export async function submitQuizAttempt(
  quizId: string,
  profileId: string,
  answers: object[],
  timeTaken: number
): Promise<void> {
  try {
    const res = await fetch(`${BASE}/quiz/${encodeURIComponent(quizId)}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        answers,
        time_taken: timeTaken,
      }),
    });
    if (!res.ok) {
      console.warn("Quiz attempt submission failed:", res.status, res.statusText);
    }
  } catch (err) {
    // Non-fatal — quiz still shows results even if submission fails
    console.warn("Failed to submit quiz attempt:", err);
  }
}

// ── Personalized Roadmap ──────────────────────────────────────────────────────

export async function getPersonalizedRoadmap(
  profileId?: string | null,
  targetRole?: string
): Promise<PersonalizedRoadmapResponse> {
  const query = targetRole ? `?target_role=${encodeURIComponent(targetRole)}` : "";
  if (profileId) {
    try {
      const res = await fetch(`${BASE}/profiles/${profileId}/roadmap${query}`);
      if (res.ok) return res.json();
    } catch {
      // fall through to sample roadmap
    }
  }
  const role = targetRole || "Software Engineer";
  const res = await fetch(`${BASE}/profiles/sample-roadmap/${encodeURIComponent(role)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to load roadmap");
  }
  return res.json();
}

// ── Cohort Data ──────────────────────────────────────────────────────────────

export async function getCohortData(): Promise<any[]> {
  const res = await fetch(`${BASE}/profiles`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to fetch cohort data");
  }
  return res.json();
}
