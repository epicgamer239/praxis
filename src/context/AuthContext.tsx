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
  updateProfile,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, db, firebaseConfigReady } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserProfile, Guild } from "@/types";
import {
  attributesNeedRewrite,
  defaultAttributes,
  normalizeAttributes,
} from "@/lib/attributes";

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
    totalVouchesGiven: 0,
    attributes: defaultAttributes(),
    rerollWeekStart: "",
    rerollsRemaining: 3,
    dailyQuestDate: "",
    dailyQuestIds: [],
    goalId: null,
    questDifficulty: 2,
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
              const data = snap.data() as UserProfile & {
                attributes?: Record<string, unknown>;
              };
              const attributes = normalizeAttributes(data.attributes);
              let currentProfile: UserProfile = { ...data, attributes };

              // Self-healing: If guildId was lost or wiped in the past,
              // check if the user is a member of an active guild in Firestore
              if (!currentProfile.guildId) {
                try {
                  const guildsQ = query(
                    collection(db, "guilds"),
                    where("memberIds", "array-contains", firebaseUser.uid),
                  );
                  const guildSnap = await getDocs(guildsQ);
                  if (!guildSnap.empty) {
                    const foundGuild = guildSnap.docs[0].data() as Guild;
                    currentProfile = {
                      ...currentProfile,
                      guildId: foundGuild.id,
                      guildName: foundGuild.name,
                    };
                    void updateDoc(userDocRef, {
                      guildId: foundGuild.id,
                      guildName: foundGuild.name,
                    }).catch(() => {});
                  }
                } catch {
                  /* best-effort heal */
                }
              }

              setProfile(currentProfile);
              setAuthError(null);
              if (attributesNeedRewrite(data.attributes as Record<string, unknown>)) {
                void updateDoc(userDocRef, { attributes }).catch(() => {
                  /* rewrite best-effort */
                });
              }
              return;
            }

            // CRITICAL FIX: If snapshot is from local cache and doc is missing in cache,
            // DO NOT assume user doesn't exist. Wait for server snapshot to arrive.
            if (snap.metadata.fromCache) {
              return;
            }

            try {
              // Confirm directly from server before creating a default profile
              const existing = await getDocFromServer(userDocRef);
              if (existing.exists()) {
                const data = existing.data() as UserProfile & {
                  attributes?: Record<string, unknown>;
                };
                const attributes = normalizeAttributes(data.attributes);
                setProfile({ ...data, attributes });
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
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const signUpWithEmail = async (e: string, p: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    if (cred.user) {
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
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
