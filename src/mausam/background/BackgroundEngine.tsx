import React, { useState, useEffect, useMemo } from "react";
import type { Location } from "../data";
import type {
  TimeOfDayPhase,
  EnvironmentalWeatherCondition,
  BackgroundSceneState,
} from "./types";
import {
  parseTimeStringToHours,
  calculateSolarPosition,
  calculateLunarPosition,
  getSeason,
} from "./solarEngine";
import { resolveEnvironment } from "./environmentCatalog";
import {
  mapToEnvironmentalCondition,
  extractAtmosphericMetrics,
  computeAtmosphericPalette,
} from "./atmosphericLighting";
import { getSkyAndCloudsPhoto } from "./skyPhotos";
import { CelestialLayer } from "./layers/CelestialLayer";
import { AtmosphericEffectsCanvas } from "./layers/AtmosphericEffectsCanvas";
import { AtmosphericHazeLayer } from "./layers/AtmosphericHazeLayer";
import { AdaptiveReadabilityLayer } from "./layers/AdaptiveReadabilityLayer";

export interface BackgroundEngineProps {
  location: Location;
  currentHour?: number | null;
  date?: Date;
  conditionOverride?: EnvironmentalWeatherCondition;
  timePhaseOverride?: TimeOfDayPhase;
  variant?: "device" | "modal" | "full";
  showReadability?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Mausam Dynamic Environmental Background Engine
 * 
 * Curated high-resolution sky and clouds photography matching every
 * time-of-day phase and weather condition.
 * Features buttery-smooth crossfading between skies, atmospheric lighting washes,
 * realistic precipitation/lightning effects, and adaptive readability protection.
 */
export const BackgroundEngine: React.FC<BackgroundEngineProps> = ({
  location,
  currentHour = null,
  date = new Date(),
  conditionOverride,
  timePhaseOverride,
  variant = "device",
  showReadability = true,
  className = "",
  style,
  children,
}) => {
  // ──────────────── 1. Time & Solar Calculation ────────────────
  const sceneState: BackgroundSceneState = useMemo(() => {
    const now = date || new Date();
    const effectiveDecimalHour =
      currentHour !== null && currentHour !== undefined
        ? currentHour
        : now.getHours() + now.getMinutes() / 60;

    // Parse location sunrise/sunset
    const sunriseHour = parseTimeStringToHours(location.sun?.sunrise) ?? 6.0;
    const sunsetHour = parseTimeStringToHours(location.sun?.sunset) ?? 18.25;

    // Solar & Lunar positions
    const solar = calculateSolarPosition(effectiveDecimalHour, sunriseHour, sunsetHour);
    if (timePhaseOverride) {
      solar.phase = timePhaseOverride;
    }

    const lunar = calculateLunarPosition(effectiveDecimalHour, now, sunsetHour, sunriseHour);

    // Weather condition resolution
    const resolvedCondition: EnvironmentalWeatherCondition =
      conditionOverride ||
      mapToEnvironmentalCondition(
        location.condition,
        location.precip?.chance ?? 0,
        location.humidity ?? 55,
        location.travel?.visibility ? parseFloat(location.travel.visibility) : 10
      );

    // Location environment resolution
    const environment = resolveEnvironment(location.key || location.city, location.region);

    // Seasonal context
    const season = getSeason(now);

    // Atmospheric metrics (clouds, fog, haze, precipitation, wind)
    const atmosphere = extractAtmosphericMetrics(location, resolvedCondition);

    // Master color palette computation
    const palette = computeAtmosphericPalette(
      solar.phase,
      solar.progressInPhase,
      resolvedCondition,
      atmosphere.cloudCoverage,
      atmosphere.visibilityKm
    );

    return {
      location,
      date: now,
      hour: effectiveDecimalHour,
      timeOfDayPhase: solar.phase,
      weatherCondition: resolvedCondition,
      environment,
      season,
      solar,
      lunar,
      atmosphere,
      palette,
    };
  }, [location, currentHour, date, conditionOverride, timePhaseOverride]);

  const { solar, lunar, weatherCondition, atmosphere, palette } = sceneState;

  // ──────────────── 2. Curated Sky & Cloud Photography Resolution ────────────────
  const targetPhoto = useMemo(() => {
    return getSkyAndCloudsPhoto(solar.phase, weatherCondition);
  }, [solar.phase, weatherCondition]);

  const [activePhoto, setActivePhoto] = useState(targetPhoto);
  const [fadingPhoto, setFadingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (targetPhoto !== activePhoto) {
      setFadingPhoto(activePhoto);
      setActivePhoto(targetPhoto);
      const timer = setTimeout(() => {
        setFadingPhoto(null);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [targetPhoto, activePhoto]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={{
        background: palette.ambient,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* ── Base Layer: Fading Previous Sky & Cloud Photo (Crossfade) ── */}
      {fadingPhoto && (
        <div
          key={fadingPhoto}
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out"
          style={{
            backgroundImage: `url(${fadingPhoto})`,
            opacity: 0,
          }}
        />
      )}

      {/* ── Base Layer: Active High-Res Sky & Cloud Photo ── */}
      <div
        key={activePhoto}
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in"
        style={{
          backgroundImage: `url(${activePhoto})`,
          opacity: 1,
        }}
      />

      {/* ── Layer 1: Time-of-Day Lighting Color Filter & Atmospheric Glow ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
        style={{
          background: `linear-gradient(180deg, 
            ${palette.zenith}40 0%, 
            ${palette.midSky}20 40%, 
            ${palette.horizon}35 75%, 
            ${palette.ambient}65 100%
          )`,
        }}
      />

      {/* ── Layer 2: Sun / Moon Atmospheric Scattering Bloom ── */}
      {solar.isAboveHorizon && atmosphere.cloudCoverage < 0.8 && (
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-1000"
          style={{
            left: `${solar.screenX}%`,
            top: `${solar.screenY}%`,
            width: "380px",
            height: "380px",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle closest-side, 
              ${palette.sunGlow} 0%, 
              ${palette.sunGlow.replace(/[\d.]+\)$/, "0.15)")} 40%, 
              transparent 80%
            )`,
            filter: "blur(24px)",
            opacity: Math.max(0, 1 - atmosphere.cloudCoverage * 0.8),
          }}
        />
      )}

      {/* ── Layer 3: Celestial (Subtle Stars & Moon Disc for Night/Twilight) ── */}
      <CelestialLayer
        solar={solar}
        lunar={lunar}
        starsOpacity={palette.starsOpacity}
        cloudCoverage={atmosphere.cloudCoverage}
      />

      {/* ── Layer 4: Weather Effects (Subtle Rain, Heavy Rain, Snow, Sheet Lightning) ── */}
      <AtmosphericEffectsCanvas
        condition={weatherCondition}
        precipRate={atmosphere.precipRate}
        windSpeed={atmosphere.windSpeed}
        windAngleRad={atmosphere.windAngleRad}
        thunderIntensity={atmosphere.thunderIntensity}
      />

      {/* ── Layer 5: Atmospheric Haze, Mist & Depth Fog ── */}
      <AtmosphericHazeLayer
        palette={palette}
        condition={weatherCondition}
        fogDensity={atmosphere.fogDensity}
        hazeDensity={atmosphere.hazeDensity}
        visibilityKm={atmosphere.visibilityKm}
      />

      {/* ── Layer 6: Adaptive Readability Gradient (Guarantees WCAG Legibility) ── */}
      {showReadability && (
        <AdaptiveReadabilityLayer
          baseLuminance={palette.baseLuminance}
          variant={variant}
        />
      )}

      {/* Optional embedded content (if used as container) */}
      {children && (
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default BackgroundEngine;
