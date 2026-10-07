"use client";

import type { SecurityFlag } from "@/types";
import { ShieldAlert, Lock } from "lucide-react";

const FLAG_LABELS: Record<string, string> = {
  hidden_text_white: "Hidden white-text detected in resume (Adversarial Defense)",
  hidden_text_tiny:  "Microscopic text detected in resume (Adversarial Defense)",
  prompt_injection:  "Prompt injection attempt detected and neutralised",
};

export default function SecurityFlagBanner({ flags }: { flags: SecurityFlag[] }) {
  if (!flags?.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {flags.map((flag, i) => (
        <div key={i} className="flag-banner">
          <span style={{ fontSize: "1.3rem", flexShrink: 0, display: "flex", alignItems: "center" }}><ShieldAlert size={24} /></span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", marginBottom: 3, color: "#C0184A" }}>
              {FLAG_LABELS[flag.type] ?? flag.type}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#9E143C", fontWeight: 600 }}>
              {flag.detail}
              {flag.snippet ? ` — snippet: "${flag.snippet}"` : ""}
            </div>
            <div style={{ marginTop: 4, fontSize: "0.76rem", color: "#B82E56", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={14} /> This unevidenced text was rejected from mathematical scoring.
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

