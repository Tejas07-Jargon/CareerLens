"use client";

import { useState } from "react";
import SubmitForm from "@/components/ui/SubmitForm";
import ReportView from "@/components/evidence/ReportView";
import type { ProfileReport } from "@/types";

const FEATURES = [
  { icon: "🔍", label: "Evidence-backed scoring", color: "var(--blue-light)", border: "var(--blue)" },
  { icon: "🔗", label: "Click-through provenance", color: "var(--purple-light)", border: "var(--purple)" },
  { icon: "📈", label: "Consistency timeline", color: "var(--green-light)", border: "var(--green)" },
  { icon: "🗺️", label: "Personalised roadmap", color: "var(--yellow-light)", border: "var(--yellow)" },
  { icon: "🎯", label: "Placement dashboard", color: "var(--pink-light)", border: "var(--pink)" },
  { icon: "⚡", label: "What-if simulator", color: "var(--orange-light)", border: "var(--orange)" },
];

export default function HomePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");

  return (
    <main>
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="nav-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, background: "var(--blue)", borderRadius: "10px 13px 9px 12px",
              border: "2.5px solid var(--text)", boxShadow: "2px 2px 0 var(--text)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
            }}>🔍</div>
            <span style={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              Career<span className="gradient-text">Lens</span>
            </span>
          </div>

          {/* Persona switcher */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["student", "placement"] as const).map((p, i) => (
              <button
                key={p}
                id={`persona-${p}`}
                onClick={() => setPersona(p)}
                className="btn"
                style={{
                  padding: "7px 18px",
                  fontSize: "0.82rem",
                  background: persona === p
                    ? (i === 0 ? "var(--blue)" : "var(--purple)")
                    : "var(--white)",
                  color: persona === p ? "white" : "var(--text-mid)",
                  borderColor: persona === p ? "var(--text)" : "var(--border)",
                  boxShadow: persona === p ? "var(--shadow-sm)" : "none",
                }}
              >
                {p === "student" ? "🎓 Student" : "🏢 Placement Cell"}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      {!profileId && (
        <section style={{ padding: "60px 0 40px", textAlign: "center" }}>
          <div className="container">
            {/* Live badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px",
              background: "var(--green-light)",
              border: "2px solid var(--green)",
              borderRadius: "99px",
              marginBottom: 28,
              boxShadow: "2px 2px 0 var(--green)",
            }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 800, letterSpacing: "0.04em" }}>
                DataQuest 3.0 · CareerLens is Live!
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
              color: "var(--text)",
            }}>
              Know exactly how<br />
              <span className="gradient-text">job-ready you are</span> 🚀
            </h1>

            <p style={{
              fontSize: "1.1rem",
              color: "var(--text-mid)",
              maxWidth: 560,
              margin: "0 auto 44px",
              lineHeight: 1.7,
              fontWeight: 600,
            }}>
              Every skill claim verified against real proof of work — GitHub, portfolio, resume.
              Get an explainable score, not just a number.
            </p>

            {/* Feature pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 52 }}>
              {FEATURES.map((f) => (
                <span
                  key={f.label}
                  style={{
                    padding: "7px 16px",
                    background: f.color,
                    border: `2px solid ${f.border}`,
                    borderRadius: "99px",
                    fontSize: "0.84rem",
                    color: "var(--text)",
                    fontWeight: 700,
                    boxShadow: `2px 2px 0 ${f.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {f.icon} {f.label}
                </span>
              ))}
            </div>

            {/* Doodle decorations */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{
                position: "absolute", top: -30, right: -60,
                fontSize: "2.5rem", transform: "rotate(15deg)", opacity: 0.7,
                animation: "bounceIn 0.8s 0.3s both",
              }}>⭐</div>
              <div style={{
                position: "absolute", top: -20, left: -70,
                fontSize: "2rem", transform: "rotate(-10deg)", opacity: 0.7,
                animation: "bounceIn 0.8s 0.5s both",
              }}>✨</div>
            </div>
          </div>
        </section>
      )}

      {/* ── Stats bar (only on landing) ─────────────────────────────── */}
      {!profileId && (
        <div className="container" style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "Evidence-based", value: "100%", color: "var(--blue)", bg: "var(--blue-light)" },
              { label: "No LLM scoring", value: "Pure math", color: "var(--purple)", bg: "var(--purple-light)" },
              { label: "Privacy-first", value: "GDPR-aligned", color: "var(--green)", bg: "var(--green-light)" },
            ].map((s) => (
              <div key={s.label} className="card" style={{
                borderColor: s.color,
                boxShadow: `3px 3px 0 ${s.color}`,
                background: s.bg,
                padding: "14px 24px",
                textAlign: "center",
                minWidth: 160,
              }}>
                <div style={{ fontWeight: 900, fontSize: "1.3rem", color: s.color }}>{s.value}</div>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-mid)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
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

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "2.5px solid var(--text)",
        background: "var(--white)",
        padding: "20px 0",
        textAlign: "center",
      }}>
        <div className="container">
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-mid)" }}>
            Built with ❤️ for DataQuest 3.0 · CareerLens Team
          </span>
        </div>
      </footer>
    </main>
  );
}
