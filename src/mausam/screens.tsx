import { useState, type SVGProps, type ReactElement, type CSSProperties } from "react";
import { userTypes, chatChips, alertsForLocation, tierMeta, packingTips, type UserTypeKey, type Location } from "./data";
import { getWeatherTheme } from "./theme";
import { makeT, langNames, type Lang } from "./i18n";
import * as I from "./icons";

const PANEL = "#090d16";

/* Weather-adaptive page ground — radial translucent depth matching Home backdrop */
function pageGround(accent: string): CSSProperties {
  return {
    background: `radial-gradient(130% 75% at 50% 0%, color-mix(in srgb, var(--wx-bg-solid, ${PANEL}) 65%, ${accent}) 0%, var(--wx-bg-solid, ${PANEL}) 60%, rgba(5,7,12,0.92) 100%)`,
  };
}

/* ───────────── 1. Onboarding — User Type selection ───────────── */
export function Onboarding({
  value, onChange, onContinue, lang, onBack, accent,
}: {
  value: UserTypeKey | null;
  onChange: (k: UserTypeKey) => void;
  onContinue: () => void;
  lang: Lang;
  onBack?: () => void;
  accent: string;
}) {
  const t = makeT(lang);
  return (
    <div className="relative flex h-full flex-col text-[var(--color-ink)] overflow-hidden" style={pageGround(accent)}>
      <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl opacity-30" style={{ background: accent }} />

      <div className="scroll-hide flex-1 overflow-y-auto px-6 pb-32 pt-14 relative z-10">
        {onBack && (
          <button onClick={onBack} aria-label="Back" className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md active:scale-95">
            <I.Chevron className="h-4 w-4 rotate-180 text-[var(--color-ink-soft)]" />
          </button>
        )}

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 backdrop-blur-md mb-3">
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: accent }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">Mausam Profile</span>
        </div>

        <h1 className="text-[28px] font-semibold leading-tight text-[var(--color-ink)]">
          {t("Select the profile that fits you best", "वह प्रोफ़ाइल चुनें जो आप पर सबसे सही बैठे")}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          {t("Pick one. Your home screen shows only the decisions that matter to you.", "एक चुनें। आपकी होम स्क्रीन केवल आपके लिए ज़रूरी फ़ैसले दिखाएगी।")}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {userTypes.map((u) => {
            const active = value === u.key;
            return (
              <button
                key={u.key}
                onClick={() => onChange(u.key)}
                className="relative flex flex-col items-start gap-2.5 rounded-3xl p-4 text-left transition active:scale-[0.98] mausam-glass"
                style={{
                  background: active ? `color-mix(in srgb, ${accent} 18%, var(--color-glass))` : "var(--color-glass)",
                  boxShadow: active ? `inset 0 0 0 1.5px ${accent}66, 0 12px 30px -10px ${accent}44` : undefined,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-2xl font-mono text-[12px] font-semibold shadow-md"
                    style={{ background: active ? accent : "rgba(255,255,255,0.12)", color: active ? "#000" : "var(--color-ink)" }}
                  >
                    {u.glyph}
                  </span>
                  {active && (
                    <span className="grid h-6 w-6 place-items-center rounded-full text-black" style={{ background: accent }}>
                      <I.Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[15px] font-semibold leading-tight text-[var(--color-ink)] block">
                    {t(u.label)}
                  </span>
                  <span className="mt-1 text-[11.5px] leading-snug text-[var(--color-ink-faint)] block">{t(u.tag)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-8 z-20" style={{ background: "linear-gradient(to top, #04060a 70%, transparent)" }}>
        <button
          disabled={!value}
          onClick={onContinue}
          className="w-full rounded-full py-4 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-30"
          style={{ background: accent }}
        >
          {t("Continue to Sky Dashboard", "आगे बढ़ें")}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {t("You can change this anytime in the menu", "इसे मेनू में कभी भी बदल सकते हैं")}
        </p>
      </div>
    </div>
  );
}

/* ───────────── 2. Side Menu (Drawer) ───────────── */
type Glyph = (p: SVGProps<SVGSVGElement>) => ReactElement;
const mIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const UserGlyph: Glyph = (p) => (<svg viewBox="0 0 24 24" {...mIcon} {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>);
const LayersGlyph: Glyph = (p) => (<svg viewBox="0 0 24 24" {...mIcon} {...p}><path d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4Z" /><path d="M4 13l8 4.2L20 13" /></svg>);
const HeartGlyph: Glyph = (p) => (<svg viewBox="0 0 24 24" {...mIcon} {...p}><path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z" /></svg>);
const GearGlyph: Glyph = (p) => (<svg viewBox="0 0 24 24" {...mIcon} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" /></svg>);

export function Menu({
  onClose, lang, city, accent, onUserType, onSetLang,
}: {
  onClose: () => void;
  lang: Lang;
  city: string;
  accent: string;
  onUserType?: () => void;
  onSetLang?: (l: Lang) => void;
}) {
  const t = makeT(lang);
  const me = { name: "Kanishk Kanojia", role: "Outdoor Fitness", initials: "KK" };
  const groups: { section: string; items: { label: string; icon: Glyph; action?: () => void }[] }[] = [
    {
      section: "Account",
      items: [
        { label: "My Profile", icon: UserGlyph },
        { label: "User Type", icon: LayersGlyph, action: onUserType },
        { label: "Saved Locations", icon: I.Pin as Glyph },
      ],
    },
    {
      section: "Preferences",
      items: [
        { label: "Health Preferences", icon: HeartGlyph },
        { label: "Notifications", icon: I.Bell as Glyph },
        { label: "Settings", icon: GearGlyph },
      ],
    },
  ];

  return (
    <div className="absolute inset-0 z-40">
      <button onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" aria-label="Close menu" />
      <aside
        className="mausam-drawer animate-insight absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col overflow-hidden px-4 pb-6 pt-4 text-[var(--color-ink)]"
        style={{ background: `color-mix(in srgb, var(--wx-card, #0a0e18) 75%, transparent)` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/30" />

        {/* Profile Card */}
        <div className="relative mt-10 overflow-hidden rounded-3xl p-5 mausam-glass">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-white/50 transition active:scale-95 hover:bg-white/10"
          >
            <I.Close className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[17px] font-semibold"
              style={{ background: `${accent}22`, color: accent }}
            >
              {me.initials}
            </span>
            <div className="min-w-0 pr-6">
              <p className="truncate text-[18px] font-semibold leading-tight text-[var(--color-ink)]">{me.name}</p>
              <span
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                style={{ background: `${accent}18`, color: accent }}
              >
                <I.Pin className="h-3 w-3 shrink-0" />
                <span className="truncate">{city} · {t(me.role)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="scroll-hide relative mt-6 flex-1 overflow-y-auto space-y-6">
          {groups.map((g) => (
            <div key={g.section}>
              <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                {t(g.section)}
              </p>
              <div className="space-y-1">
                {g.items.map((it) => {
                  const Ico = it.icon;
                  return (
                    <button
                      key={it.label}
                      onClick={it.action}
                      className="group flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition active:scale-[0.99] hover:bg-white/5"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: `${accent}18`, color: accent }}
                      >
                        <Ico className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-[15px] font-medium text-[var(--color-ink)]">{t(it.label)}</span>
                      <I.Chevron className="h-4 w-4 text-[var(--color-ink-faint)] transition group-hover:text-[var(--color-ink-soft)]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Language picker */}
        <div className="relative mt-3 rounded-2xl p-3.5 mausam-glass">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("Language", "भाषा")}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {langNames.map((l) => {
              const active = lang === l.key;
              return (
                <button
                  key={l.key}
                  onClick={() => onSetLang?.(l.key)}
                  className="rounded-xl py-2 text-[12.5px] font-semibold transition active:scale-95"
                  style={{
                    background: active ? accent : "rgba(255,255,255,0.08)",
                    color: active ? "#000" : "var(--color-ink-soft)",
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          <span style={{ color: accent }}>Mausam Sky</span>
          <span>IMD Sync · v2.5</span>
        </div>
      </aside>
    </div>
  );
}

/* ───────────── 3. Mausam AI Assistant Chat Screen ───────────── */
export function Chat({ onClose, lang, accent }: { onClose: () => void; lang: Lang; accent: string }) {
  const t = makeT(lang);
  const [thread, setThread] = useState<{ role: "user" | "ai"; text?: string }[]>([
    { role: "user", text: "Should I go for a run at noon?" },
    { role: "ai" },
  ]);
  const [typing, setTyping] = useState(false);

  function ask(q: string) {
    setThread((th) => [...th, { role: "user", text: q }]);
    setTyping(true);
    setTimeout(() => { setTyping(false); setThread((th) => [...th, { role: "ai" }]); }, 1000);
  }

  return (
    <div className="flex h-full flex-col text-[var(--color-ink)]" style={pageGround(accent)}>
      <div className="flex items-center justify-between border-b border-white/8 px-5 pb-4 pt-14">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold text-black" style={{ background: accent }}>
            M
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[var(--color-ink)]">Mausam AI Assistant</h1>
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: accent }}>{t("Based on 3-hour forecast", "3-घंटे के पूर्वानुमान पर")}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-glass)] active:scale-95">
          <I.Close className="h-4 w-4 text-[var(--color-ink-soft)]" />
        </button>
      </div>

      <div className="scroll-hide flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {thread.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[82%] rounded-3xl rounded-br-md px-4 py-2.5 text-[14px] font-medium text-black shadow-lg" style={{ background: accent }}>{m.text}</p>
            </div>
          ) : (
            <StructuredAnswer key={i} lang={lang} accent={accent} />
          )
        )}
        {typing && (
          <div className="flex items-center gap-2 text-[var(--color-ink-faint)]">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: accent }} />
            <span className="font-mono text-[11px] uppercase tracking-wider">{t("Reading the sky patterns…", "आकाश पढ़ रहा है…")}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-7 pt-3">
        <div className="scroll-hide -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
          {chatChips.map((c) => (
            <button key={c} onClick={() => ask(c)} className="shrink-0 rounded-full mausam-glass px-3.5 py-2 text-[12.5px] font-medium text-[var(--color-ink)] active:scale-95">
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full mausam-glass py-2 pl-4 pr-2">
          <input className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[var(--color-ink-faint)]" placeholder={t("Ask Mausam AI about your day…", "अपने दिन के बारे में पूछें…")} />
          <button className="grid h-9 w-9 place-items-center rounded-full text-black active:scale-95" style={{ background: accent }}>
            <I.Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StructuredAnswer({ lang, accent }: { lang: Lang; accent: string }) {
  const t = makeT(lang);
  return (
    <div className="max-w-[90%] space-y-3 rounded-3xl rounded-bl-md p-4.5 mausam-glass">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(229,72,77,0.16)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-tier-critical)]">
        ⚠ {t("Not recommended for noon", "दोपहर में अनुशंसित नहीं")}
      </span>
      <Row label={t("Weather", "मौसम")}>{t("Temp hits 35°C with UV index 9 and 68% humidity at noon.", "दोपहर 12 बजे तापमान 35°C, UV 9 और 68% आर्द्रता।")}</Row>
      <Row label={t("Reasoning", "कारण")}>{t("Combined heat, UV and humidity push the feels-like to 39°C (Heat Exhaustion risk).", "गर्मी, UV और आर्द्रता से महसूस 39°C, जो दौड़ के लिए जोखिम है।")}</Row>
      <Row label={t("Recommendation", "सिफ़ारिश")}>
        <span className="font-semibold text-[var(--color-ink)]">{t("Run 6:15 to 8:00 AM instead", "इसके बजाय 6:15 से 8:00 AM दौड़ें")}</span>. {t("Cooler air and clean AQI.", "ठंडी हवा और साफ़ AQI।")}
      </Row>
      <button className="mt-1 w-full rounded-2xl py-3 text-[13.5px] font-semibold text-black transition active:scale-[0.98]" style={{ background: accent }}>
        {t("Set 6:15 AM run reminder", "6:15 AM का रिमाइंडर सेट करें")}
      </button>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">{t("Based on 3-hour forecast · IMD Pune", "3-घंटे पूर्वानुमान · IMD पुणे")}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">{label} · </span>
      {children}
    </p>
  );
}

/* ───────────── 4. Emergency Alerts Control Screen ───────────── */
export function Alerts({ onClose, lang, accent, location }: { onClose: () => void; lang: Lang; accent: string; location: Location }) {
  const t = makeT(lang);
  const alerts = alertsForLocation(location);
  return (
    <div className="flex h-full flex-col text-[var(--color-ink)]" style={pageGround(accent)}>
      <div className="flex items-center gap-3 border-b border-white/8 px-5 pb-4 pt-14">
        <button onClick={onClose} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-glass)] active:scale-95">
          <I.Chevron className="h-4 w-4 rotate-180 text-[var(--color-ink-soft)]" />
        </button>
        <div>
          <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">{t("Weather Alerts", "मौसम अलर्ट")}</h1>
          <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: accent }}>{location.city} · IMD 4-Tier Severity</p>
        </div>
      </div>

      <div className="scroll-hide flex-1 space-y-3.5 overflow-y-auto px-5 py-5">
        {alerts.map((a, i) => {
          const meta = tierMeta[a.tier];
          const critical = a.tier === "critical";
          return (
            <div
              key={i}
              className="overflow-hidden rounded-3xl p-5 mausam-glass space-y-3"
              style={{
                borderLeft: `3px solid ${meta.color}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full text-black font-semibold text-xs" style={{ background: meta.color }}>
                    {critical ? "⚡" : "🔔"}
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{a.time}</span>
              </div>
              <div>
                <h2 className="text-[15.5px] font-semibold text-[var(--color-ink)] leading-tight">{a.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{a.body}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
                  <I.Pin className="h-3.5 w-3.5" style={{ color: accent }} /> {a.area}
                </span>
                {critical && (
                  <button className="rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-black active:scale-95" style={{ background: meta.color }}>
                    {t("Safety steps", "सुरक्षा कदम")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── 5. Widget Detail Modal Overlay (Exact Home Screen Glass Design) ───────────── */
export type DetailType =
  | "air" | "sun" | "precip" | "pollen" | "wind"
  | "humidity" | "dewpoint" | "pressure" | "moon" | "travel" | "packing";

export function WidgetDetailModal({
  type, location, accent, lang, currentHour, onClose, onOpenRadar,
}: {
  type: DetailType;
  location: Location;
  accent: string;
  lang: Lang;
  currentHour?: number;
  onClose: () => void;
  onOpenRadar?: () => void;
}) {
  const t = makeT(lang);

  const titles: Record<DetailType, { en: string; hi: string }> = {
    air: { en: "Air Quality & Environment", hi: "वायु गुणवत्ता और पर्यावरण" },
    sun: { en: "Sun & Solar Elevation", hi: "सूर्य और सौर चक्र" },
    precip: { en: "Precipitation Forecast", hi: "वर्षा का पूर्वानुमान" },
    pollen: { en: "Pollen & Allergen Report", hi: "पराग और एलर्जी रिपोर्ट" },
    wind: { en: "Wind & Motion Vectors", hi: "पवन और वायुमंडलीय गति" },
    humidity: { en: "Relative Air Humidity", hi: "सापेक्ष आर्द्रता" },
    dewpoint: { en: "Dew Point & Comfort", hi: "ओसांक और सहजता" },
    pressure: { en: "Barometric Air Pressure", hi: "वायुमंडलीय दाब" },
    moon: { en: "Moon Phase & Astronomy", hi: "चंद्र कला और खगोल विज्ञान" },
    travel: { en: "Travel & Commute Status", hi: "यात्रा और आवागमन स्थिति" },
    packing: { en: "Packing & Outfit Advisor", hi: "पैकिंग व पोशाक गाइड" },
  };

  const theme = getWeatherTheme(location.condition, currentHour);

  return (
    <div className="absolute inset-0 z-50 flex flex-col text-[var(--color-ink)] animate-in fade-in duration-200 overflow-hidden" style={{ background: theme.solid }}>
      {/* Background sky photo image — exact same photo & transparency as Home screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8, 12, 20, 0.50) 0%, rgba(6, 10, 16, 0.35) 45%, rgba(4, 6, 10, 0.75) 100%), url(${theme.photo})`,
        }}
      />

      {/* Header bar matching Home Screen header aesthetics */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-4 pt-14 border-b border-white/8">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--color-ink)] leading-tight">{t(titles[type].en, titles[type].hi)}</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">{location.city} · {location.region}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md active:scale-95"
        >
          <I.Close className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Content scroll using Home Screen glass cards */}
      <div className="scroll-hide relative z-10 flex-1 space-y-3.5 overflow-y-auto px-5 py-5">
        {type === "air" && <AirDetail location={location} accent={accent} lang={lang} />}
        {type === "sun" && <SunDetail location={location} accent={accent} lang={lang} />}
        {type === "precip" && <PrecipDetail location={location} accent={accent} lang={lang} onOpenRadar={onOpenRadar} />}
        {type === "pollen" && <PollenDetail location={location} accent={accent} lang={lang} />}
        {type === "wind" && <WindDetail location={location} accent={accent} lang={lang} />}
        {type === "humidity" && <HumidityDetail location={location} accent={accent} lang={lang} />}
        {type === "dewpoint" && <DewPointDetail location={location} accent={accent} lang={lang} />}
        {type === "pressure" && <PressureDetail location={location} accent={accent} lang={lang} />}
        {type === "moon" && <MoonDetail location={location} accent={accent} lang={lang} />}
        {type === "travel" && <TravelDetail location={location} accent={accent} lang={lang} />}
        {type === "packing" && <PackingDetail location={location} accent={accent} lang={lang} />}
      </div>
    </div>
  );
}

/* ───────────────────── EXACT HOME SCREEN DESIGN DETAIL VIEWS ───────────────────── */

function AirDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const air = location.air;
  return (
    <div className="space-y-3.5">
      {/* AQI Overview — Borderless Home Glass */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Air Quality Index", "वायु गुणवत्ता सूचकांक")}</p>
            <h2 className="mt-1 text-[40px] font-semibold leading-none text-[var(--color-ink)]">{air.aqi} <span className="text-sm font-normal text-[var(--color-ink-soft)]">AQI</span></h2>
          </div>
          <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">
            {air.aqiLabel}
          </span>
        </div>

        {/* Spectrum bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#7bd88f] via-[#f2c53d] via-[#f0873a] to-[#e5484d] relative">
            <span className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0b111c] bg-white shadow-md" style={{ left: `${Math.min((air.aqi / 200) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-ink-faint)] pt-0.5">
            <span>0 Good</span>
            <span>50 Mod</span>
            <span>100 Unhealthy</span>
            <span>150+ Hazard</span>
          </div>
        </div>

        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">
          💡 {t("Air quality is acceptable for most people. Sensitive groups should limit long outdoor workouts during peak traffic.", "अधिकतर लोगों के लिए हवा स्वीकार्य है।")}
        </p>
      </div>

      {/* Pollutant Breakdown Grid */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pollutants Concentration", "प्रदूषक सांद्रता")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { name: "PM 2.5", val: "18 µg/m³", status: "Good", color: "#7bd88f" },
            { name: "PM 10", val: "45 µg/m³", status: "Moderate", color: "#f2c53d" },
            { name: "NO₂", val: "24 ppb", status: "Low", color: "#7bd88f" },
            { name: "O₃ (Ozone)", val: "38 ppb", status: "Low", color: "#7bd88f" },
            { name: "SO₂", val: "6.2 ppb", status: "Safe", color: "#7bd88f" },
            { name: "CO", val: "0.4 ppm", status: "Safe", color: "#7bd88f" },
          ].map((item) => (
            <div key={item.name} className="rounded-2xl bg-white/6 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">{item.name}</p>
              <p className="mt-1 text-[17px] font-semibold text-[var(--color-ink)]">{item.val}</p>
              <span className="text-[11px] font-medium" style={{ color: item.color }}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SunDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const sun = location.sun;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Solar Elevation Arc", "सौर ऊंचाई और स्थिति")}</p>
        <div className="py-2 flex justify-center">
          <div className="w-full max-w-[260px]">
            <svg viewBox="0 0 240 120" className="w-full">
              <path d="M 20,100 A 100,100 0 0,1 220,100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeDasharray="3 3" />
              <path d="M 20,100 A 100,100 0 0,1 220,100" fill="none" stroke={accent} strokeWidth="4" strokeDasharray={`${sun.progress * 314} 314`} />
              <circle cx={120 - 100 * Math.cos(sun.progress * Math.PI)} cy={100 - 100 * Math.sin(sun.progress * Math.PI)} r="7" fill={accent} />
            </svg>
          </div>
        </div>
        <div className="flex justify-between px-2 text-[13px] font-semibold text-[var(--color-ink)]">
          <span>🌅 {sun.sunrise}</span>
          <span style={{ color: accent }}>⏳ {sun.daylight}</span>
          <span>🌇 {sun.sunset}</span>
        </div>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Golden & Blue Hour Photography", "गोल्डन आवर समय")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">Morning Golden</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--color-ink)]">6:00 AM – 6:35 AM</p>
          </div>
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">Evening Golden</p>
            <p className="mt-1 text-[15px] font-semibold" style={{ color: accent }}>5:45 PM – 6:21 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrecipDetail({ location, accent, lang, onOpenRadar }: { location: Location; accent: string; lang: Lang; onOpenRadar?: () => void }) {
  const t = makeT(lang);
  const p = location.precip;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("24-Hour Rainfall Volume", "24-घंटे वर्षा मात्रा")}</p>
            <h2 className="mt-1 text-[36px] font-semibold leading-none text-[var(--color-ink)]">{p.amount}</h2>
            <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">{t("Next rain", "अगली वर्षा")}: {p.next}</p>
          </div>
          <span className="rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: `${accent}22`, color: accent }}>
            {p.chance}% {t("chance", "संभावना")}
          </span>
        </div>
        <p className="text-[12.5px] text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">{p.note}</p>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Hourly Rain Probability Graph", "प्रति घंटा वर्षा संभावना")}</p>
        <div className="flex items-end gap-2.5 h-28 pt-2">
          {p.bars.map((b) => (
            <div key={b.t} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] font-semibold text-[var(--color-ink-soft)]">{b.v}%</span>
              <div className="w-full rounded-lg" style={{ height: `${Math.max(b.v, 8)}%`, background: accent, opacity: 0.35 + (b.v / 100) * 0.65 }} />
              <span className="text-[10px] text-[var(--color-ink-faint)]">{b.t}</span>
            </div>
          ))}
        </div>
      </div>

      {onOpenRadar && (
        <button onClick={onOpenRadar} className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-black transition active:scale-95" style={{ background: accent }}>
          🌊 {t("Open Live Rain Radar Map", "लाइव वर्षा रडार मानचित्र खोलें")}
        </button>
      )}
    </div>
  );
}

function PollenDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const pol = location.pollen;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <div className="flex justify-between items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pollen Allergen Count", "पराग एलर्जी स्तर")}</p>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300">
            {pol.level}
          </span>
        </div>
        <h2 className="text-[34px] font-semibold leading-none text-[var(--color-ink)]">{pol.count} <span className="text-xs font-normal text-[var(--color-ink-soft)]">grains/m³</span></h2>
        <p className="text-[12px] text-[var(--color-ink-soft)]">{pol.trend}</p>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Active Allergen Species", "सक्रिय एलर्जी प्रजातियां")}</p>
        <div className="space-y-2">
          {pol.types.split(",").map((type) => (
            <div key={type} className="flex justify-between items-center p-3 rounded-2xl bg-white/6">
              <span className="text-[13.5px] font-medium text-[var(--color-ink)]">🌿 {type.trim()}</span>
              <span className="text-[11px] font-semibold text-amber-300">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WindDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const w = location.wind;
  const dirAngles: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  const deg = dirAngles[w.dir] ?? 0;

  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Wind Compass", "पवन गति व दिशा")}</p>
        <div className="relative mx-auto h-36 w-36 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" />
            {["N", "E", "S", "W"].map((d, i) => (
              <text key={d} x="50" y={i === 0 ? 16 : i === 2 ? 88 : 53} dx={i === 1 ? 38 : i === 3 ? -38 : 0} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">{d}</text>
            ))}
            <g transform={`rotate(${deg} 50 50)`}>
              <path d="M 50 18 L 56 50 L 50 45 L 44 50 Z" fill={accent} />
            </g>
          </svg>
        </div>
        <h2 className="text-[32px] font-semibold leading-none text-[var(--color-ink)]">{w.speed} <span className="text-sm font-normal text-[var(--color-ink-soft)]">km/h</span></h2>
        <p className="text-[12px] text-[var(--color-ink-soft)]">Direction: {w.dir} · Gusts: {w.gust} km/h</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl p-4 mausam-glass text-center space-y-1">
          <p className="text-[11px] text-[var(--color-ink-faint)]">Beaufort Scale</p>
          <p className="text-[18px] font-semibold text-[var(--color-ink)]">Level 3</p>
          <p className="text-[11px] text-[#7bd88f]">Gentle Breeze</p>
        </div>
        <div className="rounded-3xl p-4 mausam-glass text-center space-y-1">
          <p className="text-[11px] text-[var(--color-ink-faint)]">Wind Chill</p>
          <p className="text-[18px] font-semibold text-[var(--color-ink)]">{location.temp - 1}°C</p>
          <p className="text-[11px]" style={{ color: accent }}>Feels Refreshing</p>
        </div>
      </div>
    </div>
  );
}

function HumidityDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const h = location.humidity;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Relative Air Humidity", "सापेक्ष आर्द्रता")}</p>
        <div className="relative mx-auto h-32 w-32 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 * (1 - h / 100)} />
          </svg>
          <span className="absolute text-[26px] font-semibold text-[var(--color-ink)]">{h}%</span>
        </div>
        <p className="text-[12px] text-[var(--color-ink-soft)]">Current Dew Point is {location.dewPoint}°C</p>
        <p className="text-[12.5px] text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">
          {h >= 75 ? "💧 High humidity makes the air feel muggier. Set indoor AC to dry mode." : "🍃 Humidity is at a comfortable level."}
        </p>
      </div>
    </div>
  );
}

function DewPointDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const d = location.dewPoint;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Dew Point Temperature", "ओसांक तापमान")}</p>
        <h2 className="text-[40px] font-semibold leading-none text-[var(--color-ink)]">{d}°C</h2>
        <p className="text-[13px] font-medium" style={{ color: accent }}>{d >= 20 ? "Humid & Muggy" : "Comfortable Air"}</p>
        <div className="space-y-1 text-left pt-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#7bc4f2] via-[#7bd88f] via-[#f0873a] to-[#e5484d] relative">
            <span className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0b111c] bg-white shadow-md" style={{ left: `${Math.min(Math.max(((d - 8) / 20) * 100, 0), 100)}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-ink-faint)] pt-0.5">
            <span>&lt;10° Dry</span>
            <span>15° Ideal</span>
            <span>20° Humid</span>
            <span>25°+ Muggy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PressureDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const pr = location.pressure;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Barometric Air Pressure", "वायुमंडलीय दाब")}</p>
        <h2 className="text-[40px] font-semibold leading-none text-[var(--color-ink)]">{pr.value} <span className="text-sm font-normal text-[var(--color-ink-soft)]">hPa</span></h2>
        <p className="text-[13px] font-medium text-amber-300">{pr.trend}</p>
        <p className="text-[12.5px] text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">
          📉 Barometric pressure drop indicates approaching clouds and rain activity over the next 6-12 hours.
        </p>
      </div>
    </div>
  );
}

function MoonDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const m = location.moon;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-black shadow-lg">
          <img src="/moon.png" alt="Moon" className="h-[120%] w-[120%] max-w-none -translate-x-[8.3%] -translate-y-[8.3%] object-cover rounded-full" />
        </div>
        <div className="space-y-1">
          <h2 className="text-[20px] font-semibold text-[var(--color-ink)]">{m.name}</h2>
          <p className="text-[13px] font-medium" style={{ color: accent }}>{m.illum}% Illuminated</p>
          <p className="text-[11.5px] text-[var(--color-ink-soft)]">Moonrise: 11:14 PM · Moonset: 10:45 AM</p>
          <p className="font-mono text-[10px] text-[var(--color-ink-faint)]">Distance: 384,400 km</p>
        </div>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Upcoming Lunar Phases", "आगामी चंद्र कलाएं")}</p>
        <div className="space-y-2 text-[12.5px]">
          {[
            ["New Moon", "Sep 21"],
            ["First Quarter", "Sep 28"],
            ["Full Moon", "Oct 5"],
            ["Last Quarter", "Oct 13"],
          ].map(([phase, date]) => (
            <div key={phase} className="flex justify-between py-1.5 border-b border-white/6">
              <span className="text-[var(--color-ink-soft)]">{phase}</span>
              <span className="font-semibold text-[var(--color-ink)]">{date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TravelDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const tr = location.travel;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Commute & Traffic", "यात्रा व यातायात")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">Traffic Status</p>
            <p className="mt-1 text-[17px] font-semibold text-amber-300">{tr.traffic}</p>
            <p className="text-[11px] text-[var(--color-ink-soft)]">{tr.trafficNote}</p>
          </div>
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">Road Visibility</p>
            <p className="mt-1 text-[17px] font-semibold text-[var(--color-ink)]">{tr.visibility}</p>
            <p className="text-[11px] text-[#7bd88f]">Safe Driving</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Live Airport Flight Status", "लाइव हवाई उड़ान स्थिति")}</p>
        <div className="space-y-2">
          {tr.flights.map((f) => (
            <div key={f.route} className="flex items-center justify-between p-3 rounded-2xl bg-white/6">
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">{f.route}</p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">Departure: {f.time}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${f.status === "On time" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                {f.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PackingDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const tips = packingTips(location.condition);
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Recommended Weather Gear Checklist", "अनुशंसित मौसम सामग्री")}</p>
        <div className="space-y-2">
          {tips.map((item: { tip: string; hi: string }, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/6">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-bold text-xs text-black" style={{ background: accent }}>✓</span>
              <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{t(item.tip)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
