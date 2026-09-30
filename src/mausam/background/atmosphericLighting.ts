/**
 * Atmospheric Lighting & Color Grading Engine
 * 
 * Computes photorealistic, continuous sky gradients, sun bloom, cloud shading,
 * and adaptive contrast metrics across all 9 time-of-day phases and 10 weather states.
 */

import type {
  TimeOfDayPhase,
  EnvironmentalWeatherCondition,
  SkyColorPalette,
  AtmosphericMetrics,
  Season,
} from "./types";
import type { Condition as AppCondition } from "../theme";
import type { Location } from "../data";

/* ───────────────────── Color Interpolation Utilities ───────────────────── */

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): RGB {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function toHex(rgb: RGB): string {
  const r = Math.min(255, Math.max(0, Math.round(rgb.r)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const clampedT = Math.min(Math.max(t, 0), 1);
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  return toHex({
    r: a.r + (b.r - a.r) * clampedT,
    g: a.g + (b.g - a.g) * clampedT,
    b: a.b + (b.b - a.b) * clampedT,
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

/* ───────────────────── Base Sky Color Palettes per Phase ───────────────────── */

/** Clear Sky baseline palettes across all 9 times of day */
const CLEAR_PALETTES: Record<TimeOfDayPhase, SkyColorPalette> = {
  "pre-dawn": {
    zenith: "#070c18",
    midSky: "#0d162d",
    horizon: "#1a1f3c",
    ambient: "#080c16",
    hazeColor: "#12192e",
    sunGlow: "rgba(180, 140, 200, 0.08)",
    cloudBase: "#10162a",
    cloudHighlight: "#283454",
    landscapeTint: "#050810",
    starsOpacity: 0.55,
    baseLuminance: 0.12,
  },
  sunrise: {
    // dark blue zenith -> warm orange/amber horizon -> morning blue transition
    zenith: "#142850",
    midSky: "#344966",
    horizon: "#f4845f",
    ambient: "#3d2c38",
    hazeColor: "#f7b267",
    sunGlow: "rgba(255, 170, 90, 0.45)",
    cloudBase: "#36334f",
    cloudHighlight: "#fbc396",
    landscapeTint: "#18131e",
    starsOpacity: 0.12,
    baseLuminance: 0.38,
  },
  morning: {
    zenith: "#1b4d89",
    midSky: "#3d7ab8",
    horizon: "#7fb5e2",
    ambient: "#254063",
    hazeColor: "#a3cbec",
    sunGlow: "rgba(255, 235, 180, 0.40)",
    cloudBase: "#627e9e",
    cloudHighlight: "#ffffff",
    landscapeTint: "#152438",
    starsOpacity: 0,
    baseLuminance: 0.58,
  },
  midday: {
    zenith: "#12427a",
    midSky: "#2b6cb0",
    horizon: "#63a4dc",
    ambient: "#1c3f66",
    hazeColor: "#8fc4ef",
    sunGlow: "rgba(255, 250, 220, 0.50)",
    cloudBase: "#6c8ba8",
    cloudHighlight: "#ffffff",
    landscapeTint: "#14253a",
    starsOpacity: 0,
    baseLuminance: 0.65,
  },
  afternoon: {
    zenith: "#164478",
    midSky: "#356fa8",
    horizon: "#76aed8",
    ambient: "#244565",
    hazeColor: "#97c5e8",
    sunGlow: "rgba(255, 240, 190, 0.42)",
    cloudBase: "#65829e",
    cloudHighlight: "#fff8ed",
    landscapeTint: "#16273c",
    starsOpacity: 0,
    baseLuminance: 0.60,
  },
  "golden-hour": {
    // warm amber/gold tones, long shadows, glowing horizon
    zenith: "#1f3b64",
    midSky: "#524f70",
    horizon: "#f79d5c",
    ambient: "#4a3528",
    hazeColor: "#f9aa66",
    sunGlow: "rgba(255, 175, 75, 0.52)",
    cloudBase: "#4a3e54",
    cloudHighlight: "#fedbb5",
    landscapeTint: "#221921",
    starsOpacity: 0,
    baseLuminance: 0.48,
  },
  sunset: {
    // blue -> warm gold -> orange -> purple -> deep blue
    zenith: "#172344",
    midSky: "#5c3358",
    horizon: "#eb5e43",
    ambient: "#3a1d2e",
    hazeColor: "#c24d55",
    sunGlow: "rgba(255, 115, 60, 0.50)",
    cloudBase: "#361d36",
    cloudHighlight: "#f89f78",
    landscapeTint: "#140e1a",
    starsOpacity: 0.05,
    baseLuminance: 0.35,
  },
  dusk: {
    // royal blue/violet fading to obsidian
    zenith: "#0c1326",
    midSky: "#1d1f3b",
    horizon: "#3f2845",
    ambient: "#131424",
    hazeColor: "#2b213b",
    sunGlow: "rgba(220, 110, 130, 0.15)",
    cloudBase: "#141525",
    cloudHighlight: "#58425d",
    landscapeTint: "#0a0c16",
    starsOpacity: 0.28,
    baseLuminance: 0.20,
  },
  night: {
    zenith: "#040711",
    midSky: "#090e1f",
    horizon: "#11172a",
    ambient: "#05070f",
    hazeColor: "#0d1322",
    sunGlow: "rgba(120, 160, 220, 0.05)",
    cloudBase: "#0a0e1c",
    cloudHighlight: "#1b233a",
    landscapeTint: "#030408",
    starsOpacity: 0.65,
    baseLuminance: 0.08,
  },
};

/* ───────────────────── Sequence for Smooth Interpolation ───────────────────── */

const PHASE_SEQUENCE: TimeOfDayPhase[] = [
  "pre-dawn",
  "sunrise",
  "morning",
  "midday",
  "afternoon",
  "golden-hour",
  "sunset",
  "dusk",
  "night",
];

function getNextPhase(phase: TimeOfDayPhase): TimeOfDayPhase {
  const idx = PHASE_SEQUENCE.indexOf(phase);
  return PHASE_SEQUENCE[(idx + 1) % PHASE_SEQUENCE.length];
}

/** Interpolates smoothly between two sky color palettes */
export function interpolatePalettes(
  paletteA: SkyColorPalette,
  paletteB: SkyColorPalette,
  t: number
): SkyColorPalette {
  return {
    zenith: lerpColor(paletteA.zenith, paletteB.zenith, t),
    midSky: lerpColor(paletteA.midSky, paletteB.midSky, t),
    horizon: lerpColor(paletteA.horizon, paletteB.horizon, t),
    ambient: lerpColor(paletteA.ambient, paletteB.ambient, t),
    hazeColor: lerpColor(paletteA.hazeColor, paletteB.hazeColor, t),
    sunGlow: t < 0.5 ? paletteA.sunGlow : paletteB.sunGlow,
    cloudBase: lerpColor(paletteA.cloudBase, paletteB.cloudBase, t),
    cloudHighlight: lerpColor(paletteA.cloudHighlight, paletteB.cloudHighlight, t),
    landscapeTint: lerpColor(paletteA.landscapeTint, paletteB.landscapeTint, t),
    starsOpacity: lerp(paletteA.starsOpacity, paletteB.starsOpacity, t),
    baseLuminance: lerp(paletteA.baseLuminance, paletteB.baseLuminance, t),
  };
}

/* ───────────────────── Weather Atmospheric Modifiers ───────────────────── */

/**
 * Applies weather conditions (clouds, rain, storm, fog, haze, snow)
 * on top of the base solar sky palette.
 */
export function applyWeatherModifiers(
  basePalette: SkyColorPalette,
  condition: EnvironmentalWeatherCondition,
  cloudCoverage: number,
  visibilityKm: number,
  isNight: boolean
): SkyColorPalette {
  const p = { ...basePalette };

  switch (condition) {
    case "clear":
      return p;

    case "partly-cloudy":
      // Soft ambient diffusion, slightly reduced star visibility
      p.starsOpacity *= 0.65;
      return p;

    case "cloudy":
      // Muted sky with desaturated horizon
      p.zenith = lerpColor(p.zenith, isNight ? "#080c14" : "#243142", 0.45);
      p.midSky = lerpColor(p.midSky, isNight ? "#0d1320" : "#36475a", 0.50);
      p.horizon = lerpColor(p.horizon, isNight ? "#121a28" : "#4a5d72", 0.45);
      p.starsOpacity *= 0.15;
      p.baseLuminance *= 0.78;
      return p;

    case "overcast":
      // Uniform slate-gray blanket, zero direct sun bloom
      p.zenith = lerpColor(p.zenith, isNight ? "#070a10" : "#202834", 0.75);
      p.midSky = lerpColor(p.midSky, isNight ? "#0c101a" : "#313b48", 0.80);
      p.horizon = lerpColor(p.horizon, isNight ? "#121722" : "#445060", 0.80);
      p.sunGlow = "rgba(255, 255, 255, 0.04)";
      p.starsOpacity = 0;
      p.baseLuminance *= 0.65;
      p.cloudHighlight = isNight ? "#182030" : "#5a6677";
      return p;

    case "rain":
      // Moody wet slate/steel atmosphere with cool blue undertones
      p.zenith = lerpColor(p.zenith, isNight ? "#050810" : "#192434", 0.80);
      p.midSky = lerpColor(p.midSky, isNight ? "#0a101c" : "#253549", 0.82);
      p.horizon = lerpColor(p.horizon, isNight ? "#0e1624" : "#32465e", 0.85);
      p.hazeColor = isNight ? "#0c1320" : "#2d3e54";
      p.sunGlow = "rgba(200, 220, 245, 0.05)";
      p.starsOpacity = 0;
      p.baseLuminance *= 0.55;
      p.landscapeTint = isNight ? "#020408" : "#0f1622";
      return p;

    case "heavy-rain":
      // Deep dark navy-charcoal storm skies with heavy atmospheric moisture
      p.zenith = lerpColor(p.zenith, isNight ? "#03050a" : "#121a28", 0.88);
      p.midSky = lerpColor(p.midSky, isNight ? "#060912" : "#1a2538", 0.90);
      p.horizon = lerpColor(p.horizon, isNight ? "#0a0e18" : "#223147", 0.90);
      p.hazeColor = isNight ? "#080c16" : "#222f42";
      p.sunGlow = "rgba(0, 0, 0, 0)";
      p.starsOpacity = 0;
      p.baseLuminance *= 0.45;
      return p;

    case "thunderstorm":
      // Dramatic ominous charcoal-purple anvil sky
      p.zenith = lerpColor(p.zenith, isNight ? "#04040a" : "#161528", 0.90);
      p.midSky = lerpColor(p.midSky, isNight ? "#090814" : "#23203c", 0.92);
      p.horizon = lerpColor(p.horizon, isNight ? "#100d1c" : "#322b4e", 0.90);
      p.hazeColor = isNight ? "#0a0815" : "#292440";
      p.sunGlow = "rgba(240, 200, 255, 0.08)";
      p.starsOpacity = 0;
      p.baseLuminance *= 0.40;
      p.landscapeTint = isNight ? "#020206" : "#0d0c18";
      return p;

    case "fog":
      // Silver-white / pearl-slate diffuse volumetric fog
      p.zenith = lerpColor(p.zenith, isNight ? "#090d14" : "#424b55", 0.85);
      p.midSky = lerpColor(p.midSky, isNight ? "#0f141f" : "#5c6772", 0.88);
      p.horizon = lerpColor(p.horizon, isNight ? "#151b26" : "#76828e", 0.90);
      p.hazeColor = isNight ? "#121722" : "#6f7b88";
      p.sunGlow = "rgba(255, 255, 255, 0.12)";
      p.starsOpacity = 0;
      p.baseLuminance = isNight ? 0.14 : 0.52; // Fog scatters ambient light
      p.landscapeTint = isNight ? "#080b12" : "#323a43";
      return p;

    case "haze":
      // Warm particulate dust/smog horizon veil
      p.zenith = lerpColor(p.zenith, isNight ? "#090b12" : "#2c3e56", 0.35);
      p.midSky = lerpColor(p.midSky, isNight ? "#111420" : "#4a5d73", 0.45);
      p.horizon = lerpColor(p.horizon, isNight ? "#1c1b22" : "#8c7e6c", 0.65);
      p.hazeColor = isNight ? "#18161e" : "#857867";
      p.sunGlow = "rgba(255, 210, 150, 0.30)";
      p.starsOpacity *= 0.25;
      p.baseLuminance *= 0.82;
      return p;

    case "snow":
      // Crisp silver-blue winter atmosphere
      p.zenith = lerpColor(p.zenith, isNight ? "#080e1a" : "#2d3e53", 0.65);
      p.midSky = lerpColor(p.midSky, isNight ? "#101a2d" : "#485f7c", 0.70);
      p.horizon = lerpColor(p.horizon, isNight ? "#17243c" : "#728aa8", 0.75);
      p.hazeColor = isNight ? "#121d30" : "#657c98";
      p.sunGlow = "rgba(230, 245, 255, 0.25)";
      p.starsOpacity *= 0.4;
      p.baseLuminance *= 0.70;
      p.landscapeTint = isNight ? "#0a1120" : "#233346";
      return p;
  }
}

/**
 * Maps the app's internal Condition string and metrics to the full EnvironmentalWeatherCondition
 */
export function mapToEnvironmentalCondition(
  cond: AppCondition,
  precipChance: number = 0,
  humidity: number = 50,
  visibilityKm: number = 10
): EnvironmentalWeatherCondition {
  if (cond === "storm") return "thunderstorm";
  if (cond === "rainy") {
    return precipChance > 70 ? "heavy-rain" : "rain";
  }
  if (cond === "fog") return "fog";
  if (cond === "cloudy") {
    if (humidity > 80 && precipChance > 40) return "overcast";
    if (visibilityKm < 3.5) return "haze";
    return "cloudy";
  }
  if (cond === "sunny") {
    if (visibilityKm < 4.0) return "haze";
    return "clear";
  }
  if (cond === "night") return "clear";
  return "partly-cloudy";
}

/**
 * Extracts atmospheric metrics from Location data
 */
export function extractAtmosphericMetrics(
  location: Location,
  condition: EnvironmentalWeatherCondition
): AtmosphericMetrics {
  // Parse visibility string (e.g. "400 m", "4 km", "10 km")
  let visibilityKm = 10;
  const visStr = location.travel?.visibility || "10 km";
  if (visStr.includes("m") && !visStr.includes("km")) {
    const meters = parseFloat(visStr) || 400;
    visibilityKm = meters / 1000;
  } else {
    visibilityKm = parseFloat(visStr) || 10;
  }

  // Cloud coverage estimation
  let cloudCoverage = 0.05;
  if (condition === "clear") cloudCoverage = 0.05;
  else if (condition === "partly-cloudy") cloudCoverage = 0.35;
  else if (condition === "cloudy") cloudCoverage = 0.72;
  else if (condition === "overcast") cloudCoverage = 0.95;
  else if (condition === "rain") cloudCoverage = 0.82;
  else if (condition === "heavy-rain") cloudCoverage = 0.96;
  else if (condition === "thunderstorm") cloudCoverage = 0.98;
  else if (condition === "fog") cloudCoverage = 0.65;
  else if (condition === "haze") cloudCoverage = 0.40;
  else if (condition === "snow") cloudCoverage = 0.85;

  // Wind angle in radians for particle drift deflection
  const dirAngles: Record<string, number> = {
    N: 0, NE: Math.PI / 4, E: Math.PI / 2, SE: (3 * Math.PI) / 4,
    S: Math.PI, SW: (5 * Math.PI) / 4, W: (3 * Math.PI) / 2, NW: (7 * Math.PI) / 4,
  };
  const windDir = location.wind?.dir || "W";
  const windSpeed = location.wind?.speed || 12;
  const windAngleRad = dirAngles[windDir] ?? Math.PI / 2;

  // Precipitation rate
  let precipRate = 0;
  let precipType: "none" | "rain" | "heavy-rain" | "snow" = "none";
  if (condition === "heavy-rain" || (condition === "thunderstorm" && location.precip?.chance > 50)) {
    precipRate = 8.5;
    precipType = "heavy-rain";
  } else if (condition === "rain" || location.precip?.chance > 45) {
    precipRate = 2.4;
    precipType = "rain";
  } else if (condition === "snow") {
    precipRate = 1.2;
    precipType = "snow";
  }

  // Fog & Haze density
  const fogDensity = condition === "fog" ? Math.min(Math.max((2 - visibilityKm) / 2, 0.4), 0.95) : 0;
  const aqi = location.air?.aqi || 60;
  const hazeDensity = condition === "haze" ? Math.min(Math.max(aqi / 200, 0.3), 0.85) : (aqi > 130 ? 0.25 : 0);

  return {
    cloudCoverage,
    cloudDensity: cloudCoverage > 0.6 ? 0.8 : 0.4,
    visibilityKm,
    humidity: location.humidity || 55,
    aqi,
    hazeDensity,
    fogDensity,
    precipRate,
    precipType,
    windSpeed,
    windDir,
    windAngleRad,
    thunderIntensity: condition === "thunderstorm" ? 0.8 : 0,
    temperatureC: location.temp || 26,
  };
}

/**
 * Master color computation: Calculates continuous sky color palette
 * by smoothly interpolating across the 9 time-of-day phases and applying weather conditions.
 */
export function computeAtmosphericPalette(
  phase: TimeOfDayPhase,
  progressInPhase: number,
  condition: EnvironmentalWeatherCondition,
  cloudCoverage: number,
  visibilityKm: number
): SkyColorPalette {
  const currentPalette = CLEAR_PALETTES[phase];
  const nextPhase = getNextPhase(phase);
  const nextPalette = CLEAR_PALETTES[nextPhase];

  // Smooth Hermite / smoothstep curve for natural transition
  const smoothT = progressInPhase * progressInPhase * (3 - 2 * progressInPhase);
  const blendedBase = interpolatePalettes(currentPalette, nextPalette, smoothT);

  const isNight = phase === "night" || phase === "pre-dawn";
  return applyWeatherModifiers(blendedBase, condition, cloudCoverage, visibilityKm, isNight);
}
