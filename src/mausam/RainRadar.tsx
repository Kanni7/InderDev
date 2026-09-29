import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { makeT, type Lang } from "./i18n";
import type { Condition } from "./theme";
import type { Wind } from "./data";
import * as I from "./icons";

/* ─────────────────── CONFIGURATION ─────────────────── */

// Free OpenStreetMap tiles — no API key needed.
// Dark look via CSS filter on the tile layer.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_CENTER = { lat: 13.5, lng: 79.5 };
const FULLSCREEN_ZOOM = 6;

// Location-specific map centres
const LOCATION_CENTERS: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.5, lng: 73.9 },
  mumbai: { lat: 19.1, lng: 72.9 },
  delhi: { lat: 28.6, lng: 77.2 },
  bengaluru: { lat: 12.97, lng: 77.6 },
  chennai: { lat: 13.1, lng: 80.0 },
  kolkata: { lat: 22.6, lng: 88.4 },
};

/* ─────────────────── GEO MATH ─────────────────── */

function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}
function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}
function geoToPixel(
  lat: number, lng: number,
  center: { lat: number; lng: number },
  zoom: number, w: number, h: number
) {
  const cx = lngToTileX(center.lng, zoom) * 256;
  const cy = latToTileY(center.lat, zoom) * 256;
  return {
    x: lngToTileX(lng, zoom) * 256 - cx + w / 2,
    y: latToTileY(lat, zoom) * 256 - cy + h / 2,
  };
}

/* ─────────────────── PRECIPITATION DATA (MOCK) ─────────────────── */

interface PrecipCell {
  lat: number;
  lng: number;
  radius: number;
  intensity: number; // 0..1
}

/**
 * Generate a rich, realistic nationwide weather radar field covering major weather fronts
 * across the entire country (North India, Gangetic plains, Western Ghats, Odisha coast,
 * South India, Assam, etc.) plus local intensity near the selected city.
 */
function generatePrecipCells(
  locationKey: string,
  condition: Condition,
  chance: number,
  _wind: Wind
): PrecipCell[] {
  const center = LOCATION_CENTERS[locationKey] || DEFAULT_CENTER;
  const cLat = center.lat;
  const cLng = center.lng;

  const wet = condition === "rainy" || condition === "storm";
  const mult = wet ? 1.15 : 0.95;

  return [
    // ════════════════════════════════════════════════════════════════
    // 1. REFINED LOCAL WEATHER FRONT AROUND SELECTED CITY
    // ════════════════════════════════════════════════════════════════
    { lat: cLat - 0.08, lng: cLng + 0.12, radius: 160, intensity: 0.38 * mult }, // Outer light rain veil
    { lat: cLat - 0.15, lng: cLng - 0.08, radius: 125, intensity: 0.60 * mult }, // Moderate purple rain zone
    { lat: cLat - 0.03, lng: cLng - 0.04, radius: 85, intensity: 0.78 * mult },  // Heavy yellow rain core
    { lat: cLat + 0.02, lng: cLng + 0.01, radius: 55, intensity: 0.92 * mult },  // Extreme core

    // ════════════════════════════════════════════════════════════════
    // 2. REGIONAL WEATHER SPOTS ACROSS INDIA (balanced 60-115km radiuses)
    // ════════════════════════════════════════════════════════════════
    { lat: 18.5, lng: 73.9, radius: 95, intensity: 0.72 * mult }, // Pune
    { lat: 19.1, lng: 72.9, radius: 110, intensity: 0.88 * mult }, // Mumbai / Thane
    { lat: 15.5, lng: 73.8, radius: 100, intensity: 0.78 * mult }, // Goa
    { lat: 12.97, lng: 77.6, radius: 95, intensity: 0.65 * mult }, // Bengaluru
    { lat: 13.1, lng: 80.0, radius: 105, intensity: 0.70 * mult }, // Chennai
    { lat: 10.8, lng: 78.7, radius: 110, intensity: 0.82 * mult }, // Trichy / Madurai
    { lat: 9.9, lng: 76.3, radius: 100, intensity: 0.75 * mult },  // Kochi
    { lat: 28.7, lng: 77.1, radius: 115, intensity: 0.88 * mult }, // Delhi NCR
    { lat: 27.2, lng: 78.0, radius: 90, intensity: 0.68 * mult },  // Agra
    { lat: 22.6, lng: 88.4, radius: 105, intensity: 0.72 * mult }, // Kolkata
    { lat: 21.5, lng: 87.0, radius: 115, intensity: 0.85 * mult }, // Odisha coast
    { lat: 23.2, lng: 77.4, radius: 90, intensity: 0.58 * mult },  // Bhopal
    { lat: 21.2, lng: 72.8, radius: 85, intensity: 0.55 * mult },  // Surat
    { lat: 17.4, lng: 78.4, radius: 95, intensity: 0.48 * mult },  // Hyderabad
  ];
}

/* ─────────────────── FORECAST FRAMES ─────────────────── */

interface ForecastFrame { time: string; cells: PrecipCell[]; }

function generateForecastFrames(
  locationKey: string, condition: Condition, chance: number, wind: Wind
): ForecastFrame[] {
  const base = generatePrecipCells(locationKey, condition, chance, wind);
  const hours = ["4 PM", "Now", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "12 AM", "2 AM", "4 AM"];
  const dirAngles: Record<string, number> = {
    N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
  };
  const a = ((dirAngles[wind.dir] ?? 0) * Math.PI) / 180;
  const mLat = -Math.cos(a) * 0.12;
  const mLng = Math.sin(a) * 0.12;

  return hours.map((time, i) => {
    const drift = i * 0.35;
    const fade = Math.max(0.15, 1 - i * 0.06);
    return {
      time,
      cells: base.map((c) => ({
        ...c,
        lat: c.lat + mLat * drift + Math.sin(i * 0.7 + c.lat) * 0.08,
        lng: c.lng + mLng * drift + Math.cos(i * 0.5 + c.lng) * 0.06,
        intensity: c.intensity * fade * (0.88 + Math.sin(i * 0.4) * 0.12),
        radius: c.radius * (0.92 + Math.sin(i * 0.3) * 0.18),
      })),
    };
  });
}

/* ─────────────────── PRECIPITATION RENDERING ───────────────────
   Exact Apple Weather iOS colour palette (matching user screenshot):
   • Light    → Bright Cyan Blue (#007aff / #38bdf8)
   • Moderate → Vivid Purple / Violet (#c084fc / #a855f7)
   • Heavy    → Bright Yellow (#facc15 / #eab308)
   • Extreme  → White / Pale Yellow (#ffffff / #ffffd0)
   ────────────────────────────────────────────────────────────── */

function drawPrecipitation(
  ctx: CanvasRenderingContext2D,
  cells: PrecipCell[],
  center: { lat: number; lng: number },
  zoom: number, w: number, h: number
) {
  const mpp = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);

  // Sort cells by intensity ascending so light ambient clouds render first,
  // and vibrant heavy/extreme cores render cleanly on top without color distortion.
  const sorted = [...cells].sort((a, b) => a.intensity - b.intensity);

  for (const cell of sorted) {
    const { x, y } = geoToPixel(cell.lat, cell.lng, center, zoom, w, h);
    const rPx = (cell.radius * 1000) / mpp;
    const i = Math.min(cell.intensity, 1);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rPx);

    if (i > 0.8) {
      // ── EXTREME — Refined Gold Core into Purple & Cyan ──
      grad.addColorStop(0,    "rgba(255, 255, 230, 0.82)");
      grad.addColorStop(0.20, "rgba(250, 204, 21, 0.75)");
      grad.addColorStop(0.50, "rgba(192, 132, 252, 0.52)");
      grad.addColorStop(0.80, "rgba(56, 189, 248, 0.25)");
      grad.addColorStop(1,    "rgba(0, 122, 255, 0)");
    } else if (i > 0.6) {
      // ── HEAVY — Soft Yellow into Purple & Blue ──
      grad.addColorStop(0,    "rgba(250, 204, 21, 0.75)");
      grad.addColorStop(0.35, "rgba(234, 179, 8, 0.60)");
      grad.addColorStop(0.68, "rgba(192, 132, 252, 0.40)");
      grad.addColorStop(0.88, "rgba(56, 189, 248, 0.20)");
      grad.addColorStop(1,    "rgba(0, 122, 255, 0)");
    } else if (i > 0.38) {
      // ── MODERATE — Translucent Purple into Sky Blue ──
      grad.addColorStop(0,    "rgba(192, 132, 252, 0.62)");
      grad.addColorStop(0.40, "rgba(168, 85, 247, 0.45)");
      grad.addColorStop(0.75, "rgba(56, 189, 248, 0.22)");
      grad.addColorStop(1,    "rgba(0, 122, 255, 0)");
    } else {
      // ── LIGHT — Soft Subtle Cyan Blue Veil ──
      grad.addColorStop(0,    "rgba(56, 189, 248, 0.42)");
      grad.addColorStop(0.45, "rgba(2, 132, 199, 0.25)");
      grad.addColorStop(0.80, "rgba(0, 122, 255, 0.10)");
      grad.addColorStop(1,    "rgba(0, 122, 255, 0)");
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rPx, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ─────────────────── TILE POSITIONS ─────────────────── */

function useTilePositions(
  center: { lat: number; lng: number },
  zoom: number, w: number, h: number
) {
  return useMemo(() => {
    const cx = lngToTileX(center.lng, zoom);
    const cy = latToTileY(center.lat, zoom);
    const nx = Math.ceil(w / 256) + 2;
    const ny = Math.ceil(h / 256) + 2;
    const max = Math.pow(2, zoom) - 1;
    const out: { url: string; dx: number; dy: number; key: string }[] = [];
    for (let tx = Math.floor(cx - nx / 2); tx <= Math.ceil(cx + nx / 2); tx++) {
      for (let ty = Math.floor(cy - ny / 2); ty <= Math.ceil(cy + ny / 2); ty++) {
        if (ty < 0 || ty > max) continue;
        const wx = ((tx % (max + 1)) + max + 1) % (max + 1);
        out.push({
          url: TILE_URL.replace("{z}", String(zoom)).replace("{x}", String(wx)).replace("{y}", String(ty)),
          dx: (tx - cx) * 256 + w / 2,
          dy: (ty - cy) * 256 + h / 2,
          key: `${zoom}/${wx}/${ty}`,
        });
      }
    }
    return out;
  }, [center.lat, center.lng, zoom, w, h]);
}

function TileMap({
  width: customWidth, height: customHeight, center, zoom, cells,
}: {
  width?: number; height?: number;
  center: { lat: number; lng: number }; zoom: number;
  cells: PrecipCell[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: customWidth || 400, h: customHeight || 600 });
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (customWidth && customHeight) {
      setSize({ w: customWidth, h: customHeight });
      return;
    }
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
  }, [customWidth, customHeight]);

  const width = size.w;
  const height = size.h;

  const tiles = useTilePositions(center, zoom, width, height);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Draw precipitation overlay
  useEffect(() => {
    const c = overlayRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = width * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    drawPrecipitation(ctx, cells, center, zoom, width, height);
  }, [width, height, center, zoom, cells, dpr]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: customHeight || "100%", position: "relative", overflow: "hidden", background: "#0d1520" }}>
      {/* Layer 1 — Map tiles with dark-mode CSS filter */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: "invert(1) hue-rotate(190deg) brightness(0.95) contrast(1.1) saturate(0.3)",
          overflow: "hidden",
        }}
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            style={{
              position: "absolute",
              left: t.dx,
              top: t.dy,
              width: 256,
              height: 256,
              display: "block",
            }}
            draggable={false}
          />
        ))}
      </div>

      {/* Layer 2 — Precipitation blobs (vivid, unfiltered) */}
      <canvas
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MINI RAIN MAP WIDGET  (home-screen card)
   ══════════════════════════════════════════════════════ */

export function RainMapWidget({
  condition, chance, accent, city, lang, locationKey, wind, temp, onExpand,
}: {
  condition: Condition; chance: number; accent: string; city: string;
  lang: Lang; locationKey: string; wind: Wind; temp?: number;
  onExpand?: () => void;
}) {
  const t = makeT(lang);
  const cells = useMemo(
    () => generatePrecipCells(locationKey, condition, chance, wind),
    [locationKey, condition, chance, wind]
  );
  const mapCenter = LOCATION_CENTERS[locationKey] || DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-3xl mausam-glass">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          ☁ {t("Precipitation", "वर्षा")}
        </p>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-soft)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} /> {t("Live", "लाइव")}
        </span>
      </div>

      {/* Map with even bezels on all sides */}
      <button
        onClick={onExpand}
        className="relative mx-3 mt-2 mb-1 block w-[calc(100%-24px)] cursor-pointer overflow-hidden rounded-2xl"
        style={{ height: 200 }}
        aria-label="Expand rain radar"
      >
        <TileMap
          width={360}
          height={200}
          center={mapCenter}
          zoom={7}
          cells={cells}
        />

        {/* Temperature badge */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-[15px] font-semibold text-white"
              style={{ background: "rgba(50,60,80,0.75)", backdropFilter: "blur(8px)" }}
            >
              {temp ?? 31}
            </div>
            <span className="mt-1 text-[10px] font-medium text-white/70">My Location</span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 2h4v4M6 14H2v-4M14 2L9 7M2 14l5-5" />
          </svg>
        </div>
      </button>

      {/* Legend — colours match the vertical gradient palette */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        {([["Light", "#007aff"], ["Moderate", "#c084fc"], ["Heavy", "#facc15"], ["Extreme", "#ffffff"]] as const).map(([l, c]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-ink-faint)]">
            <span className="h-2 w-2 rounded-full border border-white/20" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FULL SCREEN RADAR  (iOS Weather style)
   ══════════════════════════════════════════════════════ */

export function FullScreenRadar({
  condition, chance, accent, city, lang, locationKey, wind, temp, onClose,
}: {
  condition: Condition; chance: number; accent: string; city: string;
  lang: Lang; locationKey: string; wind: Wind; temp?: number;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(1); // start at "Now"
  const [showLegend, setShowLegend] = useState(true); // Always visible by default in full screen!
  const [range, setRange] = useState<"1h" | "12h">("12h");
  const timerRef = useRef<number | null>(null);

  const frames = useMemo(
    () => generateForecastFrames(locationKey, condition, chance, wind),
    [locationKey, condition, chance, wind]
  );
  const curCells = frames[frame]?.cells ?? [];
  const mapCenter = LOCATION_CENTERS[locationKey] || DEFAULT_CENTER;

  // Play/pause animation
  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setFrame((f) => {
          if (f >= frames.length - 1) { setPlaying(false); return 0; }
          return f + 1;
        });
      }, 700);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, frames.length]);

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0d1520]">
      {/* ── Map area ── */}
      <div className="relative flex-1 overflow-hidden">
        <TileMap
          center={mapCenter}
          zoom={FULLSCREEN_ZOOM}
          cells={curCells}
        />

        {/* ── Controls overlay ── */}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute left-4 top-12 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur-md active:scale-95"
          aria-label="Close"
        >
          <I.Close className="h-5 w-5 text-white" />
        </button>

        {/* Right-side buttons (layers, navigate, list) */}
        <div className="absolute right-4 top-12 z-20 flex flex-col gap-2.5">
          {/* Layers */}
          <button
            onClick={() => setShowLegend((s) => !s)}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur-md active:scale-95"
            aria-label="Layers"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 4L3 9l9 5 9-5-9-5z" />
              <path d="M3 14l9 5 9-5" />
            </svg>
          </button>
          {/* Navigate */}
          <button className="grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur-md active:scale-95" aria-label="Navigate">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#4dabf7" strokeWidth="2">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </button>
          {/* List */}
          <button className="grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur-md active:scale-95" aria-label="Details">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>

        {/* Precipitation legend — EXACT copy of user's Apple Weather screenshot */}
        {showLegend && (
          <div className="absolute left-4 top-24 z-20 rounded-2xl bg-[rgba(26,34,52,0.92)] px-4 py-3.5 border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
            <p className="mb-2 text-[13px] font-semibold text-white tracking-tight">Precipitation</p>
            <div className="flex items-center gap-3 pt-0.5">
              {/* Continuous vertical gradient line */}
              <div
                className="w-1.5 h-28 rounded-full shadow-sm"
                style={{
                  background: "linear-gradient(to bottom, #ffffff 0%, #ffffd0 15%, #facc15 40%, #c084fc 70%, #007aff 100%)",
                }}
              />
              {/* Labels array aligned to the bar */}
              <div className="flex flex-col justify-between h-28 text-[12px] font-medium text-white/80">
                <span>Extreme</span>
                <span>Heavy</span>
                <span>Moderate</span>
                <span>Light</span>
              </div>
            </div>
          </div>
        )}

        {/* Temperature badge — centred */}
        <div className="absolute left-1/2 top-[45%] z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center">
            <div
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-white"
              style={{ background: "rgba(50,60,80,0.78)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <span className="text-[22px] font-semibold">{temp ?? 31}°</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/80" fill="currentColor">
                <path d="M6 19a5 5 0 0 1-.56-9.97A7.002 7.002 0 0 1 18.83 10H19a4 4 0 0 1 0 8H6z" />
              </svg>
            </div>
            <span className="mt-1 text-[11px] font-medium text-white/55">My Location</span>
          </div>
        </div>
      </div>

      {/* ── Bottom forecast panel ── */}
      <div
        className="relative z-10 px-4 pb-6 pt-3"
        style={{ background: "linear-gradient(to top, rgba(13,21,32,0.99) 60%, rgba(13,21,32,0.85) 85%, transparent)" }}
      >
        {/* Play + label + time-range toggle */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div>
              <p className="text-[14px] font-semibold text-white">Forecast</p>
              <p className="text-[11px] text-white/45">{dateStr}</p>
            </div>
          </div>
          <div className="flex overflow-hidden rounded-full bg-white/10">
            {(["1h", "12h"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3.5 py-1.5 text-[12px] font-semibold transition"
                style={{
                  background: range === r ? "rgba(255,255,255,0.22)" : "transparent",
                  color: range === r ? "white" : "rgba(255,255,255,0.45)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline scrubber */}
        <div>
          {/* Coloured progress bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(frame / Math.max(frames.length - 1, 1)) * 100}%`,
                background: "linear-gradient(90deg, #f2c53d, #f0873a, #e5484d, #7bc4f2)",
              }}
            />
          </div>
          {/* Time labels */}
          <div className="mt-2 flex justify-between">
            {frames.map((f, i) => (
              <button
                key={f.time}
                onClick={() => setFrame(i)}
                className="text-[10px] transition"
                style={{
                  color: frame === i ? "white" : "rgba(255,255,255,0.3)",
                  fontWeight: frame === i || f.time === "Now" ? 700 : 400,
                }}
              >
                {f.time}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RainMapWidget;
