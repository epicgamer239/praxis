"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/navigation/BottomNav";
import MobileHeader from "@/components/navigation/MobileHeader";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { unlockAudio } from "@/lib/sounds";
import SplashScreen from "@/components/fx/SplashScreen";

const OPEN_ROUTES = new Set(["/welcome", "/login", "/signup"]);
const SPLASH_MIN_MS = 1100;

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isOpen = OPEN_ROUTES.has(pathname);
  const [bootHold, setBootHold] = useState(true);

  usePresenceHeartbeat(user?.uid);

  useEffect(() => {
    const t = window.setTimeout(() => setBootHold(false), SPLASH_MIN_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && !isOpen) {
      router.replace("/welcome");
    }
    if (user && isOpen) {
      router.replace("/");
    }
  }, [loading, user, isOpen, router]);

  const showSplash = bootHold || loading || (!user && !isOpen);

  if (showSplash) {
    return <SplashScreen />;
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
