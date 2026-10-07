"use client";

import { useState, useRef } from "react";
import { createProfile, streamProgress, getReport } from "@/lib/api";
import type { ProfileReport, ProgressEvent } from "@/types";

import { Search, Link as LinkIcon, FileText, Briefcase, Palette, Target, Clock, CheckCircle, AlertTriangle, Rocket, Hourglass, Activity, PartyPopper, XCircle } from "lucide-react";

const STATUS_LABELS: Record<string, React.ReactNode> = {
  pending:             <><Hourglass size={16} className="inline mr-1 align-text-bottom" /> Queued — getting ready…</>,
  fast_pass:           <><Search size={16} className="inline mr-1 align-text-bottom" /> Analysing GitHub & resume…</>,
  fast_pass_complete:  <><CheckCircle size={16} className="inline mr-1 align-text-bottom" /> Fast analysis done — running deep pass…</>,
  deep_pass:           <><Activity size={16} className="inline mr-1 align-text-bottom" /> Deep repo analysis (clone + static)…</>,
  complete:            <><PartyPopper size={16} className="inline mr-1 align-text-bottom" /> Analysis complete!</>,
  error:               <><XCircle size={16} className="inline mr-1 align-text-bottom" /> An error occurred.</>,
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
        <div className="card fade-in-up stagger-1" style={{ borderColor: "var(--blue)", boxShadow: "4px 4px 0 var(--blue)" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><LinkIcon size={20} /> Your Profile Sources</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>Connect your work — GitHub, portfolio, and resume</p>
          </div>
          <div style={{ display: "grid", gap: 16 }}>

            <div>
              <label className="input-label" htmlFor="github_username">GitHub Username</label>
              <input
                id="github_username" name="github_username" className="input"
                placeholder="e.g. octocat or your GitHub username"
                style={{ borderColor: "var(--blue)" }}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="portfolio_url">Portfolio / Project URL</label>
              <input
                id="portfolio_url" name="portfolio_url" className="input"
                placeholder="https://yourportfolio.dev or https://myproject.vercel.app"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label className="input-label" htmlFor="resume_file"><FileText size={16} className="inline mr-1 align-text-bottom" /> Resume (PDF)</label>
                <input id="resume_file" name="resume_file" type="file" accept=".pdf" className="input" style={{ paddingTop: 10, cursor: "pointer" }} />
              </div>
              <div>
                <label className="input-label" htmlFor="linkedin_pdf"><Briefcase size={16} className="inline mr-1 align-text-bottom" /> LinkedIn PDF</label>
                <input id="linkedin_pdf" name="linkedin_pdf" type="file" accept=".pdf" className="input" style={{ paddingTop: 10, cursor: "pointer" }} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="design_portfolio_file"><Palette size={16} className="inline mr-1 align-text-bottom" /> Design Portfolio (PDF / Image)</label>
              <input id="design_portfolio_file" name="design_portfolio_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input" style={{ paddingTop: 10, cursor: "pointer" }} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Preferences ────────────────────────────────── */}
        <div className="card fade-in-up stagger-2" style={{ borderColor: "var(--purple)", boxShadow: "4px 4px 0 var(--purple)" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Target size={20} /> Career Target & Preferences</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>Tailor your benchmark against real industry requirements</p>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="target_role">Target Role</label>
              <select id="target_role" name="target_role" className="input" style={{ borderColor: "var(--purple)" }}>
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
              <label className="input-label" htmlFor="interests">Interests & Specializations</label>
              <input id="interests" name="interests" className="input" placeholder="e.g. open-source, fintech, distributed systems, generative AI" />
            </div>

            <div>
              <label className="input-label" htmlFor="weekly_hours_available"><Clock size={16} className="inline mr-1 align-text-bottom" /> Weekly Upskilling Time</label>
              <input id="weekly_hours_available" name="weekly_hours_available" type="number" min={1} max={40} defaultValue={6} className="input" />
            </div>
          </div>
        </div>

        {/* ── Section 3: Consent ───────────────────────────────────── */}
        <div className="card fade-in-up stagger-3" style={{ borderColor: "var(--green)", boxShadow: "4px 4px 0 var(--green)" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={20} /> Privacy & Consent</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>Evidence evaluation with strict data ethics</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
              padding: "12px 14px", background: "var(--bg-soft)", borderRadius: "10px 13px 9px 12px",
              border: "2px solid var(--border)", transition: "background-color var(--dur-fast) var(--ease-out)"
            }}>
              <input id="agreed_to_analysis" name="agreed_to_analysis" type="checkbox" required value="true"
                style={{ marginTop: 3, accentColor: "var(--green)", width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: "0.88rem", color: "var(--text-mid)", lineHeight: 1.6, fontWeight: 600 }}>
                I consent to CareerLens extracting skill evidence from my submitted repos and resume.
                My demographic attributes are <strong style={{ color: "var(--text)" }}>never</strong> ingested or scored.
              </span>
            </label>
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
              padding: "12px 14px", background: "var(--bg-soft)", borderRadius: "10px 13px 9px 12px",
              border: "2px solid var(--border)", transition: "background-color var(--dur-fast) var(--ease-out)"
            }}>
              <input id="agreed_to_cohort_sharing" name="agreed_to_cohort_sharing" type="checkbox" value="true"
                style={{ marginTop: 3, accentColor: "var(--green)", width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: "0.88rem", color: "var(--text-mid)", lineHeight: 1.6, fontWeight: 600 }}>
                I agree to include anonymised skill readiness in batch placement-cell dashboards.
              </span>
            </label>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div className="flag-banner fade-in-up">
            <span style={{ fontSize: "1.2rem", display: "flex" }}><AlertTriangle size={20} /></span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Progress ─────────────────────────────────────────────── */}
        {loading && (
          <div className="card fade-in-up" style={{ borderColor: "var(--yellow)", boxShadow: "4px 4px 0 var(--yellow)", background: "var(--yellow-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: liveScore ? 16 : 0 }}>
              <div className="spinner" style={{ borderTopColor: "var(--orange)", borderColor: "rgba(247,193,55,0.3)" }} />
              <span style={{ color: "var(--text)", fontSize: "0.98rem", fontWeight: 800 }}>
                {STATUS_LABELS[progressStatus ?? "pending"]}
              </span>
            </div>
            {liveScore && (
              <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 12 }}>
                <div style={{ textAlign: "center", minWidth: 90 }}>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--orange)", lineHeight: 1 }}>
                    {liveScore.mid.toFixed(0)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700, marginTop: 4 }}>
                    {liveScore.lo.toFixed(0)}–{liveScore.hi.toFixed(0)} range
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="progress-bar" style={{ height: 12 }}>
                    <div className="progress-bar-fill" style={{ width: `${liveScore.mid}%`, background: "var(--orange)" }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", marginTop: 6, fontWeight: 800 }}>
                    Live Bayesian score calculating…
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
          className="btn btn-primary fade-in-up stagger-4"
          disabled={loading}
          style={{ height: 56, fontSize: "1.05rem", fontWeight: 900, letterSpacing: "0.01em" }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2.5, borderTopColor: "white" }} /> Analysing Evidence…</>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><Rocket size={18} /> Analyse My Profile</div>
          )}
        </button>
      </form>
    </div>
  );
}

