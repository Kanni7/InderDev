import { useState, useRef, useEffect, useMemo } from "react";
import { makeT, type Lang } from "./i18n";
import type { Condition } from "./theme";
import type { Wind } from "./data";
import * as I from "./icons";
import { fetchRainViewerFrames, type RainViewerData } from "../data/openMeteo";

/* ─────────────────── CONFIGURATION ─────────────────── */

// Real satellite imagery (ESRI World Imagery) + place-name labels
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_URL_FALLBACK = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_URL_REF = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

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
/* ─────────────────── (using live RainViewer Doppler radar tiles) ─────────────────── */

/* ─────────────────── TILE POSITIONS ─────────────────── */

function useTilePositions(
  center: { lat: number; lng: number },
  zoom: number, w: number, h: number,
  rainViewerData?: RainViewerData | null,
  rainFrameIndex: number = 0,
) {
  return useMemo(() => {
    const z = Math.max(4, Math.min(9, Math.round(zoom)));
    const cx = lngToTileX(center.lng, z);
    const cy = latToTileY(center.lat, z);
    const nx = Math.ceil(w / 256) + 2;
    const ny = Math.ceil(h / 256) + 2;
    const max = Math.pow(2, z) - 1;

    const rainFrame =
      rainViewerData?.frames && rainViewerData.frames.length > 0
        ? rainViewerData.frames[Math.min(rainFrameIndex, rainViewerData.frames.length - 1)]
        : undefined;

    const out: { url: string; refUrl: string; fallbackUrl: string; rainUrl?: string; dx: number; dy: number; key: string; z: number; wx: number; ty: number }[] = [];
    for (let tx = Math.floor(cx - nx / 2); tx <= Math.ceil(cx + nx / 2); tx++) {
      for (let ty = Math.floor(cy - ny / 2); ty <= Math.ceil(cy + ny / 2); ty++) {
        if (ty < 0 || ty > max) continue;
        const wx = ((tx % (max + 1)) + max + 1) % (max + 1);
        const rainUrl = rainViewerData && rainFrame
          ? `${rainViewerData.host}${rainFrame.path}/256/${z}/${wx}/${ty}/2/1_1.png`
          : undefined;
        out.push({
          url: TILE_URL.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx)),
          refUrl: TILE_URL_REF.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx)),
          fallbackUrl: TILE_URL_FALLBACK.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx)),
          rainUrl,
          dx: (tx - cx) * 256 + w / 2,
          dy: (ty - cy) * 256 + h / 2,
          key: `${z}/${wx}/${ty}`,
          z,
          wx,
          ty,
        });
      }
    }
    return out;
  }, [center.lat, center.lng, zoom, w, h, rainViewerData, rainFrameIndex]);
}

function TileMap({
  width: customWidth, height: customHeight, center, zoom,
  rainViewerData, rainFrameIndex = 0,
}: {
  width?: number; height?: number;
  center: { lat: number; lng: number }; zoom: number;
  rainViewerData?: RainViewerData | null;
  rainFrameIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: customWidth || 400, h: customHeight || 600 });

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

  const tiles = useTilePositions(center, zoom, width, height, rainViewerData, rainFrameIndex);

  return (
    <div ref={containerRef} style={{ width: "100%", height: customHeight || "100%", position: "relative", overflow: "hidden", background: "#0d1520" }}>
      {/* Layer 1 - Satellite basemap */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {tiles.map((t) => (
          <div
            key={t.key}
            style={{ position: "absolute", left: t.dx, top: t.dy, width: 256, height: 256 }}
          >
            <img
              src={t.url}
              alt=""
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried) {
                  img.dataset.retried = "1";
                  img.src = t.fallbackUrl;
                } else {
                  img.style.visibility = "hidden";
                }
              }}
              style={{ position: "absolute", inset: 0, width: 256, height: 256, display: "block", filter: "brightness(0.55) saturate(0.4)" }}
              draggable={false}
            />
            {/* Live RainViewer Doppler radar tile */}
            {t.rainUrl && (
              <img
                src={t.rainUrl}
                alt=""
                crossOrigin="anonymous"
                onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                style={{ position: "absolute", inset: 0, width: 256, height: 256, display: "block", opacity: 0.85, mixBlendMode: "screen" }}
                draggable={false}
              />
            )}
            <img
              src={t.refUrl}
              alt=""
              crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: 256, height: 256, display: "block", opacity: 0.75 }}
              draggable={false}
            />
          </div>
        ))}
      </div>
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
  const mapCenter = LOCATION_CENTERS[locationKey] || DEFAULT_CENTER;

  // Fetch live RainViewer Doppler radar data
  const [rainData, setRainData] = useState<RainViewerData | null>(null);
  useEffect(() => {
    let mounted = true;
    fetchRainViewerFrames().then((d) => { if (mounted && d) setRainData(d); });
    return () => { mounted = false; };
  }, []);
  // Show latest frame
  const latestFrameIdx = rainData ? Math.max(0, rainData.frames.length - 1) : 0;

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
          rainViewerData={rainData}
          rainFrameIndex={latestFrameIdx}
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
            <span className="mt-1 text-[10px] font-medium text-white/70">{t("My Location")}</span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-md">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/90" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </div>
      </button>

      {/* Legend - colours match the vertical gradient palette */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-1">
        {([["Light", "#007aff"], ["Moderate", "#c084fc"], ["Heavy", "#facc15"], ["Extreme", "#ffffff"]] as const).map(([l, c]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-ink-faint)]">
            <span className="h-2 w-2 rounded-full border border-white/20" style={{ background: c }} /> {t(l)}
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
  condition, chance, accent, city, lang, locationKey, wind, temp, onClose, onSwitchLayer,
}: {
  condition: Condition; chance: number; accent: string; city: string;
  lang: Lang; locationKey: string; wind: Wind; temp?: number;
  onClose: () => void;
  onSwitchLayer?: (layer: "rain" | "wind") => void;
}) {
  const t = makeT(lang);
  const [playing, setPlaying] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [range, setRange] = useState<"1h" | "12h">("12h");
  const timerRef = useRef<number | null>(null);
  const mapCenter = LOCATION_CENTERS[locationKey] || DEFAULT_CENTER;

  // Fetch live RainViewer Doppler radar data
  const [rainData, setRainData] = useState<RainViewerData | null>(null);
  const [rainFrameIdx, setRainFrameIdx] = useState(0);
  useEffect(() => {
    let mounted = true;
    fetchRainViewerFrames().then((d) => {
      if (mounted && d) {
        setRainData(d);
        setRainFrameIdx(Math.max(0, d.frames.length - 1));
      }
    });
    return () => { mounted = false; };
  }, []);

  const frames = rainData?.frames ?? [];
  const frame = rainFrameIdx;

  // Play/pause animation
  useEffect(() => {
    if (playing && frames.length > 0) {
      timerRef.current = window.setInterval(() => {
        setRainFrameIdx((f) => {
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
          rainViewerData={rainData}
          rainFrameIndex={rainFrameIdx}
        />

        {/* ── Controls overlay ── */}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute left-4 top-12 z-20 grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 shadow-lg"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Right-side buttons (layers, wind switch, navigate) */}
        <div className="absolute right-4 top-12 z-20 flex flex-col gap-2.5">
          {/* Layers */}
          <button
            onClick={() => setShowLegend((s) => !s)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 shadow-lg text-white"
            aria-label="Layers"
            title="Toggle Legend"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>
          {/* Switch to Wind Radar */}
          {onSwitchLayer && (
            <button
              onClick={() => onSwitchLayer("wind")}
              className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md border border-blue-400 active:scale-95 transition shadow-lg"
              aria-label="Switch to Wind Radar"
              title="Switch to Wind Radar"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
                <path d="M12.59 19.41A2 2 0 1 0 14 16H2" />
                <path d="M15.73 7.73A2.5 2.5 0 1 1 17.5 12H2" />
              </svg>
            </button>
          )}
          {/* Navigate */}
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 shadow-lg" aria-label="Navigate">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-400" fill="currentColor">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </button>
        </div>

        {/* Precipitation legend - EXACT copy of user's Apple Weather screenshot */}
        {showLegend && (
          <div className="absolute left-4 top-24 z-20 rounded-2xl bg-[rgba(26,34,52,0.92)] px-4 py-3.5 border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
            <p className="mb-2 text-[13px] font-semibold text-white tracking-tight">{t("Precipitation")}</p>
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
                <span>{t("Extreme")}</span>
                <span>{t("Heavy")}</span>
                <span>{t("Moderate")}</span>
                <span>{t("Light")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Temperature badge - centred */}
        <div className="absolute left-1/2 top-[45%] z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center">
            <div
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-white"
              style={{ background: "rgba(50,60,80,0.78)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <span className="text-[22px] font-semibold">{temp ?? 31}°</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4.5 4.5 0 1 0 4 0z" />
                <line x1="12" y1="9" x2="12" y2="14" strokeWidth="2" stroke="currentColor" />
                <circle cx="12" cy="16.5" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="mt-1 text-[11px] font-medium text-white/55">{t("My Location")}</span>
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
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 translate-x-0.5 text-white" fill="currentColor">
                  <path d="M7 4.77v14.46a1 1 0 0 0 1.5.86l12.05-7.23a1 1 0 0 0 0-1.72L8.5 3.91A1 1 0 0 0 7 4.77Z" />
                </svg>
              )}
            </button>
            <div>
              <p className="text-[14px] font-semibold text-white">{t("Forecast")}</p>
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
          {/* Time labels - show every 3rd frame to avoid clutter */}
          <div className="mt-2 flex justify-between">
            {frames.length > 0 ? frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 8)) === 0 || i === frames.length - 1).map((f) => {
              const idx = frames.indexOf(f);
              return (
                <button
                  key={f.time}
                  onClick={() => setRainFrameIdx(idx)}
                  className="text-[10px] transition"
                  style={{
                    color: frame === idx ? "white" : "rgba(255,255,255,0.3)",
                    fontWeight: frame === idx ? 700 : 400,
                  }}
                >
                  {f.timeStr}
                </button>
              );
            }) : (
              <span className="text-[10px] text-white/30">Loading radar data...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RainMapWidget;
