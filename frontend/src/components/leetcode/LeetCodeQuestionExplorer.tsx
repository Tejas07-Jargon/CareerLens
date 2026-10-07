import React, { useState, useEffect } from 'react';
import { BASE } from '@/lib/api';

interface Problem {
  question_id: number;
  title: string;
  difficulty: string;
  status: string;
  last_accepted: string | null;
  topics: string[];
}

interface LeetCodeQuestionExplorerProps {
  profileId: string;
  capabilities: {
    topics: boolean;
    submissions: boolean;
    languages: boolean;
  };
  selectedTopic?: string | null;
  selectedLanguage?: string | null;
}

export function LeetCodeQuestionExplorer({ profileId, capabilities, selectedTopic, selectedLanguage }: LeetCodeQuestionExplorerProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Basic filtering
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");

  useEffect(() => {
    if (!capabilities.topics) {
      setLoading(false);
      return;
    }
    
    async function fetchProblems() {
      try {
        const response = await fetch(`${BASE}/profiles/${profileId}/leetcode/problems`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setProblems(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch problems');
      } finally {
        setLoading(false);
      }
    }

    fetchProblems();
  }, [profileId, capabilities]);

  if (!capabilities.topics) {
    return (
      <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12, marginTop: 24 }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Question Explorer</h4>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-mid)", background: "var(--bg-soft)", borderRadius: 8 }}>
          Question-level data is not available from the connected data source. 
          <br/>
          <span style={{ fontSize: "0.85rem", marginTop: 8, display: "inline-block" }}>Use the JSON Import method to enable question exploration.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ marginTop: 24 }}>Loading Question Explorer...</div>;
  }

  if (error) {
    return <div style={{ marginTop: 24, color: "var(--red)" }}>{error}</div>;
  }

  const filteredProblems = problems.filter(p => {
    if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
    if (selectedTopic && !p.topics.includes(selectedTopic)) return false;
    return true;
  });

  return (
    <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: "1.1rem" }}>Question Explorer</h4>
        <div style={{ display: "flex", gap: 12 }}>
          <select 
            value={difficultyFilter} 
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text)" }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "12px 8px", color: "var(--text-mid)" }}>#</th>
              <th style={{ padding: "12px 8px", color: "var(--text-mid)" }}>Title</th>
              <th style={{ padding: "12px 8px", color: "var(--text-mid)" }}>Difficulty</th>
              <th style={{ padding: "12px 8px", color: "var(--text-mid)" }}>Topics</th>
              <th style={{ padding: "12px 8px", color: "var(--text-mid)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map(p => (
              <tr key={p.question_id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 8px", color: "var(--text-mid)" }}>{p.question_id}</td>
                <td style={{ padding: "12px 8px", fontWeight: 500 }}>{p.title}</td>
                <td style={{ padding: "12px 8px" }}>
                  <span style={{ 
                    color: p.difficulty === 'Easy' ? 'var(--green)' : p.difficulty === 'Medium' ? 'var(--orange)' : 'var(--red)'
                  }}>
                    {p.difficulty}
                  </span>
                </td>
                <td style={{ padding: "12px 8px", color: "var(--text-mid)" }}>
                  {p.topics.join(', ') || '-'}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <span style={{ 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    fontSize: "0.8rem",
                    background: p.status === 'Accepted' ? 'rgba(0,255,0,0.1)' : 'var(--bg-soft)',
                    color: p.status === 'Accepted' ? 'var(--green)' : 'var(--text-mid)'
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredProblems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-mid)" }}>
                  No questions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
