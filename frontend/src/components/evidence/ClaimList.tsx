"use client";

import { useState } from "react";
import type { ClaimStatus, Locator } from "@/types";
import { Search } from "lucide-react";

interface Props {
  claimStatuses: ClaimStatus[];
}

const STATUS_CONFIG = {
  "Verified":            { cls: "badge-verified",    icon: "✓", border: "var(--green)", bg: "var(--green-light)" },
  "Partial":             { cls: "badge-partial",     icon: "◑", border: "var(--yellow)", bg: "var(--yellow-light)" },
  "Not yet evidenced":   { cls: "badge-unevidenced", icon: "○", border: "var(--pink)", bg: "var(--pink-light)" },
} as const;

function LocatorLink({ locator }: { locator: Locator }) {
  if (locator.repo && locator.commit_sha) {
    const url = `https://github.com/${locator.repo}/commit/${locator.commit_sha}`;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ color: "var(--blue)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "underline" }}>
        <code>{locator.repo}</code> @ <code>{locator.commit_sha.slice(0, 7)}</code>
      </a>
    );
  }
  if (locator.repo && locator.path) {
    const url = `https://github.com/${locator.repo}/blob/HEAD/${locator.path}`;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ color: "var(--blue)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "underline" }}>
        <code>{locator.repo}/{locator.path}</code>
      </a>
    );
  }
  if (locator.url) {
    return (
      <a href={locator.url} target="_blank" rel="noopener noreferrer"
        style={{ color: "var(--blue)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "underline" }}>
        {locator.url}
      </a>
    );
  }
  if (locator.snippet) {
    return <span style={{ color: "var(--text-mid)", fontSize: "0.82rem", fontStyle: "italic" }}>"{locator.snippet.slice(0, 90)}"</span>;
  }
  if (locator.signal) {
    return (
      <span style={{ color: "var(--orange)", fontSize: "0.82rem", fontWeight: 700 }}>
        ⚑ {locator.label ?? "signal for review"}: {locator.detail}
      </span>
    );
  }
  return <span style={{ color: "var(--text-soft)", fontSize: "0.82rem" }}>—</span>;
}

function ClaimCard({ cs, index }: { cs: ClaimStatus; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[cs.status] ?? STATUS_CONFIG["Not yet evidenced"];

  return (
    <div
      className={`card fade-in-up stagger-${(index % 8) + 1}`}
      style={{
        padding: "16px 20px",
        borderColor: cfg.border,
        boxShadow: `3px 3px 0 ${cfg.border}`,
        marginBottom: 10,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, cursor: cs.locators?.length ? "pointer" : "default", flexWrap: "wrap" }}
        onClick={() => cs.locators?.length && setOpen(!open)}
      >
        <span className={`badge ${cfg.cls}`}>{cfg.icon} {cs.status}</span>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", flex: 1, minWidth: 140 }}>{cs.skill}</span>
        
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Confidence bar */}
          <div style={{ width: 90, height: 8, background: "var(--border)", borderRadius: 99, border: "1.5px solid var(--text)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${cs.confidence * 100}%`,
              background: cs.status === "Verified" ? "var(--green)"
                : cs.status === "Partial" ? "var(--orange)"
                : "var(--pink)",
              transition: "width 0.6s var(--ease-out)",
            }} />
          </div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 800, minWidth: 36 }}>
            {(cs.confidence * 100).toFixed(0)}%
          </span>
          {cs.locators?.length ? (
            <button
              type="button"
              style={{
                background: "var(--bg-soft)",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: "2px 8px",
                fontSize: "0.78rem",
                color: "var(--blue)",
                fontWeight: 800,
                cursor: "pointer",
                transition: "transform var(--dur-fast) var(--ease-spring)",
              }}
            >
              {open ? "▲" : "▼"} {cs.locators.length} proof{cs.locators.length > 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Provenance drill-down ──────────────────────────────────────── */}
      {open && cs.locators?.length > 0 && (
        <div className="fade-in-up" style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "2px dashed var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "var(--bg-soft)",
          padding: "12px 14px",
          borderRadius: 8,
        }}>
          {cs.locators.map((loc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: "var(--text-soft)", fontSize: "0.78rem", fontWeight: 800, minWidth: 20 }}>#{i + 1}</span>
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
    <div className="fade-in-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}><Search size={20} /> Verified Skills & Evidence</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600 }}>Every claim traced down to exact source commits and files</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "Verified", "Partial", "Not yet evidenced"] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                id={`filter-${f.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => setFilter(f)}
                className="btn"
                style={{
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  background: isActive ? "var(--text)" : "var(--white)",
                  color: isActive ? "white" : "var(--text-mid)",
                  borderColor: isActive ? "var(--text)" : "var(--border)",
                  boxShadow: isActive ? "2px 2px 0 var(--text)" : "none",
                }}
              >
                {f === "all" ? "All" : f} ({counts[f as keyof typeof counts]})
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {filtered.length === 0 && (
          <div className="card" style={{ color: "var(--text-soft)", textAlign: "center", padding: 32, fontWeight: 700 }}>
            No claims found in this category.
          </div>
        )}
        {filtered.map((cs, idx) => (
          <ClaimCard key={cs.skill} cs={cs} index={idx} />
        ))}
      </div>
    </div>
  );
}

