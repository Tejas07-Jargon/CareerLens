"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";

interface Props {
  unknownRatio?: number;
  hasIncomplete?: boolean;
}

export default function IncompleteAttributionBanner({ unknownRatio = 0, hasIncomplete = false }: Props) {
  if (!hasIncomplete && unknownRatio <= 0.3) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 18px",
        background: "var(--yellow-light)",
        border: "2px solid var(--yellow)",
        borderRadius: "12px",
        marginBottom: 20,
        boxShadow: "2px 2px 0 var(--text)",
      }}
    >
      <AlertTriangle size={20} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 900, fontSize: "0.88rem", color: "#92400E", marginBottom: 3 }}>
          Attribution Notice: Unresolved Commit Identities Detected
        </div>
        <div style={{ fontSize: "0.82rem", color: "#78350F", lineHeight: 1.45 }}>
          Ownership analysis is partial or incomplete because some commit identities could not be matched with high confidence.
          Code without definitive matching is conservatively marked as unattributed rather than assumed.
        </div>
        <div style={{ fontSize: "0.76rem", color: "#92400E", marginTop: 6, fontWeight: 700 }}>
          ℹ️ Note: Commit-email declaration requires GitHub account binding.
        </div>
      </div>
    </div>
  );
}
