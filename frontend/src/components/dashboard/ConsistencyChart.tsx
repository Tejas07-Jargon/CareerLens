"use client";

import type { ClaimStatus } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

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
    <div className="card fade-in-up" style={{ borderColor: "var(--green)", boxShadow: "5px 5px 0 var(--green)", padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={20} /> Engineering Consistency Timeline
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600 }}>52-week GitHub commit and contribution velocity</p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--green)" }}>{activeWeeks}/{total}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 800 }}>active weeks</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: longestGap > 8 ? "var(--pink)" : longestGap > 4 ? "var(--orange)" : "var(--green)" }}>
              {longestGap}w
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-mid)", fontWeight: 800 }}>longest gap</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="consistencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--green)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--green)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--white)",
              border: "2px solid var(--text)",
              borderRadius: 8,
              boxShadow: "2px 2px 0 var(--text)",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "var(--text)"
            }}
            labelStyle={{ color: "var(--text-mid)", fontWeight: 700 }}
            itemStyle={{ color: "var(--green)" }}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stroke="var(--green)"
            strokeWidth={2.5}
            fill="url(#consistencyGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "var(--green)", stroke: "var(--text)", strokeWidth: 2 }}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
