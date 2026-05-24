import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for session persistence — critical for Capacitor Android
    // WebView where cookies may not persist across app restarts
    persistSession: true,
    storageKey: "loop-auth-token",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
  },
  // Increase realtime timeout for mobile connections
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});
