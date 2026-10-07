"use client";

import React, { useState } from "react";
import { History, X, Copy, Trash2, ArrowRight, GitCompare, Check } from "lucide-react";
import type { ResumeVersionData } from "@/types/resume";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ResumeVersionData[];
  currentVersionId: string;
  onSelectVersion: (id: string) => void;
  onDuplicateVersion: (id: string) => void;
  onCompareVersions?: (idA: string, idB: string) => void;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  currentVersionId,
  onSelectVersion,
  onDuplicateVersion,
  onCompareVersions,
}: VersionHistoryModalProps) {
  const [compareA, setCompareA] = useState<string>(currentVersionId);
  const [compareB, setCompareB] = useState<string>("");
  const [compareResult, setCompareResult] = useState<any>(null);

  if (!isOpen) return null;

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
          maxWidth: 620,
          width: "100%",
          background: "var(--white)",
          borderColor: "var(--text)",
          boxShadow: "6px 6px 0 var(--text)",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={18} color="var(--purple)" />
            <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0 }}>
              Resume Version History
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {versions.map((ver) => {
              const isCurrent = ver.id === currentVersionId;
              return (
                <div
                  key={ver.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `2px solid ${isCurrent ? "var(--purple)" : "var(--border)"}`,
                    background: isCurrent ? "var(--purple-light)" : "var(--white)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "var(--text)" }}>
                        {ver.title || `Resume v${ver.version_num}`}
                      </span>
                      {isCurrent && (
                        <span className="badge" style={{ background: "var(--purple)", color: "white", borderColor: "var(--text)", fontSize: "0.65rem" }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginTop: 2 }}>
                      Quality: {Math.round(ver.quality_score)} · JD Match: {Math.round(ver.jd_alignment_pct)}% · Evidence: {Math.round(ver.evidence_coverage_pct)}%
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSelectVersion(ver.id);
                          onClose();
                        }}
                        className="btn"
                        style={{ fontSize: "0.74rem", padding: "4px 10px", background: "var(--white)" }}
                      >
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => onDuplicateVersion(ver.id)}
                      className="btn btn-ghost"
                      style={{ padding: "5px 8px" }}
                      title="Duplicate version"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Version Comparison Section */}
          <div style={{ borderTop: "1.5px dashed var(--border)", paddingTop: 14 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <GitCompare size={14} color="var(--purple)" /> Compare Two Versions
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "0.78rem" }}
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>{v.title || `v${v.version_num}`}</option>
                ))}
              </select>

              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-soft)" }}>vs</span>

              <select
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "0.78rem" }}
              >
                <option value="">Select version...</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>{v.title || `v${v.version_num}`}</option>
                ))}
              </select>

              <button
                disabled={!compareA || !compareB}
                onClick={() => {
                  if (onCompareVersions && compareA && compareB) {
                    onCompareVersions(compareA, compareB);
                  }
                }}
                className="btn btn-purple"
                style={{ fontSize: "0.78rem", padding: "6px 12px", whiteSpace: "nowrap" }}
              >
                Compare →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
