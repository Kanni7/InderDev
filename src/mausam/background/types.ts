/**
 * Dynamic Environmental Background System - Type Definitions
 * 
 * Reusable, configuration-driven architecture for location-aware,
 * time-of-day, and weather-responsive environmental atmospheric backgrounds.
 */

import type { Condition as AppCondition } from "../theme";
import type { Location } from "../data";

export type TimeOfDayPhase =
  | "pre-dawn"    // ~4:30 AM - 5:30 AM: Astronomical twilight, deep navy night, stars visible
  | "sunrise"     // ~5:30 AM - 6:30 AM: Horizon transition dark blue -> warm orange/amber
  | "morning"     // ~6:30 AM - 10:30 AM: Fresh morning blue, crisp angled sunlight
  | "midday"      // ~10:30 AM - 3:00 PM: Zenith sun, azure cerulean sky, high illumination
  | "afternoon"   // ~3:00 PM - 5:00 PM: Deep warm sky, softening light
  | "golden-hour" // ~5:00 PM - 6:00 PM: Honey amber gold tones, radiant horizon
  | "sunset"      // ~6:00 PM - 6:45 PM: Transition blue -> warm gold -> orange -> deep twilight
  | "dusk"        // ~6:45 PM - 7:45 PM: Nautical/civil dusk, deep navy twilight
  | "night";      // ~7:45 PM - 4:30 AM: Deep natural sky, celestial stars, lunar glow

export type EnvironmentalWeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "fog"
  | "haze"
  | "snow";

export type EnvironmentType =
  | "hills"     // Layered Western Ghats / Deccan ridges (Pune, hills)
  | "coastal"   // Marine horizon with water reflection & sea mist (Mumbai, Chennai)
  | "plains"    // Expansive northern Gangetic plains, subtle historic skyline silhouette (Delhi)
  | "plateau"   // Rolling high Mysore plateau with lush tree canopy (Bengaluru)
  | "riverine"  // Broad river delta horizon with river mist (Kolkata)
  | "mountain"; // Alpine mountain peaks and valley atmosphere

export type Season = "summer" | "monsoon" | "autumn" | "winter" | "spring";

export interface SolarPosition {
  altitude: number;      // -90 to +90 degrees above horizon
  azimuth: number;       // 0 to 360 degrees (0 = N, 90 = E, 180 = S, 270 = W)
  screenX: number;       // 0 to 100% across the viewport
  screenY: number;       // 0 to 100% down the viewport (above horizon)
  isAboveHorizon: boolean;
  phase: TimeOfDayPhase;
  progressInPhase: number; // 0 to 1 smooth progress within current phase
}

export interface LunarEnvironmentData {
  phase: number;         // 0 to 1 (0 = New, 0.5 = Full)
  illumination: number;  // 0 to 100%
  phaseName: string;
  altitude: number;      // -90 to +90 degrees
  azimuth: number;       // 0 to 360 degrees
  screenX: number;       // 0 to 100%
  screenY: number;       // 0 to 100%
  glowIntensity: number; // 0 to 1
}

export interface SkyColorPalette {
  zenith: string;        // Deep upper sky color
  midSky: string;        // Mid-atmospheric transition color
  horizon: string;       // Horizon color (where sun/sunset glow emanates)
  ambient: string;       // Ambient bounce light color
  hazeColor: string;     // Color of atmospheric haze/fog
  sunGlow: string;       // Sun bloom corona color
  cloudBase: string;     // Shaded cloud base color
  cloudHighlight: string;// Sunlit cloud edge highlight color
  landscapeTint: string; // Color overlay for distant terrain
  starsOpacity: number;  // 0 to 1 visibility of celestial stars
  baseLuminance: number; // 0 (pure dark) to 1 (bright midday) for adaptive contrast
}

export interface AtmosphericMetrics {
  cloudCoverage: number;   // 0 (completely clear) to 1 (100% overcast)
  cloudDensity: number;    // 0 to 1
  visibilityKm: number;    // e.g. 0.4 km in dense fog to 10+ km
  humidity: number;        // 0 to 100%
  aqi: number;             // Air quality index (affects haze)
  hazeDensity: number;     // 0 (crystal clear) to 1 (dense haze/smog)
  fogDensity: number;      // 0 to 1
  precipRate: number;      // mm/h
  precipType: "none" | "rain" | "heavy-rain" | "snow";
  windSpeed: number;       // km/h
  windDir: string;         // "N", "NE", "E", etc.
  windAngleRad: number;    // radians for particle deflection
  thunderIntensity: number;// 0 to 1 (probability of lightning flashes)
  temperatureC: number;
}

export interface EnvironmentPreset {
  type: EnvironmentType;
  label: string;
  dominantFeature: string;
  hasWaterBody: boolean;
  waterReflectionOpacity: number;
  elevationMeters: number;
  defaultHazeFactor: number;
}

export interface BackgroundSceneState {
  location: Location;
  date: Date;
  hour: number;
  timeOfDayPhase: TimeOfDayPhase;
  weatherCondition: EnvironmentalWeatherCondition;
  environment: EnvironmentPreset;
  season: Season;
  solar: SolarPosition;
  lunar: LunarEnvironmentData;
  atmosphere: AtmosphericMetrics;
  palette: SkyColorPalette;
}

/** Configuration interface to register or override environmental presets */
export interface EnvironmentConfigRegistry {
  environments: Record<EnvironmentType, EnvironmentPreset>;
  cityMapping: Record<string, EnvironmentType>;
}
