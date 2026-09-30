// src/components/navigation/Sidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { subscribeToGuildSubmissions } from "@/lib/firestoreService";
import { countPendingVouchesForYou } from "@/lib/guildActivity";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const [verifyCount, setVerifyCount] = useState(0);

  useEffect(() => {
    if (!profile?.guildId || !profile?.id) {
      setVerifyCount(0);
      return;
    }
    return subscribeToGuildSubmissions(profile.guildId, (subs) => {
      setVerifyCount(countPendingVouchesForYou(subs, profile.id));
    });
  }, [profile?.guildId, profile?.id]);

  if (pathname === "/login") return null;

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Verify", href: "/verify" },
    { label: "Guild", href: "/guild" },
    { label: "You", href: "/profile" },
  ];

  return (
    <aside className="praxis-sidebar w-64 h-screen sticky top-0 flex-col justify-between border-r border-border-subtle bg-canvas-card p-6 select-none shrink-0">
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
            Praxis
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            {profile?.guildName || "No Guild Active"}
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const showBadge = item.href === "/verify" && verifyCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-canvas-subtle text-ink-primary"
                    : "text-ink-secondary hover:bg-canvas-subtle hover:text-ink-primary",
                )}
              >
                <span>{item.label}</span>
                {showBadge && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-attribute-neighborhood text-[10px] font-bold text-ink-primary flex items-center justify-center">
                    {verifyCount > 9 ? "9+" : verifyCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-border-subtle">
        {user && profile ? (
          <>
            <p className="text-sm font-medium text-ink-primary">
              {profile.name}
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {profile.streakDays}-day streak · {profile.title}
            </p>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="text-xs text-ink-muted hover:text-ink-primary mt-3 transition-colors block"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs text-ink-primary hover:underline"
          >
            Sign in to your account →
          </Link>
        )}
      </div>
    </aside>
  );
}
