// src/app/api/quests/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  geminiQuestPrompt,
  placeCacheKey,
  validateGeneratedQuests,
  GeneratedBankQuest,
} from "@/lib/generatedQuests";
import { WeatherMood } from "@/lib/fieldConditions";

export const runtime = "nodejs";

type CacheEntry = { quests: GeneratedBankQuest[]; cachedAt: number };
const memory = new Map<string, CacheEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

function geminiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.gemini_key
  );
}

async function callGemini(prompt: string): Promise<unknown> {
  const key = geminiKey();
  if (!key) throw new Error("Missing gemini_key");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  return JSON.parse(cleaned);
}

export async function GET(req: NextRequest) {
  const place = (req.nextUrl.searchParams.get("place") || "").trim();
  const dateStr = req.nextUrl.searchParams.get("date") || "";
  const mood = (req.nextUrl.searchParams.get("mood") || "unknown") as WeatherMood;
  const weatherLabel =
    req.nextUrl.searchParams.get("weather") || "Weather unknown";
  const airLabel = req.nextUrl.searchParams.get("air") || "Air unknown";

  if (!place || place.length < 2) {
    return NextResponse.json({ quests: [], source: "none" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const cacheId = placeCacheKey(place, dateStr, mood);
  const hit = memory.get(cacheId);
  if (hit && Date.now() - hit.cachedAt < DAY_MS) {
    return NextResponse.json({
      quests: hit.quests,
      source: "cache",
      cacheId,
    });
  }

  if (!geminiKey()) {
    return NextResponse.json({
      quests: [],
      source: "missing_key",
      error: "gemini_key not set",
    });
  }

  try {
    const raw = await callGemini(
      geminiQuestPrompt({ place, mood, weatherLabel, airLabel }),
    );
    const quests = validateGeneratedQuests(raw);
    if (quests.length >= 4) {
      memory.set(cacheId, { quests, cachedAt: Date.now() });
    }
    return NextResponse.json({
      quests,
      source: "gemini",
      cacheId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate failed";
    return NextResponse.json(
      { quests: [], source: "error", error: message },
      { status: 200 },
    );
  }
}
