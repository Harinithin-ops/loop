"use client";

import React, { useState, useEffect, useCallback } from "react";
import { registerNetworkListener, isOnline, checkNetworkStatus } from "@/app/utils/mobileOptimization";

/**
 * Displays a full-screen "No Internet Connection" overlay when the device goes offline.
 * Automatically hides and triggers data refresh when connection returns.
 */
export default function NetworkStatus({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Set initial state
    setOnline(isOnline());

    const unsubscribe = registerNetworkListener((status) => {
      setOnline(status);
    });

    return unsubscribe;
  }, []);

  const handleRetry = useCallback(async () => {
    setChecking(true);
    try {
      const status = await checkNetworkStatus();
      setOnline(status);
      if (status) {
        // Trigger data refresh across the app
        window.dispatchEvent(new Event("loop_feed_refresh"));
      }
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  if (!online) {
    return (
      <>
        {/* Render children behind the overlay so state is preserved */}
        <div style={{ opacity: 0, pointerEvents: "none", position: "fixed" }}>{children}</div>

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            color: "#f5f5f5",
            fontFamily: "'Inter', system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(79, 107, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              border: "1px solid rgba(79, 107, 255, 0.2)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "40px", color: "#4F6BFF" }}
            >
              wifi_off
            </span>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            No Internet Connection
          </h2>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#a1a1aa",
              maxWidth: "300px",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            Please check your WiFi or mobile data connection and try again.
          </p>

          <button
            onClick={handleRetry}
            disabled={checking}
            style={{
              padding: "0.75rem 2.5rem",
              background: checking ? "#333" : "#4F6BFF",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: checking ? "wait" : "pointer",
              transition: "all 0.2s",
              opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? "Checking..." : "Try Again"}
          </button>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
