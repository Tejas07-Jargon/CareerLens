"use client";

import React, { useState, useEffect } from "react";
import { 
  Code2, 
  BarChart3, 
  CalendarDays, 
  Trophy, 
  AlertCircle, 
  Upload, 
  CheckCircle2, 
  Clock, 
  History,
  Info,
  Flame,
  Target,
  Star,
  BrainCircuit,
  Activity,
  Layers,
  PieChart as PieChartIcon,
  BookOpen
} from "lucide-react";
import { BASE } from "@/lib/api";

import { 
  BarChart, Bar, XAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, YAxis,
  AreaChart, Area, Legend,
  LineChart, Line
} from "recharts";
import { LeetCodeQuestionExplorer } from './LeetCodeQuestionExplorer';

type ProfileStats = {
  username?: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number | null;
  global_ranking: number | null;
  reputation: number;
};

const COLORS = {
  blue: "var(--blue)",
  purple: "var(--purple)",
  orange: "var(--orange)",
  green: "var(--green)",
  red: "var(--red)",
  yellow: "var(--yellow)",
  text: "var(--text)",
  textMid: "var(--text-mid)",
  textLight: "var(--text-light)",
  border: "var(--border)",
  bgSoft: "var(--bg-soft)",
  bgSurface: "var(--bg-surface)"
};

export default function LeetCodeAnalyzer({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Importer state
  const [importing, setImporting] = useState(false);
  const [username, setUsername] = useState("");
  const [importJson, setImportJson] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Filter states for cross-filtering
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  useEffect(() => {
    if (!profileId) return;
    fetchProfile();
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE}/profiles/${profileId}/leetcode`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail || data?.error || "Not found");
        setStats(null);
      } else if (data) {
        setStats(data);
        setError(null);
        
        // Also fetch analytics
        const analyticsRes = await fetch(`${BASE}/profiles/${profileId}/leetcode/analytics`);
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json().catch(() => null);
          setAnalytics(analyticsData);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch LeetCode data");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setImporting(true);
      setError(null);
      
      if (!username.trim()) {
        throw new Error("Please enter a LeetCode username");
      }
      
      const payload = { username: username.trim() };
      
      const res = await fetch(`${BASE}/profiles/${profileId}/leetcode/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.error || "Failed to sync profile");
      }
      
      await fetchProfile();
      
    } catch (err: any) {
      setError(err.message || "Failed to sync profile");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      
      if (!importJson.trim()) {
        throw new Error("Please paste LeetCode JSON data");
      }
      
      let payload;
      try {
        payload = JSON.parse(importJson.trim());
      } catch (e) {
        throw new Error("Invalid JSON format");
      }
      
      const res = await fetch(`${BASE}/profiles/${profileId}/leetcode/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.error || "Failed to import profile");
      }
      
      await fetchProfile();
      setShowImport(false);
      setImportJson("");
    } catch (err: any) {
      setError(err.message || "Failed to import profile");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-mid)" }}>
        <Clock className="spin" size={24} style={{ marginBottom: 12 }} />
        <p>Loading LeetCode intelligence...</p>
      </div>
    );
  }

  // Determine which sections have data
  const hasSubmissions = analytics?.capabilities?.submissions;
  const hasTopics = analytics?.capabilities?.topics;
  const hasLanguages = analytics?.capabilities?.languages;
  const hasContests = analytics?.capabilities?.contests;
  const hasQuestions = analytics?.capabilities?.question_drilldown;
  const psi = analytics?.problem_solving_intelligence;

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--white)", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "var(--text)" }}>{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
              <span style={{ color: "var(--text-mid)" }}>{entry.name}:</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{formatter ? formatter(entry.value) : entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER */}
      <div className="card" style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.4rem", margin: 0, color: COLORS.text }}>
          <Code2 size={24} color={COLORS.blue} />
          LeetCode Intelligence
        </h2>
        {stats && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: COLORS.textMid, alignItems: "center" }}>
               <CheckCircle2 size={16} color={COLORS.green} /> Synced: <span style={{ fontWeight: 600, color: COLORS.text }}>{stats.username}</span>
            </div>
            <button 
              className="btn btn-outline" 
              style={{ padding: "6px 12px", fontSize: "0.85rem" }} 
              onClick={() => {
                setStats(null);
                setUsername("");
              }}
            >
              Analyze Another
            </button>
          </div>
        )}
      </div>

      {!stats ? (
        <div className="card" style={{ padding: 40, textAlign: "center", background: "var(--white)" }}>
          <AlertCircle size={48} color={COLORS.purple} style={{ marginBottom: 20, opacity: 0.8 }} />
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1.5rem" }}>No LeetCode Data Found</h3>
          <p style={{ color: COLORS.textMid, maxWidth: 500, margin: "0 auto 32px auto", fontSize: "1rem", lineHeight: 1.5 }}>
            Enter your LeetCode username below. Kareer Kranti will securely fetch your public profile statistics and submissions to generate your Problem-Solving Intelligence report.
          </p>
          
          <div style={{ maxWidth: 450, margin: "0 auto", textAlign: "left", background: COLORS.bgSoft, padding: 32, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
            <input 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., tourist"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                fontSize: "1rem",
                marginBottom: 16,
                background: "var(--white)",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)"
              }}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSync}
              disabled={importing || !username.trim()}
              style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8, padding: "14px" }}
            >
              {importing && !showImport ? <Clock className="spin" size={18} /> : <Upload size={18} />}
              {importing && !showImport ? "Syncing Profile..." : "Sync LeetCode Data"}
            </button>
            
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px dashed ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.textMid }}>Advanced Option</span>
                <button 
                  style={{ background: "none", border: "none", color: COLORS.blue, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }} 
                  onClick={() => setShowImport(!showImport)}
                >
                  {showImport ? "Hide JSON Import" : "Use JSON Import"}
                </button>
              </div>
              
              {showImport && (
                <div style={{ animation: "fadeIn 0.2s ease" }}>
                  <p style={{ fontSize: "0.8rem", color: COLORS.textMid, marginBottom: 12 }}>
                    Upload a LeetCode export JSON to enable detailed Question Explorer and exact historical analysis.
                  </p>
                  <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder="Paste JSON here..."
                    style={{ width: "100%", height: 120, padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "var(--white)", color: COLORS.text, fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical", marginBottom: 16 }}
                  />
                  <button 
                    className="btn btn-outline" 
                    onClick={handleImport}
                    disabled={importing || !importJson.trim()}
                    style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8 }}
                  >
                    {importing && showImport ? <Clock className="spin" size={16} /> : <Upload size={16} />}
                    {importing && showImport ? "Importing Data..." : "Import JSON"}
                  </button>
                </div>
              )}
            </div>
            {error && <div style={{ color: COLORS.red, marginTop: 16, fontSize: "0.9rem", textAlign: "center", fontWeight: 500, background: "rgba(255,0,0,0.05)", padding: 8, borderRadius: 6 }}>{error}</div>}
          </div>
        </div>
      ) : (
        <>
          {/* PROFILE OVERVIEW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.85rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Solved</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>{stats.total_solved}</div>
              <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 16 }}>
                <span style={{ fontSize: "0.85rem", color: COLORS.green, fontWeight: 700 }}>{stats.easy_solved} Easy</span>
                <span style={{ fontSize: "0.85rem", color: COLORS.orange, fontWeight: 700 }}>{stats.medium_solved} Med</span>
                <span style={{ fontSize: "0.85rem", color: COLORS.red, fontWeight: 700 }}>{stats.hard_solved} Hard</span>
              </div>
            </div>
            
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.85rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                Submission Acceptance
                <span title="Calculated from available submission history. Distinct from LeetCode's reported profile acceptance rate." style={{ cursor: "help" }}>
                  <Info size={14} color={COLORS.textLight}/>
                </span>
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>
                {stats.acceptance_rate !== null && stats.acceptance_rate !== undefined 
                  ? `${stats.acceptance_rate.toFixed(1)}%` 
                  : <span style={{ fontSize: "1.2rem", color: COLORS.textLight, fontWeight: 500 }}>Unavailable</span>}
              </div>
            </div>

            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.85rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Global Ranking</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>
                {stats.global_ranking ? `#${stats.global_ranking.toLocaleString()}` : <span style={{ fontSize: "1.2rem", color: COLORS.textLight, fontWeight: 500 }}>Unavailable</span>}
              </div>
            </div>
          </div>

          {/* PROBLEM-SOLVING INTELLIGENCE */}
          {psi && (
            <div className="card" style={{ padding: 32, background: "linear-gradient(145deg, var(--white), var(--bg-soft))", border: `2px solid ${COLORS.purple}` }}>
              <h3 style={{ margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 10, fontSize: "1.4rem", color: COLORS.purple }}>
                <BrainCircuit size={24} /> Problem-Solving Intelligence
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 32 }}>
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Algorithmic Persona</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: COLORS.text }}>{psi.persona}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Difficulty Reach</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.95rem", fontWeight: 600 }}>
                        <span style={{ color: psi.difficulty_reach.Easy ? COLORS.green : COLORS.textLight }}>Easy {psi.difficulty_reach.Easy ? '✓' : '—'}</span>
                        <span style={{ color: COLORS.textLight }}>→</span>
                        <span style={{ color: psi.difficulty_reach.Medium ? COLORS.orange : COLORS.textLight }}>Medium {psi.difficulty_reach.Medium ? '✓' : '—'}</span>
                        <span style={{ color: COLORS.textLight }}>→</span>
                        <span style={{ color: psi.difficulty_reach.Hard ? COLORS.red : COLORS.textLight }}>Hard {psi.difficulty_reach.Hard ? '✓' : '—'}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Practice Consistency</div>
                      <div style={{ fontSize: "1rem", fontWeight: 600, color: COLORS.text }}>
                        {psi.active_days !== undefined && psi.active_days !== null ? (
                          `${psi.active_days} active days • ${psi.longest_streak} day max streak`
                        ) : (
                          <span style={{ color: COLORS.textLight }}>Date history unavailable</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Recent Momentum (30 Days)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: psi.momentum_pct && psi.momentum_pct > 0 ? COLORS.green : psi.momentum_pct && psi.momentum_pct < 0 ? COLORS.red : COLORS.textMid }}>
                        {psi.momentum_label}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Topic Breadth & Concentration</div>
                      <div style={{ fontSize: "1rem", fontWeight: 600, color: COLORS.text }}>
                        {psi.topic_breadth > 0 ? (
                          <>
                            {psi.topic_breadth} topics represented<br/>
                            <span style={{ fontSize: "0.85rem", color: COLORS.textMid, fontWeight: 500 }}>
                              Top 3 topics = {psi.topic_concentration_pct}% of topic associations
                            </span>
                          </>
                        ) : (
                          <span style={{ color: COLORS.textLight }}>Topic data unavailable</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                        Strongly Represented ({`≥${psi.thresholds.strongly_represented_min} solved`})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {psi.strongly_represented.length > 0 ? psi.strongly_represented.map((t: string) => (
                          <span key={t} style={{ background: "rgba(0,100,255,0.1)", color: COLORS.blue, padding: "2px 8px", borderRadius: 4, fontSize: "0.85rem", fontWeight: 600 }}>{t}</span>
                        )) : <span style={{ color: COLORS.textMid, fontSize: "0.9rem" }}>None</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.textMid, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                        Underrepresented ({`≤${psi.thresholds.underrepresented_max} solved`})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {psi.underrepresented.length > 0 ? psi.underrepresented.map((t: string) => (
                          <span key={t} style={{ background: COLORS.bgSoft, border: `1px solid ${COLORS.border}`, color: COLORS.textMid, padding: "1px 7px", borderRadius: 4, fontSize: "0.85rem" }}>{t}</span>
                        )) : <span style={{ color: COLORS.textMid, fontSize: "0.9rem" }}>None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DIFFICULTY INTELLIGENCE */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: COLORS.text }}>
              <Layers size={20} color={COLORS.blue} /> Difficulty Intelligence
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {stats.total_solved === 0 ? (
                  <div style={{ color: COLORS.textLight }}>No solved problems available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Easy', value: stats.easy_solved, fill: COLORS.green },
                          { name: 'Medium', value: stats.medium_solved, fill: COLORS.orange },
                          { name: 'Hard', value: stats.hard_solved, fill: COLORS.red }
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name} (${value})`}
                        onClick={(data) => setSelectedDifficulty(prev => prev === data.name ? "All" : data.name)}
                        style={{ cursor: "pointer" }}
                      >
                        {[
                          { name: 'Easy', value: stats.easy_solved, fill: COLORS.green },
                          { name: 'Medium', value: stats.medium_solved, fill: COLORS.orange },
                          { name: 'Hard', value: stats.hard_solved, fill: COLORS.red }
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {selectedDifficulty !== "All" && <div style={{ textAlign: "center", fontSize: "0.85rem", color: COLORS.blue, fontWeight: 600 }}>Filtering by Difficulty: {selectedDifficulty}</div>}
            </div>
          </div>

          {/* TOPIC INTELLIGENCE */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: COLORS.text }}>
              <BookOpen size={20} color={COLORS.purple} /> Topic Intelligence
            </h4>
            
            {!hasTopics ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textLight, background: COLORS.bgSoft, borderRadius: 8 }}>
                Topic breakdown not available from the connected data source.
              </div>
            ) : analytics.topics.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textLight, background: COLORS.bgSoft, borderRadius: 8 }}>
                No topic data found in solved problems.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* Top Topics Bar */}
                <div>
                  <h5 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: COLORS.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Topics by Solved Count</h5>
                  <div style={{ height: Math.max(300, Math.min(analytics.topics.length * 30, 600)), width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topics.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={COLORS.border} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.textMid }} />
                        <YAxis dataKey="topic" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.text }} width={100} />
                        <Tooltip cursor={{ fill: COLORS.bgSoft }} content={<CustomTooltip />} />
                        <Bar 
                          dataKey="solved" 
                          fill={COLORS.purple} 
                          radius={[0, 4, 4, 0]} 
                          onClick={(data: any) => {
                            if (data?.payload?.topic) {
                              setSelectedTopic(prev => prev === data.payload.topic ? null : data.payload.topic);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Topic x Difficulty Heatmap */}
                {analytics.capabilities.topic_difficulty_heatmap && analytics.topic_difficulty_heatmap.length > 0 && (
                  <div>
                    <h5 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: COLORS.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Topic × Difficulty Matrix</h5>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "12px", textAlign: "left", color: COLORS.textMid, borderBottom: `2px solid ${COLORS.border}` }}>Topic</th>
                            <th style={{ padding: "12px", textAlign: "center", color: COLORS.green, borderBottom: `2px solid ${COLORS.border}` }}>Easy</th>
                            <th style={{ padding: "12px", textAlign: "center", color: COLORS.orange, borderBottom: `2px solid ${COLORS.border}` }}>Medium</th>
                            <th style={{ padding: "12px", textAlign: "center", color: COLORS.red, borderBottom: `2px solid ${COLORS.border}` }}>Hard</th>
                            <th style={{ padding: "12px", textAlign: "center", color: COLORS.text, borderBottom: `2px solid ${COLORS.border}` }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topic_difficulty_heatmap.slice(0, 15).map((row: any) => {
                            const maxVal = Math.max(...analytics.topic_difficulty_heatmap.map((r: any) => r.total));
                            return (
                              <tr key={row.topic} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                <td style={{ padding: "12px", fontWeight: 600 }}>
                                  <button 
                                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "inherit", textAlign: "left", padding: 0 }}
                                    onClick={() => setSelectedTopic(prev => prev === row.topic ? null : row.topic)}
                                  >
                                    {row.topic}
                                  </button>
                                </td>
                                {['Easy', 'Medium', 'Hard'].map(diff => {
                                  const val = row[diff] || 0;
                                  const opacity = val === 0 ? 0 : Math.max(0.1, val / (maxVal * 0.8));
                                  const color = diff === 'Easy' ? '0,200,83' : diff === 'Medium' ? '255,145,0' : '255,50,50';
                                  return (
                                    <td key={diff} style={{ padding: "12px", textAlign: "center" }}>
                                      <button 
                                        style={{ 
                                          background: val > 0 ? `rgba(${color}, ${opacity})` : "transparent",
                                          color: val > 0 ? COLORS.text : COLORS.textLight,
                                          border: "none",
                                          borderRadius: 4,
                                          padding: "4px 12px",
                                          cursor: val > 0 ? "pointer" : "default",
                                          minWidth: "40px",
                                          fontWeight: val > 0 ? 600 : 400
                                        }}
                                        onClick={() => {
                                          if (val > 0) {
                                            setSelectedTopic(row.topic);
                                            setSelectedDifficulty(diff);
                                          }
                                        }}
                                        title={`Filter by ${row.topic} + ${diff}`}
                                      >
                                        {val > 0 ? val : '-'}
                                      </button>
                                    </td>
                                  )
                                })}
                                <td style={{ padding: "12px", textAlign: "center", fontWeight: 700, color: COLORS.text }}>{row.total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {selectedTopic && <div style={{ textAlign: "center", fontSize: "0.85rem", color: COLORS.purple, fontWeight: 600 }}>Filtering by Topic: {selectedTopic}</div>}
              </div>
            )}
          </div>

          {/* LANGUAGE INTELLIGENCE */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: COLORS.text }}>
              <Code2 size={20} color={COLORS.orange} /> Language Intelligence
            </h4>
            
            {!hasLanguages ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textLight, background: COLORS.bgSoft, borderRadius: 8 }}>
                Language data not available from the connected data source.
              </div>
            ) : analytics.languages.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textLight, background: COLORS.bgSoft, borderRadius: 8 }}>
                No language data found.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
                <div style={{ height: 300, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.languages} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                      <XAxis dataKey="lang" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.textMid }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.textMid }} />
                      <Tooltip cursor={{ fill: COLORS.bgSoft }} content={<CustomTooltip />} />
                      <Bar 
                        dataKey="unique_solved" 
                        name="Unique Questions Solved"
                        fill={COLORS.orange} 
                        radius={[4, 4, 0, 0]}
                        onClick={(data: any) => {
                          if (data?.payload?.lang) {
                            setSelectedLanguage(prev => prev === data.payload.lang ? null : data.payload.lang);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {selectedLanguage && <div style={{ textAlign: "center", fontSize: "0.85rem", color: COLORS.orange, fontWeight: 600 }}>Filtering by Language: {selectedLanguage}</div>}
              </div>
            )}
          </div>

          {/* PRACTICE & PROGRESS */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: COLORS.text }}>
              <CalendarDays size={20} color={COLORS.green} /> Practice & Progress
            </h4>
            
            {!analytics.capabilities.submissions ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textLight, background: COLORS.bgSoft, borderRadius: 8 }}>
                Historical timeline data not available from the connected data source.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
                {/* Solving Trend */}
                <div>
                  <h5 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: COLORS.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Submissions Over Time</h5>
                  <div style={{ height: 250, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.submissions_timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.5}/>
                            <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.textMid }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.textMid }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="count" name="Submissions" stroke={COLORS.green} strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Submission Outcomes Pie (if available) */}
                {analytics.capabilities.submission_outcomes && analytics.submission_outcomes?.length > 0 && (
                  <div>
                    <h5 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: COLORS.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Submission Outcomes</h5>
                    <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.submission_outcomes}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="status"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            onClick={(data) => setSelectedStatus(prev => prev === data.name ? "All" : data.name)}
                            style={{ cursor: "pointer" }}
                          >
                            {analytics.submission_outcomes.map((entry: any, index: number) => {
                              let fill = COLORS.textMid;
                              if (entry.status === "Accepted") fill = COLORS.green;
                              else if (entry.status === "Wrong Answer") fill = COLORS.red;
                              else if (entry.status === "Time Limit Exceeded") fill = COLORS.orange;
                              else if (entry.status === "Compile Error") fill = COLORS.yellow;
                              return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {selectedStatus !== "All" && <div style={{ textAlign: "center", fontSize: "0.85rem", color: COLORS.green, fontWeight: 600 }}>Filtering by Status: {selectedStatus}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONTEST INTELLIGENCE */}
          {hasContests && (
            <div className="card" style={{ padding: 24 }}>
              <h4 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", color: COLORS.text }}>
                <Trophy size={20} color={COLORS.yellow} fill={COLORS.yellow} /> Contest Intelligence
              </h4>
              <div style={{ height: 250, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.contest_history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', year: '2-digit'})}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: COLORS.textMid }} 
                    />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.textMid }} />
                    <Tooltip 
                      content={<CustomTooltip />}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="rating" name="Contest Rating" stroke={COLORS.yellow} strokeWidth={3} dot={{ fill: COLORS.yellow, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* QUESTION EXPLORER */}
          <LeetCodeQuestionExplorer 
            profileId={profileId} 
            capabilities={analytics?.capabilities || {}}
            selectedTopic={selectedTopic}
            selectedLanguage={selectedLanguage}
            selectedDifficulty={selectedDifficulty}
            selectedStatus={selectedStatus}
            onClearFilters={() => {
              setSelectedTopic(null);
              setSelectedLanguage(null);
              setSelectedDifficulty("All");
              setSelectedStatus("All");
            }}
          />
          
        </>
      )}
    </div>
  );
}
