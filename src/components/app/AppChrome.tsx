"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/navigation/BottomNav";
import MobileHeader from "@/components/navigation/MobileHeader";

const OPEN_ROUTES = new Set(["/welcome", "/login", "/signup"]);

function Splash() {
  return (
    <div className="app-screen app-splash">
      <p className="app-splash__mark">Praxis</p>
    </div>
  );
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isOpen = OPEN_ROUTES.has(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isOpen) {
      router.replace("/welcome");
    }
    if (user && isOpen) {
      router.replace("/");
    }
  }, [loading, user, isOpen, router]);

  if (loading) {
    return <Splash />;
  }

  if (!user && !isOpen) {
    return <Splash />;
  }

  if (!user || isOpen) {
    return <div className="app-screen">{children}</div>;
  }

  return (
    <div className="praxis-shell">
      <MobileHeader />
      <main className="praxis-main">
        <div className="max-w-lg mx-auto min-h-full">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
