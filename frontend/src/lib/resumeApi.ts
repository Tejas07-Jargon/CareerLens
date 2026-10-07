/**
 * Resume Builder API client.
 */

import { BASE } from "./api";
import type {
  ResumeVersionData,
  ResumeContent,
  AISuggestion,
  ResumeTemplateId,
} from "@/types";

export async function getSampleResume(roleName: string = "Software Engineer"): Promise<ResumeVersionData> {
  const res = await fetch(`${BASE}/resumes/sample/${encodeURIComponent(roleName)}`);
  if (!res.ok) throw new Error("Failed to load sample benchmark resume");
  return res.json();
}

export async function generateProfileResume(
  profileId: string,
  targetRole: string = "Software Engineer",
  customJdText?: string,
  templateId: ResumeTemplateId = "modern"
): Promise<ResumeVersionData> {
  const res = await fetch(`${BASE}/resumes/profiles/${encodeURIComponent(profileId)}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_role: targetRole,
      custom_jd_text: customJdText || null,
      template_id: templateId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to generate resume");
  }
  return res.json();
}

export async function listProfileResumes(profileId: string): Promise<ResumeVersionData[]> {
  const res = await fetch(`${BASE}/resumes/profiles/${encodeURIComponent(profileId)}/list`);
  if (!res.ok) throw new Error("Failed to list resume versions");
  return res.json();
}

export async function getResumeVersion(resumeId: string): Promise<ResumeVersionData> {
  const res = await fetch(`${BASE}/resumes/${encodeURIComponent(resumeId)}`);
  if (!res.ok) throw new Error("Failed to load resume version");
  return res.json();
}

export async function updateResumeVersion(
  resumeId: string,
  data: {
    title?: string;
    target_role?: string;
    target_jd_text?: string | null;
    template_id?: ResumeTemplateId;
    content: ResumeContent;
  }
): Promise<ResumeVersionData> {
  const res = await fetch(`${BASE}/resumes/${encodeURIComponent(resumeId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Failed to update resume");
  }
  return res.json();
}

export async function duplicateResumeVersion(resumeId: string): Promise<ResumeVersionData> {
  const res = await fetch(`${BASE}/resumes/${encodeURIComponent(resumeId)}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate resume version");
  return res.json();
}

export async function compareResumeVersions(
  versionIdA: string,
  versionIdB: string
): Promise<{
  v_a: any;
  v_b: any;
  deltas: { quality_score_diff: number; jd_alignment_diff: number; evidence_coverage_diff: number };
  improvements?: string[];
}> {
  const res = await fetch(`${BASE}/resumes/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version_id_a: versionIdA,
      version_id_b: versionIdB,
    }),
  });
  if (!res.ok) throw new Error("Failed to compare resume versions");
  return res.json();
}

export async function requestAISuggestion(data: {
  section: "summary" | "project_bullet";
  current_text: string;
  target_role?: string;
  project_name?: string;
  technologies?: string[];
  verified_skills?: string[];
}): Promise<AISuggestion> {
  const res = await fetch(`${BASE}/resumes/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to get AI suggestion");
  return res.json();
}

export async function exportResumePDF(content: ResumeContent, templateId: ResumeTemplateId = "modern"): Promise<Blob> {
  const res = await fetch(`${BASE}/resumes/export-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      template_id: templateId,
    }),
  });
  if (!res.ok) throw new Error("Failed to export PDF");
  return res.blob();
}
