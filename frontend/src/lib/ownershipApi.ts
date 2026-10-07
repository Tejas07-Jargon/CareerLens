/**
 * Ownership Map API client.
 */

import { BASE } from "./api";
import type { OwnershipSummaryResponse, RepoDetailResponse } from "@/types/ownership";

export async function getOwnershipOverview(profileId: string): Promise<OwnershipSummaryResponse> {
  const res = await fetch(`${BASE}/profiles/${profileId}/ownership`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to fetch ownership overview");
  }
  return res.json();
}

export async function getRepoOwnershipDetail(
  profileId: string,
  attributionId: string
): Promise<RepoDetailResponse> {
  const res = await fetch(`${BASE}/profiles/${profileId}/ownership/repos/${attributionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to fetch repository detail");
  }
  return res.json();
}

export async function refreshOwnership(profileId: string, githubToken?: string): Promise<{ job_id: string; message: string; staged_count: number }> {
  const options: RequestInit = { method: "POST" };
  if (githubToken) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify({ github_token: githubToken });
  }
  const res = await fetch(`${BASE}/profiles/${profileId}/ownership/refresh`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to refresh ownership");
  }
  return res.json();
}

export async function declareIdentityEmail(profileId: string, email: string): Promise<any> {
  const res = await fetch(`${BASE}/profiles/${profileId}/identities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to declare commit email");
  }
  return res.json();
}
