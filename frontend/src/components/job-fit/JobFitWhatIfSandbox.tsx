"use client";

import React, { useState } from "react";
import { Sliders, Sparkles, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import type { JobFitResult, JobFitWhatIfResult } from "@/types/jobFit";
import { runJobFitWhatIf } from "@/lib/jobFitApi";

interface JobFitWhatIfSandboxProps {
  baseJobFit: JobFitResult;
}

export default function JobFitWhatIfSandbox({ baseJobFit }: JobFitWhatIfSandboxProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [simulationResults, setSimulationResults] = useState<JobFitWhatIfResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Suggested quick improvements from gaps
  const gapSuggestions = baseJobFit.holding_back_factors.map((f) => f.skill);

  const toggleSkill = async (skill: string) => {
    let nextSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(nextSkills);

    if (nextSkills.length === 0) {
      setSimulationResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const actions = nextSkills.map((s) => ({
        skill: s,
        strength: 0.8,
        description: `Verify and containerize ${s} project with automated tests`,
      }));
      const results = await runJobFitWhatIf(baseJobFit, actions);
      setSimulationResults(results);
    } catch (err) {
      console.warn("What-If simulation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDelta = simulationResults.reduce((acc, r) => acc + r.delta, 0);
  const projectedScore = Math.min(100, Math.round(baseJobFit.overall_fit_score + totalDelta));

  return (
    <div
      className="card"
      style={{
        background: "var(--white)",
        borderColor: "var(--purple)",
        boxShadow: "4px 4px 0 var(--purple)",
        padding: "22px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-soft)", fontWeight: 800 }}>
            MATHEMATICAL CAREER SIMULATOR
          </span>
          <h3 style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Sliders size={18} color="var(--purple)" /> Job Fit What-If Sandbox
          </h3>
        </div>

        <span className="badge" style={{ background: "var(--purple-light)", color: "var(--purple)", borderColor: "var(--purple)", fontWeight: 900 }}>
          SIMULATION ONLY
        </span>
      </div>

      <p style={{ fontSize: "0.80rem", color: "var(--text-mid)", marginBottom: 14 }}>
        Simulate the mathematical impact of completing targeted evidence milestones before writing code.
      </p>

      {/* Quick Toggle Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {gapSuggestions.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              style={{
                fontSize: "0.78rem",
                padding: "6px 12px",
                borderRadius: "8px",
                fontWeight: 800,
                border: `2px solid ${isSelected ? "var(--purple)" : "var(--border)"}`,
                background: isSelected ? "var(--purple)" : "var(--bg-soft)",
                color: isSelected ? "white" : "var(--text)",
                boxShadow: isSelected ? "2px 2px 0 var(--text)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isSelected ? <CheckCircle2 size={13} /> : <Plus size={13} />}
              Prove {skill}
            </button>
          );
        })}
      </div>

      {/* Simulation Result Box */}
      {selectedSkills.length > 0 && (
        <div
          className="fade-in-up"
          style={{
            background: "var(--bg-soft)",
            padding: "16px",
            borderRadius: "12px",
            border: "2px solid var(--purple)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-soft)" }}>CURRENT FIT</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text)" }}>
                {baseJobFit.overall_fit_score}%
              </div>
            </div>

            <ArrowRight size={24} color="var(--purple)" />

            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--purple)" }}>PROJECTED FIT</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--purple)" }}>
                {projectedScore}%
              </div>
            </div>

            <div
              className="badge"
              style={{
                background: "var(--green-light)",
                color: "var(--green)",
                borderColor: "var(--green)",
                fontSize: "0.82rem",
                fontWeight: 900,
                padding: "6px 12px",
              }}
            >
              +{totalDelta.toFixed(1)} pts
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.76rem", color: "var(--text-mid)" }}>
            {simulationResults.map((r) => (
              <div key={r.skill} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>• {r.action}</span>
                <strong style={{ color: "var(--green)" }}>+{r.delta.toFixed(1)} pts</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
