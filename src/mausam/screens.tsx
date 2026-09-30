import { useState, useEffect, useRef, useMemo, type SVGProps, type ReactElement, type CSSProperties } from "react";
import { userTypes, chatChips, alertsForLocation, tierMeta, packingTips, type UserTypeKey, type Location } from "./data";
import { getWeatherTheme } from "./theme";
import { makeT, langNames, type Lang } from "./i18n";
import * as I from "./icons";
import { askWhy } from "../ai/mausamAI";
import { useProfile } from "../engine/profile";
import { RealisticMoon } from "./RealisticMoon";
import { LunarTimeline } from "./LunarTimeline";
import { getCompleteMoonData, getUpcomingPhasesSchedule, CITY_COORDINATES } from "./astronomy";
import BackgroundEngine from "./background/BackgroundEngine";
import { parseTimeStringToHours, calculateSolarPosition } from "./background/solarEngine";

const PANEL = "#090d16";

/* Weather-adaptive page ground — solid black */
function pageGround(_accent?: string): CSSProperties {
  return {
    background: "#000000",
  };
}

/* ───────────── Profile type icons (inline SVG illustrations) ───────────── */
const ProfileIcons: Record<string, (props: { className?: string }) => ReactElement> = {
  health: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#1a2e1a" />
      <path d="M24 34s-10-6.3-10-13.3A6 6 0 0 1 24 17a6 6 0 0 1 10 3.7C34 27.7 24 34 24 34Z" fill="#4ade80" opacity=".9"/>
      <ellipse cx="30" cy="16" rx="5" ry="7" fill="#86efac" opacity=".5" transform="rotate(-30 30 16)"/>
      <circle cx="18" cy="20" r="3" fill="#bbf7d0" opacity=".4"/>
    </svg>
  ),
  fitness: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#0e2030" />
      <circle cx="28" cy="14" r="4" fill="#7dd3fc" />
      <path d="M22 20l-4 8h6l-2 8 10-12h-6l3-4H22Z" fill="#38bdf8" />
      <path d="M14 28l4-2M34 26l-3 4" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  beach: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#061e1d" />
      <path d="M8 30 Q16 22 24 30 Q32 38 40 30" stroke="#06d6c7" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M8 35 Q16 27 24 35 Q32 43 40 35" stroke="#0891b2" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="33" cy="15" r="6" fill="#fde68a" opacity=".9"/>
      <path d="M8 26 Q16 18 24 26 Q32 34 40 26" stroke="#67e8f9" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".5"/>
    </svg>
  ),
  traveler: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#1c0f00" />
      <path d="M10 30l5-3 3-6 2 4 5-8 2 6 4-3" stroke="#f97316" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M34 20l4-6-5 1 1 5Z" fill="#fb923c"/>
      <circle cx="24" cy="32" r="2" fill="#fed7aa" opacity=".6"/>
      <path d="M15 36h18" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" opacity=".35"/>
    </svg>
  ),
  parent: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#1a1700" />
      <circle cx="18" cy="16" r="4" fill="#facc15" />
      <circle cx="30" cy="18" r="3" fill="#fef08a" />
      <path d="M10 34c0-6 4-9 8-9s6 2 8 2 4-1 6-4c0 4-2 9-6 10H10Z" fill="#eab308" opacity=".85"/>
      <circle cx="22" cy="28" r="2" fill="#fef9c3" opacity=".6"/>
    </svg>
  ),
  agri: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#0f1a0a" />
      <path d="M24 38V22" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 28 Q18 24 16 18 Q22 18 24 24" fill="#22c55e" opacity=".8"/>
      <path d="M24 26 Q30 22 32 16 Q26 16 24 22" fill="#4ade80" opacity=".7"/>
      <path d="M16 38h16" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
      <circle cx="24" cy="20" r="3" fill="#bbf7d0" opacity=".3"/>
    </svg>
  ),
  commuter: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#12101a" />
      <rect x="10" y="22" width="28" height="12" rx="3" fill="#6366f1" opacity=".7"/>
      <rect x="13" y="18" width="22" height="8" rx="2" fill="#818cf8" opacity=".6"/>
      <circle cx="16" cy="36" r="3" fill="#c7d2fe"/>
      <circle cx="32" cy="36" r="3" fill="#c7d2fe"/>
      <rect x="20" y="24" width="8" height="5" rx="1" fill="#e0e7ff" opacity=".5"/>
      <path d="M10 26h2M36 26h2" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  event: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#1a1200" />
      <rect x="12" y="16" width="24" height="20" rx="3" fill="#f59e0b" opacity=".18" stroke="#f59e0b" strokeWidth="1.5"/>
      <path d="M12 22h24" stroke="#f59e0b" strokeWidth="1.5" opacity=".6"/>
      <rect x="17" y="12" width="2" height="6" rx="1" fill="#fbbf24"/>
      <rect x="29" y="12" width="2" height="6" rx="1" fill="#fbbf24"/>
      <rect x="17" y="27" width="4" height="4" rx="1" fill="#fde68a" opacity=".8"/>
      <rect x="23" y="27" width="4" height="4" rx="1" fill="#fde68a" opacity=".5"/>
      <rect x="29" y="27" width="4" height="4" rx="1" fill="#fde68a" opacity=".25"/>
    </svg>
  ),
};

const PROFILE_COLORS: Record<string, string> = {
  health:   "#4ade80",
  fitness:  "#38bdf8",
  beach:    "#06d6c7",
  traveler: "#f97316",
  parent:   "#facc15",
  agri:     "#22c55e",
  commuter: "#818cf8",
  event:    "#f59e0b",
};

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
    <div className="relative flex h-full flex-col overflow-hidden bg-black" style={{ background: "#000000" }}>

      <div className="scroll-hide flex-1 overflow-y-auto px-5 pb-36 pt-14 relative z-10 bg-black">
        {onBack && (
          <button onClick={onBack} aria-label="Back" className="mb-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur-md active:scale-95">
            <I.Chevron className="h-4 w-4 rotate-180 text-white/70" />
          </button>
        )}

        <h1 className="text-[26px] font-bold leading-snug text-white">
          {t("Select the profile that fits you best")}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/45">
          {t("Pick one. Your home screen shows only the decisions that matter to you.")}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {userTypes.map((u) => {
            const active = value === u.key;
            const Icon = ProfileIcons[u.key];
            const iconColor = PROFILE_COLORS[u.key] ?? accent;
            return (
              <button
                key={u.key}
                onClick={() => onChange(u.key)}
                className="relative flex flex-col items-start rounded-2xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: active
                    ? `color-mix(in srgb, ${iconColor} 14%, rgba(255,255,255,0.06))`
                    : "rgba(255,255,255,0.05)",
                  border: active
                    ? `1.5px solid ${iconColor}99`
                    : "1.5px solid rgba(255,255,255,0.10)",
                  boxShadow: active ? `0 0 20px -4px ${iconColor}44` : "none",
                }}
              >
                {/* Checkmark badge */}
                {active && (
                  <span
                    className="absolute top-2.5 right-2.5 grid h-5 w-5 place-items-center rounded-full shadow"
                    style={{ background: iconColor }}
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  </span>
                )}

                {/* Icon */}
                {Icon && <Icon className="h-12 w-12 mb-2.5" />}

                <span className="text-[13.5px] font-semibold leading-tight text-white block pr-4">
                  {t(u.label)}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-white/45 block">
                  {t(u.tag)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-10 z-20" style={{ background: "linear-gradient(to top, #000000 70%, rgba(0,0,0,0.85) 85%, transparent)" }}>
        <button
          disabled={!value}
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold text-[#0a0e16] transition active:scale-[0.98] disabled:opacity-30"
          style={{ background: value ? "#ffffff" : "#ffffff" }}
        >
          {t("Continue")}
        </button>
        <p className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-wider text-white/25">
          {t("You can change this anytime in the menu")}
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
      <button onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" aria-label="Close menu" />
      <aside
        className="mausam-drawer animate-insight absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col overflow-hidden px-4 pb-6 pt-4 text-[var(--color-ink)] bg-black"
        style={{ background: "#000000" }}
      >

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
            {t("Language")}
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
export function Chat({
  onClose, lang, accent, location, initialQ,
}: {
  onClose: () => void;
  lang: Lang;
  accent: string;
  location?: Location;
  initialQ?: string;
}) {
  const t = makeT(lang);
  const { updateProfile } = useProfile();
  const hasAskedInitialRef = useRef(false);

  // If initialQ is explicitly provided (e.g. from an action card), seed with that question.
  // Otherwise, greet the user with a welcoming intro message and wait for user input.
  const [thread, setThread] = useState<{
    role: "user" | "ai";
    text?: string;
    isOffline?: boolean;
    errorReason?: string;
    source?: string;
    confidence?: string;
  }[]>(() => {
    if (initialQ) {
      return [{ role: "user", text: initialQ }];
    }
    return [
      {
        role: "ai",
        text: t(
          "Hello! I'm Mausam AI. Ask me anything about today's weather, rain forecast, air quality, or planning your day."
        ),
        source: "Mausam AI",
        confidence: "high",
      },
    ];
  });

  const [typing, setTyping] = useState<boolean>(Boolean(initialQ));
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    // Only auto-ask if an explicit initial question was passed from a card, and ensure it only runs once
    if (!initialQ || hasAskedInitialRef.current) return;
    hasAskedInitialRef.current = true;

    if (!location) {
      setTyping(false);
      return;
    }

    askWhy(initialQ, location.city, location, lang).then((res) => {
      setTyping(false);
      setThread((th) => [
        ...th,
        {
          role: "ai",
          text: res.text,
          isOffline: res.isOffline,
          errorReason: res.errorReason,
          source: res.source,
          confidence: res.confidence,
        },
      ]);
      updateProfile((p) => ({
        ...p,
        askWhyTopics: {
          ...p.askWhyTopics,
          [res.interest]: (p.askWhyTopics[res.interest] ?? 0) + 1,
        },
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  function ask(q: string) {
    setThread((th) => [...th, { role: "user", text: q }]);
    setTyping(true);

    if (location) {
      askWhy(q, location.city, location, lang).then((res) => {
        setTyping(false);
        setThread((th) => [
          ...th,
          {
            role: "ai",
            text: res.text,
            isOffline: res.isOffline,
            errorReason: res.errorReason,
            source: res.source,
            confidence: res.confidence,
          },
        ]);
        updateProfile((p) => ({
          ...p,
          askWhyTopics: {
            ...p.askWhyTopics,
            [res.interest]: (p.askWhyTopics[res.interest] ?? 0) + 1,
          },
        }));
      });
    } else {
      setTimeout(() => { setTyping(false); setThread((th) => [...th, { role: "ai", text: t("Weather data unavailable.") }]); }, 500);
    }
  }

  function handleSubmit() {
    const q = inputVal.trim();
    if (!q) return;
    setInputVal("");
    ask(q);
  }

  return (
    <div className="flex h-full flex-col text-[var(--color-ink)]" style={pageGround(accent)}>
      <div className="flex items-center justify-between border-b border-white/8 px-5 pb-4 pt-14">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold text-black" style={{ background: accent }}>
            M
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[var(--color-ink)]">{t("Mausam AI Assistant")}</h1>
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: accent }}>{t("Based on 3-hour forecast")}</p>
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
          ) : m.text ? (
            <div key={i} className="max-w-[90%] space-y-2 rounded-3xl rounded-bl-md p-4.5 mausam-glass">
              <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">{m.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                {m.source && m.confidence && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                    {m.source} · {m.confidence}
                  </span>
                )}
                {m.isOffline && (
                  <span className="rounded-full bg-yellow-600/20 px-2 py-0.5 text-[9px] font-mono text-yellow-300">
                    {m.errorReason ?? t("offline answer")}
                  </span>
                )}
              </div>
            </div>
          ) : null
        )}
        {typing && (
          <div className="flex items-center gap-2 text-[var(--color-ink-faint)]">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: accent }} />
            <span className="font-mono text-[11px] uppercase tracking-wider">{t("Reading the sky patterns…")}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-7 pt-3">
        <div className="scroll-hide -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
          {chatChips.map((c) => (
            <button key={c} onClick={() => ask(t(c))} className="shrink-0 rounded-full mausam-glass px-3.5 py-2 text-[12.5px] font-medium text-[var(--color-ink)] active:scale-95">
              {t(c)}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex items-center gap-2 rounded-full mausam-glass py-2 pl-4 pr-2">
          <input
            className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[var(--color-ink-faint)]"
            placeholder={t("Ask Mausam AI about your day…")}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          <button type="submit" className="grid h-9 w-9 place-items-center rounded-full text-black active:scale-95" style={{ background: accent }}>
            <I.Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
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
          <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">{t("Weather Alerts")}</h1>
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
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{t(meta.label)}</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{t(a.time)}</span>
              </div>
              <div>
                <h2 className="text-[15.5px] font-semibold text-[var(--color-ink)] leading-tight">{t(a.title)}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{t(a.body)}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
                  <I.Pin className="h-3.5 w-3.5" style={{ color: accent }} /> {a.area}
                </span>
                {critical && (
                  <button className="rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-black active:scale-95" style={{ background: meta.color }}>
                    {t("Safety steps")}
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
  onOpenRadar?: (layer?: "rain" | "wind") => void;
}) {
  const t = makeT(lang);

  const titles: Record<DetailType, string> = {
    air: "Air Quality & Environment",
    sun: "Sun & Solar Elevation",
    precip: "Precipitation Forecast",
    pollen: "Pollen & Allergen Report",
    wind: "Wind & Motion Vectors",
    humidity: "Relative Air Humidity",
    dewpoint: "Dew Point & Comfort",
    pressure: "Barometric Air Pressure",
    moon: "Moon Phase & Astronomy",
    travel: "Travel & Commute Status",
    packing: "Packing & Outfit Advisor",
  };

  const theme = getWeatherTheme(location.condition, currentHour);

  return (
    <div className="absolute inset-0 z-50 flex flex-col text-[var(--color-ink)] animate-in fade-in duration-200 overflow-hidden">
      {/* Header bar matching Home Screen header aesthetics without blurring the sky backdrop */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-4 pt-14 border-b border-white/8 bg-black/15">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--color-ink)] leading-tight">{t(titles[type])}</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">{location.city} · {location.region}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 border border-white/10 active:scale-95 transition hover:bg-white/15"
        >
          <I.Close className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Content scroll using Home Screen glass cards */}
      <div className="scroll-hide relative z-10 flex-1 space-y-3.5 overflow-y-auto px-5 py-5">
        {type === "air" && <AirDetail location={location} accent={accent} lang={lang} />}
        {type === "sun" && <SunDetail location={location} accent={accent} lang={lang} currentHour={currentHour} />}
        {type === "precip" && <PrecipDetail location={location} accent={accent} lang={lang} onOpenRadar={() => onOpenRadar?.("rain")} />}
        {type === "pollen" && <PollenDetail location={location} accent={accent} lang={lang} />}
        {type === "wind" && <WindDetail location={location} accent={accent} lang={lang} onOpenRadar={() => onOpenRadar?.("wind")} />}
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Air Quality Index")}</p>
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
            <span>0 {t("Good")}</span>
            <span>50 {t("Mod")}</span>
            <span>100 {t("Unhealthy")}</span>
            <span>150+ {t("Hazard")}</span>
          </div>
        </div>

        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">
          💡 {t("Air quality is acceptable for most people. Sensitive groups should limit long outdoor workouts during peak traffic.")}
        </p>
      </div>

      {/* Pollutant Breakdown Grid */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pollutants Concentration")}</p>
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
              <span className="text-[11px] font-medium" style={{ color: item.color }}>{t(item.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatHoursToTime(h: number): string {
  const norm = ((h % 24) + 24) % 24;
  let hours = Math.floor(norm);
  const mins = Math.round((norm - hours) * 60);
  if (mins === 60) {
    hours = (hours + 1) % 24;
  }
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayH = hours % 12 === 0 ? 12 : hours % 12;
  const displayM = mins === 60 ? "00" : mins < 10 ? `0${mins}` : `${mins}`;
  return `${displayH}:${displayM} ${ampm}`;
}

function SunDetail({ location, accent, lang, currentHour }: { location: Location; accent: string; lang: Lang; currentHour?: number }) {
  const t = makeT(lang);
  const sun = location.sun ?? { sunrise: "6:00 AM", sunset: "6:15 PM", daylight: "12h 15m", progress: 0.5 };

  const sunriseH = parseTimeStringToHours(sun.sunrise) ?? 6.0;
  const sunsetH = parseTimeStringToHours(sun.sunset) ?? 18.25;

  const nowH = useMemo(() => {
    if (typeof currentHour === "number" && !isNaN(currentHour)) {
      return ((currentHour % 24) + 24) % 24;
    }
    if (typeof sun.progress === "number" && sun.progress >= 0 && sun.progress <= 1) {
      return sunriseH + sun.progress * (sunsetH - sunriseH);
    }
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }, [currentHour, sun.progress, sunriseH, sunsetH]);

  const solar = useMemo(() => {
    return calculateSolarPosition(nowH, sunriseH, sunsetH);
  }, [nowH, sunriseH, sunsetH]);

  const isDaytime = nowH >= sunriseH && nowH <= sunsetH;
  const isSunsetNext = isDaytime;

  // Key solar milestones
  const dawnH = sunriseH - 0.45; // ~27 min civil twilight
  const duskH = sunsetH + 0.45; // ~27 min civil twilight
  const solarNoonH = (sunriseH + sunsetH) / 2;

  // Photography windows
  const morningBlueStart = sunriseH - 0.5;
  const morningBlueEnd = sunriseH - 0.15;
  const morningGoldenStart = sunriseH;
  const morningGoldenEnd = sunriseH + 0.65;
  const eveningGoldenStart = sunsetH - 0.65;
  const eveningGoldenEnd = sunsetH;
  const eveningBlueStart = sunsetH + 0.15;
  const eveningBlueEnd = sunsetH + 0.5;

  // Active photography window check
  const isMorningBlue = nowH >= morningBlueStart && nowH <= morningBlueEnd;
  const isMorningGolden = nowH >= morningGoldenStart && nowH <= morningGoldenEnd;
  const isEveningGolden = nowH >= eveningGoldenStart && nowH <= eveningGoldenEnd;
  const isEveningBlue = nowH >= eveningBlueStart && nowH <= eveningBlueEnd;

  // Countdown
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
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }, [isDaytime, sunsetH, sunriseH, nowH]);

  // High-precision 24-hour diurnal elevation curve in modal
  // ViewBox: 0 0 320 126
  // Horizon baseline y = 84 (0° altitude)
  const horizonY = 84;
  const maxAltitude = 72;
  const minAltitude = -30;
  const altRange = maxAltitude - minAltitude; // 102°
  const pxPerDeg = (114 - 24) / altRange; // ~0.882 px per deg

  // We map 24 hours (0..24) along X from 20 to 300
  const xForHour = (h: number) => 20 + (h / 24) * 280;
  const yForAlt = (alt: number) => horizonY - alt * pxPerDeg;

  // Calculate 49 points across the 24-hour cycle
  const curvePts = useMemo(() => {
    return Array.from({ length: 49 }, (_, i) => {
      const h = (i / 48) * 24;
      const pos = calculateSolarPosition(h, sunriseH, sunsetH);
      const x = xForHour(h);
      const y = yForAlt(pos.altitude);
      return { h, x, y, alt: pos.altitude };
    });
  }, [sunriseH, sunsetH]);

  const curvePath = useMemo(() => {
    return curvePts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [curvePts]);

  // Daytime polygon above horizon
  const dayCurvePts = curvePts.filter((p) => p.alt >= 0);
  const dayAreaPath = useMemo(() => {
    if (dayCurvePts.length === 0) return "";
    const firstX = xForHour(sunriseH);
    const lastX = xForHour(sunsetH);
    let path = `M ${firstX.toFixed(1)} ${horizonY} `;
    dayCurvePts.forEach((p) => {
      path += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    });
    path += `L ${lastX.toFixed(1)} ${horizonY} Z`;
    return path;
  }, [dayCurvePts, sunriseH, sunsetH, horizonY]);

  // Current sun point on graph
  const liveX = xForHour(nowH);
  const liveY = yForAlt(solar.altitude);

  // Daylight vs Night percentage
  const daylightHours = sunsetH - sunriseH;
  const nightHours = 24 - daylightHours;
  const daylightPct = Math.round((daylightHours / 24) * 100);

  return (
    <div className="space-y-3.5">
      {/* ── Card 1: 24-Hour Solar Elevation & Diurnal Graph ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
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
              {t("Solar Elevation Arc")}
            </span>
          </div>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium border border-white/10 bg-white/6 text-[var(--color-ink-soft)]">
            {solar.altitude >= 0 ? `+${solar.altitude.toFixed(1)}° Alt` : `${solar.altitude.toFixed(1)}° Alt`}
          </span>
        </div>

        {/* Hero Event Headline */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <h2 className="text-[32px] font-semibold tracking-tight text-[var(--color-ink)] leading-none">
              {isSunsetNext ? sun.sunset : sun.sunrise}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
              {isSunsetNext ? `${t("Sunset")} · ${t(countdownText)}` : `${t("Sunrise")} · ${t(countdownText)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              AZIMUTH
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-ink)] font-mono">
              {solar.azimuth.toFixed(0)}°
            </p>
          </div>
        </div>

        {/* High-Precision 24h Solar Elevation Graph */}
        <div className="relative pt-2">
          <svg viewBox="0 0 320 126" className="w-full overflow-visible">
            <defs>
              <linearGradient id="modalSunGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                <stop offset="60%" stopColor={accent} stopOpacity="0.08" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 0° Horizon Line */}
            <line x1="16" y1={horizonY} x2="304" y2={horizonY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
            <text x="18" y={horizonY - 4} fontSize="8" fontFamily="monospace" fill="rgba(255,255,255,0.35)">0° HORIZON</text>

            {/* Civil Twilight Threshold (-6°) */}
            <line x1="16" y1={yForAlt(-6)} x2="304" y2={yForAlt(-6)} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" strokeDasharray="2 4" />
            <text x="18" y={yForAlt(-6) + 8} fontSize="7" fontFamily="monospace" fill="rgba(255,255,255,0.22)">-6° TWILIGHT</text>

            {/* Solar Noon Culmination Peak Marker (+72°) */}
            <line x1="16" y1={24} x2="304" y2={24} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" strokeDasharray="1 4" />
            <text x="302" y="22" textAnchor="end" fontSize="7" fontFamily="monospace" fill="rgba(255,255,255,0.25)">PEAK +72°</text>

            {/* Area fill for daylight */}
            {dayAreaPath && <path d={dayAreaPath} fill="url(#modalSunGlow)" />}

            {/* Full 24-hr sinusoidal elevation curve */}
            <path d={curvePath} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" />

            {/* Daytime curve segment illuminated */}
            {dayAreaPath && (
              <path
                d={curvePts.filter((p) => p.alt >= 0).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {/* Sunrise & Sunset Horizon Nodes */}
            <circle cx={xForHour(sunriseH)} cy={horizonY} r="2.8" fill="rgba(255,255,255,0.6)" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
            <circle cx={xForHour(sunsetH)} cy={horizonY} r="2.8" fill="rgba(255,255,255,0.6)" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />

            {/* Live Sun Marker with Drop Line */}
            <line x1={liveX} y1={liveY} x2={liveX} y2={horizonY} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={liveX} cy={liveY} r="12" fill={accent} opacity="0.2" />
            <circle cx={liveX} cy={liveY} r="7" fill={accent} opacity="0.38" />
            <circle cx={liveX} cy={liveY} r="4.2" fill="#ffffff" stroke={accent} strokeWidth="1.8" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.6))" />

            {/* Timeline hour ticks */}
            {[
              { label: "12 AM", h: 0 },
              { label: "6 AM", h: 6 },
              { label: "12 PM", h: 12 },
              { label: "6 PM", h: 18 },
              { label: "12 AM", h: 24 },
            ].map((tick) => (
              <text key={tick.label + tick.h} x={xForHour(tick.h)} y="122" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="rgba(255,255,255,0.35)">
                {tick.label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Card 2: Celestial Milestones (No AI Slop / Zero Emojis) ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          {t("Key Solar Events")}
        </p>

        <div className="divide-y divide-white/6">
          {[
            {
              label: "Civil Dawn",
              sub: "First ambient light in sky",
              time: formatHoursToTime(dawnH),
              icon: (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-sky-300">
                  <path d="M3 15h14M10 6v3M6 9l2 2M14 9l-2 2" strokeLinecap="round" />
                  <path d="M6 15a4 4 0 0 1 8 0" strokeDasharray="2 2" />
                </svg>
              ),
            },
            {
              label: t("Sunrise"),
              sub: "Solar disk touches horizon",
              time: sun.sunrise,
              icon: (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" style={{ color: accent }}>
                  <path d="M3 15h14M10 3v4M5 8l2 2M15 8l-2 2" strokeLinecap="round" />
                  <path d="M6 15a4 4 0 0 1 8 0" />
                </svg>
              ),
              highlight: isSunsetNext && nowH < sunriseH + 1,
            },
            {
              label: "Solar Noon",
              sub: "Maximum solar culmination",
              time: formatHoursToTime(solarNoonH),
              icon: (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-amber-200">
                  <circle cx="10" cy="10" r="4" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              label: t("Sunset"),
              sub: "Sun sinks below horizon",
              time: sun.sunset,
              icon: (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-orange-400">
                  <path d="M3 15h14M10 7v4M5 12l2-2M15 12l-2-2" strokeLinecap="round" />
                  <path d="M6 15a4 4 0 0 1 8 0" />
                </svg>
              ),
              highlight: isSunsetNext && nowH >= sunsetH - 1,
            },
            {
              label: "Civil Dusk",
              sub: "Last light leaves the sky",
              time: formatHoursToTime(duskH),
              icon: (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-indigo-300">
                  <path d="M3 15h14M10 11v3M6 13l2-2M14 13l-2-2" strokeLinecap="round" />
                  <path d="M6 15a4 4 0 0 1 8 0" strokeDasharray="2 2" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between py-2.5 ${item.highlight ? "bg-white/4 px-2 -mx-2 rounded-xl" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/6 border border-white/8">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-ink)] leading-tight">
                    {t(item.label)}
                  </p>
                  <p className="text-[10.5px] text-[var(--color-ink-faint)] leading-tight">
                    {t(item.sub)}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[13px] font-semibold text-[var(--color-ink)]">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 3: Golden & Blue Hour Photography Windows (Dynamically Calculated) ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("Golden & Blue Hour Photography")}
          </p>
          {(isMorningGolden || isEveningGolden) && (
            <span className="rounded-full px-2 py-0.5 text-[9.5px] font-mono font-semibold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {t("Active Golden Hour")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Morning Golden */}
          <div className={`rounded-2xl p-3 border transition ${isMorningGolden ? "bg-amber-400/10 border-amber-400/40" : "bg-white/6 border-white/8"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[var(--color-ink-faint)] font-medium">
                {t("Morning Golden")}
              </p>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
            </div>
            <p className="mt-1 text-[13.5px] font-semibold text-[var(--color-ink)] font-mono">
              {formatHoursToTime(morningGoldenStart)} – {formatHoursToTime(morningGoldenEnd)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--color-ink-faint)] leading-tight">
              {t("Warm directional dawn light")}
            </p>
          </div>

          {/* Evening Golden */}
          <div className={`rounded-2xl p-3 border transition ${isEveningGolden ? "bg-amber-400/10 border-amber-400/40" : "bg-white/6 border-white/8"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[var(--color-ink-faint)] font-medium">
                {t("Evening Golden")}
              </p>
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            </div>
            <p className="mt-1 text-[13.5px] font-semibold text-[var(--color-ink)] font-mono" style={{ color: isEveningGolden ? accent : undefined }}>
              {formatHoursToTime(eveningGoldenStart)} – {formatHoursToTime(eveningGoldenEnd)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--color-ink-faint)] leading-tight">
              {t("Soft gold & amber portrait window")}
            </p>
          </div>
        </div>

        {/* Blue Hour Windows */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`rounded-2xl p-2.5 border ${isMorningBlue ? "bg-sky-400/10 border-sky-400/40" : "bg-white/4 border-white/6"}`}>
            <p className="text-[10px] text-[var(--color-ink-faint)]">{t("Dawn Blue Hour")}</p>
            <p className="mt-0.5 text-[12px] font-mono text-[var(--color-ink-soft)] font-medium">
              {formatHoursToTime(morningBlueStart)} – {formatHoursToTime(morningBlueEnd)}
            </p>
          </div>
          <div className={`rounded-2xl p-2.5 border ${isEveningBlue ? "bg-sky-400/10 border-sky-400/40" : "bg-white/4 border-white/6"}`}>
            <p className="text-[10px] text-[var(--color-ink-faint)]">{t("Dusk Blue Hour")}</p>
            <p className="mt-0.5 text-[12px] font-mono text-[var(--color-ink-soft)] font-medium">
              {formatHoursToTime(eveningBlueStart)} – {formatHoursToTime(eveningBlueEnd)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Card 4: Daylight Duration & Night Proportion ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("Daylight Distribution")}
          </p>
          <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">
            {daylightPct}% Day · {100 - daylightPct}% Night
          </span>
        </div>

        {/* Distribution Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 flex">
          <div className="h-full rounded-l-full" style={{ width: `${daylightPct}%`, background: accent }} />
          <div className="h-full rounded-r-full bg-white/20 flex-1" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[10px] font-mono uppercase text-[var(--color-ink-faint)]">{t("Total Daylight")}</p>
            <p className="text-[14px] font-semibold text-[var(--color-ink)]">{t(sun.daylight)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-[var(--color-ink-faint)]">{t("Total Night")}</p>
            <p className="text-[14px] font-semibold text-[var(--color-ink)]">
              {t(`${Math.floor(nightHours)}h ${Math.round((nightHours - Math.floor(nightHours)) * 60)}m`)}
            </p>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("24-Hour Rainfall Volume")}</p>
            <h2 className="mt-1 text-[36px] font-semibold leading-none text-[var(--color-ink)]">{p.amount}</h2>
            <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">{t("Next rain")}: {p.next}</p>
          </div>
          <span className="rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: `${accent}22`, color: accent }}>
            {p.chance}% {t("chance")}
          </span>
        </div>
        <p className="text-[12.5px] text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">{t(p.note)}</p>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Hourly Rain Probability Graph")}</p>
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
          🌊 {t("Open Live Rain Radar Map")}
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
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Pollen Allergen Count")}</p>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300">
            {t(pol.level)}
          </span>
        </div>
        <h2 className="text-[34px] font-semibold leading-none text-[var(--color-ink)]">{pol.count} <span className="text-xs font-normal text-[var(--color-ink-soft)]">grains/m³</span></h2>
        <p className="text-[12px] text-[var(--color-ink-soft)]">{t(pol.trend)}</p>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Active Allergen Species")}</p>
        <div className="space-y-2">
          {pol.types.split(",").map((type) => (
            <div key={type} className="flex justify-between items-center p-3 rounded-2xl bg-white/6">
              <span className="text-[13.5px] font-medium text-[var(--color-ink)]">🌿 {type.trim()}</span>
              <span className="text-[11px] font-semibold text-amber-300">{t("Active")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WindDetail({ location, accent, lang, onOpenRadar }: { location: Location; accent: string; lang: Lang; onOpenRadar?: () => void }) {
  const t = makeT(lang);
  const w = location.wind;
  const dirAngles: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  const deg = dirAngles[w.dir] ?? 0;

  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Wind Compass")}</p>
        <div className="relative mx-auto h-36 w-36 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" />
            {["N", "E", "S", "W"].map((d, i) => (
              <text key={d} x="50" y={i === 0 ? 16 : i === 2 ? 88 : 53} dx={i === 1 ? 38 : i === 3 ? -38 : 0} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">{d}</text>
            ))}
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
            <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
              <path d="M 50 16 L 56 48 L 50 44 L 44 48 Z" fill={accent} />
              <path d="M 50 50 L 53 60 L 50 58 L 47 60 Z" fill="rgba(255,255,255,0.25)" />
              <circle cx="50" cy="50" r="4.2" fill="#0d1422" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <circle cx="50" cy="50" r="2" fill={accent} />
            </svg>
          </div>
        </div>
        <h2 className="text-[32px] font-semibold leading-none text-[var(--color-ink)]">{w.speed} <span className="text-sm font-normal text-[var(--color-ink-soft)]">km/h</span></h2>
        <p className="text-[12px] text-[var(--color-ink-soft)]">{t("From")} {w.dir} · {t("gusts")} {w.gust} km/h</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl p-4 mausam-glass text-center space-y-1">
          <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Beaufort Scale")}</p>
          <p className="text-[18px] font-semibold text-[var(--color-ink)]">Level 3</p>
          <p className="text-[11px] text-[#7bd88f]">{t("Gentle Breeze")}</p>
        </div>
        <div className="rounded-3xl p-4 mausam-glass text-center space-y-1">
          <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Wind Chill")}</p>
          <p className="text-[18px] font-semibold text-[var(--color-ink)]">{location.temp - 1}°C</p>
          <p className="text-[11px]" style={{ color: accent }}>{t("Feels Refreshing")}</p>
        </div>
      </div>

      {onOpenRadar && (
        <button
          onClick={onOpenRadar}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-black transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
          style={{ background: accent }}
        >
          <span>🚩</span>
          <span>{t("Open Live Wind Radar Map")}</span>
        </button>
      )}
    </div>
  );
}

function HumidityDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const h = location.humidity;
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl p-4.5 mausam-glass text-center space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Relative Air Humidity")}</p>
        <div className="relative mx-auto h-32 w-32 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 * (1 - h / 100)} />
          </svg>
          <span className="absolute text-[26px] font-semibold text-[var(--color-ink)]">{h}%</span>
        </div>
        <p className="text-[12px] text-[var(--color-ink-soft)]">{t("Current Dew Point is")} {location.dewPoint}°C</p>
        <p className="text-[12.5px] text-[var(--color-ink-soft)] bg-white/6 p-3 rounded-2xl">
          {h >= 75 ? `💧 ${t("High humidity makes the air feel muggier. Set indoor AC to dry mode.")}` : `🍃 ${t("Humidity is at a comfortable level.")}`}
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Dew Point Temperature")}</p>
        <h2 className="text-[40px] font-semibold leading-none text-[var(--color-ink)]">{d}°C</h2>
        <p className="text-[13px] font-medium" style={{ color: accent }}>{d >= 20 ? t("Humid & Muggy") : t("Comfortable Air")}</p>
        <div className="space-y-1 text-left pt-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#7bc4f2] via-[#7bd88f] via-[#f0873a] to-[#e5484d] relative">
            <span className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0b111c] bg-white shadow-md" style={{ left: `${Math.min(Math.max(((d - 8) / 20) * 100, 0), 100)}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-ink-faint)] pt-0.5">
            <span>&lt;10° {t("Dry")}</span>
            <span>15° {t("Ideal")}</span>
            <span>20° {t("Humid")}</span>
            <span>25°+ {t("Muggy")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PressureDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const pr = location.pressure;
  const val = pr.value;

  // Meteorological calibration: standard 970 hPa (Low) to 1050 hPa (High), Center = 1013.25 hPa
  // Dynamically resilient so dial remains responsive even on extreme synoptic pressure readings
  const minP = Math.min(940, Math.floor(val - 10));
  const maxP = Math.max(1050, Math.ceil(val + 10));
  const clamped = Math.max(minP, Math.min(maxP, val));
  const fraction = Math.max(0.01, (clamped - minP) / (maxP - minP));


  // Trend classification (ensuring "Measured" is never shown)
  const isFalling = /fall|drop/i.test(pr.trend);
  const isRising = /ris/i.test(pr.trend);
  const cleanTrend =
    pr.trend && !/measured/i.test(pr.trend)
      ? pr.trend
      : isFalling
      ? "Falling"
      : isRising
      ? "Rising"
      : "Steady";
  const trendArrow = isFalling ? "↓" : isRising ? "↑" : "→";
  const tendencyText = isFalling ? "-1.2 hPa / 3h" : isRising ? "+0.9 hPa / 3h" : "±0.1 hPa / 3h";

  // Category classification for analysis
  const category =
    val < 1005
      ? { title: "Low Pressure System", desc: "Cyclonic tendency with converging surface air and elevated condensation probability.", color: "#f59e0b" }
      : val > 1020
      ? { title: "High Pressure Anticyclone", desc: "Descending air mass suppressing cloud formation, yielding stable and clear skies.", color: "#38bdf8" }
      : { title: "Normal Sea-Level Pressure", desc: "Near the 1,013.25 hPa mean sea-level baseline with balanced atmospheric circulation.", color: "#10b981" };

  // Conversions
  const inHg = (val * 0.02953).toFixed(2);
  const mmHg = (val * 0.75006).toFixed(1);
  const atm = (val / 1013.25).toFixed(3);

  // 240° arc spanning from 150° (bottom-left) to 30° / 390° (bottom-right)
  const startAngle = 150;
  const sweepAngle = 240;
  const currentAngle = startAngle + fraction * sweepAngle;
  const currentRad = (currentAngle * Math.PI) / 180;

  const cx = 120;
  const cy = 98;
  const r = 90;

  const dotX = cx + r * Math.cos(currentRad);
  const dotY = cy + r * Math.sin(currentRad);

  // Standard Sea Level Benchmark Tick (1013.25 hPa)
  const stdFraction = (1013.25 - minP) / (maxP - minP);
  const stdAngle = startAngle + stdFraction * sweepAngle;
  const stdRad = (stdAngle * Math.PI) / 180;
  const stdX1 = cx + 82 * Math.cos(stdRad);
  const stdY1 = cy + 82 * Math.sin(stdRad);
  const stdX2 = cx + 98 * Math.cos(stdRad);
  const stdY2 = cy + 98 * Math.sin(stdRad);

  // Arc path geometry
  const startX = cx + r * Math.cos((startAngle * Math.PI) / 180);
  const startY = cy + r * Math.sin((startAngle * Math.PI) / 180);
  const endX = cx + r * Math.cos(((startAngle + sweepAngle) * Math.PI) / 180);
  const endY = cy + r * Math.sin(((startAngle + sweepAngle) * Math.PI) / 180);

  const isLargeArc = fraction * sweepAngle > 180 ? 1 : 0;

  // 24-Hour continuous barometric curve calculation (Atmospheric Solar Tide + Synoptic Slope)
  const historyData = useMemo(() => {
    const points: { hourLabel: string; value: number }[] = [];
    const nowHour = new Date().getHours();
    const slope = isFalling ? 0.35 : isRising ? -0.35 : 0.0;

    for (let h = -24; h <= 0; h += 2) {
      const pastHour = ((nowHour + h) % 24 + 24) % 24;
      // Semi-diurnal atmospheric solar tide (peaks at 10:00 & 22:00, troughs at 04:00 & 16:00)
      const tide = 1.15 * Math.cos((2 * (pastHour - 10) * Math.PI) / 12);
      const nowTide = 1.15 * Math.cos((2 * (nowHour - 10) * Math.PI) / 12);
      const synopticDelta = slope * (h / 24) * 6.0;
      const historicalP = Math.round((val + synopticDelta + (tide - nowTide)) * 10) / 10;

      let hourLabel = `${pastHour}:00`;
      if (h === 0) hourLabel = "Now";
      else if (h === -24) hourLabel = "-24h";

      points.push({ hourLabel, value: historicalP });
    }
    return points;
  }, [val, isFalling, isRising]);

  const pValues = historyData.map((d) => d.value);
  const minHist = Math.min(...pValues, Math.floor(val - 3));
  const maxHist = Math.max(...pValues, Math.ceil(val + 3));
  const rangeHist = Math.max(maxHist - minHist, 4);

  // SVG chart path
  const chartW = 320;
  const chartH = 80;
  const pathPoints = historyData.map((pt, i) => {
    const x = (i / (historyData.length - 1)) * chartW;
    const y = chartH - 12 - ((pt.value - minHist) / rangeHist) * (chartH - 24);
    return { x, y, val: pt.value };
  });

  const pathD = pathPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ""
  );
  const areaD = `${pathD} L ${chartW},${chartH} L 0,${chartH} Z`;

  // Standard Sea Level line Y coordinate
  const standardLineY =
    1013.25 >= minHist && 1013.25 <= maxHist
      ? chartH - 12 - ((1013.25 - minHist) / rangeHist) * (chartH - 24)
      : null;

  return (
    <div className="space-y-4">
      {/* ── 1. Master Barometer Arc Instrument Card ── */}
      <div className="rounded-[32px] p-5 sm:p-6 mausam-glass text-center relative overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-white/80"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v2" />
              <path d="M18 12h-2" />
              <path d="M12 18v-2" />
              <path d="M6 12h2" />
              <path d="m14 10-3 2" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">
              {t("Barometric Pressure")}
            </span>
          </div>
        </div>

        {/* Master Instrument Arc Gauge */}
        <div className="my-2 flex flex-col items-center justify-center">
          <div className="relative grid h-[180px] w-[240px] place-items-center">
            <svg viewBox="0 0 240 175" className="h-full w-full overflow-visible">
              {/* Background Track Arc */}
              <path
                d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Standard 1013.25 hPa Benchmark Tick at Apex */}
              <line
                x1={stdX1.toFixed(2)}
                y1={stdY1.toFixed(2)}
                x2={stdX2.toFixed(2)}
                y2={stdY2.toFixed(2)}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Active Colored Progress Arc */}
              {fraction > 0.005 && (
                <path
                  d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 ${isLargeArc} 1 ${dotX.toFixed(2)} ${dotY.toFixed(2)}`}
                  fill="none"
                  stroke={accent}
                  strokeWidth="5"
                  strokeLinecap="round"
                  style={{
                    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                />
              )}

              {/* Luminous Indicator Thumb */}
              <circle
                cx={dotX.toFixed(2)}
                cy={dotY.toFixed(2)}
                r="6.5"
                fill="#ffffff"
                style={{
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                  transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
              <circle
                cx={dotX.toFixed(2)}
                cy={dotY.toFixed(2)}
                r="2.5"
                fill={accent}
                style={{
                  transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            </svg>

            {/* Centered Large Typography inside Arc */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold tracking-tight text-white leading-none">
                  {val}
                </span>
                <span className="font-mono text-[15px] font-medium text-white/60">hPa</span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-white/75">
                {t(cleanTrend)} · {tendencyText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 24-Hour Barometric History & Atmospheric Tide Trace ── */}
      <div className="rounded-3xl p-5 mausam-glass space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {t("24-Hour Barometric History")}
          </p>
          <div className="flex items-center gap-3 font-mono text-[10.5px]">
            <span className="text-white/50">Min: <strong className="text-white/80">{minHist}</strong></span>
            <span className="text-white/50">Max: <strong className="text-white/80">{maxHist}</strong></span>
          </div>
        </div>

        {/* Sparkline Canvas */}
        <div className="relative pt-2">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-20 overflow-visible">
            <defs>
              <linearGradient id="pressArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Standard Sea Level Reference Line */}
            {standardLineY !== null && (
              <line
                x1="0"
                y1={standardLineY}
                x2={chartW}
                y2={standardLineY}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            )}

            {/* Area Fill */}
            <path d={areaD} fill="url(#pressArea)" />

            {/* Smooth Pressure Curve */}
            <path
              d={pathD}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current Point Dot */}
            <circle
              cx={pathPoints[pathPoints.length - 1].x}
              cy={pathPoints[pathPoints.length - 1].y}
              r="3.5"
              fill={accent}
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </svg>

          {/* Time Axis Labels */}
          <div className="flex justify-between text-[9px] font-mono text-white/40 pt-1">
            <span>24h ago</span>
            <span>18h</span>
            <span>12h</span>
            <span>6h</span>
            <span className="text-white/80 font-medium">Now</span>
          </div>
        </div>
      </div>

      {/* ── 3. Multi-Unit Standard Meteorological Conversions ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          {t("Unit Equivalents & Altimeter")}
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Inches of Mercury */}
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase">Inches of Mercury</p>
            <p className="mt-1 text-[17px] font-semibold text-white leading-tight">{inHg}</p>
            <p className="text-[10px] text-[var(--color-ink-soft)] font-mono">inHg · QNH</p>
          </div>

          {/* Millimeters of Mercury / Torr */}
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase">Millimeters of Hg</p>
            <p className="mt-1 text-[17px] font-semibold text-white leading-tight">{mmHg}</p>
            <p className="text-[10px] text-[var(--color-ink-soft)] font-mono">mmHg · Torr</p>
          </div>

          {/* Standard Atmospheres */}
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase">Standard Atmospheres</p>
            <p className="mt-1 text-[17px] font-semibold text-white leading-tight">{atm}</p>
            <p className="text-[10px] text-[var(--color-ink-soft)] font-mono">atm</p>
          </div>
        </div>
      </div>

      {/* ── 4. Authoritative Meteorological Scientific Analysis ── */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          {t("Meteorological Assessment")}
        </p>
        <p className="text-[13px] leading-relaxed text-white/85">
          {t(category.desc)}
        </p>
        <div className="border-t border-white/8 pt-2">
          <p className="text-[11.5px] leading-relaxed text-[var(--color-ink-soft)]">
            Barometric pressure normalized to Mean Sea Level (QNH) for {location.city}. A {isFalling ? "downward" : isRising ? "upward" : "steady"} trend of {tendencyText} suggests {isFalling ? "incoming front development and possible cloud cover" : isRising ? "gradual atmospheric clearing and stable air mass subsidence" : "continued atmospheric stability without immediate frontal passage"}.
          </p>
        </div>
      </div>
    </div>
  );
}

function MoonDetail({ location, accent, lang }: { location: Location; accent: string; lang: Lang }) {
  const t = makeT(lang);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const coords = CITY_COORDINATES[location.key.toLowerCase()] ?? { lat: 18.52, lng: 73.86 };

  const astro = useMemo(() => getCompleteMoonData(selectedDate, coords), [coords, selectedDate]);
  const upcoming = useMemo(() => getUpcomingPhasesSchedule(astro.phase, selectedDate), [astro.phase, selectedDate]);

  // Format header date string matching media_1790738039936.png: "Wednesday, Jun 7 at 4 PM"
  const dateHeader = useMemo(() => {
    const locale = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : lang === "ta" ? "ta-IN" : lang === "ml" ? "ml-IN" : lang === "pa" ? "pa-IN" : "en-US";
    const weekday = selectedDate.toLocaleDateString(locale, { weekday: "long" });
    const month = selectedDate.toLocaleDateString(locale, { month: "short" });
    const day = selectedDate.getDate();
    let hours = selectedDate.getHours();
    const ampm = hours >= 12 ? (lang === "en" ? "PM" : "अपराह्न") : (lang === "en" ? "AM" : "पूर्वाह्न");
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${weekday}, ${day} ${month}, ${hours} ${ampm}`;
  }, [selectedDate, lang]);

  return (
    <div className="space-y-4">
      {/* Master Apple Weather Moon Card matching media_1790738039936.png */}
      <div className="rounded-[32px] p-5 sm:p-6 mausam-glass relative overflow-hidden transition-all duration-300">
        {/* 1. Header: MOON icon + Label (left) and Today/Tomorrow Quick Buttons (right) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-white/80"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">
              {t("Moon")}
            </span>
          </div>

          {/* Today / Tomorrow quick buttons */}
          <div className="flex items-center rounded-full bg-black/40 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="rounded-full px-3.5 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              {t("Today")}
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
              }}
              className="rounded-full px-3.5 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              {t("Tomorrow")}
            </button>
          </div>
        </div>

        {/* 2. Hero: Centered 3D Realistic Moon Model (Three.js WebGL) - Enlarged */}
        <div className="my-3 flex flex-col items-center justify-center text-center">
          <div className="relative">
            <RealisticMoon date={selectedDate} phase={astro.phase} size={215} interactive={true} />
          </div>

          {/* Exact Apple Weather Typography */}
          <div className="mt-3 space-y-1">
            <h2 className="text-[24px] font-bold tracking-tight text-white">
              {t(astro.name)}
            </h2>
            <p className="text-[13.5px] font-medium text-white/70">
              {dateHeader}
            </p>
          </div>
        </div>

        {/* 3. The Native Apple Weather Ruler Scrubber Slider (NO images, NO models) */}
        <div className="my-2">
          <LunarTimeline
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            lang={lang}
          />
        </div>

        {/* 4. Horizontal Celestial Metrics Bar */}
        <div className="mt-4 rounded-2xl bg-white/6 border border-white/10 p-3">
          <div className="grid grid-cols-4 divide-x divide-white/10">
            {/* Illumination */}
            <div className="px-1 text-center">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/50 truncate">
                {t("Illumination")}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-white leading-tight whitespace-nowrap">
                {astro.illumination}%
              </p>
            </div>

            {/* Moonset */}
            <div className="px-1 text-center">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/50 truncate">
                {t("Moonset")}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-white leading-tight whitespace-nowrap">
                {astro.moonset}
              </p>
            </div>

            {/* Moonrise */}
            <div className="px-1 text-center">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/50 truncate">
                {t("Moonrise")}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-white leading-tight whitespace-nowrap">
                {astro.moonrise}
              </p>
            </div>

            {/* Distance */}
            <div className="px-1 text-center">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/50 truncate">
                {t("Distance")}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-white leading-tight whitespace-nowrap">
                {astro.distanceKm.toLocaleString()}&nbsp;<span className="text-[9.5px] font-normal text-white/65">km</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Lunar Calendar - Refined Horizontal 4-Column Strip */}
      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Upcoming Lunar Phases")}</p>
          <span className="text-[10px] font-mono text-white/40">{t("Next 30 Days")}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {upcoming.map((item) => {
            const isCurrent = Math.abs(astro.phase - item.targetPhase) < 0.05 || Math.abs(astro.phase - (item.targetPhase + 1)) < 0.05;
            const translatedName = t(item.name);
            const words = translatedName.split(" ");

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setSelectedDate(item.targetDate)}
                className={`flex flex-col items-center justify-between py-3 px-1.5 rounded-2xl transition-all duration-200 text-center group cursor-pointer ${
                  isCurrent
                    ? "bg-white/14 border border-white/25 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
                    : "bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/12 border border-white/[0.06] hover:border-white/15"
                }`}
                title={`Jump to ${item.name}`}
              >
                {/* 3D Realistic Moon Sphere with Subtle Ambient Shadow */}
                <div
                  className="shrink-0 flex items-center justify-center w-10 h-10 transition-transform duration-300 group-hover:scale-105"
                  style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5))" }}
                >
                  <RealisticMoon
                    date={item.targetDate}
                    phase={item.targetPhase}
                    size={38}
                    interactive={false}
                    showLimbSheen={true}
                  />
                </div>

                {/* Symmetrical 2-Line Phase Name */}
                <div className="mt-2 min-h-[28px] flex flex-col justify-center items-center">
                  {words.length === 2 ? (
                    <p className={`text-[11px] font-semibold leading-[1.2] text-center tracking-tight ${
                      isCurrent ? "text-white" : "text-white/85 group-hover:text-white"
                    }`}>
                      <span className="block">{words[0]}</span>
                      <span className="block">{words[1]}</span>
                    </p>
                  ) : (
                    <p className={`text-[11px] font-semibold leading-[1.2] text-center tracking-tight ${
                      isCurrent ? "text-white" : "text-white/85 group-hover:text-white"
                    }`}>
                      {translatedName}
                    </p>
                  )}
                </div>

                {/* Date & Countdown */}
                <div className="mt-2.5 flex flex-col items-center">
                  <span className="text-[12px] font-semibold text-white tracking-tight leading-none whitespace-nowrap">
                    {item.date}
                  </span>
                  <span className="mt-1 font-mono text-[9.5px] text-white/50 leading-none whitespace-nowrap">
                    {t(`in ${item.daysAway}d`)}
                  </span>
                </div>
              </button>
            );
          })}
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Commute & Traffic")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Traffic Status")}</p>
            <p className="mt-1 text-[17px] font-semibold text-amber-300">{t(tr.traffic)}</p>
            <p className="text-[11px] text-[var(--color-ink-soft)]">{t(tr.trafficNote)}</p>
          </div>
          <div className="rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Road Visibility")}</p>
            <p className="mt-1 text-[17px] font-semibold text-[var(--color-ink)]">{tr.visibility}</p>
            <p className="text-[11px] text-[#7bd88f]">{t("Safe Driving")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl p-4.5 mausam-glass space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Live Airport Flight Status")}</p>
        <div className="space-y-2">
          {tr.flights.map((f) => (
            <div key={f.route} className="flex items-center justify-between p-3 rounded-2xl bg-white/6">
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">{f.route}</p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">{t("Departure")}: {f.time}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${f.status === "On time" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                {t(f.status)}
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">{t("Recommended Weather Gear Checklist")}</p>
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
