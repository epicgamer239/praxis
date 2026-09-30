// src/lib/fieldConditions.ts

export type WeatherMood = "fair" | "rain" | "cold" | "hot" | "unknown";

export type AirBand = "good" | "moderate" | "unhealthy" | "unknown";

export type FieldConditions = {
  mood: WeatherMood;
  tempF: number | null;
  weatherLabel: string;
  place: string | null;
  aqi: number | null;
  airBand: AirBand;
  airLabel: string;
  sunrise: string | null;
  sunset: string | null;
  isDay: boolean | null;
  daylightHint: string | null;
  outdoorOk: boolean;
  summary: string;
  sources: string[];
  lat: number;
  lon: number;
  fetchedAt: number;
};

export type CivicPulse = {
  name: string;
  party: string | null;
  state: string | null;
  district: string | null;
  phone: string | null;
  link: string | null;
};

const CACHE_KEY = "praxis_field_v2";
const CACHE_MS = 30 * 60 * 1000;

export function airBandFromAqi(aqi: number | null): AirBand {
  if (aqi == null || Number.isNaN(aqi)) return "unknown";
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  return "unhealthy";
}

export function airLabel(band: AirBand, aqi: number | null): string {
  if (band === "unknown" || aqi == null) return "Air quality unavailable";
  if (band === "good") return `AQI ${aqi} · Good`;
  if (band === "moderate") return `AQI ${aqi} · Moderate`;
  return `AQI ${aqi} · Unhealthy outdoors`;
}

export function effectiveMood(
  weatherMood: WeatherMood,
  airBand: AirBand,
): WeatherMood {
  if (airBand === "unhealthy" && weatherMood !== "rain") {
    // Bad air should push indoor picks like rain does.
    return weatherMood === "unknown" ? "rain" : "rain";
  }
  if (airBand === "moderate" && weatherMood === "fair") return "hot";
  return weatherMood;
}

export function weatherHint(mood: WeatherMood, airBand: AirBand): string {
  if (airBand === "unhealthy") return "Poor air — leaning indoor";
  switch (mood) {
    case "rain":
      return "Leaning indoor today";
    case "cold":
      return "Cold out — softer outdoor picks";
    case "hot":
      return "Hot / sticky — shorter outdoor picks";
    case "fair":
      return "Good day to get outside";
    default:
      return "Standard quests until location is on";
  }
}

function readCache(): FieldConditions | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldConditions;
    if (Date.now() - parsed.fetchedAt > CACHE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(snap: FieldConditions) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 15 * 60 * 1000,
    });
  });
}

function fallback(partial?: Partial<FieldConditions>): FieldConditions {
  return {
    mood: "unknown",
    tempF: null,
    weatherLabel: "Location off — standard quests",
    place: null,
    aqi: null,
    airBand: "unknown",
    airLabel: "Air quality unavailable",
    sunrise: null,
    sunset: null,
    isDay: null,
    daylightHint: null,
    outdoorOk: true,
    summary: "Turn on location for live field conditions.",
    sources: [],
    lat: 0,
    lon: 0,
    fetchedAt: Date.now(),
    ...partial,
  };
}

/** Client entry: geolocate, then hit our field aggregator API. */
export async function fetchFieldConditions(): Promise<FieldConditions> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const pos = await getPosition();
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const res = await fetch(
      `/api/field?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    );
    if (!res.ok) throw new Error("Field API failed");
    const data = (await res.json()) as FieldConditions;
    writeCache(data);
    return data;
  } catch {
    const snap = fallback();
    writeCache(snap);
    return snap;
  }
}

export async function fetchCivicPulse(
  lat: number,
  lon: number,
): Promise<CivicPulse | null> {
  if (!lat && !lon) return null;
  try {
    const res = await fetch(
      `/api/civic?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as CivicPulse | null;
  } catch {
    return null;
  }
}
