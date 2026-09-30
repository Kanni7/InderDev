import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { makeT, type Lang } from "./i18n";
import type { Wind, Location } from "./data";
import {
  fetchRadarCitiesWind,
  fetchWindTimeline,
  fetchRainViewerFrames,
  type LiveRadarCityWind,
  type WindTimelineFrame,
  type RainViewerData,
} from "../data/openMeteo";
import * as I from "./icons";

/* ─────────────────── CONFIGURATION ─────────────────── */

// Authentic GIS Basemaps (ESRI World Dark Gray Canvas & ESRI World Imagery)
export const TILE_URL_ESRI_DARK_BASE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_DARK_BASE_FALLBACK = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_DARK_REFERENCE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export const TILE_URL_PRIMARY = TILE_URL_ESRI_DARK_BASE;
export const TILE_URL_FALLBACK = TILE_URL_ESRI_DARK_BASE_FALLBACK;

// Backwards-compatible aliases
export const TILE_URL_CARTO_DARK = TILE_URL_ESRI_DARK_BASE;
export const TILE_URL_CARTO_DARK_FALLBACK = TILE_URL_ESRI_DARK_BASE_FALLBACK;

export const TILE_URL_ESRI_SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_REFERENCE = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

// Coordinates for core cities supported by the app
export const APP_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.52, lng: 73.86 },
  mumbai: { lat: 19.08, lng: 72.88 },
  delhi: { lat: 28.61, lng: 77.21 },
  bengaluru: { lat: 12.97, lng: 77.59 },
  chennai: { lat: 13.08, lng: 80.27 },
  kolkata: { lat: 22.57, lng: 88.36 },
};

export interface RadarCity {
  name: string;
  lat: number;
  lng: number;
  baseSpeed: number; // default fallback if live data pending
}

// Comprehensive cities across India for the wind radar map
export const WIND_CITIES: RadarCity[] = [
  // West & Central
  { name: "Pune", lat: 18.52, lng: 73.86, baseSpeed: 10 },
  { name: "Mumbai", lat: 19.08, lng: 72.88, baseSpeed: 14 },
  { name: "Nashik", lat: 19.99, lng: 73.78, baseSpeed: 11 },
  { name: "Surat", lat: 21.17, lng: 72.83, baseSpeed: 12 },
  { name: "Veraval", lat: 20.90, lng: 70.36, baseSpeed: 16 },
  { name: "Ahmedabad", lat: 23.02, lng: 72.57, baseSpeed: 12 },
  { name: "Nagpur", lat: 21.14, lng: 79.08, baseSpeed: 9 },
  { name: "Solapur", lat: 17.65, lng: 75.90, baseSpeed: 12 },
  { name: "Panaji", lat: 15.49, lng: 73.82, baseSpeed: 14 },
  { name: "Bhopal", lat: 23.25, lng: 77.41, baseSpeed: 10 },
  { name: "Indore", lat: 22.72, lng: 75.86, baseSpeed: 11 },
  { name: "Raipur", lat: 21.25, lng: 81.63, baseSpeed: 9 },

  // South
  { name: "Hubballi", lat: 15.36, lng: 75.12, baseSpeed: 15 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59, baseSpeed: 12 },
  { name: "Mysuru", lat: 12.29, lng: 76.63, baseSpeed: 11 },
  { name: "Hyderabad", lat: 17.38, lng: 78.48, baseSpeed: 10 },
  { name: "Warangal", lat: 17.96, lng: 79.59, baseSpeed: 9 },
  { name: "Vijayawada", lat: 16.50, lng: 80.64, baseSpeed: 13 },
  { name: "Visakhapatnam", lat: 17.68, lng: 83.21, baseSpeed: 14 },
  { name: "Chennai", lat: 13.08, lng: 80.27, baseSpeed: 15 },
  { name: "Puducherry", lat: 11.94, lng: 79.80, baseSpeed: 13 },
  { name: "Coimbatore", lat: 11.01, lng: 76.95, baseSpeed: 14 },
  { name: "Kochi", lat: 9.93, lng: 76.26, baseSpeed: 13 },
  { name: "Madurai", lat: 9.92, lng: 78.11, baseSpeed: 12 },
  { name: "Thiruvananthapuram", lat: 8.52, lng: 76.93, baseSpeed: 16 },
  { name: "Rameswaram", lat: 9.28, lng: 79.31, baseSpeed: 18 },
  { name: "Trincomalee", lat: 8.58, lng: 81.23, baseSpeed: 18 },

  // North & East
  { name: "Delhi", lat: 28.61, lng: 77.21, baseSpeed: 11 },
  { name: "Jaipur", lat: 26.91, lng: 75.79, baseSpeed: 11 },
  { name: "Chandigarh", lat: 30.73, lng: 76.78, baseSpeed: 10 },
  { name: "Lucknow", lat: 26.85, lng: 80.95, baseSpeed: 9 },
  { name: "Kolkata", lat: 22.57, lng: 88.36, baseSpeed: 10 },
  { name: "Bhubaneswar", lat: 20.29, lng: 85.82, baseSpeed: 12 },
  { name: "Patna", lat: 25.61, lng: 85.14, baseSpeed: 9 },
  { name: "Ranchi", lat: 23.34, lng: 85.31, baseSpeed: 10 },
  { name: "Guwahati", lat: 26.14, lng: 91.74, baseSpeed: 8 },
  { name: "Dehradun", lat: 30.32, lng: 78.03, baseSpeed: 9 },
];

/* ─────────────────── GEOGRAPHIC VECTOR BOUNDARIES ─────────────────── */

// Arabian Sea Coastline (Gujarat through Maharashtra, Goa, Karnataka, Kerala to Kanyakumari)
export const COASTLINE_WEST: [number, number][] = [
  [23.7, 68.2], [23.1, 68.6], [22.8, 69.8], [22.4, 70.1], [22.3, 69.1],
  [21.6, 69.6], [20.9, 70.36], [20.7, 70.9], [21.0, 72.0], [21.7, 72.2],
  [21.6, 72.6], [21.17, 72.83], [20.5, 72.9], [19.9, 72.7], [18.97, 72.82],
  [18.0, 73.0], [17.0, 73.2], [16.0, 73.5], [15.49, 73.82], [14.8, 74.1],
  [14.0, 74.5], [12.91, 74.85], [11.8, 75.3], [10.8, 75.9], [9.93, 76.26],
  [9.0, 76.5], [8.52, 76.93], [8.08, 77.55],
];

// Bay of Bengal Coastline (Kanyakumari through Tamil Nadu, Andhra, Odisha to West Bengal)
export const COASTLINE_EAST: [number, number][] = [
  [8.08, 77.55], [8.7, 78.1], [9.28, 79.31], [9.8, 79.0], [10.3, 79.4],
  [10.76, 79.84], [11.5, 79.8], [11.94, 79.80], [12.5, 80.1], [13.08, 80.27],
  [13.8, 80.2], [14.44, 79.98], [15.2, 80.0], [15.50, 80.04], [15.9, 80.5],
  [16.18, 81.13], [16.5, 81.8], [16.9, 82.3], [17.68, 83.21], [18.3, 83.9],
  [18.8, 84.4], [19.31, 84.79], [19.81, 85.83], [20.29, 86.7], [21.4, 87.0],
  [21.8, 87.8], [22.2, 88.1], [22.57, 88.36],
];

// North-West International Border (Gujarat, Rajasthan, Punjab, J&K, Ladakh)
export const NORTH_WEST_BORDER: [number, number][] = [
  [23.7, 68.2], [24.1, 68.8], [24.5, 70.1], [25.7, 70.3], [27.0, 70.5],
  [28.0, 71.8], [29.5, 73.0], [30.0, 73.8], [31.0, 74.5], [32.0, 74.8],
  [32.8, 74.5], [33.8, 74.1], [34.7, 74.4], [35.5, 76.5],
];

// Northern Himalayan & Nepal-Sikkim Border
export const NORTHERN_HIMALAYAN_BORDER: [number, number][] = [
  [35.5, 76.5], [35.2, 77.8], [34.0, 78.8], [33.0, 79.2], [32.2, 78.8],
  [31.5, 78.4], [30.8, 79.2], [30.0, 80.5], [28.8, 80.1],
  [28.0, 81.5], [27.5, 83.5], [26.8, 85.2], [26.5, 87.0], [26.7, 88.1],
  [27.7, 88.2], [28.0, 88.6], [27.2, 88.9], [26.8, 89.8], [26.8, 92.1],
];

// North-East International Border
export const NORTHEAST_BORDER: [number, number][] = [
  [26.8, 92.1], [27.5, 92.5], [28.5, 94.5], [29.0, 96.5], [28.0, 97.2],
  [26.5, 96.5], [25.5, 94.8], [24.0, 93.3], [22.5, 93.0], [22.0, 92.4],
];

// Bangladesh Border
export const BANGLADESH_BORDER: [number, number][] = [
  [22.0, 92.4], [23.5, 92.2], [24.5, 92.4], [25.1, 91.5], [25.2, 89.8],
  [26.1, 89.0], [25.2, 88.2], [24.0, 88.5], [22.5, 88.8], [21.8, 89.0],
  [22.57, 88.36],
];

// Sri Lanka Coastline Loop
export const SRI_LANKA_COAST: [number, number][] = [
  [9.66, 80.01], [9.1, 80.5], [8.58, 81.23], [7.73, 81.70], [6.8, 81.8],
  [6.0, 81.3], [5.95, 80.53], [6.3, 80.0], [6.92, 79.86], [7.5, 79.8],
  [8.03, 79.82], [8.6, 79.8], [9.2, 79.9], [9.66, 80.01],
];

// Nationwide State Boundaries
export const STATE_BORDERS: [number, number][][] = [
  // ── SOUTH INDIA ──
  // Karnataka - Goa
  [[15.7, 73.7], [15.5, 74.2], [14.9, 74.1]],
  // Maharashtra - Goa
  [[15.7, 73.7], [15.8, 74.0]],
  // Maharashtra - Karnataka
  [[15.8, 74.0], [16.2, 74.4], [16.8, 75.0], [17.2, 75.8], [17.4, 76.6], [17.8, 77.2]],
  // Karnataka - Kerala (Coorg / Western Ghats)
  [[12.7, 75.0], [12.2, 75.5], [11.9, 75.8]],
  // Kerala - Tamil Nadu (Western Ghats)
  [[8.1, 77.5], [8.7, 77.3], [9.5, 77.2], [10.2, 77.0], [10.8, 76.8], [11.5, 76.5], [11.9, 75.8]],
  // Karnataka - Tamil Nadu (Nilgiris, Hosur, Kuppam)
  [[11.9, 75.8], [11.5, 76.5], [11.8, 77.1], [12.6, 77.8], [12.8, 78.4]],
  // Karnataka - Andhra Pradesh
  [[12.8, 78.4], [13.4, 78.1], [13.8, 77.5], [15.1, 76.9], [16.2, 77.3], [17.2, 77.4], [17.8, 77.2]],
  // Andhra Pradesh - Tamil Nadu
  [[13.5, 80.2], [13.4, 79.5], [13.0, 79.1], [12.8, 78.4]],
  // Telangana - Andhra Pradesh
  [[17.8, 77.2], [16.2, 77.3], [16.0, 77.6], [15.8, 78.0], [16.1, 78.8], [16.5, 79.2], [16.8, 79.6], [17.0, 80.2], [17.7, 80.8], [18.8, 80.0]],
  // Maharashtra - Telangana
  [[17.8, 77.2], [18.6, 77.8], [19.5, 78.5], [19.7, 79.5], [18.8, 80.0]],
  // Andhra Pradesh - Odisha
  [[18.3, 83.0], [19.0, 84.6]],

  // ── WEST & CENTRAL INDIA ──
  // Maharashtra - Gujarat
  [[20.2, 72.8], [20.5, 73.4], [21.4, 74.1], [21.6, 74.4]],
  // Maharashtra - Madhya Pradesh
  [[21.6, 74.4], [21.3, 76.0], [21.6, 77.5], [21.6, 78.8], [21.5, 79.8], [21.3, 80.4]],
  // Gujarat - Rajasthan
  [[24.0, 70.5], [24.5, 72.6], [23.9, 73.4], [23.3, 74.3]],
  // Madhya Pradesh - Rajasthan
  [[23.3, 74.3], [24.0, 75.5], [25.0, 76.5], [26.0, 77.2], [26.7, 77.8]],
  // Madhya Pradesh - Chhattisgarh
  [[21.3, 80.4], [22.0, 81.0], [23.0, 81.8], [24.0, 82.5]],
  // Chhattisgarh - Odisha
  [[21.3, 80.4], [20.0, 81.5], [19.2, 82.2], [18.8, 82.5]],

  // ── NORTH & EAST INDIA ──
  // Rajasthan - Haryana
  [[28.0, 76.5], [28.2, 75.8], [28.9, 75.4], [29.6, 74.9]],
  // Punjab - Haryana
  [[29.6, 74.9], [29.8, 75.1], [30.0, 76.2], [30.5, 76.8]],
  // Haryana - Delhi (NCR loop)
  [[28.48, 77.03], [28.41, 77.31], [28.52, 77.35], [28.70, 77.28], [28.85, 77.10], [28.69, 76.92], [28.48, 77.03]],
  // Rajasthan - Uttar Pradesh
  [[26.7, 77.8], [27.2, 77.4], [27.8, 77.6]],
  // Uttar Pradesh - Haryana
  [[27.8, 77.6], [28.4, 77.3], [28.9, 77.2], [29.5, 77.1], [30.3, 77.3]],
  // Uttar Pradesh - Madhya Pradesh
  [[26.7, 77.8], [25.5, 78.5], [25.0, 81.0], [24.2, 83.0]],
  // Uttar Pradesh - Bihar
  [[27.3, 84.0], [25.8, 84.3], [25.5, 83.9], [25.0, 83.3], [24.2, 83.0]],
  // Bihar - West Bengal
  [[26.1, 88.2], [25.3, 87.8], [24.5, 87.2]],
  // West Bengal - Odisha
  [[21.7, 87.4], [22.0, 86.8], [22.4, 86.5]],
];

/* ─────────────────── GEO MATH ─────────────────── */

function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}

function geoToPixel(
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  zoom: number,
  w: number,
  h: number
) {
  const cx = lngToTileX(center.lng, zoom) * 256;
  const cy = latToTileY(center.lat, zoom) * 256;
  return {
    x: lngToTileX(lng, zoom) * 256 - cx + w / 2,
    y: latToTileY(lat, zoom) * 256 - cy + h / 2,
  };
}

/* ─────────────────── TILE HOOK ─────────────────── */

function useTilePositions(
  center: { lat: number; lng: number },
  zoom: number,
  w: number,
  h: number,
  layer: "wind" | "rain" | "temp" | "satellite" = "wind",
  rainViewerData?: RainViewerData | null,
  rainFrameIndex: number = 0
) {
  return useMemo(() => {
    // Strictly integer zoom for standard web slippy tiles
    const z = Math.max(4, Math.min(9, Math.round(zoom)));
    const cx = lngToTileX(center.lng, z);
    const cy = latToTileY(center.lat, z);
    const nx = Math.ceil(w / 256) + 2;
    const ny = Math.ceil(h / 256) + 2;
    const max = Math.pow(2, z) - 1;
    const out: {
      key: string;
      dx: number;
      dy: number;
      baseTileUrl: string;
      fallbackUrl: string;
      overlayUrl?: string;
      rainTileUrl?: string;
      z: number;
      wx: number;
      ty: number;
    }[] = [];

    const rainFrame =
      rainViewerData?.frames && rainViewerData.frames.length > 0
        ? rainViewerData.frames[Math.min(rainFrameIndex, rainViewerData.frames.length - 1)]
        : undefined;

    for (let tx = Math.floor(cx - nx / 2); tx <= Math.ceil(cx + nx / 2); tx++) {
      for (let ty = Math.floor(cy - ny / 2); ty <= Math.ceil(cy + ny / 2); ty++) {
        if (ty < 0 || ty > max) continue;
        const wx = ((tx % (max + 1)) + max + 1) % (max + 1);
        const dx = (tx - cx) * 256 + w / 2;
        const dy = (ty - cy) * 256 + h / 2;

        let baseTileUrl: string;
        let fallbackUrl: string;
        let overlayUrl: string | undefined;

        // All layers use real satellite imagery as the basemap
        baseTileUrl = TILE_URL_ESRI_SATELLITE.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx));
        fallbackUrl = baseTileUrl;
        overlayUrl = TILE_URL_ESRI_REFERENCE.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx));

        let rainTileUrl: string | undefined;
        if (layer === "rain" && rainViewerData && rainFrame) {
          rainTileUrl = `${rainViewerData.host}${rainFrame.path}/256/${z}/${wx}/${ty}/2/1_1.png`;
        }

        out.push({
          key: `${z}/${wx}/${ty}`,
          dx,
          dy,
          baseTileUrl,
          fallbackUrl,
          overlayUrl,
          rainTileUrl,
          z,
          wx,
          ty,
        });
      }
    }
    return out;
  }, [center.lat, center.lng, zoom, w, h, layer, rainViewerData, rainFrameIndex]);
}

/* ─────────────────── METEOROLOGICAL FLOW VECTORS ─────────────────── */

const COMPASS_DEGREES: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/**
 * Converts meteorological direction (from where wind blows) to canvas velocity unit vector (where particles go).
 * In canvas: +x is East, +y is South (downwards).
 * θ = 0° (North wind) blows southward → vx = 0, vy = +1
 * θ = 90° (East wind) blows westward → vx = -1, vy = 0
 * θ = 180° (South wind) blows northward → vx = 0, vy = -1
 * θ = 270° (West wind) blows eastward → vx = +1, vy = 0
 */
function getWindFlowVector(dirStr: string, x = 0, y = 0, w = 400, h = 700) {
  const metDeg = COMPASS_DEGREES[dirStr.toUpperCase()] ?? 270;
  const rad = (metDeg * Math.PI) / 180;
  const baseVx = -Math.sin(rad);
  const baseVy = Math.cos(rad);

  // Subtle natural curvature across the visual field
  const wave = Math.sin((x / w) * 2.2) * 0.14 + Math.cos((y / h) * 1.8) * 0.10;
  const currentAngle = Math.atan2(baseVy, baseVx) + wave;

  return {
    vx: Math.cos(currentAngle),
    vy: Math.sin(currentAngle),
  };
}

/* ─────────────────── WIND PARTICLE SYSTEM ─────────────────── */

interface WindParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  speed: number;
  trail: { x: number; y: number }[];
}

/* ─────────────────── WIND RADAR CANVAS ─────────────────── */

function WindMapCanvas({
  center,
  zoom,
  wind,
  selectedCityName,
  liveCitiesWind,
  activeLayer = "wind",
  rainViewerData,
  rainFrameIndex = 0,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  wind: Wind;
  selectedCityName: string;
  liveCitiesWind: Record<string, LiveRadarCityWind>;
  activeLayer?: "wind" | "rain" | "temp" | "satellite";
  rainViewerData?: RainViewerData | null;
  rainFrameIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 400, h: 700 });
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<WindParticle[]>([]);

  // Update container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth && el.clientHeight) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const tiles = useTilePositions(center, zoom, w, h, activeLayer, rainViewerData, rainFrameIndex);

  // Initialize particles with calm, realistic velocity
  useEffect(() => {
    const count = Math.min(160, Math.floor((w * h) / 2400));
    const parts: WindParticle[] = [];

    // Realistic calm wind speed in px/frame (approx 0.22 to 0.55 px per frame at 60 FPS)
    const normSpeed = Math.max(3, Math.min(50, wind.speed));
    const basePxSpeed = 0.22 + (normSpeed / 50) * 0.32;

    for (let i = 0; i < count; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      parts.push({
        x: px,
        y: py,
        age: Math.floor(Math.random() * 80),
        maxAge: 60 + Math.floor(Math.random() * 50),
        speed: basePxSpeed * (0.85 + Math.random() * 0.3),
        trail: [{ x: px, y: py }],
      });
    }
    particlesRef.current = parts;
  }, [w, h, wind.speed]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    const render = () => {
      if (!running) return;

      ctx.clearRect(0, 0, w, h);

      // ── 1. ACTIVE LAYER SPECIFIC ATMOSPHERE & HALOS ──
      if (activeLayer === "wind") {
        // Soft translucent atmospheric emerald tint
        const gradBg = ctx.createLinearGradient(0, 0, w, h);
        gradBg.addColorStop(0, "rgba(6, 78, 59, 0.12)");
        gradBg.addColorStop(0.5, "rgba(4, 120, 87, 0.08)");
        gradBg.addColorStop(1, "rgba(6, 78, 59, 0.14)");
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // Render soft heat halos around real cities based on their live wind speeds
        for (const city of WIND_CITIES) {
          const isSelected = city.name.toLowerCase() === selectedCityName.toLowerCase();
          const live = liveCitiesWind[city.name.toLowerCase()];
          const speed = isSelected ? wind.speed : (live?.speed ?? city.baseSpeed);

          if (speed > 13) {
            const pt = geoToPixel(city.lat, city.lng, center, zoom, w, h);
            if (pt.x < -80 || pt.x > w + 80 || pt.y < -80 || pt.y > h + 80) continue;

            const rad = (Math.min(speed, 40) / 25) * 65 * Math.pow(1.15, zoom - 6);
            const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);

            if (speed >= 28) {
              g.addColorStop(0, "rgba(245, 158, 11, 0.38)");
              g.addColorStop(0.6, "rgba(234, 179, 8, 0.14)");
              g.addColorStop(1, "rgba(34, 197, 94, 0)");
            } else if (speed >= 18) {
              g.addColorStop(0, "rgba(163, 230, 53, 0.28)");
              g.addColorStop(0.6, "rgba(132, 204, 22, 0.12)");
              g.addColorStop(1, "rgba(34, 197, 94, 0)");
            } else {
              g.addColorStop(0, "rgba(74, 222, 128, 0.20)");
              g.addColorStop(1, "rgba(34, 197, 94, 0)");
            }

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw flowing meteorological particles & streamlines
        const parts = particlesRef.current;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.age++;

          const vec = getWindFlowVector(wind.dir, p.x, p.y, w, h);
          p.x += vec.vx * p.speed;
          p.y += vec.vy * p.speed;

          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 4) p.trail.shift();

          if (p.age > p.maxAge || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
            p.x = Math.random() * w;
            p.y = Math.random() * h;
            p.age = 0;
            p.maxAge = 60 + Math.floor(Math.random() * 50);
            p.trail = [{ x: p.x, y: p.y }];
          }

          if (p.trail.length >= 2) {
            const progress = p.age / p.maxAge;
            const alpha = Math.sin(progress * Math.PI) * 0.65;
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let t = 1; t < p.trail.length; t++) {
              ctx.lineTo(p.trail[t].x, p.trail[t].y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.08, alpha)})`;
            ctx.lineWidth = 1.4;
            ctx.lineCap = "round";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
            ctx.fill();
          }
        }
      } else if (activeLayer === "temp") {
        // Soft atmospheric thermal tint
        const gradBg = ctx.createLinearGradient(0, 0, w, h);
        gradBg.addColorStop(0, "rgba(180, 83, 9, 0.08)");
        gradBg.addColorStop(0.5, "rgba(217, 119, 6, 0.06)");
        gradBg.addColorStop(1, "rgba(180, 83, 9, 0.10)");
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // Thermal halos around Indian cities based on real temperature
        for (const city of WIND_CITIES) {
          const isSelected = city.name.toLowerCase() === selectedCityName.toLowerCase();
          const live = liveCitiesWind[city.name.toLowerCase()];
          const temp = isSelected ? (live?.temp ?? 29) : (live?.temp ?? 28);
          const pt = geoToPixel(city.lat, city.lng, center, zoom, w, h);
          if (pt.x < -80 || pt.x > w + 80 || pt.y < -80 || pt.y > h + 80) continue;

          const rad = 50 * Math.pow(1.15, zoom - 6);
          const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);
          if (temp >= 35) {
            g.addColorStop(0, "rgba(239, 68, 68, 0.40)");
            g.addColorStop(0.6, "rgba(249, 115, 22, 0.16)");
            g.addColorStop(1, "rgba(239, 68, 68, 0)");
          } else if (temp >= 30) {
            g.addColorStop(0, "rgba(245, 158, 11, 0.35)");
            g.addColorStop(0.6, "rgba(234, 179, 8, 0.14)");
            g.addColorStop(1, "rgba(245, 158, 11, 0)");
          } else if (temp >= 24) {
            g.addColorStop(0, "rgba(34, 197, 94, 0.28)");
            g.addColorStop(0.6, "rgba(16, 185, 129, 0.12)");
            g.addColorStop(1, "rgba(34, 197, 94, 0)");
          } else {
            g.addColorStop(0, "rgba(56, 189, 248, 0.32)");
            g.addColorStop(0.6, "rgba(14, 165, 233, 0.12)");
            g.addColorStop(1, "rgba(56, 189, 248, 0)");
          }
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeLayer === "rain") {
        // Atmospheric cool rain tint
        const gradBg = ctx.createLinearGradient(0, 0, w, h);
        gradBg.addColorStop(0, "rgba(14, 165, 233, 0.08)");
        gradBg.addColorStop(0.5, "rgba(2, 132, 199, 0.05)");
        gradBg.addColorStop(1, "rgba(14, 165, 233, 0.10)");
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);
      }

      // ── 2. DRAW CITIES & REAL METRIC READINGS ──
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const city of WIND_CITIES) {
        const pt = geoToPixel(city.lat, city.lng, center, zoom, w, h);
        if (pt.x < -60 || pt.x > w + 60 || pt.y < -40 || pt.y > h + 40) continue;

        const isSelected = city.name.toLowerCase() === selectedCityName.toLowerCase();
        const live = liveCitiesWind[city.name.toLowerCase()];
        const displaySpeed = isSelected ? wind.speed : (live?.speed ?? city.baseSpeed);
        const displayTemp = isSelected ? (live?.temp ?? 29) : (live?.temp ?? 28);

        // Highlight active selected location with red location pin
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 12, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 12, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#ef4444";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 12, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Draw primary metric label according to active layer
        const metricY = isSelected ? pt.y + 4 : pt.y - 6;
        const nameY = isSelected ? pt.y + 16 : pt.y + 6;

        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        if (activeLayer === "temp") {
          ctx.font = isSelected ? "bold 13px sans-serif" : "bold 11.5px sans-serif";
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 240, 200, 0.95)";
          ctx.fillText(`${displayTemp}°`, pt.x, metricY);
        } else if (activeLayer === "wind") {
          ctx.font = isSelected ? "bold 11px sans-serif" : "600 10.5px sans-serif";
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.95)";
          ctx.fillText(`${displaySpeed} kph`, pt.x, metricY);
        }

        // Draw City Name: e.g. "Pune"
        ctx.font = isSelected ? "bold 12px sans-serif" : "500 10.5px sans-serif";
        ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.90)";
        ctx.fillText(city.name, pt.x, nameY);

        ctx.shadowColor = "transparent";
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [w, h, center, zoom, wind.dir, wind.speed, selectedCityName, liveCitiesWind, activeLayer]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background: activeLayer === "satellite" ? "#060a0f" : "#0c151c" }}
    >
      {/* Layer 1: Real GIS Basemap Tiles (CartoDB Dark Matter or ESRI World Imagery) */}
      <div className="pointer-events-none absolute inset-0">
        {tiles.map((t) => (
          <div
            key={t.key}
            style={{
              position: "absolute",
              left: t.dx,
              top: t.dy,
              width: 256,
              height: 256,
            }}
          >
            {/* Basemap tile: CartoDB Dark Matter or ESRI Satellite */}
            <img
              src={t.baseTileUrl}
              alt=""
              draggable={false}
              loading="lazy"
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried && t.fallbackUrl) {
                  img.dataset.retried = "1";
                  img.src = t.fallbackUrl;
                } else {
                  img.style.visibility = "hidden";
                }
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: 256,
                height: 256,
                display: "block",
                filter: activeLayer === "satellite" ? "none" : "brightness(0.5) saturate(0.35)",
              }}
            />

            {/* Live RainViewer Radar Doppler Precipitation tile overlay */}
            {t.rainTileUrl && (
              <img
                src={t.rainTileUrl}
                alt=""
                draggable={false}
                loading="lazy"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 256,
                  height: 256,
                  display: "block",
                  opacity: 0.85,
                  mixBlendMode: "screen",
                }}
              />
            )}

            {/* ESRI Boundaries & Place Names Reference overlay */}
            {t.overlayUrl && (
              <img
                src={t.overlayUrl}
                alt=""
                draggable={false}
                loading="lazy"
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 256,
                  height: 256,
                  display: "block",
                  opacity: 0.85,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Layer 2: Dynamic Meteorological Overlays */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FULL SCREEN WIND RADAR (MATCHING USER REFERENCE IMAGE)
   ══════════════════════════════════════════════════════ */

export function FullScreenWindRadar({
  location,
  accent,
  lang,
  initialLayer = "wind",
  onClose,
  onSwitchLayer,
}: {
  location: Location;
  accent: string;
  lang: Lang;
  initialLayer?: "rain" | "wind" | "temp" | "satellite";
  onClose: () => void;
  onSwitchLayer?: (layer: "rain" | "wind" | "temp" | "satellite") => void;
}) {
  const t = makeT(lang);

  // Determine initial center: target the user's selected location directly
  const selectedCityCenter = useMemo(() => {
    const byKey = APP_CITY_COORDS[location.key.toLowerCase()];
    if (byKey) return byKey;
    const byName = WIND_CITIES.find(
      (c) => c.name.toLowerCase() === location.city.toLowerCase()
    );
    if (byName) return { lat: byName.lat, lng: byName.lng };
    return { lat: 18.52, lng: 73.86 }; // fallback to Pune
  }, [location.key, location.city]);

  const [center, setCenter] = useState(selectedCityCenter);
  const [zoom, setZoom] = useState(6);

  // Sync center when location changes
  useEffect(() => {
    setCenter(selectedCityCenter);
  }, [selectedCityCenter]);

  // Real live data states
  const [activeLayer, setActiveLayer] = useState<"rain" | "wind" | "temp" | "satellite">(initialLayer);
  const [liveCitiesWind, setLiveCitiesWind] = useState<Record<string, LiveRadarCityWind>>({});
  const [timelineFrames, setTimelineFrames] = useState<WindTimelineFrame[]>([]);
  const [rainViewerData, setRainViewerData] = useState<RainViewerData | null>(null);
  const [rainFrameIndex, setRainFrameIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(1); // 1 = "now"
  const [isPlaying, setIsPlaying] = useState(false); // Paused by default
  const [showInfo, setShowInfo] = useState(false);

  // Sync activeLayer when initialLayer prop changes
  useEffect(() => {
    setActiveLayer(initialLayer);
  }, [initialLayer]);

  // Fetch real live wind & temp data for cities across India
  useEffect(() => {
    let mounted = true;
    fetchRadarCitiesWind(WIND_CITIES).then((data) => {
      if (mounted) setLiveCitiesWind(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch RainViewer Doppler precipitation radar metadata
  useEffect(() => {
    let mounted = true;
    fetchRainViewerFrames().then((data) => {
      if (mounted && data) {
        setRainViewerData(data);
        if (data.frames.length > 0) {
          // Default to latest frame (or nowcast)
          setRainFrameIndex(Math.max(0, data.frames.length - 1));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real timeline forecast for selected location
  useEffect(() => {
    let mounted = true;
    fetchWindTimeline(selectedCityCenter.lat, selectedCityCenter.lng, location.wind, location.temp).then((frames) => {
      if (mounted && frames.length > 0) {
        setTimelineFrames(frames);
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedCityCenter.lat, selectedCityCenter.lng, location.wind, location.temp]);

  // Current active wind reading based on timeline selection
  const activeFrame = timelineFrames[timeIndex];
  const activeWind: Wind = useMemo(() => {
    if (activeFrame && timeIndex !== 1) {
      return {
        speed: activeFrame.speed,
        dir: activeFrame.dir,
        gust: activeFrame.gust,
      };
    }
    return location.wind;
  }, [activeFrame, timeIndex, location.wind]);

  const activeTemp: number = useMemo(() => {
    if (activeFrame && activeFrame.temp !== undefined && timeIndex !== 1) {
      return activeFrame.temp;
    }
    return location.temp;
  }, [activeFrame, timeIndex, location.temp]);

  // Fallback timeline labels if frames haven't loaded yet
  const displayTimeLabels = useMemo(() => {
    if (timelineFrames.length > 0) return timelineFrames;
    return [
      { id: "-24h", label: "- 24 h", timeStr: "Yesterday 10:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp - 1 },
      { id: "now", label: "now", timeStr: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`, speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "today", label: "today", timeStr: "Today 16:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp + 1 },
      { id: "tomorrow", label: "tomorrow", timeStr: "Tomorrow 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "day2", label: "Fri", timeStr: "Friday 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "day3", label: "Sat", timeStr: "Saturday 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
    ];
  }, [timelineFrames, location.wind, location.temp]);

  const isRain = activeLayer === "rain";
  const rainFrames = rainViewerData?.frames || [];

  const currentTimeLabel = useMemo(() => {
    if (isRain && rainFrames.length > 0) {
      return rainFrames[rainFrameIndex]?.timeStr ?? "Now";
    }
    return displayTimeLabels[timeIndex]?.timeStr ?? "Now";
  }, [isRain, rainFrames, rainFrameIndex, displayTimeLabels, timeIndex]);

  // Timelapse auto-play
  useEffect(() => {
    if (!isPlaying) return;
    if (isRain && rainFrames.length > 0) {
      const interval = setInterval(() => {
        setRainFrameIndex((prev) => (prev + 1) % rainFrames.length);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setTimeIndex((prev) => (prev + 1) % displayTimeLabels.length);
      }, 2200);
      return () => clearInterval(interval);
    }
  }, [isPlaying, isRain, rainFrames.length, displayTimeLabels.length]);

  // Dragging / Panning support
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, lat: center.lat, lng: center.lng });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: center.lat,
      lng: center.lng,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dLat = (dy / (Math.pow(2, zoom) * 256)) * 180;
    const dLng = -(dx / (Math.pow(2, zoom) * 256)) * 360;
    setCenter({
      lat: Math.max(-80, Math.min(80, dragStartRef.current.lat + dLat)),
      lng: ((dragStartRef.current.lng + dLng + 180) % 360) - 180,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const zoomIn = () => setZoom((z) => Math.min(8, z + 1));
  const zoomOut = () => setZoom((z) => Math.max(5, z - 1));
  const resetToLocation = () => setCenter(selectedCityCenter);

  const switchLayer = (l: "rain" | "wind" | "temp" | "satellite") => {
    setActiveLayer(l);
    onSwitchLayer?.(l);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0c151c] text-white select-none animate-in fade-in duration-200"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── MAP CONTAINER ── */}
      <div className="relative flex-1 overflow-hidden">
        <WindMapCanvas
          center={center}
          zoom={zoom}
          wind={activeWind}
          selectedCityName={location.city}
          liveCitiesWind={liveCitiesWind}
          activeLayer={activeLayer}
          rainViewerData={rainViewerData}
          rainFrameIndex={rainFrameIndex}
        />

        {/* ── TOP BAR (Back + Header Brand + Share/Info) ── */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-12 pb-3 pointer-events-none">
          {/* Back button */}
          <button
            onClick={onClose}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 transition shadow-lg"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Central Logo Pill: weather & radar + Selected City Info */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 backdrop-blur-md border border-white/15 shadow-xl">
            <span className="text-[13px] font-bold tracking-tight text-white">weather</span>
            <span className="text-[13px] font-bold text-amber-400">&</span>
            <span className="text-[13px] font-bold tracking-tight text-sky-400">radar</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-[12px] font-semibold text-emerald-300">
              {activeLayer === "wind" && `${location.city} ${activeWind.speed} km/h`}
              {activeLayer === "temp" && `${location.city} ${activeTemp}°C`}
              {activeLayer === "rain" && `${location.city} Rain Radar`}
              {activeLayer === "satellite" && `${location.city} Satellite`}
            </span>
          </div>

          {/* Top Right Actions (Share + Info) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `Weather & Radar - ${location.city}`, url: window.location.href }).catch(() => {});
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 transition shadow-lg"
              aria-label="Share"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0L8 6m4-4v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setShowInfo((s) => !s)}
              className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 transition shadow-lg"
              aria-label="Details"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── LEFT VERTICAL MAP CONTROLS ── */}
        <div className="absolute left-4 top-28 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Target / My Location button */}
          <button
            onClick={resetToLocation}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            title={t("My Location")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>

          {/* Zoom In */}
          <button
            onClick={zoomIn}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition text-lg font-bold shadow-lg"
            aria-label="Zoom in"
          >
            +
          </button>

          {/* Zoom Out */}
          <button
            onClick={zoomOut}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition text-lg font-bold shadow-lg"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* ── RIGHT VERTICAL WEATHER LAYER SELECTOR ── */}
        <div className="absolute right-4 top-28 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Temperature layer (Thermometer) */}
          <button
            onClick={() => switchLayer("temp")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "temp"
                ? "bg-amber-500/85 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.65)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Temperature Layer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
          </button>

          {/* Rain / Precip layer (Doppler radar) */}
          <button
            onClick={() => switchLayer("rain")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "rain"
                ? "bg-sky-500/85 border-sky-300 text-white shadow-[0_0_15px_rgba(14,165,233,0.7)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Rain / Precipitation Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-300" fill="currentColor">
              <path d="M12 2c-4 5.5-6 9-6 12 0 3.31 2.69 6 6 6s6-2.69 6-6c0-3-2-6.5-6-12z" />
            </svg>
          </button>

          {/* Wind layer — Flag icon */}
          <button
            onClick={() => switchLayer("wind")}
            className={`relative grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "wind"
                ? "bg-blue-600 border-blue-300 text-white shadow-[0_0_15px_rgba(37,99,235,0.75)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Wind Streamlines Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" fillOpacity="0.4" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            {activeLayer === "wind" && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
              </span>
            )}
          </button>

          {/* Thunderstorm / Lightning */}
          <button
            onClick={() => switchLayer("rain")}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            title="Thunderstorm Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-yellow-400" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </button>

          {/* Camera / Satellite */}
          <button
            onClick={() => switchLayer("satellite")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "satellite"
                ? "bg-emerald-600/90 border-emerald-300 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="ESRI World Satellite Imagery"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/90" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        {/* ── INFO POPUP (Wind metrics / Beaufort / Radar Scale) ── */}
        {showInfo && (
          <div className="absolute left-4 top-28 z-40 w-64 rounded-2xl bg-[rgba(15,23,42,0.95)] p-4 border border-white/15 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <span className="font-semibold text-xs tracking-wider uppercase text-sky-400">
                {activeLayer === "wind" && `💨 ${location.city} ${t("Wind")}`}
                {activeLayer === "temp" && `🌡️ ${location.city} ${t("Temperature")}`}
                {activeLayer === "rain" && `🌧️ ${location.city} ${t("Rain Radar")}`}
                {activeLayer === "satellite" && `🛰️ ${location.city} Satellite`}
              </span>
              <button
                onClick={() => setShowInfo(false)}
                className="text-white/60 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {activeLayer === "wind" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Speed")}</span>
                  <span className="font-bold text-white">{activeWind.speed} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Gusts")}</span>
                  <span className="font-bold text-amber-300">{activeWind.gust} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Direction")}</span>
                  <span className="font-bold text-white">{activeWind.dir}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Beaufort Scale")}</span>
                  <span className="font-bold text-emerald-400">
                    Level {Math.min(12, Math.max(1, Math.round(activeWind.speed / 5)))} · {t("Gentle Breeze")}
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">{t("Wind Speed Scale")}</span>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    <span className="h-full flex-1 bg-emerald-500" title="10-18 km/h" />
                    <span className="h-full flex-1 bg-lime-400" title="18-25 km/h" />
                    <span className="h-full flex-1 bg-amber-400" title="25-35 km/h" />
                    <span className="h-full flex-1 bg-orange-500" title="35-45 km/h" />
                    <span className="h-full flex-1 bg-red-600" title="45+ km/h" />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/60 mt-1">
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                    <span>40+ km/h</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "temp" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Current Temp</span>
                  <span className="font-bold text-amber-300">{activeTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Feels Like</span>
                  <span className="font-bold text-white">{activeTemp + 2}°C</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">Thermal Band</span>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    <span className="h-full flex-1 bg-sky-500" title="< 23°C" />
                    <span className="h-full flex-1 bg-emerald-500" title="24-29°C" />
                    <span className="h-full flex-1 bg-amber-400" title="30-34°C" />
                    <span className="h-full flex-1 bg-red-500" title="35°C+" />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/60 mt-1">
                    <span>20°</span>
                    <span>25°</span>
                    <span>30°</span>
                    <span>35°+</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "rain" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Precipitation Radar</span>
                  <span className="font-bold text-sky-400">Live RainViewer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Precip Chance</span>
                  <span className="font-bold text-white">{location.precip.chance}%</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">Doppler Intensity</span>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    <span className="h-full flex-1 bg-sky-400" title="Light" />
                    <span className="h-full flex-1 bg-purple-500" title="Moderate" />
                    <span className="h-full flex-1 bg-yellow-400" title="Heavy" />
                    <span className="h-full flex-1 bg-red-500" title="Extreme" />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/60 mt-1">
                    <span>Light</span>
                    <span>Moderate</span>
                    <span>Heavy</span>
                    <span>Extreme</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "satellite" && (
              <div className="space-y-2 text-xs">
                <p className="text-white/80 leading-relaxed">
                  Real GIS high-resolution satellite imagery provided by ESRI World Imagery with boundary & place labels.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM TIMELINE & CONTROLS ── */}
      <div
        className="relative z-30 px-4 pt-3 pb-7 pointer-events-auto"
        style={{
          background: "linear-gradient(to top, rgba(10, 20, 28, 0.98) 75%, rgba(10, 20, 28, 0.85) 90%, transparent)",
        }}
      >
        {/* Scrubber Time Bar + Play/Pause Button */}
        <div className="flex items-center gap-3">
          {/* Time display box */}
          <div className="flex items-center justify-center rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 min-w-[70px] shadow-md">
            <span className="font-mono text-[13px] font-bold tracking-tight text-white">
              {currentTimeLabel.includes(" ") ? currentTimeLabel.split(" ")[1] : currentTimeLabel}
            </span>
          </div>

          {/* Slider track with colored progress */}
          <div className="relative flex-1 py-2">
            <input
              type="range"
              min="0"
              max={isRain && rainFrames.length > 0 ? rainFrames.length - 1 : displayTimeLabels.length - 1}
              value={isRain && rainFrames.length > 0 ? rainFrameIndex : timeIndex}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isRain && rainFrames.length > 0) {
                  setRainFrameIndex(val);
                } else {
                  setTimeIndex(val);
                }
                setIsPlaying(false);
              }}
              className="w-full accent-amber-400 h-1.5 rounded-full cursor-pointer bg-white/20"
              style={{
                accentColor: isRain ? "#38bdf8" : activeLayer === "temp" ? "#f59e0b" : "#3b82f6",
              }}
            />
          </div>

          {/* Circular Play / Pause toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg active:scale-95 transition"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 translate-x-0.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Quick Time Jump Tabs */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          {displayTimeLabels.map((item, idx) => {
            const active = (!isRain || rainFrames.length === 0) && timeIndex === idx;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTimeIndex(idx);
                  setIsPlaying(false);
                }}
                className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold transition active:scale-95 ${
                  active
                    ? "bg-emerald-600/90 text-white shadow-md border border-emerald-400"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Recenter icon */}
          <button
            onClick={resetToLocation}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition"
            title="Recenter Map"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FullScreenWindRadar;
