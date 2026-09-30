// src/app/api/field/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  airBandFromAqi,
  airLabel,
  effectiveMood,
  FieldConditions,
  weatherHint,
} from "@/lib/fieldConditions";
import { WeatherMood } from "@/lib/fieldConditions";

export const runtime = "edge";

function wmoLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Mixed";
}

function moodFrom(code: number, tempF: number): WeatherMood {
  if (code >= 51 && code <= 86) return "rain";
  if (code >= 95) return "rain";
  if (tempF <= 40) return "cold";
  if (tempF >= 86) return "hot";
  return "fair";
}

function formatClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function daylightHint(
  sunriseIso: string | null | undefined,
  sunsetIso: string | null | undefined,
  isDay: boolean | null | undefined,
): string | null {
  const rise = formatClock(sunriseIso);
  const set = formatClock(sunsetIso);
  if (isDay === false && rise) return `Night · sunrise ${rise}`;
  if (isDay === true && set) return `Daylight · sunset ${set}`;
  if (rise && set) return `Sunrise ${rise} · sunset ${set}`;
  return null;
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&daily=sunrise,sunset` +
    `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=us_aqi&timezone=auto`;

  const placeUrl =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  const sources: string[] = [];
  const [weatherRes, airRes, placeRes] = await Promise.all([
    fetch(weatherUrl, { next: { revalidate: 1800 } }),
    fetch(airUrl, { next: { revalidate: 1800 } }),
    fetch(placeUrl, { next: { revalidate: 3600 } }),
  ]);

  let tempF: number | null = null;
  let code: number | null = null;
  let isDay: boolean | null = null;
  let sunrise: string | null = null;
  let sunset: string | null = null;
  let weatherMood: WeatherMood = "unknown";

  if (weatherRes.ok) {
    sources.push("Open-Meteo Forecast");
    const weather = (await weatherRes.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        is_day?: number;
      };
      daily?: { sunrise?: string[]; sunset?: string[] };
    };
    tempF = weather.current?.temperature_2m ?? null;
    code = weather.current?.weather_code ?? null;
    isDay =
      typeof weather.current?.is_day === "number"
        ? weather.current.is_day === 1
        : null;
    sunrise = weather.daily?.sunrise?.[0] ?? null;
    sunset = weather.daily?.sunset?.[0] ?? null;
    if (tempF != null && code != null) weatherMood = moodFrom(code, tempF);
  }

  let aqi: number | null = null;
  if (airRes.ok) {
    sources.push("Open-Meteo Air Quality");
    const air = (await airRes.json()) as {
      current?: { us_aqi?: number };
    };
    aqi = air.current?.us_aqi ?? null;
  }

  let place: string | null = null;
  if (placeRes.ok) {
    sources.push("BigDataCloud Geocoder");
    const geo = (await placeRes.json()) as {
      city?: string;
      locality?: string;
      principalSubdivisionCode?: string;
      countryName?: string;
    };
    const city = geo.city || geo.locality;
    const region = geo.principalSubdivisionCode?.replace(/^[A-Z]{2}-/, "") || "";
    if (city && region) place = `${city}, ${region}`;
    else if (city) place = city;
    else if (geo.countryName) place = geo.countryName;
  }

  const airBand = airBandFromAqi(aqi);
  const mood = effectiveMood(weatherMood, airBand);
  const weatherLabel =
    tempF != null && code != null
      ? `${Math.round(tempF)}° · ${wmoLabel(code)}`
      : "Weather unavailable";
  const outdoorOk = airBand !== "unhealthy" && mood !== "rain";
  const dayHint = daylightHint(sunrise, sunset, isDay);
  const hint = weatherHint(mood, airBand);

  const summaryParts = [
    place,
    weatherLabel !== "Weather unavailable" ? weatherLabel : null,
    airLabel(airBand, aqi),
    dayHint,
  ].filter(Boolean);

  const body: FieldConditions = {
    mood,
    tempF,
    weatherLabel,
    place,
    aqi,
    airBand,
    airLabel: airLabel(airBand, aqi),
    sunrise,
    sunset,
    isDay,
    daylightHint: dayHint,
    outdoorOk,
    summary: summaryParts.join(" · ") || hint,
    sources,
    lat,
    lon,
    fetchedAt: Date.now(),
  };

  return NextResponse.json(body);
}
