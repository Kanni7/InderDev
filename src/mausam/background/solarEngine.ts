/**
 * Solar & Celestial Positioning Engine
 * 
 * Accurately models solar elevation, azimuth, and smooth time-of-day phases.
 * Computes continuous screen projection coordinates for the sun and moon.
 */

import type { TimeOfDayPhase, SolarPosition, LunarEnvironmentData, Season } from "./types";
import { calculateMoonPhase } from "../astronomy";

/** Helper to parse time string like "5:58 AM" or "6:21 PM" into decimal hour (0..24) */
export function parseTimeStringToHours(str?: string): number | null {
  if (!str) return null;
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === "PM" && h < 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return h + m / 60;
}

/** Determines seasonal context based on month */
export function getSeason(date: Date): Season {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 2 && month <= 4) return "summer";       // Mar - May
  if (month >= 5 && month <= 8) return "monsoon";      // Jun - Sep (Monsoon in South Asia)
  if (month >= 9 && month <= 10) return "autumn";      // Oct - Nov
  return "winter";                                     // Dec - Feb
}

/**
 * Maps decimal current hour and sunrise/sunset into one of the 9 gradual TimeOfDayPhases.
 * Also returns fractional progress (0..1) within that phase for seamless interpolation.
 */
export function getDetailedTimeOfDay(
  decimalHour: number,
  sunriseHour: number = 6.0,
  sunsetHour: number = 18.25
): { phase: TimeOfDayPhase; progressInPhase: number } {
  // Key transition offsets in hours relative to sunrise and sunset:
  const preDawnStart = sunriseHour - 1.5;   // e.g. 4:30 AM
  const sunriseStart = sunriseHour - 0.35;  // e.g. 5:37 AM
  const sunriseEnd = sunriseHour + 0.6;     // e.g. 6:36 AM
  const morningEnd = 10.5;                  // 10:30 AM
  const middayEnd = 15.0;                   // 3:00 PM
  const goldenHourStart = sunsetHour - 1.1; // e.g. 5:09 PM
  const sunsetStart = sunsetHour - 0.25;    // e.g. 6:00 PM
  const sunsetEnd = sunsetHour + 0.55;      // e.g. 6:48 PM
  const duskEnd = sunsetHour + 1.4;         // e.g. 7:39 PM

  // Wrap decimalHour into [0, 24)
  const h = ((decimalHour % 24) + 24) % 24;

  if (h >= preDawnStart && h < sunriseStart) {
    const p = (h - preDawnStart) / (sunriseStart - preDawnStart);
    return { phase: "pre-dawn", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= sunriseStart && h < sunriseEnd) {
    const p = (h - sunriseStart) / (sunriseEnd - sunriseStart);
    return { phase: "sunrise", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= sunriseEnd && h < morningEnd) {
    const p = (h - sunriseEnd) / (morningEnd - sunriseEnd);
    return { phase: "morning", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= morningEnd && h < middayEnd) {
    const p = (h - morningEnd) / (middayEnd - morningEnd);
    return { phase: "midday", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= middayEnd && h < goldenHourStart) {
    const p = (h - middayEnd) / (goldenHourStart - middayEnd);
    return { phase: "afternoon", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= goldenHourStart && h < sunsetStart) {
    const p = (h - goldenHourStart) / (sunsetStart - goldenHourStart);
    return { phase: "golden-hour", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= sunsetStart && h < sunsetEnd) {
    const p = (h - sunsetStart) / (sunsetEnd - sunsetStart);
    return { phase: "sunset", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }
  if (h >= sunsetEnd && h < duskEnd) {
    const p = (h - sunsetEnd) / (duskEnd - sunsetEnd);
    return { phase: "dusk", progressInPhase: Math.min(Math.max(p, 0), 1) };
  }

  // Night: from duskEnd through midnight to preDawnStart
  let nightProgress = 0;
  if (h >= duskEnd) {
    const totalNightDuration = (24 - duskEnd) + preDawnStart;
    nightProgress = (h - duskEnd) / totalNightDuration;
  } else {
    // past midnight
    const totalNightDuration = (24 - duskEnd) + preDawnStart;
    nightProgress = ((24 - duskEnd) + h) / totalNightDuration;
  }

  return { phase: "night", progressInPhase: Math.min(Math.max(nightProgress, 0), 1) };
}

/**
 * Calculates continuous solar elevation altitude (-90 to +90) and screen coordinates.
 * Screen coordinates map the sun's natural arc across the sky:
 * Rising in the East (screenX ~22%), peaking at noon (screenX ~50%, screenY ~18%),
 * and setting in the West (screenX ~78%, screenY ~72%).
 */
export function calculateSolarPosition(
  decimalHour: number,
  sunriseHour: number = 6.0,
  sunsetHour: number = 18.25
): SolarPosition {
  const { phase, progressInPhase } = getDetailedTimeOfDay(decimalHour, sunriseHour, sunsetHour);
  const dayLength = sunsetHour - sunriseHour;
  const isDay = decimalHour >= sunriseHour && decimalHour <= sunsetHour;

  let altitude = -30;
  let azimuth = 180;
  let screenX = 50;
  let screenY = 120; // below screen by default

  if (isDay) {
    // Daylight progress: 0 at sunrise, 0.5 at solar noon, 1.0 at sunset
    const dayProgress = (decimalHour - sunriseHour) / dayLength;
    // Altitude reaches up to ~72 degrees at midday
    altitude = Math.sin(dayProgress * Math.PI) * 72;
    azimuth = 90 + dayProgress * 180; // 90 (East) -> 180 (South) -> 270 (West)

    // Project onto screen viewport:
    // screenX moves smoothly from 20% to 80%
    screenX = 20 + dayProgress * 60;
    // screenY arcs from ~72% (horizon) up to ~18% (midday peak) and back down to ~72%
    screenY = 72 - Math.sin(dayProgress * Math.PI) * 54;
  } else {
    // Night / Twilight
    if (phase === "pre-dawn") {
      altitude = -12 + progressInPhase * 10;
      screenX = 22;
      screenY = 85 - progressInPhase * 12; // slowly approaching horizon
    } else if (phase === "sunrise") {
      altitude = -2 + progressInPhase * 10;
      screenX = 22 + progressInPhase * 8;
      screenY = 74 - progressInPhase * 10;
    } else if (phase === "sunset") {
      altitude = 5 - progressInPhase * 8;
      screenX = 72 + progressInPhase * 6;
      screenY = 66 + progressInPhase * 10;
    } else if (phase === "dusk") {
      altitude = -3 - progressInPhase * 12;
      screenX = 80;
      screenY = 78 + progressInPhase * 20;
    } else {
      // Deep night
      altitude = -45;
      screenX = 50;
      screenY = 130;
    }
  }

  return {
    altitude,
    azimuth,
    screenX: Math.round(screenX * 10) / 10,
    screenY: Math.round(screenY * 10) / 10,
    isAboveHorizon: altitude >= -1,
    phase,
    progressInPhase,
  };
}

/**
 * Calculates continuous lunar position and screen coordinates for night/twilight skies.
 * Moon follows an opposing celestial arc across the night sky.
 */
export function calculateLunarPosition(
  decimalHour: number,
  date: Date = new Date(),
  sunsetHour: number = 18.25,
  sunriseHour: number = 6.0
): LunarEnvironmentData {
  const moonInfo = calculateMoonPhase(date);

  // Approximate lunar transit across night:
  // Rises around sunset and sets around sunrise for full moon, varies with phase
  const nightLength = (24 - sunsetHour) + sunriseHour;
  let nightProgress = 0;
  if (decimalHour >= sunsetHour) {
    nightProgress = (decimalHour - sunsetHour) / nightLength;
  } else if (decimalHour <= sunriseHour) {
    nightProgress = ((24 - sunsetHour) + decimalHour) / nightLength;
  } else {
    // Daytime - moon is faint or obscured
    nightProgress = 0.5;
  }

  // Moon arc across night sky
  const altitude = Math.sin(nightProgress * Math.PI) * 62;
  const screenX = 75 - nightProgress * 50; // moves from east (right) to west (left)
  const screenY = 76 - Math.sin(nightProgress * Math.PI) * 46;

  // Glow intensity is highest for Full Moon (phase ~0.5) and at night
  const isNightTime = decimalHour < sunriseHour || decimalHour > sunsetHour;
  const phaseGlowMult = 0.2 + (moonInfo.illumination / 100) * 0.8;
  const glowIntensity = isNightTime ? 0.35 * phaseGlowMult : 0.08 * phaseGlowMult;

  return {
    phase: moonInfo.phase,
    illumination: moonInfo.illumination,
    phaseName: moonInfo.name,
    altitude,
    azimuth: 180,
    screenX: Math.round(screenX * 10) / 10,
    screenY: Math.round(screenY * 10) / 10,
    glowIntensity,
  };
}
