// src/app/submit/page.tsx
"use client";

import React, { useState, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fileToBase64Compressed } from "@/lib/imageUtils";
import { submitProofOfWork } from "@/lib/firestoreService";
import { getDailyQuestsForGuild } from "@/lib/questBank";

function SubmitProofContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questIdParam = searchParams.get("questId");
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const activeQuest = useMemo(() => {
    const quests = getDailyQuestsForGuild(
      todayStr,
      profile?.guildId || "DEFAULT",
    );
    if (questIdParam) {
      const found = quests.find((q) => q.id === questIdParam);
      if (found) return found;
    }
    return quests[0];
  }, [todayStr, profile?.guildId, questIdParam]);

  const [preview, setPreview] = useState<string | null>(null);
  const [fieldNote, setFieldNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!profile || !profile.guildId) {
    return (
      <div className="py-12 text-center text-sm text-ink-muted">
        Please join a guild first.
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64Compressed(file);
      setPreview(base64);
      toast("Photo ready for submission.");
    } catch (err) {
      toast("Failed to compress image.");
    }
  };

  const handleSubmit = async () => {
    if (!preview) {
      toast("Please select or capture a proof photo first.");
      return;
    }

    if (!profile.guildId) {
      toast("No active guild found for this profile.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProofOfWork({
        userId: profile.id,
        authorName: profile.name,
        guildId: profile.guildId,
        questId: activeQuest.id,
        questTitle: activeQuest.title,
        attribute: activeQuest.attribute,
        attributeLabel: activeQuest.attributeLabel,
        xpReward: activeQuest.xpReward,
        photoBase64: preview,
        fieldNote: fieldNote || "Completed real-world interaction in person.",
      });

      toast("Proof published to guild feed!");
      router.push("/guild");
    } catch (err) {
      toast("Failed to publish proof.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Submit proof
        </h2>
      </div>

      <div className="space-y-4">
        <div className="p-5 rounded-2xl border border-border-subtle bg-canvas-card space-y-3">
          <span className="text-xs font-medium text-attribute-social">
            {activeQuest.attributeLabel} · +{activeQuest.xpReward} XP
          </span>
          <h3 className="text-base font-medium text-ink-primary leading-snug">
            {activeQuest.title}
          </h3>
          <p className="text-sm text-ink-secondary leading-relaxed">
            {activeQuest.description}
          </p>

          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-medium text-ink-secondary">
              Consensus Rules:
            </h4>
            <ul className="text-xs text-ink-muted space-y-1.5 list-disc list-inside">
              <li>Must be an authentic, in-person interaction.</li>
              <li>Photo must clearly show proof of work.</li>
              <li>Requires 2 guild vouches before XP modifies your amoeba.</li>
            </ul>
          </div>
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
              Photo Evidence
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
                  Retake photo
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
                <p className="text-xs text-ink-muted">
                  Auto-compressed on device
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Field Note (Optional)
            </label>
            <textarea
              rows={3}
              value={fieldNote}
              onChange={(e) => setFieldNote(e.target.value)}
              placeholder="Add brief details about the real-world deed..."
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
          Loading quest...
        </div>
      }
    >
      <SubmitProofContent />
    </Suspense>
  );
}
