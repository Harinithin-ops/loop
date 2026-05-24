import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";

// ===================== PRODUCTION LOGGING =====================
export function logInfo(message: string, ...args: any[]) {
  console.log(`[Loop-App INFO] ${message}`, ...args);
}

export function logError(message: string, error?: any) {
  console.error(`[Loop-App ERROR] ${message}`, error || "");
}

// ===================== TIMEOUT HANDLER =====================
/**
 * Wraps an async operation with a timeout constraint.
 * If the promise does not resolve within the specified timeout,
 * it returns the fallback value to prevent blocking the UI.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  fallbackValue: T,
  label: string = "Async Operation"
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      logError(`[Timeout] "${label}" timed out after ${timeoutMs}ms. Using fallback.`);
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise.then((res) => {
        clearTimeout(timeoutId);
        return res;
      }),
      timeoutPromise
    ]);
  } catch (err) {
    clearTimeout(timeoutId);
    logError(`[Timeout-Wrapper Error] "${label}" failed:`, err);
    return fallbackValue;
  }
}

// ===================== RETRY LOGIC =====================
/**
 * Retries a failed async operation a given number of times with exponential backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    logInfo(`Operation failed. Retrying in ${delayMs}ms... (Retries left: ${retries})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(fn, retries - 1, delayMs * 2);
  }
}

// ===================== OFFLINE CACHE UTILITIES =====================
const CACHE_KEYS = {
  POSTS: "loop_cached_posts",
  STORIES: "loop_cached_stories",
  ACTIVE_USER: "loop_cached_active_user",
  OFFLINE_QUEUE: "loop_offline_queue"
};

export const offlineCache = {
  getPosts(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(CACHE_KEYS.POSTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setPosts(posts: any[]) {
    if (typeof window === "undefined" || !posts) return;
    try {
      localStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(posts.slice(0, 50))); // limit to 50 items for storage limits
    } catch (e) {
      logError("Failed to save posts cache", e);
    }
  },

  getStories(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(CACHE_KEYS.STORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setStories(stories: any[]) {
    if (typeof window === "undefined" || !stories) return;
    try {
      localStorage.setItem(CACHE_KEYS.STORIES, JSON.stringify(stories.slice(0, 30)));
    } catch (e) {
      logError("Failed to save stories cache", e);
    }
  },

  getActiveUser(): any | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(CACHE_KEYS.ACTIVE_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setActiveUser(user: any | null) {
    if (typeof window === "undefined") return;
    try {
      if (user) {
        localStorage.setItem(CACHE_KEYS.ACTIVE_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(CACHE_KEYS.ACTIVE_USER);
      }
    } catch (e) {
      logError("Failed to save user cache", e);
    }
  }
};

// ===================== NETWORK STATUS LISTENER =====================
let networkStatusListenerInitialized = false;
let isDeviceOnline = true;
const onlineChangeCallbacks = new Set<(online: boolean) => void>();

export async function checkNetworkStatus(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  try {
    const status = await Network.getStatus();
    isDeviceOnline = status.connected;
    return isDeviceOnline;
  } catch (err) {
    logError("Failed to check network status", err);
    // Fallback to browser navigator
    isDeviceOnline = navigator.onLine;
    return isDeviceOnline;
  }
}

export function registerNetworkListener(callback: (online: boolean) => void) {
  onlineChangeCallbacks.add(callback);
  
  if (typeof window !== "undefined" && !networkStatusListenerInitialized) {
    networkStatusListenerInitialized = true;
    
    // Initial check
    checkNetworkStatus().then((online) => {
      callback(online);
    });

    try {
      Network.addListener("networkStatusChange", (status) => {
        isDeviceOnline = status.connected;
        logInfo(`Network status changed: ${isDeviceOnline ? "ONLINE" : "OFFLINE"}`);
        onlineChangeCallbacks.forEach((cb) => cb(isDeviceOnline));
        
        if (isDeviceOnline) {
          // Trigger global online sync event
          window.dispatchEvent(new Event("loop_online_sync"));
        }
      });
    } catch (err) {
      logError("Failed to add Capacitor network status listener", err);
      // Fallback to standard window listeners
      window.addEventListener("online", () => {
        isDeviceOnline = true;
        onlineChangeCallbacks.forEach((cb) => cb(true));
        window.dispatchEvent(new Event("loop_online_sync"));
      });
      window.addEventListener("offline", () => {
        isDeviceOnline = false;
        onlineChangeCallbacks.forEach((cb) => cb(false));
      });
    }
  }

  return () => {
    onlineChangeCallbacks.delete(callback);
  };
}

export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return isDeviceOnline;
}

// ===================== APP RESUME HANDLING =====================
let appListenerInitialized = false;

export function initializeAppLifecycleListeners() {
  if (typeof window === "undefined" || appListenerInitialized) return;
  appListenerInitialized = true;

  logInfo("Initializing Capacitor App lifecycle listeners");

  try {
    App.addListener("appStateChange", ({ isActive }) => {
      logInfo(`App state changed: ${isActive ? "FOREGROUND/RESUMED" : "BACKGROUND"}`);
      if (isActive) {
        // App has been resumed
        // 1. Force network check
        checkNetworkStatus().then((online) => {
          logInfo(`Resume network check: ${online ? "ONLINE" : "OFFLINE"}`);
          // 2. Dispatch custom resume event so components can quietly refresh data
          window.dispatchEvent(new CustomEvent("loop_app_resume", { detail: { online } }));
        });
      }
    });
  } catch (err) {
    logError("Failed to register Capacitor App state change listener", err);
    // Fallback to browser visibilitychange
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        logInfo("Browser visibility resumed (visible)");
        const online = navigator.onLine;
        window.dispatchEvent(new CustomEvent("loop_app_resume", { detail: { online } }));
      }
    });
  }
}
