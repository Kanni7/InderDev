import { useState } from "react";
import {
  vocations, weekly, hourly, tierMeta, locations,
  aqiColor, uvColor, chatChips, formatTemp, type TemperatureUnit,
  type UserTypeKey, type Location, type Block,
} from "./data";
import { getWeatherTheme, type Condition } from "./theme";
import { PhotoHero, SunArc, PrecipCard, PollenCard, TravelCard, PackingCard, WindCard, HumidityCard, DewPointCard, PressureCard, MoonCard, HourlyInteractiveGraph } from "./ui";
import { RainMapWidget, FullScreenRadar } from "./RainRadar";
import { WidgetDetailModal, type DetailType } from "./screens";
import { makeT, type Lang } from "./i18n";
import * as I from "./icons";

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
  userType, location, accent, lang, currentHour, onMenu, onChat, onAlerts, onSelectLocation,
}: {
  userType: UserTypeKey;
  location: Location;
  accent: string;
  lang: Lang;
  currentHour?: number;
  onMenu?: () => void;
  onChat?: () => void;
  onAlerts?: () => void;
  onSelectLocation?: (key: string) => void;
}) {
  const voc = vocations[userType];
  const theme = getWeatherTheme(location.condition, currentHour);
  const t = makeT(lang);
  const [unit, setUnit] = useState<TemperatureUnit>("C");
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [showLocations, setShowLocations] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [activeDetail, setActiveDetail] = useState<DetailType | null>(null);

  const filteredLocations = locations.filter((l) =>
    l.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
    l.region.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  // ── the reorderable widget blocks (all present, order varies per vocation) ──
  const blocks: Record<Block, React.ReactNode> = {
    pollen: (
      <div key="pollen" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("pollen")}>
        <PollenCard pollen={location.pollen} lang={lang} />
      </div>
    ),
    rainmap: (
      <div key="rainmap">
        <RainMapWidget condition={location.condition} chance={location.precip.chance} accent={accent} city={location.city} lang={lang} locationKey={location.key} wind={location.wind} temp={location.temp} onExpand={() => setShowRadar(true)} />
      </div>
    ),
    travel: (
      <div key="travel" className="cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("travel")}>
        <TravelCard travel={location.travel} accent={accent} lang={lang} />
      </div>
    ),
    packing: (
      <div key="packing" className="cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("packing")}>
        <PackingCard condition={location.condition} accent={accent} lang={lang} />
      </div>
    ),
    wind: (
      <div key="wind" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("wind")}>
        <WindCard wind={location.wind} accent={accent} lang={lang} />
      </div>
    ),
    humidity: (
      <div key="humidity" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("humidity")}>
        <HumidityCard humidity={location.humidity} dewPoint={location.dewPoint} accent={accent} lang={lang} />
      </div>
    ),
    dewpoint: (
      <div key="dewpoint" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("dewpoint")}>
        <DewPointCard dewPoint={location.dewPoint} lang={lang} />
      </div>
    ),
    pressure: (
      <div key="pressure" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("pressure")}>
        <PressureCard pressure={location.pressure} accent={accent} lang={lang} />
      </div>
    ),
    moon: (
      <div key="moon" className="h-full cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("moon")}>
        <MoonCard moon={location.moon} lang={lang} />
      </div>
    ),
    air: (
      <div key="air" className="grid grid-cols-3 gap-3 cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("air")}>
        <AirTile label="AQI" value={String(location.air.aqi)} sub={location.air.aqiLabel} color={aqiColor(location.air.aqi)} ring={location.air.aqi} max={200} />
        <AirTile label="UV" value={String(location.air.uv)} sub={location.air.uvLabel} color={uvColor(location.air.uv)} ring={location.air.uv} max={11} />
        <AirTile label={t("Heat idx", "ताप")} value={formatTemp(location.air.heat, unit)} sub={location.air.heatLabel} color={accent} ring={location.air.heat} max={45} />
      </div>
    ),
    precip: (
      <div key="precip" className="cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("precip")}>
        <PrecipCard precip={location.precip} accent={accent} lang={lang} />
      </div>
    ),
    sun: (
      <div key="sun" className="cursor-pointer transition active:scale-[0.98]" onClick={() => setActiveDetail("sun")}>
        <SunArc sun={location.sun} accent={accent} lang={lang} />
      </div>
    ),
    metrics: (
      <div key="metrics">
        <BlockTitle>{t(voc.metricsLabel, voc.metricsLabel)}</BlockTitle>
        <div className="scroll-hide -mx-5 flex gap-3 overflow-x-auto px-5">
          {voc.metrics.map((m) => (
            <div key={m.label} className="min-w-[112px] shrink-0 rounded-2xl border border-[var(--color-line)] bg-[var(--color-glass)] p-3.5 mausam-glass">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">{m.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{m.value}</p>
              <p className="text-[11px] text-[var(--color-ink-soft)]">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    hourly: (
      <div key="hourly">
        <HourlyInteractiveGraph hourlyData={hourly} unit={unit} accent={accent} lang={lang} />
      </div>
    ),
    weekly: (
      <div key="weekly">
        <BlockTitle>{t("7-day forecast", "7-दिन का पूर्वानुमान")}</BlockTitle>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-glass)] mausam-glass">
          {weekly.map((d, i) => (
            <div key={d.day} className={`flex items-center gap-3 px-4 py-3 ${i !== weekly.length - 1 ? "border-b border-[var(--color-line)]" : ""}`}>
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
      {/* Full-screen radar overlay */}
      {showRadar && (
        <FullScreenRadar
          condition={location.condition}
          chance={location.precip.chance}
          accent={accent}
          city={location.city}
          lang={lang}
          locationKey={location.key}
          wind={location.wind}
          temp={location.temp}
          onClose={() => setShowRadar(false)}
        />
      )}
      {/* Location dropdown — rendered outside the scroll container so overflow-y-auto never clips it */}
      {showLocations && (
        <>
          <button className="absolute inset-0 z-20 cursor-default" aria-label="Close" onClick={() => setShowLocations(false)} />
          <div className="animate-insight absolute left-1/2 top-[56px] z-30 w-[280px] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/15 bg-[color:rgba(12,18,28,0.94)] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            <p className="px-4 pb-2 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{t("Locations", "स्थान")}</p>
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

      <div className="scroll-hide h-full overflow-y-auto pb-20">
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
                  {theme.label} · {t("feels", "महसूस")} {formatTemp(location.feels, unit)} · {location.region}
                </p>
              </div>
              <CondIcon c={theme.key} className="h-24 w-24 opacity-95 drop-shadow-xl" style={{ color: accent }} />
            </div>

            {/* AI one-line summary */}
            <div className="mt-4 rounded-2xl bg-black/8 px-3.5 py-3 text-[13px] font-medium backdrop-blur-sm border border-white/6">
              <span>{location.summary}</span>
            </div>

            {/* Alert banner — only rendered when this location has an active alert */}
            {location.alert && (() => {
              const al = location.alert!;
              const meta = tierMeta[al.tier];
              return (
                <button
                  onClick={onAlerts}
                  className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-[var(--color-glass)] p-4 text-left mausam-glass transition active:scale-[0.98]"
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
                      {al.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-soft)]">
                      {al.body}
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
            className="animate-insight rounded-3xl border border-[var(--color-line)] bg-[var(--color-glass-strong)] p-5 mausam-glass-strong"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                {t("For you", "आपके लिए")} · {location.city}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/80">
                <CondIcon c={theme.key} className="h-3.5 w-3.5" /> {theme.label}
              </span>
            </div>
            <h2 className="mt-3 text-[22px] font-semibold leading-tight text-[var(--color-ink)]">{voc.insight.headline}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">{voc.insight.detail}</p>
            <div className="mt-4 flex items-center gap-2">
              {voc.insight.window && (
                <span className="rounded-xl bg-[#7cb9e8] px-3.5 py-2 text-sm font-semibold text-[#0b1320]">{voc.insight.window}</span>
              )}
              <button onClick={onChat} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition active:scale-95 hover:bg-white/10">
                {t("Ask why", "क्यों पूछें")}
              </button>
            </div>
          </section>

          {/* Reordered blocks per vocation — runs of compact gauges pair into a
              2-up grid, rich panels span full width, so the scroll gets rhythm
              instead of one endless identical column */}
          {layoutRows(voc.order).map((row) =>
            row.length === 2 ? (
              <div key={row[0]} className="grid grid-cols-2 items-stretch gap-3">
                {blocks[row[0]]}
                {blocks[row[1]]}
              </div>
            ) : (
              blocks[row[0]]
            )
          )}
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
          onOpenRadar={() => {
            setActiveDetail(null);
            setShowRadar(true);
          }}
        />
      )}

      {/* ── Floating Mausam AI — icon at right, expands on hover ── */}
      <FloatingAI onChat={onChat} accent={accent} lang={lang} />
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
            {c}
          </button>
        ))}
      </div>
      <button
        onClick={onChat}
        aria-label={t("Ask Mausam AI", "मौसम AI से पूछें")}
        className="flex items-center gap-0 rounded-full py-3.5 pl-3.5 pr-3.5 text-black shadow-[0_16px_30px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 active:scale-95 group-hover:pl-4 group-hover:pr-5"
        style={{ background: accent }}
      >
        <I.Send className="h-5 w-5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold transition-all duration-300 group-hover:ml-2 group-hover:max-w-[160px]">
          {t("Ask Mausam AI", "मौसम AI")}
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
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-glass)] p-3 mausam-glass">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">{label}</span>
        <svg width="20" height="20" viewBox="0 0 36 36" className="-rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
      </div>
      <p className="mt-1 text-[22px] font-semibold leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[10.5px] leading-tight text-[var(--color-ink-soft)]">{sub}</p>
    </div>
  );
}
