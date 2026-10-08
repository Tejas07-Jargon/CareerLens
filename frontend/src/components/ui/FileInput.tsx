"use client";

import React, { useState, useRef } from "react";
import { Upload, Check, X } from "lucide-react";

export interface FileInputProps {
  id: string;
  name: string;
  accept?: string;
  label?: string; // defaults to "Choose file"
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (file: File | null) => void;
}

export function FileInput({
  id,
  name,
  accept,
  label = "Choose file",
  required,
  className = "",
  style,
  onChange,
}: FileInputProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    onChange?.(selected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFile(null);
    onChange?.(null);
  };

  // Truncate filename gracefully if too long while preserving extension
  const formatFilename = (filename: string, maxLen = 30) => {
    if (filename.length <= maxLen) return filename;
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return filename.slice(0, maxLen - 3) + "...";
    const ext = filename.slice(lastDot);
    const base = filename.slice(0, lastDot);
    const availableBase = maxLen - ext.length - 3;
    if (availableBase <= 3) return filename.slice(0, maxLen - 3) + "...";
    return base.slice(0, availableBase) + "..." + ext;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
      className={className}
    >
      {/* Visually hidden native file input (accessible to keyboard navigation & FormData) */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={handleFileChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
          zIndex: 2,
        }}
      />

      {/* Styled visible Kareer Kranti control */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "46px",
          padding: "0 14px",
          borderRadius: "11px",
          background: file
            ? "rgba(79, 163, 224, 0.05)"
            : isHovered
            ? "rgba(79, 163, 224, 0.03)"
            : "#FAF8F5",
          border: file
            ? "1.5px solid var(--blue, #4FA3E0)"
            : isFocused
            ? "1.5px solid var(--blue, #4FA3E0)"
            : isHovered
            ? "1.5px solid var(--blue, #4FA3E0)"
            : "1.5px solid var(--border, #E2E0D8)",
          boxShadow: isFocused
            ? "0 0 0 3px rgba(79, 163, 224, 0.18)"
            : isHovered
            ? "0 3px 10px rgba(0, 0, 0, 0.04)"
            : "0 1px 3px rgba(0, 0, 0, 0.02)",
          transform: isHovered && !isFocused ? "translateY(-1px)" : "none",
          transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
            flex: 1,
          }}
        >
          {file ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(82, 196, 122, 0.14)",
                color: "var(--green, #52C47A)",
                flexShrink: 0,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: isHovered ? "rgba(79, 163, 224, 0.12)" : "rgba(74, 74, 106, 0.06)",
                color: isHovered ? "var(--blue, #4FA3E0)" : "var(--text-mid, #4A4A6A)",
                flexShrink: 0,
                transition: "all 180ms ease",
              }}
            >
              <Upload size={14} strokeWidth={2.2} />
            </div>
          )}

          <div
            style={{
              fontSize: "0.88rem",
              fontWeight: file ? 700 : 600,
              color: file ? "var(--text, #1A1A2E)" : "var(--text-mid, #4A4A6A)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={file ? file.name : label}
          >
            {file ? formatFilename(file.name) : label}
          </div>
        </div>

        {file ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, zIndex: 3 }}>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 600,
                color: "var(--text-soft, #8888AA)",
                background: "rgba(0, 0, 0, 0.04)",
                padding: "2px 7px",
                borderRadius: "5px",
              }}
            >
              {formatSize(file.size)}
            </span>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Remove selected file"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.06)",
                border: "none",
                cursor: "pointer",
                color: "var(--text-mid, #4A4A6A)",
                padding: 0,
                transition: "background 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 143, 171, 0.2)";
                e.currentTarget.style.color = "var(--pink, #FF8FAB)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.color = "var(--text-mid, #4A4A6A)";
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-soft, #8888AA)",
              flexShrink: 0,
            }}
          >
            Browse
          </span>
        )}
      </div>
    </div>
  );
}

export default FileInput;
