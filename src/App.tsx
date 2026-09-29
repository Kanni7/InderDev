import { useState, type CSSProperties } from "react";
import Home from "./mausam/Home";
import { Onboarding, Menu, Chat, Alerts } from "./mausam/screens";
import { locations, type UserTypeKey } from "./mausam/data";
import { getWeatherTheme, DEV_TIME_OVERRIDE } from "./mausam/theme";
import { usePhotoAccent } from "./mausam/useAccent";
import type { Lang } from "./mausam/i18n";

type Screen = "usertype" | "home" | "menu" | "chat" | "alerts";

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [userType, setUserType] = useState<UserTypeKey>("fitness");
  const [locationKey, setLocationKey] = useState<string>("pune");
  const [screen, setScreen] = useState<Screen>("home");
  const [pending, setPending] = useState<UserTypeKey | null>("fitness");
  const [onboarded, setOnboarded] = useState(false);

  // Simulated hour state for testing (null = system clock, DEV_TIME_OVERRIDE = code setting)
  const [simulatedHour, setSimulatedHour] = useState<number | null>(DEV_TIME_OVERRIDE);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const location = locations.find((l) => l.key === locationKey) ?? locations[0];
  const currentHour = simulatedHour ?? (DEV_TIME_OVERRIDE ?? new Date().getHours());
  const theme = getWeatherTheme(location.condition, currentHour);

  // Accent is sampled live from the weather photo, so the whole UI recolors
  // to match the sky. Falls back to the curated per-condition accent.
  const accent = usePhotoAccent(theme.photo, theme.accent);

  // Whole-app theme follows the current location's weather & time of day
  const deviceStyle: CSSProperties = {
    height: "100dvh",
    maxHeight: "min(900px, 100dvh)",
    background: theme.solid,
    ["--wx-bg-solid" as string]: theme.solid,
    ["--wx-accent" as string]: accent,
    transition: "background 0.6s ease",
  };

  const formattedTimeLabel =
    simulatedHour !== null
      ? simulatedHour === 6
        ? "6:00 AM"
        : simulatedHour === 12
        ? "12:00 PM"
        : simulatedHour === 18
        ? "6:30 PM"
        : "10:00 PM"
      : "9:41";

  return (
    <div className="flex min-h-[100dvh] items-stretch justify-center bg-[#020306] sm:items-center sm:py-6">
      <div
        className="mausam-device relative w-full overflow-hidden text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] sm:w-[410px] sm:rounded-[44px] border border-white/10"
        style={deviceStyle}
      >
        {/* Active sky photo background — exact transparency & clarity from Image 2 reference */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8, 12, 20, 0.25) 0%, rgba(6, 10, 16, 0.10) 45%, rgba(4, 6, 10, 0.55) 100%), url(${theme.photo})`,
          }}
        />

        {/* Status bar — clicking the time opens the unofficial time switcher */}
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-7 pt-3.5 text-[13px] font-semibold text-white pointer-events-auto">
          <button
            onClick={() => setShowTimePicker((s) => !s)}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold font-mono tracking-tight transition hover:bg-white/20 active:scale-95 border border-white/15"
            title="Click to toggle Time of Day preview"
          >
            <span>{formattedTimeLabel}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono pointer-events-none">
            <span className="tracking-tight text-white/90">5G</span>
            <span className="inline-block h-2.5 w-5 rounded-[4px] border border-white/70 relative">
              <span className="absolute inset-0.5 rounded-[2px] bg-white" />
            </span>
          </div>
        </div>

        {/* ── Unofficial Time Changer Floating Panel ── */}
        {showTimePicker && (
          <>
            <button
              className="absolute inset-0 z-50 cursor-default bg-black/30 backdrop-blur-[2px]"
              aria-label="Close time switcher"
              onClick={() => setShowTimePicker(false)}
            />
            <div className="animate-insight absolute left-1/2 top-12 z-50 w-[310px] -translate-x-1/2 rounded-3xl border border-white/20 bg-[color:rgba(12,18,28,0.96)] p-4 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">⚡ Time Changer</span>
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="grid h-6 w-6 place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-[12px] text-white/70 mb-3">Preview weather sky & background photos across different times of day:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "🌅 Dawn", sub: "5 AM – 7 AM", hour: 6 },
                  { label: "☀️ Day", sub: "8 AM – 4 PM", hour: 12 },
                  { label: "🌇 Sunset", sub: "5 PM – 7 PM", hour: 18 },
                  { label: "🌙 Night", sub: "8 PM – 4 AM", hour: 22 },
                ].map((t) => {
                  const active = currentHour === t.hour;
                  return (
                    <button
                      key={t.hour}
                      onClick={() => {
                        setSimulatedHour(t.hour);
                        setShowTimePicker(false);
                      }}
                      className="rounded-2xl p-2.5 text-left transition active:scale-95"
                      style={{
                        background: active ? `${accent}33` : "rgba(255,255,255,0.08)",
                        border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span className="block text-xs font-semibold text-white">{t.label}</span>
                      <span className="block text-[10px] opacity-60 text-white">{t.sub}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setSimulatedHour(null);
                  setShowTimePicker(false);
                }}
                className="mt-3 w-full rounded-xl bg-white/10 py-2 text-[11px] font-mono uppercase tracking-wider text-white/70 hover:bg-white/20 transition active:scale-95"
              >
                ⚡ Reset to Live Clock ({new Date().getHours()}:00)
              </button>
            </div>
          </>
        )}

        {!onboarded ? (
          <Onboarding
            lang={lang}
            accent={accent}
            value={pending}
            onChange={setPending}
            onContinue={() => {
              if (pending) {
                setUserType(pending);
                setOnboarded(true);
                setScreen("home");
              }
            }}
          />
        ) : (
          <>
            <Home
              userType={userType}
              location={location}
              accent={accent}
              lang={lang}
              currentHour={currentHour}
              onMenu={() => setScreen("menu")}
              onChat={() => setScreen("chat")}
              onAlerts={() => setScreen("alerts")}
              onSelectLocation={setLocationKey}
            />

            {screen === "menu" && (
              <Menu
                lang={lang}
                city={location.city}
                accent={accent}
                onSetLang={setLang}
                onUserType={() => {
                  setPending(userType);
                  setScreen("usertype");
                }}
                onClose={() => setScreen("home")}
              />
            )}

            {screen === "usertype" && (
              <div className="absolute inset-0 z-40">
                <Onboarding
                  lang={lang}
                  accent={accent}
                  value={pending}
                  onChange={setPending}
                  onBack={() => setScreen("home")}
                  onContinue={() => {
                    if (pending) {
                      setUserType(pending);
                      setScreen("home");
                    }
                  }}
                />
              </div>
            )}

            {screen === "chat" && (
              <div className="absolute inset-0 z-40">
                <Chat lang={lang} accent={accent} onClose={() => setScreen("home")} />
              </div>
            )}

            {screen === "alerts" && (
              <div className="absolute inset-0 z-40">
                <Alerts lang={lang} accent={accent} location={location} onClose={() => setScreen("home")} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
