"use client";

import React from "react";
import type { ResumeContent } from "@/types/resume";
import { CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";

interface TemplateProps {
  content: ResumeContent;
  onSkillClick?: (skill: string) => void;
  onProjectClick?: (project: string) => void;
}

export default function MinimalTemplate({ content, onSkillClick, onProjectClick }: TemplateProps) {
  const { header, summary, categorized_skills, skills, projects, experience, education, certifications } = content;

  return (
    <div
      className="resume-sheet print:shadow-none"
      style={{
        background: "#FFFFFF",
        color: "#111827",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "36px 44px",
        minHeight: "100%",
        boxSizing: "border-box",
        lineHeight: 1.5,
        fontSize: "0.86rem",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "1.5px solid #E5E7EB", paddingBottom: 16 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827", margin: 0 }}>
          {header.full_name || "Full Name"}
        </h1>
        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#4B5563", marginTop: 4 }}>
          {header.target_title || "Software Engineer"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px 14px",
            fontSize: "0.78rem",
            color: "#6B7280",
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {header.email && <span>{header.email}</span>}
          {header.phone && <span>• {header.phone}</span>}
          {header.location && <span>• {header.location}</span>}
          {header.github && (
            <a href={header.github} target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>
              • GitHub
            </a>
          )}
          {header.linkedin && (
            <a href={header.linkedin} target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>
              • LinkedIn
            </a>
          )}
          {header.portfolio && (
            <a href={header.portfolio} target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>
              • Portfolio
            </a>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {summary && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 6,
            }}
          >
            Professional Summary
          </h2>
          <p style={{ margin: 0, color: "#374151", fontSize: "0.82rem", lineHeight: 1.55 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Skills */}
      {(categorized_skills || (skills && skills.length > 0)) && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 6,
            }}
          >
            Technical Skills
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {categorized_skills ? (
              Object.entries(categorized_skills).map(([cat, sList]) => (
                <div key={cat} style={{ fontSize: "0.82rem", color: "#374151" }}>
                  <span style={{ fontWeight: 700, color: "#111827" }}>{cat}: </span>
                  {sList.map((s, idx) => (
                    <span
                      key={s.name}
                      onClick={() => onSkillClick?.(s.name)}
                      style={{
                        cursor: onSkillClick ? "pointer" : "default",
                        textDecoration: onSkillClick ? "underline dotted #9CA3AF" : "none",
                      }}
                      title={`Status: ${s.evidence_status} (${s.confidence}% Confidence)`}
                    >
                      {s.name}
                      {s.evidence_status === "VERIFIED" && " ✓"}
                      {idx < sList.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.82rem", color: "#374151" }}>
                {skills.map((s, idx) => (
                  <span key={s.name} onClick={() => onSkillClick?.(s.name)}>
                    {s.name}
                    {idx < skills.length - 1 ? " • " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 8,
            }}
          >
            Key Projects
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects.map((proj) => (
              <div key={proj.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      onClick={() => onProjectClick?.(proj.name)}
                      style={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#111827",
                        cursor: onProjectClick ? "pointer" : "default",
                      }}
                    >
                      {proj.name}
                    </span>
                    {proj.evidence_status === "VERIFIED" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "#059669",
                          background: "#ECFDF5",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        <ShieldCheck size={11} /> Proven
                      </span>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <span style={{ fontSize: "0.76rem", color: "#6B7280", fontStyle: "italic" }}>
                      {proj.technologies.join(", ")}
                    </span>
                  )}
                </div>
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, color: "#374151", fontSize: "0.81rem" }}>
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
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 8,
            }}
          >
            Experience
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {experience.map((exp) => (
              <div key={exp.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>{exp.role}</span>
                    <span style={{ color: "#4B5563", fontSize: "0.82rem" }}> — {exp.company}</span>
                  </div>
                  <span style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                    {exp.start_date} – {exp.is_current ? "Present" : exp.end_date}
                  </span>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, color: "#374151", fontSize: "0.81rem" }}>
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
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 8,
            }}
          >
            Education
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {education.map((edu) => (
              <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#111827" }}>{edu.degree}</div>
                  <div style={{ fontSize: "0.8rem", color: "#4B5563" }}>{edu.institution} {edu.gpa ? `• GPA: ${edu.gpa}` : ""}</div>
                  {edu.highlights && <div style={{ fontSize: "0.76rem", color: "#6B7280", marginTop: 2 }}>{edu.highlights}</div>}
                </div>
                <span style={{ fontSize: "0.76rem", color: "#6B7280", whiteSpace: "nowrap" }}>
                  {edu.start_date} – {edu.end_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications / Proof-of-Work Verifications */}
      {certifications && certifications.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: "0.88rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#111827",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 3,
              marginBottom: 6,
            }}
          >
            Verifications &amp; Credentials
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.81rem" }}>
                <span style={{ color: "#374151" }}>
                  <span style={{ fontWeight: 700, color: "#111827" }}>{cert.name}</span> — {cert.issuer}
                </span>
                <span style={{ color: "#6B7280", fontSize: "0.76rem" }}>{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
