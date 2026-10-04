"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/navigation/BottomNav";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { unlockAudio } from "@/lib/sounds";
import { enableDeviceHeading } from "@/lib/deviceHeading";
import { primeFieldAccess } from "@/lib/fieldConditions";
import SplashScreen from "@/components/fx/SplashScreen";

const OPEN_ROUTES = new Set(["/welcome", "/login", "/signup"]);
const ENTERED_KEY = "praxis_session_entered";

function readEntered(): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isOpen = OPEN_ROUTES.has(pathname);
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);

  usePresenceHeartbeat(user?.uid);

  useEffect(() => {
    setEntered(readEntered());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!entered) return;
    const onGesture = () => {
      void unlockAudio();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("touchstart", onGesture, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };
  }, [entered]);

  useEffect(() => {
    if (loading || !entered) return;
    if (!user && !isOpen) {
      router.replace("/welcome");
    }
    if (user && isOpen) {
      router.replace("/");
    }
  }, [loading, user, isOpen, router, entered]);

  const handleEnter = () => {
    try {
      sessionStorage.setItem(ENTERED_KEY, "1");
    } catch {
      /* ignore */
    }
    // Backup if splash already fired these — safe no-ops when armed/cached.
    void unlockAudio();
    void enableDeviceHeading();
    primeFieldAccess();
    setEntered(true);
  };

  // Avoid flash before we know session state
  if (!ready) {
    return <SplashScreen />;
  }

  if (!entered) {
    return <SplashScreen needsTap onEnter={handleEnter} />;
  }

  if (loading || (!user && !isOpen)) {
    return <SplashScreen />;
  }

  if (!user || isOpen) {
    return <div className="app-screen">{children}</div>;
  }

  return (
    <div className="praxis-shell">
      <main className="praxis-main">
        <div className="max-w-lg mx-auto min-h-full">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
