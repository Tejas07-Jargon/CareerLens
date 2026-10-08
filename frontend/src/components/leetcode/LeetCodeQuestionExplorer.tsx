import React, { useState, useEffect } from 'react';
import { BASE } from '@/lib/api';
import { FilterX } from 'lucide-react';

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
    topics?: boolean;
    submissions?: boolean;
    languages?: boolean;
  };
  selectedTopic?: string | null;
  selectedLanguage?: string | null;
  selectedDifficulty?: string;
  selectedStatus?: string;
  onClearFilters: () => void;
}

export function LeetCodeQuestionExplorer({ 
  profileId, 
  capabilities, 
  selectedTopic, 
  selectedLanguage, 
  selectedDifficulty = "All",
  selectedStatus = "All",
  onClearFilters 
}: LeetCodeQuestionExplorerProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!capabilities?.topics) {
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

  if (!capabilities?.topics) {
    return (
      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "var(--text)" }}>Question Explorer</h4>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-mid)", background: "var(--bg-soft)", borderRadius: 8 }}>
          Question-level data is not available from the connected data source. 
          <br/>
          <span style={{ fontSize: "0.85rem", marginTop: 8, display: "inline-block" }}>Use the JSON Import method to enable question exploration.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ marginTop: 24, color: "var(--text-mid)", textAlign: "center", padding: 40 }}>Loading Question Explorer...</div>;
  }

  if (error) {
    return <div style={{ marginTop: 24, color: "var(--red)", textAlign: "center", padding: 20 }}>{error}</div>;
  }

  const filteredProblems = problems.filter(p => {
    if (selectedDifficulty !== "All" && p.difficulty !== selectedDifficulty) return false;
    if (selectedTopic && !p.topics.includes(selectedTopic)) return false;
    if (selectedStatus !== "All" && p.status !== selectedStatus) return false;
    // We cannot filter by language purely from the problems endpoint right now, so we skip it or note it.
    return true;
  });

  const hasActiveFilters = selectedDifficulty !== "All" || selectedTopic || selectedLanguage || selectedStatus !== "All";

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>Question Explorer</h4>
          <span style={{ background: "var(--bg-soft)", padding: "2px 10px", borderRadius: 12, fontSize: "0.85rem", color: "var(--text-mid)", border: "1px solid var(--border)" }}>
            {filteredProblems.length} records
          </span>
        </div>
        
        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            style={{ 
              display: "flex", alignItems: "center", gap: 6, 
              background: "var(--bg-surface)", border: "1px solid var(--border)", 
              padding: "6px 12px", borderRadius: 6, fontSize: "0.85rem", 
              cursor: "pointer", color: "var(--text-mid)", fontWeight: 600,
              transition: "all 0.2s"
            }}
          >
            <FilterX size={14} /> Clear Active Filters
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {selectedDifficulty !== "All" && <span style={{ background: "rgba(255,145,0,0.1)", color: "var(--orange)", padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>Difficulty: {selectedDifficulty}</span>}
          {selectedTopic && <span style={{ background: "rgba(100,50,255,0.1)", color: "var(--purple)", padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>Topic: {selectedTopic}</span>}
          {selectedStatus !== "All" && <span style={{ background: "rgba(0,200,100,0.1)", color: "var(--green)", padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>Status: {selectedStatus}</span>}
          {selectedLanguage && <span style={{ background: "rgba(255,100,50,0.1)", color: "var(--text-mid)", padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>Language: {selectedLanguage} (UI only)</span>}
        </div>
      )}
      
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-soft)", borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px", color: "var(--text-mid)", fontWeight: 600, width: "60px" }}>#</th>
              <th style={{ padding: "12px 16px", color: "var(--text-mid)", fontWeight: 600 }}>Title</th>
              <th style={{ padding: "12px 16px", color: "var(--text-mid)", fontWeight: 600, width: "100px" }}>Difficulty</th>
              <th style={{ padding: "12px 16px", color: "var(--text-mid)", fontWeight: 600 }}>Topics</th>
              <th style={{ padding: "12px 16px", color: "var(--text-mid)", fontWeight: 600, width: "120px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((p, i) => (
              <tr key={p.question_id || i} style={{ borderBottom: "1px solid var(--border)", background: "var(--white)", transition: "background 0.2s" }}>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)" }}>{p.question_id}</td>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text)" }}>{p.title}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ 
                    color: p.difficulty === 'Easy' ? 'var(--green)' : p.difficulty === 'Medium' ? 'var(--orange)' : p.difficulty === 'Hard' ? 'var(--red)' : 'var(--text-mid)',
                    fontWeight: 600,
                    fontSize: "0.85rem"
                  }}>
                    {p.difficulty}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-mid)", fontSize: "0.85rem" }}>
                  {p.topics.join(', ') || '-'}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ 
                    padding: "4px 10px", 
                    borderRadius: 12, 
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: p.status === 'Accepted' ? 'rgba(0,200,83,0.1)' : 'var(--bg-soft)',
                    color: p.status === 'Accepted' ? 'var(--green)' : 'var(--text-mid)'
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredProblems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--text-mid)" }}>
                  No canonical questions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
