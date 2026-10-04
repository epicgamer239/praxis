// src/components/goals/GoalGate.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GOAL_OPTIONS } from "@/lib/goals";
import { GoalId } from "@/types";
import { saveUserGoal } from "@/lib/firestoreService";

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
    <div className="max-w-md mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink-primary">
          What are you working on?
        </h2>
        <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
          Praxis picks today&apos;s quests from this goal and adapts when you
          finish or skip.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-canvas-subtle border border-attribute-social text-xs text-attribute-social">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {GOAL_OPTIONS.map((goal) => {
          const on = selected === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelected(goal.id)}
              className={`w-full text-left pl-3 py-3 border-l-4 transition-colors ${
                on
                  ? "border-l-moss bg-canvas-subtle"
                  : "border-l-border-subtle hover:border-l-border-strong"
              }`}
            >
              <p className="text-sm font-semibold text-ink-primary">
                {goal.label}
              </p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                {goal.blurb}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected || loading}
        onClick={() => void handleSave()}
        className="praxis-btn praxis-btn--pill"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
