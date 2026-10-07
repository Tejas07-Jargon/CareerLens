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
  Activity
} from "lucide-react";
import { BASE } from "@/lib/api";

import { 
  BarChart, Bar, XAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, YAxis,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { LeetCodeQuestionExplorer } from './LeetCodeQuestionExplorer';

type ProfileStats = {
  username?: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number;
  global_ranking: number | null;
  reputation: number;
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

  useEffect(() => {
    if (!profileId) return;
    fetchProfile();
  }, [profileId]);

  // Filter states for cross-filtering
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

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

  return (
    <div className="card fade-in-up" style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.4rem", margin: 0 }}>
          <Code2 size={24} color="var(--blue)" />
          LeetCode Intelligence
        </h2>
        {stats && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: "var(--text-mid)", alignItems: "center" }}>
               <CheckCircle2 size={16} color="var(--green)" /> Synced: {stats.username}
            </div>
            <button 
              className="btn btn-outline" 
              style={{ padding: "6px 12px", fontSize: "0.85rem" }} 
              onClick={() => {
                setStats(null);
                setUsername("");
              }}
            >
              Analyze Another User
            </button>
          </div>
        )}
      </div>

      {!stats ? (
        <div style={{ background: "var(--bg-soft)", border: "1px dashed var(--border)", padding: 32, borderRadius: 12, textAlign: "center" }}>
          <AlertCircle size={32} color="var(--purple)" style={{ marginBottom: 16 }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No LeetCode Data Found</h3>
          <p style={{ color: "var(--text-mid)", maxWidth: 500, margin: "0 auto 24px auto", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Enter your LeetCode username below. CareerLens will securely fetch your public profile statistics and submissions.
          </p>
          
          <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "left" }}>
            <input 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., tourist"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: "1rem",
                marginBottom: 16,
                background: "var(--white)"
              }}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSync}
              disabled={importing || !username.trim()}
              style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8 }}
            >
              {importing && !showImport ? <Clock className="spin" size={18} /> : <Upload size={18} />}
              {importing && !showImport ? "Syncing Profile..." : "Sync LeetCode Data"}
            </button>
            
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Advanced</span>
                <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setShowImport(!showImport)}>
                  {showImport ? "Hide JSON Import" : "Show JSON Import"}
                </button>
              </div>
              
              {showImport && (
                <div style={{ animation: "fadeIn 0.2s ease" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", marginBottom: 12 }}>
                    Upload a LeetCode export JSON to enable detailed Question Explorer, Language, and Topic analytics.
                  </p>
                  <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder="Paste JSON here..."
                    style={{ width: "100%", height: 120, padding: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text)", fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical", marginBottom: 16 }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={handleImport}
                    disabled={importing || !importJson.trim()}
                    style={{ width: "100%", justifyContent: "center", display: "flex", gap: 8 }}
                  >
                    {importing && showImport ? <Clock className="spin" size={18} /> : <Upload size={18} />}
                    {importing && showImport ? "Importing Data..." : "Import JSON"}
                  </button>
                </div>
              )}
            </div>
            {error && <div style={{ color: "var(--red)", marginTop: 12, fontSize: "0.85rem", textAlign: "center" }}>{error}</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top Level Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div style={{ padding: 20, background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 8 }}>Total Solved</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>{stats.total_solved}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--green)", fontWeight: 700 }}>{stats.easy_solved} Easy</span>
                <span style={{ fontSize: "0.8rem", color: "var(--orange)", fontWeight: 700 }}>{stats.medium_solved} Med</span>
                <span style={{ fontSize: "0.8rem", color: "var(--red)", fontWeight: 700 }}>{stats.hard_solved} Hard</span>
              </div>
            </div>
            
            <div style={{ padding: 20, background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border)", position: "relative" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>CareerLens Submission Acceptance Rate</span>
                <span title="Calculated from submission history available via the connected LeetCode data source." style={{ cursor: "help", display: "inline-flex" }}>
                  <Info size={14} color="var(--text-light)"/>
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>
                {stats.acceptance_rate !== null && stats.acceptance_rate !== undefined 
                  ? `${stats.acceptance_rate.toFixed(1)}%` 
                  : (
                    <span title="Submission-level history is not available from the connected LeetCode data source." style={{ fontSize: "1rem", color: "var(--text-light)", fontWeight: 400, cursor: "help" }}>
                      Not available
                    </span>
                  )}
              </div>
            </div>

            <div style={{ padding: 20, background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 8 }}>Global Ranking</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>
                {stats.global_ranking ? `#${stats.global_ranking.toLocaleString()}` : "N/A"}
              </div>
            </div>
          </div>
          
          {/* Advanced Analytics / Unique Features */}
          {analytics?.advanced_metrics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Algorithmic Persona */}
              <div style={{ padding: 24, background: "linear-gradient(145deg, var(--bg-soft), var(--bg-surface))", borderRadius: 12, border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.05, transform: "rotate(15deg)" }}>
                  <BrainCircuit size={120} />
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <BrainCircuit size={16} color="var(--purple)" /> Algorithmic Persona
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--purple)", marginTop: 12 }}>
                  {analytics.advanced_metrics.persona}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-mid)", marginTop: 8, lineHeight: 1.4 }}>
                  Calculated based on your most frequently solved problem categories.
                </p>
              </div>

              {/* FAANG Readiness Score */}
              <div style={{ padding: 24, background: "linear-gradient(145deg, var(--bg-soft), var(--bg-surface))", borderRadius: 12, border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Target size={16} color="var(--orange)" /> FAANG Readiness Score
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: "3rem", fontWeight: 900, color: "var(--orange)", lineHeight: 1 }}>
                    {analytics.advanced_metrics.readiness_score}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-light)" }}>/ 100</span>
                </div>
                <div style={{ width: "100%", height: 8, background: "var(--border)", borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${Math.min(100, Math.max(0, analytics.advanced_metrics.readiness_score))}%`, 
                    background: "linear-gradient(90deg, var(--orange), var(--red))",
                    borderRadius: 4
                  }} />
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: 12 }}>
                  Based on Medium/Hard solve ratios and Contest Ratings.
                </p>
              </div>

              {/* Streak & Consistency */}
              <div style={{ padding: 24, background: "linear-gradient(145deg, var(--bg-soft), var(--bg-surface))", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={16} color="var(--green)" /> Consistency Analysis
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Current Streak</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                      {analytics.advanced_metrics.current_streak > 0 && <Flame size={20} color="var(--orange)" />}
                      {analytics.advanced_metrics.current_streak} <span style={{ fontSize: "1rem", color: "var(--text-mid)", fontWeight: 500 }}>days</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Longest Streak</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Star size={20} color="var(--yellow)" fill="var(--yellow)" />
                      {analytics.advanced_metrics.longest_streak} <span style={{ fontSize: "1rem", color: "var(--text-mid)", fontWeight: 500 }}>days</span>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>
                      <strong style={{ color: "var(--text)" }}>{analytics.advanced_metrics.active_days}</strong> active days in the past year.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
            <h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color="var(--blue)" /> Difficulty Distribution
            </h4>
            <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Easy', value: stats.easy_solved, fill: 'var(--green)' },
                      { name: 'Medium', value: stats.medium_solved, fill: 'var(--orange)' },
                      { name: 'Hard', value: stats.hard_solved, fill: 'var(--red)' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Easy', value: stats.easy_solved, fill: 'var(--green)' },
                      { name: 'Medium', value: stats.medium_solved, fill: 'var(--orange)' },
                      { name: 'Hard', value: stats.hard_solved, fill: 'var(--red)' }
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
              <h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={18} color="var(--purple)" /> Submissions Over Time
              </h4>
              <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!analytics?.capabilities?.submissions ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    Submission history not available from the connected data source.
                  </div>
                ) : (analytics?.submissions_timeline?.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    No submission data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.submissions_timeline}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-mid)' }} />
                      <Tooltip cursor={{ fill: 'var(--bg-soft)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="count" fill="url(#colorCount)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ))}
              </div>
            </div>
            
            {/* Contest History Chart */}
            <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
              <h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={18} color="var(--orange)" /> Contest Rating Over Time
              </h4>
              <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!analytics?.capabilities?.contests ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    Contest history not available from the connected data source.
                  </div>
                ) : (analytics?.contest_history?.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    No contest data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.contest_history}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--orange)" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="var(--orange)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(val) => {
                          const date = new Date(val);
                          return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
                        }} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: 'var(--text-mid)' }} 
                      />
                      <YAxis domain={['auto', 'auto']} hide={true} />
                      <Tooltip 
                        cursor={{ fill: 'var(--bg-soft)' }} 
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Area type="monotone" dataKey="rating" stroke="var(--orange)" fillOpacity={1} fill="url(#colorRating)" strokeWidth={3} dot={{ fill: 'var(--orange)', r: 3 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ))}
              </div>
            </div>
            
            <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
              <h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={18} color="var(--purple)" /> Topic Coverage
              </h4>
              <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!analytics?.capabilities?.topics ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    Topic breakdown not available from the connected data source.
                  </div>
                ) : (analytics?.topics?.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                    No topic data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topics} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorTopic" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--purple)" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-mid)' }} />
                      <YAxis dataKey="topic" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-mid)' }} width={80} />
                      <Tooltip cursor={{ fill: 'var(--bg-soft)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Bar 
                        dataKey="solved" 
                        fill="url(#colorTopic)" 
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
                ))}
              </div>
              {selectedTopic && <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--purple)", marginTop: 8 }}>Filtering by Topic: {selectedTopic}</div>}
            </div>
          </div>
          
          <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12 }}>
            <h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Code2 size={18} color="var(--blue)" /> Language Distribution
            </h4>
            <div style={{ height: 250, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!analytics?.capabilities?.languages ? (
                <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                  Language data not available from the connected data source.
                </div>
              ) : (analytics?.languages?.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-mid)" }}>
                  No language data found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.languages}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="unique_solved"
                      nameKey="lang"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      onClick={(data) => setSelectedLanguage(prev => prev === data.name ? null : data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {analytics.languages.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['var(--blue)', 'var(--purple)', 'var(--green)', 'var(--orange)'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ))}
            </div>
            {selectedLanguage && <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--blue)", marginTop: 8 }}>Filtering by Language: {selectedLanguage}</div>}
          </div>
          

          
        </div>
      )}
    </div>
  );
}
