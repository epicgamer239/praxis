// src/app/verify/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  subscribeToGuildSubmissions,
  vouchForSubmission,
} from "@/lib/firestoreService";
import { PeerSubmission } from "@/types";
import { ATTRIBUTE_TEXT, cn } from "@/lib/utils";
import GuildGate from "@/components/guild/GuildGate";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";
import { armAudioFromGesture } from "@/lib/sounds";

export default function VerifyPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<PeerSubmission[]>([]);
  const [hit, setHit] = useState<VerifyHitPayload | null>(null);
  const [inspectedPhoto, setInspectedPhoto] = useState<{
    url: string;
    title: string;
    author: string;
  } | null>(null);

  useEffect(() => {
    if (!profile?.guildId) return;

    const unsubSubs = subscribeToGuildSubmissions(profile.guildId, (data) => {
      setSubmissions(data);
    });

    return () => unsubSubs();
  }, [profile?.guildId]);

  const queue = useMemo(() => {
    if (!profile) return [];
    return submissions.filter(
      (s) =>
        s.status === "awaiting_vouches" &&
        s.userId !== profile.id &&
        !s.vouchedBy.includes(profile.id),
    );
  }, [submissions, profile]);

  if (!profile || !profile.guildId) {
    return <GuildGate />;
  }

  const handleVouch = async (sub: PeerSubmission) => {
    armAudioFromGesture();
    try {
      const result = await vouchForSubmission(sub.id, profile.id, profile.name);
      if (result.verified) {
        setHit({
          title: "Verified",
          body: `${result.authorName}'s deed is locked in.`,
          xp: result.xpReward,
          xpLabel: result.attributeLabel,
          extra: `You got +${result.bonusXp} Social for the vouch.`,
          kind: "xp",
        });
      } else {
        setHit({
          title: "Vouched",
          body: `One more guildmate and ${result.authorName} levels this up.`,
          xp: result.bonusXp,
          xpLabel: "Social",
          kind: "vouch",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cannot vouch.";
      toast(message);
    }
  };

  return (
    <div className="space-y-6 min-h-full">
      <div className="pb-4 border-b border-border-subtle">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Verify
        </h2>
        <p className="text-sm text-ink-muted mt-1">
          Vouch for guildmates in {profile.guildName}.
        </p>
      </div>

      <div className="space-y-4">
        {queue.length === 0 ? (
          <p className="text-sm text-ink-muted pl-3 border-l-4 border-l-border-subtle py-2">
            Nothing waiting on your vouch right now.
          </p>
        ) : (
          queue.map((sub) => (
            <div
              key={sub.id}
              className="pl-3 py-3 border-l-4 border-l-attribute-social space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">
                    {sub.authorName}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium mt-0.5",
                      ATTRIBUTE_TEXT[sub.attribute],
                    )}
                  >
                    {sub.attributeLabel} · +{sub.xpReward} XP
                  </p>
                </div>
                <span className="text-xs text-ink-muted tabular-nums shrink-0">
                  {sub.vouchesReceived}/{sub.requiredVouches}
                </span>
              </div>

              <p className="text-base font-medium text-ink-primary leading-snug">
                {sub.questTitle}
              </p>

              <button
                type="button"
                onClick={() =>
                  sub.photoBase64 &&
                  setInspectedPhoto({
                    url: sub.photoBase64,
                    title: sub.questTitle,
                    author: sub.authorName,
                  })
                }
                className="block w-full h-52 overflow-hidden border border-border-subtle bg-canvas-subtle relative"
              >
                <img
                  src={sub.photoBase64}
                  alt="Submission proof"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 text-xs text-ink-primary bg-canvas-card/90 px-2 py-1 border border-border-subtle">
                  Tap to enlarge
                </span>
              </button>

              {sub.fieldNote && (
                <p className="text-sm text-ink-secondary italic">
                  &ldquo;{sub.fieldNote}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-ink-muted min-w-0">
                  {sub.vouchedByNames.length > 0
                    ? `Also vouched by ${sub.vouchedByNames.join(", ")}`
                    : "No vouches yet"}
                </p>
                <button
                  type="button"
                  onClick={() => handleVouch(sub)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-primary bg-moss hover:bg-moss-hover transition-colors shrink-0"
                >
                  Vouch
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <VerifyHit hit={hit} onDone={() => setHit(null)} />

      {inspectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setInspectedPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-canvas-card border border-border-strong overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border-subtle">
              <div className="min-w-0">
                <p className="text-sm text-ink-primary font-medium">
                  {inspectedPhoto.author}&apos;s proof
                </p>
                <p className="text-xs text-ink-secondary mt-0.5 truncate">
                  {inspectedPhoto.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPhoto(null)}
                className="text-sm text-ink-muted hover:text-ink-primary shrink-0"
              >
                Close
              </button>
            </div>
            <div className="max-h-[72vh] overflow-hidden bg-canvas-subtle flex items-center justify-center">
              <img
                src={inspectedPhoto.url}
                alt="Enlarged proof"
                className="w-full h-auto max-h-[72vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
