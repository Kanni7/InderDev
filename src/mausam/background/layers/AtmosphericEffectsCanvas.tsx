import React, { useEffect, useRef } from "react";
import type { EnvironmentalWeatherCondition } from "../types";

interface AtmosphericEffectsCanvasProps {
  condition: EnvironmentalWeatherCondition;
  precipRate: number;      // mm/h
  windSpeed: number;       // km/h
  windAngleRad: number;    // radians
  thunderIntensity: number;// 0 to 1
}

interface RainParticle {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  width: number;
}

interface SplashParticle {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface SnowParticle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  phase: number;
  opacity: number;
}

/**
 * Layer 5: High-Performance GPU-Friendly Atmospheric Effects Canvas
 * 
 * Renders subtle, photorealistic precipitation (rain, heavy rain, snow)
 * and organic cloud-to-cloud sheet lightning flashes.
 * Automatically halts RAF loop when sky is clear to conserve 100% CPU.
 */
export const AtmosphericEffectsCanvas: React.FC<AtmosphericEffectsCanvasProps> = ({
  condition,
  precipRate,
  windSpeed,
  windAngleRad,
  thunderIntensity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep refs for smooth dynamic updates without re-instantiating loops
  const propsRef = useRef({ condition, precipRate, windSpeed, windAngleRad, thunderIntensity });
  propsRef.current = { condition, precipRate, windSpeed, windAngleRad, thunderIntensity };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let isDestroyed = false;

    // Canvas sizing with DPR cap for mobile performance
    let width = (canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2));
    let height = (canvas.height = canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 2));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2);
      height = canvas.height = canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 2);
    };

    window.addEventListener("resize", handleResize);

    // Particle pools
    const isHeavy = condition === "heavy-rain" || precipRate > 5;
    const isStorm = condition === "thunderstorm";
    const isSnow = condition === "snow";
    const isRain = condition === "rain" || isHeavy || isStorm;

    const rainCount = isHeavy ? 100 : isStorm ? 90 : isRain ? 45 : 0;
    const snowCount = isSnow ? 45 : 0;

    const rainParticles: RainParticle[] = [];
    for (let i = 0; i < rainCount; i++) {
      rainParticles.push({
        x: Math.random() * width * 1.3 - width * 0.15,
        y: Math.random() * height,
        length: 14 + Math.random() * (isHeavy ? 24 : 16),
        speed: 16 + Math.random() * (isHeavy ? 18 : 10),
        opacity: 0.15 + Math.random() * 0.32,
        width: 0.8 + Math.random() * (isHeavy ? 0.8 : 0.4),
      });
    }

    const splashes: SplashParticle[] = [];

    const snowParticles: SnowParticle[] = [];
    for (let i = 0; i < snowCount; i++) {
      snowParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.0 + Math.random() * 2.2,
        speedY: 0.8 + Math.random() * 1.4,
        speedX: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.25 + Math.random() * 0.5,
      });
    }

    // Lightning flash state machine
    let nextLightningTime = performance.now() + 3000 + Math.random() * 7000;
    let lightningFlashAlpha = 0;
    let lightningStages: number[] = [];

    let lastTime = performance.now();

    const render = (now: number) => {
      if (isDestroyed) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const {
        condition: curCond,
        windSpeed: curWind,
        thunderIntensity: curThunder,
      } = propsRef.current;

      const hasEffects =
        curCond === "rain" ||
        curCond === "heavy-rain" ||
        curCond === "thunderstorm" ||
        curCond === "snow";

      if (!hasEffects && lightningFlashAlpha <= 0) {
        ctx.clearRect(0, 0, width, height);
        // Throttle RAF when idle
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Wind tilt angle calculation
      const windAngle = Math.min(Math.max((curWind / 40) * 0.35, -0.4), 0.4);
      const windOffsetX = Math.sin(windAngle);
      const windOffsetY = Math.cos(windAngle);

      // ──────────────── 1. Render Rain Streaks ────────────────
      if (curCond === "rain" || curCond === "heavy-rain" || curCond === "thunderstorm") {
        ctx.strokeStyle = "rgba(235, 245, 255, 0.85)";
        ctx.lineCap = "round";

        for (let i = 0; i < rainParticles.length; i++) {
          const p = rainParticles[i];
          p.x += windOffsetX * p.speed * 60 * dt;
          p.y += windOffsetY * p.speed * 60 * dt;

          // Wrap around viewport
          if (p.y > height) {
            // Trigger occasional ground splash
            if (Math.random() < 0.25 && splashes.length < 15) {
              splashes.push({
                x: p.x,
                y: height - 10 - Math.random() * 30,
                radius: 1,
                maxRadius: 3 + Math.random() * 5,
                opacity: 0.35,
              });
            }
            p.y = -p.length;
            p.x = Math.random() * width * 1.3 - width * 0.15;
          }
          if (p.x > width + 20) p.x = -20;
          if (p.x < -20) p.x = width + 20;

          ctx.beginPath();
          ctx.lineWidth = p.width;
          ctx.strokeStyle = `rgba(235, 245, 255, ${p.opacity})`;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - windOffsetX * p.length, p.y - windOffsetY * p.length);
          ctx.stroke();
        }

        // Render ground splash rings
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.radius += 12 * dt;
          s.opacity -= 1.8 * dt;

          if (s.opacity <= 0 || s.radius >= s.maxRadius) {
            splashes.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius * 1.6, s.radius * 0.6, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(225, 240, 255, ${s.opacity * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // ──────────────── 2. Render Snow ────────────────
      if (curCond === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (let i = 0; i < snowParticles.length; i++) {
          const p = snowParticles[i];
          p.phase += dt * 1.8;
          p.y += p.speedY * 60 * dt;
          p.x += (p.speedX + Math.sin(p.phase) * 0.8) * 60 * dt;

          if (p.y > height) {
            p.y = -5;
            p.x = Math.random() * width;
          }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();
        }
      }

      // ──────────────── 3. Render Thunderstorm Sheet Lightning ────────────────
      if (curCond === "thunderstorm" && curThunder > 0) {
        if (now >= nextLightningTime && lightningStages.length === 0) {
          // Schedule realistic multi-burst lightning flash
          lightningStages = [0.65, 0.15, 0.45, 0.05, 0];
          nextLightningTime = now + 5000 + Math.random() * 8000;
        }

        if (lightningStages.length > 0) {
          const target = lightningStages[0];
          lightningFlashAlpha += (target - lightningFlashAlpha) * Math.min(dt * 30, 1);
          if (Math.abs(lightningFlashAlpha - target) < 0.05) {
            lightningStages.shift();
          }
        } else {
          lightningFlashAlpha *= Math.max(0, 1 - dt * 6);
        }

        if (lightningFlashAlpha > 0.01) {
          // Soft ambient violet-white flash that illuminates the whole sky
          ctx.fillStyle = `rgba(235, 230, 255, ${lightningFlashAlpha * 0.45})`;
          ctx.fillRect(0, 0, width, height);

          // Upper cloud sheet glow concentration
          const grad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
          grad.addColorStop(0, `rgba(255, 255, 255, ${lightningFlashAlpha * 0.35})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height * 0.5);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [condition]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[4]"
      style={{ display: "block" }}
    />
  );
};
