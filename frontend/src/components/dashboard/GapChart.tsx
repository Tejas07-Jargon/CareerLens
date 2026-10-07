"use client";

import type { Gap } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { Lightbulb, Target } from "lucide-react";

interface Props { gaps: Gap[]; }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const g: Gap = payload[0].payload;
  return (
    <div style={{
      background: "var(--white)",
      border: "2px solid var(--text)",
      borderRadius: "10px 12px 9px 11px",
      boxShadow: "3px 3px 0 var(--text)",
      padding: "12px 16px",
      maxWidth: 280,
    }}>
      <div style={{ fontWeight: 900, fontSize: "0.92rem", marginBottom: 4, color: "var(--text)" }}>{g.skill}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginBottom: 2 }}>Market Demand: <strong>{(g.market_frequency * 100).toFixed(0)}%</strong></div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginBottom: 6 }}>Your Verified Evidence: <strong>{(g.current_confidence * 100).toFixed(0)}%</strong></div>
      <div style={{ fontSize: "0.78rem", color: "var(--blue)", borderTop: "1.5px dashed var(--border)", paddingTop: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
        <Lightbulb size={14} /> Action: {g.action}
      </div>
    </div>
  );
};

export default function GapChart({ gaps }: Props) {
  if (!gaps?.length) return null;

  const topGaps = gaps.slice(0, 10);
  const data = topGaps.map((g) => ({
    ...g,
    name: g.skill.length > 16 ? g.skill.slice(0, 14) + "…" : g.skill,
    gap: +((1 - g.current_confidence) * 100).toFixed(1),
    confidence: +(g.current_confidence * 100).toFixed(1),
  }));

  return (
    <div className="card fade-in-up" style={{ borderColor: "var(--pink)", boxShadow: "5px 5px 0 var(--pink)", padding: "24px 28px" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={20} /> Skill Gap &amp; Priority Analysis
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>
          Ranked by market requirement frequency × missing evidence. Hover any bar to see the action step.
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 24, top: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text-mid)", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: "var(--text)", fontSize: 11, fontWeight: 800 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,143,171,0.08)" }} />
          <Bar dataKey="gap" radius={[0, 6, 6, 0]} name="Skill Gap %" animationDuration={800} animationEasing="ease-out">
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.gap > 65 ? "var(--pink)"
                  : entry.gap > 35 ? "var(--orange)"
                  : "var(--green)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

