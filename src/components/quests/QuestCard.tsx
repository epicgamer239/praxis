// src/components/quests/QuestCard.tsx
import React from "react";
import Link from "next/link";
import {
  RefreshCw,
  Users,
  Compass,
  Flame,
  BookOpen,
  Star,
  Zap,
  Camera,
} from "lucide-react";
import { Quest } from "@/types";
import { cn } from "@/lib/utils";

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

function parseQuestMetadata(quest: Quest) {
  let category = quest.attributeLabel || "Quest";
  let xp = typeof quest.xpReward === "number" ? quest.xpReward : 50;
  let difficulty =
    typeof quest.difficulty === "number" ? quest.difficulty : null;

  // Safe check if raw string like "Social · +100 XP · Difficulty 3/5" was supplied
  const raw = quest.attributeLabel || "";
  const match = raw.match(
    /^([^·]+?)\s*·\s*\+?(\d+)\s*XP(?:\s*·\s*(?:Difficulty\s*)?(\d+(?:\/\d+)?))?/i,
  );
  if (match) {
    category = match[1].trim();
    xp = parseInt(match[2], 10) || xp;
    if (match[3]) {
      difficulty = parseInt(match[3], 10) || difficulty;
    }
  }

  return { category, xp, difficulty };
}

const ATTRIBUTE_BG: Record<string, string> = {
  neighborhood: "bg-yellow-500",
  energy: "bg-green-500",
  social: "bg-orange-500",
  wisdom: "bg-sky-400",
};

function getCategoryBadge(attribute: string, category: string) {
  switch (attribute) {
    case "social":
      return {
        icon: <Users size={14} className="shrink-0 text-orange-500" />,
        label: category || "Social",
      };
    case "energy":
      return {
        icon: <Flame size={14} className="shrink-0 text-green-500" />,
        label: category || "Energy",
      };
    case "wisdom":
      return {
        icon: <BookOpen size={14} className="shrink-0 text-sky-400" />,
        label: category || "Wisdom",
      };
    case "neighborhood":
    default:
      return {
        icon: <Compass size={14} className="shrink-0 text-yellow-500" />,
        label: category || "Neighborhood",
      };
  }
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

  const { category, xp, difficulty } = parseQuestMetadata(quest);
  const categoryBadge = getCategoryBadge(quest.attribute, category);

  return (
    <div
      className={cn(
        "pl-3 py-3 border-l-4 space-y-2.5",
        BORDER_L[quest.attribute] || "border-l-border-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Structural, high-density metadata tag row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
              {categoryBadge.icon}
              <span>{categoryBadge.label}</span>
            </span>

            <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
              <Star size={14} className="shrink-0 text-amber-400" />
              <span>+{xp} XP</span>
            </span>

            {difficulty !== null && (
              <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
                <Zap size={14} className="shrink-0 text-blue-400" />
                <span>{difficulty}/5</span>
              </span>
            )}
          </div>

          <h3 className="mt-2 text-white font-semibold text-base leading-snug">
            {quest.title}
          </h3>
          <p className="mt-1 text-gray-400 text-sm leading-snug">
            {quest.description}
          </p>
        </div>

        {awaiting && (
          <span className="shrink-0 text-xs font-medium text-attribute-neighborhood tabular-nums pt-0.5">
            {quest.vouchesReceived || 0}/{quest.requiredVouches || 2}
          </span>
        )}
        {verified && (
          <span className="shrink-0 text-xs font-medium text-attribute-energy pt-0.5">
            Done
          </span>
        )}
      </div>

      {awaiting && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-4">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              ATTRIBUTE_BG[quest.attribute] || "bg-yellow-500",
            )}
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
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-end justify-between gap-3">
          <div className="flex items-start gap-1.5 min-w-0 flex-1">
            <Camera size={14} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-snug min-w-0">
              {quest.requiredProof}
            </p>
          </div>
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
  );
}
