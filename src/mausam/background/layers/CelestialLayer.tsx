import React, { useMemo } from "react";
import type { SolarPosition, LunarEnvironmentData } from "../types";

interface CelestialLayerProps {
  solar: SolarPosition;
  lunar: LunarEnvironmentData;
  starsOpacity: number;
  cloudCoverage: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleDuration: number;
  twinkleDelay: number;
}

// Generate deterministic celestial star field
function generateStaticStars(count: number = 60): Star[] {
  const stars: Star[] = [];
  // Use pseudo-random seeded values for consistent positions
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * 96 + 2; // 2% to 98%
    const y = ((Math.cos(seed) * 10000) % 1 + 1) % 1 * 55 + 3; // 3% to 58% (upper sky)
    const size = 0.8 + (((i * 17) % 10) / 10) * 1.2;          // 0.8px to 2.0px
    const alpha = 0.2 + (((i * 23) % 10) / 10) * 0.45;        // 0.2 to 0.65
    const twinkleDuration = 3.5 + ((i % 5) * 1.2);             // 3.5s to 9.5s
    const twinkleDelay = (i * 0.3) % 4;

    stars.push({ x, y, size, alpha, twinkleDuration, twinkleDelay });
  }
  return stars;
}

const STATIC_STARS = generateStaticStars(65);

/**
 * Layer 3 (Celestial): Astronomical Stars, Sun Disc, and Authentic Lunar Phase
 */
export const CelestialLayer: React.FC<CelestialLayerProps> = ({
  solar,
  lunar,
  starsOpacity,
  cloudCoverage,
}) => {
  // Attenuate stars further by cloud cover
  const effectiveStarsOpacity = Math.max(0, starsOpacity * (1 - cloudCoverage * 1.1));

  // Moon visibility: prominent at night and twilight, hidden under thick clouds
  const isNightOrTwilight = !solar.isAboveHorizon || solar.altitude < 12;
  const moonOpacity = isNightOrTwilight
    ? Math.max(0, (1 - cloudCoverage * 0.85) * (0.4 + (lunar.illumination / 100) * 0.6))
    : 0;

  // Sun disc visibility: clear/partly cloudy day
  const sunDiscOpacity = solar.isAboveHorizon
    ? Math.max(0, (1 - cloudCoverage * 0.95) * 0.9)
    : 0;

  // Compute SVG mask for lunar phase
  // Phase 0 = New Moon, 0.25 = First Q, 0.5 = Full Moon, 0.75 = Last Q, 1.0 = New
  const moonPhaseSvg = useMemo(() => {
    const r = 12;
    const p = lunar.phase;
    // Map phase into illumination curve
    const isWaxing = p <= 0.5;
    const illum = Math.cos(p * 2 * Math.PI); // 1 at new, -1 at full
    const k = (1 - illum) / 2; // 0 at new, 1 at full

    return (
      <svg
        viewBox="0 0 28 28"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(210,230,255,0.45)]"
      >
        <defs>
          <radialGradient id="moonSurface" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          <filter id="lunarLimbGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
          </filter>
        </defs>

        {/* Earthshine faint dark disc silhouette */}
        <circle cx="14" cy="14" r={r} fill="#0d1527" opacity="0.45" />

        {/* Illuminated portion using phase arc */}
        {k > 0.03 && (
          <g>
            <circle cx="14" cy="14" r={r} fill="url(#moonSurface)" />
            {k < 0.97 && (
              <path
                d={
                  isWaxing
                    ? `M 14 ${14 - r} 
                       A ${r * (1 - 2 * k)} ${r} 0 0 ${k < 0.5 ? 0 : 1} 14 ${14 + r} 
                       A ${r} ${r} 0 0 1 14 ${14 - r} Z`
                    : `M 14 ${14 - r} 
                       A ${r * (2 * k - 1)} ${r} 0 0 ${k < 0.5 ? 1 : 0} 14 ${14 + r} 
                       A ${r} ${r} 0 0 1 14 ${14 - r} Z`
                }
                fill="#0d1527"
                opacity="0.85"
              />
            )}
          </g>
        )}

        {/* Subtle lunar rim highlight */}
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke="rgba(240, 246, 255, 0.4)"
          strokeWidth="0.6"
        />
      </svg>
    );
  }, [lunar.phase, lunar.illumination]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {/* 1. Subtle Celestial Star Field */}
      {effectiveStarsOpacity > 0.01 && (
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: effectiveStarsOpacity }}
        >
          {STATIC_STARS.map((star, idx) => (
            <span
              key={idx}
              className="absolute rounded-full bg-white block"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.alpha,
                animation: `pulse-soft ${star.twinkleDuration}s ease-in-out ${star.twinkleDelay}s infinite`,
                boxShadow: star.size > 1.4 ? "0 0 3px rgba(255,255,255,0.7)" : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
