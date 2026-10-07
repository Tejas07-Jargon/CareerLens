"use client";

import { useState, useRef } from "react";
import { createProfile, streamProgress, getReport } from "@/lib/api";
import type { ProfileReport, ProgressEvent } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending:             "⏳ Queued — getting ready…",
  fast_pass:           "🔍 Analysing GitHub & resume…",
  fast_pass_complete:  "✅ Fast analysis done — running deep pass…",
  deep_pass:           "🧬 Deep repo analysis (clone + static)…",
  complete:            "🎉 Analysis complete!",
  error:               "❌ An error occurred.",
};

const SECTIONS = [
  {
    title: "🔗 Your Profile Sources",
    subtitle: "Connect the dots — give us what you've built",
    borderColor: "var(--blue)",
    bg: "var(--blue-light)",
  },
  {
    title: "🎯 Personalisation",
    subtitle: "Tell us where you want to go",
    borderColor: "var(--purple)",
    bg: "var(--purple-light)",
  },
  {
    title: "✅ Quick Consent",
    subtitle: "We care about your privacy",
    borderColor: "var(--green)",
    bg: "var(--green-light)",
  },
];

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

      cleanupRef.current = streamProgress(
        profile_id,
        (event: ProgressEvent) => {
          setProgressStatus(event.status);
          if (event.score) setLiveScore(event.score);
        },
        async () => {
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
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <form id="submit-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Section 1: Profile sources ─────────────────────────────── */}
        <div className="card fade-in-up" style={{ borderColor: "var(--blue)", boxShadow: "4px 4px 0 var(--blue)" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: 4 }}>🔗 Your Profile Sources</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>Connect the dots — give us what you've built</p>
          </div>
          <div style={{ display: "grid", gap: 16 }}>

            <div>
              <label className="input-label" htmlFor="github_username">GitHub Username</label>
              <input
                id="github_username" name="github_username" className="input"
                placeholder="e.g. octocat"
                style={{ borderColor: "var(--blue)", boxShadow: "none" }}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="portfolio_url">Portfolio / Project URL</label>
              <input
                id="portfolio_url" name="portfolio_url" className="input"
                placeholder="https://myproject.vercel.app"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="input-label" htmlFor="resume_file">📄 Resume (PDF)</label>
                <input id="resume_file" name="resume_file" type="file" accept=".pdf" className="input" style={{ paddingTop: 10 }} />
              </div>
              <div>
                <label className="input-label" htmlFor="linkedin_pdf">💼 LinkedIn PDF</label>
                <input id="linkedin_pdf" name="linkedin_pdf" type="file" accept=".pdf" className="input" style={{ paddingTop: 10 }} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="design_portfolio_file">🎨 Design Portfolio (PDF / PNG)</label>
              <input id="design_portfolio_file" name="design_portfolio_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input" style={{ paddingTop: 10 }} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Preferences ────────────────────────────────── */}
        <div className="card fade-in-up" style={{ borderColor: "var(--purple)", boxShadow: "4px 4px 0 var(--purple)", animationDelay: "0.05s" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: 4 }}>🎯 Personalisation</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>Tell us where you want to go</p>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="target_role">Target Role</label>
              <select id="target_role" name="target_role" className="input">
                <option value="Software Engineer">💻 Software Engineer</option>
                <option value="Frontend Developer">🎨 Frontend Developer</option>
                <option value="Backend Developer">⚙️ Backend Developer</option>
                <option value="Data Scientist">📊 Data Scientist</option>
                <option value="ML Engineer">🤖 ML Engineer</option>
                <option value="UI/UX Designer">✏️ UI/UX Designer</option>
                <option value="Product Manager">📋 Product Manager</option>
                <option value="DevOps Engineer">🚀 DevOps Engineer</option>
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="interests">Interests</label>
              <input id="interests" name="interests" className="input" placeholder="e.g. open-source, fintech, generative AI" />
            </div>

            <div>
              <label className="input-label" htmlFor="weekly_hours_available">⏰ Weekly Hours for Upskilling</label>
              <input id="weekly_hours_available" name="weekly_hours_available" type="number" min={1} max={40} defaultValue={5} className="input" />
            </div>
          </div>
        </div>

        {/* ── Section 3: Consent ───────────────────────────────────── */}
        <div className="card fade-in-up" style={{ borderColor: "var(--green)", boxShadow: "4px 4px 0 var(--green)", animationDelay: "0.1s" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: 4 }}>✅ Quick Consent</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>We care about your privacy 🔒</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px", background: "var(--bg-soft)", borderRadius: "10px 13px 9px 12px", border: "2px solid var(--border)" }}>
              <input id="agreed_to_analysis" name="agreed_to_analysis" type="checkbox" required value="true"
                style={{ marginTop: 3, accentColor: "var(--green)", width: 18, height: 18 }} />
              <span style={{ fontSize: "0.88rem", color: "var(--text-mid)", lineHeight: 1.6, fontWeight: 600 }}>
                I consent to CareerLens analysing my uploaded data and public GitHub activity.
                My name, gender, and college are <strong style={{ color: "var(--text)" }}>never</strong> used in scoring.
              </span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px", background: "var(--bg-soft)", borderRadius: "10px 13px 9px 12px", border: "2px solid var(--border)" }}>
              <input id="agreed_to_cohort_sharing" name="agreed_to_cohort_sharing" type="checkbox" value="true"
                style={{ marginTop: 3, accentColor: "var(--green)", width: 18, height: 18 }} />
              <span style={{ fontSize: "0.88rem", color: "var(--text-mid)", lineHeight: 1.6, fontWeight: 600 }}>
                I also consent to my anonymised score being included in placement-cell batch analytics.
              </span>
            </label>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div className="flag-banner fade-in-up">
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Progress ─────────────────────────────────────────────── */}
        {loading && (
          <div className="card fade-in-up" style={{ borderColor: "var(--yellow)", boxShadow: "4px 4px 0 var(--yellow)", background: "var(--yellow-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: liveScore ? 16 : 0 }}>
              <div className="spinner" style={{ borderTopColor: "var(--yellow)", borderColor: "rgba(247,193,55,0.3)" }} />
              <span style={{ color: "var(--text)", fontSize: "0.95rem", fontWeight: 800 }}>
                {STATUS_LABELS[progressStatus ?? "pending"]}
              </span>
            </div>
            {liveScore && (
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--orange)" }}>
                    {liveScore.mid.toFixed(0)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>
                    {liveScore.lo.toFixed(0)}–{liveScore.hi.toFixed(0)} range
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${liveScore.mid}%`, background: "var(--orange)" }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", marginTop: 6, fontWeight: 700 }}>
                    Live readiness score…
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Submit button ─────────────────────────────────────────── */}
        <button
          id="submit-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ height: 56, fontSize: "1.05rem", fontWeight: 900, letterSpacing: "0.01em" }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2.5 }} /> Analysing…</>
          ) : (
            "🚀 Analyse My Profile"
          )}
        </button>
      </form>
    </div>
  );
}
