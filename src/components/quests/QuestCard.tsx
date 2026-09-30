// src/components/quests/QuestCard.tsx
import React from "react";
import Link from "next/link";
import { Quest } from "@/types";
import { ATTRIBUTE_BG, ATTRIBUTE_TEXT, cn } from "@/lib/utils";

interface QuestCardProps {
  quest: Quest;
}

export default function QuestCard({ quest }: QuestCardProps) {
  const pending = !quest.status || quest.status === "pending";
  const awaiting = quest.status === "awaiting_vouches";
  const verified = quest.status === "verified";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-canvas-card",
        verified ? "border-attribute-energy/40" : "border-border-subtle",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          ATTRIBUTE_BG[quest.attribute],
        )}
      />

      <div className="pl-5 pr-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                ATTRIBUTE_TEXT[quest.attribute],
              )}
            >
              {quest.attributeLabel} · +{quest.xpReward} XP
            </p>
            <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink-primary leading-snug">
              {quest.title}
            </h3>
            <p className="mt-1.5 text-sm text-ink-secondary leading-relaxed">
              {quest.description}
            </p>
          </div>

          {awaiting && (
            <span className="shrink-0 text-[11px] font-medium text-attribute-neighborhood pt-0.5">
              {quest.vouchesReceived || 0}/{quest.requiredVouches || 2}
            </span>
          )}
          {verified && (
            <span className="shrink-0 text-[11px] font-medium text-attribute-energy pt-0.5">
              ✓ Done
            </span>
          )}
        </div>

        {awaiting && (
          <div className="mt-3 h-1.5 rounded-full bg-canvas-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-attribute-neighborhood transition-[width] duration-500"
              style={{
                width: `${Math.min(
                  100,
                  10 +
                    ((quest.vouchesReceived || 0) /
                      (quest.requiredVouches || 2)) *
                      90,
                )}%`,
              }}
            />
          </div>
        )}

        {quest.vouchedBy && quest.vouchedBy.length > 0 && (
          <p className="text-xs text-ink-muted mt-2.5">
            Vouched by {quest.vouchedBy.join(" and ")}
          </p>
        )}

        {pending && (
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-xs text-ink-muted leading-snug min-w-0 flex-1">
              Proof: {quest.requiredProof}
            </p>
            <Link
              href={`/submit?questId=${quest.id}`}
              className="shrink-0 inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-primary bg-moss hover:bg-moss-hover transition-colors"
            >
              Submit proof
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
