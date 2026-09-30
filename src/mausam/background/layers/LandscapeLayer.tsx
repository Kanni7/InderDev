import React, { useMemo } from "react";
import type { EnvironmentPreset, SkyColorPalette, SolarPosition } from "../types";

interface LandscapeLayerProps {
  environment: EnvironmentPreset;
  palette: SkyColorPalette;
  solar: SolarPosition;
  visibilityKm: number;
}

/**
 * Layer 4: Location-Aware Environmental Horizon & Landscape
 * 
 * Distinct, editorial landscape silhouettes for each topographic profile.
 * Features realistic atmospheric perspective and water reflections.
 */
export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({
  environment,
  palette,
  solar,
  visibilityKm,
}) => {
  // Attenuate landscape contrast in low visibility (fog/haze)
  const atmosphericFade = Math.min(Math.max(visibilityKm / 8, 0.35), 1.0);

  // Distant horizon color blending with atmosphere
  const distantRidgeColor = useMemo(() => {
    return palette.horizon;
  }, [palette.horizon]);

  // Midground ridge color
  const midRidgeColor = useMemo(() => {
    return palette.hazeColor;
  }, [palette.hazeColor]);

  // Foreground terrain base
  const foreTerrainColor = useMemo(() => {
    return palette.landscapeTint;
  }, [palette.landscapeTint]);

  // Specular water highlight position matching sun or moon
  const waterHighlightX = `${solar.isAboveHorizon ? solar.screenX : 50}%`;

  return (
    <div
      className="absolute inset-x-0 bottom-0 h-96 overflow-hidden pointer-events-none z-[3] transition-opacity duration-1000 ease-out"
      style={{ opacity: atmosphericFade }}
    >
      {/* ──────────────── 1. HILLS (Western Ghats / Pune / Deccan) ──────────────── */}
      {environment.type === "hills" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            {/* Distant Ghats Ridge Gradient */}
            <linearGradient id="ghatsDistant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.45" />
              <stop offset="60%" stopColor={midRidgeColor} stopOpacity="0.65" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.9" />
            </linearGradient>

            {/* Midground Foothills Gradient */}
            <linearGradient id="ghatsMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={midRidgeColor} stopOpacity="0.75" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.98" />
            </linearGradient>
          </defs>

          {/* Layer 1: Distant Western Ghats ridgeline */}
          <path
            d="M 0 210 
               Q 140 160 280 190 
               T 560 150 
               T 820 180 
               T 1000 160 
               L 1000 400 L 0 400 Z"
            fill="url(#ghatsDistant)"
          />

          {/* Layer 2: Midground Sinhagad/Foothill profile */}
          <path
            d="M 0 260 
               C 120 220, 240 230, 360 270 
               C 480 230, 620 210, 740 250 
               C 860 220, 940 240, 1000 250 
               L 1000 400 L 0 400 Z"
            fill="url(#ghatsMid)"
          />

          {/* Layer 3: Foreground plateau base */}
          <path
            d="M 0 320 
               Q 250 285 520 310 
               T 1000 295 
               L 1000 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.98"
          />
        </svg>
      )}

      {/* ──────────────── 2. COASTAL (Mumbai / Chennai / Oceanic Horizon) ──────────────── */}
      {environment.type === "coastal" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            {/* Sea Surface Water Gradient */}
            <linearGradient id="seaWaterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.65" />
              <stop offset="35%" stopColor={midRidgeColor} stopOpacity="0.82" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.98" />
            </linearGradient>

            {/* Subtle Sun/Sky Specular Water Reflection */}
            <radialGradient id="waterSpecular" cx={waterHighlightX} cy="0%" r="50%">
              <stop offset="0%" stopColor={palette.sunGlow || "#ffffff"} stopOpacity="0.45" />
              <stop offset="40%" stopColor={palette.horizon} stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Distant Coastal Headland Silhouette */}
          <path
            d="M 0 240 
               C 80 210, 180 220, 260 245 
               L 260 260 L 0 260 Z"
            fill={distantRidgeColor}
            opacity="0.4"
          />
          <path
            d="M 740 248 
               C 820 225, 920 220, 1000 238 
               L 1000 260 L 740 260 Z"
            fill={distantRidgeColor}
            opacity="0.35"
          />

          {/* Oceanic Sea Surface from Horizon Line (Y=255) to bottom */}
          <rect x="0" y="255" width="1000" height="145" fill="url(#seaWaterGrad)" />

          {/* Water light shimmer reflection */}
          <rect x="0" y="255" width="1000" height="90" fill="url(#waterSpecular)" />

          {/* Subtle coastal shoreline / headland foreground */}
          <path
            d="M 0 350 
               C 160 330, 320 340, 480 370 
               L 480 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.95"
          />
        </svg>
      )}

      {/* ──────────────── 3. PLAINS (Delhi / NCR / Northern Gangetic Horizon) ──────────────── */}
      {environment.type === "plains" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            <linearGradient id="plainsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.5" />
              <stop offset="50%" stopColor={midRidgeColor} stopOpacity="0.75" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.98" />
            </linearGradient>
          </defs>

          {/* Distant Flat Horizon with subtle landmark skyline silhouettes */}
          <path
            d="M 0 270 
               L 180 270 
               L 185 258 L 195 258 L 200 270 
               L 310 270 
               L 314 252 L 318 245 L 322 252 L 326 270 
               L 450 270 
               C 470 264, 490 264, 510 270 
               L 680 270 
               L 685 256 L 695 256 L 700 270 
               L 840 270 
               C 860 262, 880 262, 900 270 
               L 1000 270 
               L 1000 400 L 0 400 Z"
            fill="url(#plainsGrad)"
          />

          {/* Foreground expansive plains ground plane */}
          <path
            d="M 0 330 
               Q 300 320 600 335 
               T 1000 325 
               L 1000 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.96"
          />
        </svg>
      )}

      {/* ──────────────── 4. PLATEAU (Bengaluru / High Canopy Line) ──────────────── */}
      {environment.type === "plateau" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            <linearGradient id="plateauDistant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor={midRidgeColor} stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Rolling High Plateau Tableland */}
          <path
            d="M 0 230 
               Q 220 205 460 225 
               T 850 210 
               T 1000 220 
               L 1000 400 L 0 400 Z"
            fill="url(#plateauDistant)"
          />

          {/* Lush Tree Canopy Horizon Profile (Rain trees, Banyan, Eucalyptus) */}
          <path
            d="M 0 275 
               C 20 260, 45 260, 65 275 
               C 85 255, 120 255, 145 275 
               C 170 250, 210 250, 240 275 
               C 270 258, 305 258, 335 275 
               C 370 248, 415 248, 450 275 
               C 485 255, 520 255, 555 275 
               C 590 245, 635 245, 675 275 
               C 715 252, 755 252, 795 275 
               C 835 248, 880 248, 920 275 
               C 955 260, 980 260, 1000 275 
               L 1000 400 L 0 400 Z"
            fill={midRidgeColor}
            opacity="0.9"
          />

          {/* Foreground plateau contour */}
          <path
            d="M 0 340 
               Q 350 320 700 338 
               T 1000 330 
               L 1000 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.98"
          />
        </svg>
      )}

      {/* ──────────────── 5. RIVERINE (Kolkata / Delta Waterway) ──────────────── */}
      {environment.type === "riverine" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            <linearGradient id="riverWaterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.6" />
              <stop offset="45%" stopColor={midRidgeColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.98" />
            </linearGradient>
            <radialGradient id="riverSpecular" cx={waterHighlightX} cy="0%" r="45%">
              <stop offset="0%" stopColor={palette.sunGlow || "#ffffff"} stopOpacity="0.38" />
              <stop offset="50%" stopColor={palette.horizon} stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Distant riverbank tree silhouettes and delta palms */}
          <path
            d="M 0 252 
               C 80 240, 160 245, 240 252 
               C 320 238, 420 238, 500 252 
               C 600 242, 700 242, 800 252 
               C 880 240, 950 240, 1000 252 
               L 1000 262 L 0 262 Z"
            fill={distantRidgeColor}
            opacity="0.65"
          />

          {/* River Water Surface from Horizon (Y=260) to bottom */}
          <rect x="0" y="260" width="1000" height="140" fill="url(#riverWaterGrad)" />

          {/* River surface sheen */}
          <rect x="0" y="260" width="1000" height="85" fill="url(#riverSpecular)" />

          {/* Foreground riverbank contour */}
          <path
            d="M 0 355 
               Q 280 330 620 350 
               T 1000 345 
               L 1000 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.98"
          />
        </svg>
      )}

      {/* ──────────────── 6. MOUNTAIN (Alpine / Himalayan Crags) ──────────────── */}
      {environment.type === "mountain" && (
        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full h-full"
        >
          <defs>
            <linearGradient id="mtnDistant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={distantRidgeColor} stopOpacity="0.55" />
              <stop offset="100%" stopColor={midRidgeColor} stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="mtnMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={midRidgeColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={foreTerrainColor} stopOpacity="0.98" />
            </linearGradient>
          </defs>

          {/* High dramatic peaks */}
          <path
            d="M 0 200 
               L 160 110 L 280 180 
               L 420 90 L 580 200 
               L 720 120 L 880 190 L 1000 130 
               L 1000 400 L 0 400 Z"
            fill="url(#mtnDistant)"
          />

          {/* Midground rocky ridge */}
          <path
            d="M 0 260 
               L 180 190 L 340 250 
               L 520 175 L 700 240 L 860 185 L 1000 230 
               L 1000 400 L 0 400 Z"
            fill="url(#mtnMid)"
          />

          {/* Foreground valley slope */}
          <path
            d="M 0 330 
               Q 300 290 650 320 
               T 1000 305 
               L 1000 400 L 0 400 Z"
            fill={foreTerrainColor}
            opacity="0.98"
          />
        </svg>
      )}
    </div>
  );
};
