"use client";

import React from "react";
import type { ResumeContent } from "@/types/resume";
import { ShieldCheck, ExternalLink, Award, MapPin, Mail, Phone, Github, Linkedin } from "lucide-react";

interface TemplateProps {
  content: ResumeContent;
  onSkillClick?: (skill: string) => void;
  onProjectClick?: (project: string) => void;
}

export default function ModernTemplate({ content, onSkillClick, onProjectClick }: TemplateProps) {
  const { header, summary, categorized_skills, skills, projects, experience, education, certifications } = content;

  return (
    <div
      className="resume-sheet print:shadow-none"
      style={{
        background: "#FFFFFF",
        color: "#1E293B",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "36px 42px",
        minHeight: "100%",
        boxSizing: "border-box",
        lineHeight: 1.5,
        fontSize: "0.86rem",
      }}
    >
      {/* Top Accent Header Bar */}
      <div style={{ borderLeft: "4px solid #2563EB", paddingLeft: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#0F172A", margin: 0 }}>
          {header.full_name || "CareerLens Candidate"}
        </h1>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#2563EB", marginTop: 2, letterSpacing: "0.01em" }}>
          {header.target_title || "Software Engineer"}
        </div>
        
        {/* Contact info row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "6px 14px",
            fontSize: "0.78rem",
            color: "#64748B",
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {header.email && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Mail size={12} color="#64748B" /> {header.email}
            </span>
          )}
          {header.phone && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Phone size={12} color="#64748B" /> {header.phone}
            </span>
          )}
          {header.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} color="#64748B" /> {header.location}
            </span>
          )}
          {header.github && (
            <a href={header.github} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
              <Github size={12} /> GitHub
            </a>
          )}
          {header.linkedin && (
            <a href={header.linkedin} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
              <Linkedin size={12} /> LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Professional Summary
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>
          <p style={{ margin: 0, color: "#334155", fontSize: "0.82rem", lineHeight: 1.58 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Technical Skills */}
      {(categorized_skills || (skills && skills.length > 0)) && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Skills &amp; Technologies
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {categorized_skills ? (
              Object.entries(categorized_skills).map(([category, sList]) => (
                <div key={category} style={{ fontSize: "0.82rem", color: "#334155" }}>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>{category}: </span>
                  {sList.map((skill, i) => (
                    <span
                      key={skill.name}
                      onClick={() => onSkillClick?.(skill.name)}
                      style={{
                        cursor: onSkillClick ? "pointer" : "default",
                        color: skill.evidence_status === "VERIFIED" ? "#0F172A" : "#475569",
                      }}
                      title={`Status: ${skill.evidence_status} (${skill.confidence}% Confidence)`}
                    >
                      <span style={{ fontWeight: skill.evidence_status === "VERIFIED" ? 600 : 400 }}>
                        {skill.name}
                      </span>
                      {skill.evidence_status === "VERIFIED" && (
                        <span style={{ color: "#059669", fontSize: "0.72rem", marginLeft: 2, fontWeight: 700 }}>✓</span>
                      )}
                      {i < sList.length - 1 ? "  •  " : ""}
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                {skills.map((s, i) => (
                  <span key={s.name} onClick={() => onSkillClick?.(s.name)}>
                    {s.name} {i < skills.length - 1 ? "  •  " : ""}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Featured Projects
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects.map((proj) => (
              <div key={proj.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      onClick={() => onProjectClick?.(proj.name)}
                      style={{
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: "#0F172A",
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
                          gap: 3,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "#059669",
                          background: "#ECFDF5",
                          border: "1px solid #A7F3D0",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <ShieldCheck size={11} /> Verified Proof
                      </span>
                    )}
                  </div>
                  {proj.technologies && (
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748B" }}>
                      {proj.technologies.join(" · ")}
                    </span>
                  )}
                </div>

                {proj.bullets && proj.bullets.length > 0 && (
                  <ul style={{ margin: "3px 0 0 0", paddingLeft: 18, color: "#334155", fontSize: "0.81rem" }}>
                    {proj.bullets.map((bullet, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>
                        {bullet}
                      </li>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Professional Experience
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {experience.map((exp) => (
              <div key={exp.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" }}>{exp.role}</span>
                    <span style={{ color: "#475569", fontSize: "0.82rem" }}> — {exp.company}</span>
                  </div>
                  <span style={{ fontSize: "0.76rem", color: "#64748B", fontWeight: 500 }}>
                    {exp.start_date} – {exp.is_current ? "Present" : exp.end_date}
                  </span>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul style={{ margin: "3px 0 0 0", paddingLeft: 18, color: "#334155", fontSize: "0.81rem" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Education
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {education.map((edu) => (
              <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" }}>{edu.degree}</div>
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    {edu.institution} {edu.gpa ? `• GPA: ${edu.gpa}` : ""}
                  </div>
                  {edu.highlights && <div style={{ fontSize: "0.76rem", color: "#64748B", marginTop: 2 }}>{edu.highlights}</div>}
                </div>
                <span style={{ fontSize: "0.76rem", color: "#64748B", whiteSpace: "nowrap" }}>
                  {edu.start_date} – {edu.end_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications & Verifications */}
      {certifications && certifications.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", margin: 0 }}>
              Verified Credentials
            </h2>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.81rem" }}>
                <span style={{ color: "#334155" }}>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>{cert.name}</span> — {cert.issuer}
                </span>
                <span style={{ color: "#64748B", fontSize: "0.76rem" }}>{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
