// src/components/guild/ActivityFeed.tsx
import React from "react";
import Link from "next/link";
import { GuildActivityItem } from "@/types";
import { formatActivityTime } from "@/lib/guildActivity";

interface ActivityFeedProps {
  items: GuildActivityItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-ink-muted px-1">
        Guild activity shows up here as people submit and verify.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const row = (
          <div
            className={`flex items-start justify-between gap-3 pl-3 py-2 border-l-4 ${
              item.kind === "verified"
                ? "border-l-attribute-energy"
                : "border-l-attribute-neighborhood"
            }`}
          >
            <p className="text-xs text-ink-secondary leading-snug min-w-0">
              <span
                className={
                  item.kind === "verified"
                    ? "text-attribute-energy font-medium"
                    : "text-attribute-neighborhood font-medium"
                }
              >
                {item.kind === "verified" ? "Verified · " : "Needs vouch · "}
              </span>
              {item.text}
            </p>
            <span className="text-[11px] text-ink-muted shrink-0 pt-0.5 tabular-nums">
              {formatActivityTime(item.atMs)}
            </span>
          </div>
        );

        return (
          <li key={item.id}>
            {item.href ? <Link href={item.href}>{row}</Link> : row}
          </li>
        );
      })}
    </ul>
  );
}
