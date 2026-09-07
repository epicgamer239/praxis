"use client";

import React, { useEffect, useState } from "react";

export default function SecureContextBanner() {
  const [host, setHost] = useState("");
  const [insecureLan, setInsecureLan] = useState(false);

  useEffect(() => {
    setHost(window.location.hostname);
    setInsecureLan(
      !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1",
    );
  }, []);

  if (!host || host === "localhost" || host.endsWith("vercel.app")) return null;

  return (
    <div className="p-4 rounded-2xl border border-attribute-social bg-canvas-card space-y-2">
      <p className="text-sm font-medium text-attribute-social">
        Add this host in Firebase or sign-in will fail
      </p>
      <p className="text-xs text-ink-secondary leading-relaxed">
        Firebase Console → Authentication → Settings → Authorized domains → add{" "}
        <span className="text-ink-primary">{host}</span>
        {insecureLan
          ? ". This is also plain HTTP, so the Home Screen icon will stay unreliable — use Safari only."
          : "."}
      </p>
    </div>
  );
}
