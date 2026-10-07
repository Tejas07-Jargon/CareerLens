"use client";

import type { Gap } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";

interface Props { gaps: Gap[]; }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const g: Gap = payload[0].payload;
  return (
    <div style={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", maxWidth: 260 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{g.skill}</div>
      <div style={{ fontSize: "0.8rem", color: "#8b9cc4", marginBottom: 4 }}>Market frequency: {(g.market_frequency * 100).toFixed(0)}%</div>
      <div style={{ fontSize: "0.8rem", color: "#8b9cc4", marginBottom: 8 }}>Your confidence: {(g.current_confidence * 100).toFixed(0)}%</div>
      <div style={{ fontSize: "0.78rem", color: "#f0f4ff", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
        {g.action}
      </div>
    </div>
  );
};

export default function GapChart({ gaps }: Props) {
  if (!gaps?.length) return null;

  const topGaps = gaps.slice(0, 12);
  const data = topGaps.map((g) => ({
    ...g,
    name: g.skill.length > 16 ? g.skill.slice(0, 14) + "…" : g.skill,
    gap: +(( 1 - g.current_confidence) * 100).toFixed(1),
    confidence: +(g.current_confidence * 100).toFixed(1),
  }));

  return (
    <div className="card">
      <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>Skill Gap Report</h2>
      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 20 }}>
        Top {topGaps.length} gaps ranked by market importance × evidence gap. Hover a bar for the action step.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#4a5578", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#8b9cc4", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="gap" radius={[0, 4, 4, 0]} name="Gap">
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.gap > 70 ? "#f87171"
                  : entry.gap > 40 ? "#fbbf24"
                  : "#4ade80"
                }
                fillOpacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
