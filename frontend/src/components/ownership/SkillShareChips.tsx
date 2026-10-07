"use client";

interface SkillItem {
  skill: string;
  share?: number;
  student_share?: number;
  factor?: number;
  total_lines?: number;
}

interface Props {
  skills?: SkillItem[];
}

export default function SkillShareChips({ skills }: Props) {
  if (!skills || skills.length === 0) {
    return <span style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>No skill mapping</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {skills.map((s) => {
        const shareVal = s.share ?? s.student_share ?? 0;
        const pct = Math.round(shareVal * 100);
        return (
          <div
            key={s.skill}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              background: "var(--bg-soft)",
              border: "1.5px solid var(--border)",
              borderRadius: "6px",
              fontSize: "0.76rem",
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            <span style={{ color: "var(--text-mid)" }}>{s.skill}</span>
            <span
              style={{
                color: pct >= 50 ? "var(--green)" : pct >= 25 ? "var(--blue)" : "var(--orange)",
                fontWeight: 900,
              }}
            >
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
