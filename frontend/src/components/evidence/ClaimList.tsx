"use client";

import { useState } from "react";
import type { ClaimStatus, Locator } from "@/types";

interface Props {
  claimStatuses: ClaimStatus[];
}

const STATUS_CONFIG = {
  "Verified":            { cls: "badge-verified",    icon: "✓" },
  "Partial":             { cls: "badge-partial",     icon: "◑" },
  "Not yet evidenced":   { cls: "badge-unevidenced", icon: "○" },
} as const;

function LocatorLink({ locator }: { locator: Locator }) {
  if (locator.repo && locator.commit_sha) {
    const url = `https://github.com/${locator.repo}/commit/${locator.commit_sha}`;
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", fontSize: "0.78rem", textDecoration: "underline" }}>
      {locator.repo} @ {locator.commit_sha.slice(0, 7)}
    </a>;
  }
  if (locator.repo && locator.path) {
    const url = `https://github.com/${locator.repo}/blob/HEAD/${locator.path}`;
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", fontSize: "0.78rem", textDecoration: "underline" }}>
      {locator.repo}/{locator.path}
    </a>;
  }
  if (locator.url) {
    return <a href={locator.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", fontSize: "0.78rem", textDecoration: "underline" }}>
      {locator.url}
    </a>;
  }
  if (locator.snippet) {
    return <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontStyle: "italic" }}>"{locator.snippet.slice(0, 80)}"</span>;
  }
  if (locator.signal) {
    return <span style={{ color: "var(--accent-amber)", fontSize: "0.78rem" }}>
      ⚑ {locator.label ?? "signal for review"}: {locator.detail}
    </span>;
  }
  return <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>—</span>;
}

function ClaimCard({ cs }: { cs: ClaimStatus }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[cs.status] ?? STATUS_CONFIG["Not yet evidenced"];

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: cs.locators?.length ? "pointer" : "default" }}
        onClick={() => cs.locators?.length && setOpen(!open)}
      >
        <span className={`badge ${cfg.cls}`}>{cfg.icon} {cs.status}</span>
        <span style={{ fontWeight: 600, flex: 1 }}>{cs.skill}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Confidence bar */}
          <div style={{ width: 80, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${cs.confidence * 100}%`,
              background: cs.status === "Verified" ? "var(--accent-green)"
                : cs.status === "Partial" ? "var(--accent-amber)"
                : "rgba(248,113,113,0.5)",
              transition: "width 0.8s var(--ease-out)",
            }} />
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", minWidth: 32 }}>
            {(cs.confidence * 100).toFixed(0)}%
          </span>
          {cs.locators?.length ? (
            <span style={{ fontSize: "0.78rem", color: "var(--accent-blue)", marginLeft: 4 }}>
              {open ? "▲" : "▼"} {cs.locators.length} source{cs.locators.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Provenance drill-down ──────────────────────────────────────── */}
      {open && cs.locators?.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          {cs.locators.map((loc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", minWidth: 18 }}>#{i + 1}</span>
              <LocatorLink locator={loc} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClaimList({ claimStatuses }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = claimStatuses.filter((cs) =>
    filter === "all" ? true : cs.status === filter
  );

  const counts = {
    all: claimStatuses.length,
    Verified: claimStatuses.filter(c => c.status === "Verified").length,
    Partial: claimStatuses.filter(c => c.status === "Partial").length,
    "Not yet evidenced": claimStatuses.filter(c => c.status === "Not yet evidenced").length,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.05rem" }}>Skill Claims & Evidence</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "Verified", "Partial", "Not yet evidenced"] as const).map((f) => (
            <button
              key={f}
              id={`filter-${f.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => setFilter(f)}
              className="btn"
              style={{
                padding: "5px 12px",
                fontSize: "0.78rem",
                background: filter === f ? "rgba(79,158,255,0.15)" : "rgba(255,255,255,0.04)",
                color: filter === f ? "#4f9eff" : "var(--text-secondary)",
                border: "1px solid " + (filter === f ? "rgba(79,158,255,0.3)" : "var(--border)"),
                borderRadius: 8,
              }}
            >
              {f} ({counts[f as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>No claims in this category.</div>
        )}
        {filtered.map((cs) => (
          <ClaimCard key={cs.skill} cs={cs} />
        ))}
      </div>
    </div>
  );
}
