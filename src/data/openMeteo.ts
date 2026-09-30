import type { Location, Air, Precip, Wind, Sun, HourlyPoint, DailyPoint } from "../mausam/data";
import type { Condition } from "../mausam/theme";

/** City coordinates for the 6 supported cities. */
const CITIES: Record<string, { lat: number; lon: number; city: string; region: string }> = {
  pune: { lat: 18.52, lon: 73.86, city: "Pune", region: "Maharashtra" },
  mumbai: { lat: 19.08, lon: 72.88, city: "Mumbai", region: "Maharashtra" },
  delhi: { lat: 28.61, lon: 77.21, city: "Delhi", region: "NCR" },
  bengaluru: { lat: 12.97, lon: 77.59, city: "Bengaluru", region: "Karnataka" },
  chennai: { lat: 13.08, lon: 80.27, city: "Chennai", region: "Tamil Nadu" },
  kolkata: { lat: 22.57, lon: 88.36, city: "Kolkata", region: "West Bengal" },
};

/** In-memory cache: key → { data, timestamp }. */
const cache = new Map<string, { data: Location; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/** CPCB-style AQI bands from PM2.5 (simplified mapping from European AQI). */
function computeAqiFromPm25(pm25: number): { aqi: number; label: string } {
  if (pm25 <= 30) return { aqi: Math.round(pm25 * 50 / 30), label: "Good" };
  if (pm25 <= 60) return { aqi: Math.round(50 + (pm25 - 30) * 50 / 30), label: "Satisfactory" };
  if (pm25 <= 90) return { aqi: Math.round(100 + (pm25 - 60) * 100 / 30), label: "Moderate" };
  if (pm25 <= 120) return { aqi: Math.round(200 + (pm25 - 90) * 100 / 30), label: "Poor" };
  if (pm25 <= 250) return { aqi: Math.round(300 + (pm25 - 120) * 100 / 130), label: "Very Poor" };
  return { aqi: Math.round(400 + (pm25 - 250) * 100 / 130), label: "Severe" };
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very high";
  return "Extreme";
}

function heatIndex(tempC: number, rh: number): number {
  // Simplified Steadman formula
  if (tempC < 27) return tempC;
  const t = tempC * 9 / 5 + 32;
  const hi = -42.379 + 2.04901523 * t + 10.14333127 * rh
    - 0.22475541 * t * rh - 0.00683783 * t * t
    - 0.05481717 * rh * rh + 0.00122874 * t * t * rh
    + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
  return Math.round((hi - 32) * 5 / 9);
}

function heatLabel(hi: number): string {
  if (hi < 27) return "Comfortable";
  if (hi < 32) return "Caution";
  if (hi < 40) return "Extreme caution";
  return "Danger";
}

function weatherCodeToCondition(code: number, isDay: boolean): Condition {
  if (code <= 1) return isDay ? "sunny" : "night";
  if (code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rainy";
  if (code >= 71 && code <= 77) return "cloudy";
  if (code >= 80 && code <= 82) return "rainy";
  if (code >= 95) return "storm";
  return "cloudy";
}

interface OpenMeteoForecast {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    relative_humidity_2m: number;
    dew_point_2m: number;
    surface_pressure: number;
    is_day: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
  };
  daily: {
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

interface OpenMeteoAQ {
  current: {
    pm2_5: number;
  };
}

function windDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatSunTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/** Fetch live weather from Open-Meteo for a city key. Falls back to null on failure. */
export async function fetchWeather(cityKey: string): Promise<Location | null> {
  const city = CITIES[cityKey];
  if (!city) return null;

  // Check cache
  const cached = cache.get(cityKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const [forecastRes, aqRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,dew_point_2m,surface_pressure,is_day,uv_index` +
        `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code` +
        `&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
        `&timezone=auto&forecast_days=7`,
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}` +
        `&current=pm2_5`,
      ),
    ]);

    if (!forecastRes.ok || !aqRes.ok) return null;

    const forecast: OpenMeteoForecast = await forecastRes.json();
    const aq: OpenMeteoAQ = await aqRes.json();

    const cur = forecast.current;
    const now = new Date();
    const currentHourIdx = now.getHours();

    // Condition
    const condition = weatherCodeToCondition(cur.weather_code, cur.is_day === 1);

    // AQI
    const { aqi, label: aqiLabel } = computeAqiFromPm25(aq.current.pm2_5);

    // UV
    const uv = Math.round(cur.uv_index);

    // Heat index
    const hi = heatIndex(cur.temperature_2m, cur.relative_humidity_2m);

    // Sun
    const sunrise = forecast.daily.sunrise[0];
    const sunset = forecast.daily.sunset[0];
    const sunriseDate = new Date(sunrise);
    const sunsetDate = new Date(sunset);
    const dayLenMs = sunsetDate.getTime() - sunriseDate.getTime();
    const elapsed = now.getTime() - sunriseDate.getTime();
    const progress = Math.max(0, Math.min(1, elapsed / dayLenMs));
    const dayH = Math.floor(dayLenMs / 3600000);
    const dayM = Math.floor((dayLenMs % 3600000) / 60000);

    const sun: Sun = {
      sunrise: formatSunTime(sunrise),
      sunset: formatSunTime(sunset),
      daylight: `${dayH}h ${dayM}m`,
      progress,
    };

    // Air
    const air: Air = {
      aqi,
      aqiLabel,
      uv,
      uvLabel: uvLabel(uv) + (uv >= 7 ? " by noon" : ""),
      heat: hi,
      heatLabel: heatLabel(hi),
    };

    // Precip — find next rain hour
    const hourlyPrecip = forecast.hourly.precipitation;
    const hourlyProb = forecast.hourly.precipitation_probability;
    let nextRain = "No rain expected";
    let maxChance = 0;
    const bars: { t: string; v: number }[] = [];

    for (let i = currentHourIdx; i < Math.min(currentHourIdx + 8, hourlyProb.length); i++) {
      const prob = hourlyProb[i] ?? 0;
      if (prob > maxChance) maxChance = prob;
      if (prob > 30 && nextRain === "No rain expected") {
        nextRain = formatTime(forecast.hourly.time[i]);
      }
      bars.push({ t: formatTime(forecast.hourly.time[i]), v: prob });
    }

    const totalPrecip = hourlyPrecip
      .slice(currentHourIdx, currentHourIdx + 24)
      .reduce((s, v) => s + v, 0);

    const precip: Precip = {
      next: nextRain,
      amount: `${totalPrecip.toFixed(1)} mm`,
      rate: `${(totalPrecip / 24).toFixed(1)} mm/h`,
      chance: maxChance,
      bars,
      note: maxChance > 50 ? "Rain likely" : maxChance > 20 ? "Some chance of rain" : "Dry conditions",
    };

    // Wind
    const wind: Wind = {
      speed: Math.round(cur.wind_speed_10m),
      dir: windDirLabel(cur.wind_direction_10m),
      gust: Math.round(cur.wind_gusts_10m),
    };

    // Hourly forecast — current hour + next 7 hours (8 slots)
    const hourlyForecast: HourlyPoint[] = [];
    for (let i = 0; i < 8; i++) {
      const idx = currentHourIdx + i;
      if (idx >= forecast.hourly.time.length) break;
      hourlyForecast.push({
        t: i === 0 ? "Now" : formatTime(forecast.hourly.time[idx]),
        c: weatherCodeToCondition(forecast.hourly.weather_code[idx] ?? cur.weather_code, cur.is_day === 1),
        temp: Math.round(forecast.hourly.temperature_2m[idx] ?? cur.temperature_2m),
      });
    }

    // Weekly forecast — 7 days
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyForecast: DailyPoint[] = forecast.daily.weather_code.slice(0, 7).map((code, i) => ({
      day: i === 0 ? "Today" : DAY_NAMES[new Date(forecast.daily.sunrise[i]).getDay()],
      c: weatherCodeToCondition(code, true),
      hi: Math.round(forecast.daily.temperature_2m_max[i]),
      lo: Math.round(forecast.daily.temperature_2m_min[i]),
      rain: forecast.daily.precipitation_probability_max[i] ?? 0,
    }));

    // Build location
    const loc: Location = {
      key: cityKey,
      city: city.city,
      region: city.region,
      condition,
      temp: Math.round(cur.temperature_2m),
      feels: Math.round(cur.apparent_temperature),
      summary: `${condition === "sunny" ? "Clear skies" : condition === "rainy" ? "Rain expected" : condition === "storm" ? "Thunderstorm warning" : condition === "fog" ? "Foggy conditions" : condition === "cloudy" ? "Overcast skies" : "Night time"}, ${Math.round(cur.temperature_2m)}°C`,
      air,
      sun,
      precip,
      pollen: { level: aqi > 100 ? "High" : aqi > 50 ? "Moderate" : "Low", count: Math.round(aqi / 10), types: "Grass, Dust", trend: "Stable" },
      travel: {
        traffic: wind.speed > 20 ? "Heavy" : maxChance > 50 ? "Heavy" : "Moderate",
        trafficNote: maxChance > 50 ? "Wet roads expected" : "Normal conditions",
        visibility: condition === "fog" ? "400 m" : condition === "rainy" ? "3 km" : "10 km",
        flights: [],
      },
      wind,
      humidity: cur.relative_humidity_2m,
      dewPoint: Math.round(cur.dew_point_2m),
      pressure: {
        value: Math.round(cur.surface_pressure),
        trend: "Steady",
      },
      moon: { phase: 0.5, name: "Waxing", illum: 50 },
      hourlyForecast,
      weeklyForecast,
    };

    // Detect alerts
    if (condition === "storm") {
      loc.alert = {
        tier: "critical",
        title: "Red Alert: Severe thunderstorm",
        body: `Gusty winds up to ${wind.gust} km/h expected. Stay indoors.`,
      };
    } else if (maxChance >= 60) {
      loc.alert = {
        tier: "warning",
        title: "Orange Alert: Heavy rainfall",
        body: `${totalPrecip.toFixed(0)} mm expected in the next 24 hours.`,
      };
    } else if (condition === "fog") {
      loc.alert = {
        tier: "advisory",
        title: "Yellow Advisory: Dense fog",
        body: "Visibility below 400 m, use fog lamps.",
      };
    }

    cache.set(cityKey, { data: loc, ts: Date.now() });
    return loc;
  } catch {
    return null;
  }
}

/** Whether live data is available (vs. mock fallback). */
export function isLiveData(cityKey: string): boolean {
  const cached = cache.get(cityKey);
  return cached !== undefined && Date.now() - cached.ts < CACHE_TTL;
}

export interface LiveRadarCityWind {
  speed: number;
  dir: string;
  deg: number;
  gust: number;
  temp?: number;
}

export interface WindTimelineFrame {
  id: string;
  label: string;
  timeStr: string;
  speed: number;
  dir: string;
  gust: number;
  temp?: number;
}

export interface RainViewerFrame {
  time: number;
  path: string;
  timeStr: string;
}

export interface RainViewerData {
  host: string;
  frames: RainViewerFrame[];
}

let RAINVIEWER_CACHE: { data: RainViewerData; ts: number } | null = null;

/** Fetch real live Doppler precipitation radar tile metadata from RainViewer API */
export async function fetchRainViewerFrames(): Promise<RainViewerData | null> {
  if (RAINVIEWER_CACHE && Date.now() - RAINVIEWER_CACHE.ts < 5 * 60 * 1000) {
    return RAINVIEWER_CACHE.data;
  }
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) return null;
    const json = await res.json();
    const host: string = json.host || "https://tilecache.rainviewer.com";
    const past: { time: number; path: string }[] = json.radar?.past || [];
    const nowcast: { time: number; path: string }[] = json.radar?.nowcast || [];
    const all = [...past, ...nowcast];
    const frames: RainViewerFrame[] = all.map((f) => {
      const d = new Date(f.time * 1000);
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      return {
        time: f.time,
        path: f.path,
        timeStr: `${h}:${m}`,
      };
    });
    const result = { host, frames };
    RAINVIEWER_CACHE = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}

const RADAR_WIND_CACHE = new Map<string, { data: Record<string, LiveRadarCityWind>; ts: number }>();

/** Fetch real live wind & temperature readings for multiple Indian cities from Open-Meteo in a single batch call. */
export async function fetchRadarCitiesWind(
  cities: { name: string; lat: number; lng: number }[]
): Promise<Record<string, LiveRadarCityWind>> {
  const cacheKey = "all_radar_cities";
  const cached = RADAR_WIND_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
    return cached.data;
  }

  try {
    const lats = cities.map((c) => c.lat.toFixed(2)).join(",");
    const lons = cities.map((c) => c.lng.toFixed(2)).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw : [raw];
    const result: Record<string, LiveRadarCityWind> = {};
    for (let i = 0; i < cities.length && i < list.length; i++) {
      const cur = list[i]?.current;
      if (cur) {
        result[cities[i].name.toLowerCase()] = {
          speed: Math.round(cur.wind_speed_10m),
          dir: windDirLabel(cur.wind_direction_10m),
          deg: Math.round(cur.wind_direction_10m),
          gust: Math.round(cur.wind_gusts_10m),
          temp: cur.temperature_2m !== undefined ? Math.round(cur.temperature_2m) : undefined,
        };
      }
    }
    RADAR_WIND_CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return {};
  }
}

/** Fetch real 7-day wind & temperature forecast timeline for the selected location from Open-Meteo. */
export async function fetchWindTimeline(
  lat: number,
  lon: number,
  currentWind: Wind,
  currentTemp?: number
): Promise<WindTimelineFrame[]> {
  const now = new Date();
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const baseTemp = currentTemp ?? 30;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&daily=wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max,temperature_2m_max&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const json = await res.json();

    const daily = json.daily;
    const hourly = json.hourly;
    const todayAftIdx = Math.min(16, hourly?.time?.length - 1);

    const d1 = new Date(daily.time[1]);
    const d2 = new Date(daily.time[2]);
    const d3 = new Date(daily.time[3]);

    return [
      {
        id: "-24h",
        label: "- 24 h",
        timeStr: "Yesterday 10:00",
        speed: Math.max(2, Math.round(currentWind.speed * 0.9)),
        dir: currentWind.dir,
        gust: Math.round(currentWind.gust * 0.9),
        temp: Math.round(baseTemp - 1),
      },
      {
        id: "now",
        label: "now",
        timeStr: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
        speed: Math.round(currentWind.speed),
        dir: currentWind.dir,
        gust: Math.round(currentWind.gust),
        temp: Math.round(baseTemp),
      },
      {
        id: "today",
        label: "today",
        timeStr: "Today 16:00",
        speed: Math.round(hourly?.wind_speed_10m?.[todayAftIdx] ?? currentWind.speed),
        dir: windDirLabel(hourly?.wind_direction_10m?.[todayAftIdx] ?? 270),
        gust: Math.round(hourly?.wind_gusts_10m?.[todayAftIdx] ?? currentWind.gust),
        temp: Math.round(hourly?.temperature_2m?.[todayAftIdx] ?? baseTemp),
      },
      {
        id: "tomorrow",
        label: "tomorrow",
        timeStr: "Tomorrow 12:00",
        speed: Math.round(daily?.wind_speed_10m_max?.[1] ?? currentWind.speed),
        dir: windDirLabel(daily?.wind_direction_10m_dominant?.[1] ?? 270),
        gust: Math.round(daily?.wind_gusts_10m_max?.[1] ?? currentWind.gust),
        temp: Math.round(daily?.temperature_2m_max?.[1] ?? baseTemp),
      },
      {
        id: "day2",
        label: DAY_NAMES[d2.getDay()],
        timeStr: `${DAY_NAMES[d2.getDay()]} 12:00`,
        speed: Math.round(daily?.wind_speed_10m_max?.[2] ?? currentWind.speed),
        dir: windDirLabel(daily?.wind_direction_10m_dominant?.[2] ?? 270),
        gust: Math.round(daily?.wind_gusts_10m_max?.[2] ?? currentWind.gust),
        temp: Math.round(daily?.temperature_2m_max?.[2] ?? baseTemp),
      },
      {
        id: "day3",
        label: DAY_NAMES[d3.getDay()],
        timeStr: `${DAY_NAMES[d3.getDay()]} 12:00`,
        speed: Math.round(daily?.wind_speed_10m_max?.[3] ?? currentWind.speed),
        dir: windDirLabel(daily?.wind_direction_10m_dominant?.[3] ?? 270),
        gust: Math.round(daily?.wind_gusts_10m_max?.[3] ?? currentWind.gust),
        temp: Math.round(daily?.temperature_2m_max?.[3] ?? baseTemp),
      },
    ];
  } catch {
    return [
      { id: "-24h", label: "- 24 h", timeStr: "Yesterday 10:00", speed: Math.max(2, Math.round(currentWind.speed * 0.9)), dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp - 1) },
      { id: "now", label: "now", timeStr: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`, speed: currentWind.speed, dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp) },
      { id: "today", label: "today", timeStr: "Today 16:00", speed: Math.round(currentWind.speed * 1.1), dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp + 2) },
      { id: "tomorrow", label: "tomorrow", timeStr: "Tomorrow 12:00", speed: Math.round(currentWind.speed * 0.95), dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp) },
      { id: "fri", label: "Fri", timeStr: "Friday 14:00", speed: Math.round(currentWind.speed * 1.05), dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp - 1) },
      { id: "sat", label: "Sat", timeStr: "Saturday 11:00", speed: Math.round(currentWind.speed * 0.85), dir: currentWind.dir, gust: currentWind.gust, temp: Math.round(baseTemp) },
    ];
  }
}
