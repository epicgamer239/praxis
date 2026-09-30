"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  subscribeToGuildSubmissions,
  vouchForSubmission,
} from "@/lib/firestoreService";
import { PeerSubmission } from "@/types";
import { ATTRIBUTE_TEXT } from "@/lib/utils";
import GuildGate from "@/components/guild/GuildGate";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";

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

  if (!profile || !profile.guildId) {
    return <GuildGate />;
  }

  const handleVouch = async (sub: PeerSubmission) => {
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
        <p className="text-xs text-ink-muted mt-1">
          Vouch for guildmates in {profile.guildName}.
        </p>
      </div>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-border-subtle bg-canvas-card text-center text-sm text-ink-muted">
            No submissions currently awaiting vouches.
          </div>
        ) : (
          submissions.map((sub) => {
            const isAuthor = sub.userId === profile.id;
            const hasVouched = sub.vouchedBy.includes(profile.id);
            const isVerified = sub.status === "verified";

            return (
              <div
                key={sub.id}
                className={`p-5 rounded-2xl border bg-canvas-card space-y-4 ${
                  isVerified
                    ? "border-attribute-energy/50"
                    : "border-border-subtle"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-primary font-medium">
                    {sub.authorName} {isAuthor && "(You)"}
                  </span>
                  <span
                    className={`${ATTRIBUTE_TEXT[sub.attribute]} font-medium`}
                  >
                    {sub.attributeLabel} · +{sub.xpReward} XP
                  </span>
                </div>

                <p className="text-base font-medium text-ink-primary">
                  {sub.questTitle}
                </p>

                <div
                  onClick={() =>
                    sub.photoBase64 &&
                    setInspectedPhoto({
                      url: sub.photoBase64,
                      title: sub.questTitle,
                      author: sub.authorName,
                    })
                  }
                  className="w-full h-56 rounded-xl overflow-hidden border border-border-subtle bg-canvas-subtle cursor-pointer relative group"
                  title="Click to inspect photo"
                >
                  <img
                    src={sub.photoBase64}
                    alt="Submission proof"
                    className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs bg-canvas-card/90 text-ink-primary px-3 py-1.5 rounded-xl border border-border-subtle">
                      Click to enlarge
                    </span>
                  </div>
                </div>

                {sub.fieldNote && (
                  <p className="text-xs text-ink-secondary italic">
                    &ldquo;{sub.fieldNote}&rdquo;
                  </p>
                )}

                <div className="h-1.5 rounded-full bg-canvas-subtle overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width,background-color] duration-500 ${
                      isVerified
                        ? "bg-attribute-energy"
                        : "bg-attribute-neighborhood"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        10 +
                          (sub.vouchesReceived / (sub.requiredVouches || 2)) *
                            90,
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle gap-2">
                  <span className="text-xs text-ink-muted">
                    {sub.vouchesReceived} of {sub.requiredVouches} vouches
                    {sub.vouchedByNames.length > 0 &&
                      ` (by ${sub.vouchedByNames.join(", ")})`}
                  </span>

                  {isAuthor ? (
                    <span className="text-xs text-ink-muted italic shrink-0">
                      Your submission
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={hasVouched || isVerified}
                      onClick={() => handleVouch(sub)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-ink-primary bg-moss hover:bg-moss-hover disabled:bg-canvas-subtle disabled:text-ink-muted transition-colors shrink-0"
                    >
                      {isVerified
                        ? "✓ Verified"
                        : hasVouched
                          ? "Vouched"
                          : "Vouch"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <VerifyHit hit={hit} onDone={() => setHit(null)} />

      {inspectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
          onClick={() => setInspectedPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-canvas-card border border-border-strong rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border-subtle">
              <div>
                <p className="text-ink-primary font-medium">
                  {inspectedPhoto.author}&apos;s proof photo
                </p>
                <p className="text-ink-secondary mt-0.5">
                  {inspectedPhoto.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPhoto(null)}
                className="text-xs text-ink-muted hover:text-ink-primary px-2.5 py-1 rounded-xl bg-canvas-subtle transition-colors"
              >
                Close (✕)
              </button>
            </div>
            <div className="max-h-[72vh] overflow-hidden rounded-xl bg-canvas-subtle flex items-center justify-center">
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
