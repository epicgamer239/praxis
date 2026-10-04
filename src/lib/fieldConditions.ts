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

const FIELD_CACHE_KEY = "praxis_field_v3";
const COORDS_KEY = "praxis_coords_v1";
const DENIED_KEY = "praxis_geo_denied_v1";

/** Weather/place payload TTL. */
const FIELD_CACHE_MS = 45 * 60 * 1000;
/** Reuse last coords without a new GPS prompt. */
const COORDS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Skip GPS entirely for a while after an explicit deny. */
const DENIED_TTL_MS = 24 * 60 * 60 * 1000;
/** Prefer cached coords (no GPS) when younger than this. */
const COORDS_FRESH_MS = 6 * 60 * 60 * 1000;

type StoredCoords = { lat: number; lon: number; at: number };

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

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function readFieldCache(): FieldConditions | null {
  const parsed = readStorage<FieldConditions>(FIELD_CACHE_KEY);
  if (!parsed?.fetchedAt) return null;
  if (Date.now() - parsed.fetchedAt > FIELD_CACHE_MS) return null;
  // Never treat a stale "location off" snap as a hit — allow retry.
  if (parsed.mood === "unknown" && !parsed.place) return null;
  return parsed;
}

function writeFieldCache(snap: FieldConditions) {
  writeStorage(FIELD_CACHE_KEY, snap);
}

function readCoords(): StoredCoords | null {
  const parsed = readStorage<StoredCoords>(COORDS_KEY);
  if (!parsed || typeof parsed.lat !== "number" || typeof parsed.lon !== "number") {
    return null;
  }
  if (Date.now() - parsed.at > COORDS_TTL_MS) return null;
  return parsed;
}

function writeCoords(lat: number, lon: number) {
  writeStorage(COORDS_KEY, { lat, lon, at: Date.now() } satisfies StoredCoords);
}

function wasDeniedRecently(): boolean {
  const at = readStorage<number>(DENIED_KEY);
  if (typeof at !== "number") return false;
  return Date.now() - at < DENIED_TTL_MS;
}

function markDenied() {
  writeStorage(DENIED_KEY, Date.now());
}

function clearDenied() {
  try {
    localStorage.removeItem(DENIED_KEY);
  } catch {
    /* ignore */
  }
}

function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as GeolocationPositionError).code === 1
  );
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
      // Prefer a cached OS fix so iOS rarely resurfaces the prompt.
      maximumAge: COORDS_FRESH_MS,
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

async function fetchFieldForCoords(
  lat: number,
  lon: number,
): Promise<FieldConditions> {
  const res = await fetch(
    `/api/field?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
  );
  if (!res.ok) throw new Error("Field API failed");
  return (await res.json()) as FieldConditions;
}

/** Kick off location + weather from a user gesture (e.g. Tap to enter). */
export function primeFieldAccess(): void {
  void fetchFieldConditions();
}

/** Client entry: geolocate (when needed), then hit our field aggregator API. */
export async function fetchFieldConditions(): Promise<FieldConditions> {
  const cached = readFieldCache();
  if (cached) return cached;

  const coords = readCoords();

  // After an explicit deny, never re-prompt this day — weather from last coords if any.
  if (wasDeniedRecently()) {
    if (coords) {
      try {
        const data = await fetchFieldForCoords(coords.lat, coords.lon);
        writeFieldCache(data);
        return data;
      } catch {
        /* fall through */
      }
    }
    return fallback();
  }

  // Warm coords: refresh weather only, skip a new GPS round-trip/prompt.
  if (coords && Date.now() - coords.at < COORDS_FRESH_MS) {
    try {
      const data = await fetchFieldForCoords(coords.lat, coords.lon);
      writeFieldCache(data);
      return data;
    } catch {
      /* try live GPS below */
    }
  }

  try {
    const pos = await getPosition();
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    writeCoords(lat, lon);
    clearDenied();
    const data = await fetchFieldForCoords(lat, lon);
    writeFieldCache(data);
    return data;
  } catch (err) {
    if (isPermissionDenied(err)) markDenied();

    if (coords) {
      try {
        const data = await fetchFieldForCoords(coords.lat, coords.lon);
        writeFieldCache(data);
        return data;
      } catch {
        /* fall through */
      }
    }
    // Do not persist the empty fallback — next open can retry if appropriate.
    return fallback();
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
