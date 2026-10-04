// src/app/verify/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  reconcileGuildVerifications,
  subscribeToGuildSubmissions,
  vouchForSubmission,
} from "@/lib/firestoreService";
import { PeerSubmission } from "@/types";
import { ATTRIBUTE_TEXT, cn } from "@/lib/utils";
import GuildGate from "@/components/guild/GuildGate";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";
import { armAudioFromGesture } from "@/lib/sounds";
import { useLevelUpCelebration } from "@/hooks/useLevelUpCelebration";

function leftToVerify(sub: PeerSubmission): number {
  return Math.max(0, (sub.requiredVouches || 2) - (sub.vouchesReceived || 0));
}

function ProofCard({
  sub,
  mode,
  onVouch,
  onInspect,
}: {
  sub: PeerSubmission;
  mode: "action" | "waiting";
  onVouch: (sub: PeerSubmission) => void;
  onInspect: (sub: PeerSubmission) => void;
}) {
  const left = leftToVerify(sub);

  return (
    <div
      className={cn(
        "pl-3 py-3 border-l-4 space-y-3",
        mode === "action"
          ? "border-l-attribute-social"
          : "border-l-border-subtle opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary">{sub.authorName}</p>
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
        onClick={() => onInspect(sub)}
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

      {(sub.requiredVouches || 0) > 2 && (
        <p className="text-xs text-ink-muted leading-snug">
          Extra vouch needed — same people keep sealing this member&apos;s
          deeds.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-ink-muted min-w-0">
          {mode === "waiting"
            ? left === 1
              ? "You vouched · waiting on 1 more"
              : `You vouched · waiting on ${left} more`
            : sub.vouchedByNames.length > 0
              ? `Also vouched by ${sub.vouchedByNames.join(", ")}`
              : "No vouches yet"}
        </p>
        {mode === "action" ? (
          <button
            type="button"
            onClick={() => onVouch(sub)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-primary bg-moss hover:bg-moss-hover transition-colors shrink-0"
          >
            Vouch
          </button>
        ) : (
          <span className="text-xs font-medium text-ink-muted shrink-0">
            Waiting
          </span>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<PeerSubmission[]>([]);
  const [hit, setHit] = useState<VerifyHitPayload | null>(null);
  useLevelUpCelebration(setHit);
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

    void reconcileGuildVerifications(profile.guildId).catch(() => {
      /* best-effort */
    });

    return () => unsubSubs();
  }, [profile?.guildId]);

  const needsYou = useMemo(() => {
    if (!profile) return [];
    return submissions.filter(
      (s) =>
        s.status === "awaiting_vouches" &&
        s.userId !== profile.id &&
        !s.vouchedBy.includes(profile.id),
    );
  }, [submissions, profile]);

  const waitingOnOthers = useMemo(() => {
    if (!profile) return [];
    return submissions.filter(
      (s) =>
        s.status === "awaiting_vouches" &&
        s.userId !== profile.id &&
        s.vouchedBy.includes(profile.id),
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
          body: `${result.authorName}'s deed still needs another vouch.`,
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

  const inspect = (sub: PeerSubmission) => {
    if (!sub.photoBase64) return;
    setInspectedPhoto({
      url: sub.photoBase64,
      title: sub.questTitle,
      author: sub.authorName,
    });
  };

  const empty = needsYou.length === 0 && waitingOnOthers.length === 0;

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

      {empty ? (
        <p className="text-sm text-ink-muted pl-3 border-l-4 border-l-border-subtle py-2">
          Nothing in the verify queue right now.
        </p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-ink-secondary">
              Needs your vouch
              {needsYou.length > 0 ? ` · ${needsYou.length}` : ""}
            </h3>
            {needsYou.length === 0 ? (
              <p className="text-sm text-ink-muted pl-3 border-l-4 border-l-border-subtle py-2">
                You&apos;re caught up on new proofs.
              </p>
            ) : (
              needsYou.map((sub) => (
                <ProofCard
                  key={sub.id}
                  sub={sub}
                  mode="action"
                  onVouch={handleVouch}
                  onInspect={inspect}
                />
              ))
            )}
          </section>

          {waitingOnOthers.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-ink-secondary">
                Waiting on others · {waitingOnOthers.length}
              </h3>
              {waitingOnOthers.map((sub) => (
                <ProofCard
                  key={sub.id}
                  sub={sub}
                  mode="waiting"
                  onVouch={handleVouch}
                  onInspect={inspect}
                />
              ))}
            </section>
          )}
        </div>
      )}

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
