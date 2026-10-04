// src/components/quests/QuestCard.tsx
import React from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Quest } from "@/types";
import { ATTRIBUTE_TEXT, cn } from "@/lib/utils";

const BORDER_L: Record<string, string> = {
  neighborhood: "border-l-attribute-neighborhood",
  energy: "border-l-attribute-energy",
  social: "border-l-attribute-social",
  wisdom: "border-l-attribute-wisdom",
};

interface QuestCardProps {
  quest: Quest;
  canReroll?: boolean;
  rerolling?: boolean;
  onReroll?: () => void;
}

export default function QuestCard({
  quest,
  canReroll = false,
  rerolling = false,
  onReroll,
}: QuestCardProps) {
  const pending = !quest.status || quest.status === "pending";
  const awaiting = quest.status === "awaiting_vouches";
  const verified = quest.status === "verified";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border-subtle bg-canvas-card border-l-4",
        BORDER_L[quest.attribute] || "border-l-border-strong",
        verified && "border-attribute-energy/35",
      )}
    >
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[12px] font-medium",
                ATTRIBUTE_TEXT[quest.attribute],
              )}
            >
              {quest.attributeLabel} · +{quest.xpReward} XP
              {typeof quest.difficulty === "number"
                ? ` · ${quest.difficulty}/5`
                : ""}
            </p>
            <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink-primary leading-snug">
              {quest.title}
            </h3>
            <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
              {quest.description}
            </p>
          </div>

          {awaiting && (
            <span className="shrink-0 text-[12px] font-medium text-attribute-neighborhood tabular-nums pt-0.5">
              {quest.vouchesReceived || 0}/{quest.requiredVouches || 2}
            </span>
          )}
          {verified && (
            <span className="shrink-0 text-[12px] font-medium text-attribute-energy pt-0.5">
              Done
            </span>
          )}
        </div>

        {awaiting && (
          <div className="mt-3 h-1 rounded bg-canvas-subtle overflow-hidden">
            <div
              className="h-full bg-attribute-neighborhood transition-[width] duration-500"
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
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-end justify-between gap-3">
            <p className="text-xs text-ink-muted leading-snug min-w-0 flex-1">
              Proof: {quest.requiredProof}
            </p>
            <div className="shrink-0 flex items-center gap-2">
              {canReroll && onReroll && (
                <button
                  type="button"
                  disabled={rerolling}
                  onClick={onReroll}
                  title="Reroll this quest"
                  aria-label="Reroll this quest"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted hover:text-ink-primary hover:bg-canvas-subtle disabled:opacity-40 transition-colors"
                >
                  <RefreshCw
                    size={15}
                    className={rerolling ? "animate-spin" : undefined}
                    strokeWidth={2}
                  />
                </button>
              )}
              <Link
                href={`/submit?questId=${quest.id}`}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-primary bg-moss hover:bg-moss-hover transition-colors"
              >
                Submit proof
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
