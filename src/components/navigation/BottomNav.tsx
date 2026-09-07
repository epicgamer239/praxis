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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              <Icon size={24} strokeWidth={isActive ? 2.35 : 1.75} />
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
