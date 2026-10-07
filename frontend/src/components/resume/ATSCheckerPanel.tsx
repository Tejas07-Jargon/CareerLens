"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, FileSearch, ShieldCheck } from "lucide-react";
import type { ATSValidationResult } from "@/types/resume";

interface ATSCheckerPanelProps {
  validation?: ATSValidationResult;
}

export default function ATSCheckerPanel({ validation }: ATSCheckerPanelProps) {
  if (!validation) return null;

  const { passed_cleanly, overall_status_message, checks, warnings, score } = validation;

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--green)",
        boxShadow: "3px 3px 0 var(--green)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            PARSER COMPATIBILITY
          </span>
          <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <FileSearch size={16} color="var(--green)" /> ATS Heuristics Checker
          </h3>
        </div>

        <span
          className="badge"
          style={{
            background: passed_cleanly ? "var(--green-light)" : "var(--yellow-light)",
            color: passed_cleanly ? "var(--green)" : "var(--orange)",
            borderColor: passed_cleanly ? "var(--green)" : "var(--yellow)",
            fontWeight: 800,
          }}
        >
          {score}% Passed
        </span>
      </div>

      <div
        style={{
          background: "var(--bg-soft)",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1.5px solid var(--border)",
          fontSize: "0.78rem",
          color: "var(--text)",
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        {overall_status_message}
      </div>

      {/* Checks list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: "0.78rem",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
            }}
          >
            <CheckCircle2 size={15} color="var(--green)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: "var(--text)" }}>{item.title}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)" }}>{item.detail}</div>
            </div>
          </div>
        ))}

        {warnings.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: "0.78rem",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "#FEFCE8",
              border: "1px solid #FEF08A",
            }}
          >
            <AlertTriangle size={15} color="var(--yellow)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: "var(--text)" }}>{item.title}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)" }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
