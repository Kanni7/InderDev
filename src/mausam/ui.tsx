import { useState } from "react";
import type { WeatherTheme, Condition } from "./theme";
import {
  type Sun, type Precip, type Pollen, type Travel,
  type Wind, type Pressure, type Moon, type TemperatureUnit, formatTemp,
  pollenColor, trafficColor, statusColor, packingTips, getLifestyleIndices, type Location,
} from "./data";
import { weatherAudio } from "./audio";
import { makeT, type Lang } from "./i18n";
import * as I from "./icons";

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
  hourlyData, unit, accent, lang,
}: {
  hourlyData: { t: string; c: Condition; temp: number }[];
  unit: TemperatureUnit;
  accent: string;
  lang: Lang;
}) {
  const t = makeT(lang);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeItem = hourlyData[selectedIndex] ?? hourlyData[0];

  return (
    <div className="rounded-3xl p-4 mausam-glass space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          📈 {t("24-Hour Forecast Timeline")}
        </p>
        <span className="text-[12px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
          {t(activeItem.t)}: {formatTemp(activeItem.temp, unit)}
        </span>
      </div>

      <div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2">
        {hourlyData.map((h, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`flex min-w-[68px] shrink-0 flex-col items-center gap-2 rounded-2xl border py-3.5 px-2 transition active:scale-95 ${
                active ? "border-white/30 bg-white/15 shadow-xl scale-[1.03]" : "border-white/5 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="text-[11px] font-medium text-[var(--color-ink-faint)]">{t(h.t)}</span>
              <I.Sun className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-bold text-white">{formatTemp(h.temp, unit)}</span>
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

/** Sun path arc — sunrise / daylight / sunset with a live sun dot (per attached ref) */
export function SunArc({ sun, accent, lang }: { sun: Sun; accent: string; lang: Lang }) {
  const t = makeT(lang);
  // Arc geometry across a 220-wide, 90-tall box
  const W = 220, H = 96, pad = 14;
  const cx = W / 2;
  const startX = pad, endX = W - pad;
  const baseY = H - 22, peakY = 16;
  // point on a quadratic-ish arc for progress p (0..1)
  const at = (p: number) => {
    const x = startX + (endX - startX) * p;
    // parabola peaking at center
    const y = baseY - (baseY - peakY) * (1 - Math.pow(2 * p - 1, 2));
    return { x, y };
  };
  const pts = Array.from({ length: 41 }, (_, i) => at(i / 40));
  const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const elapsed = pts.filter((_, i) => i / 40 <= sun.progress);
  const elPath = elapsed.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const dot = at(Math.min(Math.max(sun.progress, 0), 1));

  return (
    <div className="rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Sun")}</p>
      <div className="mt-1 flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 260 }}>
          <line x1={startX} y1={baseY} x2={endX} y2={baseY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <path d={path} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" />
          <path d={elPath} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx={dot.x} cy={dot.y} r="6.5" fill={accent} />
          <circle cx={dot.x} cy={dot.y} r="11" fill={accent} opacity="0.22" />
        </svg>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <SunStat label={t("Sunrise")} value={sun.sunrise} />
        <SunStat label={t("Daylight")} value={sun.daylight} center />
        <SunStat label={t("Sunset")} value={sun.sunset} right />
      </div>
    </div>
  );
}

/** Precipitation widget — next rain, chance, and next-hours probability bars */
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

/** Rain radar — geographic India map with real city positions and wind-driven precipitation cells */
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

          {/* Water — subtle teal for seas */}
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

          {/* Radar sweep — rotates around the city pin */}
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

/** Pollen count — shown for every profile */
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

/** Travel & commute — flights, traffic, visibility */
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

/** Packing tip — derived from the current sky */
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

/** Wind — direction compass + speed and gust */
export function WindCard({ wind, accent, lang }: { wind?: Wind; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const w = wind ?? { speed: 0, dir: "N", gust: 0 };
  const angles: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  const deg = angles[w.dir] ?? 0;
  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Wind")}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
          <svg viewBox="0 0 76 76" className="h-full w-full">
            <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
            {["N", "E", "S", "W"].map((d, i) => (
              <text key={d} x="38" y={i === 0 ? 12 : i === 2 ? 68 : 41} dx={i === 1 ? 30 : i === 3 ? -30 : 0}
                textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.42)">{d}</text>
            ))}
            <g transform={`rotate(${deg} 38 38)`}>
              <path d="M38 14 L44 42 L38 37 L32 42 Z" fill={accent} />
            </g>
          </svg>
        </div>
        <div>
          <p className="text-[26px] font-semibold leading-none text-[var(--color-ink)]">{w.speed} <span className="text-[13px] font-normal text-[var(--color-ink-soft)]">km/h</span></p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">{t("From")} {w.dir} · {t("gusts")} {w.gust} km/h</p>
        </div>
      </div>
    </div>
  );
}

/** Humidity — ring gauge */
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

/** Dew point — comfort read */
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
      <div className="mt-3 h-2 w-full rounded-full" style={{ background: "linear-gradient(90deg,#7bc4f2,#7bd88f,#f0873a,#e5484d)" }}>
        <div className="relative h-full">
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b111c] bg-white" style={{ left: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

/** Pressure — barometer with trend (localized) */
export function PressureCard({ pressure: pressureIn, accent, lang }: { pressure?: Pressure; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const pressure = pressureIn ?? { value: 1013, trend: "Steady" };
  const min = 980, max = 1040;
  const angle = -120 + ((pressure.value - min) / (max - min)) * 240;
  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pressure")}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
          <svg viewBox="0 0 76 76" className="h-full w-full">
            <path d="M14 58 A32 32 0 1 1 62 58" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" strokeLinecap="round" />
            <g transform={`rotate(${angle} 38 40)`}>
              <line x1="38" y1="40" x2="38" y2="16" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
            </g>
            <circle cx="38" cy="40" r="3.4" fill={accent} />
          </svg>
        </div>
        <div>
          <p className="text-[22px] font-semibold leading-none text-[var(--color-ink)]">{pressure.value} <span className="text-[12px] font-normal text-[var(--color-ink-soft)]">hPa</span></p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">{t(pressure.trend)}</p>
        </div>
      </div>
    </div>
  );
}

/** Helper to calculate accurate 3D lunar terminator shadow path for any phase (0..1) */
function getPhaseShadowPath(p: number, R = 36): string {
  if (p <= 0.02 || p >= 0.98) {
    return `M 0,${R} A ${R},${R} 0 1,0 ${R * 2},${R} A ${R},${R} 0 1,0 0,${R} Z`;
  }
  if (p >= 0.48 && p <= 0.52) {
    return "";
  }

  const termX = -Math.cos(p * 2 * Math.PI) * R;
  const rx = Math.abs(termX).toFixed(2);

  if (p < 0.5) {
    // Waxing: right side illuminated, shadow on left
    const sweepInner = termX > 0 ? 1 : 0;
    return `M ${R},0 A ${R},${R} 0 0,0 ${R},${2 * R} A ${rx},${R} 0 0,${sweepInner} ${R},0 Z`;
  } else {
    // Waning: left side illuminated, shadow on right
    const sweepInner = termX < 0 ? 1 : 0;
    return `M ${R},0 A ${R},${R} 0 0,1 ${R},${2 * R} A ${rx},${R} 0 0,${sweepInner} ${R},0 Z`;
  }
}

/** Moon phase — real high-resolution photograph of the moon with realistic phase shadow */
export function MoonCard({ moon: moonIn, lang }: { moon?: Moon; lang: Lang }) {
  const t = makeT(lang);
  const moon = moonIn ?? { phase: 0.75, name: "Last Quarter", illum: 48 };
  const shadowPath = getPhaseShadowPath(moon.phase, 36);

  return (
    <div className="flex h-full flex-col rounded-3xl p-4 mausam-glass">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Moon phase")}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full shadow-md bg-black">
          {/* Real photo of the moon scaled edge-to-edge */}
          <img
            src="/moon.png"
            alt="Moon Phase"
            className="h-[120%] w-[120%] max-w-none -translate-x-[8.3%] -translate-y-[8.3%] object-cover rounded-full"
          />

          {/* Soft translucent phase shadow overlay (Apple Weather style) */}
          {shadowPath && (
            <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full pointer-events-none">
              <defs>
                <linearGradient id="lunarShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(10, 16, 28, 0.65)" />
                  <stop offset="100%" stopColor="rgba(6, 10, 18, 0.75)" />
                </linearGradient>
              </defs>
              <path d={shadowPath} fill="url(#lunarShadow)" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-[16px] font-semibold text-[var(--color-ink)]">{t(moon.name)}</p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">{moon.illum}% {t("illuminated")}</p>
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
