// src/components/navigation/BottomNav.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Camera, Users, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Submit", href: "/submit", icon: Camera },
  { label: "Guild", href: "/guild", icon: Users },
  { label: "You", href: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || pathname === "/login") return null;

  return createPortal(
    <nav className="praxis-bottom-nav" aria-label="Primary">
      <div className="praxis-bottom-nav__grid">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

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
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}
