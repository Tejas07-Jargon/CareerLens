"use client";

import { useState } from "react";
import { GraduationCap, Building2, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  onLogin: (persona: "student" | "placement", name?: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [applicantName, setApplicantName] = useState("");
  const [applicantPass, setApplicantPass] = useState("");
  const [applicantError, setApplicantError] = useState("");

  const [hrUser, setHrUser] = useState("");
  const [hrPass, setHrPass] = useState("");
  const [hrError, setHrError] = useState("");

  const handleApplicantLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (applicantName.trim() && applicantPass === "password123") {
      onLogin("student", applicantName.trim());
    } else {
      setApplicantError("Please enter your name and use password123 as password");
    }
  };

  const handleHrLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (hrUser.trim() && hrPass === "password123") {
      onLogin("placement", hrUser.trim());
    } else {
      setHrError("Please enter your name/company and use password123 as password");
    }
  };
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top right, var(--pink-light), transparent 30%), radial-gradient(circle at bottom left, var(--blue-light), transparent 30%), linear-gradient(135deg, var(--bg-soft) 0%, var(--white) 100%)",
      padding: "20px"
    }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            background: "var(--blue)",
            borderRadius: "12px 15px 11px 14px",
            border: "3px solid var(--text)",
            boxShadow: "3px 3px 0 var(--text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            margin: "0 auto 16px",
          }}
        >
          <ShieldCheck size={28} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontWeight: 900, fontSize: "2.5rem", letterSpacing: "-0.02em", marginBottom: "8px" }}>
          Career<span className="gradient-text">Lens</span>
        </h1>
        <p style={{ color: "var(--text-mid)", fontSize: "1.1rem", fontWeight: 600 }}>
          Evidence-based employability & skill verification
        </p>
      </div>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", maxWidth: "800px" }}>
        {/* Applicant Card */}
        <div
          className="card fade-in-up"
          style={{
            flex: "1 1 300px",
            padding: "32px",
            borderColor: "var(--blue)",
            boxShadow: "6px 6px 0 var(--blue)",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            transition: "transform var(--dur-normal) var(--ease-spring), box-shadow var(--dur-normal) var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "8px 10px 0 var(--blue)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "6px 6px 0 var(--blue)";
          }}
        >
          <div style={{ background: "var(--blue-light)", padding: "16px", borderRadius: "50%", marginBottom: "20px" }}>
            <GraduationCap size={40} color="var(--blue)" />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "12px" }}>Applicant</h2>
          <p style={{ color: "var(--text-mid)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "24px", lineHeight: 1.5 }}>
            Verify your skills with real proof-of-work, identify skill gaps, and get a personalized roadmap to land your dream job.
          </p>

          <form onSubmit={handleApplicantLogin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input 
              type="text" 
              placeholder="Full Name (e.g. Jane Doe)" 
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="input-field" 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid var(--border)", fontFamily: "var(--font)", fontSize: "0.9rem" }}
            />
            <input 
              type="password" 
              placeholder="Password (demo: password123)" 
              value={applicantPass}
              onChange={(e) => setApplicantPass(e.target.value)}
              className="input-field" 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid var(--border)", fontFamily: "var(--font)", fontSize: "0.9rem" }}
            />
            {applicantError && <div style={{ color: "var(--pink)", fontSize: "0.8rem", fontWeight: 700 }}>{applicantError}</div>}
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                width: "100%", 
                padding: "12px", 
                fontSize: "1rem", 
                marginTop: "8px",
                transition: "all var(--dur-fast) var(--ease-out)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "4px 4px 0 var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "2px 2px 0 var(--text)";
              }}
            >
              Login as Applicant
            </button>
          </form>
        </div>

        {/* HR / Recruiter Card */}
        <div
          className="card fade-in-up"
          style={{
            flex: "1 1 300px",
            padding: "32px",
            borderColor: "var(--purple)",
            boxShadow: "6px 6px 0 var(--purple)",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            animationDelay: "0.1s",
            transition: "transform var(--dur-normal) var(--ease-spring), box-shadow var(--dur-normal) var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "8px 10px 0 var(--purple)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "6px 6px 0 var(--purple)";
          }}
        >
          <div style={{ background: "var(--purple-light)", padding: "16px", borderRadius: "50%", marginBottom: "20px" }}>
            <Building2 size={40} color="var(--purple)" />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "12px" }}>Job Offerer / HR</h2>
          <p style={{ color: "var(--text-mid)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "24px", lineHeight: 1.5 }}>
            Discover and verify top talent through evidence-based analytics, and track cohort readiness metrics.
          </p>

          <form onSubmit={handleHrLogin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input 
              type="text" 
              placeholder="HR Name or Company" 
              value={hrUser}
              onChange={(e) => setHrUser(e.target.value)}
              className="input-field" 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid var(--border)", fontFamily: "var(--font)", fontSize: "0.9rem" }}
            />
            <input 
              type="password" 
              placeholder="Password (demo: password123)" 
              value={hrPass}
              onChange={(e) => setHrPass(e.target.value)}
              className="input-field" 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid var(--border)", fontFamily: "var(--font)", fontSize: "0.9rem" }}
            />
            {hrError && <div style={{ color: "var(--pink)", fontSize: "0.8rem", fontWeight: 700 }}>{hrError}</div>}
            
            <button 
              type="submit" 
              className="btn" 
              style={{ 
                width: "100%", 
                padding: "12px", 
                fontSize: "1rem", 
                marginTop: "8px", 
                background: "var(--purple)", 
                color: "white", 
                borderColor: "var(--text)",
                transition: "all var(--dur-fast) var(--ease-out)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "4px 4px 0 var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "2px 2px 0 var(--text)";
              }}
            >
              Login as HR
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
