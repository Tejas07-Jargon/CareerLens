"use client";

import { useState } from "react";
import { generateQuiz } from "@/lib/api";
import type { QuizQuestion, QuizResponse } from "@/types";

const ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "ML Engineer",
  "UI/UX Designer",
  "Product Manager",
  "DevOps Engineer",
  "Full Stack Developer",
  "Cloud Architect",
];

const OPTION_COLORS: Record<string, string> = {
  A: "var(--blue)",
  B: "var(--purple)",
  C: "var(--green)",
  D: "var(--orange)",
};

const OPTION_BG: Record<string, string> = {
  A: "var(--blue-light)",
  B: "var(--purple-light)",
  C: "var(--green-light)",
  D: "var(--orange-light)",
};

type Phase = "config" | "loading" | "quiz" | "result";

interface QuizState {
  questions: QuizQuestion[];
  role: string;
  current: number;
  answers: Record<number, string>; // questionId -> chosen label
  showExplanation: boolean;
  startTime: number;
  timeSpent: number[];
}

export default function QuizTab() {
  const [phase, setPhase] = useState<Phase>("config");
  const [error, setError] = useState<string | null>(null);

  // Config form
  const [role, setRole] = useState("Software Engineer");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [numQ, setNumQ] = useState(10);

  // Quiz runtime
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  // ── Start quiz ───────────────────────────────────────────────────────────────
  async function handleStart() {
    setError(null);
    setPhase("loading");
    try {
      const data: QuizResponse = await generateQuiz({
        role,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests,
        num_questions: numQ,
      });
      setQuiz({
        questions: data.questions,
        role: data.role,
        current: 0,
        answers: {},
        showExplanation: false,
        startTime: Date.now(),
        timeSpent: [],
      });
      setPhase("quiz");
    } catch (e: any) {
      setError(e.message ?? "Quiz generation failed");
      setPhase("config");
    }
  }

  // ── Answer ───────────────────────────────────────────────────────────────────
  function handleAnswer(label: string) {
    if (!quiz) return;
    const q = quiz.questions[quiz.current];
    setQuiz({
      ...quiz,
      answers: { ...quiz.answers, [q.id]: label },
      showExplanation: true,
    });
  }

  // ── Next ─────────────────────────────────────────────────────────────────────
  function handleNext() {
    if (!quiz) return;
    const elapsed = Math.round((Date.now() - quiz.startTime) / 1000);
    const timeSpent = [...quiz.timeSpent, elapsed];
    if (quiz.current + 1 >= quiz.questions.length) {
      setQuiz({ ...quiz, timeSpent, showExplanation: false });
      setPhase("result");
    } else {
      setQuiz({
        ...quiz,
        current: quiz.current + 1,
        showExplanation: false,
        startTime: Date.now(),
        timeSpent,
      });
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function handleReset() {
    setQuiz(null);
    setPhase("config");
    setError(null);
  }

  // ── Score calc ───────────────────────────────────────────────────────────────
  function calcScore() {
    if (!quiz) return { correct: 0, total: 0, pct: 0 };
    let correct = 0;
    for (const q of quiz.questions) {
      if (quiz.answers[q.id] === q.correct) correct++;
    }
    return { correct, total: quiz.questions.length, pct: Math.round((correct / quiz.questions.length) * 100) };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "config") return <ConfigScreen />;
  if (phase === "loading") return <LoadingScreen />;
  if (phase === "quiz" && quiz) return <QuizScreen />;
  if (phase === "result" && quiz) return <ResultScreen />;
  return null;

  // ── Config ───────────────────────────────────────────────────────────────────
  function ConfigScreen() {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="card fade-in-up" style={{ borderColor: "var(--purple)", boxShadow: "5px 5px 0 var(--purple)" }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: 6 }}>
              🧠 Expert <span className="gradient-text">Quiz Generator</span>
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", fontWeight: 600 }}>
              Powered by Gemini AI · FAANG-level questions tailored to your role
            </p>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            {/* Role */}
            <div>
              <label className="input-label" htmlFor="quiz-role">Target Role</label>
              <select
                id="quiz-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ borderColor: "var(--purple)" }}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Skills */}
            <div>
              <label className="input-label" htmlFor="quiz-skills">Skills to Focus On</label>
              <input
                id="quiz-skills"
                className="input"
                placeholder="e.g. React, TypeScript, system design, SQL"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{ borderColor: "var(--blue)" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-soft)", marginTop: 4, fontWeight: 600 }}>
                Comma-separated. Leave blank for general assessment.
              </p>
            </div>

            {/* Interests */}
            <div>
              <label className="input-label" htmlFor="quiz-interests">Interests / Domain</label>
              <input
                id="quiz-interests"
                className="input"
                placeholder="e.g. fintech, distributed systems, ML infra"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                style={{ borderColor: "var(--teal)" }}
              />
            </div>

            {/* Number of questions */}
            <div>
              <label className="input-label" htmlFor="quiz-num">Number of Questions: {numQ}</label>
              <input
                id="quiz-num"
                type="range"
                min={3}
                max={15}
                value={numQ}
                onChange={(e) => setNumQ(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--purple)", height: 6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700, marginTop: 4 }}>
                <span>3 (Quick)</span>
                <span style={{ color: "var(--purple)", fontWeight: 900 }}>{numQ} questions</span>
                <span>15 (Full)</span>
              </div>
            </div>

            {error && (
              <div className="flag-banner">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Difficulty badge */}
            <div style={{
              display: "flex", gap: 8, padding: "12px 16px",
              background: "var(--yellow-light)", border: "2px solid var(--yellow)",
              borderRadius: "var(--doodle-sm)",
            }}>
              <span>⚡</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text)" }}>Expert difficulty</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", fontWeight: 600 }}>
                  Questions are FAANG principal-engineer level — expect edge cases, internals & trade-offs
                </div>
              </div>
            </div>

            <button
              id="quiz-start-btn"
              className="btn btn-purple"
              onClick={handleStart}
              style={{ height: 54, fontSize: "1.05rem", fontWeight: 900 }}
            >
              🚀 Generate Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  function LoadingScreen() {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
        <div className="card" style={{ borderColor: "var(--purple)", boxShadow: "5px 5px 0 var(--purple)", padding: "48px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 24, animation: "bounceIn 0.6s var(--bounce) both" }}>🧠</div>
          <div className="spinner" style={{ borderTopColor: "var(--purple)", borderColor: "var(--purple-light)", width: 40, height: 40, margin: "0 auto 20px", borderWidth: 4 }} />
          <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>Generating Expert Questions…</h2>
          <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
            Gemini AI is crafting FAANG-level MCQs for <strong style={{ color: "var(--purple)" }}>{role}</strong>
          </p>
          <p style={{ color: "var(--text-soft)", fontSize: "0.8rem", marginTop: 12, fontWeight: 600 }}>
            This takes 10–20 seconds…
          </p>
        </div>
      </div>
    );
  }

  // ── Quiz question screen ──────────────────────────────────────────────────────
  function QuizScreen() {
    if (!quiz) return null;
    const q = quiz.questions[quiz.current];
    const chosen = quiz.answers[q.id];
    const isCorrect = chosen === q.correct;
    const progress = ((quiz.current + 1) / quiz.questions.length) * 100;

    return (
      <div style={{ maxWidth: 780, margin: "0 auto" }} className="fade-in-up">
        {/* Progress header */}
        <div className="card" style={{
          borderColor: "var(--purple)", boxShadow: "4px 4px 0 var(--purple)",
          background: "var(--purple-light)", marginBottom: 20, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 900, fontSize: "0.9rem", color: "var(--purple)" }}>
              Question {quiz.current + 1} / {quiz.questions.length}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="badge" style={{ background: "var(--orange-light)", color: "var(--orange)", borderColor: "var(--orange)" }}>
                ⚡ {q.difficulty}
              </span>
              <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)" }}>
                📚 {q.topic}
              </span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "var(--purple)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>
            <span>Role: {quiz.role}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Question card */}
        <div className="card" style={{ borderColor: "var(--text)", boxShadow: "5px 5px 0 var(--text)", marginBottom: 16 }}>
          <p style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.6, color: "var(--text)" }}>
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          {q.options.map((opt) => {
            const isChosen = chosen === opt.label;
            const isCorrectOpt = opt.label === q.correct;
            let bg = "var(--white)";
            let border = "var(--border)";
            let shadow = "none";
            let icon = "";

            if (chosen) {
              if (isCorrectOpt) { bg = "var(--green-light)"; border = "var(--green)"; shadow = `3px 3px 0 var(--green)`; icon = "✅"; }
              else if (isChosen && !isCorrectOpt) { bg = "var(--pink-light)"; border = "var(--pink)"; shadow = `3px 3px 0 var(--pink)`; icon = "❌"; }
              else { bg = "var(--bg-soft)"; border = "var(--border)"; }
            }

            return (
              <button
                key={opt.label}
                id={`option-${opt.label}`}
                disabled={!!chosen}
                onClick={() => handleAnswer(opt.label)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  width: "100%", textAlign: "left",
                  padding: "14px 18px",
                  background: bg,
                  border: `2.5px solid ${border}`,
                  borderRadius: "var(--doodle-md)",
                  boxShadow: shadow,
                  cursor: chosen ? "default" : "pointer",
                  fontFamily: "var(--font)",
                  fontWeight: chosen && isChosen ? 800 : 700,
                  fontSize: "0.92rem",
                  color: "var(--text)",
                  transition: "all 0.15s var(--bounce)",
                }}
                onMouseEnter={(e) => {
                  if (!chosen) {
                    (e.currentTarget as HTMLButtonElement).style.background = OPTION_BG[opt.label];
                    (e.currentTarget as HTMLButtonElement).style.borderColor = OPTION_COLORS[opt.label];
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `3px 3px 0 ${OPTION_COLORS[opt.label]}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!chosen) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--white)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }
                }}
              >
                <span style={{
                  minWidth: 32, height: 32, borderRadius: "50%",
                  background: chosen && isCorrectOpt ? "var(--green)" : chosen && isChosen ? "var(--pink)" : OPTION_COLORS[opt.label],
                  color: "white", fontWeight: 900, fontSize: "0.9rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {icon || opt.label}
                </span>
                <span style={{ paddingTop: 4, lineHeight: 1.5 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {quiz.showExplanation && (
          <div className="card fade-in-up" style={{
            borderColor: isCorrect ? "var(--green)" : "var(--orange)",
            boxShadow: `4px 4px 0 ${isCorrect ? "var(--green)" : "var(--orange)"}`,
            background: isCorrect ? "var(--green-light)" : "var(--orange-light)",
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 900, marginBottom: 8, fontSize: "1.1rem" }}>
              {isCorrect ? "🎉 Correct!" : `❌ Incorrect — Correct answer: ${q.correct}`}
            </div>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-mid)", fontWeight: 600 }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {quiz.showExplanation && (
          <button
            id="quiz-next-btn"
            className={`btn ${isCorrect ? "btn-green" : "btn-primary"}`}
            onClick={handleNext}
            style={{ width: "100%", height: 50, fontSize: "1rem", fontWeight: 900 }}
          >
            {quiz.current + 1 >= quiz.questions.length ? "🏁 See Results" : "Next Question →"}
          </button>
        )}
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────────
  function ResultScreen() {
    if (!quiz) return null;
    const { correct, total, pct } = calcScore();
    const grade = pct >= 80 ? "🏆 Expert" : pct >= 60 ? "👍 Proficient" : pct >= 40 ? "📈 Developing" : "📚 Beginner";
    const gradeColor = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--blue)" : pct >= 40 ? "var(--orange)" : "var(--pink)";

    return (
      <div style={{ maxWidth: 780, margin: "0 auto" }} className="fade-in-up">
        {/* Score header */}
        <div className="card" style={{
          borderColor: gradeColor, boxShadow: `6px 6px 0 ${gradeColor}`,
          textAlign: "center", padding: "40px 32px", marginBottom: 24,
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>
            {pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : pct >= 40 ? "📈" : "📚"}
          </div>
          <div style={{ fontWeight: 900, fontSize: "4rem", color: gradeColor, lineHeight: 1 }}>
            {pct}%
          </div>
          <div style={{ fontSize: "1.1rem", color: gradeColor, fontWeight: 800, marginTop: 8 }}>
            {grade}
          </div>
          <div style={{ color: "var(--text-mid)", fontWeight: 700, marginTop: 6 }}>
            {correct} / {total} correct · Role: <strong style={{ color: "var(--purple)" }}>{quiz.role}</strong>
          </div>

          {/* Score bar */}
          <div className="progress-bar" style={{ marginTop: 24, height: 14 }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: gradeColor }} />
          </div>

          <button
            id="quiz-retry-btn"
            className="btn"
            onClick={handleReset}
            style={{ marginTop: 28, background: gradeColor, color: "white", fontWeight: 900 }}
          >
            🔄 Try Again
          </button>
        </div>

        {/* Per-question review */}
        <h3 style={{ fontWeight: 900, fontSize: "1.1rem", marginBottom: 16 }}>📝 Question Review</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {quiz.questions.map((q, i) => {
            const chosen = quiz.answers[q.id];
            const correct = chosen === q.correct;
            return (
              <div
                key={q.id}
                className="card"
                style={{
                  borderColor: correct ? "var(--green)" : "var(--pink)",
                  boxShadow: `3px 3px 0 ${correct ? "var(--green)" : "var(--pink)"}`,
                  background: correct ? "var(--green-light)" : "var(--pink-light)",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    minWidth: 32, height: 32, borderRadius: "50%",
                    background: correct ? "var(--green)" : "var(--pink)",
                    color: "white", fontWeight: 900, fontSize: "0.9rem",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 6, lineHeight: 1.5 }}>
                      {q.question}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span className="badge" style={{ background: "var(--bg-soft)", color: "var(--text-mid)", borderColor: "var(--border)" }}>
                        📚 {q.topic}
                      </span>
                      {!correct && (
                        <>
                          <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)" }}>
                            ❌ You: {chosen ?? "—"}
                          </span>
                          <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}>
                            ✅ Correct: {q.correct}
                          </span>
                        </>
                      )}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-mid)", lineHeight: 1.6, fontWeight: 600 }}>
                      {q.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
