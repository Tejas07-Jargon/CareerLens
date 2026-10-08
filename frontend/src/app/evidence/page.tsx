"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getEvidenceReport } from "@/lib/evidenceApi";
import type { EvidenceReport } from "@/types/evidence";
import EvidenceVerificationView from "@/components/evidence/EvidenceVerificationView";
import { Search, Check, AlertTriangle } from "lucide-react";

function EvidencePageContent() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId") || undefined;

  const [report, setReport] = useState<EvidenceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getEvidenceReport(profileId)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load evidence report:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="nav-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "10px",
              border: "2px solid var(--text)", boxShadow: "2px 2px 0 var(--text)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              background: "#ffffff"
            }}>
              <img
                src="/logo.png"
                alt="Kareer Kranti Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              Kareer <span className="gradient-text">Kranti</span>
            </span>
          </Link>

          {/* Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              className="btn btn-ghost"
              style={{ fontSize: "0.82rem", padding: "6px 14px" }}
            >
              Dashboard
            </Link>
            <div
              style={{
                fontSize: "0.8rem",
                padding: "6px 14px",
                background: "var(--blue)",
                color: "white",
                borderRadius: "8px",
                border: "2px solid var(--text)",
                boxShadow: "2px 2px 0 var(--text)",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Check size={14} strokeWidth={3} /> Evidence Mode
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="container" style={{ flex: 1, padding: "36px 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div className="spinner" style={{ margin: "0 auto 16px", width: 42, height: 42, borderWidth: 3.5 }} />
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)" }}>
              Analyzing evidence records & proof-of-work…
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", marginTop: 6 }}>
              Verifying commits, AST depth, and independent signals
            </p>
          </div>
        ) : report ? (
          <EvidenceVerificationView report={report} profileId={profileId} />
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <AlertTriangle size={42} color="var(--yellow)" style={{ margin: "0 auto" }} />
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: 10 }}>Unable to load evidence</h2>
            <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
              Return to Home
            </Link>
          </div>
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
            Kareer Kranti Evidence Verification Engine · DataQuest 3.0
          </span>
        </div>
      </footer>
    </main>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
      </div>
    }>
      <EvidencePageContent />
    </Suspense>
  );
}
