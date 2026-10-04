// src/components/goals/GoalGate.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GOAL_OPTIONS } from "@/lib/goals";
import { GoalId } from "@/types";
import { saveUserGoal } from "@/lib/firestoreService";
import { cn } from "@/lib/utils";

export default function GoalGate() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<GoalId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user || !selected) return;
    setError(null);
    setLoading(true);
    try {
      await saveUserGoal(user.uid, selected);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink-primary">
          What are you working on?
        </h2>
        <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
          Pick a long-term focus. Daily quests bend toward it and get harder as
          you finish — easier when you skip.
        </p>
      </div>

      {error && (
        <p className="text-sm text-attribute-social border-l-4 border-l-attribute-social pl-3 py-1">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {GOAL_OPTIONS.map((goal) => {
          const on = selected === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelected(goal.id)}
              className="w-full text-left group"
            >
              <p
                className={cn(
                  "text-base font-semibold tracking-tight transition-colors",
                  on
                    ? "text-ink-primary"
                    : "text-ink-secondary group-hover:text-ink-primary",
                )}
              >
                {goal.label}
              </p>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                {goal.blurb}
              </p>
              <div
                className={cn(
                  "mt-3 h-px w-full transition-colors",
                  on ? "bg-moss" : "bg-border-subtle group-hover:bg-border-strong",
                )}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected || loading}
        onClick={() => void handleSave()}
        className="inline-flex w-full items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-ink-primary bg-moss hover:bg-moss-hover disabled:bg-canvas-subtle disabled:text-ink-muted transition-colors"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
