// src/components/guild/ActivityFeed.tsx
import React from "react";
import Link from "next/link";
import { GuildActivityItem } from "@/types";
import { formatActivityTime } from "@/lib/guildActivity";

interface ActivityFeedProps {
  items: GuildActivityItem[];
}

function parseActivityItem(item: GuildActivityItem) {
  const isVerified = item.kind === "verified";
  const cleaned = item.text
    .replace(/^(?:Verified|Needs vouch)\s*·\s*/i, "")
    .trim();

  if (isVerified) {
    // Expected pattern: "Name locked in “Title” · Category"
    const match = cleaned.match(
      /^(.+?)\s+(?:locked in|verified)\s+[“"'](.+?)[”"']\s*·\s*(.+)$/i,
    );
    if (match) {
      return {
        isParsed: true,
        kind: "verified" as const,
        name: match[1].trim(),
        title: match[2].trim(),
        category: match[3].trim(),
      };
    }
  } else {
    // Expected pattern: "Name · “Title” · X left"
    const match = cleaned.match(
      /^(.+?)\s*·\s*[“"'](.+?)[”"']\s*·\s*(.+)$/i,
    );
    if (match) {
      return {
        isParsed: true,
        kind: "submitted" as const,
        name: match[1].trim(),
        title: match[2].trim(),
        details: match[3].trim(),
      };
    }
  }

  return {
    isParsed: false,
    raw: item.text,
  };
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
        const parsed = parseActivityItem(item);
        const timeStr = formatActivityTime(item.atMs);

        const row = (
          <div
            className={`pl-3 py-2 border-l-4 ${
              item.kind === "verified"
                ? "border-l-attribute-energy"
                : "border-l-attribute-neighborhood"
            }`}
          >
            {/* Top line: Name + action + timestamp flush right */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <p className="text-xs text-ink-primary font-medium truncate">
                {parsed.isParsed && parsed.kind === "verified" ? (
                  <>
                    <span className="font-semibold text-white">
                      {parsed.name}
                    </span>{" "}
                    verified a{" "}
                    <span className="text-attribute-energy font-semibold">
                      {parsed.category}
                    </span>{" "}
                    deed.
                  </>
                ) : parsed.isParsed && parsed.kind === "submitted" ? (
                  <>
                    <span className="font-semibold text-white">
                      {parsed.name}
                    </span>{" "}
                    submitted a deed{" "}
                    <span className="text-attribute-neighborhood font-normal">
                      ({parsed.details})
                    </span>
                  </>
                ) : (
                  <span>{item.text}</span>
                )}
              </p>
              {timeStr && (
                <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                  {timeStr}
                </span>
              )}
            </div>

            {/* Bottom line: Title of the quest in faint text-gray-400 text-xs */}
            {parsed.isParsed && (
              <p className="text-gray-400 text-xs truncate mt-0.5">
                {parsed.title}
              </p>
            )}
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
