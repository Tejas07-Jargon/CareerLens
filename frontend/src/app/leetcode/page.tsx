"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  BrainCircuit,
  Map,
  LayoutDashboard,
  Building2,
  GraduationCap,
  ShieldCheck,
  FolderGit2,
  Code2
} from "lucide-react";
import LeetCodeAnalyzer from "@/components/leetcode/LeetCodeAnalyzer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

type Tab = "dashboard" | "analyse" | "ownership" | "roadmap" | "leetcode" | "quiz" | "batch" | "evidence";

const TABS: { id: Tab; icon: React.ReactNode; label: string; description: string; href?: string }[] = [
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard",   description: "Command center · score, gaps, roadmap & next action", href: "/" },
  { id: "analyse",   icon: <Search size={18} />,          label: "Analyse",     description: "Score your profile against real evidence", href: "/?tab=analyse" },
  { id: "ownership", icon: <FolderGit2 size={18} />,      label: "Ownership Map", description: "Git blame code attribution & repository mapping", href: "/?tab=ownership" },
  { id: "roadmap",   icon: <Map size={18} />,             label: "Roadmap",     description: "Personalised 10-week skill-up plan", href: "/?tab=roadmap" },
  { id: "leetcode",  icon: <Code2 size={18} />,           label: "LeetCode",    description: "Evidence-backed LeetCode intelligence", href: "/leetcode" },
  { id: "quiz",      icon: <BrainCircuit size={18} />,    label: "Quiz",        description: "Expert-level MCQs powered by Gemini AI", href: "/?tab=quiz" },
  { id: "batch",     icon: <Building2 size={18} />,       label: "Cohort Batch", description: "Placement-cell cohort analytics", href: "/?tab=batch" },
];

export default function LeetCodePage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [persona, setPersona] = useState<"student" | "placement">("student");
  const activeTab = "leetcode";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get("profileId");
    const storedId = localStorage.getItem("careerlens_active_profile_id");
    const activeId = paramId || storedId;

    if (activeId && activeId !== "demo-candidate-82") {
      setProfileId(activeId);
    }
  }, []);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="nav-bar">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "transform var(--dur-fast) var(--ease-spring)",
            }}
            onClick={() => {
              router.push("/");
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "var(--blue)",
                borderRadius: "10px 13px 9px 12px",
                border: "2.5px solid var(--text)",
                boxShadow: "2px 2px 0 var(--text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                transition: "transform var(--dur-fast) var(--ease-spring)",
              }}
            >
              <Search size={20} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              Career<span className="gradient-text">Lens</span>
            </span>
          </div>

          {/* Nav links & Persona switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/evidence"
              className="btn"
              style={{
                padding: "7px 16px",
                fontSize: "0.82rem",
                background: "var(--blue-light)",
                color: "var(--blue)",
                borderColor: "var(--blue)",
                boxShadow: "2px 2px 0 var(--blue)",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ShieldCheck size={16} /> Evidence Verification
            </Link>

            {(["student", "placement"] as const).map((p, i) => (
              <button
                key={p}
                id={`persona-${p}`}
                onClick={() => {
                  setPersona(p);
                  if (p === "placement") {
                    router.push("/?tab=batch");
                  } else {
                    router.push("/");
                  }
                }}
                className="btn"
                style={{
                  padding: "7px 18px",
                  fontSize: "0.82rem",
                  background:
                    persona === p
                      ? i === 0
                        ? "var(--blue)"
                        : "var(--purple)"
                      : "var(--white)",
                  color: persona === p ? "white" : "var(--text-mid)",
                  borderColor: persona === p ? "var(--text)" : "var(--border)",
                  boxShadow: persona === p ? "var(--shadow-sm)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {p === "student" ? <><GraduationCap size={16} /> Student</> : <><Building2 size={16} /> Placement Cell</>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--white)",
          borderBottom: "2.5px solid var(--border)",
          position: "sticky",
          top: "65px",
          zIndex: 90,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div className="container" style={{ padding: "0 24px" }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: "4px",
              paddingTop: "6px",
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => {
                    if (tab.href) {
                      router.push(tab.href);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "9px 18px",
                    fontFamily: "var(--font)",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    border: "2px solid",
                    borderColor: isActive ? "var(--text)" : "transparent",
                    background: isActive ? "var(--bg-soft)" : "transparent",
                    cursor: "pointer",
                    color: isActive ? "var(--text)" : "var(--text-mid)",
                    whiteSpace: "nowrap",
                    borderRadius: "10px 12px 8px 11px",
                    boxShadow: isActive ? "2px 2px 0 var(--text)" : "none",
                    transition: "background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
                  }}
                >
                  <span style={{ fontSize: "1.05rem", display: "flex" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="container" style={{ padding: "28px 24px 60px", flex: 1 }}>
        <div className="fade-in-up">
           {profileId ? (
             <ErrorBoundary componentName="LeetCode Analyzer">
               <LeetCodeAnalyzer profileId={profileId} />
             </ErrorBoundary>
           ) : (
             <div style={{ textAlign: "center", padding: 40, color: "var(--text-mid)" }}>
               Loading active profile...
             </div>
           )}
        </div>
      </div>
    </main>
  );
}
