"use client";

import React, { useState } from "react";
import { supabase } from "@/app/utils/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Assuming the user is running the app on localhost:3000 or a specific deployed URL
    // You can adjust the redirectTo URL as per your environment
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Password reset instructions have been sent to your email." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl neumorphic-card space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <span className="material-symbols-outlined text-3xl text-primary">lock_reset</span>
          </div>
          <h1 className="text-3xl font-bold font-headline-sm text-on-surface tracking-tight">Reset Password</h1>
          <p className="text-sm text-on-surface-variant">Enter your email to receive reset instructions</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase font-label-caps tracking-wider">
              Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low/50 border border-black/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          {status && (
            <div className={`text-xs p-3 rounded-lg flex items-center gap-2 border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
              <span className="material-symbols-outlined text-[16px]">{status.type === 'success' ? 'check_circle' : 'error'}</span>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-on-surface-variant">
          Remember your password?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Back to Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
