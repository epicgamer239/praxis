// src/components/guild/MemberAvatar.tsx
import React from "react";
import {
  avatarTone,
  formatPresence,
  initialsFromName,
  isOnline,
} from "@/lib/presence";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  userId: string;
  lastSeenAtMs: number | null;
  size?: "md" | "lg";
}

export default function MemberAvatar({
  name,
  userId,
  lastSeenAtMs,
  size = "md",
}: MemberAvatarProps) {
  const online = isOnline(lastSeenAtMs);

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center font-semibold",
          size === "lg" ? "h-14 w-14 text-base" : "h-11 w-11 text-sm",
          avatarTone(userId),
        )}
        title={formatPresence(lastSeenAtMs)}
      >
        {initialsFromName(name)}
      </div>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-canvas-card",
          online ? "bg-attribute-energy" : "bg-ink-muted/50",
        )}
        aria-label={online ? "Online" : "Offline"}
      />
    </div>
  );
}
