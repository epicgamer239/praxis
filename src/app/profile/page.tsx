// src/app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserVerifiedDeeds } from "@/lib/firestoreService";
import { ATTRIBUTE_TEXT } from "@/lib/utils";
import { PeerSubmission } from "@/types";

function deedDate(deed: PeerSubmission): string {
  const raw = (deed.verifiedAt || deed.createdAt) as {
    toDate?: () => Date;
    seconds?: number;
  } | Date | string | null;
  if (!raw) return "";
  let d: Date | null = null;
  if (typeof raw === "object" && raw && "toDate" in raw && typeof raw.toDate === "function") {
    d = raw.toDate();
  } else if (raw instanceof Date) {
    d = raw;
  } else if (typeof raw === "object" && typeof raw.seconds === "number") {
    d = new Date(raw.seconds * 1000);
  } else {
    const parsed = new Date(raw as string);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  if (!d) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth();
  const [verifiedDeeds, setVerifiedDeeds] = useState<PeerSubmission[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToUserVerifiedDeeds(profile.id, (deeds) => {
      setVerifiedDeeds(deeds);
    });
    return () => unsub();
  }, [profile?.id]);

  if (loading || !profile) {
    return (
      <div className="py-16 text-center text-sm text-ink-muted">Loading…</div>
    );
  }

  const attributes = [
    {
      key: "social",
      name: "Charisma (Social)",
      stat: profile.attributes.social,
      color: "bg-attribute-social",
      textColor: "text-attribute-social",
    },
    {
      key: "civic",
      name: "Civic Reputation",
      stat: profile.attributes.civic,
      color: "bg-attribute-civic",
      textColor: "text-attribute-civic",
    },
    {
      key: "vitality",
      name: "Vitality (Movement)",
      stat: profile.attributes.vitality,
      color: "bg-attribute-vitality",
      textColor: "text-attribute-vitality",
    },
    {
      key: "wisdom",
      name: "Wisdom (Mindfulness)",
      stat: profile.attributes.wisdom,
      color: "bg-attribute-wisdom",
      textColor: "text-attribute-wisdom",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border-subtle">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          You
        </h2>
      </div>

      <div className="p-6 rounded-2xl border border-border-subtle bg-canvas-card flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink-primary">
            {profile.name}
          </h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            {profile.title} · {profile.guildName || "No Guild Joined"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-ink-primary">
            {profile.totalVerifiedDeeds}
          </p>
          <p className="text-xs text-ink-muted">Total verified deeds</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-ink-secondary">
            Attribute Progression Curves
          </h3>

          <div className="space-y-3">
            {attributes.map((attr) => {
              const progressPct = Math.min(
                100,
                Math.round((attr.stat.currentXp / attr.stat.maxXp) * 100),
              );

              return (
                <div
                  key={attr.key}
                  className="p-4 rounded-2xl border border-border-subtle bg-canvas-card space-y-3"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-medium ${attr.textColor}`}>
                      {attr.name}
                    </span>
                    <span className="text-ink-secondary">
                      Level {attr.stat.level} · {attr.stat.currentXp} /{" "}
                      {attr.stat.maxXp} XP
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-canvas-subtle overflow-hidden">
                    <div
                      className={`h-full rounded-full ${attr.color} transition-[width] duration-700`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-secondary">Your deeds</h3>

          {verifiedDeeds.length === 0 ? (
            <p className="text-sm text-ink-muted px-1">
              Nothing verified yet. Finished deeds land here.
            </p>
          ) : (
            <div className="space-y-3">
              {verifiedDeeds.map((deed) => (
                <div
                  key={deed.id}
                  className="p-4 rounded-2xl border border-border-subtle bg-canvas-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-medium ${ATTRIBUTE_TEXT[deed.attribute]}`}
                      >
                        {deed.attributeLabel} · +{deed.xpReward} XP
                      </p>
                      <p className="text-sm font-medium text-ink-primary mt-1 leading-snug">
                        {deed.questTitle}
                      </p>
                    </div>
                    {deedDate(deed) && (
                      <span className="text-xs text-ink-muted shrink-0">
                        {deedDate(deed)}
                      </span>
                    )}
                  </div>
                  {deed.fieldNote && (
                    <p className="text-xs text-ink-secondary italic">
                      &ldquo;{deed.fieldNote}&rdquo;
                    </p>
                  )}
                  {deed.vouchedByNames.length > 0 && (
                    <p className="text-xs text-ink-muted">
                      Vouched by {deed.vouchedByNames.join(" and ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="praxis-btn praxis-btn--ghost praxis-btn--pill"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
