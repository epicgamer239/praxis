// src/components/guild/GuildGate.tsx
"use client";

import React, { useState } from "react";
import { joinGuildByCode, createGuild } from "@/lib/firestoreService";
import { useAuth } from "@/context/AuthContext";

export default function GuildGate() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [newGuildName, setNewGuildName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code) return;
    setError(null);
    setLoading(true);

    try {
      await joinGuildByCode(user.uid, code);
    } catch (err: any) {
      setError(err.message || "Guild code not found");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGuildName) return;
    setError(null);
    setLoading(true);

    try {
      await createGuild(user.uid, newGuildName);
    } catch (err: any) {
      setError(err.message || "Failed to create guild");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-primary">
            Join a guild
          </h2>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            Praxis needs a private circle of friends to verify real-world deeds.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-canvas-subtle border border-attribute-social text-xs text-attribute-social">
            {error}
          </div>
        )}

        {!isCreating ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                5-Character Invite Code
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="7X9K2"
                className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3 text-center text-lg font-medium tracking-widest text-ink-primary focus:outline-none focus:border-border-strong"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 5}
              className="praxis-btn praxis-btn--pill"
            >
              {loading ? "Joining..." : "Join existing guild"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">
                Guild Name
              </label>
              <input
                type="text"
                required
                value={newGuildName}
                onChange={(e) => setNewGuildName(e.target.value)}
                placeholder="Oak & Iron"
                className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3 text-sm text-ink-primary focus:outline-none focus:border-border-strong"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newGuildName}
              className="praxis-btn praxis-btn--pill"
            >
              {loading ? "Creating..." : "Create new guild"}
            </button>
          </form>
        )}

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="onboard__switch"
          >
            {isCreating
              ? "Have an invite code instead? Join guild"
              : "Want to start your own circle? Create guild"}
          </button>
        </div>
      </div>
    </div>
  );
}
