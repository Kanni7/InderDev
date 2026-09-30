import { useState, useMemo } from "react";
import {
  vocations, tierMeta, locations,
  aqiColor, uvColor, chatChips, formatTemp, getDynamicInsight, type TemperatureUnit,
  type UserTypeKey, type Location, type Block,
  type HourlyPoint, type DailyPoint,
} from "./data";
import { getWeatherTheme, type Condition } from "./theme";
import { PhotoHero, SunArc, PrecipCard, PollenCard, TravelCard, PackingCard, WindCard, HumidityCard, DewPointCard, PressureCard, MoonCard, HourlyInteractiveGraph } from "./ui";
import { RainMapWidget } from "./RainRadar";
import FullScreenWindRadar from "./WindRadar";
import { WidgetDetailModal, type DetailType } from "./screens";
import { makeT, type Lang } from "./i18n";
import * as I from "./icons";
import { useProfile } from "../engine/profile";
import { rankModules, type AlertOverride } from "../engine/ranking";

/** Minimal static fallbacks used only if live data hasn't loaded yet. */
const STATIC_HOURLY: HourlyPoint[] = [
  { t: "Now", c: "sunny", temp: 29 }, { t: "10 AM", c: "sunny", temp: 31 },
  { t: "11 AM", c: "cloudy", temp: 32 }, { t: "12 PM", c: "cloudy", temp: 33 },
  { t: "1 PM", c: "sunny", temp: 34 }, { t: "2 PM", c: "cloudy", temp: 33 },
  { t: "3 PM", c: "rainy", temp: 30 }, { t: "4 PM", c: "rainy", temp: 28 },
];
const STATIC_WEEKLY: DailyPoint[] = [
  { day: "Today", c: "sunny", hi: 34, lo: 24, rain: 10 },
  { day: "Mon", c: "cloudy", hi: 33, lo: 24, rain: 30 },
  { day: "Tue", c: "rainy", hi: 30, lo: 23, rain: 70 },
  { day: "Wed", c: "storm", hi: 28, lo: 22, rain: 85 },
  { day: "Thu", c: "rainy", hi: 29, lo: 22, rain: 60 },
  { day: "Fri", c: "cloudy", hi: 31, lo: 23, rain: 25 },
  { day: "Sat", c: "sunny", hi: 33, lo: 24, rain: 15 },
];

/** Blocks that render as small gauges — these pair up two-across in the grid,
 * everything else spans the full width. */
const COMPACT = new Set<Block>(["wind", "humidity", "pressure", "moon", "dewpoint", "pollen"]);

/** Group the ordered blocks into rows: consecutive compact gauges are paired
 * two-across; wide panels (and any leftover odd gauge) each take their own row. */
function layoutRows(order: Block[]): Block[][] {
  const rows: Block[][] = [];
  let i = 0;
  while (i < order.length) {
    if (COMPACT.has(order[i]) && i + 1 < order.length && COMPACT.has(order[i + 1])) {
      rows.push([order[i], order[i + 1]]);
      i += 2;
    } else {
      rows.push([order[i]]);
      i += 1;
    }
  }
  return rows;
}

function CondIcon({ c, className, style }: { c: Condition; className?: string; style?: React.CSSProperties }) {
  const Ico = I.conditionIcon(c);
  return <Ico className={className} style={style} />;
}

export default function Home({
  userType, location, accent, lang, currentHour, onMenu, onChat, onAskWhy, onAlerts, onSelectLocation,
  alertOverrides = [],
}: {
  userType: UserTypeKey;
  location: Location;
  accent: string;
  lang: Lang;
  currentHour?: number;
  onMenu?: () => void;
  onChat?: () => void;
  onAskWhy?: (question: string) => void;
  onAlerts?: () => void;
  onSelectLocation?: (key: string) => void;
  alertOverrides?: AlertOverride[];
}) {
  const voc = vocations[userType];
  const theme = getWeatherTheme(location.condition, currentHour);
  const { profile, updateProfile } = useProfile();

  // Use ranking engine to determine module order
  const rankedOrder = useMemo(
    () => rankModules(profile.interestWeights, location, alertOverrides),
    [profile.interestWeights, location, alertOverrides],
  );

  const t = makeT(lang);
  const insight = useMemo(
    () => getDynamicInsight(userType, location, currentHour, alertOverrides, profile.activitySignals, profile.moduleInteractions, profile.locationContext),
    [userType, location, currentHour, alertOverrides, profile.activitySignals, profile.moduleInteractions, profile.locationContext],
  );
  const [unit, setUnit] = useState<TemperatureUnit>("C");
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [showLocations, setShowLocations] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [radarLayer, setRadarLayer] = useState<"rain" | "wind" | "temp" | "satellite">("wind");
  const [activeDetail, setActiveDetail] = useState<DetailType | null>(null);

  const filteredLocations = locations.filter((l) =>
    l.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
    l.region.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  // Track module taps in the local profile
  const trackTap = (moduleId: string) => {
    updateProfile((p) => {
      const prev = p.moduleInteractions[moduleId] ?? { taps: 0, scrollPasts: 0 };
      return {
        ...p,
        moduleInteractions: {
          ...p.moduleInteractions,
          [moduleId]: { ...prev, taps: prev.taps + 1 },
        },
      };
    });
  };

  // ── the reorderable widget blocks (all present, order varies per vocation) ──
  const blocks: Record<Block, React.ReactNode> = {
    pollen: (
      <div key="pollen" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("pollen"); setActiveDetail("pollen"); }}>
        <PollenCard pollen={location.pollen} lang={lang} />
      </div>
    ),
    rainmap: (
      <div key="rainmap">
        <RainMapWidget
          condition={location.condition}
          chance={location.precip.chance}
          accent={accent}
          city={location.city}
          lang={lang}
          locationKey={location.key}
          wind={location.wind}
          temp={location.temp}
          onExpand={() => {
            setRadarLayer("rain");
            setShowRadar(true);
          }}
        />
      </div>
    ),
    travel: (
      <div key="travel" className="cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("travel"); setActiveDetail("travel"); }}>
        <TravelCard travel={location.travel} accent={accent} lang={lang} />
      </div>
    ),
    packing: (
      <div key="packing" className="cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("packing"); setActiveDetail("packing"); }}>
        <PackingCard condition={location.condition} accent={accent} lang={lang} />
      </div>
    ),
    wind: (
      <div
        key="wind"
        className="h-full cursor-pointer transition active:scale-[0.98]"
        onClick={() => {
          trackTap("wind");
          setRadarLayer("wind");
          setShowRadar(true);
        }}
      >
        <WindCard wind={location.wind} accent={accent} lang={lang} />
      </div>
    ),
    humidity: (
      <div key="humidity" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("humidity"); setActiveDetail("humidity"); }}>
        <HumidityCard humidity={location.humidity} dewPoint={location.dewPoint} accent={accent} lang={lang} />
      </div>
    ),
    dewpoint: (
      <div key="dewpoint" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("dewpoint"); setActiveDetail("dewpoint"); }}>
        <DewPointCard dewPoint={location.dewPoint} lang={lang} />
      </div>
    ),
    pressure: (
      <div key="pressure" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("pressure"); setActiveDetail("pressure"); }}>
        <PressureCard pressure={location.pressure} accent={accent} lang={lang} />
      </div>
    ),
    moon: (
      <div key="moon" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("moon"); setActiveDetail("moon"); }}>
        <MoonCard moon={location.moon} cityKey={location.key} lang={lang} />
      </div>
    ),
    air: (
      <div key="air" className="grid grid-cols-3 gap-3 cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("air"); setActiveDetail("air"); }}>
        <AirTile label="AQI" value={String(location.air.aqi)} sub={t(location.air.aqiLabel)} color={aqiColor(location.air.aqi)} ring={location.air.aqi} max={200} />
        <AirTile label="UV" value={String(location.air.uv)} sub={t(location.air.uvLabel)} color={uvColor(location.air.uv)} ring={location.air.uv} max={11} />
        <AirTile label={t("Heat idx")} value={formatTemp(location.air.heat, unit)} sub={t(location.air.heatLabel)} color={accent} ring={location.air.heat} max={45} />
      </div>
    ),
    precip: (
      <div key="precip" className="cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("precip"); setActiveDetail("precip"); }}>
        <PrecipCard precip={location.precip} accent={accent} lang={lang} />
      </div>
    ),
    sun: (
      <div key="sun" className="cursor-pointer transition active:scale-[0.98]" onClick={() => { trackTap("sun"); setActiveDetail("sun"); }}>
        <SunArc sun={location.sun} accent={accent} lang={lang} currentHour={currentHour} />
      </div>
    ),
    metrics: (
      <div key="metrics">
        <BlockTitle>{t(voc.metricsLabel)}</BlockTitle>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${voc.metrics.length}, minmax(0, 1fr))` }}>
          {voc.metrics.map((m) => (
            <div key={m.label} className="overflow-hidden rounded-2xl border border-white/8 p-3 mausam-glass">
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">{t(m.label)}</p>
              <p className="mt-1.5 text-xl font-semibold text-[var(--color-ink)]">{t(m.value)}</p>
              <p className="truncate text-[10px] text-[var(--color-ink-soft)]">{t(m.sub)}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    hourly: (
      <div key="hourly">
        <HourlyInteractiveGraph hourlyData={location.hourlyForecast ?? STATIC_HOURLY} unit={unit} accent={accent} lang={lang} />
      </div>
    ),
    weekly: (
      <div key="weekly">
        <BlockTitle>{t("7-day forecast")}</BlockTitle>
        <div className="overflow-hidden rounded-2xl border border-white/8 mausam-glass">
          {(location.weeklyForecast ?? STATIC_WEEKLY).map((d, i, arr) => (
            <div key={d.day} className={`flex items-center gap-3 px-4 py-3 ${i !== arr.length - 1 ? "border-b border-[var(--color-line)]" : ""}`}>
              <span className="w-12 text-[13px] font-medium text-[var(--color-ink)]">{t(d.day)}</span>
              <CondIcon c={d.c} className="h-5 w-5 text-[var(--color-ink-soft)]" />
              <span className="w-10 text-[11px] text-[var(--color-tier-info)]">{d.rain}%</span>
              <div className="flex flex-1 items-center gap-2">
                <span className="text-[12px] text-[var(--color-ink-faint)]">{formatTemp(d.lo, unit)}</span>
                <div className="h-1 flex-1 rounded-full bg-white/12">
                  <div className="h-full rounded-full" style={{ marginLeft: `${(d.lo - 20) * 6}%`, width: `${(d.hi - d.lo) * 7}%`, background: `linear-gradient(90deg, ${accent}, #ffffff)` }} />
                </div>
                <span className="text-[12px] font-semibold text-[var(--color-ink)]">{formatTemp(d.hi, unit)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className="relative z-10 h-full">
      {/* Full-screen weather & radar overlay with real GIS basemaps and live data */}
      {showRadar && (
        <FullScreenWindRadar
          location={location}
          accent={accent}
          lang={lang}
          initialLayer={radarLayer}
          onClose={() => setShowRadar(false)}
          onSwitchLayer={(layer) => {
            setRadarLayer(layer);
          }}
        />
      )}
      {/* Location dropdown — rendered outside the scroll container so overflow-y-auto never clips it */}
      {showLocations && (
        <>
          <button className="absolute inset-0 z-20 cursor-default" aria-label="Close" onClick={() => setShowLocations(false)} />
          <div className="animate-insight absolute left-1/2 top-[56px] z-30 w-[280px] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/15 bg-[color:rgba(12,18,28,0.94)] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            <p className="px-4 pb-2 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{t("Locations")}</p>
            {locations.map((loc, i) => {
              const active = loc.key === location.key;
              return (
                <button
                  key={loc.key}
                  onClick={() => { onSelectLocation?.(loc.key); setShowLocations(false); }}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/6 ${i !== locations.length - 1 ? "border-b border-white/8" : ""}`}
                  style={{ background: active ? "rgba(255,255,255,0.08)" : undefined }}
                >
                  <span className={`text-[15px] ${active ? "font-semibold text-white" : "font-medium text-white/85"}`}>{loc.city}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[14px] font-semibold text-white">{loc.temp}°</span>
                    <CondIcon c={loc.condition} className="h-4 w-4 text-white/70" />
                    {active && <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div
        className="scroll-hide h-full overflow-y-auto pb-20"
        style={{ visibility: activeDetail ? "hidden" : "visible" }}
      >
        {/* ── Hero with real photo ── */}
        <div className="relative">
          <PhotoHero theme={theme} />
          <div className="relative z-10 px-5 pb-4 pt-12 text-white">
            {/* top bar */}
            <div className="relative flex items-center justify-between min-h-[40px]">
              <button onClick={onMenu} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition active:scale-95">
                <I.Menu className="h-5 w-5" />
              </button>

              {/* CENTER PILL: Location Selector + °C/°F Unit Switcher */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-md shadow-lg border border-white/10 whitespace-nowrap">
                <button
                  onClick={() => setShowLocations((s) => !s)}
                  aria-label="Change location"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 hover:bg-white/10"
                >
                  <I.Pin className="h-4 w-4" />
                  <span>{location.city}</span>
                  <I.Chevron className={`h-3.5 w-3.5 opacity-70 transition-transform ${showLocations ? "-rotate-90" : "rotate-90"}`} />
                </button>

                <div className="h-4 w-[1px] bg-white/20" />

                {/* °C / °F Unit Switcher */}
                <button
                  onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
                  className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs transition active:scale-95 hover:bg-white/25"
                  title="Toggle °C / °F"
                >
                  <span className={unit === "C" ? "text-white font-extrabold" : "text-white/40 font-normal"}>°C</span>
                  <span className="text-white/30 text-[10px]">/</span>
                  <span className={unit === "F" ? "text-white font-extrabold" : "text-white/40 font-normal"}>°F</span>
                </button>
              </div>

              <button onClick={onAlerts} aria-label="Alerts" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md active:scale-95">
                <I.Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--color-tier-warning)" }} />
              </button>
            </div>

            {/* temp + condition */}
            <div className="mt-14 flex items-start justify-between">
              <div>
                <div className="flex items-start">
                  <span className="text-[84px] font-semibold leading-[0.82] tracking-tighter">{formatTemp(location.temp, unit).replace("°", "")}</span>
                  <span className="mt-2 text-3xl font-light">°{unit}</span>
                </div>
                <p className="mt-1 text-[15px] font-medium capitalize text-white/80">
                  {t(theme.label)} · {t("feels")} {formatTemp(location.feels, unit)} · {location.region}
                </p>
              </div>
              <CondIcon c={theme.key} className="h-24 w-24 opacity-95 drop-shadow-xl" style={{ color: accent }} />
            </div>

            {/* AI one-line summary */}
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-[13.5px] font-medium backdrop-blur-md border border-white/15 text-white/95 shadow-sm">
              <span>{t(location.summary)}</span>
            </div>

            {/* Alert banner — rendered when location has an alert OR demo panel triggered one */}
            {(location.alert || (alertOverrides && alertOverrides.length > 0)) && (() => {
              const demoAlert = alertOverrides && alertOverrides.length > 0
                ? {
                    tier: (alertOverrides[0].tier === "critical" ? "critical" : "warning") as "critical" | "warning",
                    title: alertOverrides[0].tier === "critical"
                      ? "Red Alert: Severe weather"
                      : "Orange Alert: Heavy rainfall",
                    body: alertOverrides[0].tier === "critical"
                      ? "Stay indoors. Dangerous conditions reported."
                      : "Heavy rain expected. Low-lying areas at flood risk.",
                  }
                : null;
              const al = location.alert ?? demoAlert!;
              const meta = tierMeta[al.tier];
              return (
                <button
                  onClick={onAlerts}
                  className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl p-4 text-left mausam-glass transition active:scale-[0.98]"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-black"
                    style={{ background: meta.color }}
                  >
                    <I.Bell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-[var(--color-ink)]">
                      {t(al.title)}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-soft)]">
                      {t(al.body)}
                    </span>
                  </span>
                  <I.Chevron className="h-4 w-4 shrink-0 text-[var(--color-ink-faint)]" />
                </button>
              );
            })()}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="relative z-10 space-y-3 px-5 pb-5">
          {/* For You — neutral sleek frosted glass */}
          <section
            key={userType + location.key}
            className="animate-insight rounded-3xl border border-white/10 p-5 mausam-glass-strong"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                {t("For you")} · {location.city}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/90 backdrop-blur-md">
                <CondIcon c={theme.key} className="h-3.5 w-3.5" /> {t(theme.label)}
              </span>
            </div>
            <h2 className="mt-3 text-[22px] font-semibold leading-tight text-[var(--color-ink)]">{t(insight.headline)}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">{t(insight.detail)}</p>
            <div className="mt-4 flex items-center gap-2">
              {insight.window && (
                <span className="rounded-xl bg-[#6ea8d8] px-4 py-2 text-sm font-semibold text-[#06111f] shadow-sm">{insight.window}</span>
              )}
              <button
                onClick={() => onAskWhy ? onAskWhy(insight.headline) : onChat?.()}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition active:scale-95 hover:bg-white/20"
              >
                {t("Ask why")}
              </button>
            </div>
          </section>

          {/* Ranked blocks (non-pinned) — order determined by weight engine + live relevance.
              Compact gauges pair 2-up; wide panels span full width.
              CSS transitions animate position changes, respecting prefers-reduced-motion. */}
          {layoutRows(rankedOrder).map((row, idx) =>
            row.length === 2 ? (
              <div
                key={row[0] + "-" + row[1]}
                className="grid grid-cols-2 items-stretch gap-3 transition-all duration-500 motion-reduce:transition-none"
                style={{ order: idx }}
              >
                {blocks[row[0]]}
                {blocks[row[1]]}
              </div>
            ) : (
              <div
                key={row[0]}
                className="transition-all duration-500 motion-reduce:transition-none"
                style={{ order: idx }}
              >
                {blocks[row[0]]}
              </div>
            )
          )}
          {/* Footer note */}
          <p className="mt-4 text-center text-[9px] font-mono text-white/30 leading-relaxed">
            {t("Prototype uses Open-Meteo in place of IMD/CPCB feeds.")}
          </p>
        </div>
      </div>

      {/* ── Widget Detail Modal Overlay ── */}
      {activeDetail && (
        <WidgetDetailModal
          type={activeDetail}
          location={location}
          accent={accent}
          lang={lang}
          currentHour={currentHour}
          onClose={() => setActiveDetail(null)}
          onOpenRadar={(layer = "rain") => {
            setActiveDetail(null);
            setRadarLayer(layer);
            setShowRadar(true);
          }}
        />
      )}

      {/* ── Floating Mausam AI — icon at right, expands on hover ── */}
      {!activeDetail && (
        <FloatingAI onChat={onChat} accent={accent} lang={lang} />
      )}
    </div>
  );
}

function FloatingAI({ onChat, accent, lang }: { onChat?: () => void; accent: string; lang: Lang }) {
  const t = makeT(lang);
  return (
    <div className="group absolute bottom-6 right-5 z-30 flex flex-col items-end gap-2">
      {/* suggested chips appear on hover/focus */}
      <div className="pointer-events-none flex max-w-0 flex-col items-end gap-2 overflow-hidden opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:max-w-[240px] group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:max-w-[240px] group-focus-within:opacity-100">
        {chatChips.slice(0, 3).map((c) => (
          <button key={c} onClick={onChat} className="whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[color:rgba(10,16,26,0.85)] px-3.5 py-2 text-[12px] font-medium text-white backdrop-blur-md active:scale-95">
            {t(c)}
          </button>
        ))}
      </div>
      <button
        onClick={onChat}
        aria-label={t("Ask Mausam AI")}
        className="flex items-center gap-0 rounded-full py-3.5 pl-3.5 pr-3.5 text-black shadow-[0_16px_30px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 active:scale-95 group-hover:pl-4 group-hover:pr-5"
        style={{ background: accent }}
      >
        <I.Send className="h-5 w-5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold transition-all duration-300 group-hover:ml-2 group-hover:max-w-[160px]">
          {t("Ask Mausam AI")}
        </span>
      </button>
    </div>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{children}</h3>;
}

function AirTile({ label, value, sub, color, ring, max }: { label: string; value: string; sub: string; color: string; ring: number; max: number }) {
  const pct = Math.min(ring / max, 1);
  const R = 15, C = 2 * Math.PI * R;
  return (
    <div className="rounded-2xl border border-white/8 p-3.5 mausam-glass">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">{label}</span>
        <svg width="20" height="20" viewBox="0 0 36 36" className="-rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
      </div>
      <p className="mt-1.5 text-[22px] font-semibold leading-none" style={{ color }}>{value}</p>
      <p className="mt-1.5 text-[10.5px] leading-tight text-[var(--color-ink-soft)]">{sub}</p>
    </div>
  );
}
