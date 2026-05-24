"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/app/utils/supabase";
import { initializeAppLifecycleListeners, logInfo, logError, checkNetworkStatus } from "@/app/utils/mobileOptimization";

// App version — bump this on each deployment to force cache bust
const APP_VERSION = "1.0.1";
const VERSION_KEY = "loop_app_version";

/**
 * AppInitializer — runs once at app startup.
 * Handles:
 * 1. Capacitor App lifecycle listeners (resume/pause)
 * 2. Cache busting on version change
 * 3. Supabase session restoration with timeout protection
 * 4. Global unhandled promise error catching
 */
export default function AppInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    logInfo("AppInitializer starting...");

    // ===================== 1. CACHE BUSTING =====================
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion && storedVersion !== APP_VERSION) {
        logInfo(`App version changed: ${storedVersion} → ${APP_VERSION}. Clearing stale caches.`);
        // Clear specific app caches, NOT auth data
        const keysToPreserve = ["loop_active_user", "loop_theme", "sb-"];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
          const shouldPreserve = keysToPreserve.some((prefix) => key.startsWith(prefix));
          if (!shouldPreserve) {
            localStorage.removeItem(key);
          }
        });
        // Clear sessionStorage entirely
        sessionStorage.clear();
      }
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    } catch (e) {
      logError("Cache busting failed", e);
    }

    // ===================== 2. LIFECYCLE LISTENERS =====================
    initializeAppLifecycleListeners();

    // ===================== 3. SESSION RESTORATION =====================
    const restoreSession = async () => {
      try {
        const online = await checkNetworkStatus();
        if (!online) {
          logInfo("Offline — skipping session restoration, will use cached user");
          return;
        }

        // Use a timeout to prevent getSession from hanging forever
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            logError("Supabase getSession timed out after 8s");
            resolve(null);
          }, 8000);
        });

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (result && "data" in result) {
          const { data: { session } } = result;
          if (session) {
            logInfo(`Session restored for user: ${session.user.email}`);
            // Proactively refresh if token is within 5 minutes of expiry
            const expiresAt = session.expires_at;
            if (expiresAt) {
              const expiresInMs = expiresAt * 1000 - Date.now();
              if (expiresInMs < 5 * 60 * 1000) {
                logInfo("Token near expiry — refreshing session");
                supabase.auth.refreshSession().catch((err) => {
                  logError("Token refresh failed", err);
                });
              }
            }
          } else {
            logInfo("No active session found");
          }
        }
      } catch (err) {
        logError("Session restoration failed", err);
      }
    };

    restoreSession();

    // ===================== 4. RESUME HANDLER =====================
    const handleResume = async (e: Event) => {
      logInfo("App resume detected — restoring session and checking connectivity");
      try {
        // Re-check and refresh auth session on resume
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const expiresAt = session.expires_at;
          const expiresInMs = expiresAt ? expiresAt * 1000 - Date.now() : Infinity;
          if (expiresInMs < 10 * 60 * 1000) {
            logInfo("Resume: token near expiry, refreshing...");
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        logError("Resume session restore failed", err);
      }
    };

    window.addEventListener("loop_app_resume", handleResume);

    // ===================== 5. GLOBAL ERROR HANDLER =====================
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("Unhandled promise rejection:", event.reason);
      // Prevent the browser from showing the default error
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("loop_app_resume", handleResume);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null; // This component renders nothing — it's a side-effect-only component
}
