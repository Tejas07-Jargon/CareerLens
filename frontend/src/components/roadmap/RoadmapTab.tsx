"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Map,
  Lightbulb,
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Layers,
  Code2,
  FolderGit2,
  Check,
  Compass,
  Zap,
} from "lucide-react";
import { getPersonalizedRoadmap } from "@/lib/api";
import type {
  PersonalizedRoadmapResponse,
  PersonalizedMilestone,
  ProfileReport,
} from "@/types";

interface Props {
  profileId?: string | null;
  report?: ProfileReport | null;
  onNavigateToAnalyse?: () => void;
}

const ALL_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Data Scientist",
  "Data Analyst",
  "AI Engineer",
  "UI/UX Designer",
  "DevOps",
];

export default function RoadmapTab({ profileId, report, onNavigateToAnalyse }: Props) {
  const initialRole = report?.role_fits?.[0]?.role || "Software Engineer";
  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [data, setData] = useState<PersonalizedRoadmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "gaps" | "verified">("all");
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // Sync role if report changes
  useEffect(() => {
    if (report?.role_fits?.[0]?.role) {
      setSelectedRole(report.role_fits[0].role);
    }
  }, [report]);

  // Load completed milestone checks from localStorage
  useEffect(() => {
    try {
      const storageKey = `careerlens_roadmap_checked_${profileId || "anon"}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCompletedMap(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [profileId]);

  // Fetch personalized roadmap data whenever role or profileId changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPersonalizedRoadmap(profileId, selectedRole)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
          // Auto expand the next recommended milestone if present
          if (res.next_milestone?.id) {
            setExpandedId(res.next_milestone.id);
          } else if (res.milestones?.[0]?.id) {
            setExpandedId(res.milestones[0].id);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load personalized roadmap");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, selectedRole]);

  function toggleManualComplete(id: string) {
    setCompletedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        const storageKey = `careerlens_roadmap_checked_${profileId || "anon"}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    if (!data?.milestones) return [];
    if (statusFilter === "verified") {
      return data.milestones.filter(
        (m) => m.status === "STRONG" || m.status === "VERIFIED" || completedMap[m.id]
      );
    }
    if (statusFilter === "gaps") {
      return data.milestones.filter(
        (m) => m.status !== "STRONG" && m.status !== "VERIFIED" && !completedMap[m.id]
      );
    }
    return data.milestones;
  }, [data, statusFilter, completedMap]);

  // Status badge config
  const getStatusBadge = (status: PersonalizedMilestone["status"], isManualDone: boolean) => {
    if (isManualDone) {
      return {
        label: "Manual Check",
        bg: "var(--green-light)",
        color: "var(--green)",
        border: "var(--green)",
        icon: <Check size={13} />,
      };
    }
    switch (status) {
      case "STRONG":
        return {
          label: "Strong Proof",
          bg: "#ecfdf5",
          color: "#059669",
          border: "#10b981",
          icon: <ShieldCheck size={13} />,
        };
      case "VERIFIED":
        return {
          label: "Verified Code",
          bg: "var(--green-light)",
          color: "var(--green)",
          border: "var(--green)",
          icon: <CheckCircle2 size={13} />,
        };
      case "MODERATE":
        return {
          label: "Moderate Proof",
          bg: "var(--blue-light)",
          color: "var(--blue)",
          border: "var(--blue)",
          icon: <Sparkles size={13} />,
        };
      case "LIMITED EVIDENCE":
        return {
          label: "Resume Only (No Repo)",
          bg: "var(--yellow-light)",
          color: "#b45309",
          border: "var(--yellow)",
          icon: <AlertCircle size={13} />,
        };
      case "CONFLICTING":
        return {
          label: "Conflicting Signals",
          bg: "var(--pink-light)",
          color: "var(--pink)",
          border: "var(--pink)",
          icon: <AlertCircle size={13} />,
        };
      case "WEAK":
      case "MISSING":
      default:
        return {
          label: "Missing Proof",
          bg: "var(--bg-soft)",
          color: "var(--text-mid)",
          border: "var(--border)",
          icon: <Circle size={13} />,
        };
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* ── Header Card ─────────────────────────────────────────────────────── */}
      <div
        className="card fade-in-up"
        style={{
          borderColor: "var(--green)",
          boxShadow: "5px 5px 0 var(--green)",
          marginBottom: 24,
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                background: "var(--green-light)",
                border: "1.5px solid var(--green)",
                borderRadius: 99,
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "var(--green)",
                marginBottom: 8,
              }}
            >
              <Compass size={13} /> Evidence-Grounded Path
            </div>
            <h2
              style={{
                fontWeight: 900,
                fontSize: "1.6rem",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Map size={26} /> Personalized{" "}
              <span className="gradient-text">Career Roadmap</span>
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", fontWeight: 600, maxWidth: 520 }}>
              Milestones mapped directly against verified commit proofs and official{" "}
              <a
                href={data?.roadmap.url || "https://roadmap.sh"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--blue)", textDecoration: "underline", fontWeight: 800 }}
              >
                roadmap.sh
              </a>{" "}
              community standards.
            </p>
          </div>

          {/* Role selector */}
          <div style={{ minWidth: 220 }}>
            <label
              className="input-label"
              htmlFor="roadmap-role-select"
              style={{ marginBottom: 6, fontSize: "0.82rem", fontWeight: 800 }}
            >
              Target Role Track
            </label>
            <select
              id="roadmap-role-select"
              className="input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                borderColor: "var(--green)",
                fontWeight: 800,
                fontSize: "0.88rem",
                boxShadow: "2px 2px 0 var(--green)",
              }}
            >
              {(data?.role_options || ALL_ROLES).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Overall progress indicator */}
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>
                Verified Role Readiness
              </span>
              {data && (
                <span
                  className="pill"
                  style={{
                    background:
                      data.confidence === "high"
                        ? "var(--green-light)"
                        : "var(--yellow-light)",
                    borderColor:
                      data.confidence === "high"
                        ? "var(--green)"
                        : "var(--yellow)",
                    color:
                      data.confidence === "high"
                        ? "var(--green)"
                        : "#b45309",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                  }}
                >
                  {data.confidence.toUpperCase()} CONFIDENCE
                </span>
              )}
            </div>
            <span
              style={{
                fontWeight: 900,
                fontSize: "1.1rem",
                color: "var(--green)",
                letterSpacing: "-0.02em",
              }}
            >
              {data?.overall_progress ?? 0}%
            </span>
          </div>

          <div
            className="progress-bar"
            style={{
              height: 14,
              border: "2px solid var(--text)",
              background: "var(--bg-soft)",
              boxShadow: "2px 2px 0 var(--text)",
            }}
          >
            <div
              className="progress-bar-fill"
              style={{
                width: `${data?.overall_progress ?? 0}%`,
                background: "linear-gradient(90deg, var(--green), #10b981)",
                transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.78rem",
              color: "var(--text-soft)",
              marginTop: 6,
              fontWeight: 700,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              {data?.milestones.filter(
                (m) => m.status === "STRONG" || m.status === "VERIFIED" || completedMap[m.id]
              ).length || 0}{" "}
              of {data?.milestones.length || 0} milestones verified
            </span>
            <span>{data?.confidence_note}</span>
          </div>
        </div>
      </div>

      {/* ── Context Notice ──────────────────────────────────────────────────── */}
      {!profileId && (
        <div
          className="card fade-in-up"
          style={{
            borderColor: "var(--yellow)",
            boxShadow: "3px 3px 0 var(--yellow)",
            background: "var(--yellow-light)",
            marginBottom: 24,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#b45309" }}>
              <Lightbulb size={24} />
            </span>
            <p
              style={{
                fontSize: "0.86rem",
                color: "var(--text)",
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Viewing standard roadmap guide for <strong>{selectedRole}</strong>. Run your
              submission in the <strong>Analyse</strong> tab to overlay your real GitHub code
              proofs!
            </p>
          </div>
          {onNavigateToAnalyse && (
            <button
              onClick={onNavigateToAnalyse}
              className="btn btn-primary"
              style={{
                fontSize: "0.82rem",
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Analyse Now <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── Loading / Error State ───────────────────────────────────────────── */}
      {loading && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "2.5px dashed var(--border)",
          }}
        >
          <div
            className="pulse-dot"
            style={{
              width: 20,
              height: 20,
              margin: "0 auto 16px",
              background: "var(--green)",
            }}
          />
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>
            Computing Evidence-Grounded Roadmap for {selectedRole}...
          </div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginTop: 4 }}>
            Interpreting repository commit history and skill gaps against roadmap.sh standards.
          </div>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            borderColor: "var(--pink)",
            boxShadow: "3px 3px 0 var(--pink)",
            background: "var(--pink-light)",
            padding: "20px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--pink)" }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 800 }}>{error}</span>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Next Recommended Priority Card ───────────────────────────────── */}
          {data.next_milestone && (
            <div
              className="card fade-in-up"
              style={{
                borderColor: "var(--blue)",
                boxShadow: "4px 4px 0 var(--blue)",
                background: "linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)",
                marginBottom: 24,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "var(--blue)",
                      color: "white",
                    }}
                  >
                    <Zap size={16} />
                  </span>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--blue)",
                    }}
                  >
                    Algorithmically Recommended Next Focus
                  </span>
                </div>
                {data.next_milestone.source_url && (
                  <a
                    href={data.next_milestone.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill"
                    style={{
                      background: "white",
                      borderColor: "var(--blue)",
                      color: "var(--blue)",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ExternalLink size={12} /> View roadmap.sh guide
                  </a>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 900,
                      fontSize: "1.2rem",
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    {data.next_milestone.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.88rem",
                      color: "var(--text-mid)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}
                  >
                    {data.next_milestone.why_recommended}
                  </p>
                </div>
              </div>

              {data.next_milestone.recommended_artifact && (
                <div
                  style={{
                    background: "white",
                    border: "1.5px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  <Code2 size={16} style={{ color: "var(--blue)", flexShrink: 0 }} />
                  <div>
                    <strong>Actionable Proof Artifact:</strong>{" "}
                    {data.next_milestone.recommended_artifact}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Official roadmap.sh Reference Banner ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-soft)",
              marginBottom: 24,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Compass size={20} style={{ color: "var(--blue)" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem" }}>
                    Official Reference: {data.roadmap.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 600 }}>
                    {data.roadmap.description}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={data.roadmap.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    background: "white",
                    borderColor: "var(--text)",
                    fontWeight: 800,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <ExternalLink size={13} /> Open roadmap.sh
                </a>
              </div>
            </div>

            {data.roadmap.supporting_roadmaps?.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px dashed var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "var(--text-soft)",
                    textTransform: "uppercase",
                  }}
                >
                  Supporting Guides:
                </span>
                {data.roadmap.supporting_roadmaps.map((sr) => (
                  <a
                    key={sr.name}
                    href={sr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill"
                    style={{
                      background: "white",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {sr.name} <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Filter Controls ──────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
              All Track Milestones ({filteredMilestones.length})
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  { id: "all", label: "All" },
                  { id: "gaps", label: "Gaps to Close" },
                  { id: "verified", label: "Verified / Done" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className="btn"
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.78rem",
                    background: statusFilter === f.id ? "var(--text)" : "var(--white)",
                    color: statusFilter === f.id ? "white" : "var(--text-mid)",
                    borderColor: "var(--text)",
                    fontWeight: 800,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Milestones List ──────────────────────────────────────────────── */}
          <div style={{ display: "grid", gap: 14 }}>
            {filteredMilestones.map((m, idx) => {
              const isExpanded = expandedId === m.id;
              const isManualDone = !!completedMap[m.id];
              const badge = getStatusBadge(m.status, isManualDone);
              const isRecommended = data.next_milestone?.id === m.id;

              return (
                <div
                  key={m.id}
                  className="card fade-in-up"
                  style={{
                    borderColor: isRecommended
                      ? "var(--blue)"
                      : isManualDone || m.status === "STRONG" || m.status === "VERIFIED"
                      ? "var(--green)"
                      : "var(--border)",
                    boxShadow: isRecommended
                      ? "4px 4px 0 var(--blue)"
                      : isManualDone || m.status === "STRONG" || m.status === "VERIFIED"
                      ? "3px 3px 0 var(--green)"
                      : "3px 3px 0 var(--border)",
                    background: "white",
                    padding: 0,
                    overflow: "hidden",
                    transition: "all 0.2s var(--ease)",
                  }}
                >
                  {/* Header Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      cursor: "pointer",
                      background: isExpanded ? "var(--bg-soft)" : "transparent",
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    {/* Index / Check bubble */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleManualComplete(m.id);
                      }}
                      title="Click to toggle completed status"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background:
                          isManualDone || m.status === "STRONG" || m.status === "VERIFIED"
                            ? "var(--green)"
                            : "var(--white)",
                        color:
                          isManualDone || m.status === "STRONG" || m.status === "VERIFIED"
                            ? "white"
                            : "var(--text)",
                        border: "2px solid var(--text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        flexShrink: 0,
                        boxShadow: "1px 1px 0 var(--text)",
                      }}
                    >
                      {isManualDone || m.status === "STRONG" || m.status === "VERIFIED" ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </button>

                    {/* Milestone title & tags */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: "1.02rem",
                            color: "var(--text)",
                          }}
                        >
                          {m.name}
                        </span>
                        {isRecommended && (
                          <span
                            className="pill"
                            style={{
                              background: "var(--blue-light)",
                              borderColor: "var(--blue)",
                              color: "var(--blue)",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                            }}
                          >
                            <Zap size={11} className="inline mr-1" /> Next Focus
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className="pill"
                          style={{
                            background: badge.bg,
                            borderColor: badge.border,
                            color: badge.color,
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {badge.icon} {badge.label} ({m.evidence_score}%)
                        </span>

                        {m.related_skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-soft)",
                              fontWeight: 700,
                              background: "var(--bg-soft)",
                              padding: "2px 6px",
                              borderRadius: 4,
                              border: "1px solid var(--border)",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expand icon */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                        color: "var(--text-mid)",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "16px 20px 22px",
                        borderTop: "2px dashed var(--border)",
                        background: "white",
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      {/* Reason / Explanation */}
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "0.78rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--text-soft)",
                            marginBottom: 4,
                          }}
                        >
                          Evidence Audit &amp; Assessment
                        </div>
                        <p
                          style={{
                            fontSize: "0.88rem",
                            color: "var(--text)",
                            fontWeight: 600,
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {m.reason}
                        </p>
                      </div>

                      {/* Why it matters */}
                      {m.why_it_matters && (
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--text-soft)",
                              marginBottom: 4,
                            }}
                          >
                            Industry Relevance
                          </div>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-mid)",
                              fontWeight: 600,
                              lineHeight: 1.5,
                              margin: 0,
                            }}
                          >
                            {m.why_it_matters}
                          </p>
                        </div>
                      )}

                      {/* Recommended artifact & Expected proof */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {m.recommended_artifact && (
                          <div
                            style={{
                              background: "var(--bg-soft)",
                              border: "1.5px solid var(--border)",
                              borderRadius: 8,
                              padding: "12px 14px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                color: "var(--blue)",
                                marginBottom: 4,
                              }}
                            >
                              <Target size={14} /> Recommended Artifact to Build
                            </div>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text)",
                                fontWeight: 600,
                                lineHeight: 1.5,
                              }}
                            >
                              {m.recommended_artifact}
                            </div>
                          </div>
                        )}

                        {m.expected_proof && (
                          <div
                            style={{
                              background: "var(--bg-soft)",
                              border: "1.5px solid var(--border)",
                              borderRadius: 8,
                              padding: "12px 14px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                color: "var(--green)",
                                marginBottom: 4,
                              }}
                            >
                              <FolderGit2 size={14} /> Expected Verification Proof
                            </div>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text)",
                                fontWeight: 600,
                                lineHeight: 1.5,
                              }}
                            >
                              {m.expected_proof}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Locators / Provenance if present */}
                      {m.locators && m.locators.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--green)",
                              marginBottom: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <ShieldCheck size={14} /> Detected Verification Provenance
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {m.locators.map((loc: any, li: number) => (
                              <div
                                key={li}
                                style={{
                                  background: "var(--green-light)",
                                  border: "1px solid var(--green)",
                                  borderRadius: 6,
                                  padding: "6px 10px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 6,
                                }}
                              >
                                <span>
                                  {loc.repo ? (
                                    <>
                                      <strong>{loc.repo}</strong>: <code>{loc.path}</code>
                                    </>
                                  ) : loc.file ? (
                                    <>
                                      <strong>{loc.file}</strong> ({loc.section || "document"})
                                    </>
                                  ) : (
                                    <span>{loc.label || "Verified trace"}</span>
                                  )}
                                </span>
                                {loc.commit_sha && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontFamily: "monospace",
                                      color: "var(--text-soft)",
                                    }}
                                  >
                                    SHA: {loc.commit_sha.slice(0, 7)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prerequisites and official links */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                          paddingTop: 10,
                          borderTop: "1px dashed var(--border)",
                        }}
                      >
                        {m.prerequisites && m.prerequisites.length > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontSize: "0.74rem",
                                fontWeight: 800,
                                color: "var(--text-soft)",
                              }}
                            >
                              Prerequisites:
                            </span>
                            {m.prerequisites.map((p) => (
                              <span
                                key={p}
                                className="badge"
                                style={{
                                  background: "var(--bg-soft)",
                                  color: "var(--text)",
                                  borderColor: "var(--border)",
                                  fontSize: "0.72rem",
                                }}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div />
                        )}

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => toggleManualComplete(m.id)}
                            className="btn"
                            style={{
                              padding: "5px 12px",
                              fontSize: "0.78rem",
                              background: isManualDone ? "var(--green)" : "var(--white)",
                              color: isManualDone ? "white" : "var(--text)",
                              borderColor: isManualDone ? "var(--green)" : "var(--border)",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Check size={13} /> {isManualDone ? "Completed" : "Mark Complete"}
                          </button>

                          {m.source_url && (
                            <a
                              href={m.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn"
                              style={{
                                padding: "5px 12px",
                                fontSize: "0.78rem",
                                background: "var(--blue-light)",
                                color: "var(--blue)",
                                borderColor: "var(--blue)",
                                fontWeight: 800,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <BookOpen size={13} /> Official Guide <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
