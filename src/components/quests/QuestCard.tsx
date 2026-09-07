// src/components/quests/QuestCard.tsx
import React from "react";
import Link from "next/link";
import { Quest } from "@/types";
import { cn } from "@/lib/utils";

interface QuestCardProps {
  quest: Quest;
}

const attributeColorMap = {
  wisdom: "text-attribute-wisdom",
  social: "text-attribute-social",
  civic: "text-attribute-civic",
  vitality: "text-attribute-vitality",
};

export default function QuestCard({ quest }: QuestCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl border bg-canvas-card transition-colors",
        quest.status === "verified"
          ? "border-border-subtle opacity-75"
          : "border-border-subtle",
      )}
    >
      {/* Category Header & Status */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-xs font-medium",
            attributeColorMap[quest.attribute],
          )}
        >
          {quest.attributeLabel} · +{quest.xpReward} XP
        </span>
        {(!quest.status || quest.status === "pending") && (
          <span className="text-xs text-ink-muted">Pending submission</span>
        )}
        {quest.status === "awaiting_vouches" && (
          <span className="text-xs text-attribute-civic font-medium">
            {quest.vouchesReceived || 0} of {quest.requiredVouches || 2} vouches
            received
          </span>
        )}
        {quest.status === "verified" && (
          <span className="text-xs text-attribute-vitality font-medium">
            ✓ Verified & awarded
          </span>
        )}
      </div>

      {/* Quest Title & Description */}
      <h3 className="text-base font-medium text-ink-primary leading-snug">
        {quest.title}
      </h3>
      <p className="text-sm text-ink-secondary mt-1.5 leading-relaxed">
        {quest.description}
      </p>

      {/* Action Buttons based on status */}
      {(!quest.status || quest.status === "pending") && (
        <div className="mt-4 space-y-3">
          <div className="p-3 rounded-xl bg-canvas-subtle border border-border-subtle">
            <p className="text-xs text-ink-secondary">
              <span className="text-ink-primary font-medium">
                Required proof:
              </span>{" "}
              {quest.requiredProof}
            </p>
          </div>
          <Link href={`/submit?questId=${quest.id}`} className="praxis-btn">
            Submit proof
          </Link>
        </div>
      )}

      {/* Voucher Credits */}
      {quest.vouchedBy && quest.vouchedBy.length > 0 && (
        <p className="text-xs text-ink-muted mt-3">
          Vouched by {quest.vouchedBy.join(" and ")}
        </p>
      )}
    </div>
  );
}
