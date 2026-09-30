/**
 * Location-Aware Environment Catalog
 * 
 * Maps geographical locations and topographical features into coherent,
 * sophisticated environmental landscape silhouettes and atmospheric parameters.
 * Highly extensible configuration structure.
 */

import type { EnvironmentType, EnvironmentPreset } from "./types";

export const ENVIRONMENT_PRESETS: Record<EnvironmentType, EnvironmentPreset> = {
  hills: {
    type: "hills",
    label: "Deccan Plateau & Western Ghats",
    dominantFeature: "Layered basalt ridgelines and gentle Sahyadri foothills",
    hasWaterBody: false,
    waterReflectionOpacity: 0,
    elevationMeters: 560,
    defaultHazeFactor: 0.15,
  },
  coastal: {
    type: "coastal",
    label: "Marine Coast & Oceanic Horizon",
    dominantFeature: "Open sea horizon, coastal headlands, and calm water reflection",
    hasWaterBody: true,
    waterReflectionOpacity: 0.28,
    elevationMeters: 14,
    defaultHazeFactor: 0.22,
  },
  plains: {
    type: "plains",
    label: "Expansive Plains & Urban Horizon",
    dominantFeature: "Flat expansive horizon with subtle architectural and tree silhouette",
    hasWaterBody: false,
    waterReflectionOpacity: 0,
    elevationMeters: 215,
    defaultHazeFactor: 0.35,
  },
  plateau: {
    type: "plateau",
    label: "High Plateau & Garden Canopy",
    dominantFeature: "Rolling high-altitude plateau with dense eucalyptus and banyan canopy",
    hasWaterBody: false,
    waterReflectionOpacity: 0,
    elevationMeters: 920,
    defaultHazeFactor: 0.12,
  },
  riverine: {
    type: "riverine",
    label: "River Delta & Waterway",
    dominantFeature: "Broad river waterway, tranquil river mist, and delta palm silhouettes",
    hasWaterBody: true,
    waterReflectionOpacity: 0.22,
    elevationMeters: 9,
    defaultHazeFactor: 0.28,
  },
  mountain: {
    type: "mountain",
    label: "High Alpine & Himalayan Ridges",
    dominantFeature: "Dramatic towering crags, sharp ridgelines, and deep valley mist",
    hasWaterBody: false,
    waterReflectionOpacity: 0,
    elevationMeters: 2200,
    defaultHazeFactor: 0.08,
  },
};

/** Default mapping for the core Indian cities and international locations */
const CITY_ENVIRONMENT_MAPPING: Record<string, EnvironmentType> = {
  // Core 6 cities in Mausam:
  pune: "hills",          // Western Ghats foothills, Sinhagad ridge
  mumbai: "coastal",      // Arabian Sea coastline, marine horizon
  delhi: "plains",        // Northern Gangetic plains, historic urban horizon
  bengaluru: "plateau",   // Mysore Plateau high tableland, lush garden canopy
  chennai: "coastal",     // Bay of Bengal coastal shoreline, tropical coast
  kolkata: "riverine",    // Hooghly River delta, Gangetic waterway
  
  // Additional locations:
  hyderabad: "plateau",
  goa: "coastal",
  kochi: "coastal",
  jaipur: "plains",
  shimla: "mountain",
  manali: "mountain",
  leh: "mountain",
  srinagar: "mountain",
  darjeeling: "mountain",
  guwahati: "riverine",
  varanasi: "riverine",
  sanfrancisco: "coastal",
  tokyo: "coastal",
  london: "riverine",
  zurich: "mountain",
  newyork: "coastal",
};

/**
 * Resolves an environment preset for any city key, name, or region.
 * Uses exact match first, then heuristic keyword matching, falling back cleanly.
 */
export function resolveEnvironment(cityKeyOrName: string, region?: string): EnvironmentPreset {
  const normalizedKey = (cityKeyOrName || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  
  // 1. Direct registry lookup
  if (CITY_ENVIRONMENT_MAPPING[normalizedKey]) {
    return ENVIRONMENT_PRESETS[CITY_ENVIRONMENT_MAPPING[normalizedKey]];
  }

  // 2. Keyword heuristics on city and region
  const combined = `${cityKeyOrName} ${region || ""}`.toLowerCase();
  
  if (/mountain|hill|peak|valley|ghat|ridge|alps|himalaya|shimla|manali|nainital|ooty/.test(combined)) {
    return ENVIRONMENT_PRESETS.mountain;
  }
  if (/coast|beach|sea|ocean|bay|port|island|marine|gulf|mumbai|chennai|goa|kochi|vizag|puri/.test(combined)) {
    return ENVIRONMENT_PRESETS.coastal;
  }
  if (/river|ganga|yamuna|delta|lake|water|creek|kolkata|varanasi|guwahati/.test(combined)) {
    return ENVIRONMENT_PRESETS.riverine;
  }
  if (/plateau|tableland|deccan|bengaluru|bangalore|hyderabad|mysore|pune/.test(combined)) {
    return ENVIRONMENT_PRESETS.plateau;
  }
  if (/plains|desert|ncr|delhi|up|punjab|haryana|bihar|rajasthan|jaipur|lucknow/.test(combined)) {
    return ENVIRONMENT_PRESETS.plains;
  }

  // 3. Fallback to gentle hills for rich depth
  return ENVIRONMENT_PRESETS.hills;
}

/**
 * Extensibility API: Register a new custom environment preset
 */
export function registerEnvironmentPreset(preset: EnvironmentPreset): void {
  ENVIRONMENT_PRESETS[preset.type] = preset;
}

/**
 * Extensibility API: Register a city to a specific environment type
 */
export function registerCityEnvironment(cityKey: string, type: EnvironmentType): void {
  CITY_ENVIRONMENT_MAPPING[cityKey.toLowerCase().replace(/[^a-z0-9]/g, "")] = type;
}
