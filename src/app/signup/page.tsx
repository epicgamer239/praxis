"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";
import { firebaseConfigReady } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firebaseConfigReady) {
      setError("Sign-up is not configured on this build.");
      return;
    }
    setSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      router.replace("/");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  return (
    <div className="onboard onboard--form">
      <button type="button" className="onboard__back" onClick={() => router.push("/welcome")}>
        <ChevronLeft size={22} strokeWidth={2.2} />
        Back
      </button>

      <div>
        <h1>Create account</h1>
        <p className="onboard__lede">Start your guild and get outside today.</p>
      </div>

      {error && <div className="onboard__error">{error}</div>}

      <form onSubmit={handleSubmit} className="onboard__form">
        <label>
          Name
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>
        <button type="submit" className="praxis-btn praxis-btn--pill" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <button type="button" className="praxis-btn praxis-btn--ghost praxis-btn--pill" onClick={handleGoogle}>
        Continue with Google
      </button>

      <button type="button" className="onboard__switch" onClick={() => router.push("/login")}>
        I already have an account
      </button>
    </div>
  );
}
