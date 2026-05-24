"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Production-grade error boundary that catches React render crashes.
 * Prevents the entire app from going blank / freezing on unhandled errors.
 * Provides a retry button that re-mounts the component tree.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Loop ErrorBoundary] Caught render error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleFullReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "'Inter', system-ui, sans-serif",
            background: "#000",
            color: "#f5f5f5",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "32px", color: "#ef4444" }}
            >
              error_outline
            </span>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#a1a1aa", maxWidth: "320px", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Loop encountered an unexpected error. This usually resolves itself — try refreshing below.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: "0.625rem 1.5rem",
                background: "#4F6BFF",
                color: "#fff",
                border: "none",
                borderRadius: "0.75rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleFullReload}
              style={{
                padding: "0.625rem 1.5rem",
                background: "#262626",
                color: "#f5f5f5",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.75rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details style={{ marginTop: "2rem", maxWidth: "400px", textAlign: "left" }}>
              <summary style={{ cursor: "pointer", color: "#71717a", fontSize: "0.75rem" }}>
                Debug details
              </summary>
              <pre
                style={{
                  fontSize: "0.7rem",
                  color: "#ef4444",
                  background: "#1a1a1a",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  overflow: "auto",
                  maxHeight: "200px",
                  marginTop: "0.5rem",
                }}
              >
                {this.state.error.toString()}
                {"\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
