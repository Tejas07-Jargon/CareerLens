"use client";

import React from "react";
import { AlertTriangle, Info, ShieldAlert, ArrowRight } from "lucide-react";
import type { EvidenceAlert } from "@/types/resume";

interface EvidenceAlertBannerProps {
  alerts: EvidenceAlert[];
  onDismissAlert?: (skill: string) => void;
  onNavigateRoadmap?: () => void;
}

export default function EvidenceAlertBanner({
  alerts,
  onDismissAlert,
  onNavigateRoadmap,
}: EvidenceAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {alerts.map((alert) => (
        <div
          key={alert.skill}
          className="fade-in-up"
          style={{
            background: alert.severity === "WARN" ? "var(--yellow-light)" : "var(--blue-light)",
            border: `2px solid ${alert.severity === "WARN" ? "var(--yellow)" : "var(--blue)"}`,
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {alert.severity === "WARN" ? (
                <ShieldAlert size={18} color="var(--orange)" />
              ) : (
                <Info size={18} color="var(--blue)" />
              )}
              <span style={{ fontWeight: 900, fontSize: "0.86rem", color: "var(--text)" }}>
                {alert.title}
              </span>
            </div>
            <span
              className="badge"
              style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                background: "var(--white)",
                borderColor: "var(--text)",
              }}
            >
              Evidence Check
            </span>
          </div>

          <div style={{ fontSize: "0.80rem", color: "var(--text)", lineHeight: 1.45 }}>
            {alert.message}
          </div>

          <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", fontStyle: "italic" }}>
            <strong>Observed:</strong> {alert.observed}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4, flexWrap: "wrap" }}>
            {onNavigateRoadmap && (
              <button
                onClick={onNavigateRoadmap}
                className="btn btn-ghost"
                style={{ fontSize: "0.74rem", padding: "3px 8px", fontWeight: 800, color: "var(--purple)" }}
              >
                Explore Roadmap to Prove {alert.skill} →
              </button>
            )}
            {onDismissAlert && (
              <button
                onClick={() => onDismissAlert(alert.skill)}
                className="btn"
                style={{ fontSize: "0.74rem", padding: "3px 10px", background: "var(--white)", borderColor: "var(--border)" }}
              >
                Keep Anyway
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
