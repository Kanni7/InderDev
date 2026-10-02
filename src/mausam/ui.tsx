import { useState, useMemo } from "react";
import type { WeatherTheme, Condition } from "./theme";
import {
  type Sun, type Precip, type Pollen, type Travel,
  type Wind, type Pressure, type Moon, type TemperatureUnit, formatTemp,
  pollenColor, trafficColor, statusColor, packingTips, getLifestyleIndices, type Location,
} from "./data";
import { weatherAudio } from "./audio";
import { makeT, type Lang } from "./i18n";
import * as I from "./icons";
import { RealisticMoon } from "./RealisticMoon";
import { getCompleteMoonData, CITY_COORDINATES } from "./astronomy";
import { parseTimeStringToHours } from "./background/solarEngine";

/** The weather photo is one continuous, app-wide backdrop (painted once in
 * App.tsx). The hero only adds a soft top-down legibility wash for its copy and
 * any live precipitation motion, so there is no seam as the page scrolls. */
export function PhotoHero({ theme }: { theme: WeatherTheme }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* A gentle wash that fades to nothing, so the photo stays whole below. */}
      <div className="animate-fade absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,8,14,0.32) 0%, rgba(5,8,14,0.12) 52%, rgba(5,8,14,0) 100%)" }} />
      {theme.motion === "rain" && <RainLayer />}
      {theme.motion === "storm" && <RainLayer dense />}
    </div>
  );
}

/** Weather Sound Ambience Controller Button */
export function AmbienceAudioButton({ condition, accent }: { condition: Condition; accent: string }) {
  const [playing, setPlaying] = useState(false);

  const handleToggle = () => {
    const audioType = condition === "storm" ? "storm" : condition === "rainy" ? "rain" : condition === "sunny" ? "clear" : "wind";
    const isNowPlaying = weatherAudio.toggleSound(audioType);
    setPlaying(isNowPlaying);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition active:scale-95 hover:bg-white/20 shadow-lg border border-white/10"
      title="Toggle Ambient Sky Sound"
    >
      <span className={playing ? "animate-pulse" : ""}>
        {playing ? "🔊" : "🔇"}
      </span>
      <span className="text-[11px]">{playing ? "Sound ON" : "Sound"}</span>
    </button>
  );
}

/** Lifestyle Indices Grid Card */
export function LifestyleIndicesCard({ location, lang, onSelectIndex }: { location: Location; lang: Lang; onSelectIndex?: (id: string) => void }) {
  const t = makeT(lang);
  const indices = getLifestyleIndices(location);

  return (
    <div className="rounded-3xl p-4 mausam-glass space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          🎯 {t("Lifestyle Indices")}
        </p>
        <span className="text-[11px] font-mono text-[var(--color-ink-soft)]">
          {t("Live Analysis")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {indices.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectIndex?.(item.id)}
            className="flex flex-col justify-between rounded-2xl bg-white/5 p-3 border border-white/5 transition hover:bg-white/10 active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{item.glyph}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-white/10" style={{ color: item.color, background: `${item.color}15` }}>
                {t(item.label, item.labelHi)}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-[13px] font-semibold text-white leading-tight">{t(item.name, item.nameHi)}</p>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)] line-clamp-1">{t(item.detail, item.detailHi)}</p>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.score}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interactive 24-Hour Temperature Curve Graph */
export function HourlyInteractiveGraph({
  hourlyData, unit, accent, lang, onOpenDetail,
}: {
  hourlyData: { t: string; c: Condition; temp: number; feels?: number; rain?: number; humidity?: number; windSpeed?: number }[];
  unit: TemperatureUnit;
  accent: string;
  lang: Lang;
  onOpenDetail?: (index?: number) => void;
}) {
  const t = makeT(lang);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeItem = hourlyData[selectedIndex] ?? hourlyData[0];

  return (
    <div
      onClick={() => onOpenDetail?.(selectedIndex)}
      className="group rounded-3xl p-4 mausam-glass space-y-3 cursor-pointer transition-all duration-200 hover:border-white/20 active:scale-[0.99]"
      title={t("Tap to view 24-hour detailed forecast")}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)] flex items-center gap-1.5">
          <span>📈</span>
          <span>{t("24-Hour Forecast Timeline")}</span>
          <span className="text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all text-xs font-bold">›</span>
        </p>
        <span className="text-[12px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 group-hover:bg-white/15 transition">
          {t(activeItem.t)}: {formatTemp(activeItem.temp, unit)}
        </span>
      </div>

      <div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2">
        {hourlyData.map((h, i) => {
          const active = i === selectedIndex;
          const Ico = I.conditionIcon(h.c);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(i);
                onOpenDetail?.(i);
              }}
              className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border py-3 px-2 transition active:scale-95 ${
                active ? "border-white/30 bg-white/15 shadow-xl scale-[1.03]" : "border-white/5 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="text-[11px] font-medium text-[var(--color-ink-faint)]">{t(h.t)}</span>
              <Ico className={`h-5 w-5 ${
                h.c === "sunny" ? "text-amber-300" :
                h.c === "night" ? "text-slate-100" :
                h.c === "rainy" ? "text-sky-300" :
                h.c === "storm" ? "text-yellow-400" : "text-slate-300"
              }`} />
              <span className="text-sm font-bold text-white">{formatTemp(h.temp, unit)}</span>
              {typeof h.rain === "number" && h.rain > 0 && (
                <span className="text-[9.5px] font-semibold text-sky-400 -mt-1 font-mono">{h.rain}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RainLayer({ dense }: { dense?: boolean }) {
  const drops = Array.from({ length: dense ? 40 : 24 });
  return (
    <div className="absolute inset-0" aria-hidden>
      {drops.map((_, i) => (
        <span
          key={i}
          className="absolute block w-px bg-white/30"
          style={{
            left: `${(i * 97) % 100}%`,
            height: `${10 + (i % 4) * 5}px`,
            top: "-12%",
            animation: `rain-fall ${0.6 + (i % 5) * 0.14}s linear ${i * 0.09}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Sun path arc - Refined Apple Weather-inspired diurnal horizon curve + sunrise & sunset metrics */
export function SunArc({
  sun,
  accent,
  lang,
  currentHour,
}: {
  sun?: Sun;
  accent: string;
  lang: Lang;
  currentHour?: number;
}) {
  const t = makeT(lang);
  const s = sun ?? { sunrise: "6:00 AM", sunset: "6:15 PM", daylight: "12h 15m", progress: 0.5 };

  const sunriseH = parseTimeStringToHours(s.sunrise) ?? 6.0;
  const sunsetH = parseTimeStringToHours(s.sunset) ?? 18.25;

  // Resolve current decimal hour: from explicit prop, derived from sun.progress if daytime, or live clock
  const nowH = useMemo(() => {
    if (typeof currentHour === "number" && !isNaN(currentHour)) {
      return ((currentHour % 24) + 24) % 24;
    }
    if (typeof s.progress === "number" && s.progress >= 0 && s.progress <= 1) {
      return sunriseH + s.progress * (sunsetH - sunriseH);
    }
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }, [currentHour, s.progress, sunriseH, sunsetH]);

  const isDaytime = nowH >= sunriseH && nowH <= sunsetH;
  const isSunsetNext = isDaytime;

  // Hero labels & times matching Apple Weather logic
  const heroTime = isSunsetNext ? s.sunset : s.sunrise;
  const heroLabel = isSunsetNext ? t("Sunset") : t("Sunrise");
  const subText = isSunsetNext
    ? `${t("Sunrise")}: ${s.sunrise}`
    : `${t("Sunset")}: ${s.sunset}`;

  // Time remaining countdown
  const countdownText = useMemo(() => {
    let diff = 0;
    if (isDaytime) {
      diff = sunsetH - nowH;
    } else if (nowH < sunriseH) {
      diff = sunriseH - nowH;
    } else {
      diff = (24 - nowH) + sunriseH;
    }
    const totalMinutes = Math.max(0, Math.round(diff * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) {
      return `in ${h}h ${m}m`;
    }
    return `in ${m}m`;
  }, [isDaytime, sunsetH, sunriseH, nowH]);

  // Curve geometry parameters across a 320x80 viewBox
  const x0 = 38; // Sunrise horizon intersection
  const x1 = 282; // Sunset horizon intersection
  const dx = x1 - x0; // 244px
  const horizonY = 56; // 0° Horizon baseline
  const arcH = 42; // Peak apex height above horizon

  // 41 precision coordinates along the daytime arc
  const daylightPts = useMemo(() => {
    return Array.from({ length: 41 }, (_, i) => {
      const p = i / 40;
      return {
        x: x0 + dx * p,
        y: horizonY - arcH * Math.sin(p * Math.PI),
      };
    });
  }, [x0, dx, horizonY, arcH]);

  const daylightPath = useMemo(() => {
    return daylightPts
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");
  }, [daylightPts]);

  // Area under the daytime curve down to the horizon line
  const daylightArea = useMemo(() => {
    return `${daylightPath} L ${x1} ${horizonY} L ${x0} ${horizonY} Z`;
  }, [daylightPath, x1, x0, horizonY]);

  // Live sun position & elapsed luminous arc
  const { sunX, sunY, elapsedPath } = useMemo(() => {
    if (isDaytime) {
      const dayProgress = Math.min(Math.max((nowH - sunriseH) / (sunsetH - sunriseH), 0.005), 0.995);
      const sx = x0 + dx * dayProgress;
      const sy = horizonY - arcH * Math.sin(dayProgress * Math.PI);
      const filtered = daylightPts.filter((_, i) => i / 40 <= dayProgress);
      let elPath = filtered
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(" ");
      elPath += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      return { sunX: sx, sunY: sy, elapsedPath: elPath };
    }

    if (nowH < sunriseH) {
      // Pre-dawn night curve: sun approaches horizon from below
      const pPre = Math.min(Math.max(nowH / sunriseH, 0), 1);
      const sx = 14 + (x0 - 14) * pPre;
      const sy = 68 - (68 - horizonY) * pPre;
      return { sunX: sx, sunY: sy, elapsedPath: "" };
    }

    // Post-dusk night curve: sun descends below horizon
    const nightDuration = (24 - sunsetH) + sunriseH;
    const pPost = Math.min(Math.max((nowH - sunsetH) / nightDuration, 0), 1);
    const sx = x1 + (306 - x1) * Math.min(pPost * 1.8, 1);
    const sy = horizonY + (68 - horizonY) * Math.min(pPost * 1.8, 1);
    return { sunX: sx, sunY: sy, elapsedPath: "" };
  }, [isDaytime, nowH, sunriseH, sunsetH, x0, x1, dx, horizonY, arcH, daylightPts]);

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl p-4 mausam-glass transition-all duration-200 hover:border-white/20">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-[var(--color-ink-faint)]"
          >
            <path d="M12 3v4M4.22 10.22l2.83 2.83M19.78 10.22l-2.83 2.83M2 19h20M20 19a8 8 0 10-16 0" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {heroLabel}
          </span>
        </div>
        <I.Chevron className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>

      {/* ── Hero Metric Row ── */}
      <div className="mt-2 flex items-baseline justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-tight text-[var(--color-ink)]">
              {heroTime}
            </span>
            <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">
              {heroLabel}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)] leading-tight whitespace-nowrap">
            {subText}
          </p>
        </div>
        {countdownText && (
          <div className="rounded-full px-2.5 py-1 text-[11px] font-medium font-mono border border-white/10 bg-white/6 text-[var(--color-ink-soft)] whitespace-nowrap">
            {t(countdownText)}
          </div>
        )}
      </div>

      {/* ── Center: Precision Solar Diurnal Horizon Curve ── */}
      <div className="relative mt-1 flex justify-center">
        <svg viewBox="0 0 320 80" className="w-full" style={{ maxHeight: 92 }}>
          <defs>
            {/* Luminous atmospheric fill under daylight arc */}
            <linearGradient id="sunDaylightArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
              <stop offset="65%" stopColor={accent} stopOpacity="0.06" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>

            {/* Daytime curve stroke gradient */}
            <linearGradient id="sunArcStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="25%" stopColor="rgba(255,255,255,0.65)" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="rgba(255,255,255,0.65)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
            </linearGradient>
          </defs>

          {/* Area fill under daytime curve */}
          <path d={daylightArea} fill="url(#sunDaylightArea)" />

          {/* Horizon Line */}
          <line
            x1="12"
            y1={horizonY}
            x2="308"
            y2={horizonY}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Nocturnal Below-Horizon Wings */}
          <path
            d={`M 14 68 Q 26 64 ${x0} ${horizonY}`}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          />
          <path
            d={`M ${x1} ${horizonY} Q 294 64 306 68`}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          />

          {/* Background Daytime Arc */}
          <path
            d={daylightPath}
            fill="none"
            stroke="url(#sunArcStroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Luminous Elapsed Arc */}
          {isDaytime && elapsedPath && (
            <path
              d={elapsedPath}
              fill="none"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Horizon Intersection Nodes */}
          <circle cx={x0} cy={horizonY} r="2.5" fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
          <circle cx={x1} cy={horizonY} r="2.5" fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />

          {/* Live Sun Celestial Bead */}
          {isDaytime ? (
            <g>
              {/* Vertical Drop-line to Horizon */}
              <line
                x1={sunX}
                y1={sunY}
                x2={sunX}
                y2={horizonY}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Multi-layered Sun Orb */}
              <circle cx={sunX} cy={sunY} r="13" fill={accent} opacity="0.18" />
              <circle cx={sunX} cy={sunY} r="8.5" fill={accent} opacity="0.35" />
              <circle
                cx={sunX}
                cy={sunY}
                r="4.6"
                fill="#ffffff"
                stroke={accent}
                strokeWidth="2"
                filter="drop-shadow(0 1px 4px rgba(0,0,0,0.5))"
              />
            </g>
          ) : (
            <g>
              {/* Night Anchor to Horizon */}
              <line
                x1={sunX}
                y1={horizonY}
                x2={sunX}
                y2={sunY}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Subdued Nocturnal Orb */}
              <circle
                cx={sunX}
                cy={sunY}
                r="4.2"
                fill="rgba(255,255,255,0.25)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.2"
              />
              <circle cx={sunX} cy={sunY} r="1.6" fill={accent} opacity="0.85" />
            </g>
          )}
        </svg>
      </div>

      {/* ── Bottom Celestial Stats Bar ── */}
      <div className="mt-2 pt-2.5 border-t border-white/6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] leading-none">
            {t("Sunrise")}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink)] leading-tight whitespace-nowrap">
            {s.sunrise}
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] leading-none">
            {t("Daylight")}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink)] leading-tight whitespace-nowrap">
            {t(s.daylight)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] leading-none">
            {t("Sunset")}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink)] leading-tight whitespace-nowrap">
            {s.sunset}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Precipitation widget - next rain, chance, and next-hours probability bars */
export function PrecipCard({ precip, accent, lang }: { precip: Precip; accent: string; lang: Lang }) {
  const t = makeT(lang);
  return (
    <div className="rounded-3xl p-4 mausam-glass">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Precipitation")}</p>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${accent}22`, color: accent }}>
          {precip.chance}% {t("chance")}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[22px] font-semibold text-[var(--color-ink)]">{precip.amount}</p>
          <p className="text-[12px] text-[var(--color-ink-soft)]">{t("Next rain")}: {precip.next}</p>
        </div>
        <span className="rounded-lg bg-white/8 px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink)]">{precip.rate}</span>
      </div>
      <div className="mt-3 flex items-end gap-2" style={{ height: 56 }}>
        {precip.bars.map((b) => (
          <div key={b.t} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center" style={{ height: 40 }}>
              <div className="w-full rounded-md" style={{ height: `${Math.max(b.v, 4)}%`, background: accent, opacity: 0.35 + (b.v / 100) * 0.65 }} />
            </div>
            <span className="text-[10px] text-[var(--color-ink-faint)]">{b.t}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-ink-soft)]">{t(precip.note)}</p>
    </div>
  );
}

// City positions on a 220×150 SVG mapped from India's geographic bounds
// x = (lon − 68) × 7.586,  y = (37 − lat) × 5.172
const CITY_SVG: Record<string, { x: number; y: number }> = {
  pune:      { x: 44, y: 96 },
  mumbai:    { x: 37, y: 93 },
  delhi:     { x: 70, y: 43 },
  bengaluru: { x: 73, y: 124 },
  chennai:   { x: 93, y: 124 },
  kolkata:   { x: 154, y: 75 },
};

const CITY_DOTS = [
  { key: "pune",      x: 44,  y: 96,  label: "Pune" },
  { key: "mumbai",    x: 37,  y: 93,  label: "Mumbai" },
  { key: "delhi",     x: 70,  y: 43,  label: "Delhi" },
  { key: "bengaluru", x: 73,  y: 124, label: "BLR" },
  { key: "chennai",   x: 93,  y: 124, label: "Chennai" },
  { key: "kolkata",   x: 154, y: 75,  label: "Kolkata" },
];

// Simplified India polygon outline (clockwise from NW J&K)
const INDIA_PATH =
  "M46,5 L19,41 L4,67 L0,78 L36,88 L37,94 L40,104 L44,112 " +
  "L49,124 L61,135 L68,148 L72,150 L87,146 L93,124 L114,100 " +
  "L140,88 L148,80 L155,75 L159,78 L163,73 L175,62 L182,52 " +
  "L205,49 L190,65 L182,72 L163,67 L156,54 L144,52 L114,52 " +
  "L91,46 L84,36 L72,28 L61,23 L53,18 Z";

// Unit vector pointing FROM the wind direction (where rain approaches from)
function windVec(dir: string): { dx: number; dy: number } {
  const m: Record<string, { dx: number; dy: number }> = {
    N: { dx: 0, dy: -1 }, NE: { dx: 0.707, dy: -0.707 }, E: { dx: 1, dy: 0 },
    SE: { dx: 0.707, dy: 0.707 }, S: { dx: 0, dy: 1 }, SW: { dx: -0.707, dy: 0.707 },
    W: { dx: -1, dy: 0 }, NW: { dx: -0.707, dy: -0.707 },
  };
  return m[dir] ?? { dx: 0, dy: -1 };
}

/** Rain radar - geographic India map with real city positions and wind-driven precipitation cells */
export function RainMap({
  condition, chance, accent, city, lang, locationKey, wind,
}: {
  condition: Condition; chance: number; accent: string; city: string; lang: Lang;
  locationKey: string; wind: Wind;
}) {
  const t = makeT(lang);
  const wet = condition === "rainy" || condition === "storm";
  const intensity = Math.max(chance / 100, wet ? 0.6 : 0.15);

  const pin = CITY_SVG[locationKey] ?? { x: 110, y: 82 };
  const v = windVec(wind.dir);
  const R = 16; // base distance in SVG units (~340 km)

  // Perpendicular spread components
  const px = v.dy, py = -v.dx;

  const band = (i: number) =>
    i > 0.7 ? "#e5484d" : i > 0.45 ? "#f0873a" : i > 0.25 ? "#f2c53d" : "#7bc4f2";

  // Rain cells positioned upwind from city, spread perpendicular to wind direction
  const showCells = wet || chance > 20;
  const cells = showCells ? [
    { cx: pin.x + v.dx * R,         cy: pin.y + v.dy * R,         r: 13, i: intensity },
    { cx: pin.x + v.dx * R * 1.7,   cy: pin.y + v.dy * R * 1.7,   r: 10, i: intensity * 0.72 },
    { cx: pin.x + v.dx * R + px * 11, cy: pin.y + v.dy * R + py * 11, r: 9, i: intensity * 0.62 },
    { cx: pin.x + v.dx * R - px * 10, cy: pin.y + v.dy * R - py * 10, r: 8, i: intensity * 0.55 },
    { cx: pin.x + v.dx * R * 2.4,   cy: pin.y + v.dy * R * 2.4,   r: 7,  i: intensity * 0.42 },
  ] : [
    { cx: pin.x + v.dx * R * 2.5,   cy: pin.y + v.dy * R * 2.5,   r: 9,  i: intensity * 0.45 },
    { cx: pin.x + v.dx * R * 3.5,   cy: pin.y + v.dy * R * 3.5,   r: 6,  i: intensity * 0.28 },
  ];

  const uid = locationKey;

  return (
    <div className="overflow-hidden rounded-3xl mausam-glass">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Rain radar")}</p>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-soft)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} /> {t("Live")}
        </span>
      </div>
      <div className="relative mt-2 h-[160px] w-full">
        <svg viewBox="0 0 220 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            {cells.map((c, i) => (
              <radialGradient key={i} id={`rc_${uid}_${i}`}>
                <stop offset="0%" stopColor={band(c.i)} stopOpacity={Math.min(0.9 * c.i + 0.1, 1)} />
                <stop offset="100%" stopColor={band(c.i)} stopOpacity="0" />
              </radialGradient>
            ))}
            <clipPath id={`clip_${uid}`}>
              <rect x="0" y="0" width="220" height="150" />
            </clipPath>
          </defs>

          {/* Water - subtle teal for seas */}
          <rect x="0" y="0" width="220" height="150" fill="rgba(30,60,90,0.28)" />

          {/* India landmass */}
          <path d={INDIA_PATH} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />

          {/* Grid */}
          {[0, 1, 2, 3, 4].map((g) => (
            <line key={"h" + g} x1="0" y1={g * 37.5} x2="220" y2={g * 37.5} stroke="rgba(255,255,255,0.04)" />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((g) => (
            <line key={"v" + g} x1={g * 36.7} y1="0" x2={g * 36.7} y2="150" stroke="rgba(255,255,255,0.04)" />
          ))}

          {/* Rain cells (clipped to SVG bounds) */}
          <g clipPath={`url(#clip_${uid})`}>
            {cells.map((c, i) => (
              <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={`url(#rc_${uid}_${i})`} />
            ))}
          </g>

          {/* Radar sweep - rotates around the city pin */}
          <g transform={`translate(${pin.x} ${pin.y})`} clipPath={`url(#clip_${uid})`}>
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="5s" repeatCount="indefinite" />
              <path
                d={`M0,0 L0,-90 A90,90 0,0,1 ${(90 * Math.sin((8 * Math.PI) / 180)).toFixed(2)},${(-90 * Math.cos((8 * Math.PI) / 180)).toFixed(2)} Z`}
                fill={accent} fillOpacity="0.08"
              />
              <line x1="0" y1="0" x2="0" y2="-90" stroke={accent} strokeWidth="1" strokeOpacity="0.35" />
            </g>
          </g>

          {/* Reference city dots */}
          {CITY_DOTS.filter((d) => d.key !== locationKey).map((d) => (
            <g key={d.key}>
              <circle cx={d.x} cy={d.y} r="2" fill="rgba(255,255,255,0.30)" />
              <text x={d.x + 3.5} y={d.y + 2.5} fontSize="5.5" fill="rgba(255,255,255,0.38)">{d.label}</text>
            </g>
          ))}

          {/* Active city pin */}
          <circle cx={pin.x} cy={pin.y} r="4.5" fill="#fff" />
          <circle cx={pin.x} cy={pin.y} r="8" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1" />
          <circle cx={pin.x} cy={pin.y} r="12" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.8" />
        </svg>
        <span className="absolute bottom-2 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {city} · {chance}% {t("cover")}
        </span>
        <span className="absolute bottom-2 right-3 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/75 backdrop-blur-sm">
          {wind.dir} {wind.speed} km/h
        </span>
      </div>
      {/* legend */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-2">
        {[[t("Light"), "#7bc4f2"], [t("Mod"), "#f2c53d"], [t("Heavy"), "#f0873a"], [t("Intense"), "#e5484d"]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Pollen count - shown for every profile */
export function PollenCard({ pollen, lang }: { pollen: Pollen; lang: Lang }) {
  const t = makeT(lang);
  const color = pollenColor(pollen.level);
  const pct = Math.min(pollen.count / 10, 1);
  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pollen count")}</p>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}22`, color }}>{t(pollen.level)}</span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-[26px] font-semibold leading-none" style={{ color }}>{pollen.count}</p>
        <p className="mb-0.5 text-[12px] text-[var(--color-ink-soft)]">{t("grains/m³")}</p>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-ink-soft)]">{pollen.types} · {t(pollen.trend)}</p>
    </div>
  );
}

/** Travel & commute - flights, traffic, visibility */
export function TravelCard({ travel, accent, lang }: { travel: Travel; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const trColor = trafficColor(travel.traffic);
  return (
    <div className="rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Travel & commute")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/6 p-3">
          <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Traffic")}</p>
          <p className="mt-1 text-[17px] font-semibold" style={{ color: trColor }}>{t(travel.traffic)}</p>
          <p className="text-[11px] text-[var(--color-ink-soft)]">{t(travel.trafficNote)}</p>
        </div>
        <div className="rounded-2xl bg-white/6 p-3">
          <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Visibility")}</p>
          <p className="mt-1 text-[17px] font-semibold text-[var(--color-ink)]">{travel.visibility}</p>
          <p className="text-[11px] text-[var(--color-ink-soft)]">{t("on main routes")}</p>
        </div>
      </div>
      <p className="mt-4 mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        <I.Send className="h-3.5 w-3.5" style={{ color: accent }} /> {t("Flights today")}
      </p>
      <div className="space-y-1.5">
        {travel.flights.map((f) => (
          <div key={f.route} className="flex items-center justify-between rounded-xl bg-white/6 px-3 py-2">
            <span className="text-[13px] font-medium text-[var(--color-ink)]">{f.route}</span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--color-ink-soft)]">{f.time}</span>
              <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${statusColor(f.status)}22`, color: statusColor(f.status) }}>
                {t(f.status)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Packing tip - derived from the current sky */
export function PackingCard({ condition, accent, lang }: { condition: Condition; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const tips = packingTips(condition);
  return (
    <div className="rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Packing tip")}</p>
      <div className="mt-3 space-y-2">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-black" style={{ background: accent }}>
              <I.Check className="h-4 w-4" />
            </span>
            <span className="text-[13.5px] text-[var(--color-ink)]">{t(tip.tip)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Wind - Refined Apple Weather-inspired meteorological compass rose + speed & gusts */
export function WindCard({ wind, accent, lang }: { wind?: Wind; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const w = wind ?? { speed: 0, dir: "N", gust: 0 };
  const angles: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const deg = angles[w.dir] ?? 0;

  // 16-point precision tick marks for the compass dial
  const ticks = Array.from({ length: 16 }).map((_, i) => {
    const angle = i * 22.5;
    const isCardinal = i % 4 === 0; // N, E, S, W
    const isOrdinal = i % 2 === 0 && !isCardinal; // NE, SE, SW, NW
    const rOuter = 35;
    const rInner = isCardinal ? 29 : isOrdinal ? 31 : 32.5;
    const rad = (angle - 90) * (Math.PI / 180);
    const x1 = 40 + rInner * Math.cos(rad);
    const y1 = 40 + rInner * Math.sin(rad);
    const x2 = 40 + rOuter * Math.cos(rad);
    const y2 = 40 + rOuter * Math.sin(rad);
    const isActive = Math.abs(angle - deg) < 12;

    return {
      id: i,
      x1, y1, x2, y2,
      stroke: isActive ? accent : isCardinal ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)",
      width: isActive ? 1.8 : isCardinal ? 1.2 : 0.75,
    };
  });

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-3xl p-4 mausam-glass transition-all duration-200 hover:border-white/20">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-[var(--color-ink-faint)]"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.25" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("Wind")}
          </span>
        </div>
        <I.Chevron className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>

      {/* ── Center Content: Metrics + Precision Compass Rose ── */}
      <div className="my-auto flex items-center justify-between gap-2.5">
        {/* Left: Speed, Bearing & Gusts - Stacked cleanly with zero truncation */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[30px] font-semibold leading-none text-[var(--color-ink)] tracking-tight">
              {w.speed}
            </span>
            <span className="text-[12px] font-normal text-[var(--color-ink-soft)]">
              km/h
            </span>
          </div>

          <p className="mt-1 text-[12px] font-medium text-[var(--color-ink)] leading-tight whitespace-nowrap">
            {w.dir} · {deg}°
          </p>

          <div className="mt-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] font-mono leading-none">
              {t("gusts")}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink)] leading-tight whitespace-nowrap">
              {w.gust} km/h
            </p>
          </div>
        </div>

        {/* Right: Precision Compass Rose */}
        <div className="relative grid h-[80px] w-[80px] shrink-0 place-items-center">
          <svg viewBox="0 0 80 80" className="h-full w-full">
            {/* Outer Dial Circle */}
            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Precision Tick Marks */}
            {ticks.map((t) => (
              <line
                key={t.id}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.stroke}
                strokeWidth={t.width}
                strokeLinecap="round"
              />
            ))}

            {/* Cardinal Letters */}
            <text x="40" y="13.5" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={deg === 0 ? accent : "rgba(255,255,255,0.65)"}>N</text>
            <text x="68" y="42.5" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={deg === 90 ? accent : "rgba(255,255,255,0.4)"}>E</text>
            <text x="40" y="72" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={deg === 180 ? accent : "rgba(255,255,255,0.4)"}>S</text>
            <text x="12" y="42.5" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={deg === 270 ? accent : "rgba(255,255,255,0.4)"}>W</text>

          </svg>

          {/* Smoothly Rotating Needle Layer (Rotates around true 50% 50% HTML box center) */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{
              transform: `rotate(${deg}deg)`,
              transformOrigin: "center center",
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <svg viewBox="0 0 80 80" className="h-full w-full overflow-visible">
              <defs>
                <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Seamless, tapered compass needle anchored to center */}
              <g filter="url(#needleShadow)">
                {/* Needle North pointer body */}
                <path
                  d="M 40 13 L 36.5 38 L 40 36 Z"
                  fill="#ffffff"
                />
                <path
                  d="M 40 13 L 43.5 38 L 40 36 Z"
                  fill="rgba(255,255,255,0.85)"
                />
                {/* Accent luminous tip */}
                <path
                  d="M 40 13 L 38 23 L 40 21.5 L 42 23 Z"
                  fill={accent}
                />
                {/* Counter-weight tail */}
                <path
                  d="M 40 39 L 41.8 48 L 40 46.8 L 38.2 48 Z"
                  fill="rgba(255,255,255,0.28)"
                />
              </g>

              {/* Center Pivot Hub */}
              <circle cx="40" cy="40" r="3.6" fill="#0d1422" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
              <circle cx="40" cy="40" r="1.6" fill={accent} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Humidity - ring gauge */
export function HumidityCard({ humidity: humidityIn, dewPoint: dewIn, accent, lang }: { humidity?: number; dewPoint?: number; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const humidity = humidityIn ?? 0;
  const dewPoint = dewIn ?? 0;
  const C = 2 * Math.PI * 26;
  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Humidity")}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
          <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
            <circle cx="36" cy="36" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            <circle cx="36" cy="36" r="26" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - humidity / 100)} />
          </svg>
          <span className="absolute text-[15px] font-semibold text-[var(--color-ink)]">{humidity}%</span>
        </div>
        <div>
          <p className="text-[13px] text-[var(--color-ink-soft)]">{humidity >= 75 ? t("Feels muggy") : humidity <= 40 ? t("Feels dry") : t("Comfortable")}</p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{t("Dew point")} {dewPoint}°C</p>
        </div>
      </div>
    </div>
  );
}

/** Dew point - comfort read */
export function DewPointCard({ dewPoint: dewIn, lang }: { dewPoint?: number; lang: Lang }) {
  const t = makeT(lang);
  const dewPoint = dewIn ?? 0;
  const level = dewPoint >= 24 ? { l: t("Oppressive"), c: "#e5484d" } : dewPoint >= 20 ? { l: t("Humid"), c: "#f0873a" } : dewPoint >= 16 ? { l: t("Comfortable"), c: "#7bd88f" } : { l: t("Dry"), c: "#7bc4f2" };
  const pct = Math.min(Math.max((dewPoint - 8) / 20, 0), 1);
  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Dew point")}</p>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${level.c}22`, color: level.c }}>{level.l}</span>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none text-[var(--color-ink)]">{dewPoint}°C</p>
      <div className="mt-auto pt-3">
        {/* Track */}
        <div className="relative h-1.5 w-full overflow-visible rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg,#7bc4f2,${level.c})` }} />
          {/* Thumb */}
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
            style={{ left: `${pct * 100}%`, background: level.c, boxShadow: `0 0 6px 2px ${level.c}66` }}
          />
        </div>
        {/* Labels */}
        <div className="mt-2 flex justify-between text-[9px] text-[var(--color-ink-faint)]">
          <span>Dry</span><span>Comfortable</span><span>Humid</span>
        </div>
      </div>
    </div>
  );
}

/** Pressure - Refined Apple Weather Arc Gauge Card */
export function PressureCard({
  pressure: pressureIn,
  accent,
  lang,
}: {
  pressure?: Pressure;
  accent: string;
  lang: Lang;
}) {
  const t = makeT(lang);
  const pressure = pressureIn ?? { value: 1013, trend: "Steady" };
  const val = pressure.value;

  // Meteorological calibration: standard 970 hPa (Low) to 1050 hPa (High), Center = 1013.25 hPa
  // Dynamically resilient so dial remains responsive even on extreme synoptic pressure readings
  const minP = Math.min(940, Math.floor(val - 10));
  const maxP = Math.max(1050, Math.ceil(val + 10));
  const clamped = Math.max(minP, Math.min(maxP, val));
  const fraction = Math.max(0.01, (clamped - minP) / (maxP - minP));

  // 240° arc spanning from 150° (bottom-left) to 30° / 390° (bottom-right)
  const startAngle = 150;
  const sweepAngle = 240;
  const currentAngle = startAngle + fraction * sweepAngle;
  const currentRad = (currentAngle * Math.PI) / 180;

  const cx = 60;
  const cy = 52;
  const r = 48;

  const dotX = cx + r * Math.cos(currentRad);
  const dotY = cy + r * Math.sin(currentRad);

  // Standard Sea Level Benchmark Tick (1013.25 hPa)
  const stdFraction = (1013.25 - minP) / (maxP - minP);
  const stdAngle = startAngle + stdFraction * sweepAngle;
  const stdRad = (stdAngle * Math.PI) / 180;
  const stdX1 = cx + 42 * Math.cos(stdRad);
  const stdY1 = cy + 42 * Math.sin(stdRad);
  const stdX2 = cx + 54 * Math.cos(stdRad);
  const stdY2 = cy + 54 * Math.sin(stdRad);

  // Arc path geometry
  const startX = cx + r * Math.cos((startAngle * Math.PI) / 180);
  const startY = cy + r * Math.sin((startAngle * Math.PI) / 180);
  const endX = cx + r * Math.cos(((startAngle + sweepAngle) * Math.PI) / 180);
  const endY = cy + r * Math.sin(((startAngle + sweepAngle) * Math.PI) / 180);

  const isLargeArc = fraction * sweepAngle > 180 ? 1 : 0;

  // Trend classification (ensuring "Measured" is never shown)
  const isFalling = /fall|drop/i.test(pressure.trend);
  const isRising = /ris/i.test(pressure.trend);
  const cleanTrend =
    pressure.trend && !/measured/i.test(pressure.trend)
      ? pressure.trend
      : isFalling
      ? "Falling"
      : isRising
      ? "Rising"
      : "Steady";

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-3xl p-4 mausam-glass overflow-hidden transition-all duration-300 hover:border-white/18">
      {/* ── Header: Title & Chevron (Clean Apple standard) ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-[var(--color-ink-faint)]"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v2" />
            <path d="M18 12h-2" />
            <path d="M12 18v-2" />
            <path d="M6 12h2" />
            <path d="m14 10-3 2" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("Pressure")}
          </span>
        </div>
        <I.Chevron className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>

      {/* ── Main Body: Apple Weather Open-Arc Gauge with Centered Value ── */}
      <div className="my-auto flex flex-col items-center justify-center">
        <div className="relative grid h-[100px] w-[120px] shrink-0 place-items-center">
          <svg viewBox="0 0 120 92" className="h-full w-full overflow-visible">
            {/* Background Track Arc */}
            <path
              d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Standard 1013.25 hPa Benchmark Tick at Apex */}
            <line
              x1={stdX1.toFixed(2)}
              y1={stdY1.toFixed(2)}
              x2={stdX2.toFixed(2)}
              y2={stdY2.toFixed(2)}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Active Colored Progress Arc */}
            {fraction > 0.005 && (
              <path
                d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 ${isLargeArc} 1 ${dotX.toFixed(2)} ${dotY.toFixed(2)}`}
                fill="none"
                stroke={accent}
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{
                  transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            )}

            {/* Luminous Indicator Thumb */}
            <circle
              cx={dotX.toFixed(2)}
              cy={dotY.toFixed(2)}
              r="4.5"
              fill="#ffffff"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
            <circle
              cx={dotX.toFixed(2)}
              cy={dotY.toFixed(2)}
              r="1.8"
              fill={accent}
              style={{
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          </svg>

          {/* Centered Readout inside Arc with generous clearance */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2.5">
            <span className="text-[25px] font-bold tracking-tight text-white leading-none">
              {val}
            </span>
            <span className="font-mono text-[9.5px] text-white/50 tracking-wider mt-1">
              hPa
            </span>
          </div>
        </div>

        {/* Clean Trend Status (No Arrow) */}
        <p className="mt-1 text-center text-[12px] font-medium text-white/70">
          {t(cleanTrend)}
        </p>
      </div>
    </div>
  );
}

/** Moon phase - Apple Weather inspired realistic lunar widget with astronomical data */
export function MoonCard({
  moon: moonIn,
  cityKey,
  coords,
  lang,
}: {
  moon?: Moon;
  cityKey?: string;
  coords?: { lat?: number; lng?: number };
  lang: Lang;
}) {
  const t = makeT(lang);
  const [dayOffset, setDayOffset] = useState<0 | 1>(0);

  // Compute live astronomical data with coordinates and dayOffset
  const targetDate = useMemo(() => {
    const d = new Date();
    if (dayOffset === 1) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, [dayOffset]);

  const astro = useMemo(() => {
    let c = coords;
    if (!c && cityKey && CITY_COORDINATES[cityKey.toLowerCase()]) {
      c = CITY_COORDINATES[cityKey.toLowerCase()];
    }
    return getCompleteMoonData(targetDate, c);
  }, [coords, cityKey, targetDate]);

  // Live astronomical phase or graceful fallback
  const phase = astro.phase;
  const phaseName = astro.name;
  const illum = astro.illumination;

  const cityName = cityKey ? cityKey.charAt(0).toUpperCase() + cityKey.slice(1) : "";

  return (
    <div className="group relative flex h-full flex-col rounded-3xl p-4 mausam-glass transition-all duration-300 hover:border-white/18">
      {/* Top: header + large moon side-by-side */}
      <div className="flex flex-1 items-start justify-between gap-2">
        {/* Left column: label → phase name → illumination */}
        <div className="flex flex-col flex-1 gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-60">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            {t("Moon")}
          </span>
          <div>
            <h4 className="text-[17px] font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
              {t(phaseName)}
            </h4>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-soft)]">
              {illum}% {t("illuminated")}
            </p>
          </div>
        </div>

        {/* Right: 3D moon sphere */}
        <div className="relative mt-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="transition-transform duration-300 hover:scale-[1.04]">
            <RealisticMoon phase={phase} size={88} interactive={true} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-2.5 border-t border-white/8" />

      {/* Bottom: Moonrise | divider | Moonset */}
      <div className="flex items-stretch justify-center">
        <div className="flex flex-1 items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 text-[var(--color-ink-faint)]">
            <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
          </svg>
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-wider text-[var(--color-ink-faint)]">{t("Moonrise")}</p>
            <p className="text-[15px] font-semibold leading-tight text-[var(--color-ink)]">{astro.moonrise}</p>
            {cityName && <p className="text-[10px] text-[var(--color-ink-faint)]">{cityName}</p>}
          </div>
        </div>
        {/* Vertical separator */}
        <div className="mx-3 self-stretch w-px bg-white/10" />
        <div className="flex flex-1 items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 text-[var(--color-ink-faint)]">
            <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
          </svg>
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-wider text-[var(--color-ink-faint)]">{t("Moonset")}</p>
            <p className="text-[15px] font-semibold leading-tight text-[var(--color-ink)]">{astro.moonset}</p>
            {cityName && <p className="text-[10px] text-[var(--color-ink-faint)]">{cityName}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SunStat({ label, value, center, right }: { label: string; value: string; center?: boolean; right?: boolean }) {
  return (
    <div className={center ? "text-center" : right ? "text-right" : "text-left"}>
      <p className="text-[11px] text-[var(--color-ink-faint)]">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
