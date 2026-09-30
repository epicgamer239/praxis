// src/app/submit/page.tsx
"use client";

import React, { useState, useRef, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { differenceHash, fileToBase64Compressed } from "@/lib/imageUtils";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";
import { submitProofOfWork } from "@/lib/firestoreService";
import { getQuestById } from "@/lib/questBank";
import { ATTRIBUTE_TEXT } from "@/lib/utils";
import GuildGate from "@/components/guild/GuildGate";

function SubmitProofContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questIdParam = searchParams.get("questId");
  const activeQuest = useMemo(
    () => (questIdParam ? getQuestById(questIdParam) : null),
    [questIdParam],
  );

  const [preview, setPreview] = useState<string | null>(null);
  const [fieldNote, setFieldNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hit, setHit] = useState<VerifyHitPayload | null>(null);

  useEffect(() => {
    if (!questIdParam || !activeQuest) {
      router.replace("/");
    }
  }, [questIdParam, activeQuest, router]);

  if (!profile || !profile.guildId) {
    return <GuildGate />;
  }

  if (!activeQuest) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted">
        Pick a quest on Home…
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64Compressed(file);
      setPreview(base64);
      toast("Photo ready.");
    } catch {
      toast("Failed to compress image.");
    }
  };

  const handleSubmit = async () => {
    if (!preview) {
      toast("Take a proof photo first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const photoHash = await differenceHash(preview);
      await submitProofOfWork({
        userId: profile.id,
        authorName: profile.name,
        guildId: profile.guildId!,
        questId: activeQuest.id,
        questTitle: activeQuest.title,
        attribute: activeQuest.attribute,
        attributeLabel: activeQuest.attributeLabel,
        xpReward: activeQuest.xpReward,
        photoBase64: preview,
        photoHash,
        fieldNote: fieldNote || "Completed real-world interaction in person.",
      });

      setHit({
        title: "Proof sent",
        body: "Your guild has to confirm it. Two vouches unlock the XP.",
        xp: activeQuest.xpReward,
        xpLabel: `${activeQuest.attributeLabel} waiting`,
        kind: "submit",
      });
      window.setTimeout(() => router.push("/"), 2200);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish proof.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <VerifyHit hit={hit} onDone={() => setHit(null)} />
      <div className="pb-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Submit proof
        </h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl border border-border-subtle bg-canvas-card space-y-1.5">
          <span
            className={`text-xs font-medium ${ATTRIBUTE_TEXT[activeQuest.attribute]}`}
          >
            {activeQuest.attributeLabel} · +{activeQuest.xpReward} XP
          </span>
          <h3 className="text-base font-medium text-ink-primary leading-snug">
            {activeQuest.title}
          </h3>
          <p className="text-xs text-ink-muted">
            Proof: {activeQuest.requiredProof}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border-subtle bg-canvas-card space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Photo
            </label>
            {preview ? (
              <div className="relative rounded-xl border border-border-subtle overflow-hidden bg-canvas-subtle">
                <img
                  src={preview}
                  alt="Proof preview"
                  className="w-full h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="absolute top-3 right-3 text-xs bg-canvas-card text-ink-primary px-3 py-1.5 rounded border border-border-subtle"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border border-dashed border-border-strong rounded-xl p-8 text-center bg-canvas-subtle hover:bg-canvas-hover transition-colors"
              >
                <p className="text-sm font-medium text-ink-primary mb-1">
                  Tap to take or choose a photo
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={fieldNote}
              onChange={(e) => setFieldNote(e.target.value)}
              placeholder="Brief details…"
              className="w-full rounded-xl bg-canvas-subtle border border-border-subtle p-3.5 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-border-strong"
            />
          </div>

          <button
            type="button"
            disabled={isSubmitting || !preview}
            onClick={handleSubmit}
            className="praxis-btn"
          >
            {isSubmitting ? "Publishing..." : "Publish to guild"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubmitProofPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <SubmitProofContent />
    </Suspense>
  );
}
