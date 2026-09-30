import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import Home from "./mausam/Home";
import { Onboarding, Menu, Chat, Alerts } from "./mausam/screens";
import { locations, type UserTypeKey, type Location } from "./mausam/data";
import { fetchWeather, isLiveData } from "./data/openMeteo";
import { getWeatherTheme, DEV_TIME_OVERRIDE } from "./mausam/theme";
import { usePhotoAccent } from "./mausam/useAccent";
import type { Lang } from "./mausam/i18n";
import { useProfile, type Interest } from "./engine/profile";
import { initWeights } from "./engine/weights";
import type { AlertOverride } from "./engine/ranking";
import DemoPanel from "./demo/DemoPanel";
import BackgroundEngine, {
  type TimeOfDayPhase,
  type EnvironmentalWeatherCondition,
} from "./mausam/background";

type Screen = "usertype" | "home" | "menu" | "chat" | "alerts";

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("mausam_lang");
      if (saved && ["en", "hi", "te", "ta", "ml", "pa"].includes(saved)) {
        return saved as Lang;
      }
      const prof = localStorage.getItem("mausam_profile");
      if (prof) {
        const p = JSON.parse(prof);
        if (p.language && ["en", "hi", "te", "ta", "ml", "pa"].includes(p.language)) {
          return p.language as Lang;
        }
      }
    } catch {}
    return "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("mausam_lang", l);
    } catch {}
  }, []);
  const [userType, setUserType] = useState<UserTypeKey>("fitness");
  const [locationKey, setLocationKey] = useState<string>("pune");
  const [screen, setScreen] = useState<Screen>("home");
  const [pending, setPending] = useState<UserTypeKey | null>("fitness");
  const [onboarded, setOnboarded] = useState(false);
  const [alertOverrides, setAlertOverrides] = useState<AlertOverride[]>([]);

  const { updateProfile } = useProfile();

  // Simulated hour state for testing (null = system clock, DEV_TIME_OVERRIDE = code setting)
  const [simulatedHour, setSimulatedHour] = useState<number | null>(DEV_TIME_OVERRIDE);
  const [simulatedCondition, setSimulatedCondition] = useState<EnvironmentalWeatherCondition | null>(null);
  const [simulatedPhase, setSimulatedPhase] = useState<TimeOfDayPhase | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [liveLocation, setLiveLocation] = useState<Location | null>(null);
  const [usingLiveData, setUsingLiveData] = useState(false);
  const [chatInitialQ, setChatInitialQ] = useState<string | undefined>(undefined);

  // Ensure browser title has no em dash
  useEffect(() => {
    document.title = "Mausam - Apple Weather Inspired Forecast";
  }, []);

  // Sync UI state → profile
  useEffect(() => {
    updateProfile((p) => ({ ...p, language: lang, city: locationKey }));
  }, [lang, locationKey, updateProfile]);

  // Fetch live weather from Open-Meteo
  const fetchLive = useCallback(async () => {
    const data = await fetchWeather(locationKey);
    if (data) {
      setLiveLocation(data);
      setUsingLiveData(true);
    } else {
      setUsingLiveData(false);
    }
  }, [locationKey]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  const [weatherOverride, setWeatherOverride] = useState<Partial<Location> | null>(null);
  const mockLocation = locations.find((l) => l.key === locationKey) ?? locations[0];
  const baseLocation = liveLocation && liveLocation.key === locationKey ? liveLocation : mockLocation;
  const location = useMemo<Location>(() => {
    if (!weatherOverride) return baseLocation;
    return {
      ...baseLocation,
      ...weatherOverride,
      wind: { ...baseLocation.wind, ...(weatherOverride.wind ?? {}) },
      air: { ...baseLocation.air, ...(weatherOverride.air ?? {}) },
      precip: { ...baseLocation.precip, ...(weatherOverride.precip ?? {}) },
    };
  }, [baseLocation, weatherOverride]);
  const currentHour = simulatedHour ?? (DEV_TIME_OVERRIDE ?? new Date().getHours());
  const theme = getWeatherTheme(location.condition, currentHour);

  // Accent is sampled live from the weather photo, so the whole UI recolors
  // to match the sky. Falls back to the curated per-condition accent.
  const accent = usePhotoAccent(theme.photo, theme.accent);

  const isProfileSelection = !onboarded || screen === "usertype";

  // Whole-app theme follows the current location's weather & time of day (or pure black for profile selection)
  const deviceStyle: CSSProperties = {
    height: "100dvh",
    maxHeight: "min(900px, 100dvh)",
    background: isProfileSelection ? "#000000" : theme.solid,
    ["--wx-bg-solid" as string]: isProfileSelection ? "#000000" : theme.solid,
    ["--wx-accent" as string]: accent,
    transition: "background 0.6s ease",
  };

  const formattedTimeLabel = useMemo(() => {
    if (simulatedHour === null) return "9:41";
    let h = Math.floor(simulatedHour);
    const m = Math.round((simulatedHour - h) * 60);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
  }, [simulatedHour]);

  return (
    <div className="flex min-h-[100dvh] items-stretch justify-center bg-[#020306] sm:items-center sm:py-6">
      <div
        className="mausam-device relative w-full overflow-hidden text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] sm:w-[410px] sm:rounded-[44px] border border-white/10"
        style={deviceStyle}
      >
        {/* Dynamic Environmental Background Engine - active on home & weather screens */}
        {!isProfileSelection && (
          <BackgroundEngine
            location={location}
            currentHour={currentHour}
            conditionOverride={simulatedCondition ?? undefined}
            timePhaseOverride={simulatedPhase ?? undefined}
          />
        )}

        {/* Status bar - clicking the time opens the unofficial time switcher */}
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-7 pt-3.5 text-[13px] font-semibold text-white pointer-events-auto">
          <button
            onClick={() => setShowTimePicker((s) => !s)}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold font-mono tracking-tight transition hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md"
            title="Click to toggle Time of Day & Environmental Preview"
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

        {/* ── Unofficial Time & Environmental Atmosphere Changer ── */}
        {showTimePicker && (
          <>
            <button
              className="absolute inset-0 z-50 cursor-default bg-black/40 backdrop-blur-[3px]"
              aria-label="Close time switcher"
              onClick={() => setShowTimePicker(false)}
            />
            <div className="animate-insight absolute left-1/2 top-12 z-50 w-[340px] max-h-[85vh] overflow-y-auto scroll-hide -translate-x-1/2 rounded-3xl border border-white/20 bg-[color:rgba(10,14,24,0.96)] p-4 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-center">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">⚡ Environmental Engine</span>
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="grid h-6 w-6 place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xs"
                >
                  ✕
                </button>
              </div>

              {/* 24-Hour Continuous Solar Scrubber Slider */}
              <div className="mb-3 rounded-2xl bg-white/5 p-2.5 text-left border border-white/8">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/80 mb-1">
                  <span>Solar Scrubber</span>
                  <span className="font-bold text-amber-300">{formattedTimeLabel}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23.9"
                  step="0.1"
                  value={simulatedHour ?? 12}
                  onChange={(e) => {
                    setSimulatedHour(parseFloat(e.target.value));
                    setSimulatedPhase(null);
                  }}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* 9 Canonical Time of Day Phases */}
              <p className="text-[11px] text-white/60 mb-2 text-left font-mono uppercase tracking-wider">Time of Day (9 Phases):</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { label: "🌌 Pre-dawn", sub: "4:45 AM", hour: 4.75, phase: "pre-dawn" as TimeOfDayPhase },
                  { label: "🌅 Sunrise", sub: "6:05 AM", hour: 6.1, phase: "sunrise" as TimeOfDayPhase },
                  { label: "☀️ Morning", sub: "9:00 AM", hour: 9.0, phase: "morning" as TimeOfDayPhase },
                  { label: "🌞 Midday", sub: "12:30 PM", hour: 12.5, phase: "midday" as TimeOfDayPhase },
                  { label: "🌤️ Afternoon", sub: "3:30 PM", hour: 15.5, phase: "afternoon" as TimeOfDayPhase },
                  { label: "🌇 Golden", sub: "5:30 PM", hour: 17.5, phase: "golden-hour" as TimeOfDayPhase },
                  { label: "🌆 Sunset", sub: "6:15 PM", hour: 18.25, phase: "sunset" as TimeOfDayPhase },
                  { label: "🏙️ Dusk", sub: "7:00 PM", hour: 19.0, phase: "dusk" as TimeOfDayPhase },
                  { label: "🌙 Night", sub: "10:30 PM", hour: 22.5, phase: "night" as TimeOfDayPhase },
                ].map((t) => {
                  const active = simulatedPhase === t.phase || (simulatedHour !== null && Math.abs(simulatedHour - t.hour) < 0.6);
                  return (
                    <button
                      key={t.phase}
                      onClick={() => {
                        setSimulatedHour(t.hour);
                        setSimulatedPhase(t.phase);
                      }}
                      className="rounded-xl p-1.5 text-left transition active:scale-95"
                      style={{
                        background: active ? `${accent}33` : "rgba(255,255,255,0.06)",
                        border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="block text-[11px] font-semibold text-white leading-tight">{t.label}</span>
                      <span className="block text-[9.5px] opacity-60 text-white font-mono">{t.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Weather State Selector */}
              <p className="text-[11px] text-white/60 mb-2 text-left font-mono uppercase tracking-wider">Weather Conditions:</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {[
                  { label: "☀️ Clear", cond: "clear" as EnvironmentalWeatherCondition },
                  { label: "⛅ Partly Cloudy", cond: "partly-cloudy" as EnvironmentalWeatherCondition },
                  { label: "☁️ Cloudy", cond: "cloudy" as EnvironmentalWeatherCondition },
                  { label: "🌫️ Overcast", cond: "overcast" as EnvironmentalWeatherCondition },
                  { label: "🌧️ Rain", cond: "rain" as EnvironmentalWeatherCondition },
                  { label: "⛈️ Heavy Rain", cond: "heavy-rain" as EnvironmentalWeatherCondition },
                  { label: "⚡ Thunderstorm", cond: "thunderstorm" as EnvironmentalWeatherCondition },
                  { label: "🌁 Fog / Mist", cond: "fog" as EnvironmentalWeatherCondition },
                  { label: "💨 Haze / Dust", cond: "haze" as EnvironmentalWeatherCondition },
                  { label: "❄️ Snow", cond: "snow" as EnvironmentalWeatherCondition },
                ].map((w) => {
                  const active = simulatedCondition === w.cond;
                  return (
                    <button
                      key={w.cond}
                      onClick={() => setSimulatedCondition(w.cond)}
                      className="rounded-xl px-2 py-1.5 text-left transition active:scale-95"
                      style={{
                        background: active ? `${accent}33` : "rgba(255,255,255,0.06)",
                        border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-[11px] font-medium text-white">{w.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Reset to live button */}
              <button
                onClick={() => {
                  setSimulatedHour(null);
                  setSimulatedCondition(null);
                  setSimulatedPhase(null);
                  setShowTimePicker(false);
                }}
                className="w-full rounded-xl bg-white/10 py-2 text-[11px] font-mono uppercase tracking-wider text-white/80 hover:bg-white/20 transition active:scale-95 border border-white/10"
              >
                ⚡ Reset to Live Clock & Weather
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
                const interests = [pending as Interest];
                updateProfile((p) => ({
                  ...p,
                  selectedInterests: interests,
                  interestWeights: initWeights(interests),
                }));
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
              onChat={() => { setChatInitialQ(undefined); setScreen("chat"); }}
              onAskWhy={(q) => { setChatInitialQ(q); setScreen("chat"); }}
              onAlerts={() => setScreen("alerts")}
              onSelectLocation={setLocationKey}
              alertOverrides={alertOverrides}
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
              <div className="absolute inset-0 z-40 bg-black" style={{ background: "#000000" }}>
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
                      const interests = [pending as Interest];
                      updateProfile((p) => ({
                        ...p,
                        selectedInterests: interests,
                        interestWeights: initWeights(interests),
                      }));
                    }
                  }}
                />
              </div>
            )}

            {screen === "chat" && (
              <div className="absolute inset-0 z-40 bg-[#0b101b]">
                <Chat
                  lang={lang}
                  accent={accent}
                  location={location}
                  initialQ={chatInitialQ}
                  onClose={() => setScreen("home")}
                />
              </div>
            )}

            {screen === "alerts" && (
              <div className="absolute inset-0 z-40 bg-black" style={{ background: "#000000" }}>
                <Alerts lang={lang} accent={accent} location={location} onClose={() => setScreen("home")} />
              </div>
            )}
          </>
        )}
      </div>
      {onboarded && (
        <DemoPanel
          lang={lang}
          location={location}
          onSetAlertOverrides={setAlertOverrides}
          weatherOverride={weatherOverride}
          onSetWeatherOverride={setWeatherOverride}
        />
      )}
      {/* Offline data badge */}
      {onboarded && !usingLiveData && (
        <div className="fixed top-2 right-2 z-[100] rounded-full bg-yellow-600/80 px-2 py-0.5 text-[9px] font-mono text-white">
          {lang === "hi" ? "ऑफ़लाइन डेटा" : "offline data"}
        </div>
      )}
    </div>
  );
}
