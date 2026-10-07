"use client";

import { useState } from "react";
import { generateQuiz } from "@/lib/api";
import type { QuizQuestion, QuizResponse } from "@/types";
import { BrainCircuit, AlertTriangle, FlaskConical, BarChart as BarChartIcon, Target, Rocket, CheckCircle, TrendingUp, Zap, BookOpen, PartyPopper, XCircle, RotateCcw, Pin, Trophy, Activity, Dumbbell, Lightbulb, Beaker, Clock } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer",
  "Data Scientist", "ML Engineer", "UI/UX Designer",
  "Product Manager", "DevOps Engineer", "Full Stack Developer", "Cloud Architect",
];

const OPTION_COLORS: Record<string, string> = {
  A: "var(--blue)", B: "var(--purple)", C: "var(--green)", D: "var(--orange)",
};
const OPTION_BG: Record<string, string> = {
  A: "var(--blue-light)", B: "var(--purple-light)", C: "var(--green-light)", D: "var(--orange-light)",
};

// ─── Analytics helpers ────────────────────────────────────────────────────────
interface Analytics {
  pct: number;
  correct: number;
  total: number;
  grade: string;
  gradeColor: string;
  topicStats: { topic: string; correct: number; total: number; pct: number }[];
  wrongTopics: string[];
  missedSkills: string[];
  strongTopics: string[];
  timePerQ: number[];
}

function calcAnalytics(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  timePerQ: number[]
): Analytics {
  let correct = 0;
  const topicMap: Record<string, { correct: number; total: number }> = {};

  for (const q of questions) {
    if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
    topicMap[q.topic].total++;
    if (answers[q.id] === q.correct) {
      correct++;
      topicMap[q.topic].correct++;
    }
  }

  const topicStats = Object.entries(topicMap).map(([topic, s]) => ({
    topic,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100),
  }));

  const pct = Math.round((correct / questions.length) * 100);
  const grade =
    pct >= 85 ? "Expert" :
    pct >= 70 ? "Proficient" :
    pct >= 50 ? "Developing" : "Needs Work";
  const gradeColor =
    pct >= 85 ? "var(--green)" :
    pct >= 70 ? "var(--blue)" :
    pct >= 50 ? "var(--orange)" : "var(--pink)";

  const wrongTopics = topicStats.filter((t) => t.pct < 50).map((t) => t.topic);
  const strongTopics = topicStats.filter((t) => t.pct >= 80).map((t) => t.topic);
  const missedSkills = questions
    .filter((q) => answers[q.id] !== q.correct)
    .map((q) => q.topic)
    .filter((v, i, a) => a.indexOf(v) === i);

  return { pct, correct, total: questions.length, grade, gradeColor, topicStats, wrongTopics, missedSkills, strongTopics, timePerQ };
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = 100;
  const barW = Math.min(48, Math.floor(520 / (data.length * 1.5)));
  const gap = Math.floor(barW * 0.5);
  const totalW = data.length * (barW + gap) - gap + 60;
  const h = 160;

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${h + 40}`} style={{ overflow: "visible" }}>
      {/* Gridlines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = h - (v / maxVal) * h;
        return (
          <g key={v}>
            <line x1={44} y1={y} x2={totalW} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4,3" />
            <text x={38} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-soft)" fontFamily="var(--font)" fontWeight={700}>{v}%</text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = 48 + i * (barW + gap);
        const barH = (d.value / maxVal) * h;
        const y = h - barH;
        return (
          <g key={d.label}>
            {/* Shadow */}
            <rect x={x + 3} y={y + 3} width={barW} height={barH} rx={4} fill="var(--text)" opacity={0.12} />
            {/* Bar */}
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} />
            {/* Value label */}
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="var(--text)" fontWeight={900} fontFamily="var(--font)">{d.value}%</text>
            {/* Topic label */}
            <text
              x={x + barW / 2} y={h + 14}
              textAnchor="middle" fontSize={8.5} fill="var(--text-mid)"
              fontWeight={700} fontFamily="var(--font)"
            >
              {d.label.length > 10 ? d.label.slice(0, 10) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ pct, color }: { pct: number; color: string }) {
  const r = 54, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={140} height={140}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={14} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={14}
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={900} fill={color} fontFamily="var(--font)">{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="var(--text-mid)" fontFamily="var(--font)" fontWeight={700}>Score</text>
    </svg>
  );
}

// ─── SVG Radar chart (topic coverage) ────────────────────────────────────────
function RadarChart({ topics }: { topics: { topic: string; pct: number }[] }) {
  if (topics.length < 3) return null;
  const items = topics.slice(0, 8); // max 8 axes
  const n = items.length;
  const cx = 120, cy = 120, r = 90;
  const angleStep = (2 * Math.PI) / n;

  function point(i: number, radius: number) {
    const a = angleStep * i - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  const levels = [0.25, 0.5, 0.75, 1];
  const polygon = (scale: number) =>
    items.map((_, i) => {
      const p = point(i, r * scale);
      return `${p.x},${p.y}`;
    }).join(" ");

  const dataPolygon = items.map((t, i) => {
    const p = point(i, r * (t.pct / 100));
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={240} height={240}>
      {/* Grid */}
      {levels.map((l) => (
        <polygon key={l} points={polygon(l)} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {/* Axes */}
      {items.map((_, i) => {
        const p = point(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
      })}
      {/* Data */}
      <polygon points={dataPolygon} fill="var(--blue)" fillOpacity={0.25} stroke="var(--blue)" strokeWidth={2} />
      {/* Labels */}
      {items.map((t, i) => {
        const p = point(i, r + 18);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle"
            fontSize={8.5} fill="var(--text-mid)" fontWeight={700} fontFamily="var(--font)"
          >
            {t.topic.length > 12 ? t.topic.slice(0, 12) + "…" : t.topic}
          </text>
        );
      })}
      {/* Dots */}
      {items.map((t, i) => {
        const p = point(i, r * (t.pct / 100));
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--blue)" stroke="white" strokeWidth={1.5} />;
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (defined OUTSIDE QuizTab to prevent focus loss on re-render)
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigProps {
  role: string; setRole: (v: string) => void;
  skills: string; setSkills: (v: string) => void;
  interests: string; setInterests: (v: string) => void;
  numQ: number; setNumQ: (v: number) => void;
  difficulty: string; setDifficulty: (v: string) => void;
  error: string | null;
  onStart: () => void;
}

function ConfigScreen({ role, setRole, skills, setSkills, interests, setInterests, numQ, setNumQ, difficulty, setDifficulty, error, onStart }: ConfigProps) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="card fade-in-up" style={{ borderColor: "var(--purple)", boxShadow: "5px 5px 0 var(--purple)" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <BrainCircuit size={28} /> Expert <span className="gradient-text">Quiz Generator</span>
          </h2>
          <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", fontWeight: 600 }}>
            Gemini AI · FAANG-level questions · Full analytics after
          </p>
        </div>
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <label className="input-label" htmlFor="quiz-role">Target Role</label>
            <select id="quiz-role" className="input" value={role} onChange={(e) => setRole(e.target.value)} style={{ borderColor: "var(--purple)" }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="quiz-skills">Skills to Focus On</label>
            <input id="quiz-skills" className="input" placeholder="e.g. React, TypeScript, SQL, system design"
              value={skills} onChange={(e) => setSkills(e.target.value)}
              style={{ borderColor: "var(--blue)" }} autoComplete="off" />
            <p style={{ fontSize: "0.75rem", color: "var(--text-soft)", marginTop: 4, fontWeight: 600 }}>
              Comma-separated. Leave blank for a broad assessment.
            </p>
          </div>
          <div>
            <label className="input-label" htmlFor="quiz-interests">Domain / Interests</label>
            <input id="quiz-interests" className="input" placeholder="e.g. fintech, distributed systems, ML"
              value={interests} onChange={(e) => setInterests(e.target.value)}
              style={{ borderColor: "var(--teal)" }} autoComplete="off" />
          </div>
          <div>
            <label className="input-label" htmlFor="quiz-difficulty">Difficulty</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["Easy", "Hard", "Expert"].map((lvl) => (
                <button key={lvl} type="button" onClick={() => setDifficulty(lvl)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "var(--doodle-sm)", fontWeight: 700, fontSize: "0.9rem",
                    border: `2px solid ${difficulty === lvl ? "var(--purple)" : "var(--border)"}`,
                    background: difficulty === lvl ? "var(--purple-light)" : "var(--white)",
                    color: difficulty === lvl ? "var(--purple)" : "var(--text-mid)",
                    boxShadow: difficulty === lvl ? "3px 3px 0 var(--purple)" : "none",
                    cursor: "pointer", transition: "all 0.15s var(--bounce)"
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="input-label" htmlFor="quiz-num">Questions: {numQ}</label>
            <input id="quiz-num" type="range" min={3} max={30} value={numQ}
              onChange={(e) => setNumQ(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--purple)", height: 6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700, marginTop: 4 }}>
              <span>3 Quick</span>
              <span style={{ color: "var(--purple)", fontWeight: 900 }}>{numQ} questions</span>
              <span>30 Full</span>
            </div>
          </div>

          {error && <div className="flag-banner"><span style={{display: "flex"}}><AlertTriangle size={20} /></span><span>{error}</span></div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { icon: <Beaker size={24} />, label: "Expert difficulty" },
              { icon: <BarChartIcon size={24} />, label: "Full analytics" },
              { icon: <Target size={24} />, label: "Role-specific" },
            ].map((f) => (
              <div key={f.label} style={{ textAlign: "center", padding: "12px 8px", background: "var(--purple-light)", border: "2px solid var(--purple)", borderRadius: "var(--doodle-sm)" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>{f.icon}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--purple)", marginTop: 4 }}>{f.label}</div>
              </div>
            ))}
          </div>

          <button id="quiz-start-btn" className="btn btn-purple" onClick={onStart}
            style={{ height: 54, fontSize: "1.05rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Rocket size={20} /> Generate Quiz with Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ role }: { role: string }) {
  return (
    <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
      <div className="card" style={{ borderColor: "var(--purple)", boxShadow: "5px 5px 0 var(--purple)", padding: "48px 32px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><BrainCircuit size={48} color="var(--purple)" /></div>
        <div className="spinner" style={{ borderTopColor: "var(--purple)", borderColor: "var(--purple-light)", width: 40, height: 40, margin: "0 auto 20px", borderWidth: 4 }} />
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>Crafting Expert Questions…</h2>
        <p style={{ color: "var(--text-mid)", fontSize: "0.88rem", fontWeight: 600 }}>
          Gemini AI is building FAANG-level MCQs for <strong style={{ color: "var(--purple)" }}>{role}</strong>
        </p>
        <p style={{ color: "var(--text-soft)", fontSize: "0.8rem", marginTop: 10, fontWeight: 600 }}>Usually takes 15–25 seconds</p>
      </div>
    </div>
  );
}

interface QuizScreenProps {
  questions: QuizQuestion[];
  role: string;
  current: number;
  answers: Record<number, string>;
  showExplanation: boolean;
  onAnswer: (label: string) => void;
  onNext: () => void;
}

function QuizScreen({ questions, role, current, answers, showExplanation, onAnswer, onNext }: QuizScreenProps) {
  const q = questions[current];
  const chosen = answers[q.id];
  const isCorrect = chosen === q.correct;
  const progress = ((current + 1) / questions.length) * 100;
  const correctSoFar = Object.keys(answers).filter((id) => {
    const qq = questions.find((x) => x.id === Number(id));
    return qq && answers[qq.id] === qq.correct;
  }).length;
  const scoreSoFar = current > 0 ? Math.round((correctSoFar / current) * 100) : 0;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }} className="fade-in-up">
      {/* Progress header */}
      <div className="card" style={{ borderColor: "var(--purple)", boxShadow: "4px 4px 0 var(--purple)", background: "var(--purple-light)", marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 900, fontSize: "0.9rem", color: "var(--purple)" }}>
            Q {current + 1} / {questions.length}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {current > 0 && (
              <span className="badge" style={{ background: "var(--white)", color: scoreSoFar >= 60 ? "var(--green)" : "var(--pink)", borderColor: scoreSoFar >= 60 ? "var(--green)" : "var(--pink)" }}>
                {scoreSoFar >= 60 ? <CheckCircle size={14} className="inline mr-1 align-text-bottom" /> : <TrendingUp size={14} className="inline mr-1 align-text-bottom" />} {scoreSoFar}% so far
              </span>
            )}
            <span className="badge" style={{ background: "var(--orange-light)", color: "var(--orange)", borderColor: "var(--orange)" }}><Zap size={14} className="inline mr-1 align-text-bottom" /> {q.difficulty}</span>
            <span className="badge" style={{ background: "var(--blue-light)", color: "var(--blue)", borderColor: "var(--blue)" }}><BookOpen size={14} className="inline mr-1 align-text-bottom" /> {q.topic}</span>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "var(--purple)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 700 }}>
          <span><Target size={14} className="inline mr-1 align-text-bottom" /> {role}</span><span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Question */}
      <div className="card" style={{ borderColor: "var(--text)", boxShadow: "5px 5px 0 var(--text)", marginBottom: 16 }}>
        <p style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.7, color: "var(--text)" }}>{q.question}</p>
      </div>

      {/* Options */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        {q.options.map((opt) => {
          const isChosen = chosen === opt.label;
          const isCorrectOpt = opt.label === q.correct;
          let bg = "var(--white)", border = "var(--border)", shadow = "none";
          let icon: React.ReactNode = null;
          if (chosen) {
            if (isCorrectOpt) { bg = "var(--green-light)"; border = "var(--green)"; shadow = "3px 3px 0 var(--green)"; icon = <CheckCircle size={16} />; }
            else if (isChosen) { bg = "var(--pink-light)"; border = "var(--pink)"; shadow = "3px 3px 0 var(--pink)"; icon = <XCircle size={16} />; }
            else { bg = "var(--bg-soft)"; }
          }
          return (
            <button key={opt.label} id={`option-${opt.label}`} disabled={!!chosen} onClick={() => onAnswer(opt.label)}
              style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%", textAlign: "left", padding: "14px 18px", background: bg, border: `2.5px solid ${border}`, borderRadius: "var(--doodle-md)", boxShadow: shadow, cursor: chosen ? "default" : "pointer", fontFamily: "var(--font)", fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", transition: "all 0.15s var(--bounce)" }}
              onMouseEnter={(e) => { if (!chosen) { const el = e.currentTarget; el.style.background = OPTION_BG[opt.label]; el.style.borderColor = OPTION_COLORS[opt.label]; el.style.boxShadow = `3px 3px 0 ${OPTION_COLORS[opt.label]}`; } }}
              onMouseLeave={(e) => { if (!chosen) { const el = e.currentTarget; el.style.background = "var(--white)"; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; } }}
            >
              <span style={{ minWidth: 32, height: 32, borderRadius: "50%", background: chosen && isCorrectOpt ? "var(--green)" : chosen && isChosen ? "var(--pink)" : OPTION_COLORS[opt.label], color: "white", fontWeight: 900, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icon || opt.label}
              </span>
              <span style={{ paddingTop: 4, lineHeight: 1.5 }}>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="card fade-in-up" style={{ borderColor: isCorrect ? "var(--green)" : "var(--orange)", boxShadow: `4px 4px 0 ${isCorrect ? "var(--green)" : "var(--orange)"}`, background: isCorrect ? "var(--green-light)" : "var(--orange-light)", marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8, fontSize: "1.05rem" }}>
            {isCorrect ? <><PartyPopper size={18} className="inline mr-2 align-text-bottom" /> Correct!</> : <><XCircle size={18} className="inline mr-2 align-text-bottom" /> Incorrect — Correct answer: {q.correct}</>}
          </div>
          <p style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--text-mid)", fontWeight: 600 }}>{q.explanation}</p>
        </div>
      )}

      {showExplanation && (
        <button id="quiz-next-btn" className={`btn ${isCorrect ? "btn-green" : "btn-primary"}`} onClick={onNext}
          style={{ width: "100%", height: 50, fontSize: "1rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {current + 1 >= questions.length ? <><BarChartIcon size={18} /> View Full Analytics →</> : "Next Question →"}
        </button>
      )}
    </div>
  );
}

// ─── Analytics / Result Screen ────────────────────────────────────────────────
interface ResultProps {
  questions: QuizQuestion[];
  answers: Record<number, string>;
  role: string;
  timePerQ: number[];
  onReset: () => void;
}

function ResultScreen({ questions, answers, role, timePerQ, onReset }: ResultProps) {
  const a = calcAnalytics(questions, answers, timePerQ);
  const [activeSection, setActiveSection] = useState<"overview" | "topics" | "review">("overview");

  const barData = a.topicStats.map((t) => ({
    label: t.topic,
    value: t.pct,
    color: t.pct >= 75 ? "var(--green)" : t.pct >= 50 ? "var(--orange)" : "var(--pink)",
  }));

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }} className="fade-in-up">

      {/* ── Score hero ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ borderColor: a.gradeColor, boxShadow: `6px 6px 0 ${a.gradeColor}`, padding: "32px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <DonutChart pct={a.pct} color={a.gradeColor} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 900, fontSize: "2rem", color: a.gradeColor, marginBottom: 4 }}>{a.grade}</div>
            <div style={{ color: "var(--text-mid)", fontWeight: 700, marginBottom: 12 }}>
              {a.correct} / {a.total} correct · <span style={{ color: "var(--purple)", fontWeight: 800 }}>{role}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}>
                <CheckCircle size={16} className="inline mr-1 align-text-bottom" /> Strong in {a.strongTopics.length} topic{a.strongTopics.length !== 1 ? "s" : ""}
              </span>
              <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)" }}>
                <AlertTriangle size={16} className="inline mr-1 align-text-bottom" /> {a.wrongTopics.length} gap{a.wrongTopics.length !== 1 ? "s" : ""} to close
              </span>
            </div>
          </div>
          <button id="quiz-retry-btn" className="btn" onClick={onReset}
            style={{ background: a.gradeColor, color: "white", fontWeight: 900, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8 }}>
            <RotateCcw size={18} /> Retry Quiz
          </button>
        </div>
      </div>

      {/* ── What to improve banner ─────────────────────────────────────────── */}
      {a.wrongTopics.length > 0 && (
        <div className="card fade-in-up" style={{ borderColor: "var(--orange)", boxShadow: "4px 4px 0 var(--orange)", background: "var(--orange-light)", marginBottom: 20, padding: "18px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: "1rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Target size={20} /> Focus Areas — what you need to improve</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {a.wrongTopics.map((t) => (
              <span key={t} className="badge" style={{ background: "var(--white)", color: "var(--orange)", borderColor: "var(--orange)", fontSize: "0.8rem" }}>
                <Pin size={14} className="inline mr-1 align-text-bottom" /> {t}
              </span>
            ))}
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600, marginTop: 10 }}>
            You scored below 50% on these topics. Prioritise them in your study roadmap — check the Roadmap tab for a structured plan.
          </p>
        </div>
      )}

      {/* ── Section tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {([
          { id: "overview", label: <><BarChartIcon size={16} className="inline mr-1 align-text-bottom" /> Overview</> },
          { id: "topics", label: <><Target size={16} className="inline mr-1 align-text-bottom" /> Topic Breakdown</> },
          { id: "review", label: <><BookOpen size={16} className="inline mr-1 align-text-bottom" /> Full Review</> },
        ] as const).map(({ id, label }) => (
          <button key={id} id={`result-tab-${id}`} onClick={() => setActiveSection(id)} className="btn"
            style={{ padding: "8px 18px", fontSize: "0.84rem", fontWeight: 800, background: activeSection === id ? "var(--purple)" : "var(--white)", color: activeSection === id ? "white" : "var(--text-mid)", borderColor: activeSection === id ? "var(--text)" : "var(--border)", boxShadow: activeSection === id ? "var(--shadow-sm)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {activeSection === "overview" && (
        <div className="fade-in-up" style={{ display: "grid", gap: 20 }}>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {[
              { label: "Overall Score", value: `${a.pct}%`, icon: <Target size={24} />, color: "var(--purple)", bg: "var(--purple-light)" },
              { label: "Correct Answers", value: `${a.correct}/${a.total}`, icon: <CheckCircle size={24} />, color: "var(--green)", bg: "var(--green-light)" },
              { label: "Topics Covered", value: a.topicStats.length, icon: <BookOpen size={24} />, color: "var(--blue)", bg: "var(--blue-light)" },
              { label: "Strong Topics", value: a.strongTopics.length, icon: <Dumbbell size={24} />, color: "var(--green)", bg: "var(--green-light)" },
              { label: "Needs Work", value: a.wrongTopics.length, icon: <AlertTriangle size={24} />, color: "var(--orange)", bg: "var(--orange-light)" },
              { label: "Pass Rate", value: a.pct >= 50 ? "Pass" : "Fail", icon: a.pct >= 50 ? <Trophy size={24} /> : <BookOpen size={24} />, color: a.pct >= 50 ? "var(--green)" : "var(--pink)", bg: a.pct >= 50 ? "var(--green-light)" : "var(--pink-light)" },
            ].map((s) => (
              <div key={s.label} className="card" style={{ borderColor: s.color, boxShadow: `3px 3px 0 ${s.color}`, background: s.bg, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem" }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: "1.4rem", color: s.color, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          {a.topicStats.length >= 3 && (
            <div className="card" style={{ borderColor: "var(--blue)", boxShadow: "4px 4px 0 var(--blue)" }}>
              <div style={{ fontWeight: 900, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Activity size={20} /> Skill Radar — Topic Coverage</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart topics={a.topicStats} />
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-soft)", textAlign: "center", fontWeight: 600, marginTop: 8 }}>
                Larger area = stronger coverage across topics
              </p>
            </div>
          )}

          {/* Strong vs weak summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card" style={{ borderColor: "var(--green)", boxShadow: "3px 3px 0 var(--green)", background: "var(--green-light)" }}>
              <div style={{ fontWeight: 900, marginBottom: 10, color: "var(--green)", display: "flex", alignItems: "center", gap: 8 }}><Dumbbell size={20} /> You're strong in…</div>
              {a.strongTopics.length === 0
                ? <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600 }}>Keep practising to build strong topics!</p>
                : a.strongTopics.map((t) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{t}</span>
                  </div>
                ))}
            </div>
            <div className="card" style={{ borderColor: "var(--pink)", boxShadow: "3px 3px 0 var(--pink)", background: "var(--pink-light)" }}>
              <div style={{ fontWeight: 900, marginBottom: 10, color: "var(--pink)", display: "flex", alignItems: "center", gap: 8 }}><Pin size={20} /> Work on…</div>
              {a.wrongTopics.length === 0
                ? <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", fontWeight: 600 }}>Excellent! No critical gaps found.</p>
                : a.wrongTopics.map((t) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--pink)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{t}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TOPIC BREAKDOWN ───────────────────────────────────────────────── */}
      {activeSection === "topics" && (
        <div className="fade-in-up" style={{ display: "grid", gap: 20 }}>
          {/* Bar chart */}
          <div className="card" style={{ borderColor: "var(--purple)", boxShadow: "4px 4px 0 var(--purple)" }}>
            <div style={{ fontWeight: 900, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><BarChartIcon size={20} /> Score by Topic</div>
            <div style={{ overflowX: "auto" }}>
              <BarChart data={barData} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              {[{ color: "var(--green)", label: "Strong (≥75%)" }, { color: "var(--orange)", label: "Developing (50–74%)" }, { color: "var(--pink)", label: "Needs Work (<50%)" }].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-mid)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-topic cards */}
          <div style={{ display: "grid", gap: 12 }}>
            {a.topicStats.sort((x, y) => x.pct - y.pct).map((t) => {
              const color = t.pct >= 75 ? "var(--green)" : t.pct >= 50 ? "var(--orange)" : "var(--pink)";
              const status = t.pct >= 75 ? "Strong" : t.pct >= 50 ? "Developing" : "Needs Work";
              return (
                <div key={t.topic} className="card" style={{ borderColor: color, boxShadow: `3px 3px 0 ${color}`, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: "0.95rem" }}>{t.topic}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-soft)", fontWeight: 700 }}>
                        {t.correct}/{t.total} correct
                      </div>
                    </div>
                    <span className="badge" style={{ background: color + "22", color, borderColor: color }}>{status}</span>
                    <span style={{ fontWeight: 900, fontSize: "1.3rem", color }}>{t.pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${t.pct}%`, background: color }} />
                  </div>
                  {t.pct < 50 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--text-mid)", marginTop: 8, fontWeight: 600 }}>
                      <Lightbulb size={16} className="inline mr-1 align-text-bottom" /> Tip: Dedicate focused study time to <strong>{t.topic}</strong> — it's a high-priority gap for {role} roles.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FULL REVIEW ────────────────────────────────────────────────────── */}
      {activeSection === "review" && (
        <div className="fade-in-up" style={{ display: "grid", gap: 14 }}>
          {questions.map((q, i) => {
            const chosen = answers[q.id];
            const isCorrect = chosen === q.correct;
            const chosenOpt = q.options.find((o) => o.label === chosen);
            const correctOpt = q.options.find((o) => o.label === q.correct);
            return (
              <div key={q.id} className="card" style={{ borderColor: isCorrect ? "var(--green)" : "var(--pink)", boxShadow: `3px 3px 0 ${isCorrect ? "var(--green)" : "var(--pink)"}`, background: isCorrect ? "var(--green-light)" : "var(--pink-light)", padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 34, height: 34, borderRadius: "50%", background: isCorrect ? "var(--green)" : "var(--pink)", color: "white", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <p style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 8, lineHeight: 1.6, flex: 1 }}>{q.question}</p>
                      <span className="badge" style={{ background: "var(--white)", color: "var(--text-mid)", borderColor: "var(--border)", whiteSpace: "nowrap" }}><Clock size={12} className="inline mr-1 align-text-bottom" /> {timePerQ[i]}s</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span className="badge" style={{ background: "var(--bg-soft)", color: "var(--text-mid)", borderColor: "var(--border)" }}><BookOpen size={14} className="inline mr-1 align-text-bottom" /> {q.topic}</span>
                      {isCorrect
                        ? <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}><CheckCircle size={14} className="inline mr-1 align-text-bottom" /> Correct: {q.correct} — {correctOpt?.text.slice(0, 40)}</span>
                        : <>
                          <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink)", borderColor: "var(--pink)" }}><XCircle size={14} className="inline mr-1 align-text-bottom" /> You: {chosen} — {chosenOpt?.text.slice(0, 30) ?? "—"}</span>
                          <span className="badge" style={{ background: "var(--green-light)", color: "var(--green)", borderColor: "var(--green)" }}><CheckCircle size={14} className="inline mr-1 align-text-bottom" /> {q.correct} — {correctOpt?.text.slice(0, 30)}</span>
                        </>
                      }
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", lineHeight: 1.7, fontWeight: 600 }}>
                        <strong style={{ color: "var(--text)" }}><BookOpen size={14} className="inline mr-1 align-text-bottom" /> Explanation: </strong>{q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main QuizTab — state only, renders sub-components by stable reference
// ─────────────────────────────────────────────────────────────────────────────
type Phase = "config" | "loading" | "quiz" | "result";

export default function QuizTab({ profileId }: { profileId: string | null }) {
  const [phase, setPhase] = useState<Phase>("config");
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState("Software Engineer");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [numQ, setNumQ] = useState(10);
  const [difficulty, setDifficulty] = useState("Expert");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [timePerQ, setTimePerQ] = useState<number[]>([]);
  const [qStartTime, setQStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleStart() {
    setError(null);
    setPhase("loading");
    try {
      const data: QuizResponse = await generateQuiz({
        role,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests,
        num_questions: numQ,
        difficulty,
      });
      setQuestions(data.questions);
      setCurrentQ(0);
      setAnswers({});
      setShowExplanation(false);
      setTimePerQ([]);
      setQStartTime(Date.now());
      setPhase("quiz");
    } catch (e: any) {
      setError(e.message ?? "Quiz generation failed. Please try again.");
      setPhase("config");
    }
  }

  function handleAnswer(label: string) {
    const q = questions[currentQ];
    const elapsed = Math.round((Date.now() - qStartTime) / 1000);
    setTimePerQ((prev) => [...prev, elapsed]);
    setAnswers((prev) => ({ ...prev, [q.id]: label }));
    setShowExplanation(true);
  }

  async function handleNext() {
    if (currentQ + 1 >= questions.length) {
      if (profileId && !isSubmitting) {
        setIsSubmitting(true);
        try {
          const payload = {
            profile_id: profileId,
            time_taken: timePerQ.reduce((a, b) => a + b, 0),
            answers: questions.map((q, i) => ({
              question_id: q.id,
              skill: role, // Default to role for skill if none
              topic: q.topic,
              difficulty: q.difficulty,
              is_correct: answers[q.id] === q.correct,
              selected_answer: answers[q.id],
              time_taken: timePerQ[i] || 0
            }))
          };
          await fetch(`http://127.0.0.1:8000/quiz/dynamic-quiz/attempts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.error("Failed to post quiz attempt:", err);
        } finally {
          setIsSubmitting(false);
          setPhase("result");
        }
      } else if (!profileId) {
        setPhase("result");
      }
    } else {
      setCurrentQ((c) => c + 1);
      setShowExplanation(false);
      setQStartTime(Date.now());
    }
  }

  function handleReset() {
    setPhase("config");
    setError(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswers({});
    setShowExplanation(false);
    setTimePerQ([]);
  }

  if (phase === "config") return <ConfigScreen role={role} setRole={setRole} skills={skills} setSkills={setSkills} interests={interests} setInterests={setInterests} numQ={numQ} setNumQ={setNumQ} difficulty={difficulty} setDifficulty={setDifficulty} error={error} onStart={handleStart} />;
  if (phase === "loading") return <LoadingScreen role={role} />;
  if (phase === "quiz" && questions.length > 0) return <QuizScreen questions={questions} role={role} current={currentQ} answers={answers} showExplanation={showExplanation} onAnswer={handleAnswer} onNext={handleNext} />;
  if (phase === "result") return <ResultScreen questions={questions} answers={answers} role={role} timePerQ={timePerQ} onReset={handleReset} />;
  return null;
}
