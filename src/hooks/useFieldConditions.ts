// src/hooks/useFieldConditions.ts
"use client";

import { useEffect, useState } from "react";
import {
  CivicPulse,
  fetchCivicPulse,
  fetchFieldConditions,
  FieldConditions,
} from "@/lib/fieldConditions";

export function useFieldConditions() {
  const [field, setField] = useState<FieldConditions | null>(null);
  const [civic, setCivic] = useState<CivicPulse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFieldConditions()
      .then(async (snap) => {
        if (cancelled) return;
        setField(snap);
        if (snap.lat || snap.lon) {
          const pulse = await fetchCivicPulse(snap.lat, snap.lon);
          if (!cancelled) setCivic(pulse);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { field, civic, loading };
}
