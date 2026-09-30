/**
 * Meteorological Wind Field & Vector Engine
 * 
 * Implements a continuous gridded 2D wind field over geographic coordinates,
 * converting meteorological wind directions (direction FROM which wind blows)
 * into physical motion vectors (direction TO which air particles travel),
 * with spatial Shepard/Barnes IDW interpolation and temporal blending.
 */

export interface WindVector {
  u: number;         // Eastward component of air motion (km/h, + = moving East, - = moving West)
  v: number;         // Northward component of air motion (km/h, + = moving North, - = moving South)
  speed: number;     // Magnitude / scalar wind speed in km/h
  direction: string; // Meteorological compass direction FROM which wind blows (e.g. "W", "ENE")
  deg: number;       // Meteorological direction in degrees [0, 360) FROM which wind blows
}

export interface WindFieldBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface WindField {
  timestamp: number;
  bounds: WindFieldBounds;
  gridWidth: number;
  gridHeight: number;
  u: Float32Array; // Flattened row-major array [row * gridWidth + col]
  v: Float32Array; // Flattened row-major array [row * gridWidth + col]
}

export interface ObservationPoint {
  lat: number;
  lng: number;
  speed: number;
  dirDeg?: number;
  dirStr?: string;
}

export const COMPASS_DEGREES: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

const COMPASS_POINTS: string[] = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
];

/**
 * Converts meteorological direction string (e.g. "NE") or number to normalized degrees [0, 360).
 */
export function meteoDirToDegrees(dir: string | number): number {
  if (typeof dir === "number") {
    return ((dir % 360) + 360) % 360;
  }
  const clean = dir.trim().toUpperCase();
  if (clean in COMPASS_DEGREES) {
    return COMPASS_DEGREES[clean];
  }
  const parsed = parseFloat(clean);
  if (!isNaN(parsed)) {
    return ((parsed % 360) + 360) % 360;
  }
  return 270; // Fallback to West wind
}

/**
 * Converts meteorological degrees [0, 360) to 16-point compass label.
 */
export function degreesToMeteoCompass(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 22.5) % 16;
  return COMPASS_POINTS[idx];
}

/**
 * Converts meteorological wind (coming FROM meteoDeg) to physical air motion vector (u, v).
 *
 * Meteorological convention:
 * - 0° (North wind): Blows FROM North, moves TOWARDS South (v < 0).
 * - 90° (East wind): Blows FROM East, moves TOWARDS West (u < 0).
 * - 180° (South wind): Blows FROM South, moves TOWARDS North (v > 0).
 * - 270° (West wind): Blows FROM West, moves TOWARDS East (u > 0).
 *
 * In physical coordinates:
 * u = -speed * sin(rad)
 * v = -speed * cos(rad)
 */
export function meteoToMotionVector(speed: number, meteoDeg: number): { u: number; v: number } {
  const rad = (meteoDeg * Math.PI) / 180;
  return {
    u: -speed * Math.sin(rad),
    v: -speed * Math.cos(rad),
  };
}

/**
 * Converts motion vector (u, v) back to meteorological parameters:
 * speed, direction degrees [0, 360), and 16-point compass label.
 */
export function motionVectorToMeteo(u: number, v: number): { speed: number; deg: number; dir: string } {
  const speed = Math.hypot(u, v);
  if (speed < 0.001) {
    return { speed: 0, deg: 0, dir: "CALM" };
  }
  // Air moves towards (u, v). Wind comes FROM (-u, -v).
  // atan2(x, y) measured clockwise from North: atan2(-u, -v)
  const rad = Math.atan2(-u, -v);
  let deg = (rad * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return {
    speed: Math.round(speed * 10) / 10,
    deg: Math.round(deg),
    dir: degreesToMeteoCompass(deg),
  };
}

/**
 * Returns a Unicode motion arrow indicating where the air is travelling TO.
 * Wind FROM East (90°) blows toward West -> arrow pointing left ←.
 * Wind FROM SW (225°) blows toward NE -> arrow pointing up-right ↗.
 */
export function getMotionArrow(meteoDeg: number): string {
  // Angle of motion: (meteoDeg + 180) % 360
  const motionDeg = ((meteoDeg + 180) % 360 + 360) % 360;
  // 0° motion = North (↑), 45° = NE (↗), 90° = East (→), 135° = SE (↘),
  // 180° = South (↓), 225° = SW (↙), 270° = West (←), 315° = NW (↖)
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const idx = Math.round(motionDeg / 45) % 8;
  return arrows[idx];
}

/**
 * Default geographic boundary enclosing the Indian subcontinent and neighboring marine areas.
 */
export const DEFAULT_INDIA_BOUNDS: WindFieldBounds = {
  minLat: 6.0,
  maxLat: 37.0,
  minLng: 67.0,
  maxLng: 98.0,
};

/**
 * Creates a gridded 2D WindField using spatial objective analysis (Modified Shepard Inverse Distance Weighting).
 * Interpolates vector components u and v independently to prevent angular wrap-around artifacts.
 */
export function createWindField(
  observations: ObservationPoint[],
  options?: {
    bounds?: WindFieldBounds;
    gridWidth?: number;
    gridHeight?: number;
    timestamp?: number;
    power?: number;
    smoothing?: number;
  }
): WindField {
  const bounds = options?.bounds ?? DEFAULT_INDIA_BOUNDS;
  const gridWidth = options?.gridWidth ?? 64;
  const gridHeight = options?.gridHeight ?? 64;
  const timestamp = options?.timestamp ?? Date.now();
  const power = options?.power ?? 2.0;
  const smoothing = options?.smoothing ?? 0.8; // Avoid division by near-zero

  const totalCells = gridWidth * gridHeight;
  const uArr = new Float32Array(totalCells);
  const vArr = new Float32Array(totalCells);

  if (observations.length === 0) {
    return {
      timestamp,
      bounds,
      gridWidth,
      gridHeight,
      u: uArr,
      v: vArr,
    };
  }

  // Pre-calculate observation motion vectors
  const obsVectors = observations.map((obs) => {
    const deg = obs.dirDeg !== undefined ? obs.dirDeg : meteoDirToDegrees(obs.dirStr ?? "W");
    const { u, v } = meteoToMotionVector(obs.speed, deg);
    return {
      lat: obs.lat,
      lng: obs.lng,
      u,
      v,
    };
  });

  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const dLat = latSpan / (gridHeight - 1);
  const dLng = lngSpan / (gridWidth - 1);

  for (let r = 0; r < gridHeight; r++) {
    const lat = bounds.minLat + r * dLat;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    for (let c = 0; c < gridWidth; c++) {
      const lng = bounds.minLng + c * dLng;

      let weightSum = 0;
      let uSum = 0;
      let vSum = 0;

      for (let i = 0; i < obsVectors.length; i++) {
        const obs = obsVectors[i];
        const dy = (lat - obs.lat);
        const dx = (lng - obs.lng) * cosLat;
        const distSq = dx * dx + dy * dy;

        // Modified Shepard weight: 1 / (dist^p + epsilon)
        const weight = 1 / Math.pow(distSq + smoothing, power / 2);
        weightSum += weight;
        uSum += obs.u * weight;
        vSum += obs.v * weight;
      }

      const idx = r * gridWidth + c;
      if (weightSum > 0) {
        uArr[idx] = uSum / weightSum;
        vArr[idx] = vSum / weightSum;
      } else {
        uArr[idx] = 0;
        vArr[idx] = 0;
      }
    }
  }

  return {
    timestamp,
    bounds,
    gridWidth,
    gridHeight,
    u: uArr,
    v: vArr,
  };
}

/**
 * Samples the wind vector at any arbitrary geographic coordinate (lat, lon) using bilinear interpolation.
 */
export function getWindVector(field: WindField, lat: number, lon: number): WindVector {
  const { bounds, gridWidth, gridHeight, u, v } = field;

  // Clamp coordinates within bounds
  const clampedLat = Math.max(bounds.minLat, Math.min(bounds.maxLat, lat));
  const clampedLng = Math.max(bounds.minLng, Math.min(bounds.maxLng, lon));

  const latNorm = (clampedLat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  const lngNorm = (clampedLng - bounds.minLng) / (bounds.maxLng - bounds.minLng);

  const rFloat = latNorm * (gridHeight - 1);
  const cFloat = lngNorm * (gridWidth - 1);

  const r0 = Math.floor(rFloat);
  const r1 = Math.min(gridHeight - 1, r0 + 1);
  const c0 = Math.floor(cFloat);
  const c1 = Math.min(gridWidth - 1, c0 + 1);

  const rf = rFloat - r0;
  const cf = cFloat - c0;

  const idx00 = r0 * gridWidth + c0;
  const idx10 = r0 * gridWidth + c1;
  const idx01 = r1 * gridWidth + c0;
  const idx11 = r1 * gridWidth + c1;

  // Bilinear interpolation for u
  const u0 = u[idx00] * (1 - cf) + u[idx10] * cf;
  const u1 = u[idx01] * (1 - cf) + u[idx11] * cf;
  const interpolatedU = u0 * (1 - rf) + u1 * rf;

  // Bilinear interpolation for v
  const v0 = v[idx00] * (1 - cf) + v[idx10] * cf;
  const v1 = v[idx01] * (1 - cf) + v[idx11] * cf;
  const interpolatedV = v0 * (1 - rf) + v1 * rf;

  const meteo = motionVectorToMeteo(interpolatedU, interpolatedV);

  return {
    u: interpolatedU,
    v: interpolatedV,
    speed: meteo.speed,
    direction: meteo.dir,
    deg: meteo.deg,
  };
}

/**
 * Linearly blends two WindFields across time: (1 - alpha) * fieldA + alpha * fieldB.
 * Enables smooth vector evolution during forecast timeline scrubbing and playback.
 */
export function interpolateWindFields(fieldA: WindField, fieldB: WindField, alpha: number): WindField {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const oneMinusAlpha = 1 - clampedAlpha;

  const total = fieldA.gridWidth * fieldA.gridHeight;
  const uArr = new Float32Array(total);
  const vArr = new Float32Array(total);

  const uA = fieldA.u;
  const vA = fieldA.v;
  const uB = fieldB.u;
  const vB = fieldB.v;

  for (let i = 0; i < total; i++) {
    uArr[i] = uA[i] * oneMinusAlpha + uB[i] * clampedAlpha;
    vArr[i] = vA[i] * oneMinusAlpha + vB[i] * clampedAlpha;
  }

  return {
    timestamp: fieldA.timestamp * oneMinusAlpha + fieldB.timestamp * clampedAlpha,
    bounds: fieldA.bounds,
    gridWidth: fieldA.gridWidth,
    gridHeight: fieldA.gridHeight,
    u: uArr,
    v: vArr,
  };
}
