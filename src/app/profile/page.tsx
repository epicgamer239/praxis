// src/app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { subscribeToUserVerifiedDeeds } from "@/lib/firestoreService";
import { PeerSubmission } from "@/types";

export default function ProfilePage() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
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

  const handleExportCSV = () => {
    if (verifiedDeeds.length === 0) {
      toast("No verified deeds to export yet.");
      return;
    }

    const headers = [
      "Deed Title",
      "Category",
      "XP Reward",
      "Vouchers",
      "Field Note",
    ];
    const rows = verifiedDeeds.map((d) => [
      `"${d.questTitle.replace(/"/g, '""')}"`,
      `"${d.attributeLabel}"`,
      d.xpReward,
      `"${d.vouchedByNames.join("; ")}"`,
      `"${(d.fieldNote || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${profile.name.replace(/\s+/g, "_")}_verified_deeds.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast("Audit ledger downloaded as CSV.");
  };

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
                      className={`h-full rounded-full ${attr.color}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-ink-secondary">
            Deed Chronicle
          </h3>

          <div className="p-6 rounded-2xl border border-border-subtle bg-canvas-card space-y-4">
            <div className="space-y-4 divide-y divide-border-subtle text-xs max-h-72 overflow-y-auto">
              {verifiedDeeds.length === 0 ? (
                <p className="text-ink-muted">
                  No verified deeds yet. Complete daily quests and earn 2 guild
                  vouches.
                </p>
              ) : (
                verifiedDeeds.map((deed) => (
                  <div key={deed.id} className="pt-3 first:pt-0">
                    <p className="font-medium text-ink-primary">
                      {deed.questTitle}
                    </p>
                    <p className="text-ink-secondary mt-0.5">
                      {deed.attributeLabel} · +{deed.xpReward} XP · Vouched by{" "}
                      {deed.vouchedByNames.join(" and ")}
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-ink-secondary hover:text-ink-primary bg-canvas-subtle hover:bg-canvas-hover border border-border-subtle transition-colors"
            >
              Export verified deed audit ledger (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
