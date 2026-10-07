"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEvidenceSummary } from "@/lib/evidenceApi";
import type { EvidenceSummary } from "@/types/evidence";
import { ShieldCheck, Check, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  profileId?: string;
}

export default function EvidenceDashboardWidget({ profileId }: Props) {
  const [summary, setSummary] = useState<EvidenceSummary | null>(null);

  useEffect(() => {
    getEvidenceSummary(profileId).then(setSummary);
  }, [profileId]);

  const score = summary?.overall_score ?? 78;
  const verifiedCount = summary?.verified_count ?? 8;
  const partialCount = summary?.partial_count ?? 3;
  const weakCount = summary?.weak_count ?? 2;
  const topVerified = summary?.top_verified ?? ["Java", "React", "SQL"];
  const needsEvidence = summary?.needs_evidence ?? ["AWS", "Docker"];

  const evidenceHref = profileId ? `/evidence?profileId=${encodeURIComponent(profileId)}` : "/evidence";

  return (
    <div
      className="card fade-in-up"
      style={{
        borderColor: "var(--blue)",
        boxShadow: "4px 4px 0 var(--blue)",
        background: "var(--white)",
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {/* ── Widget Header ────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color="var(--blue)" />
            <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text)" }}>
              Evidence Confidence
            </span>
          </div>
          <span
            style={{
              fontSize: "0.72rem",
              background: "var(--blue-light)",
              color: "var(--blue)",
              padding: "2px 8px",
              borderRadius: "99px",
              fontWeight: 800,
              border: "1px solid var(--blue)",
            }}
          >
            Proof-of-Work
          </span>
        </div>

        {/* ── Score Ring & Status ──────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "14px 17px 13px 16px",
              background: "var(--green-light)",
              border: "2.5px solid var(--green)",
              boxShadow: "2px 2px 0 var(--green)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
            }}
          >
            <span style={{ fontSize: "1.5rem", lineHeight: 1, color: "var(--text)" }}>{score}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-mid)" }}>/ 100</span>
          </div>

          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text)" }}>
              {verifiedCount} Verified Skills
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", fontWeight: 600 }}>
              {partialCount} Partial · {weakCount} Weak / Unverified
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: 2 }}>
              Verified via GitHub, code & projects
            </div>
          </div>
        </div>

        {/* ── Top Verified & Needs Evidence ───────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
          {/* Top Verified */}
          <div
            style={{
              background: "var(--bg-soft)",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 800, marginBottom: 4 }}>
              Top Verified Skills:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {topVerified.map((sk) => (
                <div key={sk} style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={13} color="var(--green)" strokeWidth={3} /> {sk}
                </div>
              ))}
            </div>
          </div>

          {/* Needs Evidence */}
          <div
            style={{
              background: "var(--bg-soft)",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--pink)", fontWeight: 800, marginBottom: 4 }}>
              Needs Evidence:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {needsEvidence.map((sk) => (
                <div key={sk} style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={13} color="var(--pink)" /> {sk}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Link ─────────────────────────────────────────── */}
      <Link
        href={evidenceHref}
        className="btn"
        style={{
          width: "100%",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: "0.85rem",
          fontWeight: 800,
          background: "var(--blue)",
          color: "white",
          borderColor: "var(--text)",
          boxShadow: "2px 2px 0 var(--text)",
          padding: "10px",
          textDecoration: "none",
        }}
      >
        View Evidence Report <ArrowRight size={15} />
      </Link>
    </div>
  );
}
