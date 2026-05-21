"use client";

import React, { useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { dbService } from "@/app/utils/dbService";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();



  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters and only contain letters, numbers, or underscores.");
      setLoading(false);
      return;
    }

    try {
      // Validate that username is unique
      const available = await dbService.checkUsernameAvailable(cleanUsername);
      if (!available) {
        setError(`The username @${cleanUsername} is already taken. Please try another one.`);
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: cleanUsername,
          },
        },
      });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("rate limit") || signUpError.message.toLowerCase().includes("limit exceeded")) {
          setError("Supabase email rate limit exceeded. Please wait a few minutes and try again.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // If auto-confirm is enabled, they will be logged in. Otherwise, tell them to check email.
        if (data.session) {
          router.push("/");
        } else {
          setError("Account created successfully! Please check your email to confirm your account.");
          setLoading(false);
        }
      } else {
        setError("An unknown error occurred during signup.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Signup exception:", err);
      setError(err?.message || "An exception occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl neumorphic-card space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <span className="material-symbols-outlined text-3xl text-primary">person_add</span>
          </div>
          <h1 className="text-3xl font-bold font-headline-sm text-on-surface tracking-tight">Create Account</h1>
          <p className="text-sm text-on-surface-variant">Join Loop and connect with AI</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase font-label-caps tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">badge</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-surface-container-low/50 border border-black/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase font-label-caps tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-semibold">alternate_email</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface-container-low/50 border border-black/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50 font-mono"
                  placeholder="username"
                  required
                />
              </div>
            </div>

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

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase font-label-caps tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">key</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low/50 border border-black/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className={`text-xs p-3 rounded-lg flex items-center gap-2 border ${error.includes('check your email') || error.includes('created successfully') ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
              <span className="material-symbols-outlined text-[16px]">{error.includes('check your email') || error.includes('created successfully') ? 'check_circle' : 'error'}</span>
              {error}
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
              "Sign Up"
            )}
          </button>

        </form>

        <p className="text-center text-xs text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
