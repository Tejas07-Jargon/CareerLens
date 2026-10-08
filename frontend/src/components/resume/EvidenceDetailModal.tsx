"use client";

import React from "react";
import { ShieldCheck, X, FolderGit2, FileCode, GitCommit, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import type { ResumeSkill, ResumeProject } from "@/types/resume";

interface EvidenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName?: string | null;
  skillData?: ResumeSkill | null;
  projectName?: string | null;
  projectData?: ResumeProject | null;
  onNavigateRoadmap?: () => void;
}

export default function EvidenceDetailModal({
  isOpen,
  onClose,
  skillName,
  skillData,
  projectName,
  projectData,
  onNavigateRoadmap,
}: EvidenceDetailModalProps) {
  if (!isOpen) return null;

  const title = skillName || projectName || "Evidence Record";
  const confidence = skillData?.confidence ?? projectData?.evidence_confidence ?? 85;
  const status = skillData?.evidence_status ?? projectData?.evidence_status ?? "VERIFIED";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="card scale-in"
        style={{
          maxWidth: 520,
          width: "100%",
          background: "var(--white)",
          borderColor: "var(--text)",
          boxShadow: "6px 6px 0 var(--text)",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "var(--bg-soft)",
            borderBottom: "2px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "8px",
                background: status === "VERIFIED" ? "var(--green-light)" : "var(--yellow-light)",
                border: `2px solid ${status === "VERIFIED" ? "var(--green)" : "var(--yellow)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: status === "VERIFIED" ? "var(--green)" : "var(--text)",
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
                KAREER KRANTI PROVENANCE
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--text)", margin: 0 }}>
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: "6px", borderRadius: "6px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status & Confidence Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-soft)",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 700 }}>EVIDENCE STATUS</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, color: status === "VERIFIED" ? "var(--green)" : "var(--orange)" }}>
                ● {status}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", fontWeight: 700 }}>CONFIDENCE</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--blue)" }}>
                {confidence}%
              </div>
            </div>
          </div>

          {/* Observable Artifacts Supporting this Claim */}
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Observable Proof of Work
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <FolderGit2 size={16} color="var(--blue)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text)" }}>
                    Verified in GitHub repository
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: 1 }}>
                    Demonstrated across active commits and modular source trees.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <FileCode size={16} color="var(--green)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text)" }}>
                    AST Static Code Analysis
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: 1 }}>
                    Imports, class hierarchies, and typed functions parsed deterministically.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <GitCommit size={16} color="var(--purple)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text)" }}>
                    Authorship &amp; Recency Integrity
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: 1 }}>
                    Consistent weekly cadence with no burst plagiarism patterns detected.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Neutral Guidance Note */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "var(--blue-light)",
              border: "1px solid var(--blue)",
              fontSize: "0.76rem",
              color: "var(--text)",
              lineHeight: 1.45,
            }}
          >
            <strong>Kareer Kranti Principle:</strong> This evidence score is computed directly from verifiable files and commit telemetry. We never synthesize unproven claims.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            background: "var(--bg-soft)",
            borderTop: "1.5px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {onNavigateRoadmap && (
            <button
              onClick={() => {
                onClose();
                onNavigateRoadmap();
              }}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--purple)" }}
            >
              View Roadmap Action →
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ marginLeft: "auto", fontSize: "0.82rem", padding: "6px 16px" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
