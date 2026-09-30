import React, { useMemo } from "react";
import type { SkyColorPalette, EnvironmentalWeatherCondition } from "../types";

interface AtmosphericHazeLayerProps {
  palette: SkyColorPalette;
  condition: EnvironmentalWeatherCondition;
  fogDensity: number;
  hazeDensity: number;
  visibilityKm: number;
}

/**
 * Layer 6: Atmospheric Haze, Mist, and Volumetric Fog
 * 
 * Generates depth perspective and atmospheric diffusion.
 * Automatically thickens during low visibility, high AQI, or fog conditions.
 */
export const AtmosphericHazeLayer: React.FC<AtmosphericHazeLayerProps> = ({
  palette,
  condition,
  fogDensity,
  hazeDensity,
  visibilityKm,
}) => {
  // Total haze opacity combines fog, particulate haze, and visibility attenuation
  const totalHazeOpacity = useMemo(() => {
    if (condition === "fog") {
      return Math.min(Math.max(fogDensity * 0.85, 0.45), 0.92);
    }
    if (condition === "haze") {
      return Math.min(Math.max(hazeDensity * 0.75, 0.30), 0.85);
    }
    if (visibilityKm < 5) {
      return Math.min(0.45, (5 - visibilityKm) * 0.08);
    }
    return 0.12; // Subtle baseline natural atmospheric depth
  }, [condition, fogDensity, hazeDensity, visibilityKm]);

  // Is rolling volumetric mist active
  const showVolumetricMist = condition === "fog" || fogDensity > 0.4;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-[5] transition-opacity duration-1000 ease-out"
      style={{ opacity: totalHazeOpacity }}
    >
      {/* 1. Ground and Horizon Atmospheric Perspective Gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-[65%] transition-all duration-1000 ease-out"
        style={{
          background: `linear-gradient(180deg, 
            transparent 0%, 
            ${palette.hazeColor}33 35%, 
            ${palette.hazeColor}88 75%, 
            ${palette.hazeColor}bb 100%
          )`,
        }}
      />

      {/* 2. Soft Volumetric Rolling Mist Bands (only for Fog / Mist) */}
      {showVolumetricMist && (
        <>
          <div
            className="absolute inset-x-0 bottom-24 h-44 opacity-80 filter blur-[14px]"
            style={{
              background: `radial-gradient(ellipse 120% 60% at 50% 50%, 
                ${palette.hazeColor} 0%, 
                ${palette.hazeColor}88 50%, 
                transparent 85%
              )`,
              animation: "mausam-fog-drift 32s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-8 h-36 opacity-70 filter blur-[18px]"
            style={{
              background: `radial-gradient(ellipse 140% 70% at 45% 60%, 
                ${palette.hazeColor} 0%, 
                ${palette.hazeColor}aa 55%, 
                transparent 90%
              )`,
              animation: "mausam-fog-drift 44s ease-in-out infinite alternate-reverse",
            }}
          />
        </>
      )}

      {/* Fog Drift Keyframe */}
      <style>{`
        @keyframes mausam-fog-drift {
          0% { transform: translate3d(-6%, 0, 0) scaleY(0.95); }
          50% { transform: translate3d(6%, -4px, 0) scaleY(1.08); }
          100% { transform: translate3d(-6%, 0, 0) scaleY(0.95); }
        }
      `}</style>
    </div>
  );
};
