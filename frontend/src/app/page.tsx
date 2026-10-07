"use client";

import { useState } from "react";
import SubmitForm from "@/components/ui/SubmitForm";
import ReportView from "@/components/evidence/ReportView";
import type { ProfileReport } from "@/types";

export default function HomePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");

  return (
    <main>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="nav-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="url(#ng)" strokeWidth="2" />
              <path d="M9 14 L13 18 L19 10" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="ng" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f9eff" /><stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
              Career<span className="gradient-text">Lens</span>
            </span>
          </div>

          {/* Persona switcher */}
          <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 10 }}>
            {(["student", "placement"] as const).map((p) => (
              <button
                key={p}
                id={`persona-${p}`}
                onClick={() => setPersona(p)}
                className="btn"
                style={{
                  padding: "7px 18px",
                  fontSize: "0.82rem",
                  background: persona === p ? "rgba(79,158,255,0.18)" : "transparent",
                  color: persona === p ? "#4f9eff" : "var(--text-secondary)",
                  border: persona === p ? "1px solid rgba(79,158,255,0.35)" : "1px solid transparent",
                  borderRadius: 8,
                }}
              >
                {p === "student" ? "Student" : "Placement Cell"}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {!profileId && (
        <section style={{ padding: "72px 0 48px", textAlign: "center" }}>
          <div className="container">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(79,158,255,0.10)", border: "1px solid rgba(79,158,255,0.25)", borderRadius: 99, marginBottom: 24 }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: "0.78rem", color: "#4f9eff", fontWeight: 600, letterSpacing: "0.04em" }}>DataQuest 3.0 · CareerLens</span>
            </div>

            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20 }}>
              Know exactly how<br />
              <span className="gradient-text">job-ready you are</span>
            </h1>

            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
              Every skill claim verified against real proof of work — GitHub, portfolio, resume.
              Get an explainable score, not just a number.
            </p>

            {/* Feature pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 52 }}>
              {[
                "Evidence-backed scoring",
                "Click-through provenance",
                "Consistency timeline",
                "Personalised roadmap",
                "Placement dashboard",
                "What-if simulator",
              ].map((f) => (
                <span key={f} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 99, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: 80 }}>
        {!report ? (
          <SubmitForm
            onProfileCreated={(id) => setProfileId(id)}
            onReportReady={(r) => setReport(r)}
          />
        ) : (
          <ReportView
            report={report}
            persona={persona}
            onReset={() => { setReport(null); setProfileId(null); }}
          />
        )}
      </div>
    </main>
  );
}
