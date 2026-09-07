// src/app/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SecureContextBanner from "@/components/auth/SecureContextBanner";

export default function LoginPage() {
  const router = useRouter();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    user,
    loading,
    authError,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (user && !loading) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center text-sm text-ink-muted">
        Signed in — opening dashboard...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // Redirect flow on mobile leaves this page; popup flow continues here.
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign in failed";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <SecureContextBanner />
      <div className="w-full p-8 rounded-2xl border border-border-subtle bg-canvas-card space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
            Praxis
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Real-world social action RPG
          </p>
        </div>

        {(error || authError) && (
          <div className="p-3 rounded-xl bg-canvas-subtle border border-attribute-social text-xs text-attribute-social">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3.5 text-ink-primary focus:outline-none focus:border-border-strong"
                placeholder="Rowan Miller"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3.5 text-ink-primary focus:outline-none focus:border-border-strong"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3.5 text-ink-primary focus:outline-none focus:border-border-strong"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="praxis-btn disabled:opacity-50"
          >
            {submitting
              ? "Processing..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border-subtle w-full" />
          <span className="bg-canvas-card px-2 text-[11px] text-ink-muted absolute">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-ink-secondary hover:text-ink-primary bg-canvas-subtle hover:bg-canvas-hover border border-border-subtle transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-ink-muted">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-ink-primary underline underline-offset-2 ml-1"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
}
