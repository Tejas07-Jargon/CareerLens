"use client";

import React from "react";
import type { ResumeContent } from "@/types/resume";
import { ShieldCheck, GitBranch, Code2, Database } from "lucide-react";

interface TemplateProps {
  content: ResumeContent;
  onSkillClick?: (skill: string) => void;
  onProjectClick?: (project: string) => void;
}

export default function TechnicalTemplate({ content, onSkillClick, onProjectClick }: TemplateProps) {
  const { header, summary, categorized_skills, skills, projects, experience, education, certifications } = content;

  return (
    <div
      className="resume-sheet print:shadow-none"
      style={{
        background: "#FFFFFF",
        color: "#0F172A",
        fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace",
        padding: "36px 40px",
        minHeight: "100%",
        boxSizing: "border-box",
        lineHeight: 1.45,
        fontSize: "0.82rem",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: "2px solid #0F172A", paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
              {header.full_name || "ENGINEER_NAME"}
            </h1>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0D9488", marginTop: 2 }}>
              &gt; {header.target_title || "Software / AI Engineer"}
            </div>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#475569", textAlign: "right" }}>
            {header.email && <div>{header.email}</div>}
            {header.github && <div>{header.github.replace("https://", "")}</div>}
            {header.location && <div>{header.location}</div>}
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0F172A", marginBottom: 4, textTransform: "uppercase" }}>
            // 01. EXECUTIVE OVERVIEW
          </div>
          <p style={{ margin: 0, color: "#334155", fontSize: "0.80rem", lineHeight: 1.5 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Technical Stack Matrix */}
      {(categorized_skills || (skills && skills.length > 0)) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0F172A", marginBottom: 6, textTransform: "uppercase" }}>
            // 02. VERIFIED STACK &amp; DOMAINS
          </div>
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "4px",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {categorized_skills ? (
              Object.entries(categorized_skills).map(([category, sList]) => (
                <div key={category} style={{ fontSize: "0.78rem" }}>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>[{category}] </span>
                  {sList.map((skill, i) => (
                    <span
                      key={skill.name}
                      onClick={() => onSkillClick?.(skill.name)}
                      style={{
                        cursor: onSkillClick ? "pointer" : "default",
                        color: skill.evidence_status === "VERIFIED" ? "#047857" : "#334155",
                        fontWeight: skill.evidence_status === "VERIFIED" ? 700 : 500,
                      }}
                    >
                      {skill.name}{skill.evidence_status === "VERIFIED" ? "*" : ""}
                      {i < sList.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.78rem", color: "#334155" }}>
                {skills.map((s, i) => (
                  <span key={s.name} onClick={() => onSkillClick?.(s.name)}>
                    {s.name} {i < skills.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: "0.68rem", color: "#047857", marginTop: 2, fontStyle: "italic" }}>
              * Denotes CareerLens AST / Git-history verified proficiency
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0F172A", marginBottom: 6, textTransform: "uppercase" }}>
            // 03. ENGINEERING ARTIFACTS &amp; REPOSITORIES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map((proj) => (
              <div key={proj.id} style={{ borderLeft: "2px solid #CBD5E1", paddingLeft: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      onClick={() => onProjectClick?.(proj.name)}
                      style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0F172A", cursor: onProjectClick ? "pointer" : "default" }}
                    >
                      {proj.name}
                    </span>
                    {proj.evidence_status === "VERIFIED" && (
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669" }}>
                        [VERIFIED]
                      </span>
                    )}
                  </div>
                  {proj.technologies && (
                    <span style={{ fontSize: "0.74rem", color: "#0D9488" }}>
                      &lt;{proj.technologies.join(" | ")}&gt;
                    </span>
                  )}
                </div>
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 16, color: "#334155", fontSize: "0.78rem" }}>
                    {proj.bullets.map((b, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0F172A", marginBottom: 6, textTransform: "uppercase" }}>
            // 04. EXPERIENCE &amp; OSS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {experience.map((exp) => (
              <div key={exp.id} style={{ borderLeft: "2px solid #CBD5E1", paddingLeft: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.80rem" }}>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>{exp.role} @ {exp.company}</span>
                  <span style={{ color: "#64748B", fontSize: "0.74rem" }}>
                    {exp.start_date} – {exp.is_current ? "Present" : exp.end_date}
                  </span>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul style={{ margin: "3px 0 0 0", paddingLeft: 16, color: "#334155", fontSize: "0.78rem" }}>
                    {exp.bullets.map((b, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0F172A", marginBottom: 4, textTransform: "uppercase" }}>
            // 05. ACADEMIC CREDENTIALS
          </div>
          {education.map((edu) => (
            <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#334155" }}>
              <span>
                <strong style={{ color: "#0F172A" }}>{edu.degree}</strong> — {edu.institution} {edu.gpa ? `(GPA: ${edu.gpa})` : ""}
              </span>
              <span style={{ color: "#64748B" }}>{edu.start_date} - {edu.end_date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
