import React, { useMemo } from "react";
import type { SolarPosition, LunarEnvironmentData, SkyColorPalette } from "../types";

interface SkyAtmosphereLayerProps {
  palette: SkyColorPalette;
  solar: SolarPosition;
  lunar: LunarEnvironmentData;
  cloudCoverage: number;
}

/**
 * Layer 1 & 3: Sky Atmospheric Base + Solar & Lunar Glow
 * 
 * Renders the multi-stop vertical atmospheric gradient with
 * natural Rayleigh / Mie scattering bloom around the Sun and Moon.
 */
export const SkyAtmosphereLayer: React.FC<SkyAtmosphereLayerProps> = ({
  palette,
  solar,
  lunar,
  cloudCoverage,
}) => {
  // Attenuate sun glow by cloud cover
  const sunGlowOpacity = Math.max(0, 1 - cloudCoverage * 0.85);

  const skyBackground = useMemo(() => {
    return `linear-gradient(180deg, 
      ${palette.zenith} 0%, 
      ${palette.midSky} 45%, 
      ${palette.horizon} 78%,
      ${palette.ambient} 100%
    )`;
  }, [palette.zenith, palette.midSky, palette.horizon, palette.ambient]);

  // Sun radial bloom centered on solar position
  const sunBloomStyle = useMemo((): React.CSSProperties => {
    if (!solar.isAboveHorizon || sunGlowOpacity <= 0.02) {
      return { opacity: 0 };
    }
    return {
      position: "absolute",
      left: `${solar.screenX}%`,
      top: `${solar.screenY}%`,
      width: "500px",
      height: "500px",
      transform: "translate(-50%, -50%)",
      background: `radial-gradient(circle closest-side, 
        ${palette.sunGlow} 0%, 
        ${palette.sunGlow.replace(/[\d.]+\)$/, "0.15)")} 35%, 
        transparent 75%
      )`,
      pointerEvents: "none",
      opacity: sunGlowOpacity,
      transition: "opacity 1.2s ease, left 1.2s ease, top 1.2s ease",
      filter: "blur(20px)",
    };
  }, [solar.isAboveHorizon, solar.screenX, solar.screenY, palette.sunGlow, sunGlowOpacity]);

  // Moon atmospheric glow centered on lunar coordinates
  const moonBloomStyle = useMemo((): React.CSSProperties => {
    if (lunar.glowIntensity <= 0.02 || cloudCoverage > 0.85) {
      return { opacity: 0 };
    }
    return {
      position: "absolute",
      left: `${lunar.screenX}%`,
      top: `${lunar.screenY}%`,
      width: "280px",
      height: "280px",
      transform: "translate(-50%, -50%)",
      background: `radial-gradient(circle closest-side, 
        rgba(186, 215, 255, ${lunar.glowIntensity}) 0%, 
        rgba(150, 190, 240, ${lunar.glowIntensity * 0.4}) 45%, 
        transparent 80%
      )`,
      pointerEvents: "none",
      opacity: Math.max(0, 1 - cloudCoverage * 0.7),
      transition: "opacity 1.2s ease, left 1.2s ease, top 1.2s ease",
      filter: "blur(16px)",
    };
  }, [lunar.screenX, lunar.screenY, lunar.glowIntensity, cloudCoverage]);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-1000 ease-out"
      style={{ background: skyBackground }}
    >
      {/* Sun scattering bloom */}
      <div style={sunBloomStyle} />

      {/* Moon atmospheric glow */}
      <div style={moonBloomStyle} />
    </div>
  );
};
