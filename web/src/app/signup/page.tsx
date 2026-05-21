"use client";

import React, { useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { dbService, DEMO_PROFILES } from "@/app/utils/dbService";
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

  const handleDemoUserClick = async (demoEmail: string, demoName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await dbService.getOrCreateProfileByEmail(demoEmail, demoName);
      const mockUser = {
        id: profile.id,
        email: profile.gmail || profile.email,
        fullName: profile.fullName,
        username: profile.username,
        avatar: profile.avatar,
        bio: profile.bio || "Demo User Bio",
      };
      sessionStorage.setItem("loop_mock_session", JSON.stringify(mockUser));
      localStorage.setItem("loop_mock_session", JSON.stringify(mockUser));
      window.dispatchEvent(new Event("loop_auth_changed"));
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Failed to sign up as demo user");
    } finally {
      setLoading(false);
    }
  };

  const handleBypassSignup = async () => {
    await handleDemoUserClick(email || "newuser@loop.ai", fullName || "NEW LOOP CREATOR");
  };

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
          setError("Supabase email rate limit exceeded. Please click the Instant Demo Bypass button below to sign up instantly!");
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
          setError("Account created successfully! (Supabase confirmation email sent. You can check your email or click the Instant Demo Bypass button below to log in instantly!)");
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

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-black/5"></div>
            <span className="flex-shrink mx-3 text-[10px] text-outline-variant font-bold uppercase tracking-wider font-label-caps">Or Bypass Rate Limits</span>
            <div className="flex-grow border-t border-black/5"></div>
          </div>

          <button
            type="button"
            onClick={handleBypassSignup}
            className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-xl font-bold text-sm tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Instant Demo Bypass Sign Up
          </button>
        </form>

        <div className="space-y-4 pt-4 border-t border-black/5">
          <p className="text-xs font-bold text-center text-on-surface-variant uppercase tracking-wider font-label-caps">
            Select a Demo Creator to Join Instantly
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
            {DEMO_PROFILES.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleDemoUserClick(demo.gmail, demo.full_name)}
                disabled={loading}
                className="flex items-center gap-2 p-2 rounded-xl border border-black/5 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all text-left bg-surface-container-low/30"
              >
                <img
                  src={demo.avatar_url}
                  alt={demo.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-black/10 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{demo.full_name}</p>
                  <p className="text-[10px] text-primary truncate">@{demo.username}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

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
