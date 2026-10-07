"use client";

import { useState } from "react";
import type { FileOwnershipData, SkillOwnershipData } from "@/types/ownership";
import { FileCode, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  repoFullName: string;
  headSha: string | null | undefined;
  files: FileOwnershipData[];
  skills: SkillOwnershipData[];
}

export default function FileOwnershipList({ repoFullName, headSha, files, skills }: Props) {
  const [showAll, setShowAll] = useState(false);

  // Sort files by candidate student_lines descending
  const sortedFiles = [...files].sort((a, b) => b.student_lines - a.student_lines);
  const displayFiles = showAll ? sortedFiles : sortedFiles.slice(0, 8);

  // Map ranges by file path from skills
  const fileRangesMap: Record<string, { start_line: number; end_line: number; line_count: number }[]> = {};
  for (const sk of skills) {
    for (const r of sk.top_ranges || []) {
      if (!fileRangesMap[r.path]) fileRangesMap[r.path] = [];
      fileRangesMap[r.path].push(r);
    }
  }

  if (!files || files.length === 0) {
    return (
      <div style={{ fontSize: "0.82rem", color: "var(--text-soft)", fontStyle: "italic", padding: "12px 0" }}>
        No file-level breakdowns recorded for this repository.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--text)", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Top Attributed Files ({files.length} analysed)</span>
        <span style={{ fontSize: "0.76rem", color: "var(--text-soft)", fontWeight: 600 }}>
          SHA: {headSha ? headSha.slice(0, 7) : "HEAD"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {displayFiles.map((file) => {
          const sharePct = Math.round(file.student_share * 100);
          const ranges = fileRangesMap[file.path] || [];
          const topRange = ranges[0];

          // Construct pinned GitHub link
          const githubLink = headSha && headSha !== "UNKNOWN"
            ? `https://github.com/${repoFullName}/blob/${headSha}/${file.path}${topRange ? `#L${topRange.start_line}-L${topRange.end_line}` : ""}`
            : `https://github.com/${repoFullName}/blob/main/${file.path}`;

          return (
            <div
              key={file.path}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "10px 14px",
                background: "var(--bg-soft)",
                border: "1.5px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.82rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <FileCode size={15} color="var(--blue)" style={{ flexShrink: 0 }} />
                  <a
                    href={githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={file.path}
                  >
                    {file.path}
                  </a>
                  <ExternalLink size={12} color="var(--text-soft)" style={{ flexShrink: 0 }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-mid)", fontWeight: 700 }}>
                    {Math.round(file.student_lines)} / {file.meaningful_lines} lines
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 900,
                      fontSize: "0.76rem",
                      background: sharePct >= 50 ? "var(--green-light)" : "var(--blue-light)",
                      color: sharePct >= 50 ? "var(--green)" : "var(--blue)",
                    }}
                  >
                    {sharePct}%
                  </span>
                </div>
              </div>

              {topRange && (
                <div style={{ fontSize: "0.74rem", color: "var(--text-soft)", marginLeft: 23 }}>
                  Main candidate range: lines {topRange.start_line}–{topRange.end_line} ({topRange.line_count} lines)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedFiles.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="btn btn-ghost"
          style={{
            marginTop: 10,
            fontSize: "0.78rem",
            padding: "5px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {showAll ? (
            <>Show Fewer Files <ChevronUp size={14} /></>
          ) : (
            <>Show All {sortedFiles.length} Files <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
