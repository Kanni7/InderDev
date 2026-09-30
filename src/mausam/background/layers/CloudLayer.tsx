import React, { useMemo } from "react";
import type { SkyColorPalette, SolarPosition } from "../types";

interface CloudLayerProps {
  palette: SkyColorPalette;
  solar: SolarPosition;
  cloudCoverage: number;
  windSpeed: number;
}

/**
 * Layer 2: Realistic Soft Cloud Formations
 * 
 * Multi-depth atmospheric cloud deck with slow, cinematic drift.
 * Dynamically lit by the time-of-day solar palette.
 */
export const CloudLayer: React.FC<CloudLayerProps> = ({
  palette,
  solar,
  cloudCoverage,
  windSpeed,
}) => {
  // Speed factor based on actual wind speed (km/h)
  const driftSpeedFactor = useMemo(() => {
    // Normal breeze (12 km/h) = 1.0; calm (4 km/h) = 0.6; high wind (35 km/h) = 1.8
    return Math.min(Math.max(windSpeed / 12, 0.5), 2.2);
  }, [windSpeed]);

  // Durations for subtle continuous parallax drift
  const durHigh = `${Math.round(150 / driftSpeedFactor)}s`;
  const durMid = `${Math.round(110 / driftSpeedFactor)}s`;
  const durLow = `${Math.round(85 / driftSpeedFactor)}s`;

  // Opacity curves based on cloudCoverage (0 to 1)
  const highCirrusOpacity = Math.min(Math.max(cloudCoverage * 1.2, 0.08), 0.95);
  const midCumulusOpacity = Math.min(Math.max((cloudCoverage - 0.15) * 1.4, 0), 0.96);
  const lowNimbusOpacity = Math.min(Math.max((cloudCoverage - 0.55) * 2.2, 0), 0.92);

  // Sun rim highlight glow on clouds when sun is near or above horizon
  const sunRimGlow = solar.isAboveHorizon && cloudCoverage < 0.85
    ? `drop-shadow(0 -3px 12px ${palette.cloudHighlight}55)`
    : "none";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
      {/* ──────────────── 1. High Wispy Cirrus / Cirrocumulus Layer ──────────────── */}
      {highCirrusOpacity > 0.02 && (
        <div
          className="absolute inset-x-0 -top-10 h-72 opacity-90 transition-opacity duration-1000 ease-out"
          style={{
            opacity: highCirrusOpacity,
            animation: `mausam-cloud-drift-1 ${durHigh} linear infinite`,
            willChange: "transform",
          }}
        >
          <svg
            viewBox="0 0 1200 360"
            preserveAspectRatio="none"
            className="w-[200%] h-full -translate-x-1/4 filter blur-[6px]"
          >
            <defs>
              <linearGradient id="cirrusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={palette.cloudHighlight} stopOpacity="0.45" />
                <stop offset="60%" stopColor={palette.cloudBase} stopOpacity="0.25" />
                <stop offset="100%" stopColor={palette.cloudBase} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 120 Q 150 70 320 110 T 680 80 T 1000 130 T 1200 90 L 1200 0 L 0 0 Z"
              fill="url(#cirrusGrad)"
            />
            <path
              d="M 0 180 Q 220 130 460 160 T 840 120 T 1200 170 L 1200 0 L 0 0 Z"
              fill="url(#cirrusGrad)"
              opacity="0.6"
            />
          </svg>
        </div>
      )}

      {/* ──────────────── 2. Mid-Altitude Soft Cumulus / Stratocumulus ──────────────── */}
      {midCumulusOpacity > 0.02 && (
        <div
          className="absolute inset-x-0 top-16 h-80 transition-opacity duration-1000 ease-out"
          style={{
            opacity: midCumulusOpacity,
            filter: `${sunRimGlow} blur(8px)`,
            animation: `mausam-cloud-drift-2 ${durMid} linear infinite`,
            willChange: "transform",
          }}
        >
          <svg
            viewBox="0 0 1000 340"
            preserveAspectRatio="none"
            className="w-[180%] h-full -translate-x-1/4"
          >
            <defs>
              <linearGradient id="cumulusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={palette.cloudHighlight} stopOpacity="0.85" />
                <stop offset="45%" stopColor={palette.cloudHighlight} stopOpacity="0.65" />
                <stop offset="85%" stopColor={palette.cloudBase} stopOpacity="0.55" />
                <stop offset="100%" stopColor={palette.cloudBase} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Soft rolling billowing cumulus clouds */}
            <path
              d="M -100 240 
                 C -30 180, 50 140, 140 170 
                 C 210 110, 310 90, 420 130 
                 C 490 80, 600 70, 710 110 
                 C 790 70, 890 90, 970 140 
                 C 1040 110, 1120 140, 1180 200 
                 L 1180 340 L -100 340 Z"
              fill="url(#cumulusGrad)"
            />
          </svg>
        </div>
      )}

      {/* ──────────────── 3. Dense Low-Level Stratus / Rain Deck ──────────────── */}
      {lowNimbusOpacity > 0.02 && (
        <div
          className="absolute inset-x-0 top-28 h-96 transition-opacity duration-1000 ease-out"
          style={{
            opacity: lowNimbusOpacity,
            filter: "blur(12px)",
            animation: `mausam-cloud-drift-3 ${durLow} linear infinite`,
            willChange: "transform",
          }}
        >
          <svg
            viewBox="0 0 900 380"
            preserveAspectRatio="none"
            className="w-[160%] h-full -translate-x-1/6"
          >
            <defs>
              <linearGradient id="nimbusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={palette.cloudHighlight} stopOpacity="0.9" />
                <stop offset="50%" stopColor={palette.cloudBase} stopOpacity="0.85" />
                <stop offset="90%" stopColor={palette.cloudBase} stopOpacity="0.5" />
                <stop offset="100%" stopColor={palette.cloudBase} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M -50 320 
                 C 80 220, 200 180, 330 210 
                 C 450 150, 580 160, 690 200 
                 C 800 170, 920 210, 1020 280 
                 L 1020 380 L -50 380 Z"
              fill="url(#nimbusGrad)"
            />
          </svg>
        </div>
      )}

      {/* CSS Keyframes injected for buttery smooth 60fps parallax drift */}
      <style>{`
        @keyframes mausam-cloud-drift-1 {
          0% { transform: translate3d(-10%, 0, 0); }
          50% { transform: translate3d(5%, 0, 0); }
          100% { transform: translate3d(-10%, 0, 0); }
        }
        @keyframes mausam-cloud-drift-2 {
          0% { transform: translate3d(0%, 0, 0); }
          50% { transform: translate3d(-8%, 0, 0); }
          100% { transform: translate3d(0%, 0, 0); }
        }
        @keyframes mausam-cloud-drift-3 {
          0% { transform: translate3d(-5%, 0, 0); }
          50% { transform: translate3d(8%, 0, 0); }
          100% { transform: translate3d(-5%, 0, 0); }
        }
      `}</style>
    </div>
  );
};
