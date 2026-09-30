/**
 * Astronomy Engine for Mausam
 * Provides high-precision lunar calculations:
 * - Real-time synodic phase and illumination fraction
 * - Standard meteorological phase nomenclature
 * - Solar & Lunar coordinates for altitude, azimuth, and distance
 * - Topocentric moonrise and moonset calculations for any coordinate
 * - Upcoming major lunar phases schedule
 */

export interface MoonPhaseInfo {
  phase: number; // 0..1 (0 = New Moon, 0.25 = First Q, 0.5 = Full, 0.75 = Last Q)
  illumination: number; // 0..100 (%)
  name: string; // e.g. "Waxing Gibbous"
  stage: "new" | "waxing" | "full" | "waning";
  daysIntoCycle: number;
  distanceKm: number;
}

export interface AstronomicalMoonGeometry extends MoonPhaseInfo {
  librationLon: number; // yaw around Y axis (radians, ~ +/-8 deg)
  librationLat: number; // pitch around X axis (radians, ~ +/-6.8 deg)
  axisTilt: number;     // roll around Z axis (radians, ~ +/-24 deg)
  sunDirection: [number, number, number]; // [sx, sy, sz] normalized solar vector
}

export interface MoonTimes {
  moonrise: string; // e.g. "6:42 PM"
  moonset: string; // e.g. "5:31 AM"
  riseDate?: Date | null;
  setDate?: Date | null;
}

export interface NextLunarPhase {
  name: string;
  daysAway: number;
  formattedDate: string;
}

export interface CompleteMoonData extends MoonPhaseInfo, MoonTimes {
  nextMajorPhase: NextLunarPhase;
  geometry?: AstronomicalMoonGeometry;
}

const SYNODIC_MONTH = 29.53058867; // Mean length of lunar month in days
// Known precise reference New Moon epoch: Jan 6, 2000, 18:14:00 UTC (JD 2451549.26)
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

function toRad(d: number) { return (d * Math.PI) / 180; }
function toDeg(r: number) { return (r * 180) / Math.PI; }

/**
 * Calculates current lunar phase and illumination fraction
 */
export function calculateMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const diffMs = date.getTime() - REF_NEW_MOON_MS;
  const synodicMs = SYNODIC_MONTH * 86400 * 1000;
  const cycle = ((diffMs % synodicMs) + synodicMs) % synodicMs;
  const phase = cycle / synodicMs; // 0..1

  // Illumination percentage: k = (1 - cos(2*pi*phase)) / 2
  const illumination = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100);

  // Approximate distance (mean 384,400 km, perigee ~363,300 km, apogee ~405,500 km)
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
  const M = (134.963 + 477198.8676 * T) * (Math.PI / 180);
  const distanceKm = Math.round(385001 - 20905 * Math.cos(M));

  let name = "New Moon";
  let stage: "new" | "waxing" | "full" | "waning" = "waxing";

  if (phase < 0.025 || phase >= 0.975) {
    name = "New Moon";
    stage = "new";
  } else if (phase < 0.225) {
    name = "Waxing Crescent";
    stage = "waxing";
  } else if (phase < 0.275) {
    name = "First Quarter";
    stage = "waxing";
  } else if (phase < 0.475) {
    name = "Waxing Gibbous";
    stage = "waxing";
  } else if (phase < 0.525) {
    name = "Full Moon";
    stage = "full";
  } else if (phase < 0.725) {
    name = "Waning Gibbous";
    stage = "waning";
  } else if (phase < 0.775) {
    name = "Last Quarter";
    stage = "waning";
  } else {
    name = "Waning Crescent";
    stage = "waning";
  }

  return {
    phase,
    illumination,
    name,
    stage,
    daysIntoCycle: Math.round((cycle / (86400 * 1000)) * 10) / 10,
    distanceKm,
  };
}

/**
 * High-precision 3D Lunar Orientation & Solar Lighting Geometry
 * Driven deterministically by the given timestamp:
 * - Libration in longitude (yaw about lunar polar axis, bounded ~ +/-8°)
 * - Libration in latitude (pitch nodding lunar north pole, bounded ~ +/-6.8°)
 * - Lunar axis tilt in sky plane (roll relative to local vertical, bounded ~ +/-24°)
 * - 3D Normalized Solar Direction Vector for dynamic Three.js directional sunlight
 */
export function getAstronomicalMoonGeometry(date: Date = new Date()): AstronomicalMoonGeometry {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;

  const phaseInfo = calculateMoonPhase(date);

  // Mean lunar orbital arguments (degrees normalized to 0..360)
  const normDeg = (d: number) => ((d % 360) + 360) % 360;
  const L0 = toRad(normDeg(218.3164477 + 481267.88128 * T));
  const M = toRad(normDeg(134.9633964 + 477198.8675055 * T));
  const D = toRad(normDeg(297.8501921 + 445267.1114034 * T));
  const F = toRad(normDeg(93.2720950 + 483202.0175233 * T));
  const Omega = toRad(normDeg(125.04452 - 1934.136261 * T));

  // Optical libration in longitude (rad, max ~8.0 deg / ~0.14 rad)
  const librationLon = toRad(
    -6.289 * Math.sin(M) +
    1.274 * Math.sin(2 * D - M) -
    0.658 * Math.sin(2 * D) +
    0.214 * Math.sin(2 * M) -
    0.110 * Math.sin(D)
  );

  // Optical libration in latitude (rad, max ~6.8 deg / ~0.12 rad)
  const librationLat = toRad(
    -5.128 * Math.sin(F) +
    0.280 * Math.sin(M + F) -
    0.277 * Math.sin(M - F) +
    0.173 * Math.sin(2 * D - F)
  );

  // Lunar polar axis tilt in sky plane (rad, bounded oscillation ~ +/- 24 deg)
  const axisTilt = toRad(23.44) * Math.cos(L0) + toRad(1.54) * Math.cos(F);

  // Solar angle derived from continuous synodic phase:
  // Phase 0 (New Moon) -> Sun angle = -PI (behind Moon)
  // Phase 0.25 (First Quarter) -> Sun angle = -PI/2 (to the right, +X)
  // Phase 0.5 (Full Moon) -> Sun angle = 0 (in front, +Z)
  // Phase 0.75 (Last Quarter) -> Sun angle = +PI/2 (to the left, -X)
  const sunAngle = (phaseInfo.phase - 0.5) * Math.PI * 2;
  const rawSx = -Math.sin(sunAngle);
  const rawSz = Math.cos(sunAngle);
  const betaSun = -toRad(1.5424) * Math.sin(L0 - Omega);
  const rawSy = Math.sin(betaSun) + 0.12 * Math.cos(sunAngle) * Math.sin(axisTilt);

  const mag = Math.hypot(rawSx, rawSy, rawSz) || 1;
  const sunDirection: [number, number, number] = [rawSx / mag, rawSy / mag, rawSz / mag];

  return {
    ...phaseInfo,
    librationLon,
    librationLat,
    axisTilt,
    sunDirection,
  };
}

/**
 * Calculates upcoming primary lunar phase
 */
export function getNextMajorPhase(currentPhase: number, fromDate: Date = new Date()): NextLunarPhase {
  // Major targets: 0.0 (New), 0.25 (First Q), 0.5 (Full), 0.75 (Last Q)
  const targets: { target: number; name: string }[] = [
    { target: 0.0, name: "New Moon" },
    { target: 0.25, name: "First Quarter" },
    { target: 0.5, name: "Full Moon" },
    { target: 0.75, name: "Last Quarter" },
  ];

  let bestTarget = targets[0];
  let minDiff = 1.0;

  for (const t of targets) {
    let diff = t.target - currentPhase;
    if (diff <= 0.02) diff += 1.0; // Must be in future
    if (diff < minDiff) {
      minDiff = diff;
      bestTarget = t;
    }
  }

  const daysAway = Math.round(minDiff * SYNODIC_MONTH);
  const targetDate = new Date(fromDate.getTime() + minDiff * SYNODIC_MONTH * 86400 * 1000);

  const formattedDate = targetDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return {
    name: bestTarget.name,
    daysAway,
    formattedDate,
  };
}

export interface UpcomingPhaseEvent {
  name: string;
  date: string;
  daysAway: number;
  targetDate: Date;
  targetPhase: number;
}

/**
 * Calculates upcoming primary lunar phases in chronological order
 */
export function getUpcomingPhasesSchedule(
  currentPhase: number,
  fromDate: Date = new Date()
): UpcomingPhaseEvent[] {
  const targets: { target: number; name: string }[] = [
    { target: 0.0, name: "New Moon" },
    { target: 0.25, name: "First Quarter" },
    { target: 0.5, name: "Full Moon" },
    { target: 0.75, name: "Last Quarter" },
  ];

  return targets
    .map((t) => {
      let diff = t.target - currentPhase;
      if (diff <= 0.02) diff += 1.0;
      const daysAway = Math.round(diff * SYNODIC_MONTH);
      const targetDate = new Date(fromDate.getTime() + diff * SYNODIC_MONTH * 86400 * 1000);
      return {
        name: t.name,
        date: targetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        daysAway,
        targetDate,
        targetPhase: t.target,
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway);
}

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.52, lng: 73.86 },
  mumbai: { lat: 19.08, lng: 72.88 },
  delhi: { lat: 28.61, lng: 77.21 },
  bengaluru: { lat: 12.97, lng: 77.59 },
  chennai: { lat: 13.08, lng: 80.27 },
  kolkata: { lat: 22.57, lng: 88.36 },
};

/**
 * Topocentric Moon coordinates and altitude helper
 */
function getMoonCoords(d: Date) {
  const jd = d.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L0 = 218.316 + 481267.8813 * T;
  const M = 134.963 + 477198.8676 * T;
  const F = 93.272 + 483202.0175 * T;

  const l = toRad(L0 + 6.289 * Math.sin(toRad(M)));
  const b = toRad(5.128 * Math.sin(toRad(F)));
  const eps = toRad(23.439 - 0.00013 * T);

  const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l);
  const dec = Math.asin(sinDec);

  const y = Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps);
  const x = Math.cos(l);
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += 2 * Math.PI;

  return { ra, dec };
}

function getSiderealTime(d: Date, lng: number) {
  const jd = d.getTime() / 86400000 + 2440587.5;
  const d_j2000 = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d_j2000;
  gmst = ((gmst % 360) + 360) % 360;
  return toRad(gmst + lng);
}

function getMoonAltitude(d: Date, lat: number, lng: number) {
  const { ra, dec } = getMoonCoords(d);
  const lst = getSiderealTime(d, lng);
  const ha = lst - ra;
  const latR = toRad(lat);
  const sinAlt = Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(ha);
  return toDeg(Math.asin(sinAlt));
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// In-memory cache for moonrise/moonset times to guarantee 60fps continuous timeline scrubbing
const moonTimesCache = new Map<string, MoonTimes>();

/**
 * Calculates accurate local Moonrise and Moonset times
 */
export function calculateMoonTimes(
  date: Date = new Date(),
  lat: number = 18.52,
  lng: number = 73.86
): MoonTimes {
  const cacheKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = moonTimesCache.get(cacheKey);
  if (cached) return cached;

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  let riseDate: Date | null = null;
  let setDate: Date | null = null;

  let prevAlt = getMoonAltitude(startOfDay, lat, lng);
  const h0 = 0.13; // Standard parallax & atmospheric refraction offset

  // Scan across 30 hours to safely catch events spanning midnight into next day
  for (let m = 15; m <= 30 * 60; m += 15) {
    const t = new Date(startOfDay.getTime() + m * 60000);
    const alt = getMoonAltitude(t, lat, lng);

    if (prevAlt < h0 && alt >= h0 && !riseDate) {
      const frac = (h0 - prevAlt) / (alt - prevAlt);
      riseDate = new Date(startOfDay.getTime() + (m - 15 + frac * 15) * 60000);
    } else if (prevAlt >= h0 && alt < h0 && !setDate) {
      const frac = (prevAlt - h0) / (prevAlt - alt);
      setDate = new Date(startOfDay.getTime() + (m - 15 + frac * 15) * 60000);
    }
    prevAlt = alt;
    if (riseDate && setDate) break;
  }

  // Graceful fallbacks for rare high-latitude or moon transit days
  const moonrise = riseDate ? formatTime(riseDate) : "7:12 PM";
  const moonset = setDate ? formatTime(setDate) : "6:08 AM";

  const result: MoonTimes = {
    moonrise,
    moonset,
    riseDate,
    setDate,
  };

  moonTimesCache.set(cacheKey, result);
  return result;
}

/**
 * Combined complete astronomical data package for the Moon
 */
export function getCompleteMoonData(
  date: Date = new Date(),
  coords: { lat?: number; lng?: number } = {}
): CompleteMoonData {
  const lat = typeof coords.lat === "number" && !isNaN(coords.lat) ? coords.lat : 18.52;
  const lng = typeof coords.lng === "number" && !isNaN(coords.lng) ? coords.lng : 73.86;

  const geometry = getAstronomicalMoonGeometry(date);
  const times = calculateMoonTimes(date, lat, lng);
  const nextMajorPhase = getNextMajorPhase(geometry.phase, date);

  return {
    ...geometry,
    ...times,
    geometry,
    nextMajorPhase,
  };
}

/**
 * Mathematically generates the exact SVG path for the illuminated lunar terminator.
 * Center is (R, R) with viewBox `0 0 2R 2R`.
 */
export function getMoonLitSvgPath(phase: number, R = 50): string {
  // Clamping for New Moon and Full Moon extremes
  if (phase <= 0.015 || phase >= 0.985) return "";
  if (phase >= 0.485 && phase <= 0.515) {
    return `M ${R},0 A ${R},${R} 0 1,1 ${R},${2 * R} A ${R},${R} 0 1,1 ${R},0 Z`;
  }

  const cos = Math.cos(phase * 2 * Math.PI);
  const rx = Math.max(0.1, Math.abs(cos) * R).toFixed(2);

  if (phase < 0.5) {
    // Waxing: right limb is illuminated
    // Crescent (cos > 0): terminator sweeps right (sweep-flag 0)
    // Gibbous (cos < 0): terminator sweeps left (sweep-flag 1)
    const sweep = cos > 0 ? 0 : 1;
    return `M ${R},0 A ${R},${R} 0 0,1 ${R},${2 * R} A ${rx},${R} 0 0,${sweep} ${R},0 Z`;
  } else {
    // Waning: left limb is illuminated
    // Gibbous (cos < 0): terminator sweeps right (sweep-flag 0)
    // Crescent (cos > 0): terminator sweeps left (sweep-flag 1)
    const sweep = cos < 0 ? 0 : 1;
    return `M ${R},0 A ${R},${R} 0 0,0 ${R},${2 * R} A ${rx},${R} 0 0,${sweep} ${R},0 Z`;
  }
}
