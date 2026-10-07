"use client";

import { CheckCircle2, Clock, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface Props {
  status: string;
  incomplete?: boolean;
}

export default function OwnershipStatusBadge({ status, incomplete }: Props) {
  const s = status.toLowerCase();

  if (s === "complete" && !incomplete) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          background: "var(--green-light)",
          color: "var(--green)",
          borderRadius: "6px",
          fontSize: "0.74rem",
          fontWeight: 800,
          border: "1.5px solid var(--green)",
        }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} /> Complete
      </span>
    );
  }

  if (s === "incomplete" || (s === "complete" && incomplete)) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          background: "var(--yellow-light)",
          color: "#B45309",
          borderRadius: "6px",
          fontSize: "0.74rem",
          fontWeight: 800,
          border: "1.5px solid var(--yellow)",
        }}
      >
        <AlertTriangle size={12} strokeWidth={2.5} /> Incomplete
      </span>
    );
  }

  if (s === "partial") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          background: "var(--blue-light)",
          color: "var(--blue)",
          borderRadius: "6px",
          fontSize: "0.74rem",
          fontWeight: 800,
          border: "1.5px solid var(--blue)",
        }}
      >
        <Clock size={12} strokeWidth={2.5} /> Partial
      </span>
    );
  }

  if (s === "analysing" || s === "queued" || s === "discovered") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          background: "var(--purple-light)",
          color: "var(--purple)",
          borderRadius: "6px",
          fontSize: "0.74rem",
          fontWeight: 800,
          border: "1.5px solid var(--purple)",
        }}
      >
        <Clock size={12} strokeWidth={2.5} /> {s.toUpperCase()}
      </span>
    );
  }

  if (s === "failed") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          background: "var(--pink-light)",
          color: "var(--pink)",
          borderRadius: "6px",
          fontSize: "0.74rem",
          fontWeight: 800,
          border: "1.5px solid var(--pink)",
        }}
      >
        <XCircle size={12} strokeWidth={2.5} /> Failed
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: "var(--bg-soft)",
        color: "var(--text-soft)",
        borderRadius: "6px",
        fontSize: "0.74rem",
        fontWeight: 800,
        border: "1.5px solid var(--border)",
      }}
    >
      <HelpCircle size={12} strokeWidth={2.5} /> Not Analysed
    </span>
  );
}
