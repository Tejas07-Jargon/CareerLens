"use client";

import React from "react";
import { Sparkles, Check, X, ShieldCheck, ArrowRight } from "lucide-react";
import type { AISuggestion } from "@/types/resume";

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApply: (newText: string) => void;
  onDismiss: () => void;
}

export default function AISuggestionCard({ suggestion, onApply, onDismiss }: AISuggestionCardProps) {
  return (
    <div
      className="card fade-in-up"
      style={{
        background: "var(--white)",
        borderColor: "var(--purple)",
        boxShadow: "3px 3px 0 var(--purple)",
        padding: "16px 18px",
        marginTop: 10,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={16} color="var(--purple)" />
          <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--text)" }}>
            CareerLens Evidence Suggestion
          </span>
        </div>
        <span
          className="badge"
          style={{
            background: "var(--purple-light)",
            color: "var(--purple)",
            borderColor: "var(--purple)",
            fontSize: "0.70rem",
          }}
        >
          User Review Required
        </span>
      </div>

      {/* Suggestion Text */}
      <div
        style={{
          background: "var(--bg-soft)",
          padding: "12px 14px",
          borderRadius: "8px",
          border: "1.5px solid var(--border)",
          fontSize: "0.84rem",
          color: "var(--text)",
          lineHeight: 1.55,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)", marginBottom: 4, textTransform: "uppercase" }}>
          SUGGESTED REFINEMENT
        </div>
        <div>{suggestion.suggestion}</div>
      </div>

      {/* Reason and Evidence Tags */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: 6 }}>
          <strong>Why:</strong> {suggestion.reason}
        </div>

        {suggestion.evidence_tags && suggestion.evidence_tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {suggestion.evidence_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "0.70rem",
                  fontWeight: 700,
                  color: "var(--green)",
                  background: "var(--green-light)",
                  border: "1px solid var(--green)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <ShieldCheck size={11} /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onDismiss}
          className="btn btn-ghost"
          style={{ fontSize: "0.78rem", padding: "5px 12px", fontWeight: 700 }}
        >
          Keep Current
        </button>
        <button
          onClick={() => onApply(suggestion.suggestion)}
          className="btn"
          style={{
            fontSize: "0.78rem",
            padding: "5px 14px",
            background: "var(--purple)",
            color: "white",
            borderColor: "var(--text)",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Check size={14} /> Use Suggestion
        </button>
      </div>
    </div>
  );
}
