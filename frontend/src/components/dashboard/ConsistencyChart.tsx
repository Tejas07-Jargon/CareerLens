"use client";

import type { ClaimStatus } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

/**
 * Extracts the weekly activity series from the consistency evidence locators.
 * Falls back to a placeholder chart if no temporal data is available.
 */
function extractWeeklySeries(claimStatuses: ClaimStatus[]): number[] | null {
  for (const cs of claimStatuses) {
    for (const loc of cs.locators ?? []) {
      const series = (loc as any).weekly_series;
      if (Array.isArray(series) && series.length > 0) return series;
    }
  }
  return null;
}

interface Props { claimStatuses: ClaimStatus[]; }

export default function ConsistencyChart({ claimStatuses }: Props) {
  const series = extractWeeklySeries(claimStatuses);

  if (!series) return null;

  const data = series.map((count, i) => ({
    week: `W${i + 1}`,
    contributions: count,
  }));

  const activeWeeks = series.filter(Boolean).length;
  const total = series.length;
  const longestGap = (() => {
    let max = 0, cur = 0;
    for (const v of series) { if (!v) { cur++; max = Math.max(max, cur); } else { cur = 0; } }
    return max;
  })();

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>Consistency Timeline</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>12-month weekly GitHub contribution activity</p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-green)" }}>{activeWeeks}/{total}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>active weeks</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: longestGap > 8 ? "var(--accent-red)" : longestGap > 4 ? "var(--accent-amber)" : "var(--accent-green)" }}>
              {longestGap}w
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>longest gap</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="consistencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f9eff" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f9eff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="week"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "0.8rem" }}
            labelStyle={{ color: "#8b9cc4" }}
            itemStyle={{ color: "#4f9eff" }}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stroke="#4f9eff"
            strokeWidth={2}
            fill="url(#consistencyGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#4f9eff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
