"use client";

import { useState, useRef } from "react";
import { createProfile, streamProgress, getReport } from "@/lib/api";
import type { ProfileReport, ProgressEvent } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending:             "Queued…",
  fast_pass:           "Analysing GitHub & resume…",
  fast_pass_complete:  "Fast analysis done — running deep pass…",
  deep_pass:           "Deep repo analysis (clone + static)…",
  complete:            "Analysis complete!",
  error:               "An error occurred.",
};

interface Props {
  onProfileCreated: (id: string) => void;
  onReportReady: (report: ProfileReport) => void;
}

export default function SubmitForm({ onProfileCreated, onReportReady }: Props) {
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<{ mid: number; lo: number; hi: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setProgressStatus("pending");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const { profile_id } = await createProfile(data);
      onProfileCreated(profile_id);

      // Open SSE stream
      cleanupRef.current = streamProgress(
        profile_id,
        (event: ProgressEvent) => {
          setProgressStatus(event.status);
          if (event.score) setLiveScore(event.score);
        },
        async () => {
          // Stream done — fetch full report
          try {
            const report = await getReport(profile_id);
            onReportReady(report);
          } catch {
            setError("Failed to load report. Please try refreshing.");
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message ?? "Submission failed.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <form id="submit-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Input sources ─────────────────────────────────────────────── */}
        <div className="card fade-in-up">
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 20 }}>Your Profile Sources</h2>
          <div style={{ display: "grid", gap: 16 }}>

            <div>
              <label className="input-label" htmlFor="github_username">GitHub Username</label>
              <input id="github_username" name="github_username" className="input" placeholder="e.g. octocat" />
            </div>

            <div>
              <label className="input-label" htmlFor="portfolio_url">Portfolio / Project URL</label>
              <input id="portfolio_url" name="portfolio_url" className="input" placeholder="https://myproject.vercel.app" />
            </div>

            <div>
              <label className="input-label" htmlFor="resume_file">Resume (PDF)</label>
              <input id="resume_file" name="resume_file" type="file" accept=".pdf" className="input" style={{ paddingTop: 10 }} />
            </div>

            <div>
              <label className="input-label" htmlFor="design_portfolio_file">Design Portfolio (PDF / PNG)</label>
              <input id="design_portfolio_file" name="design_portfolio_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input" style={{ paddingTop: 10 }} />
            </div>

            <div>
              <label className="input-label" htmlFor="linkedin_pdf">LinkedIn PDF Export</label>
              <input id="linkedin_pdf" name="linkedin_pdf" type="file" accept=".pdf" className="input" style={{ paddingTop: 10 }} />
            </div>
          </div>
        </div>

        {/* ── Preferences ───────────────────────────────────────────────── */}
        <div className="card fade-in-up" style={{ animationDelay: "0.05s" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 20 }}>Personalisation</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="target_role">Target Role</label>
              <select id="target_role" name="target_role" className="input">
                <option value="Software Engineer">Software Engineer</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="ML Engineer">ML Engineer</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="interests">Interests (free text)</label>
              <input id="interests" name="interests" className="input" placeholder="e.g. open-source, fintech, generative AI" />
            </div>

            <div>
              <label className="input-label" htmlFor="weekly_hours_available">Weekly Hours Available for Upskilling</label>
              <input id="weekly_hours_available" name="weekly_hours_available" type="number" min={1} max={40} defaultValue={5} className="input" />
            </div>
          </div>
        </div>

        {/* ── Consent ───────────────────────────────────────────────────── */}
        <div className="card fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input id="agreed_to_analysis" name="agreed_to_analysis" type="checkbox" required value="true"
                style={{ marginTop: 3, accentColor: "var(--accent-blue)" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                I consent to CareerLens analysing my uploaded data and public GitHub activity.
                My name, gender, and college are <strong style={{ color: "var(--text-primary)" }}>never</strong> used in scoring.
              </span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input id="agreed_to_cohort_sharing" name="agreed_to_cohort_sharing" type="checkbox" value="true"
                style={{ marginTop: 3, accentColor: "var(--accent-blue)" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                I also consent to my anonymised score being included in placement-cell batch analytics.
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="flag-banner fade-in-up">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Progress ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="card fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="spinner" />
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {STATUS_LABELS[progressStatus ?? "pending"]}
              </span>
            </div>
            {liveScore && (
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, background: "var(--gradient-accent)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {liveScore.mid.toFixed(0)}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    range {liveScore.lo.toFixed(0)}–{liveScore.hi.toFixed(0)}
                  </div>
                </div>
                <div style={{ flex: 1, alignSelf: "center" }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${liveScore.mid}%` }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Readiness score (updating…)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button id="submit-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ height: 52, fontSize: "1rem" }}>
          {loading ? "Analysing…" : "Analyse My Profile"}
        </button>
      </form>
    </div>
  );
}
