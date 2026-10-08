"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: "32px",
          border: "1px solid var(--red)",
          borderRadius: "12px",
          backgroundColor: "rgba(255, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "16px",
          margin: "24px 0"
        }}>
          <AlertTriangle size={48} color="var(--red)" />
          <div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--red)" }}>
              {this.props.componentName ? `${this.props.componentName} Failed to Load` : "Component Failed to Load"}
            </h3>
            <p style={{ margin: 0, color: "var(--text-mid)", fontSize: "0.95rem" }}>
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
          </div>
          <button 
            onClick={this.handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              color: "var(--text)",
              marginTop: "8px",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--text-mid)")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <RefreshCcw size={16} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
