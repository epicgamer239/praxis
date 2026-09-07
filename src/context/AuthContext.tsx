// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, db, firebaseConfigReady } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function buildDefaultProfile(
  uid: string,
  email: string,
  name: string,
): UserProfile {
  return {
    id: uid,
    email,
    name: name || "Adventurer",
    title: "Level 1 Novice",
    guildId: null,
    guildName: null,
    level: 1,
    streakDays: 0,
    lastActiveDate: "",
    activeDates: [],
    totalVerifiedDeeds: 0,
    attributes: {
      wisdom: { level: 1, currentXp: 0, maxXp: 100, verifiedCount: 0 },
      social: { level: 1, currentXp: 0, maxXp: 100, verifiedCount: 0 },
      civic: { level: 1, currentXp: 0, maxXp: 100, verifiedCount: 0 },
      vitality: { level: 1, currentXp: 0, maxXp: 100, verifiedCount: 0 },
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigReady) {
      setAuthError("Firebase config is missing.");
      setLoading(false);
      return;
    }

    let unsubProfile: (() => void) | null = null;
    let cancelled = false;

    const clearProfileListener = () => {
      unsubProfile?.();
      unsubProfile = null;
    };

    // Auth session check only — do not wait on Firestore to show the login form.
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (cancelled) return;
        setUser(firebaseUser);
        setLoading(false);

        clearProfileListener();

        if (!firebaseUser) {
          setProfile(null);
          return;
        }

        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubProfile = onSnapshot(
          userDocRef,
          async (snap) => {
            if (cancelled) return;
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
              setAuthError(null);
              return;
            }
            try {
              const existing = await getDoc(userDocRef);
              if (existing.exists()) {
                setProfile(existing.data() as UserProfile);
                return;
              }
              const created = buildDefaultProfile(
                firebaseUser.uid,
                firebaseUser.email || "",
                firebaseUser.displayName || "Adventurer",
              );
              await setDoc(userDocRef, created);
              setProfile(created);
            } catch (err: unknown) {
              const message =
                err instanceof Error ? err.message : "Failed to load profile";
              setAuthError(message);
            }
          },
          (err) => {
            setAuthError(err.message || "Failed to load profile");
          },
        );
      },
      (err) => {
        setAuthError(err.message || "Auth failed");
        setLoading(false);
      },
    );

    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      clearProfileListener();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Redirect never returns to LAN / tunnel origins (it goes to authDomain).
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const signUpWithEmail = async (e: string, p: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    if (cred.user) {
      const userDocRef = doc(db, "users", cred.user.uid);
      await setDoc(userDocRef, buildDefaultProfile(cred.user.uid, e, name));
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
