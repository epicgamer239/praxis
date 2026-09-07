"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Users, Camera, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Compass,
    title: "Praxis",
    body: "The real-world social action RPG. Quests happen outside the phone.",
  },
  {
    icon: Users,
    title: "Your guild keeps you honest",
    body: "Friends vouch for your deeds. You only level up when they confirm it happened.",
  },
  {
    icon: Camera,
    title: "Proof, then progress",
    body: "Snap a photo, publish it to your circle, and watch your attributes grow.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <div className="onboard">
      <div className="onboard__progress" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={i <= step ? "is-on" : ""} />
        ))}
      </div>

      <div className="onboard__hero">
        <div className="onboard__icon">
          <Icon size={44} strokeWidth={1.55} />
        </div>
        <h1>{current.title}</h1>
        <p>{current.body}</p>
      </div>

      <div className="onboard__actions">
        {last ? (
          <>
            <button
              type="button"
              className="praxis-btn praxis-btn--pill"
              onClick={() => router.push("/signup")}
            >
              Create account
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="praxis-btn praxis-btn--ghost praxis-btn--pill"
              onClick={() => router.push("/login")}
            >
              I already have an account
            </button>
          </>
        ) : (
          <button
            type="button"
            className="praxis-btn praxis-btn--pill"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}
