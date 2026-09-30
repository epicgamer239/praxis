"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BadgeCheck, Users, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToGuildSubmissions } from "@/lib/firestoreService";
import { countPendingVouchesForYou } from "@/lib/guildActivity";

const navItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Verify", href: "/verify", icon: BadgeCheck },
  { label: "Guild", href: "/guild", icon: Users },
  { label: "You", href: "/profile", icon: User },
];

function pinToLargeViewport(nav: HTMLElement) {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;height:100lvh;width:0;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const large = probe.getBoundingClientRect().height || window.innerHeight;
  probe.remove();

  const vv = window.visualViewport;
  const visualH = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  nav.style.bottom = `${visualH + offsetTop - large}px`;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [verifyCount, setVerifyCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!profile?.guildId || !profile?.id) {
      setVerifyCount(0);
      return;
    }
    return subscribeToGuildSubmissions(profile.guildId, (subs) => {
      setVerifyCount(countPendingVouchesForYou(subs, profile.id));
    });
  }, [profile?.guildId, profile?.id]);

  useEffect(() => {
    if (!mounted) return;

    const nav = document.querySelector(".praxis-bottom-nav");
    if (!(nav instanceof HTMLElement)) return;

    const pin = () => pinToLargeViewport(nav);
    pin();

    window.visualViewport?.addEventListener("resize", pin);
    window.visualViewport?.addEventListener("scroll", pin);
    window.addEventListener("resize", pin);
    return () => {
      window.visualViewport?.removeEventListener("resize", pin);
      window.visualViewport?.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
    };
  }, [mounted, pathname]);

  const nav = (
    <nav className="praxis-bottom-nav" aria-label="Primary">
      <div className="praxis-bottom-nav__grid">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/verify" && verifyCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "praxis-bottom-nav__link is-active"
                  : "praxis-bottom-nav__link"
              }
            >
              <span className="praxis-bottom-nav__icon">
                <Icon size={24} strokeWidth={isActive ? 2.35 : 1.75} />
                {showBadge && (
                  <span className="praxis-bottom-nav__badge">
                    {verifyCount > 9 ? "9+" : verifyCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) return nav;
  return createPortal(nav, document.body);
}
