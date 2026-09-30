import { useState, useRef, useCallback, useEffect } from "react";
import { useProfile, ALL_INTERESTS, type Interest, defaultActivitySignals } from "../engine/profile";
import { initWeights, runDayUpdate, updateWeights } from "../engine/weights";
import { getModuleScores } from "../engine/ranking";
import { scenarios, type ScenarioDay } from "./scenarios";
import { makeT, type Lang } from "../mausam/i18n";
import type { Location } from "../mausam/data";
import type { AlertOverride } from "../engine/ranking";
import { parseActivityText } from "../engine/activityParser";
import { runLSTMInference, initLSTMState, type LSTMState, type LSTMInferenceResult } from "../engine/lstmModel";

const INTEREST_LABELS: Record<Interest, { en: string; hi: string }> = {
  health: { en: "Health", hi: "स्वास्थ्य" },
  fitness: { en: "Fitness", hi: "फ़िटनेस" },
  beach: { en: "Beach", hi: "समुद्र" },
  traveler: { en: "Travel", hi: "यात्री" },
  parent: { en: "Family", hi: "परिवार" },
  agri: { en: "Agriculture", hi: "कृषि" },
  commuter: { en: "Commute", hi: "यात्रा" },
  event: { en: "Events", hi: "आयोजन" },
};

const BAR_COLORS: Record<Interest, string> = {
  health: "#7bd88f",
  fitness: "#f5a623",
  beach: "#6ea8d8",
  traveler: "#a855f7",
  parent: "#f0873a",
  agri: "#4ade80",
  commuter: "#e5484d",
  event: "#f2c53d",
};

export default function DemoPanel({
  lang,
  location,
  onSetAlertOverrides,
}: {
  lang: Lang;
  location: Location;
  onSetAlertOverrides: (a: AlertOverride[]) => void;
}) {
  const t = makeT(lang);
  const { profile, updateProfile, setProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [scenarioState, setScenarioState] = useState<{
    id: string;
    dayIndex: number;
    playing: boolean;
    paused: boolean;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Activity signal buttons - immediately recalculate weights for instant feedback
  const addSignal = (key: keyof typeof profile.activitySignals, amount: number) => {
    updateProfile((p) => {
      const updated = {
        ...p,
        activitySignals: {
          ...p.activitySignals,
          [key]: p.activitySignals[key] + amount,
        },
      };
      return { ...updated, interestWeights: updateWeights(updated) };
    });
  };

  // Location context buttons - immediately recalculate weights
  const setLocationCtx = (ctx: typeof profile.locationContext) => {
    updateProfile((p) => {
      const updated = { ...p, locationContext: ctx };
      return { ...updated, interestWeights: updateWeights(updated) };
    });
  };

  // Simulate 1 day
  const simulateDay = () => {
    updateProfile((p) => runDayUpdate(p));
  };

  // Reset profile
  const resetProfile = () => {
    lstmStateRef.current = initLSTMState();
    setLastLSTMResult(null);
    const fresh = {
      ...profile,
      interestWeights: initWeights(profile.selectedInterests),
      activitySignals: defaultActivitySignals(),
      moduleInteractions: {},
      askWhyTopics: {},
      dayCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    setProfile(fresh);
    onSetAlertOverrides([]);
    stopScenario();
  };

  // Alert buttons
  const triggerAlert = (tier: "warning" | "critical") => {
    const moduleId = tier === "critical" ? "precip" : "air";
    onSetAlertOverrides([{ moduleId, tier }]);
  };
  const clearAlerts = () => onSetAlertOverrides([]);

  // Scenario playback
  const stopScenario = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setScenarioState(null);
  }, []);

  const applyScenarioDay = useCallback((day: ScenarioDay) => {
    updateProfile((p) => {
      const signals = { ...p.activitySignals };
      if (day.runningMin !== undefined) signals.runningMin += day.runningMin;
      if (day.walkingMin !== undefined) signals.walkingMin += day.walkingMin;
      if (day.cyclingMin !== undefined) signals.cyclingMin += day.cyclingMin;
      if (day.vehicleCommuteMin !== undefined) signals.vehicleCommuteMin += day.vehicleCommuteMin;
      if (day.vehicleLongTripMin !== undefined) signals.vehicleLongTripMin += day.vehicleLongTripMin;
      if (day.schoolRunWalks !== undefined) signals.schoolRunWalks += day.schoolRunWalks;
      const moduleInteractions = { ...p.moduleInteractions };
      for (const [mod, n] of Object.entries(day.taps ?? {})) {
        const cur = moduleInteractions[mod] ?? { taps: 0, scrollPasts: 0 };
        moduleInteractions[mod] = { ...cur, taps: cur.taps + n };
      }
      const askWhyTopics = { ...p.askWhyTopics };
      for (const [topic, n] of Object.entries(day.askWhy ?? {})) {
        askWhyTopics[topic] = (askWhyTopics[topic] ?? 0) + (n ?? 0);
      }
      return {
        ...p,
        activitySignals: signals,
        moduleInteractions,
        askWhyTopics,
        locationContext: day.locationContext ?? p.locationContext,
      };
    });
    if (day.alert) {
      onSetAlertOverrides([{ moduleId: day.alert.moduleId as import("../mausam/data").Block, tier: day.alert.tier as "warning" | "critical" }]);
    } else {
      onSetAlertOverrides([]);
    }
  }, [updateProfile, onSetAlertOverrides]);

  const playScenario = useCallback((id: string) => {
    stopScenario();
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;

    // Reset and set start interests
    const freshProfile = {
      ...profile,
      selectedInterests: scenario.startInterests,
      interestWeights: initWeights(scenario.startInterests),
      activitySignals: defaultActivitySignals(),
      moduleInteractions: {},
      askWhyTopics: {},
      dayCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    setProfile(freshProfile);
    onSetAlertOverrides([]);
    setScenarioState({ id, dayIndex: 0, playing: true, paused: false });
  }, [profile, setProfile, onSetAlertOverrides, stopScenario]);

  // Timer effect for scenario playback
  useEffect(() => {
    if (!scenarioState || !scenarioState.playing || scenarioState.paused) return;

    const scenario = scenarios.find((s) => s.id === scenarioState.id);
    if (!scenario) return;

    if (scenarioState.dayIndex >= scenario.days.length) {
      stopScenario();
      return;
    }

    timerRef.current = setInterval(() => {
      setScenarioState((prev) => {
        if (!prev || !prev.playing || prev.paused) return prev;
        const sc = scenarios.find((s) => s.id === prev.id);
        if (!sc || prev.dayIndex >= sc.days.length) {
          stopScenario();
          return null;
        }
        applyScenarioDay(sc.days[prev.dayIndex]);
        // Run day update after applying signals
        updateProfile((p) => runDayUpdate(p));
        const nextDay = prev.dayIndex + 1;
        if (nextDay >= sc.days.length) {
          return { ...prev, dayIndex: nextDay, playing: false };
        }
        return { ...prev, dayIndex: nextDay };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scenarioState?.playing, scenarioState?.paused, scenarioState?.dayIndex, scenarioState?.id, applyScenarioDay, updateProfile, stopScenario]);

  const togglePause = () => {
    setScenarioState((prev) => prev ? { ...prev, paused: !prev.paused } : null);
  };

  // Module scores for display
  const topModules = getModuleScores(profile.interestWeights, location).slice(0, 5);

  // Weight bar chart data
  const sortedWeights = ALL_INTERESTS
    .map((i) => ({ interest: i, weight: profile.interestWeights[i] }))
    .sort((a, b) => b.weight - a.weight);

  const scenarioLabel = scenarioState
    ? (() => {
        const sc = scenarios.find((s) => s.id === scenarioState.id);
        return sc ? (lang === "hi" ? sc.nameHi : sc.name) : "";
      })()
    : "";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[100] rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/25 transition active:scale-95"
      >
        Demo
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <button
        className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-[2px] sm:hidden"
        onClick={() => setOpen(false)}
        aria-label="Close demo panel"
      />
      <div className="fixed z-[100] bottom-0 left-0 right-0 sm:bottom-auto sm:top-4 sm:left-4 sm:right-auto sm:w-[340px] max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[color:rgba(8,14,24,0.96)] text-white shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)] sm:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[color:rgba(8,14,24,0.98)]">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
            {lang === "hi" ? "सिम्युलेटेड सेंसर सिग्नल (प्रोटोटाइप)" : "Simulated sensor signals (prototype)"}
          </span>
          <button onClick={() => setOpen(false)} className="grid h-6 w-6 place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 text-xs">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Scenario status */}
          {scenarioState && (
            <div className="rounded-xl bg-white/8 p-3 border border-white/10 text-center">
              <p className="text-xs text-white/70">
                {t("Day")} {scenarioState.dayIndex} · {scenarioLabel}
              </p>
              {scenarioState.playing && (
                <div className="flex gap-2 mt-2 justify-center">
                  <button onClick={togglePause} className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium hover:bg-white/20 transition">
                    {scenarioState.paused ? (lang === "hi" ? "जारी रखें" : "Resume") : (lang === "hi" ? "रोकें" : "Pause")}
                  </button>
                  <button onClick={stopScenario} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-500/30 transition">
                    {lang === "hi" ? "रीसेट" : "Reset"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Weight bar chart */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "रुचि भार" : "Interest Weights"}
            </h4>
            <div className="space-y-1.5">
              {sortedWeights.map(({ interest, weight }) => (
                <div key={interest} className="flex items-center gap-2">
                  <span className="w-16 text-[10px] text-white/70 truncate">
                    {lang === "hi" ? INTEREST_LABELS[interest].hi : INTEREST_LABELS[interest].en}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.round(weight * 100)}%`,
                        background: BAR_COLORS[interest],
                        minWidth: weight > 0 ? "2px" : "0",
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-[10px] font-mono text-white/60">
                    {(weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 modules */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "शीर्ष 5 मॉड्यूल" : "Current top 5 modules"}
            </h4>
            <div className="space-y-1">
              {topModules.map(({ block, score }, idx) => (
                <div key={block} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-white/40 font-mono">{idx + 1}.</span>
                  <span className="flex-1 text-white/80">{block}</span>
                  <span className="font-mono text-white/50">{score.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Activity Weight Predictor (LSTM Neural Model) */}
          <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-transparent p-3 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-sky-300 flex items-center gap-1.5">
                <span>⚡</span>
                <span>{lang === "hi" ? "AI गतिविधि मॉडल (LSTM)" : "AI Activity Model (LSTM)"}</span>
              </h4>
              <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30">
                Non-linear Recurrent
              </span>
            </div>

            <p className="text-[10.5px] text-white/60 leading-tight">
              {lang === "hi"
                ? "गतिविधि दर्ज करें (उदा. 30 min cycling बनाम 1 hour cycling) और देखें कि LSTM मॉडल भार को कैसे अलग-अलग अपडेट करता है:"
                : "Enter an activity (e.g. 30 min cycling vs 1 hour cycling) to test non-linear weight adaptation:"}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunLSTM();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                placeholder={lang === "hi" ? "उदा. 30 min cycling या 1 hour run..." : "e.g. 30 min cycling, 1 hour run..."}
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11.5px] text-white outline-none placeholder:text-white/35 focus:border-sky-400 focus:bg-white/15 transition"
              />
              <button
                type="submit"
                className="rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-95 px-3 py-2 text-[11px] font-semibold text-slate-950 transition shrink-0 shadow-md"
              >
                {lang === "hi" ? "अपडेट करें" : "Update"}
              </button>
            </form>

            {/* Quick Presets for Instant 30m vs 60m Comparison */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { label: "30m Cycling", text: "30 min cycling" },
                { label: "1h Cycling", text: "1 hour cycling" },
                { label: "45m Run", text: "45 min run" },
                { label: "2h Commute", text: "2 hour commute" },
                { label: "3h Road Trip", text: "3 hour road trip" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleRunLSTM(chip.text)}
                  className="rounded-lg bg-white/8 hover:bg-sky-500/20 hover:border-sky-400/40 active:scale-95 px-2 py-1 text-[9.5px] font-mono text-white/80 border border-white/8 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Live Model Inference Feedback */}
            {lastLSTMResult && (
              <div className="rounded-xl bg-black/50 border border-sky-400/25 p-2.5 text-[10.5px] space-y-1.5">
                <div className="flex items-center justify-between text-white/80">
                  <span className="font-semibold text-white">
                    🎯 {lastLSTMResult.parsedActivity.activityName} ({lastLSTMResult.parsedActivity.durationMin}m)
                  </span>
                  <span className="font-mono text-sky-300 text-[10px]">
                    Impact: {lastLSTMResult.durationScale.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[10px]">
                  {Object.entries(lastLSTMResult.deltas)
                    .filter(([, delta]) => Math.abs(delta) >= 0.005)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 4)
                    .map(([interest, delta]) => {
                      const pct = Math.round(delta * 1000) / 10;
                      const sign = pct >= 0 ? "+" : "";
                      return (
                        <span key={interest} className={`px-1.5 py-0.5 rounded ${pct >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          {interest}: {sign}{pct}%
                        </span>
                      );
                    })}
                </div>
                <p className="text-[9.5px] text-white/50 leading-tight pt-1 border-t border-white/10">
                  {lastLSTMResult.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Activity buttons */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "त्वरित गतिविधि संकेत" : "Quick activity signals"}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "+1hr run", hi: "+1 घंटा दौड़", key: "runningMin" as const, val: 60 },
                { label: "+1hr cycling", hi: "+1 घंटा साइकिल", key: "cyclingMin" as const, val: 60 },
                { label: "+1hr commute", hi: "+1 घंटा यात्रा", key: "vehicleCommuteMin" as const, val: 60 },
                { label: "+1 long trip", hi: "+1 लंबी यात्रा", key: "vehicleLongTripMin" as const, val: 180 },
                { label: "+school walk", hi: "+स्कूल चलना", key: "schoolRunWalks" as const, val: 1 },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => addSignal(btn.key, btn.val)}
                  className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[10px] font-medium text-white/80 hover:bg-white/15 transition active:scale-95 border border-white/8"
                >
                  {lang === "hi" ? btn.hi : btn.label}
                </button>
              ))}
              <button
                onClick={() => {
                  updateProfile((p) => {
                    const prev = p.moduleInteractions["air"] ?? { taps: 0, scrollPasts: 0 };
                    const updated = {
                      ...p,
                      moduleInteractions: {
                        ...p.moduleInteractions,
                        air: { ...prev, taps: prev.taps + 5 },
                      },
                    };
                    return { ...updated, interestWeights: updateWeights(updated) };
                  });
                }}
                className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[10px] font-medium text-white/80 hover:bg-white/15 transition active:scale-95 border border-white/8"
              >
                {lang === "hi" ? "AQI 5× खोलें" : "Open AQI 5×"}
              </button>
            </div>
          </div>

          {/* Location buttons */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "स्थान संदर्भ" : "Location context"}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {([
                { ctx: "home_city" as const, label: "Home city", hi: "घर शहर" },
                { ctx: "farm" as const, label: "At farm", hi: "खेत पर" },
                { ctx: "beach" as const, label: "At beach", hi: "समुद्र तट पर" },
                { ctx: "other_city" as const, label: "Other city", hi: "दूसरा शहर" },
              ]).map((btn) => (
                <button
                  key={btn.ctx}
                  onClick={() => setLocationCtx(btn.ctx)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition active:scale-95 border ${
                    profile.locationContext === btn.ctx
                      ? "bg-white/20 border-white/30 text-white"
                      : "bg-white/8 border-white/8 text-white/80 hover:bg-white/15"
                  }`}
                >
                  {lang === "hi" ? btn.hi : btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert buttons */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "अलर्ट" : "Alerts"}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => triggerAlert("warning")} className="rounded-lg bg-orange-500/20 px-2.5 py-1.5 text-[10px] font-medium text-orange-300 hover:bg-orange-500/30 transition active:scale-95 border border-orange-500/30">
                {lang === "hi" ? "ऑरेंज अलर्ट" : "Orange alert"}
              </button>
              <button onClick={() => triggerAlert("critical")} className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-[10px] font-medium text-red-300 hover:bg-red-500/30 transition active:scale-95 border border-red-500/30">
                {lang === "hi" ? "रेड अलर्ट" : "Red alert"}
              </button>
              <button onClick={clearAlerts} className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[10px] font-medium text-white/80 hover:bg-white/15 transition active:scale-95 border border-white/8">
                {lang === "hi" ? "अलर्ट हटाएं" : "Clear alerts"}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={simulateDay} className="flex-1 rounded-xl bg-white/10 py-2 text-[11px] font-semibold text-white/90 hover:bg-white/20 transition active:scale-95">
              {lang === "hi" ? "1 दिन सिम्युलेट करें" : "Simulate 1 day"}
            </button>
            <button onClick={resetProfile} className="flex-1 rounded-xl bg-red-500/15 py-2 text-[11px] font-semibold text-red-300 hover:bg-red-500/25 transition active:scale-95">
              {lang === "hi" ? "प्रोफ़ाइल रीसेट" : "Reset profile"}
            </button>
          </div>

          {/* Scenarios */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2">
              {lang === "hi" ? "परिदृश्य" : "Scenarios"}
            </h4>
            <div className="space-y-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => playScenario(sc.id)}
                  disabled={scenarioState?.playing && !scenarioState?.paused}
                  className="w-full rounded-xl bg-white/8 px-3 py-2 text-left text-[11px] font-medium text-white/80 hover:bg-white/15 transition active:scale-[0.98] border border-white/8 disabled:opacity-40"
                >
                  <span className="block">{lang === "hi" ? sc.nameHi : sc.name}</span>
                  <span className="text-[9px] text-white/40">{sc.days.length} {lang === "hi" ? "दिन" : "days"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Day count */}
          <p className="text-center text-[10px] text-white/40 font-mono">
            {lang === "hi" ? "दिन" : "Day"}: {profile.dayCount}
          </p>
        </div>
      </div>
    </>
  );
}
