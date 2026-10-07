"use client";

import React, { useState } from "react";
import { Target, X, Sparkles, FileText, Check } from "lucide-react";

interface CustomJDModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
  currentJDText?: string | null;
  onApplyRoleAndJD: (role: string, customJD: string) => void;
}

const PRESET_ROLES = [
  "Software Engineer",
  "AI Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Data Analyst",
  "UI/UX Designer",
];

export default function CustomJDModal({
  isOpen,
  onClose,
  currentRole,
  currentJDText,
  onApplyRoleAndJD,
}: CustomJDModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>(currentRole || "Software Engineer");
  const [jdText, setJdText] = useState<string>(currentJDText || "");

  if (!isOpen) return null;

  function handleSubmit() {
    onApplyRoleAndJD(selectedRole, jdText.trim());
    onClose();
  }

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
          maxWidth: 580,
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
            <Target size={18} color="var(--blue)" />
            <h3 style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", margin: 0 }}>
              Target Role &amp; Custom Job Description
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Preset Roles Picker */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              1. Select Target Role
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_ROLES.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className="btn"
                    style={{
                      fontSize: "0.78rem",
                      padding: "6px 12px",
                      background: isSelected ? "var(--blue)" : "var(--white)",
                      color: isSelected ? "white" : "var(--text)",
                      borderColor: isSelected ? "var(--text)" : "var(--border)",
                      boxShadow: isSelected ? "2px 2px 0 var(--text)" : "none",
                      fontWeight: 800,
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom JD Paste Area */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
                2. Paste Specific Job Description (Optional)
              </label>
              <span style={{ fontSize: "0.70rem", color: "var(--text-soft)", fontWeight: 700 }}>
                Extracts keywords &amp; calculates real match
              </span>
            </div>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job requirements, responsibilities, or LinkedIn / Indeed posting text here to optimize this resume directly against that JD..."
              rows={6}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                fontFamily: "var(--font)",
                fontSize: "0.82rem",
                color: "var(--text)",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px",
            background: "var(--bg-soft)",
            borderTop: "1.5px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: "0.82rem" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            style={{ fontSize: "0.82rem", padding: "6px 18px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Check size={16} /> Apply &amp; Optimize
          </button>
        </div>
      </div>
    </div>
  );
}
