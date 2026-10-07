"use client";

import React from "react";
import type { ResumeContent } from "@/types/resume";
import { ShieldCheck, BookOpen, GraduationCap } from "lucide-react";

interface TemplateProps {
  content: ResumeContent;
  onSkillClick?: (skill: string) => void;
  onProjectClick?: (project: string) => void;
}

export default function AcademicTemplate({ content, onSkillClick, onProjectClick }: TemplateProps) {
  const { header, summary, categorized_skills, skills, projects, experience, education, certifications } = content;

  return (
    <div
      className="resume-sheet print:shadow-none"
      style={{
        background: "#FFFFFF",
        color: "#18181B",
        fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
        padding: "38px 46px",
        minHeight: "100%",
        boxSizing: "border-box",
        lineHeight: 1.55,
        fontSize: "0.88rem",
      }}
    >
      {/* Centered Academic Header */}
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #581C87", paddingBottom: 14 }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, letterSpacing: "-0.01em", color: "#581C87", margin: 0 }}>
          {header.full_name || "Academic Candidate"}
        </h1>
        <div style={{ fontSize: "0.95rem", fontStyle: "italic", color: "#4B5563", marginTop: 3 }}>
          {header.target_title || "Computer Science Scholar & Engineer"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "8px 16px",
            fontSize: "0.80rem",
            color: "#4B5563",
            marginTop: 6,
            fontFamily: "sans-serif",
          }}
        >
          {header.email && <span>{header.email}</span>}
          {header.phone && <span>{header.phone}</span>}
          {header.location && <span>{header.location}</span>}
          {header.github && <span>github.com/{header.github.split("/").pop()}</span>}
        </div>
      </div>

      {/* Education First for Academic Template */}
      {education && education.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#581C87",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 2,
              marginBottom: 8,
            }}
          >
            Education &amp; Academic Background
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {education.map((edu) => (
              <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#18181B" }}>{edu.degree}</div>
                  <div style={{ fontSize: "0.84rem", color: "#374151" }}>
                    {edu.institution} {edu.gpa ? `• Cumulative GPA: ${edu.gpa}` : ""}
                  </div>
                  {edu.highlights && (
                    <div style={{ fontSize: "0.80rem", color: "#4B5563", fontStyle: "italic", marginTop: 2 }}>
                      {edu.highlights}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "0.80rem", color: "#6B7280", fontFamily: "sans-serif" }}>
                  {edu.start_date} – {edu.end_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research & Summary */}
      {summary && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#581C87",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 2,
              marginBottom: 6,
            }}
          >
            Research Interests &amp; Summary
          </h2>
          <p style={{ margin: 0, color: "#27272A", fontSize: "0.84rem", lineHeight: 1.6 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Technical Skills & Methodologies */}
      {(categorized_skills || (skills && skills.length > 0)) && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#581C87",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 2,
              marginBottom: 6,
            }}
          >
            Technical Competencies &amp; Tools
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {categorized_skills ? (
              Object.entries(categorized_skills).map(([category, sList]) => (
                <div key={category} style={{ fontSize: "0.84rem", color: "#27272A" }}>
                  <span style={{ fontWeight: 700, color: "#18181B" }}>{category}: </span>
                  {sList.map((skill, i) => (
                    <span
                      key={skill.name}
                      onClick={() => onSkillClick?.(skill.name)}
                      style={{ cursor: onSkillClick ? "pointer" : "default" }}
                    >
                      {skill.name}
                      {skill.evidence_status === "VERIFIED" ? " *" : ""}
                      {i < sList.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.84rem", color: "#27272A" }}>
                {skills.map((s, i) => (
                  <span key={s.name} onClick={() => onSkillClick?.(s.name)}>
                    {s.name} {i < skills.length - 1 ? " • " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects & Implementations */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#581C87",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 2,
              marginBottom: 8,
            }}
          >
            Research &amp; Engineering Projects
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map((proj) => (
              <div key={proj.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#18181B" }}>
                    <span
                      onClick={() => onProjectClick?.(proj.name)}
                      style={{ cursor: onProjectClick ? "pointer" : "default" }}
                    >
                      {proj.name}
                    </span>
                    {proj.evidence_status === "VERIFIED" && (
                      <span style={{ fontSize: "0.74rem", color: "#059669", marginLeft: 6, fontStyle: "italic", fontFamily: "sans-serif" }}>
                        [Verified Artifact]
                      </span>
                    )}
                  </div>
                  {proj.technologies && (
                    <span style={{ fontSize: "0.78rem", color: "#6B7280", fontStyle: "italic" }}>
                      {proj.technologies.join(", ")}
                    </span>
                  )}
                </div>
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, color: "#27272A", fontSize: "0.82rem" }}>
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

      {/* Certifications & Formal Verifications */}
      {certifications && certifications.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#581C87",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: 2,
              marginBottom: 6,
            }}
          >
            Honors &amp; Verifications
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span>
                  <strong>{cert.name}</strong> — {cert.issuer}
                </span>
                <span style={{ color: "#6B7280", fontFamily: "sans-serif", fontSize: "0.76rem" }}>{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
