import React, { useMemo } from "react";

interface AdaptiveReadabilityLayerProps {
  baseLuminance: number; // 0 (dark night) to 1 (bright midday)
  variant?: "device" | "modal" | "full";
}

/**
 * Layer 7: Adaptive Readability Gradient
 * 
 * Dynamically adjusts contrast scrims based on the environmental scene's luminance.
 * Ensures 100% legibility of UI cards, metrics, and typography without flattening
 * the cinematic atmospheric depth into a flat black rectangle.
 */
export const AdaptiveReadabilityLayer: React.FC<AdaptiveReadabilityLayerProps> = ({
  baseLuminance,
  variant = "device",
}) => {
  // Scrim opacities scaled continuously to scene brightness
  const { topOpacity, bottomOpacity, vignetteOpacity, ambientWash } = useMemo(() => {
    // In bright conditions (midday sun, bright morning, white fog), deepen contrast
    // In dark conditions (night, storm, dusk), reduce overlay so atmospheric detail shines through
    const lum = Math.min(Math.max(baseLuminance, 0), 1);

    const top = 0.18 + lum * 0.35;        // 0.20 (night) -> 0.42 (midday)
    const bottom = 0.25 + lum * 0.45;     // 0.28 (night) -> 0.58 (midday)
    const vignette = 0.12 + lum * 0.22;   // 0.14 (night) -> 0.28 (midday)
    const wash = 0.05 + lum * 0.18;       // subtle dark tint over whole frame

    return {
      topOpacity: variant === "modal" ? Math.min(top + 0.15, 0.6) : top,
      bottomOpacity: variant === "modal" ? Math.min(bottom + 0.15, 0.75) : bottom,
      vignetteOpacity: vignette,
      ambientWash: wash,
    };
  }, [baseLuminance, variant]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[6] transition-all duration-700 ease-out">
      {/* 1. Global subtle ambient darkening wash */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: "rgba(4, 7, 14, 1)",
          opacity: ambientWash,
        }}
      />

      {/* 2. Top Scrim: Protects Status Bar, Top Navigation, and Location Header */}
      <div
        className="absolute inset-x-0 top-0 h-44 transition-opacity duration-1000"
        style={{
          background: `linear-gradient(180deg, 
            rgba(4, 7, 14, ${topOpacity}) 0%, 
            rgba(4, 7, 14, ${topOpacity * 0.6}) 45%, 
            rgba(4, 7, 14, 0) 100%
          )`,
        }}
      />

      {/* 3. Bottom Scrim: Protects Glass Widgets, Forecast, and Cards Feed */}
      <div
        className="absolute inset-x-0 bottom-0 h-96 transition-opacity duration-1000"
        style={{
          background: `linear-gradient(0deg, 
            rgba(3, 5, 10, ${bottomOpacity}) 0%, 
            rgba(3, 5, 10, ${bottomOpacity * 0.7}) 50%, 
            rgba(3, 5, 10, 0) 100%
          )`,
        }}
      />

      {/* 4. Peripheral Vignette: Gently frames the content */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse 110% 90% at 50% 45%, 
            transparent 60%, 
            rgba(2, 4, 8, ${vignetteOpacity}) 100%
          )`,
        }}
      />
    </div>
  );
};
