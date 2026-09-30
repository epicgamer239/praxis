// src/lib/weather.ts
/** Thin re-export so older imports keep working. */
export type { WeatherMood, FieldConditions as WeatherSnapshot } from "@/lib/fieldConditions";
export {
  fetchFieldConditions as fetchLocalWeather,
  weatherHint,
} from "@/lib/fieldConditions";
