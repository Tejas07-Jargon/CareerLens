"use client";

import type { SecurityFlag } from "@/types";

const FLAG_LABELS: Record<string, string> = {
  hidden_text_white: "Hidden white text detected in resume",
  hidden_text_tiny:  "Tiny font text detected in resume",
  prompt_injection:  "Prompt injection attempt detected and neutralised",
};

export default function SecurityFlagBanner({ flags }: { flags: SecurityFlag[] }) {
  if (!flags?.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {flags.map((flag, i) => (
        <div key={i} className="flag-banner">
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>🛡</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {FLAG_LABELS[flag.type] ?? flag.type}
            </div>
            <div style={{ color: "#fca5a5", opacity: 0.8, fontSize: "0.8rem" }}>
              {flag.detail}
              {flag.snippet ? ` — snippet: "${flag.snippet}"` : ""}
            </div>
            <div style={{ marginTop: 4, fontSize: "0.75rem", color: "rgba(252,165,165,0.6)" }}>
              This content was excluded from scoring. The score is based on verified evidence only.
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
